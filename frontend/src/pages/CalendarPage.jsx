import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { projectsAPI } from '../services/api';
import Calendar from '../components/Calendar';
import Loader from '../components/Loader';
import Modal from '../components/Modal';
import { Calendar as CalendarIcon, Clock, User, DollarSign, AlertTriangle, CheckCircle } from 'lucide-react';
import './CalendarPage.scss';

const CalendarPage = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await projectsAPI.getAll();
      setProjects(response.data);
    } catch (error) {
      console.error('Erreur chargement projets:', error);
    } finally {
      setLoading(false);
    }
  };

  const projectsWithDeadline = projects.filter(p => p.deadline);

  const filteredProjects = projectsWithDeadline.filter(p => {
    if (filter === 'all') return true;
    return p.status === filter;
  });

  const getUpcomingDeadlines = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    return projectsWithDeadline
      .filter(p => {
        const deadline = new Date(p.deadline);
        deadline.setHours(0, 0, 0, 0);
        return deadline >= today && deadline <= nextWeek && p.status !== 'termine';
      })
      .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
  };

  const getOverdueProjects = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return projectsWithDeadline
      .filter(p => {
        const deadline = new Date(p.deadline);
        deadline.setHours(0, 0, 0, 0);
        return deadline < today && p.status !== 'termine';
      })
      .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getDaysUntil = (dateStr) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(dateStr);
    deadline.setHours(0, 0, 0, 0);
    const diff = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));

    if (diff === 0) return "Aujourd'hui";
    if (diff === 1) return "Demain";
    if (diff < 0) return `${Math.abs(diff)} jour(s) de retard`;
    return `Dans ${diff} jours`;
  };

  const getStatusLabel = (status) => {
    const labels = {
      devis: 'Devis',
      en_cours: 'En cours',
      termine: 'Terminé',
      annule: 'Annulé'
    };
    return labels[status] || status;
  };

  const upcomingDeadlines = getUpcomingDeadlines();
  const overdueProjects = getOverdueProjects();

  if (loading) {
    return <Loader fullScreen />;
  }

  return (
    <div className="calendar-page">
      <div className="page-header">
        <div>
          <h1>Calendrier des Deadlines</h1>
          <p>Visualisez et gérez les échéances de vos projets</p>
        </div>
        <div className="filter-group">
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">Tous les statuts</option>
            <option value="devis">Devis</option>
            <option value="en_cours">En cours</option>
            <option value="termine">Terminés</option>
          </select>
        </div>
      </div>

      <div className="calendar-layout">
        {/* Main Calendar */}
        <div className="calendar-main">
          <Calendar
            events={filteredProjects}
            onEventClick={(project) => setSelectedProject(project)}
          />
        </div>

        {/* Sidebar with upcoming deadlines */}
        <div className="calendar-sidebar">
          {/* Overdue Projects */}
          {overdueProjects.length > 0 && (
            <div className="deadline-section overdue">
              <h3>
                <AlertTriangle size={18} />
                En retard ({overdueProjects.length})
              </h3>
              <div className="deadline-list">
                {overdueProjects.map(project => (
                  <Link
                    to={`/projects/${project.id}`}
                    key={project.id}
                    className="deadline-item"
                  >
                    <div className="deadline-info">
                      <span className="project-name">{project.name}</span>
                      <span className="deadline-date">
                        <Clock size={14} />
                        {getDaysUntil(project.deadline)}
                      </span>
                    </div>
                    <span className={`badge badge-${project.status}`}>
                      {getStatusLabel(project.status)}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Deadlines */}
          <div className="deadline-section upcoming">
            <h3>
              <CalendarIcon size={18} />
              À venir (7 jours)
            </h3>
            {upcomingDeadlines.length === 0 ? (
              <p className="no-deadlines">Aucune deadline dans les 7 prochains jours</p>
            ) : (
              <div className="deadline-list">
                {upcomingDeadlines.map(project => (
                  <Link
                    to={`/projects/${project.id}`}
                    key={project.id}
                    className="deadline-item"
                  >
                    <div className="deadline-info">
                      <span className="project-name">{project.name}</span>
                      <span className="deadline-date">
                        <Clock size={14} />
                        {getDaysUntil(project.deadline)}
                      </span>
                    </div>
                    <span className={`badge badge-${project.status}`}>
                      {getStatusLabel(project.status)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="deadline-stats">
            <div className="stat">
              <span className="stat-value">{projectsWithDeadline.length}</span>
              <span className="stat-label">Projets avec deadline</span>
            </div>
            <div className="stat">
              <span className="stat-value">{overdueProjects.length}</span>
              <span className="stat-label">En retard</span>
            </div>
            <div className="stat">
              <span className="stat-value">{upcomingDeadlines.length}</span>
              <span className="stat-label">Cette semaine</span>
            </div>
          </div>
        </div>
      </div>

      {/* Project Detail Modal */}
      {selectedProject && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedProject(null)}
          title={selectedProject.name}
        >
          <div className="project-modal-content">
            <div className="modal-field">
              <User size={18} />
              <div>
                <label>Client</label>
                <p>{selectedProject.client_name}</p>
              </div>
            </div>

            <div className="modal-field">
              <CalendarIcon size={18} />
              <div>
                <label>Deadline</label>
                <p>{formatDate(selectedProject.deadline)}</p>
                <span className={`days-until ${new Date(selectedProject.deadline) < new Date() ? 'overdue' : ''}`}>
                  {getDaysUntil(selectedProject.deadline)}
                </span>
              </div>
            </div>

            {selectedProject.budget && (
              <div className="modal-field">
                <DollarSign size={18} />
                <div>
                  <label>Budget</label>
                  <p>{selectedProject.budget}€</p>
                </div>
              </div>
            )}

            <div className="modal-field">
              <CheckCircle size={18} />
              <div>
                <label>Statut</label>
                <span className={`badge badge-${selectedProject.status}`}>
                  {getStatusLabel(selectedProject.status)}
                </span>
              </div>
            </div>

            {selectedProject.description && (
              <div className="modal-description">
                <label>Description</label>
                <p>{selectedProject.description}</p>
              </div>
            )}

            <div className="modal-actions">
              <Link
                to={`/projects/${selectedProject.id}`}
                className="btn btn-primary"
              >
                Voir le projet
              </Link>
              <button
                className="btn btn-secondary"
                onClick={() => setSelectedProject(null)}
              >
                Fermer
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default CalendarPage;
