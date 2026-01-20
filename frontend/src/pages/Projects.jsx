import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { projectsAPI } from '../services/api';
import Loader from '../components/Loader';
import { Plus, User, DollarSign, Calendar, Clock, Search, Tag, X } from 'lucide-react';
import './Projects.scss';

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);

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

  // Extraire tous les tags uniques des projets
  const allTags = useMemo(() => {
    const tagsMap = new Map();
    projects.forEach(p => {
      if (p.tags) {
        p.tags.forEach(tag => {
          if (!tagsMap.has(tag.id)) {
            tagsMap.set(tag.id, tag);
          }
        });
      }
    });
    return Array.from(tagsMap.values());
  }, [projects]);

  const toggleTagFilter = (tagId) => {
    setSelectedTags(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const clearTagFilters = () => {
    setSelectedTags([]);
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
    })
    .filter(p => {
      if (selectedTags.length === 0) return true;
      if (!p.tags || p.tags.length === 0) return false;
      return selectedTags.every(tagId => p.tags.some(t => t.id === tagId));
    })
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

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

      {/* Filtres par statut */}
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

      {/* Filtres par tags */}
      {allTags.length > 0 && (
        <div className="tag-filters">
          <div className="tag-filters-header">
            <span className="tag-filters-label">
              <Tag size={16} /> Filtrer par tags :
            </span>
            {selectedTags.length > 0 && (
              <button className="clear-tags-btn" onClick={clearTagFilters}>
                <X size={14} /> Effacer
              </button>
            )}
          </div>
          <div className="tag-filters-list">
            {allTags.map(tag => (
              <button
                key={tag.id}
                className={`tag-filter-btn ${selectedTags.includes(tag.id) ? 'active' : ''}`}
                style={{
                  '--tag-color': tag.color,
                  backgroundColor: selectedTags.includes(tag.id) ? tag.color : 'transparent',
                  borderColor: tag.color,
                  color: selectedTags.includes(tag.id) ? 'white' : tag.color
                }}
                onClick={() => toggleTagFilter(tag.id)}
              >
                {tag.name}
              </button>
            ))}
          </div>
        </div>
      )}

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
              
              {/* Tags du projet */}
              {project.tags && project.tags.length > 0 && (
                <div className="project-tags">
                  {project.tags.map(tag => (
                    <span
                      key={tag.id}
                      className="project-tag"
                      style={{ backgroundColor: tag.color }}
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}

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