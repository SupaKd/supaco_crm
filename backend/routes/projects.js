const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authMiddleware = require('../middleware/auth');

// Toutes les routes nécessitent l'authentification
router.use(authMiddleware);

// Récupérer tous les projets de l'utilisateur avec leurs tags (avec pagination)
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const status = req.query.status || '';
    const tagId = req.query.tagId || '';

    // Construire la requête avec filtres
    let whereClause = 'WHERE p.user_id = ?';
    let params = [req.userId];

    if (search) {
      whereClause += ' AND (p.name LIKE ? OR p.client_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (status) {
      whereClause += ' AND p.status = ?';
      params.push(status);
    }

    if (tagId) {
      whereClause += ' AND p.id IN (SELECT project_id FROM project_tags WHERE tag_id = ?)';
      params.push(tagId);
    }

    // Compter le total
    const [countResult] = await db.query(
      `SELECT COUNT(DISTINCT p.id) as total FROM projects p ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    // Récupérer les projets paginés
    const [projects] = await db.query(
      `SELECT p.* FROM projects p ${whereClause} ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    // Récupérer les tags pour chaque projet
    const projectsWithTags = await Promise.all(
      projects.map(async (project) => {
        const [tags] = await db.query(
          `SELECT t.id, t.name, t.color
           FROM tags t
           JOIN project_tags pt ON t.id = pt.tag_id
           WHERE pt.project_id = ?`,
          [project.id]
        );
        return { ...project, tags };
      })
    );

    res.json({
      data: projectsWithTags,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erreur récupération projets:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Récupérer un projet spécifique avec ses tags
router.get('/:id', async (req, res) => {
  try {
    const [projects] = await db.query(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );

    if (projects.length === 0) {
      return res.status(404).json({ message: 'Projet non trouvé' });
    }

    // Récupérer les tags du projet
    const [tags] = await db.query(
      `SELECT t.id, t.name, t.color
       FROM tags t
       JOIN project_tags pt ON t.id = pt.tag_id
       WHERE pt.project_id = ?`,
      [req.params.id]
    );

    res.json({ ...projects[0], tags });
  } catch (error) {
    console.error('Erreur récupération projet:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Créer un nouveau projet
router.post('/', async (req, res) => {
  try {
    const { name, client_name, client_email, client_phone, website_url, description, budget, status, deadline } = req.body;

    if (!name || !client_name) {
      return res.status(400).json({ message: 'Nom du projet et nom du client requis' });
    }

    const [result] = await db.query(
      `INSERT INTO projects (name, client_name, client_email, client_phone, website_url, description, budget, status, deadline, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, client_name, client_email, client_phone, website_url, description, budget, status || 'devis', deadline, req.userId]
    );

    const [newProject] = await db.query('SELECT * FROM projects WHERE id = ?', [result.insertId]);

    res.status(201).json(newProject[0]);
  } catch (error) {
    console.error('Erreur création projet:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Mettre à jour un projet
router.put('/:id', async (req, res) => {
  try {
    const { name, client_name, client_email, client_phone, website_url, description, budget, status, deadline } = req.body;

    // Vérifier que le projet appartient à l'utilisateur
    const [existingProject] = await db.query(
      'SELECT id FROM projects WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );

    if (existingProject.length === 0) {
      return res.status(404).json({ message: 'Projet non trouvé' });
    }

    await db.query(
      `UPDATE projects
       SET name = ?, client_name = ?, client_email = ?, client_phone = ?, website_url = ?,
           description = ?, budget = ?, status = ?, deadline = ?
       WHERE id = ? AND user_id = ?`,
      [name, client_name, client_email, client_phone, website_url, description, budget, status, deadline, req.params.id, req.userId]
    );

    const [updatedProject] = await db.query('SELECT * FROM projects WHERE id = ?', [req.params.id]);

    res.json(updatedProject[0]);
  } catch (error) {
    console.error('Erreur mise à jour projet:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Supprimer un projet
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query(
      'DELETE FROM projects WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Projet non trouvé' });
    }

    res.json({ message: 'Projet supprimé avec succès' });
  } catch (error) {
    console.error('Erreur suppression projet:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;