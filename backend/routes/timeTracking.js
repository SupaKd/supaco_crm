const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authMiddleware = require('../middleware/auth');

// Toutes les routes nécessitent l'authentification
router.use(authMiddleware);

// ==========================================
// TIME ENTRIES - Sessions de travail
// ==========================================

// Démarrer un timer pour une tâche
router.post('/start', async (req, res) => {
  try {
    const { task_id, notes } = req.body;

    if (!task_id) {
      return res.status(400).json({ message: 'task_id requis' });
    }

    // Vérifier que la tâche existe et appartient à l'utilisateur
    const [tasks] = await db.query(
      `SELECT t.id FROM tasks t
       JOIN projects p ON t.project_id = p.id
       WHERE t.id = ? AND p.user_id = ?`,
      [task_id, req.userId]
    );

    if (tasks.length === 0) {
      return res.status(404).json({ message: 'Tâche non trouvée' });
    }

    // Vérifier qu'il n'y a pas déjà un timer actif pour cette tâche
    const [activeEntries] = await db.query(
      'SELECT id FROM time_entries WHERE task_id = ? AND user_id = ? AND ended_at IS NULL',
      [task_id, req.userId]
    );

    if (activeEntries.length > 0) {
      return res.status(400).json({ message: 'Un timer est déjà actif pour cette tâche' });
    }

    // Créer une nouvelle entrée de temps
    const [result] = await db.query(
      `INSERT INTO time_entries (task_id, user_id, started_at, notes)
       VALUES (?, ?, NOW(), ?)`,
      [task_id, req.userId, notes || null]
    );

    const [entry] = await db.query(
      'SELECT * FROM time_entries WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      message: 'Timer démarré',
      data: entry[0]
    });
  } catch (error) {
    console.error('Erreur démarrage timer:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Arrêter un timer
router.post('/stop/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    // Vérifier que l'entrée existe et appartient à l'utilisateur
    const [entries] = await db.query(
      'SELECT * FROM time_entries WHERE id = ? AND user_id = ?',
      [id, req.userId]
    );

    if (entries.length === 0) {
      return res.status(404).json({ message: 'Entrée de temps non trouvée' });
    }

    const entry = entries[0];

    if (entry.ended_at !== null) {
      return res.status(400).json({ message: 'Timer déjà arrêté' });
    }

    // Calculer la durée en secondes
    const startedAt = new Date(entry.started_at);
    const endedAt = new Date();
    const duration = Math.floor((endedAt - startedAt) / 1000);

    // Mettre à jour l'entrée
    await db.query(
      `UPDATE time_entries
       SET ended_at = NOW(), duration = ?, notes = COALESCE(?, notes)
       WHERE id = ?`,
      [duration, notes, id]
    );

    const [updatedEntry] = await db.query(
      'SELECT * FROM time_entries WHERE id = ?',
      [id]
    );

    res.json({
      message: 'Timer arrêté',
      data: updatedEntry[0]
    });
  } catch (error) {
    console.error('Erreur arrêt timer:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Obtenir le timer actif pour une tâche
router.get('/active/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;

    const [entries] = await db.query(
      `SELECT te.* FROM time_entries te
       JOIN tasks t ON te.task_id = t.id
       JOIN projects p ON t.project_id = p.id
       WHERE te.task_id = ? AND te.user_id = ? AND te.ended_at IS NULL AND p.user_id = ?`,
      [taskId, req.userId, req.userId]
    );

    res.json({ data: entries[0] || null });
  } catch (error) {
    console.error('Erreur récupération timer actif:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Obtenir toutes les entrées de temps pour une tâche
router.get('/task/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;

    const [entries] = await db.query(
      `SELECT te.* FROM time_entries te
       JOIN tasks t ON te.task_id = t.id
       JOIN projects p ON t.project_id = p.id
       WHERE te.task_id = ? AND p.user_id = ?
       ORDER BY te.started_at DESC`,
      [taskId, req.userId]
    );

    // Calculer le temps total
    const totalSeconds = entries.reduce((sum, entry) => {
      if (entry.duration) {
        return sum + entry.duration;
      }
      // Si le timer est actif, calculer le temps écoulé
      if (!entry.ended_at) {
        const elapsed = Math.floor((new Date() - new Date(entry.started_at)) / 1000);
        return sum + elapsed;
      }
      return sum;
    }, 0);

    res.json({
      data: entries,
      total_seconds: totalSeconds,
      total_hours: (totalSeconds / 3600).toFixed(2)
    });
  } catch (error) {
    console.error('Erreur récupération entrées:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Obtenir toutes les entrées de temps pour un projet
router.get('/project/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;

    // Vérifier que le projet appartient à l'utilisateur
    const [projects] = await db.query(
      'SELECT id FROM projects WHERE id = ? AND user_id = ?',
      [projectId, req.userId]
    );

    if (projects.length === 0) {
      return res.status(404).json({ message: 'Projet non trouvé' });
    }

    const [entries] = await db.query(
      `SELECT te.*, t.title as task_title
       FROM time_entries te
       JOIN tasks t ON te.task_id = t.id
       WHERE t.project_id = ?
       ORDER BY te.started_at DESC`,
      [projectId]
    );

    // Calculer le temps total
    const totalSeconds = entries.reduce((sum, entry) => {
      if (entry.duration) {
        return sum + entry.duration;
      }
      if (!entry.ended_at) {
        const elapsed = Math.floor((new Date() - new Date(entry.started_at)) / 1000);
        return sum + elapsed;
      }
      return sum;
    }, 0);

    res.json({
      data: entries,
      total_seconds: totalSeconds,
      total_hours: (totalSeconds / 3600).toFixed(2)
    });
  } catch (error) {
    console.error('Erreur récupération entrées projet:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Ajouter manuellement une entrée de temps
router.post('/manual', async (req, res) => {
  try {
    const { task_id, started_at, ended_at, notes } = req.body;

    if (!task_id || !started_at || !ended_at) {
      return res.status(400).json({ message: 'task_id, started_at et ended_at requis' });
    }

    // Vérifier que la tâche existe et appartient à l'utilisateur
    const [tasks] = await db.query(
      `SELECT t.id FROM tasks t
       JOIN projects p ON t.project_id = p.id
       WHERE t.id = ? AND p.user_id = ?`,
      [task_id, req.userId]
    );

    if (tasks.length === 0) {
      return res.status(404).json({ message: 'Tâche non trouvée' });
    }

    // Calculer la durée
    const start = new Date(started_at);
    const end = new Date(ended_at);
    const duration = Math.floor((end - start) / 1000);

    if (duration <= 0) {
      return res.status(400).json({ message: 'La date de fin doit être après la date de début' });
    }

    const [result] = await db.query(
      `INSERT INTO time_entries (task_id, user_id, started_at, ended_at, duration, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [task_id, req.userId, started_at, ended_at, duration, notes || null]
    );

    const [entry] = await db.query(
      'SELECT * FROM time_entries WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      message: 'Entrée de temps ajoutée',
      data: entry[0]
    });
  } catch (error) {
    console.error('Erreur ajout manuel:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Supprimer une entrée de temps
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier que l'entrée existe et appartient à l'utilisateur
    const [entries] = await db.query(
      'SELECT id FROM time_entries WHERE id = ? AND user_id = ?',
      [id, req.userId]
    );

    if (entries.length === 0) {
      return res.status(404).json({ message: 'Entrée non trouvée' });
    }

    await db.query('DELETE FROM time_entries WHERE id = ?', [id]);

    res.json({ message: 'Entrée supprimée' });
  } catch (error) {
    console.error('Erreur suppression entrée:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// ==========================================
// ESTIMATIONS
// ==========================================

// Mettre à jour l'estimation d'une tâche
router.patch('/estimate/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { estimated_hours } = req.body;

    // Vérifier que la tâche existe et appartient à l'utilisateur
    const [tasks] = await db.query(
      `SELECT t.id FROM tasks t
       JOIN projects p ON t.project_id = p.id
       WHERE t.id = ? AND p.user_id = ?`,
      [taskId, req.userId]
    );

    if (tasks.length === 0) {
      return res.status(404).json({ message: 'Tâche non trouvée' });
    }

    await db.query(
      'UPDATE tasks SET estimated_hours = ? WHERE id = ?',
      [estimated_hours || null, taskId]
    );

    res.json({ message: 'Estimation mise à jour' });
  } catch (error) {
    console.error('Erreur mise à jour estimation:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// ==========================================
// STATISTIQUES
// ==========================================

// Obtenir les statistiques de temps pour un projet
router.get('/stats/project/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;

    // Vérifier que le projet appartient à l'utilisateur
    const [projects] = await db.query(
      'SELECT id, name FROM projects WHERE id = ? AND user_id = ?',
      [projectId, req.userId]
    );

    if (projects.length === 0) {
      return res.status(404).json({ message: 'Projet non trouvé' });
    }

    // Temps total par tâche
    const [taskStats] = await db.query(
      `SELECT
        t.id,
        t.title,
        t.estimated_hours,
        COALESCE(SUM(te.duration), 0) as total_seconds,
        COUNT(te.id) as entry_count
       FROM tasks t
       LEFT JOIN time_entries te ON t.id = te.task_id
       WHERE t.project_id = ?
       GROUP BY t.id, t.title, t.estimated_hours
       ORDER BY total_seconds DESC`,
      [projectId]
    );

    // Temps total du projet
    const totalSeconds = taskStats.reduce((sum, task) => sum + parseInt(task.total_seconds), 0);
    const totalHours = (totalSeconds / 3600).toFixed(2);

    // Estimation totale
    const totalEstimated = taskStats.reduce((sum, task) => {
      return sum + (parseFloat(task.estimated_hours) || 0);
    }, 0);

    // Formater les données
    const tasksWithHours = taskStats.map(task => ({
      ...task,
      actual_hours: (task.total_seconds / 3600).toFixed(2),
      estimated_hours: task.estimated_hours || 0,
      variance: task.estimated_hours
        ? ((task.total_seconds / 3600) - parseFloat(task.estimated_hours)).toFixed(2)
        : null
    }));

    res.json({
      project: projects[0],
      total_seconds: totalSeconds,
      total_hours: totalHours,
      total_estimated: totalEstimated.toFixed(2),
      variance: (parseFloat(totalHours) - totalEstimated).toFixed(2),
      tasks: tasksWithHours
    });
  } catch (error) {
    console.error('Erreur statistiques projet:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
