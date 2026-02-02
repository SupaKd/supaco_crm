import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { projectsAPI, tagsAPI } from '../services/api';
import Loader from '../components/Loader';
import { Plus, User, DollarSign, Calendar, Search, Tag, X, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, CheckSquare, Square, Trash2, Edit } from 'lucide-react';
import './Projects.scss';

const Projects = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('');

  // Sélection multiple
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [bulkActionMode, setBulkActionMode] = useState(false);

  // Tri
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');

  // Pagination
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  const fetchTags = async () => {
    try {
      const response = await tagsAPI.getAll();
      setAllTags(response.data);
    } catch (error) {
      console.error('Erreur chargement tags:', error);
    }
  };

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit
      };

      if (debouncedSearchQuery) params.search = debouncedSearchQuery;
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
  }, [pagination.page, pagination.limit, debouncedSearchQuery, selectedTag]);

  useEffect(() => {
    fetchTags();
  }, []);

  // Debounce pour la recherche
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
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

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Gestion de la sélection multiple
  const toggleProjectSelection = (projectId) => {
    setSelectedProjects(prev => {
      if (prev.includes(projectId)) {
        return prev.filter(id => id !== projectId);
      }
      return [...prev, projectId];
    });
  };

  const selectAllProjects = () => {
    if (selectedProjects.length === projects.length) {
      setSelectedProjects([]);
    } else {
      setSelectedProjects(projects.map(p => p.id));
    }
  };

  const clearSelection = () => {
    setSelectedProjects([]);
    setBulkActionMode(false);
  };

  // Actions groupées
  const handleBulkDelete = async () => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer ${selectedProjects.length} projet(s) ?`)) {
      return;
    }

    try {
      await Promise.all(selectedProjects.map(id => projectsAPI.delete(id)));
      fetchProjects();
      clearSelection();
    } catch (error) {
      console.error('Erreur suppression groupée:', error);
      alert('Erreur lors de la suppression des projets');
    }
  };

  const handleBulkStatusChange = async (newStatus) => {
    try {
      await Promise.all(
        selectedProjects.map(id =>
          projectsAPI.update(id, { status: newStatus })
        )
      );
      fetchProjects();
      clearSelection();
    } catch (error) {
      console.error('Erreur changement de statut groupé:', error);
      alert('Erreur lors du changement de statut');
    }
  };

  const handleBulkAddTag = async () => {
    // Afficher les tags disponibles
    const tagOptions = allTags.map(tag => `${tag.id}: ${tag.name}`).join('\n');
    const tagId = prompt(`Sélectionnez un tag:\n\n${tagOptions}\n\nEntrez l'ID du tag:`);

    if (!tagId || isNaN(tagId)) return;

    try {
      await Promise.all(
        selectedProjects.map(projectId =>
          tagsAPI.addToProject(projectId, parseInt(tagId))
        )
      );
      fetchProjects();
      clearSelection();
      alert('Tags ajoutés avec succès!');
    } catch (error) {
      console.error('Erreur ajout de tag groupé:', error);
      alert('Erreur lors de l\'ajout du tag');
    }
  };

  const sortedProjects = useMemo(() => {
    const sorted = [...projects].sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // Gestion des cas spéciaux
      if (sortField === 'client_name') {
        aValue = a.client_name || '';
        bValue = b.client_name || '';
      } else if (sortField === 'budget') {
        aValue = parseFloat(a.budget) || 0;
        bValue = parseFloat(b.budget) || 0;
      } else if (sortField === 'deadline' || sortField === 'created_at') {
        aValue = new Date(a[sortField] || 0);
        bValue = new Date(b[sortField] || 0);
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [projects, sortField, sortDirection]);

  const handleRowClick = (project) => {
    navigate(`/projects/${project.id}`);
  };

  if (loading && pagination.page === 1) {
    return <Loader fullScreen />;
  }

  return (
    <div className="projects-page">
      {/* En-tête de la page */}
      <div className="page-header">
        <div className="header-content">
          <h1>Mes Projets</h1>
          <p className="header-subtitle">
            {pagination.total} projet{pagination.total > 1 ? 's' : ''} au total
          </p>
        </div>
        <Link to="/projects/new" className="btn btn-primary">
          <Plus size={20} /> Nouveau projet
        </Link>
      </div>

      {/* Barre de contrôle avec recherche, filtres et tags */}
      <div className="controls-section">
        {/* Barre de recherche */}
        <div className="search-bar">
          <Search size={20} />
          <input
            type="text"
            placeholder="Rechercher un projet, client..."
            value={searchQuery}
            onChange={handleSearch}
          />
          {searchQuery && (
            <button className="clear-search" onClick={() => setSearchQuery('')}>
              <X size={16} />
            </button>
          )}
        </div>

        {/* Filtres par tags */}
        {allTags.length > 0 && (
          <div className="tag-filters-section">
            <div className="tag-filters-header">
              <span className="tag-filters-label">
                <Tag size={16} /> Tags
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
      </div>

      {/* Liste des projets en tableau */}
      {loading ? (
        <div className="loading-state">Chargement...</div>
      ) : projects.length === 0 ? (
        <div className="empty-state">
          <h3>Aucun projet</h3>
          <p>
            {!searchQuery && !selectedTag
              ? 'Commencez par créer votre premier projet'
              : 'Aucun projet ne correspond à vos critères'
            }
          </p>
          {!searchQuery && !selectedTag && (
            <Link to="/projects/new" className="btn btn-primary" style={{ marginTop: '16px' }}>
              Créer un projet
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* Barre d'actions groupées */}
          {selectedProjects.length > 0 && (
            <div className="bulk-actions-bar" style={{ display: 'flex', background: '#0077b6', padding: '16px', marginBottom: '20px', borderRadius: '12px', color: 'white' }}>
              <div className="bulk-actions-info">
                <CheckSquare size={20} />
                <span>{selectedProjects.length} projet(s) sélectionné(s)</span>
              </div>
              <div className="bulk-actions-buttons" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <select
                  className="bulk-status-select"
                  onChange={(e) => {
                    if (e.target.value) {
                      handleBulkStatusChange(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  defaultValue=""
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '2px solid white',
                    background: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  <option value="" disabled>Changer le statut</option>
                  <option value="devis" style={{ color: '#111', background: '#fff' }}>Devis</option>
                  <option value="en_cours" style={{ color: '#111', background: '#fff' }}>En cours</option>
                  <option value="termine" style={{ color: '#111', background: '#fff' }}>Terminé</option>
                  <option value="annule" style={{ color: '#111', background: '#fff' }}>Annulé</option>
                </select>
                <button
                  className="bulk-action-btn tag"
                  onClick={handleBulkAddTag}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '2px solid white',
                    background: 'transparent',
                    color: 'white',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'white'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <Tag size={16} />
                  Ajouter un tag
                </button>
                <button
                  className="bulk-action-btn delete"
                  onClick={handleBulkDelete}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '2px solid white',
                    background: 'transparent',
                    color: 'white',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'white';
                    e.currentTarget.style.color = '#ef4444';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'white';
                  }}
                >
                  <Trash2 size={16} />
                  Supprimer
                </button>
                <button
                  className="bulk-action-btn cancel"
                  onClick={clearSelection}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '2px solid white',
                    background: 'transparent',
                    color: 'white',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'white';
                    e.currentTarget.style.color = '#64748b';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'white';
                  }}
                >
                  <X size={16} />
                  Annuler
                </button>
              </div>
            </div>
          )}

          <div className="projects-table-wrapper">
            <table className="projects-table">
              <thead>
                <tr>
                  <th className="checkbox-column">
                    <button
                      className="checkbox-btn"
                      onClick={selectAllProjects}
                      aria-label="Tout sélectionner"
                    >
                      {selectedProjects.length === projects.length && projects.length > 0 ? (
                        <CheckSquare size={18} />
                      ) : (
                        <Square size={18} />
                      )}
                    </button>
                  </th>
                  <th onClick={() => handleSort('name')} className="sortable">
                    <div className="th-content">
                      Nom du projet
                      {sortField === 'name' && (
                        sortDirection === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />
                      )}
                      {sortField !== 'name' && <ArrowUpDown size={16} className="sort-icon-inactive" />}
                    </div>
                  </th>
                  <th onClick={() => handleSort('client_name')} className="sortable">
                    <div className="th-content">
                      Client
                      {sortField === 'client_name' && (
                        sortDirection === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />
                      )}
                      {sortField !== 'client_name' && <ArrowUpDown size={16} className="sort-icon-inactive" />}
                    </div>
                  </th>
                  <th onClick={() => handleSort('status')} className="sortable">
                    <div className="th-content">
                      Statut
                      {sortField === 'status' && (
                        sortDirection === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />
                      )}
                      {sortField !== 'status' && <ArrowUpDown size={16} className="sort-icon-inactive" />}
                    </div>
                  </th>
                  <th onClick={() => handleSort('budget')} className="sortable">
                    <div className="th-content">
                      Budget
                      {sortField === 'budget' && (
                        sortDirection === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />
                      )}
                      {sortField !== 'budget' && <ArrowUpDown size={16} className="sort-icon-inactive" />}
                    </div>
                  </th>
                  <th onClick={() => handleSort('deadline')} className="sortable">
                    <div className="th-content">
                      Date limite
                      {sortField === 'deadline' && (
                        sortDirection === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />
                      )}
                      {sortField !== 'deadline' && <ArrowUpDown size={16} className="sort-icon-inactive" />}
                    </div>
                  </th>
                  <th>Tags</th>
                </tr>
              </thead>
              <tbody>
                {sortedProjects.map((project) => (
                  <tr
                    key={project.id}
                    onClick={(e) => handleRowClick(project, e)}
                    className={`clickable-row ${selectedProjects.includes(project.id) ? 'selected' : ''}`}
                  >
                    <td className="checkbox-column" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="checkbox-btn"
                        onClick={() => toggleProjectSelection(project.id)}
                        aria-label="Sélectionner"
                      >
                        {selectedProjects.includes(project.id) ? (
                          <CheckSquare size={18} />
                        ) : (
                          <Square size={18} />
                        )}
                      </button>
                    </td>
                    <td className="project-name">
                      {project.name}
                    </td>
                    <td>
                      <div className="client-cell">
                        <User size={14} />
                        {project.client_name}
                      </div>
                    </td>
                    <td>
                      <span className={`badge badge-${project.status}`}>
                        {project.status === 'devis' ? 'Devis' :
                         project.status === 'en_cours' ? 'En cours' :
                         project.status === 'termine' ? 'Terminé' : 'Annulé'}
                      </span>
                    </td>
                    <td>
                      {project.budget ? (
                        <div className="budget-cell">
                          <DollarSign size={14} />
                          {project.budget}€
                        </div>
                      ) : (
                        <span className="no-data">-</span>
                      )}
                    </td>
                    <td>
                      {project.deadline ? (
                        <div className="date-cell">
                          <Calendar size={14} />
                          {new Date(project.deadline).toLocaleDateString('fr-FR')}
                        </div>
                      ) : (
                        <span className="no-data">-</span>
                      )}
                    </td>
                    <td>
                      {project.tags && project.tags.length > 0 ? (
                        <div className="tags-cell">
                          {project.tags.map(tag => (
                            <span
                              key={tag.id}
                              className="table-tag"
                              style={{ backgroundColor: tag.color }}
                            >
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="no-data">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
