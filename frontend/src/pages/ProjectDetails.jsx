import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectsAPI, tasksAPI, notesAPI } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import Modal from '../components/Modal';
import Loader from '../components/Loader';
import TagManager from '../components/TagManager';
import {
  ArrowLeft,
  Save,
  Trash2,
  Plus,
  CheckCircle2,
  Circle,
  Clock,
  Edit2,
  X,
  AlertTriangle
} from 'lucide-react';
import './ProjectDetails.scss';

const ProjectDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState('details');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [notes, setNotes] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Formulaire du projet
  const [formData, setFormData] = useState({
    name: '',
    client_name: '',
    client_email: '',
    client_phone: '',
    description: '',
    budget: '',
    status: 'devis',
    deadline: ''
  });

  // Nouvelles tâche et note
  const [newTask, setNewTask] = useState({ title: '', description: '', status: 'a_faire', priority: 'moyenne' });
  const [newNote, setNewNote] = useState('');

  useEffect(() => {
    fetchProjectData();
  }, [id]);

  const fetchProjectData = async () => {
    try {
      setLoading(true);
      const [projectRes, tasksRes, notesRes] = await Promise.all([
        projectsAPI.getOne(id),
        tasksAPI.getByProject(id),
        notesAPI.getByProject(id)
      ]);

      setProject(projectRes.data);
      setFormData({
        name: projectRes.data.name || '',
        client_name: projectRes.data.client_name || '',
        client_email: projectRes.data.client_email || '',
        client_phone: projectRes.data.client_phone || '',
        description: projectRes.data.description || '',
        budget: projectRes.data.budget || '',
        status: projectRes.data.status || 'devis',
        deadline: projectRes.data.deadline ? projectRes.data.deadline.split('T')[0] : ''
      });
      setTasks(tasksRes.data);
      setNotes(notesRes.data);
    } catch (err) {
      console.error('Erreur chargement projet:', err);
      setError('Impossible de charger le projet');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');

      const projectData = {
        ...formData,
        budget: formData.budget ? parseFloat(formData.budget) : null,
        deadline: formData.deadline || null,
        client_email: formData.client_email || null,
        client_phone: formData.client_phone || null,
        description: formData.description || null
      };

      await projectsAPI.update(id, projectData);
      setIsEditing(false);
      await fetchProjectData();
      toast.success('Projet mis à jour avec succès');
    } catch (err) {
      console.error('Erreur sauvegarde:', err);
      const errorMsg = err.response?.data?.message || 'Erreur lors de la sauvegarde';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await projectsAPI.delete(id);
      toast.success('Projet supprimé avec succès');
      navigate('/projects');
    } catch (err) {
      console.error('Erreur suppression:', err);
      const errorMsg = err.response?.data?.message || 'Erreur lors de la suppression';
      toast.error(errorMsg);
      setShowDeleteModal(false);
    }
  };

  // Tâches
  const handleAddTask = async () => {
    if (!newTask.title.trim()) return;

    try {
      await tasksAPI.create({ ...newTask, project_id: id });
      setNewTask({ title: '', description: '', status: 'a_faire', priority: 'moyenne' });
      await fetchProjectData();
      toast.success('Tâche ajoutée');
    } catch (err) {
      console.error('Erreur ajout tâche:', err);
      toast.error('Erreur lors de l\'ajout de la tâche');
    }
  };

  const handleToggleTask = async (task) => {
    try {
      const newStatus = task.status === 'termine' ? 'a_faire' : 'termine';
      await tasksAPI.update(task.id, { ...task, status: newStatus });
      await fetchProjectData();
      toast.success(newStatus === 'termine' ? 'Tâche terminée' : 'Tâche réouverte');
    } catch (err) {
      console.error('Erreur mise à jour tâche:', err);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await tasksAPI.delete(taskId);
      await fetchProjectData();
      toast.success('Tâche supprimée');
    } catch (err) {
      console.error('Erreur suppression tâche:', err);
      toast.error('Erreur lors de la suppression');
    }
  };

  // Notes
  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    try {
      await notesAPI.create({ project_id: id, content: newNote });
      setNewNote('');
      await fetchProjectData();
      toast.success('Note ajoutée');
    } catch (err) {
      console.error('Erreur ajout note:', err);
      toast.error('Erreur lors de l\'ajout de la note');
    }
  };

  const handleDeleteNote = async (noteId) => {
    try {
      await notesAPI.delete(noteId);
      await fetchProjectData();
      toast.success('Note supprimée');
    } catch (err) {
      console.error('Erreur suppression note:', err);
      toast.error('Erreur lors de la suppression');
    }
  };

  if (loading) {
    return <Loader fullScreen />;
  }

  if (error && !project) {
    return <div className="error">{error}</div>;
  }

  const getStatusBadge = (status) => {
    const statusMap = {
      'devis': { label: 'Devis', class: 'warning' },
      'en_cours': { label: 'En cours', class: 'info' },
      'termine': { label: 'Terminé', class: 'success' },
      'annule': { label: 'Annulé', class: 'danger' }
    };
    const s = statusMap[status] || { label: status, class: 'default' };
    return <span className={`badge badge-${s.class}`}>{s.label}</span>;
  };

  return (
    <div className="project-details-page">
      <div className="page-header">
        <button onClick={() => navigate('/projects')} className="back-btn">
          <ArrowLeft size={20} />
          Retour
        </button>
        <div className="header-content">
          <div className="header-info">
            <h1>{project?.name}</h1>
            {!isEditing && getStatusBadge(project?.status)}
          </div>
          <div className="header-actions">
            {isEditing ? (
              <>
                <button onClick={() => setIsEditing(false)} className="btn btn-secondary">
                  <X size={18} />
                  Annuler
                </button>
                <button onClick={handleSave} className="btn btn-primary" disabled={saving}>
                  <Save size={18} />
                  {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setIsEditing(true)} className="btn btn-secondary">
                  <Edit2 size={18} />
                  Modifier
                </button>
                <button onClick={() => setShowDeleteModal(true)} className="btn btn-danger">
                  <Trash2 size={18} />
                  Supprimer
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Supprimer le projet"
        footer={
          <>
            <button onClick={() => setShowDeleteModal(false)} className="btn btn-secondary">
              Annuler
            </button>
            <button onClick={handleDelete} className="btn btn-danger">
              <Trash2 size={18} />
              Supprimer
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
          <AlertTriangle size={24} color="#ef4444" />
          <div>
            <p style={{ margin: '0 0 0.5rem 0', fontWeight: '500' }}>
              Êtes-vous sûr de vouloir supprimer ce projet ?
            </p>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>
              Cette action est irréversible. Toutes les tâches et notes associées seront également supprimées.
            </p>
          </div>
        </div>
      </Modal>

      {error && (
        <div className="error-message">{error}</div>
      )}

      <div className="tabs">
        <button
          className={activeTab === 'details' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('details')}
        >
          Détails
        </button>
        <button
          className={activeTab === 'tasks' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('tasks')}
        >
          Tâches ({tasks.length})
        </button>
        <button
          className={activeTab === 'notes' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('notes')}
        >
          Notes ({notes.length})
        </button>
        <button
          className={activeTab === 'tags' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('tags')}
        >
          Tags
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'details' && (
          <div className="details-tab">
            <div className="form-section">
              <h2>Informations du projet</h2>

              <div className="form-group">
                <label>Nom du projet</label>
                {isEditing ? (
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                ) : (
                  <p className="form-value">{project?.name}</p>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Statut</label>
                  {isEditing ? (
                    <select name="status" value={formData.status} onChange={handleChange}>
                      <option value="devis">Devis</option>
                      <option value="en_cours">En cours</option>
                      <option value="termine">Terminé</option>
                      <option value="annule">Annulé</option>
                    </select>
                  ) : (
                    <p className="form-value">{getStatusBadge(project?.status)}</p>
                  )}
                </div>

                <div className="form-group">
                  <label>Budget</label>
                  {isEditing ? (
                    <input
                      type="number"
                      name="budget"
                      value={formData.budget}
                      onChange={handleChange}
                      step="0.01"
                    />
                  ) : (
                    <p className="form-value">{project?.budget ? `${project.budget}€` : '-'}</p>
                  )}
                </div>

                <div className="form-group">
                  <label>Date limite</label>
                  {isEditing ? (
                    <input
                      type="date"
                      name="deadline"
                      value={formData.deadline}
                      onChange={handleChange}
                    />
                  ) : (
                    <p className="form-value">
                      {project?.deadline ? new Date(project.deadline).toLocaleDateString('fr-FR') : '-'}
                    </p>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label>Description</label>
                {isEditing ? (
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows="4"
                  />
                ) : (
                  <p className="form-value">{project?.description || '-'}</p>
                )}
              </div>
            </div>

            <div className="form-section">
              <h2>Informations du client</h2>

              <div className="form-group">
                <label>Nom du client</label>
                {isEditing ? (
                  <input
                    type="text"
                    name="client_name"
                    value={formData.client_name}
                    onChange={handleChange}
                    required
                  />
                ) : (
                  <p className="form-value">{project?.client_name}</p>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Email</label>
                  {isEditing ? (
                    <input
                      type="email"
                      name="client_email"
                      value={formData.client_email}
                      onChange={handleChange}
                    />
                  ) : (
                    <p className="form-value">{project?.client_email || '-'}</p>
                  )}
                </div>

                <div className="form-group">
                  <label>Téléphone</label>
                  {isEditing ? (
                    <input
                      type="tel"
                      name="client_phone"
                      value={formData.client_phone}
                      onChange={handleChange}
                    />
                  ) : (
                    <p className="form-value">{project?.client_phone || '-'}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="tasks-tab">
            <div className="add-task">
              <input
                type="text"
                placeholder="Nouvelle tâche..."
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTask()}
              />
              <button onClick={handleAddTask} className="btn btn-primary">
                <Plus size={18} />
                Ajouter
              </button>
            </div>

            <div className="tasks-list">
              {tasks.length === 0 ? (
                <p className="empty-state">Aucune tâche pour ce projet</p>
              ) : (
                tasks.map((task) => (
                  <div key={task.id} className={`task-item ${task.status === 'termine' ? 'completed' : ''}`}>
                    <button
                      className="task-checkbox"
                      onClick={() => handleToggleTask(task)}
                    >
                      {task.status === 'termine' ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                    </button>
                    <div className="task-content">
                      <h4>{task.title}</h4>
                      {task.description && <p>{task.description}</p>}
                    </div>
                    <button
                      className="task-delete"
                      onClick={() => handleDeleteTask(task.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="notes-tab">
            <div className="add-note">
              <textarea
                placeholder="Ajouter une note..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                rows="3"
              />
              <button onClick={handleAddNote} className="btn btn-primary">
                <Plus size={18} />
                Ajouter une note
              </button>
            </div>

            <div className="notes-list">
              {notes.length === 0 ? (
                <p className="empty-state">Aucune note pour ce projet</p>
              ) : (
                notes.map((note) => (
                  <div key={note.id} className="note-item">
                    <div className="note-header">
                      <span className="note-date">
                        <Clock size={14} />
                        {new Date(note.created_at).toLocaleDateString('fr-FR')} à {new Date(note.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <button
                        className="note-delete"
                        onClick={() => handleDeleteNote(note.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <p className="note-content">{note.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'tags' && (
          <div className="tags-tab">
            <TagManager projectId={id} />
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectDetails;
