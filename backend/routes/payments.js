const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authMiddleware = require('../middleware/auth');
const { validateBody, paymentSchema } = require('../validators/schemas');

// Toutes les routes nécessitent l'authentification
router.use(authMiddleware);

// Créer la table si elle n'existe pas
const initTable = async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS project_payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_id INT NOT NULL,
        label VARCHAR(255) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        due_date DATE DEFAULT NULL,
        paid_at DATE DEFAULT NULL,
        status ENUM('en_attente', 'payee') DEFAULT 'en_attente',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      )
    `);
  } catch (error) {
    console.error('Erreur création table project_payments:', error);
  }
};
initTable();

// Helper pour vérifier l'accès au projet
const verifyProjectAccess = async (projectId, userId) => {
  const [project] = await db.query(
    'SELECT id FROM projects WHERE id = ? AND user_id = ?',
    [projectId, userId]
  );
  return project.length > 0;
};

// Récupérer toutes les échéances d'un projet
router.get('/project/:projectId', async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    if (isNaN(projectId) || projectId <= 0) {
      return res.status(400).json({ message: 'ID de projet invalide' });
    }

    const hasAccess = await verifyProjectAccess(projectId, req.userId);
    if (!hasAccess) {
      return res.status(404).json({ message: 'Projet non trouvé' });
    }

    const [payments] = await db.query(
      `SELECT * FROM project_payments
       WHERE project_id = ?
       ORDER BY due_date ASC, created_at ASC`,
      [projectId]
    );
    res.json(payments);
  } catch (error) {
    console.error('Erreur récupération paiements:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Résumé des paiements d'un projet
router.get('/project/:projectId/summary', async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    if (isNaN(projectId) || projectId <= 0) {
      return res.status(400).json({ message: 'ID de projet invalide' });
    }

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
       FROM project_payments
       WHERE project_id = ?`,
      [projectId]
    );
    res.json(result[0]);
  } catch (error) {
    console.error('Erreur calcul résumé paiements:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Créer une échéance
router.post('/', validateBody(paymentSchema), async (req, res) => {
  try {
    const { project_id, label, amount, due_date, status } = req.body;

    const hasAccess = await verifyProjectAccess(project_id, req.userId);
    if (!hasAccess) {
      return res.status(404).json({ message: 'Projet non trouvé' });
    }

    const paid_at = status === 'payee' ? new Date().toISOString().split('T')[0] : null;

    const [result] = await db.query(
      `INSERT INTO project_payments (project_id, label, amount, due_date, paid_at, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [project_id, label, amount, due_date || null, paid_at, status || 'en_attente']
    );

    const [newPayment] = await db.query('SELECT * FROM project_payments WHERE id = ?', [result.insertId]);
    res.status(201).json(newPayment[0]);
  } catch (error) {
    console.error('Erreur création paiement:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Mettre à jour une échéance
router.put('/:id', async (req, res) => {
  try {
    const paymentId = parseInt(req.params.id);
    if (isNaN(paymentId) || paymentId <= 0) {
      return res.status(400).json({ message: 'ID de paiement invalide' });
    }

    const { label, amount, due_date, status } = req.body;

    // Vérifier que le paiement appartient à un projet de l'utilisateur
    const [existing] = await db.query(
      `SELECT pp.* FROM project_payments pp
       JOIN projects p ON pp.project_id = p.id
       WHERE pp.id = ? AND p.user_id = ?`,
      [paymentId, req.userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ message: 'Paiement non trouvé' });
    }

    const current = existing[0];
    const newStatus = status || current.status;
    let paid_at = current.paid_at;

    if (newStatus === 'payee' && current.status !== 'payee') {
      paid_at = new Date().toISOString().split('T')[0];
    } else if (newStatus === 'en_attente') {
      paid_at = null;
    }

    await db.query(
      `UPDATE project_payments
       SET label = ?, amount = ?, due_date = ?, paid_at = ?, status = ?
       WHERE id = ?`,
      [
        label || current.label,
        amount || current.amount,
        due_date !== undefined ? (due_date || null) : current.due_date,
        paid_at,
        newStatus,
        paymentId
      ]
    );

    const [updated] = await db.query('SELECT * FROM project_payments WHERE id = ?', [paymentId]);
    res.json(updated[0]);
  } catch (error) {
    console.error('Erreur mise à jour paiement:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Basculer le statut d'une échéance
router.patch('/:id/toggle', async (req, res) => {
  try {
    const paymentId = parseInt(req.params.id);
    if (isNaN(paymentId) || paymentId <= 0) {
      return res.status(400).json({ message: 'ID de paiement invalide' });
    }

    const [existing] = await db.query(
      `SELECT pp.* FROM project_payments pp
       JOIN projects p ON pp.project_id = p.id
       WHERE pp.id = ? AND p.user_id = ?`,
      [paymentId, req.userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ message: 'Paiement non trouvé' });
    }

    const current = existing[0];
    const newStatus = current.status === 'payee' ? 'en_attente' : 'payee';
    const paid_at = newStatus === 'payee' ? new Date().toISOString().split('T')[0] : null;

    await db.query(
      `UPDATE project_payments SET status = ?, paid_at = ? WHERE id = ?`,
      [newStatus, paid_at, paymentId]
    );

    const [updated] = await db.query('SELECT * FROM project_payments WHERE id = ?', [paymentId]);
    res.json(updated[0]);
  } catch (error) {
    console.error('Erreur toggle paiement:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Supprimer une échéance
router.delete('/:id', async (req, res) => {
  try {
    const paymentId = parseInt(req.params.id);
    if (isNaN(paymentId) || paymentId <= 0) {
      return res.status(400).json({ message: 'ID de paiement invalide' });
    }

    const [existing] = await db.query(
      `SELECT pp.id FROM project_payments pp
       JOIN projects p ON pp.project_id = p.id
       WHERE pp.id = ? AND p.user_id = ?`,
      [paymentId, req.userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ message: 'Paiement non trouvé' });
    }

    await db.query('DELETE FROM project_payments WHERE id = ?', [paymentId]);
    res.json({ message: 'Échéance supprimée' });
  } catch (error) {
    console.error('Erreur suppression paiement:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
