import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectsAPI, tasksAPI, notesAPI, attachmentsAPI, invoicesAPI } from '../services/api';
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
  AlertTriangle,
  ExternalLink,
  Upload,
  FileText,
  Download,
  File,
  Receipt,
  Euro
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
  const [attachments, setAttachments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [invoicesTotal, setInvoicesTotal] = useState({ count: 0, total: 0, paid: 0, pending: 0 });
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [editingField, setEditingField] = useState(null);

  // Formulaire du projet
  const [formData, setFormData] = useState({
    name: '',
    client_name: '',
    client_email: '',
    client_phone: '',
    website_url: '',
    description: '',
    budget: '',
    status: 'devis',
    deadline: ''
  });

  // Nouvelles tâche et note
  const [newTask, setNewTask] = useState({ title: '', description: '', status: 'a_faire', priority: 'moyenne' });
  const [newNote, setNewNote] = useState('');

  // Upload de fichier
  const [uploading, setUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('autre');

  // Formulaire facture annexe
  const [invoiceForm, setInvoiceForm] = useState({
    invoice_number: '',
    title: '',
    description: '',
    amount: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: '',
    status: 'en_attente',
    category: 'modification'
  });

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

      // Récupérer les pièces jointes séparément pour gérer le cas où la table n'existe pas
      try {
        const attachmentsRes = await attachmentsAPI.getByProject(id);
        setAttachments(attachmentsRes.data);
      } catch {
        setAttachments([]);
      }

      // Récupérer les factures annexes
      try {
        const [invoicesRes, invoicesTotalRes] = await Promise.all([
          invoicesAPI.getByProject(id),
          invoicesAPI.getTotal(id)
        ]);
        setInvoices(invoicesRes.data);
        setInvoicesTotal(invoicesTotalRes.data);
      } catch {
        setInvoices([]);
        setInvoicesTotal({ count: 0, total: 0, paid: 0, pending: 0 });
      }

      setProject(projectRes.data);
      setFormData({
        name: projectRes.data.name || '',
        client_name: projectRes.data.client_name || '',
        client_email: projectRes.data.client_email || '',
        client_phone: projectRes.data.client_phone || '',
        website_url: projectRes.data.website_url || '',
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
        website_url: formData.website_url || null,
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

  const handleSaveField = async (fieldName) => {
    try {
      setSaving(true);
      setError('');

      const projectData = {
        ...formData,
        budget: formData.budget ? parseFloat(formData.budget) : null,
        deadline: formData.deadline || null,
        client_email: formData.client_email || null,
        client_phone: formData.client_phone || null,
        website_url: formData.website_url || null,
        description: formData.description || null
      };

      await projectsAPI.update(id, projectData);
      setEditingField(null);
      await fetchProjectData();
      toast.success('Mis à jour');
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

  // Pièces jointes
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploading(true);
      await attachmentsAPI.upload(id, file, selectedCategory);
      await fetchProjectData();
      toast.success('Fichier ajouté');
      setSelectedCategory('autre');
      e.target.value = '';
    } catch (err) {
      console.error('Erreur upload fichier:', err);
      toast.error('Erreur lors de l\'upload du fichier');
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadAttachment = async (attachment) => {
    try {
      const response = await attachmentsAPI.download(attachment.id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', attachment.original_name);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erreur téléchargement fichier:', err);
      toast.error('Erreur lors du téléchargement');
    }
  };

  const handleDeleteAttachment = async (attachmentId) => {
    try {
      await attachmentsAPI.delete(attachmentId);
      await fetchProjectData();
      toast.success('Fichier supprimé');
    } catch (err) {
      console.error('Erreur suppression fichier:', err);
      toast.error('Erreur lors de la suppression');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'Ko', 'Mo', 'Go'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getCategoryLabel = (category) => {
    const labels = {
      'devis': 'Devis',
      'facture': 'Facture',
      'contrat': 'Contrat',
      'autre': 'Autre'
    };
    return labels[category] || category;
  };

  const getFileIcon = (mimeType) => {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType === 'application/pdf') return '📄';
    if (mimeType.includes('word')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
    return '📎';
  };

  // Factures annexes
  const handleOpenInvoiceModal = (invoice = null) => {
    if (invoice) {
      setEditingInvoice(invoice);
      setInvoiceForm({
        invoice_number: invoice.invoice_number || '',
        title: invoice.title || '',
        description: invoice.description || '',
        amount: invoice.amount || '',
        invoice_date: invoice.invoice_date ? invoice.invoice_date.split('T')[0] : '',
        due_date: invoice.due_date ? invoice.due_date.split('T')[0] : '',
        status: invoice.status || 'en_attente',
        category: invoice.category || 'modification'
      });
    } else {
      setEditingInvoice(null);
      setInvoiceForm({
        invoice_number: '',
        title: '',
        description: '',
        amount: '',
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: '',
        status: 'en_attente',
        category: 'modification'
      });
    }
    setShowInvoiceModal(true);
  };

  const handleSaveInvoice = async () => {
    if (!invoiceForm.title.trim() || !invoiceForm.amount) {
      toast.error('Le titre et le montant sont requis');
      return;
    }

    try {
      if (editingInvoice) {
        await invoicesAPI.update(editingInvoice.id, invoiceForm);
        toast.success('Facture mise à jour');
      } else {
        await invoicesAPI.create({ ...invoiceForm, project_id: id });
        toast.success('Facture ajoutée');
      }
      setShowInvoiceModal(false);
      setEditingInvoice(null);
      await fetchProjectData();
    } catch (err) {
      console.error('Erreur sauvegarde facture:', err);
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const handleDeleteInvoice = async (invoiceId) => {
    if (!confirm('Supprimer cette facture ?')) return;

    try {
      await invoicesAPI.delete(invoiceId);
      toast.success('Facture supprimée');
      await fetchProjectData();
    } catch (err) {
      console.error('Erreur suppression facture:', err);
      toast.error('Erreur lors de la suppression');
    }
  };

  const getInvoiceStatusBadge = (status) => {
    const statusMap = {
      'en_attente': { label: 'En attente', class: 'warning' },
      'payee': { label: 'Payée', class: 'success' },
      'annulee': { label: 'Annulée', class: 'danger' }
    };
    const s = statusMap[status] || { label: status, class: 'default' };
    return <span className={`badge badge-${s.class}`}>{s.label}</span>;
  };

  const getInvoiceCategoryLabel = (category) => {
    const labels = {
      'modification': 'Modification',
      'maintenance': 'Maintenance',
      'hebergement': 'Hébergement',
      'seo': 'SEO',
      'autre': 'Autre'
    };
    return labels[category] || category;
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
          className={activeTab === 'documents' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('documents')}
        >
          Documents ({attachments.length})
        </button>
        <button
          className={activeTab === 'invoices' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('invoices')}
        >
          Factures ({invoices.length})
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
            {/* Cards récapitulatives */}
            <div className="details-cards">
              <div className="detail-card">
                <div className="card-icon status">
                  {project?.status === 'devis' && <FileText size={20} />}
                  {project?.status === 'en_cours' && <Clock size={20} />}
                  {project?.status === 'termine' && <CheckCircle2 size={20} />}
                  {project?.status === 'annule' && <X size={20} />}
                </div>
                <div className="card-content">
                  <span className="card-label">Statut</span>
                  {isEditing ? (
                    <select name="status" value={formData.status} onChange={handleChange} className="card-select">
                      <option value="devis">Devis</option>
                      <option value="en_cours">En cours</option>
                      <option value="termine">Terminé</option>
                      <option value="annule">Annulé</option>
                    </select>
                  ) : (
                    <span className="card-value">{getStatusBadge(project?.status)}</span>
                  )}
                </div>
              </div>

              <div className="detail-card">
                <div className="card-icon budget">
                  <Euro size={20} />
                </div>
                <div className="card-content">
                  <span className="card-label">Budget</span>
                  {isEditing ? (
                    <input
                      type="number"
                      name="budget"
                      value={formData.budget}
                      onChange={handleChange}
                      step="0.01"
                      className="card-input"
                      placeholder="0.00"
                    />
                  ) : (
                    <span className="card-value">{project?.budget ? `${project.budget}€` : '-'}</span>
                  )}
                </div>
              </div>

              <div className="detail-card">
                <div className="card-icon deadline">
                  <Clock size={20} />
                </div>
                <div className="card-content">
                  <span className="card-label">Date limite</span>
                  {isEditing ? (
                    <input
                      type="date"
                      name="deadline"
                      value={formData.deadline}
                      onChange={handleChange}
                      className="card-input"
                    />
                  ) : (
                    <span className="card-value">
                      {project?.deadline ? new Date(project.deadline).toLocaleDateString('fr-FR') : '-'}
                    </span>
                  )}
                </div>
              </div>

              <div className="detail-card">
                <div className="card-icon website">
                  <ExternalLink size={20} />
                </div>
                <div className="card-content">
                  <span className="card-label">Site web</span>
                  {isEditing ? (
                    <input
                      type="url"
                      name="website_url"
                      value={formData.website_url}
                      onChange={handleChange}
                      className="card-input"
                      placeholder="https://..."
                    />
                  ) : (
                    <span className="card-value">
                      {project?.website_url ? (
                        <a
                          href={project.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="website-link"
                        >
                          Visiter
                        </a>
                      ) : '-'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Tableau d'informations */}
            <div className="details-table-section">
              <h2>Informations détaillées</h2>
              <table className="details-table">
                <tbody>
                  <tr>
                    <th>Nom du projet</th>
                    <td>
                      {editingField === 'name' ? (
                        <div className="inline-edit">
                          <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            autoFocus
                          />
                          <div className="inline-edit-actions">
                            <button
                              className="btn-inline-save"
                              onClick={() => handleSaveField('name')}
                              disabled={saving}
                            >
                              <CheckCircle2 size={16} />
                            </button>
                            <button
                              className="btn-inline-cancel"
                              onClick={() => {
                                setEditingField(null);
                                setFormData(prev => ({ ...prev, name: project?.name }));
                              }}
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="view-field">
                          <span>{project?.name}</span>
                          <button
                            className="btn-edit-field"
                            onClick={() => setEditingField('name')}
                          >
                            <Edit2 size={14} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <th>Description</th>
                    <td>
                      {editingField === 'description' ? (
                        <div className="inline-edit">
                          <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            rows="3"
                            autoFocus
                          />
                          <div className="inline-edit-actions">
                            <button
                              className="btn-inline-save"
                              onClick={() => handleSaveField('description')}
                              disabled={saving}
                            >
                              <CheckCircle2 size={16} />
                            </button>
                            <button
                              className="btn-inline-cancel"
                              onClick={() => {
                                setEditingField(null);
                                setFormData(prev => ({ ...prev, description: project?.description }));
                              }}
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="view-field">
                          <span>{project?.description || '-'}</span>
                          <button
                            className="btn-edit-field"
                            onClick={() => setEditingField('description')}
                          >
                            <Edit2 size={14} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <th>Client</th>
                    <td>
                      {editingField === 'client_name' ? (
                        <div className="inline-edit">
                          <input
                            type="text"
                            name="client_name"
                            value={formData.client_name}
                            onChange={handleChange}
                            required
                            autoFocus
                          />
                          <div className="inline-edit-actions">
                            <button
                              className="btn-inline-save"
                              onClick={() => handleSaveField('client_name')}
                              disabled={saving}
                            >
                              <CheckCircle2 size={16} />
                            </button>
                            <button
                              className="btn-inline-cancel"
                              onClick={() => {
                                setEditingField(null);
                                setFormData(prev => ({ ...prev, client_name: project?.client_name }));
                              }}
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="view-field">
                          <span>{project?.client_name}</span>
                          <button
                            className="btn-edit-field"
                            onClick={() => setEditingField('client_name')}
                          >
                            <Edit2 size={14} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <th>Email du client</th>
                    <td>
                      {editingField === 'client_email' ? (
                        <div className="inline-edit">
                          <input
                            type="email"
                            name="client_email"
                            value={formData.client_email}
                            onChange={handleChange}
                            autoFocus
                          />
                          <div className="inline-edit-actions">
                            <button
                              className="btn-inline-save"
                              onClick={() => handleSaveField('client_email')}
                              disabled={saving}
                            >
                              <CheckCircle2 size={16} />
                            </button>
                            <button
                              className="btn-inline-cancel"
                              onClick={() => {
                                setEditingField(null);
                                setFormData(prev => ({ ...prev, client_email: project?.client_email }));
                              }}
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="view-field">
                          <span>{project?.client_email || '-'}</span>
                          <button
                            className="btn-edit-field"
                            onClick={() => setEditingField('client_email')}
                          >
                            <Edit2 size={14} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <th>Téléphone du client</th>
                    <td>
                      {editingField === 'client_phone' ? (
                        <div className="inline-edit">
                          <input
                            type="tel"
                            name="client_phone"
                            value={formData.client_phone}
                            onChange={handleChange}
                            autoFocus
                          />
                          <div className="inline-edit-actions">
                            <button
                              className="btn-inline-save"
                              onClick={() => handleSaveField('client_phone')}
                              disabled={saving}
                            >
                              <CheckCircle2 size={16} />
                            </button>
                            <button
                              className="btn-inline-cancel"
                              onClick={() => {
                                setEditingField(null);
                                setFormData(prev => ({ ...prev, client_phone: project?.client_phone }));
                              }}
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="view-field">
                          <span>{project?.client_phone || '-'}</span>
                          <button
                            className="btn-edit-field"
                            onClick={() => setEditingField('client_phone')}
                          >
                            <Edit2 size={14} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
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

        {activeTab === 'documents' && (
          <div className="documents-tab">
            <div className="upload-section">
              <div className="upload-form">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="category-select"
                >
                  <option value="devis">Devis</option>
                  <option value="facture">Facture</option>
                  <option value="contrat">Contrat</option>
                  <option value="autre">Autre</option>
                </select>
                <label className="upload-btn btn btn-primary">
                  <Upload size={18} />
                  {uploading ? 'Upload...' : 'Ajouter un fichier'}
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.xls,.xlsx"
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
              <p className="upload-hint">
                Formats acceptés : PDF, images, Word, Excel (max 10 Mo)
              </p>
            </div>

            <div className="attachments-list">
              {attachments.length === 0 ? (
                <p className="empty-state">Aucun document pour ce projet</p>
              ) : (
                attachments.map((attachment) => (
                  <div key={attachment.id} className="attachment-item">
                    <div className="attachment-icon">
                      {getFileIcon(attachment.mime_type)}
                    </div>
                    <div className="attachment-info">
                      <h4>{attachment.original_name}</h4>
                      <div className="attachment-meta">
                        <span className={`category-badge category-${attachment.category}`}>
                          {getCategoryLabel(attachment.category)}
                        </span>
                        <span className="file-size">{formatFileSize(attachment.size)}</span>
                        <span className="file-date">
                          {new Date(attachment.created_at).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    </div>
                    <div className="attachment-actions">
                      <button
                        className="action-btn download"
                        onClick={() => handleDownloadAttachment(attachment)}
                        title="Télécharger"
                      >
                        <Download size={18} />
                      </button>
                      <button
                        className="action-btn delete"
                        onClick={() => handleDeleteAttachment(attachment.id)}
                        title="Supprimer"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'invoices' && (
          <div className="invoices-tab">
            <div className="invoices-summary">
              <div className="summary-card">
                <span className="summary-label">Total factures</span>
                <span className="summary-value">{invoicesTotal.total ? `${parseFloat(invoicesTotal.total).toFixed(2)}€` : '0€'}</span>
              </div>
              <div className="summary-card success">
                <span className="summary-label">Payées</span>
                <span className="summary-value">{invoicesTotal.paid ? `${parseFloat(invoicesTotal.paid).toFixed(2)}€` : '0€'}</span>
              </div>
              <div className="summary-card warning">
                <span className="summary-label">En attente</span>
                <span className="summary-value">{invoicesTotal.pending ? `${parseFloat(invoicesTotal.pending).toFixed(2)}€` : '0€'}</span>
              </div>
            </div>

            <div className="invoices-header">
              <h3>Factures annexes</h3>
              <button onClick={() => handleOpenInvoiceModal()} className="btn btn-primary">
                <Plus size={18} />
                Ajouter une facture
              </button>
            </div>

            <div className="invoices-list">
              {invoices.length === 0 ? (
                <p className="empty-state">Aucune facture annexe pour ce projet</p>
              ) : (
                invoices.map((invoice) => (
                  <div key={invoice.id} className="invoice-item">
                    <div className="invoice-icon">
                      <Receipt size={24} />
                    </div>
                    <div className="invoice-info">
                      <div className="invoice-header">
                        <h4>{invoice.title}</h4>
                        {getInvoiceStatusBadge(invoice.status)}
                      </div>
                      {invoice.invoice_number && (
                        <span className="invoice-number">N° {invoice.invoice_number}</span>
                      )}
                      {invoice.description && (
                        <p className="invoice-description">{invoice.description}</p>
                      )}
                      <div className="invoice-meta">
                        <span className="invoice-category">{getInvoiceCategoryLabel(invoice.category)}</span>
                        <span className="invoice-date">
                          {new Date(invoice.invoice_date).toLocaleDateString('fr-FR')}
                        </span>
                        {invoice.due_date && (
                          <span className="invoice-due">
                            Échéance: {new Date(invoice.due_date).toLocaleDateString('fr-FR')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="invoice-amount">
                      <span className="amount">{parseFloat(invoice.amount).toFixed(2)}€</span>
                    </div>
                    <div className="invoice-actions">
                      <button
                        className="action-btn edit"
                        onClick={() => handleOpenInvoiceModal(invoice)}
                        title="Modifier"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        className="action-btn delete"
                        onClick={() => handleDeleteInvoice(invoice.id)}
                        title="Supprimer"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
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

      {/* Modal Facture Annexe */}
      <Modal
        isOpen={showInvoiceModal}
        onClose={() => { setShowInvoiceModal(false); setEditingInvoice(null); }}
        title={editingInvoice ? 'Modifier la facture' : 'Ajouter une facture annexe'}
        footer={
          <>
            <button onClick={() => setShowInvoiceModal(false)} className="btn btn-secondary">
              Annuler
            </button>
            <button onClick={handleSaveInvoice} className="btn btn-primary">
              {editingInvoice ? 'Mettre à jour' : 'Ajouter'}
            </button>
          </>
        }
      >
        <div className="form-group">
          <label>Titre *</label>
          <input
            type="text"
            value={invoiceForm.title}
            onChange={(e) => setInvoiceForm({ ...invoiceForm, title: e.target.value })}
            placeholder="Ex: Modification menu, Maintenance mensuelle..."
          />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>N° de facture</label>
            <input
              type="text"
              value={invoiceForm.invoice_number}
              onChange={(e) => setInvoiceForm({ ...invoiceForm, invoice_number: e.target.value })}
              placeholder="FAC-001"
            />
          </div>
          <div className="form-group">
            <label>Montant *</label>
            <input
              type="number"
              step="0.01"
              value={invoiceForm.amount}
              onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: e.target.value })}
              placeholder="0.00"
            />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Catégorie</label>
            <select
              value={invoiceForm.category}
              onChange={(e) => setInvoiceForm({ ...invoiceForm, category: e.target.value })}
            >
              <option value="modification">Modification</option>
              <option value="maintenance">Maintenance</option>
              <option value="hebergement">Hébergement</option>
              <option value="seo">SEO</option>
              <option value="autre">Autre</option>
            </select>
          </div>
          <div className="form-group">
            <label>Statut</label>
            <select
              value={invoiceForm.status}
              onChange={(e) => setInvoiceForm({ ...invoiceForm, status: e.target.value })}
            >
              <option value="en_attente">En attente</option>
              <option value="payee">Payée</option>
              <option value="annulee">Annulée</option>
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Date de facturation</label>
            <input
              type="date"
              value={invoiceForm.invoice_date}
              onChange={(e) => setInvoiceForm({ ...invoiceForm, invoice_date: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Date d'échéance</label>
            <input
              type="date"
              value={invoiceForm.due_date}
              onChange={(e) => setInvoiceForm({ ...invoiceForm, due_date: e.target.value })}
            />
          </div>
        </div>
        <div className="form-group">
          <label>Description</label>
          <textarea
            value={invoiceForm.description}
            onChange={(e) => setInvoiceForm({ ...invoiceForm, description: e.target.value })}
            rows="3"
            placeholder="Détails de la prestation..."
          />
        </div>
      </Modal>
    </div>
  );
};

export default ProjectDetails;
