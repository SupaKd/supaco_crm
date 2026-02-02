const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authMiddleware = require('../middleware/auth');

// Toutes les routes nécessitent l'authentification
router.use(authMiddleware);

// Recherche globale
router.get('/', async (req, res) => {
  try {
    const query = req.query.q || '';
    const limit = parseInt(req.query.limit) || 10;

    if (!query || query.length < 2) {
      return res.json({
        projects: [],
        tasks: [],
        clients: [],
        notes: []
      });
    }

    const searchPattern = `%${query}%`;

    // Rechercher dans les projets
    const [projects] = await db.query(
      `SELECT id, name, client_name, status, budget, deadline
       FROM projects
       WHERE user_id = ? AND (name LIKE ? OR client_name LIKE ? OR description LIKE ?)
       ORDER BY created_at DESC
       LIMIT ?`,
      [req.userId, searchPattern, searchPattern, searchPattern, limit]
    );

    // Rechercher dans les tâches
    const [tasks] = await db.query(
      `SELECT t.id, t.title, t.description, t.status, t.priority, t.project_id, p.name as project_name
       FROM tasks t
       JOIN projects p ON t.project_id = p.id
       WHERE p.user_id = ? AND (t.title LIKE ? OR t.description LIKE ?)
       ORDER BY t.created_at DESC
       LIMIT ?`,
      [req.userId, searchPattern, searchPattern, limit]
    );

    // Rechercher des clients uniques
    const [clients] = await db.query(
      `SELECT DISTINCT client_name, client_email, client_phone, COUNT(*) as project_count
       FROM projects
       WHERE user_id = ? AND (client_name LIKE ? OR client_email LIKE ?)
       GROUP BY client_name, client_email, client_phone
       ORDER BY project_count DESC
       LIMIT ?`,
      [req.userId, searchPattern, searchPattern, limit]
    );

    // Rechercher dans les notes
    const [notes] = await db.query(
      `SELECT n.id, n.content, n.project_id, p.name as project_name
       FROM notes n
       JOIN projects p ON n.project_id = p.id
       WHERE p.user_id = ? AND n.content LIKE ?
       ORDER BY n.created_at DESC
       LIMIT ?`,
      [req.userId, searchPattern, limit]
    );

    res.json({
      query,
      projects,
      tasks,
      clients,
      notes,
      total: projects.length + tasks.length + clients.length + notes.length
    });
  } catch (error) {
    console.error('Erreur recherche globale:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
