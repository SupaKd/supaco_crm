import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { projectsAPI, tagsAPI } from '../services/api';
import Loader from '../components/Loader';
import { Plus, User, DollarSign, Calendar, Clock, Search, Tag, X, ChevronLeft, ChevronRight } from 'lucide-react';
import './Projects.scss';

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('');

  // Pagination
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  useEffect(() => {
    fetchTags();
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [pagination.page, filter, searchQuery, selectedTag]);

  const fetchTags = async () => {
    try {
      const response = await tagsAPI.getAll();
      setAllTags(response.data);
    } catch (error) {
      console.error('Erreur chargement tags:', error);
    }
  };

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit
      };

      if (searchQuery) params.search = searchQuery;
      if (filter !== 'all') params.status = filter;
      if (selectedTag) params.tagId = selectedTag;

      const response = await projectsAPI.getAll(params);
      setProjects(response.data.data);
      setPagination(prev => ({
        ...prev,
        total: response.data.pagination.total,
        totalPages: response.data.pagination.totalPages
      }));
    } catch (error) {
      console.error('Erreur chargement projets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleTagChange = (tagId) => {
    setSelectedTag(tagId === selectedTag ? '' : tagId);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, page: newPage }));
    }
  };

  if (loading && pagination.page === 1) {
    return <Loader fullScreen />;
  }

  return (
    <div className="projects-page">
      <div className="page-header">
        <div>
          <h1>Mes Projets</h1>
          <p>{pagination.total} projet{pagination.total > 1 ? 's' : ''} au total</p>
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
          onChange={handleSearch}
        />
      </div>

      {/* Filtres par statut */}
      <div className="filters">
        <button
          className={filter === 'all' ? 'filter-btn active' : 'filter-btn'}
          onClick={() => handleFilterChange('all')}
        >
          Tous
        </button>
        <button
          className={filter === 'devis' ? 'filter-btn active' : 'filter-btn'}
          onClick={() => handleFilterChange('devis')}
        >
          Devis
        </button>
        <button
          className={filter === 'en_cours' ? 'filter-btn active' : 'filter-btn'}
          onClick={() => handleFilterChange('en_cours')}
        >
          En cours
        </button>
        <button
          className={filter === 'termine' ? 'filter-btn active' : 'filter-btn'}
          onClick={() => handleFilterChange('termine')}
        >
          Terminés
        </button>
      </div>

      {/* Filtres par tags */}
      {allTags.length > 0 && (
        <div className="tag-filters">
          <div className="tag-filters-header">
            <span className="tag-filters-label">
              <Tag size={16} /> Filtrer par tag :
            </span>
            {selectedTag && (
              <button className="clear-tags-btn" onClick={() => setSelectedTag('')}>
                <X size={14} /> Effacer
              </button>
            )}
          </div>
          <div className="tag-filters-list">
            {allTags.map(tag => (
              <button
                key={tag.id}
                className={`tag-filter-btn ${selectedTag === tag.id ? 'active' : ''}`}
                style={{
                  '--tag-color': tag.color,
                  backgroundColor: selectedTag === tag.id ? tag.color : 'transparent',
                  borderColor: tag.color,
                  color: selectedTag === tag.id ? 'white' : tag.color
                }}
                onClick={() => handleTagChange(tag.id)}
              >
                {tag.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Liste des projets */}
      {loading ? (
        <div className="loading-state">Chargement...</div>
      ) : projects.length === 0 ? (
        <div className="empty-state">
          <h3>Aucun projet</h3>
          <p>
            {filter === 'all' && !searchQuery && !selectedTag
              ? 'Commencez par créer votre premier projet'
              : 'Aucun projet ne correspond à vos critères'
            }
          </p>
          {filter === 'all' && !searchQuery && !selectedTag && (
            <Link to="/projects/new" className="btn btn-primary" style={{ marginTop: '16px' }}>
              Créer un projet
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="projects-list">
            {projects.map((project) => (
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

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="pagination">
              <button
                className="pagination-btn"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
              >
                <ChevronLeft size={18} />
              </button>

              <div className="pagination-pages">
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                  .filter(page => {
                    // Afficher les 5 pages autour de la page actuelle
                    return Math.abs(page - pagination.page) <= 2 || page === 1 || page === pagination.totalPages;
                  })
                  .map((page, index, array) => {
                    // Ajouter des ellipses si nécessaire
                    const showEllipsisBefore = index > 0 && page - array[index - 1] > 1;
                    return (
                      <span key={page}>
                        {showEllipsisBefore && <span className="pagination-ellipsis">...</span>}
                        <button
                          className={`pagination-page ${pagination.page === page ? 'active' : ''}`}
                          onClick={() => handlePageChange(page)}
                        >
                          {page}
                        </button>
                      </span>
                    );
                  })}
              </div>

              <button
                className="pagination-btn"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
              >
                <ChevronRight size={18} />
              </button>

              <span className="pagination-info">
                Page {pagination.page} sur {pagination.totalPages}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Projects;
