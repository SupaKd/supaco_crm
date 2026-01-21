const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authMiddleware = require('../middleware/auth');

// Toutes les routes nécessitent l'authentification
router.use(authMiddleware);

// Récupérer tous les prospects de l'utilisateur (avec pagination optionnelle)
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 0;
    const search = req.query.search || '';
    const status = req.query.status || '';

    // Construire la requête avec filtres
    let whereClause = 'WHERE p.user_id = ?';
    let params = [req.userId];

    if (search) {
      whereClause += ' AND (p.first_name LIKE ? OR p.last_name LIKE ? OR p.company LIKE ? OR p.email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (status) {
      whereClause += ' AND p.status = ?';
      params.push(status);
    }

    // Si pas de pagination, retourner tous les résultats (comportement par défaut pour le Kanban)
    if (!page && !limit) {
      const [prospects] = await db.query(
        `SELECT p.*, pr.name as project_name
         FROM prospects p
         LEFT JOIN projects pr ON p.project_id = pr.id
         ${whereClause}
         ORDER BY p.updated_at DESC`,
        params
      );
      return res.json(prospects);
    }

    // Avec pagination
    const offset = (page - 1) * limit;

    // Compter le total
    const [countResult] = await db.query(
      `SELECT COUNT(*) as total FROM prospects p ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    // Récupérer les prospects paginés
    const [prospects] = await db.query(
      `SELECT p.*, pr.name as project_name
       FROM prospects p
       LEFT JOIN projects pr ON p.project_id = pr.id
       ${whereClause}
       ORDER BY p.updated_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      data: prospects,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erreur récupération prospects:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Récupérer un prospect spécifique
router.get('/:id', async (req, res) => {
  try {
    const [prospects] = await db.query(
      `SELECT p.*, pr.name as project_name
       FROM prospects p
       LEFT JOIN projects pr ON p.project_id = pr.id
       WHERE p.id = ? AND p.user_id = ?`,
      [req.params.id, req.userId]
    );

    if (prospects.length === 0) {
      return res.status(404).json({ message: 'Prospect non trouvé' });
    }

    res.json(prospects[0]);
  } catch (error) {
    console.error('Erreur récupération prospect:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Créer un nouveau prospect
router.post('/', async (req, res) => {
  try {
    const { first_name, last_name, email, phone, company, source, estimated_budget, needs, notes } = req.body;

    if (!first_name || !last_name) {
      return res.status(400).json({ message: 'Prénom et nom requis' });
    }

    const [result] = await db.query(
      `INSERT INTO prospects (first_name, last_name, email, phone, company, source, estimated_budget, needs, notes, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [first_name, last_name, email, phone, company, source || 'autre', estimated_budget, needs, notes, req.userId]
    );

    const [newProspect] = await db.query('SELECT * FROM prospects WHERE id = ?', [result.insertId]);
    res.status(201).json(newProspect[0]);
  } catch (error) {
    console.error('Erreur création prospect:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Mettre à jour un prospect
router.put('/:id', async (req, res) => {
  try {
    const { first_name, last_name, email, phone, company, source, estimated_budget, needs, notes } = req.body;

    // Vérifier que le prospect appartient à l'utilisateur
    const [existing] = await db.query(
      'SELECT id FROM prospects WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ message: 'Prospect non trouvé' });
    }

    await db.query(
      `UPDATE prospects
       SET first_name = ?, last_name = ?, email = ?, phone = ?, company = ?,
           source = ?, estimated_budget = ?, needs = ?, notes = ?
       WHERE id = ? AND user_id = ?`,
      [first_name, last_name, email, phone, company, source, estimated_budget, needs, notes, req.params.id, req.userId]
    );

    const [updated] = await db.query('SELECT * FROM prospects WHERE id = ?', [req.params.id]);
    res.json(updated[0]);
  } catch (error) {
    console.error('Erreur mise à jour prospect:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Changer le statut d'un prospect (avec conversion automatique si "gagne")
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['nouveau', 'contacte', 'qualification', 'proposition', 'negociation', 'gagne', 'perdu'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Statut invalide' });
    }

    // Vérifier que le prospect appartient à l'utilisateur
    const [prospects] = await db.query(
      'SELECT * FROM prospects WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );

    if (prospects.length === 0) {
      return res.status(404).json({ message: 'Prospect non trouvé' });
    }

    const prospect = prospects[0];

    // Si le statut passe à "gagne" et qu'il n'y a pas déjà de projet lié
    if (status === 'gagne' && !prospect.project_id) {
      // Créer automatiquement un projet
      const [projectResult] = await db.query(
        `INSERT INTO projects (name, client_name, client_email, client_phone, description, budget, status, user_id)
         VALUES (?, ?, ?, ?, ?, ?, 'devis', ?)`,
        [
          `Projet ${prospect.first_name} ${prospect.last_name}`,
          `${prospect.first_name} ${prospect.last_name}`,
          prospect.email,
          prospect.phone,
          prospect.needs,
          prospect.estimated_budget,
          req.userId
        ]
      );

      // Mettre à jour le prospect avec le lien vers le projet
      await db.query(
        'UPDATE prospects SET status = ?, project_id = ? WHERE id = ?',
        [status, projectResult.insertId, req.params.id]
      );

      const [updated] = await db.query(
        `SELECT p.*, pr.name as project_name
         FROM prospects p
         LEFT JOIN projects pr ON p.project_id = pr.id
         WHERE p.id = ?`,
        [req.params.id]
      );

      return res.json({
        prospect: updated[0],
        projectCreated: true,
        projectId: projectResult.insertId
      });
    }

    // Mise à jour simple du statut
    await db.query(
      'UPDATE prospects SET status = ? WHERE id = ?',
      [status, req.params.id]
    );

    const [updated] = await db.query(
      `SELECT p.*, pr.name as project_name
       FROM prospects p
       LEFT JOIN projects pr ON p.project_id = pr.id
       WHERE p.id = ?`,
      [req.params.id]
    );

    res.json({ prospect: updated[0], projectCreated: false });
  } catch (error) {
    console.error('Erreur changement statut:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Supprimer un prospect
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query(
      'DELETE FROM prospects WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Prospect non trouvé' });
    }

    res.json({ message: 'Prospect supprimé avec succès' });
  } catch (error) {
    console.error('Erreur suppression prospect:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Récupérer les interactions d'un prospect
router.get('/:id/interactions', async (req, res) => {
  try {
    // Vérifier que le prospect appartient à l'utilisateur
    const [prospects] = await db.query(
      'SELECT id FROM prospects WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );

    if (prospects.length === 0) {
      return res.status(404).json({ message: 'Prospect non trouvé' });
    }

    const [interactions] = await db.query(
      'SELECT * FROM prospect_interactions WHERE prospect_id = ? ORDER BY created_at DESC',
      [req.params.id]
    );

    res.json(interactions);
  } catch (error) {
    console.error('Erreur récupération interactions:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Ajouter une interaction à un prospect
router.post('/:id/interactions', async (req, res) => {
  try {
    const { type, content } = req.body;

    if (!content) {
      return res.status(400).json({ message: 'Contenu requis' });
    }

    // Vérifier que le prospect appartient à l'utilisateur
    const [prospects] = await db.query(
      'SELECT id FROM prospects WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );

    if (prospects.length === 0) {
      return res.status(404).json({ message: 'Prospect non trouvé' });
    }

    const [result] = await db.query(
      'INSERT INTO prospect_interactions (prospect_id, type, content) VALUES (?, ?, ?)',
      [req.params.id, type || 'note', content]
    );

    const [newInteraction] = await db.query(
      'SELECT * FROM prospect_interactions WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json(newInteraction[0]);
  } catch (error) {
    console.error('Erreur ajout interaction:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
