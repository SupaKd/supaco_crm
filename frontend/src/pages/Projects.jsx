import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { projectsAPI, tagsAPI } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import Loader from '../components/Loader';
import QuickViewModal from '../components/QuickViewModal';
import { Plus, User, DollarSign, Calendar, Search, Tag, X, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Eye, Edit, CheckCircle2, XCircle } from 'lucide-react';
import './Projects.scss';

const Projects = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [projects, setProjects] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [editingCell, setEditingCell] = useState(null); // { projectId, field }
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [quickViewProject, setQuickViewProject] = useState(null);

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

  useEffect(() => {
    fetchTags();
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [pagination.page, searchQuery, selectedTag]);

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

  const handleStartEdit = (projectId, field, currentValue) => {
    setEditingCell({ projectId, field });
    setEditValue(currentValue || '');
  };

  const handleCancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const handleSaveEdit = async (project) => {
    if (!editingCell) return;

    try {
      setSaving(true);

      const updateData = {
        name: project.name,
        client_name: project.client_name,
        status: project.status,
        budget: project.budget,
        deadline: project.deadline,
        [editingCell.field]: editValue === '' ? null : editValue
      };

      // Conversion pour le budget
      if (editingCell.field === 'budget') {
        updateData.budget = editValue ? parseFloat(editValue) : null;
      }

      await projectsAPI.update(project.id, updateData);

      // Mettre à jour localement
      setProjects(prevProjects =>
        prevProjects.map(p =>
          p.id === project.id
            ? { ...p, [editingCell.field]: editingCell.field === 'budget' && editValue ? parseFloat(editValue) : editValue }
            : p
        )
      );

      toast.success('Projet mis à jour');
      setEditingCell(null);
      setEditValue('');
    } catch (error) {
      console.error('Erreur mise à jour:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  const isEditing = (projectId, field) => {
    return editingCell?.projectId === projectId && editingCell?.field === field;
  };

  const handleRowClick = (project, e) => {
    // Ne pas ouvrir la modal si on clique sur une cellule éditable ou un bouton
    if (
      e.target.closest('.editable-cell') ||
      e.target.closest('.action-btn') ||
      e.target.closest('.inline-edit-table')
    ) {
      return;
    }
    setQuickViewProject(project);
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
          <div className="projects-table-wrapper">
            <table className="projects-table">
              <thead>
                <tr>
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
                  <th className="actions-column">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedProjects.map((project) => (
                  <tr
                    key={project.id}
                    onClick={(e) => handleRowClick(project, e)}
                    className="clickable-row"
                  >
                    <td className="project-name editable-cell">
                      {isEditing(project.id, 'name') ? (
                        <div className="inline-edit-table">
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(project);
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                            autoFocus
                          />
                          <div className="inline-actions">
                            <button
                              className="btn-save"
                              onClick={() => handleSaveEdit(project)}
                              disabled={saving}
                            >
                              <CheckCircle2 size={14} />
                            </button>
                            <button
                              className="btn-cancel"
                              onClick={handleCancelEdit}
                            >
                              <XCircle size={14} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="view-cell" onClick={() => handleStartEdit(project.id, 'name', project.name)}>
                          {project.name}
                          <Edit size={12} className="edit-icon" />
                        </div>
                      )}
                    </td>
                    <td className="editable-cell">
                      {isEditing(project.id, 'client_name') ? (
                        <div className="inline-edit-table">
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(project);
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                            autoFocus
                          />
                          <div className="inline-actions">
                            <button
                              className="btn-save"
                              onClick={() => handleSaveEdit(project)}
                              disabled={saving}
                            >
                              <CheckCircle2 size={14} />
                            </button>
                            <button
                              className="btn-cancel"
                              onClick={handleCancelEdit}
                            >
                              <XCircle size={14} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="client-cell view-cell" onClick={() => handleStartEdit(project.id, 'client_name', project.client_name)}>
                          <User size={14} />
                          {project.client_name}
                          <Edit size={12} className="edit-icon" />
                        </div>
                      )}
                    </td>
                    <td className="editable-cell">
                      {isEditing(project.id, 'status') ? (
                        <div className="inline-edit-table">
                          <select
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            autoFocus
                          >
                            <option value="devis">Devis</option>
                            <option value="en_cours">En cours</option>
                            <option value="termine">Terminé</option>
                            <option value="annule">Annulé</option>
                          </select>
                          <div className="inline-actions">
                            <button
                              className="btn-save"
                              onClick={() => handleSaveEdit(project)}
                              disabled={saving}
                            >
                              <CheckCircle2 size={14} />
                            </button>
                            <button
                              className="btn-cancel"
                              onClick={handleCancelEdit}
                            >
                              <XCircle size={14} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="view-cell" onClick={() => handleStartEdit(project.id, 'status', project.status)}>
                          <span className={`badge badge-${project.status}`}>
                            {project.status === 'devis' ? 'Devis' :
                             project.status === 'en_cours' ? 'En cours' :
                             project.status === 'termine' ? 'Terminé' : 'Annulé'}
                          </span>
                          <Edit size={12} className="edit-icon" />
                        </div>
                      )}
                    </td>
                    <td className="editable-cell">
                      {isEditing(project.id, 'budget') ? (
                        <div className="inline-edit-table">
                          <input
                            type="number"
                            step="0.01"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(project);
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                            autoFocus
                          />
                          <div className="inline-actions">
                            <button
                              className="btn-save"
                              onClick={() => handleSaveEdit(project)}
                              disabled={saving}
                            >
                              <CheckCircle2 size={14} />
                            </button>
                            <button
                              className="btn-cancel"
                              onClick={handleCancelEdit}
                            >
                              <XCircle size={14} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="view-cell" onClick={() => handleStartEdit(project.id, 'budget', project.budget)}>
                          {project.budget ? (
                            <div className="budget-cell">
                              <DollarSign size={14} />
                              {project.budget}€
                            </div>
                          ) : (
                            <span className="no-data">-</span>
                          )}
                          <Edit size={12} className="edit-icon" />
                        </div>
                      )}
                    </td>
                    <td className="editable-cell">
                      {isEditing(project.id, 'deadline') ? (
                        <div className="inline-edit-table">
                          <input
                            type="date"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(project);
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                            autoFocus
                          />
                          <div className="inline-actions">
                            <button
                              className="btn-save"
                              onClick={() => handleSaveEdit(project)}
                              disabled={saving}
                            >
                              <CheckCircle2 size={14} />
                            </button>
                            <button
                              className="btn-cancel"
                              onClick={handleCancelEdit}
                            >
                              <XCircle size={14} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="view-cell" onClick={() => handleStartEdit(project.id, 'deadline', project.deadline ? project.deadline.split('T')[0] : '')}>
                          {project.deadline ? (
                            <div className="date-cell">
                              <Calendar size={14} />
                              {new Date(project.deadline).toLocaleDateString('fr-FR')}
                            </div>
                          ) : (
                            <span className="no-data">-</span>
                          )}
                          <Edit size={12} className="edit-icon" />
                        </div>
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
                    <td className="actions-cell">
                      <button
                        className="action-btn"
                        onClick={() => navigate(`/projects/${project.id}`)}
                        title="Voir le projet"
                      >
                        <Eye size={16} />
                      </button>
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

      {/* Modal d'aperçu rapide */}
      <QuickViewModal
        isOpen={!!quickViewProject}
        onClose={() => setQuickViewProject(null)}
        project={quickViewProject}
      />
    </div>
  );
};

export default Projects;
