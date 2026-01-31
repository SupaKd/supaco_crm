import { useState, useEffect, useMemo } from 'react';
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
  ExternalLink,
  Trash2,
  Edit2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  X
} from 'lucide-react';
import './Commercial.scss';

const STATUS_CONFIG = {
  nouveau: { label: 'Nouveau', color: '#6b7280' },
  contacte: { label: 'Contacté', color: '#3b82f6' },
  qualification: { label: 'Qualification', color: '#8b5cf6' },
  proposition: { label: 'Proposition', color: '#f59e0b' },
  negociation: { label: 'Négociation', color: '#ec4899' },
  gagne: { label: 'Gagné', color: '#10b981' },
  perdu: { label: 'Perdu', color: '#ef4444' }
};

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
  const [showModal, setShowModal] = useState(false);
  const [editingProspect, setEditingProspect] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Tri
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');

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

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredAndSortedProspects = useMemo(() => {
    // Filtrage
    let filtered = [...prospects];

    // Filtrer par recherche
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        `${p.first_name} ${p.last_name}`.toLowerCase().includes(query) ||
        p.company?.toLowerCase().includes(query) ||
        p.email?.toLowerCase().includes(query) ||
        p.phone?.includes(query)
      );
    }

    // Filtrer par statut
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter);
    }

    // Tri
    const sorted = filtered.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // Gestion des cas spéciaux
      if (sortField === 'name') {
        aValue = `${a.first_name} ${a.last_name}`.toLowerCase();
        bValue = `${b.first_name} ${b.last_name}`.toLowerCase();
      } else if (sortField === 'estimated_budget') {
        aValue = parseFloat(a.estimated_budget) || 0;
        bValue = parseFloat(b.estimated_budget) || 0;
      } else if (sortField === 'created_at') {
        aValue = new Date(a.created_at || 0);
        bValue = new Date(b.created_at || 0);
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [prospects, sortField, sortDirection, searchQuery, statusFilter]);

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

  if (loading) {
    return <Loader fullScreen />;
  }

  return (
    <div className="commercial-page">
      {/* En-tête de la page */}
      <div className="page-header">
        <div className="header-content">
          <h1>Commercial</h1>
          <p className="header-subtitle">
            {prospects.length} prospect{prospects.length > 1 ? 's' : ''} au total
          </p>
        </div>
        <button onClick={handleCreateProspect} className="btn btn-primary">
          <Plus size={20} /> Nouveau prospect
        </button>
      </div>

      {/* Barre de contrôle avec recherche et filtres */}
      <div className="controls-section">
        {/* Barre de recherche */}
        <div className="search-bar">
          <Search size={20} />
          <input
            type="text"
            placeholder="Rechercher un prospect, entreprise, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-search" onClick={() => setSearchQuery('')}>
              <X size={16} />
            </button>
          )}
        </div>

        {/* Filtres par statut */}
        <div className="status-filters">
          <button
            className={`filter-btn ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            Tous
          </button>
          <button
            className={`filter-btn ${statusFilter === 'nouveau' ? 'active' : ''}`}
            onClick={() => setStatusFilter('nouveau')}
          >
            Nouveau
          </button>
          <button
            className={`filter-btn ${statusFilter === 'contacte' ? 'active' : ''}`}
            onClick={() => setStatusFilter('contacte')}
          >
            Contacté
          </button>
          <button
            className={`filter-btn ${statusFilter === 'qualification' ? 'active' : ''}`}
            onClick={() => setStatusFilter('qualification')}
          >
            Qualification
          </button>
          <button
            className={`filter-btn ${statusFilter === 'proposition' ? 'active' : ''}`}
            onClick={() => setStatusFilter('proposition')}
          >
            Proposition
          </button>
          <button
            className={`filter-btn ${statusFilter === 'negociation' ? 'active' : ''}`}
            onClick={() => setStatusFilter('negociation')}
          >
            Négociation
          </button>
          <button
            className={`filter-btn ${statusFilter === 'gagne' ? 'active' : ''}`}
            onClick={() => setStatusFilter('gagne')}
          >
            Gagné
          </button>
          <button
            className={`filter-btn ${statusFilter === 'perdu' ? 'active' : ''}`}
            onClick={() => setStatusFilter('perdu')}
          >
            Perdu
          </button>
        </div>
      </div>

      {/* Tableau des prospects */}
      {filteredAndSortedProspects.length === 0 && prospects.length === 0 ? (
        <div className="empty-state">
          <h3>Aucun prospect</h3>
          <p>Commencez par créer votre premier prospect</p>
          <button onClick={handleCreateProspect} className="btn btn-primary" style={{ marginTop: '16px' }}>
            Créer un prospect
          </button>
        </div>
      ) : filteredAndSortedProspects.length === 0 ? (
        <div className="empty-state">
          <h3>Aucun résultat</h3>
          <p>Aucun prospect ne correspond à vos critères de recherche</p>
        </div>
      ) : (
        <div className="prospects-table-wrapper">
          <table className="prospects-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('name')} className="sortable">
                  <div className="th-content">
                    Nom
                    {sortField === 'name' && (
                      sortDirection === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />
                    )}
                    {sortField !== 'name' && <ArrowUpDown size={16} className="sort-icon-inactive" />}
                  </div>
                </th>
                <th onClick={() => handleSort('company')} className="sortable">
                  <div className="th-content">
                    Entreprise
                    {sortField === 'company' && (
                      sortDirection === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />
                    )}
                    {sortField !== 'company' && <ArrowUpDown size={16} className="sort-icon-inactive" />}
                  </div>
                </th>
                <th>Contact</th>
                <th onClick={() => handleSort('status')} className="sortable">
                  <div className="th-content">
                    Statut
                    {sortField === 'status' && (
                      sortDirection === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />
                    )}
                    {sortField !== 'status' && <ArrowUpDown size={16} className="sort-icon-inactive" />}
                  </div>
                </th>
                <th onClick={() => handleSort('estimated_budget')} className="sortable">
                  <div className="th-content">
                    Budget estimé
                    {sortField === 'estimated_budget' && (
                      sortDirection === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />
                    )}
                    {sortField !== 'estimated_budget' && <ArrowUpDown size={16} className="sort-icon-inactive" />}
                  </div>
                </th>
                <th onClick={() => handleSort('source')} className="sortable">
                  <div className="th-content">
                    Source
                    {sortField === 'source' && (
                      sortDirection === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />
                    )}
                    {sortField !== 'source' && <ArrowUpDown size={16} className="sort-icon-inactive" />}
                  </div>
                </th>
                <th className="actions-column">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedProspects.map((prospect) => (
                <tr key={prospect.id}>
                  <td className="prospect-name">
                    <div className="name-cell">
                      <User size={14} />
                      {prospect.first_name} {prospect.last_name}
                    </div>
                  </td>
                  <td>
                    {prospect.company ? (
                      <div className="company-cell">
                        <Building2 size={14} />
                        {prospect.company}
                      </div>
                    ) : (
                      <span className="no-data">-</span>
                    )}
                  </td>
                  <td>
                    <div className="contact-cell">
                      {prospect.email && (
                        <div className="contact-item">
                          <Mail size={14} />
                          <a href={`mailto:${prospect.email}`}>{prospect.email}</a>
                        </div>
                      )}
                      {prospect.phone && (
                        <div className="contact-item">
                          <Phone size={14} />
                          <a href={`tel:${prospect.phone}`}>{prospect.phone}</a>
                        </div>
                      )}
                      {!prospect.email && !prospect.phone && (
                        <span className="no-data">-</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span
                      className="status-badge"
                      style={{
                        backgroundColor: STATUS_CONFIG[prospect.status]?.color || '#6b7280',
                        color: 'white'
                      }}
                    >
                      {STATUS_CONFIG[prospect.status]?.label || prospect.status}
                    </span>
                  </td>
                  <td>
                    {prospect.estimated_budget ? (
                      <div className="budget-cell">
                        <DollarSign size={14} />
                        {Number(prospect.estimated_budget).toLocaleString('fr-FR')} €
                      </div>
                    ) : (
                      <span className="no-data">-</span>
                    )}
                  </td>
                  <td>
                    <span className="source-badge">
                      {SOURCE_LABELS[prospect.source] || prospect.source}
                    </span>
                  </td>
                  <td className="actions-cell">
                    {prospect.project_id && (
                      <button
                        className="action-btn"
                        onClick={() => navigate(`/projects/${prospect.project_id}`)}
                        title="Voir le projet"
                      >
                        <ExternalLink size={16} />
                      </button>
                    )}
                    <button
                      className="action-btn"
                      onClick={() => handleEditProspect(prospect)}
                      title="Modifier"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      className="action-btn delete"
                      onClick={() => handleDeleteProspect(prospect.id)}
                      title="Supprimer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
