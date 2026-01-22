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

// ==========================================
// DÉFINITION DES ACTIONS DISPONIBLES
// ==========================================

const availableTools = [
  {
    type: "function",
    function: {
      name: "create_project",
      description: "Créer un nouveau projet pour un client",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Nom du projet" },
          client_name: { type: "string", description: "Nom du client" },
          client_email: { type: "string", description: "Email du client (optionnel)" },
          client_phone: { type: "string", description: "Téléphone du client (optionnel)" },
          description: { type: "string", description: "Description du projet (optionnel)" },
          budget: { type: "number", description: "Budget en euros (optionnel)" },
          status: { type: "string", enum: ["devis", "en_cours", "termine"], description: "Statut du projet" },
          deadline: { type: "string", description: "Date limite au format YYYY-MM-DD (optionnel)" }
        },
        required: ["name", "client_name"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_prospect",
      description: "Créer un nouveau prospect (contact commercial)",
      parameters: {
        type: "object",
        properties: {
          first_name: { type: "string", description: "Prénom du prospect" },
          last_name: { type: "string", description: "Nom du prospect" },
          email: { type: "string", description: "Email (optionnel)" },
          phone: { type: "string", description: "Téléphone (optionnel)" },
          company: { type: "string", description: "Nom de l'entreprise (optionnel)" },
          source: { type: "string", enum: ["site_web", "recommandation", "linkedin", "salon", "autre"], description: "Source d'acquisition" },
          estimated_budget: { type: "number", description: "Budget estimé en euros (optionnel)" },
          needs: { type: "string", description: "Besoins du prospect (optionnel)" },
          notes: { type: "string", description: "Notes additionnelles (optionnel)" }
        },
        required: ["first_name", "last_name"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_task",
      description: "Créer une nouvelle tâche pour un projet existant",
      parameters: {
        type: "object",
        properties: {
          project_name: { type: "string", description: "Nom du projet auquel ajouter la tâche" },
          title: { type: "string", description: "Titre de la tâche" },
          description: { type: "string", description: "Description de la tâche (optionnel)" },
          priority: { type: "string", enum: ["low", "medium", "high"], description: "Priorité" },
          due_date: { type: "string", description: "Date d'échéance au format YYYY-MM-DD (optionnel)" }
        },
        required: ["project_name", "title"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_prospect_status",
      description: "Changer le statut d'un prospect existant",
      parameters: {
        type: "object",
        properties: {
          prospect_name: { type: "string", description: "Nom complet du prospect (prénom nom)" },
          new_status: { type: "string", enum: ["nouveau", "contacte", "qualification", "proposition", "negociation", "gagne", "perdu"], description: "Nouveau statut" }
        },
        required: ["prospect_name", "new_status"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_project_status",
      description: "Changer le statut d'un projet existant",
      parameters: {
        type: "object",
        properties: {
          project_name: { type: "string", description: "Nom du projet" },
          new_status: { type: "string", enum: ["devis", "en_cours", "termine", "annule"], description: "Nouveau statut" }
        },
        required: ["project_name", "new_status"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "add_note_to_project",
      description: "Ajouter une note à un projet existant",
      parameters: {
        type: "object",
        properties: {
          project_name: { type: "string", description: "Nom du projet" },
          title: { type: "string", description: "Titre de la note" },
          content: { type: "string", description: "Contenu de la note" }
        },
        required: ["project_name", "title", "content"]
      }
    }
  }
];

// ==========================================
// EXÉCUTION DES ACTIONS
// ==========================================

const executeAction = async (functionName, args, userId) => {
  try {
    switch (functionName) {
      case 'create_project': {
        const [result] = await db.query(
          `INSERT INTO projects (name, client_name, client_email, client_phone, description, budget, status, deadline, user_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            args.name,
            args.client_name,
            args.client_email || null,
            args.client_phone || null,
            args.description || null,
            args.budget || null,
            args.status || 'devis',
            args.deadline || null,
            userId
          ]
        );
        return {
          success: true,
          message: `Projet "${args.name}" créé avec succès pour ${args.client_name}`,
          data: { id: result.insertId, ...args }
        };
      }

      case 'create_prospect': {
        const [result] = await db.query(
          `INSERT INTO prospects (first_name, last_name, email, phone, company, source, estimated_budget, needs, notes, user_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            args.first_name,
            args.last_name,
            args.email || null,
            args.phone || null,
            args.company || null,
            args.source || 'autre',
            args.estimated_budget || null,
            args.needs || null,
            args.notes || null,
            userId
          ]
        );
        return {
          success: true,
          message: `Prospect "${args.first_name} ${args.last_name}" créé avec succès`,
          data: { id: result.insertId, ...args }
        };
      }

      case 'create_task': {
        // Trouver le projet par nom
        const [projects] = await db.query(
          'SELECT id FROM projects WHERE name LIKE ? AND user_id = ? LIMIT 1',
          [`%${args.project_name}%`, userId]
        );

        if (projects.length === 0) {
          return { success: false, message: `Projet "${args.project_name}" non trouvé` };
        }

        const projectId = projects[0].id;

        const [result] = await db.query(
          `INSERT INTO tasks (project_id, title, description, priority, due_date, status)
           VALUES (?, ?, ?, ?, ?, 'todo')`,
          [
            projectId,
            args.title,
            args.description || null,
            args.priority || 'medium',
            args.due_date || null
          ]
        );

        return {
          success: true,
          message: `Tâche "${args.title}" ajoutée au projet "${args.project_name}"`,
          data: { id: result.insertId, project_id: projectId, ...args }
        };
      }

      case 'update_prospect_status': {
        const nameParts = args.prospect_name.split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ') || firstName;

        const [prospects] = await db.query(
          `SELECT id FROM prospects
           WHERE (first_name LIKE ? OR last_name LIKE ? OR CONCAT(first_name, ' ', last_name) LIKE ?)
           AND user_id = ? LIMIT 1`,
          [`%${firstName}%`, `%${lastName}%`, `%${args.prospect_name}%`, userId]
        );

        if (prospects.length === 0) {
          return { success: false, message: `Prospect "${args.prospect_name}" non trouvé` };
        }

        await db.query(
          'UPDATE prospects SET status = ? WHERE id = ?',
          [args.new_status, prospects[0].id]
        );

        return {
          success: true,
          message: `Statut du prospect "${args.prospect_name}" mis à jour vers "${args.new_status}"`,
          data: { id: prospects[0].id, status: args.new_status }
        };
      }

      case 'update_project_status': {
        const [projects] = await db.query(
          'SELECT id FROM projects WHERE name LIKE ? AND user_id = ? LIMIT 1',
          [`%${args.project_name}%`, userId]
        );

        if (projects.length === 0) {
          return { success: false, message: `Projet "${args.project_name}" non trouvé` };
        }

        await db.query(
          'UPDATE projects SET status = ? WHERE id = ?',
          [args.new_status, projects[0].id]
        );

        return {
          success: true,
          message: `Statut du projet "${args.project_name}" mis à jour vers "${args.new_status}"`,
          data: { id: projects[0].id, status: args.new_status }
        };
      }

      case 'add_note_to_project': {
        const [projects] = await db.query(
          'SELECT id FROM projects WHERE name LIKE ? AND user_id = ? LIMIT 1',
          [`%${args.project_name}%`, userId]
        );

        if (projects.length === 0) {
          return { success: false, message: `Projet "${args.project_name}" non trouvé` };
        }

        const [result] = await db.query(
          'INSERT INTO notes (project_id, title, content) VALUES (?, ?, ?)',
          [projects[0].id, args.title, args.content]
        );

        return {
          success: true,
          message: `Note "${args.title}" ajoutée au projet "${args.project_name}"`,
          data: { id: result.insertId, project_id: projects[0].id }
        };
      }

      default:
        return { success: false, message: `Action "${functionName}" non reconnue` };
    }
  } catch (error) {
    console.error('Erreur exécution action:', error);
    return { success: false, message: `Erreur lors de l'exécution: ${error.message}` };
  }
};

// ==========================================
// RÉCUPÉRATION DU CONTEXTE
// ==========================================

const getUserContext = async (userId) => {
  try {
    const [projects] = await db.query(
      `SELECT id, name, client_name, status, budget, deadline, created_at
       FROM projects WHERE user_id = ? ORDER BY created_at DESC LIMIT 20`,
      [userId]
    );

    const [prospects] = await db.query(
      `SELECT id, first_name, last_name, company, status, estimated_budget, source
       FROM prospects WHERE user_id = ? ORDER BY updated_at DESC LIMIT 20`,
      [userId]
    );

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

    const [prospectStats] = await db.query(
      `SELECT
         COUNT(*) as total,
         SUM(CASE WHEN status = 'nouveau' THEN 1 ELSE 0 END) as nouveau,
         SUM(CASE WHEN status = 'gagne' THEN 1 ELSE 0 END) as gagne,
         SUM(CASE WHEN status = 'perdu' THEN 1 ELSE 0 END) as perdu
       FROM prospects WHERE user_id = ?`,
      [userId]
    );

    const [upcomingDeadlines] = await db.query(
      `SELECT name, client_name, deadline
       FROM projects
       WHERE user_id = ? AND deadline IS NOT NULL AND deadline >= CURDATE() AND status != 'termine'
       ORDER BY deadline ASC LIMIT 5`,
      [userId]
    );

    return {
      projects: projects.map(p => ({
        id: p.id,
        nom: p.name,
        client: p.client_name,
        statut: p.status,
        budget: p.budget ? `${p.budget}€` : 'Non défini',
        deadline: p.deadline ? new Date(p.deadline).toLocaleDateString('fr-FR') : 'Pas de deadline'
      })),
      prospects: prospects.map(p => ({
        id: p.id,
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

// ==========================================
// ROUTE PRINCIPALE DU CHAT
// ==========================================

router.post('/chat', async (req, res) => {
  try {
    const { message, conversationHistory = [], confirmAction = null } = req.body;

    if (!message && !confirmAction) {
      return res.status(400).json({ message: 'Message requis' });
    }

    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({ message: 'Clé API Groq non configurée' });
    }

    // Si confirmation d'action reçue
    if (confirmAction) {
      const result = await executeAction(confirmAction.function, confirmAction.args, req.userId);
      return res.json({
        response: result.success
          ? `✅ ${result.message}`
          : `❌ ${result.message}`,
        actionExecuted: result,
        conversationHistory: [
          ...conversationHistory,
          { role: 'assistant', content: result.success ? `✅ ${result.message}` : `❌ ${result.message}` }
        ]
      });
    }

    const userContext = await getUserContext(req.userId);

    const systemPrompt = `Tu es un assistant IA pour Supaco, une application de gestion de projets et de prospection commerciale.
Tu peux EXÉCUTER DES ACTIONS pour l'utilisateur en utilisant les fonctions disponibles.

DONNÉES ACTUELLES DE L'UTILISATEUR :

STATISTIQUES :
${JSON.stringify(userContext?.statistiques, null, 2)}

PROJETS (${userContext?.projects?.length || 0}) :
${JSON.stringify(userContext?.projects?.slice(0, 10), null, 2)}

PROSPECTS (${userContext?.prospects?.length || 0}) :
${JSON.stringify(userContext?.prospects?.slice(0, 10), null, 2)}

DEADLINES PROCHES :
${JSON.stringify(userContext?.deadlines_proches, null, 2)}

INSTRUCTIONS :
- Réponds toujours en français
- Tu PEUX exécuter des actions : créer des projets, prospects, tâches, notes, changer des statuts
- Quand l'utilisateur demande de créer ou modifier quelque chose, utilise les fonctions disponibles
- Si des informations manquent pour une action, demande-les poliment
- Sois proactif : si l'utilisateur dit "crée un projet pour Jean", demande les détails manquants ou utilise des valeurs par défaut
- Confirme toujours ce que tu vas faire avant d'exécuter une action importante
- Pour les dates, utilise le format YYYY-MM-DD`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-10),
      { role: 'user', content: message }
    ];

    // Appel avec tools
    const completion = await groq.chat.completions.create({
      messages,
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 1024,
      tools: availableTools,
      tool_choice: 'auto'
    });

    const responseMessage = completion.choices[0]?.message;

    // Si l'IA veut exécuter une action
    if (responseMessage?.tool_calls && responseMessage.tool_calls.length > 0) {
      const toolCall = responseMessage.tool_calls[0];
      const functionName = toolCall.function.name;
      const functionArgs = JSON.parse(toolCall.function.arguments);

      // Créer un message de confirmation
      const actionDescriptions = {
        create_project: `Créer le projet "${functionArgs.name}" pour ${functionArgs.client_name}`,
        create_prospect: `Créer le prospect "${functionArgs.first_name} ${functionArgs.last_name}"`,
        create_task: `Ajouter la tâche "${functionArgs.title}" au projet "${functionArgs.project_name}"`,
        update_prospect_status: `Changer le statut de "${functionArgs.prospect_name}" vers "${functionArgs.new_status}"`,
        update_project_status: `Changer le statut de "${functionArgs.project_name}" vers "${functionArgs.new_status}"`,
        add_note_to_project: `Ajouter une note "${functionArgs.title}" au projet "${functionArgs.project_name}"`
      };

      const description = actionDescriptions[functionName] || `Exécuter ${functionName}`;

      return res.json({
        response: `Je vais **${description}**. Confirmez-vous cette action ?`,
        pendingAction: {
          function: functionName,
          args: functionArgs,
          description
        },
        conversationHistory: [
          ...conversationHistory,
          { role: 'user', content: message },
          { role: 'assistant', content: `Je vais **${description}**. Confirmez-vous cette action ?` }
        ]
      });
    }

    // Réponse normale sans action
    const aiResponse = responseMessage?.content || 'Désolé, je n\'ai pas pu générer de réponse.';

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

// Route pour exécuter une action confirmée
router.post('/execute-action', async (req, res) => {
  try {
    const { action } = req.body;

    if (!action || !action.function || !action.args) {
      return res.status(400).json({ message: 'Action invalide' });
    }

    const result = await executeAction(action.function, action.args, req.userId);

    res.json({
      success: result.success,
      message: result.message,
      data: result.data
    });

  } catch (error) {
    console.error('Erreur exécution action:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Route pour obtenir des suggestions rapides
router.get('/suggestions', async (req, res) => {
  try {
    const userContext = await getUserContext(req.userId);

    const suggestions = [];

    if (userContext?.statistiques?.prospects?.nouveaux > 0) {
      suggestions.push(`Tu as ${userContext.statistiques.prospects.nouveaux} nouveau(x) prospect(s) à contacter`);
    }

    if (userContext?.deadlines_proches?.length > 0) {
      suggestions.push(`${userContext.deadlines_proches.length} deadline(s) dans les prochains jours`);
    }

    if (userContext?.statistiques?.projets?.en_cours > 0) {
      suggestions.push(`${userContext.statistiques.projets.en_cours} projet(s) en cours`);
    }

    const questionsSuggerees = [
      "Crée un projet pour un nouveau client",
      "Ajoute un prospect",
      "Quelles sont mes prochaines deadlines ?",
      "Résume mon activité",
      "Change le statut d'un projet"
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
