const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

// Récupérer toutes les tâches d'un projet
router.get('/project/:projectId', async (req, res) => {
  try {
    // Vérifier que le projet appartient à l'utilisateur
    const [project] = await db.query(
      'SELECT id FROM projects WHERE id = ? AND user_id = ?',
      [req.params.projectId, req.userId]
    );

    if (project.length === 0) {
      return res.status(404).json({ message: 'Projet non trouvé' });
    }

    const [tasks] = await db.query(
      'SELECT * FROM tasks WHERE project_id = ? ORDER BY created_at DESC',
      [req.params.projectId]
    );
    
    res.json(tasks);
  } catch (error) {
    console.error('Erreur récupération tâches:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Créer une nouvelle tâche
router.post('/', async (req, res) => {
  try {
    const { project_id, title, description, status, priority } = req.body;

    if (!project_id || !title) {
      return res.status(400).json({ message: 'ID du projet et titre requis' });
    }

    // Vérifier que le projet appartient à l'utilisateur
    const [project] = await db.query(
      'SELECT id FROM projects WHERE id = ? AND user_id = ?',
      [project_id, req.userId]
    );

    if (project.length === 0) {
      return res.status(404).json({ message: 'Projet non trouvé' });
    }

    const [result] = await db.query(
      'INSERT INTO tasks (project_id, title, description, status, priority) VALUES (?, ?, ?, ?, ?)',
      [project_id, title, description, status || 'a_faire', priority || 'moyenne']
    );

    const [newTask] = await db.query('SELECT * FROM tasks WHERE id = ?', [result.insertId]);
    
    res.status(201).json(newTask[0]);
  } catch (error) {
    console.error('Erreur création tâche:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Mettre à jour une tâche
router.put('/:id', async (req, res) => {
  try {
    const { title, description, status, priority } = req.body;

    // Vérifier que la tâche existe et appartient à un projet de l'utilisateur
    const [task] = await db.query(
      `SELECT t.id FROM tasks t 
       JOIN projects p ON t.project_id = p.id 
       WHERE t.id = ? AND p.user_id = ?`,
      [req.params.id, req.userId]
    );

    if (task.length === 0) {
      return res.status(404).json({ message: 'Tâche non trouvée' });
    }

    await db.query(
      'UPDATE tasks SET title = ?, description = ?, status = ?, priority = ? WHERE id = ?',
      [title, description, status, priority, req.params.id]
    );

    const [updatedTask] = await db.query('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    
    res.json(updatedTask[0]);
  } catch (error) {
    console.error('Erreur mise à jour tâche:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Supprimer une tâche
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query(
      `DELETE t FROM tasks t 
       JOIN projects p ON t.project_id = p.id 
       WHERE t.id = ? AND p.user_id = ?`,
      [req.params.id, req.userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Tâche non trouvée' });
    }

    res.json({ message: 'Tâche supprimée avec succès' });
  } catch (error) {
    console.error('Erreur suppression tâche:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;