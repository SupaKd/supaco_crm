import { useNavigate } from 'react-router-dom';
import Modal from './Modal';
import {
  User,
  Building2,
  DollarSign,
  Calendar,
  Tag,
  FileText,
  ExternalLink,
  Clock
} from 'lucide-react';
import './QuickViewModal.scss';

const QuickViewModal = ({ isOpen, onClose, project }) => {
  const navigate = useNavigate();

  if (!project) return null;

  const handleViewFullProject = () => {
    onClose();
    navigate(`/projects/${project.id}`);
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'devis':
        return 'Devis';
      case 'en_cours':
        return 'En cours';
      case 'termine':
        return 'Terminé';
      case 'annule':
        return 'Annulé';
      default:
        return status;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Aperçu rapide"
      footer={
        <div className="quick-view-footer">
          <button onClick={onClose} className="btn btn-secondary">
            Fermer
          </button>
          <button onClick={handleViewFullProject} className="btn btn-primary">
            <ExternalLink size={16} />
            Voir le projet complet
          </button>
        </div>
      }
    >
      <div className="quick-view-content">
        {/* Nom du projet et statut */}
        <div className="quick-view-header">
          <h3 className="project-title">{project.name}</h3>
          <span className={`badge badge-${project.status}`}>
            {getStatusLabel(project.status)}
          </span>
        </div>

        {/* Informations principales */}
        <div className="quick-view-section">
          <h4 className="section-title">Informations principales</h4>
          <div className="info-grid">
            <div className="info-item">
              <div className="info-label">
                <User size={16} />
                Client
              </div>
              <div className="info-value">
                {project.client_name || '-'}
              </div>
            </div>

            <div className="info-item">
              <div className="info-label">
                <DollarSign size={16} />
                Budget
              </div>
              <div className="info-value">
                {project.budget ? `${project.budget}€` : '-'}
              </div>
            </div>

            <div className="info-item">
              <div className="info-label">
                <Calendar size={16} />
                Date limite
              </div>
              <div className="info-value">
                {formatDate(project.deadline)}
              </div>
            </div>

            <div className="info-item">
              <div className="info-label">
                <Clock size={16} />
                Créé le
              </div>
              <div className="info-value">
                {formatDate(project.created_at)}
              </div>
            </div>
          </div>
        </div>

        {/* Tags */}
        {project.tags && project.tags.length > 0 && (
          <div className="quick-view-section">
            <h4 className="section-title">
              <Tag size={16} />
              Tags
            </h4>
            <div className="tags-list">
              {project.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="tag-badge"
                  style={{ backgroundColor: tag.color }}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        {project.description && (
          <div className="quick-view-section">
            <h4 className="section-title">
              <FileText size={16} />
              Description
            </h4>
            <div className="description-content">
              {project.description}
            </div>
          </div>
        )}

        {/* Message si pas de description */}
        {!project.description && (
          <div className="quick-view-section">
            <p className="no-description">
              Aucune description disponible pour ce projet
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default QuickViewModal;
