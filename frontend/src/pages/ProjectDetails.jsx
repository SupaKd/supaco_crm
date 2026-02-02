import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectsAPI, tasksAPI, notesAPI, attachmentsAPI, invoicesAPI, timeTrackingAPI } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import Modal from '../components/Modal';
import Loader from '../components/Loader';
import TagManager from '../components/TagManager';
import TaskTimer from '../components/TaskTimer';
import {
  ArrowLeft,
  Save,
  Trash2,
  Plus,
  CheckCircle2,
  Circle,
  Clock,
  Edit2,
  AlertTriangle,
  ExternalLink,
  Upload,
  FileText,
  Download,
  Receipt,
  Euro,
  User,
  Mail,
  Phone,
  Calendar,
  Link as LinkIcon,
  BarChart3,
  CheckSquare,
  Square,
  X
} from 'lucide-react';
import './ProjectDetails.scss';

const ProjectDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [activeSection, setActiveSection] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [notes, setNotes] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [invoicesTotal, setInvoicesTotal] = useState({ count: 0, total: 0, paid: 0, pending: 0 });
  const [timeStats, setTimeStats] = useState({ total_seconds: 0, total_hours: '0.00' });
  const [detailedTimeStats, setDetailedTimeStats] = useState(null);

  // Sélection multiple des tâches
  const [selectedTasks, setSelectedTasks] = useState([]);

  // Modals
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

      try {
        const attachmentsRes = await attachmentsAPI.getByProject(id);
        setAttachments(attachmentsRes.data);
      } catch {
        setAttachments([]);
      }

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

      try {
        const timeRes = await timeTrackingAPI.getByProject(id);
        setTimeStats({
          total_seconds: timeRes.data.total_seconds || 0,
          total_hours: timeRes.data.total_hours || '0.00'
        });
      } catch {
        setTimeStats({ total_seconds: 0, total_hours: '0.00' });
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
      toast.error('Impossible de charger le projet');
      navigate('/projects');
    } finally {
      setLoading(false);
    }
  };

  const fetchDetailedTimeStats = async () => {
    try {
      const response = await timeTrackingAPI.getProjectStats(id);
      setDetailedTimeStats(response.data);
    } catch (error) {
      console.error('Erreur chargement statistiques détaillées:', error);
      setDetailedTimeStats(null);
    }
  };

  useEffect(() => {
    if (activeSection === 'time' && !detailedTimeStats) {
      fetchDetailedTimeStats();
    }
  }, [activeSection]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveField = async (fieldName) => {
    try {
      setSaving(true);

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
      toast.error(err.response?.data?.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = (fieldName) => {
    setEditingField(null);
    setFormData(prev => ({ ...prev, [fieldName]: project?.[fieldName] || '' }));
  };

  const handleDelete = async () => {
    try {
      await projectsAPI.delete(id);
      toast.success('Projet supprimé avec succès');
      navigate('/projects');
    } catch (err) {
      console.error('Erreur suppression:', err);
      toast.error(err.response?.data?.message || 'Erreur lors de la suppression');
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

  // Sélection multiple des tâches
  const toggleTaskSelection = (taskId) => {
    setSelectedTasks(prev => {
      if (prev.includes(taskId)) {
        return prev.filter(id => id !== taskId);
      }
      return [...prev, taskId];
    });
  };

  const selectAllTasks = () => {
    if (selectedTasks.length === tasks.length) {
      setSelectedTasks([]);
    } else {
      setSelectedTasks(tasks.map(t => t.id));
    }
  };

  const clearTaskSelection = () => {
    setSelectedTasks([]);
  };

  const handleBulkDeleteTasks = async () => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer ${selectedTasks.length} tâche(s) ?`)) {
      return;
    }

    try {
      await Promise.all(selectedTasks.map(id => tasksAPI.delete(id)));
      await fetchProjectData();
      clearTaskSelection();
      toast.success(`${selectedTasks.length} tâche(s) supprimée(s)`);
    } catch (err) {
      console.error('Erreur suppression groupée:', err);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleBulkTaskStatusChange = async (newStatus) => {
    try {
      await Promise.all(
        selectedTasks.map(taskId =>
          tasksAPI.update(taskId, { status: newStatus })
        )
      );
      await fetchProjectData();
      clearTaskSelection();
      toast.success(`Statut mis à jour pour ${selectedTasks.length} tâche(s)`);
    } catch (err) {
      console.error('Erreur changement de statut groupé:', err);
      toast.error('Erreur lors du changement de statut');
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
    if (!confirm('Supprimer ce fichier ?')) return;

    try {
      await attachmentsAPI.delete(attachmentId);
      await fetchProjectData();
      toast.success('Fichier supprimé');
    } catch (err) {
      console.error('Erreur suppression fichier:', err);
      toast.error('Erreur lors de la suppression');
    }
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

  // Utilitaires
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

  const getStatusBadge = (status) => {
    const statusMap = {
      'devis': { label: 'Devis', class: 'devis' },
      'en_cours': { label: 'En cours', class: 'en_cours' },
      'termine': { label: 'Terminé', class: 'termine' },
      'annule': { label: 'Annulé', class: 'annule' }
    };
    const s = statusMap[status] || { label: status, class: 'default' };
    return <span className={`badge badge-${s.class}`}>{s.label}</span>;
  };

  const getInvoiceStatusBadge = (status) => {
    const statusMap = {
      'en_attente': { label: 'En attente', class: 'a_faire' },
      'payee': { label: 'Payée', class: 'termine' },
      'annulee': { label: 'Annulée', class: 'annule' }
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

  if (!project) {
    return null;
  }

  const taskStats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'termine').length,
    pending: tasks.filter(t => t.status !== 'termine').length
  };

  return (
    <div className="project-details-page">
      {/* Header with breadcrumb */}
      <div className="page-header-wrapper">
        <button
          onClick={() => navigate('/projects')}
          className="back-button"
          aria-label="Retour aux projets"
        >
          <ArrowLeft size={20} />
          <span>Projets</span>
        </button>

        <div className="project-header">
          <div className="project-title-section">
            <h1 className="project-title">{project.name}</h1>
            {getStatusBadge(project.status)}
          </div>
          <div className="project-actions">
            <button
              onClick={() => setShowDeleteModal(true)}
              className="btn btn-outline-danger"
              aria-label="Supprimer le projet"
            >
              <Trash2 size={18} />
              Supprimer
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon budget">
            <Euro size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Budget</span>
            <span className="stat-value">{project.budget ? `${project.budget}€` : '-'}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon deadline">
            <Calendar size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Date limite</span>
            <span className="stat-value">
              {project.deadline ? new Date(project.deadline).toLocaleDateString('fr-FR') : '-'}
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon tasks">
            <BarChart3 size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Tâches</span>
            <span className="stat-value">{taskStats.completed} / {taskStats.total}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon time">
            <Clock size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Temps total</span>
            <span className="stat-value">{timeStats.total_hours}h</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon invoices">
            <Receipt size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Factures</span>
            <span className="stat-value">
              {invoicesTotal.paid ? `${parseFloat(invoicesTotal.paid).toFixed(0)}€` : '0€'} / {invoicesTotal.total ? `${parseFloat(invoicesTotal.total).toFixed(0)}€` : '0€'}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="section-nav" role="navigation" aria-label="Navigation du projet">
        <button
          className={`nav-item ${activeSection === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveSection('overview')}
        >
          <FileText size={18} />
          <span>Vue d'ensemble</span>
        </button>
        <button
          className={`nav-item ${activeSection === 'tasks' ? 'active' : ''}`}
          onClick={() => setActiveSection('tasks')}
        >
          <CheckCircle2 size={18} />
          <span>Tâches</span>
          <span className="nav-badge">{tasks.length}</span>
        </button>
        <button
          className={`nav-item ${activeSection === 'notes' ? 'active' : ''}`}
          onClick={() => setActiveSection('notes')}
        >
          <FileText size={18} />
          <span>Notes</span>
          <span className="nav-badge">{notes.length}</span>
        </button>
        <button
          className={`nav-item ${activeSection === 'documents' ? 'active' : ''}`}
          onClick={() => setActiveSection('documents')}
        >
          <Upload size={18} />
          <span>Documents</span>
          <span className="nav-badge">{attachments.length}</span>
        </button>
        <button
          className={`nav-item ${activeSection === 'invoices' ? 'active' : ''}`}
          onClick={() => setActiveSection('invoices')}
        >
          <Receipt size={18} />
          <span>Factures</span>
          <span className="nav-badge">{invoices.length}</span>
        </button>
        <button
          className={`nav-item ${activeSection === 'time' ? 'active' : ''}`}
          onClick={() => setActiveSection('time')}
        >
          <Clock size={18} />
          <span>Temps</span>
        </button>
        <button
          className={`nav-item ${activeSection === 'tags' ? 'active' : ''}`}
          onClick={() => setActiveSection('tags')}
        >
          <LinkIcon size={18} />
          <span>Tags</span>
        </button>
      </nav>

      {/* Content Sections */}
      <div className="section-content">
        {activeSection === 'overview' && (
          <div className="overview-section">
            <div className="section-grid">
              {/* Informations du projet */}
              <div className="info-card">
                <h2 className="card-title">Informations du projet</h2>
                <div className="info-list">
                  <EditableField
                    label="Nom du projet"
                    name="name"
                    value={formData.name}
                    originalValue={project.name}
                    icon={<FileText size={18} />}
                    editing={editingField === 'name'}
                    onEdit={() => setEditingField('name')}
                    onChange={handleChange}
                    onSave={() => handleSaveField('name')}
                    onCancel={() => handleCancelEdit('name')}
                    required
                  />

                  <EditableField
                    label="Description"
                    name="description"
                    value={formData.description}
                    originalValue={project.description}
                    icon={<FileText size={18} />}
                    editing={editingField === 'description'}
                    onEdit={() => setEditingField('description')}
                    onChange={handleChange}
                    onSave={() => handleSaveField('description')}
                    onCancel={() => handleCancelEdit('description')}
                    type="textarea"
                  />

                  <EditableField
                    label="Statut"
                    name="status"
                    value={formData.status}
                    originalValue={project.status}
                    icon={<BarChart3 size={18} />}
                    editing={editingField === 'status'}
                    onEdit={() => setEditingField('status')}
                    onChange={handleChange}
                    onSave={() => handleSaveField('status')}
                    onCancel={() => handleCancelEdit('status')}
                    type="select"
                    options={[
                      { value: 'devis', label: 'Devis' },
                      { value: 'en_cours', label: 'En cours' },
                      { value: 'termine', label: 'Terminé' },
                      { value: 'annule', label: 'Annulé' }
                    ]}
                    renderDisplay={() => getStatusBadge(project.status)}
                  />

                  <EditableField
                    label="Budget"
                    name="budget"
                    value={formData.budget}
                    originalValue={project.budget}
                    icon={<Euro size={18} />}
                    editing={editingField === 'budget'}
                    onEdit={() => setEditingField('budget')}
                    onChange={handleChange}
                    onSave={() => handleSaveField('budget')}
                    onCancel={() => handleCancelEdit('budget')}
                    type="number"
                    renderDisplay={() => project.budget ? `${project.budget}€` : '-'}
                  />

                  <EditableField
                    label="Date limite"
                    name="deadline"
                    value={formData.deadline}
                    originalValue={project.deadline ? project.deadline.split('T')[0] : ''}
                    icon={<Calendar size={18} />}
                    editing={editingField === 'deadline'}
                    onEdit={() => setEditingField('deadline')}
                    onChange={handleChange}
                    onSave={() => handleSaveField('deadline')}
                    onCancel={() => handleCancelEdit('deadline')}
                    type="date"
                    renderDisplay={() => project.deadline ? new Date(project.deadline).toLocaleDateString('fr-FR') : '-'}
                  />
                </div>
              </div>

              {/* Informations du client */}
              <div className="info-card">
                <h2 className="card-title">Informations du client</h2>
                <div className="info-list">
                  <EditableField
                    label="Nom du client"
                    name="client_name"
                    value={formData.client_name}
                    originalValue={project.client_name}
                    icon={<User size={18} />}
                    editing={editingField === 'client_name'}
                    onEdit={() => setEditingField('client_name')}
                    onChange={handleChange}
                    onSave={() => handleSaveField('client_name')}
                    onCancel={() => handleCancelEdit('client_name')}
                    required
                  />

                  <EditableField
                    label="Email"
                    name="client_email"
                    value={formData.client_email}
                    originalValue={project.client_email}
                    icon={<Mail size={18} />}
                    editing={editingField === 'client_email'}
                    onEdit={() => setEditingField('client_email')}
                    onChange={handleChange}
                    onSave={() => handleSaveField('client_email')}
                    onCancel={() => handleCancelEdit('client_email')}
                    type="email"
                    renderDisplay={() => project.client_email ? (
                      <a href={`mailto:${project.client_email}`} className="link-value">
                        {project.client_email}
                      </a>
                    ) : '-'}
                  />

                  <EditableField
                    label="Téléphone"
                    name="client_phone"
                    value={formData.client_phone}
                    originalValue={project.client_phone}
                    icon={<Phone size={18} />}
                    editing={editingField === 'client_phone'}
                    onEdit={() => setEditingField('client_phone')}
                    onChange={handleChange}
                    onSave={() => handleSaveField('client_phone')}
                    onCancel={() => handleCancelEdit('client_phone')}
                    type="tel"
                    renderDisplay={() => project.client_phone ? (
                      <a href={`tel:${project.client_phone}`} className="link-value">
                        {project.client_phone}
                      </a>
                    ) : '-'}
                  />

                  <EditableField
                    label="Site web"
                    name="website_url"
                    value={formData.website_url}
                    originalValue={project.website_url}
                    icon={<ExternalLink size={18} />}
                    editing={editingField === 'website_url'}
                    onEdit={() => setEditingField('website_url')}
                    onChange={handleChange}
                    onSave={() => handleSaveField('website_url')}
                    onCancel={() => handleCancelEdit('website_url')}
                    type="url"
                    renderDisplay={() => project.website_url ? (
                      <a
                        href={project.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="link-value"
                      >
                        Visiter <ExternalLink size={14} />
                      </a>
                    ) : '-'}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'tasks' && (
          <div className="tasks-section">
            <div className="section-header">
              <h2>Tâches du projet</h2>
              <span className="section-count">{taskStats.completed} / {taskStats.total} complétées</span>
            </div>

            {/* Barre d'actions groupées pour les tâches */}
            {selectedTasks.length > 0 && (
              <div className="bulk-actions-bar">
                <div className="bulk-actions-info">
                  <CheckSquare size={20} />
                  <span>{selectedTasks.length} tâche(s) sélectionnée(s)</span>
                </div>
                <div className="bulk-actions-buttons">
                  <select
                    className="bulk-status-select"
                    onChange={(e) => {
                      if (e.target.value) {
                        handleBulkTaskStatusChange(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    defaultValue=""
                  >
                    <option value="" disabled>Changer le statut</option>
                    <option value="a_faire">À faire</option>
                    <option value="en_cours">En cours</option>
                    <option value="termine">Terminé</option>
                  </select>
                  <button className="bulk-action-btn delete" onClick={handleBulkDeleteTasks}>
                    <Trash2 size={16} />
                    Supprimer
                  </button>
                  <button className="bulk-action-btn cancel" onClick={clearTaskSelection}>
                    <X size={16} />
                    Annuler
                  </button>
                </div>
              </div>
            )}

            <div className="add-item-form">
              <input
                type="text"
                placeholder="Ajouter une nouvelle tâche..."
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTask()}
                className="add-input"
              />
              <button onClick={handleAddTask} className="btn btn-primary" disabled={!newTask.title.trim()}>
                <Plus size={18} />
                Ajouter
              </button>
              {tasks.length > 0 && (
                <button
                  onClick={selectAllTasks}
                  className="btn btn-outline-secondary"
                  title="Tout sélectionner"
                >
                  {selectedTasks.length === tasks.length ? <CheckSquare size={18} /> : <Square size={18} />}
                </button>
              )}
            </div>

            <div className="items-list">
              {tasks.length === 0 ? (
                <div className="empty-state">
                  <CheckCircle2 size={48} />
                  <p>Aucune tâche pour ce projet</p>
                  <span>Commencez par ajouter votre première tâche</span>
                </div>
              ) : (
                tasks.map((task) => (
                  <div key={task.id} className={`task-item ${task.status === 'termine' ? 'completed' : ''} ${selectedTasks.includes(task.id) ? 'selected' : ''}`}>
                    <button
                      className="task-selection-checkbox"
                      onClick={() => toggleTaskSelection(task.id)}
                      aria-label="Sélectionner la tâche"
                    >
                      {selectedTasks.includes(task.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                    </button>
                    <button
                      className="task-checkbox"
                      onClick={() => handleToggleTask(task)}
                      aria-label={task.status === 'termine' ? 'Marquer comme non terminée' : 'Marquer comme terminée'}
                    >
                      {task.status === 'termine' ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                    </button>
                    <div className="task-content">
                      <h4>{task.title}</h4>
                      {task.description && <p>{task.description}</p>}
                    </div>
                    <div className="task-actions">
                      <TaskTimer taskId={task.id} onTimeUpdate={fetchProjectData} />
                      <button
                        className="item-delete-btn"
                        onClick={() => handleDeleteTask(task.id)}
                        aria-label="Supprimer la tâche"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeSection === 'notes' && (
          <div className="notes-section">
            <div className="section-header">
              <h2>Notes du projet</h2>
              <span className="section-count">{notes.length} note{notes.length > 1 ? 's' : ''}</span>
            </div>

            <div className="add-item-form">
              <textarea
                placeholder="Ajouter une nouvelle note..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                rows="3"
                className="add-textarea"
              />
              <button onClick={handleAddNote} className="btn btn-primary" disabled={!newNote.trim()}>
                <Plus size={18} />
                Ajouter une note
              </button>
            </div>

            <div className="items-list">
              {notes.length === 0 ? (
                <div className="empty-state">
                  <FileText size={48} />
                  <p>Aucune note pour ce projet</p>
                  <span>Ajoutez des notes pour garder trace des informations importantes</span>
                </div>
              ) : (
                notes.map((note) => (
                  <div key={note.id} className="note-item">
                    <div className="note-header">
                      <span className="note-date">
                        <Clock size={14} />
                        {new Date(note.created_at).toLocaleDateString('fr-FR')} à {new Date(note.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <button
                        className="item-delete-btn"
                        onClick={() => handleDeleteNote(note.id)}
                        aria-label="Supprimer la note"
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

        {activeSection === 'documents' && (
          <div className="documents-section">
            <div className="section-header">
              <h2>Documents du projet</h2>
              <span className="section-count">{attachments.length} document{attachments.length > 1 ? 's' : ''}</span>
            </div>

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
                  {uploading ? 'Upload en cours...' : 'Ajouter un fichier'}
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

            <div className="items-list">
              {attachments.length === 0 ? (
                <div className="empty-state">
                  <Upload size={48} />
                  <p>Aucun document pour ce projet</p>
                  <span>Téléchargez des fichiers pour les associer à ce projet</span>
                </div>
              ) : (
                attachments.map((attachment) => (
                  <div key={attachment.id} className="document-item">
                    <div className="document-icon">
                      {getFileIcon(attachment.mime_type)}
                    </div>
                    <div className="document-info">
                      <h4>{attachment.original_name}</h4>
                      <div className="document-meta">
                        <span className={`category-badge category-${attachment.category}`}>
                          {getCategoryLabel(attachment.category)}
                        </span>
                        <span className="file-size">{formatFileSize(attachment.size)}</span>
                        <span className="file-date">
                          {new Date(attachment.created_at).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    </div>
                    <div className="document-actions">
                      <button
                        className="action-btn download"
                        onClick={() => handleDownloadAttachment(attachment)}
                        aria-label="Télécharger"
                      >
                        <Download size={18} />
                      </button>
                      <button
                        className="action-btn delete"
                        onClick={() => handleDeleteAttachment(attachment.id)}
                        aria-label="Supprimer"
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

        {activeSection === 'invoices' && (
          <div className="invoices-section">
            <div className="section-header">
              <h2>Factures annexes</h2>
              <button onClick={() => handleOpenInvoiceModal()} className="btn btn-primary">
                <Plus size={18} />
                Nouvelle facture
              </button>
            </div>

            <div className="invoices-summary">
              <div className="summary-card total">
                <span className="summary-label">Total</span>
                <span className="summary-value">{invoicesTotal.total ? `${parseFloat(invoicesTotal.total).toFixed(2)}€` : '0€'}</span>
              </div>
              <div className="summary-card success">
                <span className="summary-label">Payé</span>
                <span className="summary-value">{invoicesTotal.paid ? `${parseFloat(invoicesTotal.paid).toFixed(2)}€` : '0€'}</span>
              </div>
              <div className="summary-card warning">
                <span className="summary-label">En attente</span>
                <span className="summary-value">{invoicesTotal.pending ? `${parseFloat(invoicesTotal.pending).toFixed(2)}€` : '0€'}</span>
              </div>
            </div>

            <div className="items-list">
              {invoices.length === 0 ? (
                <div className="empty-state">
                  <Receipt size={48} />
                  <p>Aucune facture annexe</p>
                  <span>Ajoutez des factures pour les modifications, maintenances, etc.</span>
                </div>
              ) : (
                invoices.map((invoice) => (
                  <div key={invoice.id} className="invoice-item">
                    <div className="invoice-icon">
                      <Receipt size={24} />
                    </div>
                    <div className="invoice-info">
                      <div className="invoice-header-info">
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
                        aria-label="Modifier"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        className="action-btn delete"
                        onClick={() => handleDeleteInvoice(invoice.id)}
                        aria-label="Supprimer"
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

        {activeSection === 'time' && (
          <div className="time-section">
            <div className="section-header">
              <h2>Suivi du temps</h2>
              <span className="section-count">{timeStats.total_hours}h au total</span>
            </div>

            {!detailedTimeStats ? (
              <div className="loading-stats">
                <div className="spinner" />
                <p>Chargement des statistiques...</p>
              </div>
            ) : (
              <>
                <div className="time-summary">
                  <div className="summary-card">
                    <div className="summary-label">Temps total</div>
                    <div className="summary-value">{detailedTimeStats.total_hours}h</div>
                  </div>
                  <div className="summary-card">
                    <div className="summary-label">Estimation totale</div>
                    <div className="summary-value">{detailedTimeStats.total_estimated}h</div>
                  </div>
                  <div className="summary-card">
                    <div className="summary-label">Écart</div>
                    <div className={`summary-value ${parseFloat(detailedTimeStats.variance) > 0 ? 'over' : 'under'}`}>
                      {parseFloat(detailedTimeStats.variance) > 0 ? '+' : ''}{detailedTimeStats.variance}h
                    </div>
                  </div>
                </div>

                <div className="time-by-task">
                  <h3>Temps par tâche</h3>
                  {detailedTimeStats.tasks && detailedTimeStats.tasks.length > 0 ? (
                    <div className="tasks-time-list">
                      {detailedTimeStats.tasks.map((task) => (
                        <div key={task.id} className="task-time-item">
                          <div className="task-time-header">
                            <h4>{task.title}</h4>
                            <span className="task-time-total">{task.actual_hours}h</span>
                          </div>
                          <div className="task-time-details">
                            <div className="time-detail">
                              <span className="detail-label">Estimé:</span>
                              <span className="detail-value">{task.estimated_hours}h</span>
                            </div>
                            <div className="time-detail">
                              <span className="detail-label">Sessions:</span>
                              <span className="detail-value">{task.entry_count}</span>
                            </div>
                            {task.variance && (
                              <div className="time-detail">
                                <span className="detail-label">Écart:</span>
                                <span className={`detail-value ${parseFloat(task.variance) > 0 ? 'over' : 'under'}`}>
                                  {parseFloat(task.variance) > 0 ? '+' : ''}{task.variance}h
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="task-time-bar">
                            <div
                              className="time-bar-fill"
                              style={{
                                width: `${Math.min((parseFloat(task.actual_hours) / Math.max(parseFloat(task.estimated_hours), parseFloat(task.actual_hours))) * 100, 100)}%`
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="no-data">Aucune session de temps enregistrée pour ce projet.</p>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {activeSection === 'tags' && (
          <div className="tags-section">
            <div className="section-header">
              <h2>Tags du projet</h2>
            </div>
            <TagManager projectId={id} />
          </div>
        )}
      </div>

      {/* Modals */}
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
        <div className="delete-modal-content">
          <AlertTriangle size={48} color="var(--danger-color)" />
          <div>
            <p className="delete-title">
              Êtes-vous sûr de vouloir supprimer ce projet ?
            </p>
            <p className="delete-description">
              Cette action est irréversible. Toutes les tâches, notes, documents et factures associées seront également supprimés.
            </p>
          </div>
        </div>
      </Modal>

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

// Composant pour les champs éditables
const EditableField = ({
  label,
  name,
  value,
  originalValue,
  icon,
  editing,
  onEdit,
  onChange,
  onSave,
  onCancel,
  type = 'text',
  required = false,
  options = [],
  renderDisplay
}) => {
  const handleBlur = () => {
    // Sauvegarder automatiquement lors de la perte de focus
    onSave();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && type !== 'textarea') {
      e.preventDefault();
      onSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div className="info-item">
      <div className="info-label">
        {icon}
        <span>{label}</span>
      </div>
      <div className="info-value">
        {editing ? (
          <div className="inline-edit-wrapper">
            {type === 'textarea' ? (
              <textarea
                name={name}
                value={value}
                onChange={onChange}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                rows="3"
                autoFocus
                required={required}
              />
            ) : type === 'select' ? (
              <select
                name={name}
                value={value}
                onChange={(e) => {
                  onChange(e);
                  // Pour les selects, sauvegarder immédiatement après le changement
                  setTimeout(() => onSave(), 0);
                }}
                onBlur={handleBlur}
                autoFocus
                required={required}
              >
                {options.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            ) : (
              <input
                type={type}
                name={name}
                value={value}
                onChange={onChange}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                autoFocus
                required={required}
                step={type === 'number' ? '0.01' : undefined}
              />
            )}
          </div>
        ) : (
          <div className="view-field-wrapper" onClick={onEdit}>
            <div className="view-value">
              {renderDisplay ? renderDisplay() : (originalValue || '-')}
            </div>
            <button
              className="btn-edit-field"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              aria-label={`Modifier ${label}`}
            >
              <Edit2 size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectDetails;
