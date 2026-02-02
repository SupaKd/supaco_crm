import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, FileText, CheckSquare, User, StickyNote, Loader } from 'lucide-react';
import axios from 'axios';
import './GlobalSearch.scss';

const GlobalSearch = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const searchRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      // Ctrl+K ou Cmd+K pour ouvrir la recherche
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        setIsOpen(true);
        inputRef.current?.focus();
      }

      // Escape pour fermer
      if (event.key === 'Escape') {
        setIsOpen(false);
        setQuery('');
        setResults(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    const searchTimeout = setTimeout(() => {
      if (query.length >= 2) {
        performSearch();
      } else {
        setResults(null);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [query]);

  const performSearch = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:3001/api/search?q=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setResults(response.data);
      setSelectedIndex(0);
    } catch (error) {
      console.error('Erreur recherche:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResultClick = (type, id) => {
    if (type === 'project') {
      navigate(`/projects/${id}`);
    } else if (type === 'task') {
      navigate(`/projects/${id}`); // id est project_id ici
    }
    setIsOpen(false);
    setQuery('');
    setResults(null);
  };

  const getTotalResults = () => {
    if (!results) return 0;
    return (results.projects?.length || 0) +
           (results.tasks?.length || 0) +
           (results.clients?.length || 0) +
           (results.notes?.length || 0);
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'devis': { label: 'Devis', class: 'devis' },
      'en_cours': { label: 'En cours', class: 'en_cours' },
      'termine': { label: 'Terminé', class: 'termine' },
      'annule': { label: 'Annulé', class: 'annule' },
      'a_faire': { label: 'À faire', class: 'a_faire' }
    };
    const s = statusMap[status] || { label: status, class: 'default' };
    return <span className={`status-badge ${s.class}`}>{s.label}</span>;
  };

  const getPriorityBadge = (priority) => {
    const priorityMap = {
      'basse': { label: 'Basse', class: 'low' },
      'moyenne': { label: 'Moyenne', class: 'medium' },
      'haute': { label: 'Haute', class: 'high' }
    };
    const p = priorityMap[priority] || { label: priority, class: 'default' };
    return <span className={`priority-badge ${p.class}`}>{p.label}</span>;
  };

  return (
    <div className="global-search" ref={searchRef}>
      <div className="search-input-wrapper" onClick={() => setIsOpen(true)}>
        <Search size={18} />
        <input
          ref={inputRef}
          type="text"
          placeholder="Rechercher... (Ctrl+K)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          className="search-input"
        />
        {query && (
          <button className="clear-btn" onClick={() => setQuery('')}>
            <X size={16} />
          </button>
        )}
        {loading && <Loader size={16} className="spinner" />}
      </div>

      {isOpen && results && getTotalResults() > 0 && (
        <div className="search-results">
          {/* Projets */}
          {results.projects && results.projects.length > 0 && (
            <div className="results-section">
              <div className="section-header">
                <FileText size={16} />
                <span>Projets ({results.projects.length})</span>
              </div>
              {results.projects.map((project) => (
                <div
                  key={`project-${project.id}`}
                  className="result-item"
                  onClick={() => handleResultClick('project', project.id)}
                >
                  <div className="result-icon project">
                    <FileText size={16} />
                  </div>
                  <div className="result-content">
                    <div className="result-title">{project.name}</div>
                    <div className="result-meta">
                      {project.client_name && <span>Client: {project.client_name}</span>}
                      {getStatusBadge(project.status)}
                      {project.budget && <span>{project.budget}€</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tâches */}
          {results.tasks && results.tasks.length > 0 && (
            <div className="results-section">
              <div className="section-header">
                <CheckSquare size={16} />
                <span>Tâches ({results.tasks.length})</span>
              </div>
              {results.tasks.map((task) => (
                <div
                  key={`task-${task.id}`}
                  className="result-item"
                  onClick={() => handleResultClick('task', task.project_id)}
                >
                  <div className="result-icon task">
                    <CheckSquare size={16} />
                  </div>
                  <div className="result-content">
                    <div className="result-title">{task.title}</div>
                    <div className="result-meta">
                      <span>Projet: {task.project_name}</span>
                      {getStatusBadge(task.status)}
                      {getPriorityBadge(task.priority)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Clients */}
          {results.clients && results.clients.length > 0 && (
            <div className="results-section">
              <div className="section-header">
                <User size={16} />
                <span>Clients ({results.clients.length})</span>
              </div>
              {results.clients.map((client, index) => (
                <div
                  key={`client-${index}`}
                  className="result-item"
                >
                  <div className="result-icon client">
                    <User size={16} />
                  </div>
                  <div className="result-content">
                    <div className="result-title">{client.client_name}</div>
                    <div className="result-meta">
                      {client.client_email && <span>{client.client_email}</span>}
                      <span>{client.project_count} projet(s)</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Notes */}
          {results.notes && results.notes.length > 0 && (
            <div className="results-section">
              <div className="section-header">
                <StickyNote size={16} />
                <span>Notes ({results.notes.length})</span>
              </div>
              {results.notes.map((note) => (
                <div
                  key={`note-${note.id}`}
                  className="result-item"
                  onClick={() => handleResultClick('project', note.project_id)}
                >
                  <div className="result-icon note">
                    <StickyNote size={16} />
                  </div>
                  <div className="result-content">
                    <div className="result-title">
                      {note.content.substring(0, 60)}
                      {note.content.length > 60 ? '...' : ''}
                    </div>
                    <div className="result-meta">
                      <span>Projet: {note.project_name}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {isOpen && query.length >= 2 && !loading && getTotalResults() === 0 && (
        <div className="search-results">
          <div className="no-results">
            <Search size={48} />
            <p>Aucun résultat pour "{query}"</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;
