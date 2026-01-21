import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { prospectsAPI } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import Loader from '../components/Loader';
import ProspectModal from '../components/ProspectModal';
import {
  Plus,
  User,
  Building2,
  DollarSign,
  Phone,
  Mail,
  GripVertical,
  ExternalLink,
  Trash2,
  Edit2
} from 'lucide-react';
import './Commercial.scss';

const COLUMNS = [
  { id: 'nouveau', label: 'Nouveau', color: '#6b7280' },
  { id: 'contacte', label: 'Contacté', color: '#3b82f6' },
  { id: 'qualification', label: 'Qualification', color: '#8b5cf6' },
  { id: 'proposition', label: 'Proposition', color: '#f59e0b' },
  { id: 'negociation', label: 'Négociation', color: '#ec4899' },
  { id: 'gagne', label: 'Gagné', color: '#10b981' },
  { id: 'perdu', label: 'Perdu', color: '#ef4444' }
];

const SOURCE_LABELS = {
  site_web: 'Site web',
  recommandation: 'Recommandation',
  linkedin: 'LinkedIn',
  salon: 'Salon',
  autre: 'Autre'
};

const Commercial = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const [prospects, setProspects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draggedProspect, setDraggedProspect] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingProspect, setEditingProspect] = useState(null);

  useEffect(() => {
    fetchProspects();
  }, []);

  const fetchProspects = async () => {
    try {
      const response = await prospectsAPI.getAll();
      setProspects(response.data);
    } catch (error) {
      console.error('Erreur chargement prospects:', error);
      toast.error('Erreur lors du chargement des prospects');
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (e, prospect) => {
    setDraggedProspect(prospect);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, newStatus) => {
    e.preventDefault();

    if (!draggedProspect || draggedProspect.status === newStatus) {
      setDraggedProspect(null);
      return;
    }

    try {
      const response = await prospectsAPI.updateStatus(draggedProspect.id, newStatus);

      if (response.data.projectCreated) {
        toast.success(`Prospect converti ! Projet créé avec succès.`);
      } else {
        toast.success('Statut mis à jour');
      }

      await fetchProspects();
    } catch (error) {
      console.error('Erreur changement statut:', error);
      toast.error('Erreur lors du changement de statut');
    } finally {
      setDraggedProspect(null);
    }
  };

  const handleCreateProspect = () => {
    setEditingProspect(null);
    setShowModal(true);
  };

  const handleEditProspect = (prospect) => {
    setEditingProspect(prospect);
    setShowModal(true);
  };

  const handleDeleteProspect = async (prospectId) => {
    if (!confirm('Supprimer ce prospect ?')) return;

    try {
      await prospectsAPI.delete(prospectId);
      toast.success('Prospect supprimé');
      await fetchProspects();
    } catch (error) {
      console.error('Erreur suppression:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleModalSave = async (data) => {
    try {
      if (editingProspect) {
        await prospectsAPI.update(editingProspect.id, data);
        toast.success('Prospect mis à jour');
      } else {
        await prospectsAPI.create(data);
        toast.success('Prospect créé');
      }
      setShowModal(false);
      await fetchProspects();
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const getProspectsByStatus = (status) => {
    return prospects.filter(p => p.status === status);
  };

  if (loading) {
    return <Loader fullScreen />;
  }

  return (
    <div className="commercial-page">
      <div className="page-header">
        <div>
          <h1>Pipeline Commercial</h1>
          <p>{prospects.length} prospect{prospects.length > 1 ? 's' : ''} au total</p>
        </div>
        <button onClick={handleCreateProspect} className="btn btn-primary">
          <Plus size={20} /> Nouveau prospect
        </button>
      </div>

      <div className="kanban-board">
        {COLUMNS.map((column) => {
          const columnProspects = getProspectsByStatus(column.id);
          return (
            <div
              key={column.id}
              className="kanban-column"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              <div className="column-header" style={{ borderTopColor: column.color }}>
                <span className="column-title">{column.label}</span>
                <span className="column-count" style={{ backgroundColor: column.color }}>
                  {columnProspects.length}
                </span>
              </div>

              <div className="column-content">
                {columnProspects.map((prospect) => (
                  <div
                    key={prospect.id}
                    className={`prospect-card ${draggedProspect?.id === prospect.id ? 'dragging' : ''}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, prospect)}
                  >
                    <div className="card-drag-handle">
                      <GripVertical size={16} />
                    </div>

                    <div className="card-content">
                      <div className="card-header">
                        <h4>{prospect.first_name} {prospect.last_name}</h4>
                        <div className="card-actions">
                          <button
                            className="action-btn"
                            onClick={() => handleEditProspect(prospect)}
                            title="Modifier"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            className="action-btn delete"
                            onClick={() => handleDeleteProspect(prospect.id)}
                            title="Supprimer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {prospect.company && (
                        <div className="card-info">
                          <Building2 size={14} />
                          <span>{prospect.company}</span>
                        </div>
                      )}

                      {prospect.estimated_budget && (
                        <div className="card-info budget">
                          <DollarSign size={14} />
                          <span>{Number(prospect.estimated_budget).toLocaleString('fr-FR')} €</span>
                        </div>
                      )}

                      <div className="card-footer">
                        <span className="source-badge">
                          {SOURCE_LABELS[prospect.source] || prospect.source}
                        </span>

                        {prospect.project_id && (
                          <button
                            className="project-link"
                            onClick={() => navigate(`/projects/${prospect.project_id}`)}
                            title="Voir le projet"
                          >
                            <ExternalLink size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {columnProspects.length === 0 && (
                  <div className="empty-column">
                    Aucun prospect
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <ProspectModal
          prospect={editingProspect}
          onClose={() => setShowModal(false)}
          onSave={handleModalSave}
        />
      )}
    </div>
  );
};

export default Commercial;
