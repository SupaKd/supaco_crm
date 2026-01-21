const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authMiddleware = require('../middleware/auth');

// Toutes les routes nécessitent l'authentification
router.use(authMiddleware);

// Récupérer toutes les factures annexes d'un projet
router.get('/project/:projectId', async (req, res) => {
  try {
    const [invoices] = await db.query(
      `SELECT * FROM project_invoices
       WHERE project_id = ?
       ORDER BY invoice_date DESC`,
      [req.params.projectId]
    );
    res.json(invoices);
  } catch (error) {
    console.error('Erreur récupération factures:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Créer une nouvelle facture annexe
router.post('/', async (req, res) => {
  try {
    const {
      project_id,
      invoice_number,
      title,
      description,
      amount,
      invoice_date,
      due_date,
      status,
      category
    } = req.body;

    if (!project_id || !title || !amount) {
      return res.status(400).json({ message: 'Projet, titre et montant requis' });
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
      `INSERT INTO project_invoices
       (project_id, invoice_number, title, description, amount, invoice_date, due_date, status, category)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        project_id,
        invoice_number || null,
        title,
        description || null,
        amount,
        invoice_date || new Date(),
        due_date || null,
        status || 'en_attente',
        category || 'autre'
      ]
    );

    const [newInvoice] = await db.query('SELECT * FROM project_invoices WHERE id = ?', [result.insertId]);
    res.status(201).json(newInvoice[0]);
  } catch (error) {
    console.error('Erreur création facture:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Mettre à jour une facture annexe
router.put('/:id', async (req, res) => {
  try {
    const {
      invoice_number,
      title,
      description,
      amount,
      invoice_date,
      due_date,
      status,
      category
    } = req.body;

    // Vérifier que la facture appartient à un projet de l'utilisateur
    const [existing] = await db.query(
      `SELECT pi.id FROM project_invoices pi
       JOIN projects p ON pi.project_id = p.id
       WHERE pi.id = ? AND p.user_id = ?`,
      [req.params.id, req.userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ message: 'Facture non trouvée' });
    }

    await db.query(
      `UPDATE project_invoices
       SET invoice_number = ?, title = ?, description = ?, amount = ?,
           invoice_date = ?, due_date = ?, status = ?, category = ?
       WHERE id = ?`,
      [invoice_number, title, description, amount, invoice_date, due_date, status, category, req.params.id]
    );

    const [updated] = await db.query('SELECT * FROM project_invoices WHERE id = ?', [req.params.id]);
    res.json(updated[0]);
  } catch (error) {
    console.error('Erreur mise à jour facture:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Supprimer une facture annexe
router.delete('/:id', async (req, res) => {
  try {
    // Vérifier que la facture appartient à un projet de l'utilisateur
    const [existing] = await db.query(
      `SELECT pi.id FROM project_invoices pi
       JOIN projects p ON pi.project_id = p.id
       WHERE pi.id = ? AND p.user_id = ?`,
      [req.params.id, req.userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ message: 'Facture non trouvée' });
    }

    await db.query('DELETE FROM project_invoices WHERE id = ?', [req.params.id]);
    res.json({ message: 'Facture supprimée' });
  } catch (error) {
    console.error('Erreur suppression facture:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Récupérer le total des factures annexes d'un projet
router.get('/project/:projectId/total', async (req, res) => {
  try {
    const [result] = await db.query(
      `SELECT
         COUNT(*) as count,
         SUM(amount) as total,
         SUM(CASE WHEN status = 'payee' THEN amount ELSE 0 END) as paid,
         SUM(CASE WHEN status = 'en_attente' THEN amount ELSE 0 END) as pending
       FROM project_invoices
       WHERE project_id = ?`,
      [req.params.projectId]
    );
    res.json(result[0]);
  } catch (error) {
    console.error('Erreur calcul total factures:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
