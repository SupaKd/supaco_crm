const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../config/db');
const authMiddleware = require('../middleware/auth');

// Configuration de multer pour le stockage des fichiers
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

// Filtre pour les types de fichiers autorisés
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Type de fichier non autorisé'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10 Mo max
});

// Toutes les routes nécessitent l'authentification
router.use(authMiddleware);

// Récupérer les pièces jointes d'un projet
router.get('/project/:projectId', async (req, res) => {
  try {
    // Vérifier que le projet appartient à l'utilisateur
    const [projects] = await db.query(
      'SELECT id FROM projects WHERE id = ? AND user_id = ?',
      [req.params.projectId, req.userId]
    );

    if (projects.length === 0) {
      return res.status(404).json({ message: 'Projet non trouvé' });
    }

    const [attachments] = await db.query(
      'SELECT * FROM attachments WHERE project_id = ? ORDER BY created_at DESC',
      [req.params.projectId]
    );

    res.json(attachments);
  } catch (error) {
    console.error('Erreur récupération pièces jointes:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Upload d'un fichier
router.post('/project/:projectId', upload.single('file'), async (req, res) => {
  try {
    // Vérifier que le projet appartient à l'utilisateur
    const [projects] = await db.query(
      'SELECT id FROM projects WHERE id = ? AND user_id = ?',
      [req.params.projectId, req.userId]
    );

    if (projects.length === 0) {
      // Supprimer le fichier uploadé si le projet n'existe pas
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({ message: 'Projet non trouvé' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Aucun fichier fourni' });
    }

    const category = req.body.category || 'autre';

    const [result] = await db.query(
      `INSERT INTO attachments (project_id, filename, original_name, mime_type, size, category)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        req.params.projectId,
        req.file.filename,
        req.file.originalname,
        req.file.mimetype,
        req.file.size,
        category
      ]
    );

    const [newAttachment] = await db.query('SELECT * FROM attachments WHERE id = ?', [result.insertId]);

    res.status(201).json(newAttachment[0]);
  } catch (error) {
    console.error('Erreur upload fichier:', error);
    // Supprimer le fichier en cas d'erreur
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Télécharger un fichier
router.get('/:id/download', async (req, res) => {
  try {
    const [attachments] = await db.query(
      `SELECT a.* FROM attachments a
       JOIN projects p ON a.project_id = p.id
       WHERE a.id = ? AND p.user_id = ?`,
      [req.params.id, req.userId]
    );

    if (attachments.length === 0) {
      return res.status(404).json({ message: 'Fichier non trouvé' });
    }

    const attachment = attachments[0];
    const filePath = path.join(__dirname, '../uploads', attachment.filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Fichier introuvable sur le serveur' });
    }

    res.download(filePath, attachment.original_name);
  } catch (error) {
    console.error('Erreur téléchargement fichier:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Supprimer un fichier
router.delete('/:id', async (req, res) => {
  try {
    const [attachments] = await db.query(
      `SELECT a.* FROM attachments a
       JOIN projects p ON a.project_id = p.id
       WHERE a.id = ? AND p.user_id = ?`,
      [req.params.id, req.userId]
    );

    if (attachments.length === 0) {
      return res.status(404).json({ message: 'Fichier non trouvé' });
    }

    const attachment = attachments[0];
    const filePath = path.join(__dirname, '../uploads', attachment.filename);

    // Supprimer le fichier du disque
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Supprimer l'entrée de la base de données
    await db.query('DELETE FROM attachments WHERE id = ?', [req.params.id]);

    res.json({ message: 'Fichier supprimé avec succès' });
  } catch (error) {
    console.error('Erreur suppression fichier:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
