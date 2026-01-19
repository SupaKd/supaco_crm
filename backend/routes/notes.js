const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

// Récupérer toutes les notes d'un projet
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

    const [notes] = await db.query(
      'SELECT * FROM notes WHERE project_id = ? ORDER BY created_at DESC',
      [req.params.projectId]
    );
    
    res.json(notes);
  } catch (error) {
    console.error('Erreur récupération notes:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Créer une nouvelle note
router.post('/', async (req, res) => {
  try {
    const { project_id, content } = req.body;

    if (!project_id || !content) {
      return res.status(400).json({ message: 'ID du projet et contenu requis' });
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
      'INSERT INTO notes (project_id, content) VALUES (?, ?)',
      [project_id, content]
    );

    const [newNote] = await db.query('SELECT * FROM notes WHERE id = ?', [result.insertId]);
    
    res.status(201).json(newNote[0]);
  } catch (error) {
    console.error('Erreur création note:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Mettre à jour une note
router.put('/:id', async (req, res) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ message: 'Contenu requis' });
    }

    // Vérifier que la note existe et appartient à un projet de l'utilisateur
    const [note] = await db.query(
      `SELECT n.id FROM notes n 
       JOIN projects p ON n.project_id = p.id 
       WHERE n.id = ? AND p.user_id = ?`,
      [req.params.id, req.userId]
    );

    if (note.length === 0) {
      return res.status(404).json({ message: 'Note non trouvée' });
    }

    await db.query(
      'UPDATE notes SET content = ? WHERE id = ?',
      [content, req.params.id]
    );

    const [updatedNote] = await db.query('SELECT * FROM notes WHERE id = ?', [req.params.id]);
    
    res.json(updatedNote[0]);
  } catch (error) {
    console.error('Erreur mise à jour note:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Supprimer une note
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query(
      `DELETE n FROM notes n 
       JOIN projects p ON n.project_id = p.id 
       WHERE n.id = ? AND p.user_id = ?`,
      [req.params.id, req.userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Note non trouvée' });
    }

    res.json({ message: 'Note supprimée avec succès' });
  } catch (error) {
    console.error('Erreur suppression note:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;