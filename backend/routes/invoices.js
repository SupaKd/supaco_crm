const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authMiddleware = require('../middleware/auth');
const { validateBody, invoiceSchema } = require('../validators/schemas');

// Toutes les routes nécessitent l'authentification
router.use(authMiddleware);

// Helper pour vérifier l'accès au projet
const verifyProjectAccess = async (projectId, userId) => {
  const [project] = await db.query(
    'SELECT id FROM projects WHERE id = ? AND user_id = ?',
    [projectId, userId]
  );
  return project.length > 0;
};

// Récupérer toutes les factures annexes d'un projet
router.get('/project/:projectId', async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    if (isNaN(projectId) || projectId <= 0) {
      return res.status(400).json({ message: 'ID de projet invalide' });
    }

    // Vérifier que le projet appartient à l'utilisateur
    const hasAccess = await verifyProjectAccess(projectId, req.userId);
    if (!hasAccess) {
      return res.status(404).json({ message: 'Projet non trouvé' });
    }

    const [invoices] = await db.query(
      `SELECT * FROM project_invoices
       WHERE project_id = ?
       ORDER BY invoice_date DESC`,
      [projectId]
    );
    res.json(invoices);
  } catch (error) {
    console.error('Erreur récupération factures:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Créer une nouvelle facture annexe
router.post('/', validateBody(invoiceSchema), async (req, res) => {
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

    // Vérifier que le projet appartient à l'utilisateur
    const hasAccess = await verifyProjectAccess(project_id, req.userId);
    if (!hasAccess) {
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
    const invoiceId = parseInt(req.params.id);
    if (isNaN(invoiceId) || invoiceId <= 0) {
      return res.status(400).json({ message: 'ID de facture invalide' });
    }

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
      [invoiceId, req.userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ message: 'Facture non trouvée' });
    }

    await db.query(
      `UPDATE project_invoices
       SET invoice_number = ?, title = ?, description = ?, amount = ?,
           invoice_date = ?, due_date = ?, status = ?, category = ?
       WHERE id = ?`,
      [invoice_number, title, description, amount, invoice_date, due_date, status, category, invoiceId]
    );

    const [updated] = await db.query('SELECT * FROM project_invoices WHERE id = ?', [invoiceId]);
    res.json(updated[0]);
  } catch (error) {
    console.error('Erreur mise à jour facture:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Supprimer une facture annexe
router.delete('/:id', async (req, res) => {
  try {
    const invoiceId = parseInt(req.params.id);
    if (isNaN(invoiceId) || invoiceId <= 0) {
      return res.status(400).json({ message: 'ID de facture invalide' });
    }

    // Vérifier que la facture appartient à un projet de l'utilisateur
    const [existing] = await db.query(
      `SELECT pi.id FROM project_invoices pi
       JOIN projects p ON pi.project_id = p.id
       WHERE pi.id = ? AND p.user_id = ?`,
      [invoiceId, req.userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ message: 'Facture non trouvée' });
    }

    await db.query('DELETE FROM project_invoices WHERE id = ?', [invoiceId]);
    res.json({ message: 'Facture supprimée' });
  } catch (error) {
    console.error('Erreur suppression facture:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Récupérer le total des factures annexes d'un projet
router.get('/project/:projectId/total', async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    if (isNaN(projectId) || projectId <= 0) {
      return res.status(400).json({ message: 'ID de projet invalide' });
    }

    // Vérifier que le projet appartient à l'utilisateur
    const hasAccess = await verifyProjectAccess(projectId, req.userId);
    if (!hasAccess) {
      return res.status(404).json({ message: 'Projet non trouvé' });
    }

    const [result] = await db.query(
      `SELECT
         COUNT(*) as count,
         COALESCE(SUM(amount), 0) as total,
         COALESCE(SUM(CASE WHEN status = 'payee' THEN amount ELSE 0 END), 0) as paid,
         COALESCE(SUM(CASE WHEN status = 'en_attente' THEN amount ELSE 0 END), 0) as pending
       FROM project_invoices
       WHERE project_id = ?`,
      [projectId]
    );
    res.json(result[0]);
  } catch (error) {
    console.error('Erreur calcul total factures:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
