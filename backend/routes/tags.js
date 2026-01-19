const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

// Récupérer tous les tags de l'utilisateur
router.get('/', async (req, res) => {
  try {
    const [tags] = await db.query(
      'SELECT * FROM tags WHERE user_id = ? ORDER BY name ASC',
      [req.userId]
    );
    res.json(tags);
  } catch (error) {
    console.error('Erreur récupération tags:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Créer un nouveau tag
router.post('/', async (req, res) => {
  try {
    const { name, color } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Nom du tag requis' });
    }

    const [result] = await db.query(
      'INSERT INTO tags (name, color, user_id) VALUES (?, ?, ?)',
      [name, color || '#3b82f6', req.userId]
    );

    const [newTag] = await db.query('SELECT * FROM tags WHERE id = ?', [result.insertId]);

    res.status(201).json(newTag[0]);
  } catch (error) {
    console.error('Erreur création tag:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Mettre à jour un tag
router.put('/:id', async (req, res) => {
  try {
    const { name, color } = req.body;

    // Vérifier que le tag appartient à l'utilisateur
    const [existingTag] = await db.query(
      'SELECT id FROM tags WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );

    if (existingTag.length === 0) {
      return res.status(404).json({ message: 'Tag non trouvé' });
    }

    await db.query(
      'UPDATE tags SET name = ?, color = ? WHERE id = ?',
      [name, color, req.params.id]
    );

    const [updatedTag] = await db.query('SELECT * FROM tags WHERE id = ?', [req.params.id]);

    res.json(updatedTag[0]);
  } catch (error) {
    console.error('Erreur mise à jour tag:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Supprimer un tag
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query(
      'DELETE FROM tags WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Tag non trouvé' });
    }

    res.json({ message: 'Tag supprimé avec succès' });
  } catch (error) {
    console.error('Erreur suppression tag:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Ajouter un tag à un projet
router.post('/project/:projectId/tag/:tagId', async (req, res) => {
  try {
    const { projectId, tagId } = req.params;

    // Vérifier que le projet appartient à l'utilisateur
    const [project] = await db.query(
      'SELECT id FROM projects WHERE id = ? AND user_id = ?',
      [projectId, req.userId]
    );

    if (project.length === 0) {
      return res.status(404).json({ message: 'Projet non trouvé' });
    }

    // Vérifier que le tag appartient à l'utilisateur
    const [tag] = await db.query(
      'SELECT id FROM tags WHERE id = ? AND user_id = ?',
      [tagId, req.userId]
    );

    if (tag.length === 0) {
      return res.status(404).json({ message: 'Tag non trouvé' });
    }

    // Ajouter le tag au projet (ignore si existe déjà)
    await db.query(
      'INSERT IGNORE INTO project_tags (project_id, tag_id) VALUES (?, ?)',
      [projectId, tagId]
    );

    res.json({ message: 'Tag ajouté au projet' });
  } catch (error) {
    console.error('Erreur ajout tag au projet:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Retirer un tag d'un projet
router.delete('/project/:projectId/tag/:tagId', async (req, res) => {
  try {
    const { projectId, tagId } = req.params;

    // Vérifier que le projet appartient à l'utilisateur
    const [project] = await db.query(
      'SELECT id FROM projects WHERE id = ? AND user_id = ?',
      [projectId, req.userId]
    );

    if (project.length === 0) {
      return res.status(404).json({ message: 'Projet non trouvé' });
    }

    await db.query(
      'DELETE FROM project_tags WHERE project_id = ? AND tag_id = ?',
      [projectId, tagId]
    );

    res.json({ message: 'Tag retiré du projet' });
  } catch (error) {
    console.error('Erreur retrait tag du projet:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Récupérer les tags d'un projet
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

    const [tags] = await db.query(
      `SELECT t.* FROM tags t
       JOIN project_tags pt ON t.id = pt.tag_id
       WHERE pt.project_id = ?
       ORDER BY t.name ASC`,
      [req.params.projectId]
    );

    res.json(tags);
  } catch (error) {
    console.error('Erreur récupération tags du projet:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
