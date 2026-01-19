import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { projectsAPI } from '../services/api';
import Loader from '../components/Loader';
import { Plus, User, DollarSign, Calendar, Clock, Search } from 'lucide-react';
import './Projects.scss';

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

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

  const filteredProjects = projects
    .filter(p => filter === 'all' || p.status === filter)
    .filter(p => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(query) ||
        p.client_name.toLowerCase().includes(query) ||
        (p.description && p.description.toLowerCase().includes(query))
      );
    });

  if (loading) {
    return <Loader fullScreen />;
  }

  return (
    <div className="projects-page">
      <div className="page-header">
        <div>
          <h1>Mes Projets</h1>
          <p>{projects.length} projet{projects.length > 1 ? 's' : ''} au total</p>
        </div>
        <Link to="/projects/new" className="btn btn-primary">
          <Plus size={20} /> Nouveau projet
        </Link>
      </div>

      {/* Barre de recherche */}
      <div className="search-bar">
        <Search size={20} />
        <input
          type="text"
          placeholder="Rechercher un projet, client..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Filtres */}
      <div className="filters">
        <button
          className={filter === 'all' ? 'filter-btn active' : 'filter-btn'}
          onClick={() => setFilter('all')}
        >
          Tous ({projects.length})
        </button>
        <button
          className={filter === 'devis' ? 'filter-btn active' : 'filter-btn'}
          onClick={() => setFilter('devis')}
        >
          Devis ({projects.filter(p => p.status === 'devis').length})
        </button>
        <button
          className={filter === 'en_cours' ? 'filter-btn active' : 'filter-btn'}
          onClick={() => setFilter('en_cours')}
        >
          En cours ({projects.filter(p => p.status === 'en_cours').length})
        </button>
        <button
          className={filter === 'termine' ? 'filter-btn active' : 'filter-btn'}
          onClick={() => setFilter('termine')}
        >
          Terminés ({projects.filter(p => p.status === 'termine').length})
        </button>
      </div>

      {/* Liste des projets */}
      {filteredProjects.length === 0 ? (
        <div className="empty-state">
          <h3>Aucun projet</h3>
          <p>
            {filter === 'all' 
              ? 'Commencez par créer votre premier projet'
              : `Aucun projet avec le statut "${filter === 'devis' ? 'Devis' : filter === 'en_cours' ? 'En cours' : 'Terminé'}"`
            }
          </p>
          {filter === 'all' && (
            <Link to="/projects/new" className="btn btn-primary" style={{ marginTop: '16px' }}>
              Créer un projet
            </Link>
          )}
        </div>
      ) : (
        <div className="projects-list">
          {filteredProjects.map((project) => (
            <Link to={`/projects/${project.id}`} key={project.id} className="project-item">
              <div className="project-main">
                <div className="project-info">
                  <h3>{project.name}</h3>
                  <p className="client-name">
                    <User size={16} /> {project.client_name}
                  </p>
                </div>
                <span className={`badge badge-${project.status}`}>
                  {project.status === 'devis' ? 'Devis' :
                   project.status === 'en_cours' ? 'En cours' :
                   project.status === 'termine' ? 'Terminé' : 'Annulé'}
                </span>
              </div>
              
              <div className="project-details">
                {project.budget && (
                  <span className="detail-item">
                    <DollarSign size={16} /> {project.budget}€
                  </span>
                )}
                {project.deadline && (
                  <span className="detail-item">
                    <Calendar size={16} /> {new Date(project.deadline).toLocaleDateString('fr-FR')}
                  </span>
                )}
                <span className="detail-item">
                  <Clock size={16} /> {new Date(project.created_at).toLocaleDateString('fr-FR')}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Projects;