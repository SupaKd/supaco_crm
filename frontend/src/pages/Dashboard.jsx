import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { projectsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import Loader from '../components/Loader';
import { BarChart3, FileText, Settings, CheckCircle2, User, DollarSign, Calendar, Plus } from 'lucide-react';
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

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#dbeafe' }}>
            <BarChart3 size={24} color="#3b82f6" />
          </div>
          <div className="stat-content">
            <p className="stat-label">Total Projets</p>
            <h2 className="stat-value">{stats.total}</h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#fef3c7' }}>
            <FileText size={24} color="#f59e0b" />
          </div>
          <div className="stat-content">
            <p className="stat-label">Devis</p>
            <h2 className="stat-value">{stats.devis}</h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#dbeafe' }}>
            <Settings size={24} color="#3b82f6" />
          </div>
          <div className="stat-content">
            <p className="stat-label">En cours</p>
            <h2 className="stat-value">{stats.en_cours}</h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#d1fae5' }}>
            <CheckCircle2 size={24} color="#10b981" />
          </div>
          <div className="stat-content">
            <p className="stat-label">Terminés</p>
            <h2 className="stat-value">{stats.termine}</h2>
          </div>
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