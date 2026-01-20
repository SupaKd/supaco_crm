import { useState, useEffect } from 'react';
import { quicknotesAPI } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { Plus, Pin, Trash2, X, Check } from 'lucide-react';
import './QuickNotes.scss';

const COLORS = [
  { name: 'Jaune', value: '#fef3c7' },
  { name: 'Vert', value: '#d1fae5' },
  { name: 'Bleu', value: '#dbeafe' },
  { name: 'Rose', value: '#fce7f3' },
  { name: 'Violet', value: '#ede9fe' },
  { name: 'Orange', value: '#ffedd5' }
];

const QuickNotes = () => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newNote, setNewNote] = useState({ content: '', color: '#fef3c7' });
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const toast = useToast();

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    try {
      const response = await quicknotesAPI.getAll();
      setNotes(response.data);
    } catch (error) {
      console.error('Erreur chargement notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.content.trim()) {
      toast.error('Le contenu ne peut pas être vide');
      return;
    }

    try {
      const response = await quicknotesAPI.create(newNote);
      setNotes([response.data, ...notes]);
      setNewNote({ content: '', color: '#fef3c7' });
      setIsAdding(false);
      toast.success('Note ajoutée');
    } catch (error) {
      toast.error('Erreur lors de l\'ajout');
    }
  };

  const handleUpdateNote = async (id) => {
    if (!editContent.trim()) {
      toast.error('Le contenu ne peut pas être vide');
      return;
    }

    try {
      const response = await quicknotesAPI.update(id, { content: editContent });
      setNotes(notes.map(n => n.id === id ? response.data : n));
      setEditingId(null);
      toast.success('Note mise à jour');
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleTogglePin = async (id) => {
    try {
      const response = await quicknotesAPI.togglePin(id);
      setNotes(notes.map(n => n.id === id ? response.data : n).sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        return new Date(b.updated_at) - new Date(a.updated_at);
      }));
    } catch (error) {
      toast.error('Erreur lors de l\'épinglage');
    }
  };

  const handleDeleteNote = async (id) => {
    try {
      await quicknotesAPI.delete(id);
      setNotes(notes.filter(n => n.id !== id));
      toast.success('Note supprimée');
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const startEditing = (note) => {
    setEditingId(note.id);
    setEditContent(note.content);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditContent('');
  };

  if (loading) {
    return (
      <div className="quicknotes-widget">
        <div className="widget-header">
          <h3>Notes rapides</h3>
        </div>
        <div className="loading-notes">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="quicknotes-widget">
      <div className="widget-header">
        <h3>Notes rapides</h3>
        {!isAdding && (
          <button className="add-btn" onClick={() => setIsAdding(true)}>
            <Plus size={18} />
          </button>
        )}
      </div>

      {isAdding && (
        <div className="new-note-form">
          <textarea
            value={newNote.content}
            onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
            placeholder="Écrivez votre note..."
            autoFocus
          />
          <div className="form-footer">
            <div className="color-picker">
              {COLORS.map(color => (
                <button
                  key={color.value}
                  className={`color-btn ${newNote.color === color.value ? 'active' : ''}`}
                  style={{ backgroundColor: color.value }}
                  onClick={() => setNewNote({ ...newNote, color: color.value })}
                  title={color.name}
                />
              ))}
            </div>
            <div className="form-actions">
              <button className="cancel-btn" onClick={() => setIsAdding(false)}>
                <X size={16} />
              </button>
              <button className="save-btn" onClick={handleAddNote}>
                <Check size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="notes-list">
        {notes.length === 0 && !isAdding ? (
          <p className="empty-notes">Aucune note. Cliquez sur + pour en ajouter une.</p>
        ) : (
          notes.map(note => (
            <div
              key={note.id}
              className={`note-card ${note.is_pinned ? 'pinned' : ''}`}
              style={{ backgroundColor: note.color }}
            >
              {editingId === note.id ? (
                <div className="edit-mode">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    autoFocus
                  />
                  <div className="edit-actions">
                    <button className="cancel-btn" onClick={cancelEditing}>
                      <X size={14} />
                    </button>
                    <button className="save-btn" onClick={() => handleUpdateNote(note.id)}>
                      <Check size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="note-content" onClick={() => startEditing(note)}>
                    {note.content}
                  </div>
                  <div className="note-actions">
                    <button
                      className={`pin-btn ${note.is_pinned ? 'active' : ''}`}
                      onClick={() => handleTogglePin(note.id)}
                      title={note.is_pinned ? 'Désépingler' : 'Épingler'}
                    >
                      <Pin size={14} />
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => handleDeleteNote(note.id)}
                      title="Supprimer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default QuickNotes;
