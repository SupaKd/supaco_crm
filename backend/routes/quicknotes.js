const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

// Récupérer toutes les notes rapides de l'utilisateur
router.get('/', async (req, res) => {
  try {
    const [notes] = await db.query(
      'SELECT * FROM quicknotes WHERE user_id = ? ORDER BY is_pinned DESC, updated_at DESC',
      [req.userId]
    );
    res.json(notes);
  } catch (error) {
    console.error('Erreur récupération quicknotes:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Créer une nouvelle note rapide
router.post('/', async (req, res) => {
  try {
    const { content, color } = req.body;

    if (!content) {
      return res.status(400).json({ message: 'Contenu requis' });
    }

    const [result] = await db.query(
      'INSERT INTO quicknotes (user_id, content, color) VALUES (?, ?, ?)',
      [req.userId, content, color || '#fef3c7']
    );

    const [newNote] = await db.query('SELECT * FROM quicknotes WHERE id = ?', [result.insertId]);
    res.status(201).json(newNote[0]);
  } catch (error) {
    console.error('Erreur création quicknote:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Mettre à jour une note rapide
router.put('/:id', async (req, res) => {
  try {
    const { content, color, is_pinned } = req.body;

    // Vérifier que la note appartient à l'utilisateur
    const [note] = await db.query(
      'SELECT * FROM quicknotes WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );

    if (note.length === 0) {
      return res.status(404).json({ message: 'Note non trouvée' });
    }

    const updates = [];
    const values = [];

    if (content !== undefined) {
      updates.push('content = ?');
      values.push(content);
    }
    if (color !== undefined) {
      updates.push('color = ?');
      values.push(color);
    }
    if (is_pinned !== undefined) {
      updates.push('is_pinned = ?');
      values.push(is_pinned);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'Aucune modification fournie' });
    }

    values.push(req.params.id);

    await db.query(
      `UPDATE quicknotes SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
      values
    );

    const [updatedNote] = await db.query('SELECT * FROM quicknotes WHERE id = ?', [req.params.id]);
    res.json(updatedNote[0]);
  } catch (error) {
    console.error('Erreur mise à jour quicknote:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Épingler/Désépingler une note
router.patch('/:id/pin', async (req, res) => {
  try {
    const [note] = await db.query(
      'SELECT * FROM quicknotes WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );

    if (note.length === 0) {
      return res.status(404).json({ message: 'Note non trouvée' });
    }

    const newPinStatus = !note[0].is_pinned;

    await db.query(
      'UPDATE quicknotes SET is_pinned = ?, updated_at = NOW() WHERE id = ?',
      [newPinStatus, req.params.id]
    );

    const [updatedNote] = await db.query('SELECT * FROM quicknotes WHERE id = ?', [req.params.id]);
    res.json(updatedNote[0]);
  } catch (error) {
    console.error('Erreur pin quicknote:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Supprimer une note rapide
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query(
      'DELETE FROM quicknotes WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Note non trouvée' });
    }

    res.json({ message: 'Note supprimée avec succès' });
  } catch (error) {
    console.error('Erreur suppression quicknote:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
