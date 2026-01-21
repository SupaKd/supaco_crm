import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { projectsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import Loader from '../components/Loader';
import QuickNotes from '../components/QuickNotes';
import {
  BarChart3, FileText, Settings, CheckCircle2, User, DollarSign,
  Calendar, Plus, Folder, AlertTriangle, Clock, ArrowRight
} from 'lucide-react';
import './Dashboard.scss';

const Dashboard = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    devis: 0,
    en_cours: 0,
    termine: 0
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await projectsAPI.getAll();
      setProjects(response.data);
      calculateStats(response.data);
    } catch (error) {
      console.error('Erreur chargement projets:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (projectsData) => {
    const stats = {
      total: projectsData.length,
      devis: projectsData.filter(p => p.status === 'devis').length,
      en_cours: projectsData.filter(p => p.status === 'en_cours').length,
      termine: projectsData.filter(p => p.status === 'termine').length
    };
    setStats(stats);
  };

  if (loading) {
    return <Loader fullScreen />;
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Tableau de bord</h1>
          <p>Bienvenue {user?.name}</p>
        </div>
        <Link to="/projects/new" className="btn btn-primary">
          <Plus size={20} /> Nouveau projet
        </Link>
      </div>

      

      {/* Actions & Deadlines Section */}
      <div className="dashboard-widgets">
        <div className="widgets-left">
          {/* Actions rapides */}
          <div className="quick-actions">
            <h3>Actions rapides</h3>
            <div className="actions-grid">
              <Link to="/projects/new" className="action-card">
                <div className="action-icon" style={{ backgroundColor: '#dbeafe' }}>
                  <Plus size={22} color="#3b82f6" />
                </div>
                <span>Nouveau projet</span>
              </Link>
              <Link to="/projects" className="action-card">
                <div className="action-icon" style={{ backgroundColor: '#fef3c7' }}>
                  <Folder size={22} color="#f59e0b" />
                </div>
                <span>Mes projets</span>
              </Link>
              <Link to="/calendar" className="action-card">
                <div className="action-icon" style={{ backgroundColor: '#d1fae5' }}>
                  <Calendar size={22} color="#10b981" />
                </div>
                <span>Calendrier</span>
              </Link>
              <Link to="/analytics" className="action-card">
                <div className="action-icon" style={{ backgroundColor: '#ede9fe' }}>
                  <BarChart3 size={22} color="#8b5cf6" />
                </div>
                <span>Statistiques</span>
              </Link>
            </div>
          </div>

          {/* Deadlines du jour / à venir */}
          <div className="today-deadlines">
            <h3>
              <Clock size={18} />
              Deadlines à venir
            </h3>
            {(() => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const nextWeek = new Date(today);
              nextWeek.setDate(nextWeek.getDate() + 7);

              const upcomingDeadlines = projects
                .filter(p => {
                  if (!p.deadline || p.status === 'termine') return false;
                  const deadline = new Date(p.deadline);
                  deadline.setHours(0, 0, 0, 0);
                  return deadline >= today && deadline <= nextWeek;
                })
                .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

              const overdueProjects = projects
                .filter(p => {
                  if (!p.deadline || p.status === 'termine') return false;
                  const deadline = new Date(p.deadline);
                  deadline.setHours(0, 0, 0, 0);
                  return deadline < today;
                });

              if (upcomingDeadlines.length === 0 && overdueProjects.length === 0) {
                return (
                  <p className="no-deadlines">Aucune deadline dans les 7 prochains jours</p>
                );
              }

              const formatDeadline = (dateStr) => {
                const deadline = new Date(dateStr);
                const todayDate = new Date();
                todayDate.setHours(0, 0, 0, 0);
                deadline.setHours(0, 0, 0, 0);
                const diff = Math.ceil((deadline - todayDate) / (1000 * 60 * 60 * 24));

                if (diff < 0) return `${Math.abs(diff)}j de retard`;
                if (diff === 0) return "Aujourd'hui";
                if (diff === 1) return 'Demain';
                return `Dans ${diff}j`;
              };

              return (
                <div className="deadlines-list">
                  {overdueProjects.map(project => (
                    <Link to={`/projects/${project.id}`} key={project.id} className="deadline-item overdue">
                      <div className="deadline-icon">
                        <AlertTriangle size={16} />
                      </div>
                      <div className="deadline-info">
                        <span className="deadline-name">{project.name}</span>
                        <span className="deadline-client">{project.client_name}</span>
                      </div>
                      <span className="deadline-date overdue">{formatDeadline(project.deadline)}</span>
                    </Link>
                  ))}
                  {upcomingDeadlines.slice(0, 5).map(project => (
                    <Link to={`/projects/${project.id}`} key={project.id} className="deadline-item">
                      <div className="deadline-icon">
                        <Calendar size={16} />
                      </div>
                      <div className="deadline-info">
                        <span className="deadline-name">{project.name}</span>
                        <span className="deadline-client">{project.client_name}</span>
                      </div>
                      <span className="deadline-date">{formatDeadline(project.deadline)}</span>
                    </Link>
                  ))}
                  {(upcomingDeadlines.length > 5 || overdueProjects.length > 0) && (
                    <Link to="/calendar" className="view-all-deadlines">
                      Voir tout le calendrier <ArrowRight size={16} />
                    </Link>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
        <div className="widgets-right">
          <QuickNotes />
        </div>
      </div>

      {/* Recent Projects */}
      <div className="recent-projects">
        <div className="section-header">
          <h2>Projets récents</h2>
          <Link to="/projects" className="view-all">Voir tout</Link>
        </div>

        {projects.length === 0 ? (
          <div className="empty-state">
            <h3>Aucun projet</h3>
            <p>Commencez par créer votre premier projet</p>
            <Link to="/projects/new" className="btn btn-primary" style={{ marginTop: '16px' }}>
              Créer un projet
            </Link>
          </div>
        ) : (
          <div className="projects-grid">
            {projects.slice(0, 6).map((project) => (
              <Link to={`/projects/${project.id}`} key={project.id} className="project-card">
                <div className="project-header">
                  <h3>{project.name}</h3>
                  <span className={`badge badge-${project.status}`}>
                    {project.status === 'devis' ? 'Devis' :
                     project.status === 'en_cours' ? 'En cours' :
                     project.status === 'termine' ? 'Terminé' : 'Annulé'}
                  </span>
                </div>
                {project.tags && project.tags.length > 0 && (
                  <div className="project-tags">
                    {project.tags.slice(0, 3).map(tag => (
                      <span
                        key={tag.id}
                        className="project-tag"
                        style={{ backgroundColor: tag.color }}
                      >
                        {tag.name}
                      </span>
                    ))}
                    {project.tags.length > 3 && (
                      <span className="project-tag more">+{project.tags.length - 3}</span>
                    )}
                  </div>
                )}
                <p className="project-client">
                  <User size={16} /> {project.client_name}
                </p>
                {project.budget && (
                  <p className="project-budget">
                    <DollarSign size={16} /> {project.budget}€
                  </p>
                )}
                {project.deadline && (
                  <p className="project-deadline">
                    <Calendar size={16} /> {new Date(project.deadline).toLocaleDateString('fr-FR')}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;