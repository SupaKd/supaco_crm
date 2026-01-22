const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');
const db = require('../config/db');
const authMiddleware = require('../middleware/auth');

// Toutes les routes nécessitent l'authentification
router.use(authMiddleware);

// Initialiser Groq
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

// Récupérer le contexte utilisateur (projets, prospects, stats)
const getUserContext = async (userId) => {
  try {
    // Récupérer les projets
    const [projects] = await db.query(
      `SELECT id, name, client_name, status, budget, deadline, created_at
       FROM projects WHERE user_id = ? ORDER BY created_at DESC LIMIT 20`,
      [userId]
    );

    // Récupérer les prospects
    const [prospects] = await db.query(
      `SELECT id, first_name, last_name, company, status, estimated_budget, source
       FROM prospects WHERE user_id = ? ORDER BY updated_at DESC LIMIT 20`,
      [userId]
    );

    // Statistiques projets
    const [projectStats] = await db.query(
      `SELECT
         COUNT(*) as total,
         SUM(CASE WHEN status = 'devis' THEN 1 ELSE 0 END) as devis,
         SUM(CASE WHEN status = 'en_cours' THEN 1 ELSE 0 END) as en_cours,
         SUM(CASE WHEN status = 'termine' THEN 1 ELSE 0 END) as termine,
         COALESCE(SUM(budget), 0) as total_budget
       FROM projects WHERE user_id = ?`,
      [userId]
    );

    // Statistiques prospects
    const [prospectStats] = await db.query(
      `SELECT
         COUNT(*) as total,
         SUM(CASE WHEN status = 'nouveau' THEN 1 ELSE 0 END) as nouveau,
         SUM(CASE WHEN status = 'gagne' THEN 1 ELSE 0 END) as gagne,
         SUM(CASE WHEN status = 'perdu' THEN 1 ELSE 0 END) as perdu
       FROM prospects WHERE user_id = ?`,
      [userId]
    );

    // Deadlines à venir
    const [upcomingDeadlines] = await db.query(
      `SELECT name, client_name, deadline
       FROM projects
       WHERE user_id = ? AND deadline IS NOT NULL AND deadline >= CURDATE() AND status != 'termine'
       ORDER BY deadline ASC LIMIT 5`,
      [userId]
    );

    return {
      projects: projects.map(p => ({
        nom: p.name,
        client: p.client_name,
        statut: p.status,
        budget: p.budget ? `${p.budget}€` : 'Non défini',
        deadline: p.deadline ? new Date(p.deadline).toLocaleDateString('fr-FR') : 'Pas de deadline'
      })),
      prospects: prospects.map(p => ({
        nom: `${p.first_name} ${p.last_name}`,
        entreprise: p.company || 'Non renseigné',
        statut: p.status,
        budget_estime: p.estimated_budget ? `${p.estimated_budget}€` : 'Non défini',
        source: p.source
      })),
      statistiques: {
        projets: {
          total: projectStats[0].total,
          en_devis: projectStats[0].devis,
          en_cours: projectStats[0].en_cours,
          termines: projectStats[0].termine,
          budget_total: `${projectStats[0].total_budget}€`
        },
        prospects: {
          total: prospectStats[0].total,
          nouveaux: prospectStats[0].nouveau,
          gagnes: prospectStats[0].gagne,
          perdus: prospectStats[0].perdu
        }
      },
      deadlines_proches: upcomingDeadlines.map(d => ({
        projet: d.name,
        client: d.client_name,
        date: new Date(d.deadline).toLocaleDateString('fr-FR')
      }))
    };
  } catch (error) {
    console.error('Erreur récupération contexte:', error);
    return null;
  }
};

// Route principale du chat
router.post('/chat', async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;

    if (!message) {
      return res.status(400).json({ message: 'Message requis' });
    }

    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({ message: 'Clé API Groq non configurée' });
    }

    // Récupérer le contexte utilisateur
    const userContext = await getUserContext(req.userId);

    // Construire le prompt système
    const systemPrompt = `Tu es un assistant IA pour Supaco, une application de gestion de projets et de prospection commerciale.
Tu aides l'utilisateur à gérer ses projets, prospects et à obtenir des insights sur son activité.

Voici les données actuelles de l'utilisateur :

STATISTIQUES :
${JSON.stringify(userContext?.statistiques, null, 2)}

PROJETS RÉCENTS (${userContext?.projects?.length || 0}) :
${JSON.stringify(userContext?.projects?.slice(0, 10), null, 2)}

PROSPECTS RÉCENTS (${userContext?.prospects?.length || 0}) :
${JSON.stringify(userContext?.prospects?.slice(0, 10), null, 2)}

DEADLINES PROCHES :
${JSON.stringify(userContext?.deadlines_proches, null, 2)}

INSTRUCTIONS :
- Réponds toujours en français
- Sois concis et utile
- Utilise les données ci-dessus pour personnaliser tes réponses
- Tu peux donner des conseils sur la gestion de projets et la prospection
- Si on te demande des statistiques, utilise les vraies données
- Tu ne peux PAS créer, modifier ou supprimer des données - uniquement consulter et conseiller
- Pour les actions (créer un projet, etc.), indique à l'utilisateur comment le faire dans l'interface`;

    // Construire les messages pour l'API
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-10), // Garder les 10 derniers messages
      { role: 'user', content: message }
    ];

    // Appeler Groq
    const completion = await groq.chat.completions.create({
      messages,
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 1024,
      stream: false
    });

    const aiResponse = completion.choices[0]?.message?.content || 'Désolé, je n\'ai pas pu générer de réponse.';

    res.json({
      response: aiResponse,
      conversationHistory: [
        ...conversationHistory,
        { role: 'user', content: message },
        { role: 'assistant', content: aiResponse }
      ]
    });

  } catch (error) {
    console.error('Erreur chat IA:', error);

    if (error.message?.includes('API key')) {
      return res.status(500).json({ message: 'Clé API invalide ou expirée' });
    }

    res.status(500).json({ message: 'Erreur lors de la communication avec l\'IA' });
  }
});

// Route pour obtenir des suggestions rapides
router.get('/suggestions', async (req, res) => {
  try {
    const userContext = await getUserContext(req.userId);

    const suggestions = [];

    // Suggestions basées sur le contexte
    if (userContext?.statistiques?.prospects?.nouveaux > 0) {
      suggestions.push(`Tu as ${userContext.statistiques.prospects.nouveaux} nouveau(x) prospect(s) à contacter`);
    }

    if (userContext?.deadlines_proches?.length > 0) {
      suggestions.push(`${userContext.deadlines_proches.length} deadline(s) dans les prochains jours`);
    }

    if (userContext?.statistiques?.projets?.en_cours > 0) {
      suggestions.push(`${userContext.statistiques.projets.en_cours} projet(s) en cours`);
    }

    // Questions suggérées
    const questionsSuggerees = [
      "Résume mon activité de la semaine",
      "Quels prospects devrais-je relancer ?",
      "Comment améliorer mon taux de conversion ?",
      "Quelles sont mes prochaines deadlines ?",
      "Analyse mes statistiques de projets"
    ];

    res.json({
      insights: suggestions,
      questions: questionsSuggerees
    });

  } catch (error) {
    console.error('Erreur suggestions:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
