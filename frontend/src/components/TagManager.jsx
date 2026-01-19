import { useState, useEffect } from 'react';
import { tagsAPI } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { Plus, X, Tag as TagIcon } from 'lucide-react';
import './TagManager.scss';

const PRESET_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
];

const TagManager = ({ projectId, onTagsChange }) => {
  const toast = useToast();
  const [allTags, setAllTags] = useState([]);
  const [projectTags, setProjectTags] = useState([]);
  const [showCreateTag, setShowCreateTag] = useState(false);
  const [newTag, setNewTag] = useState({ name: '', color: PRESET_COLORS[0] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [allTagsRes, projectTagsRes] = await Promise.all([
        tagsAPI.getAll(),
        projectId ? tagsAPI.getByProject(projectId) : Promise.resolve({ data: [] })
      ]);
      setAllTags(allTagsRes.data);
      setProjectTags(projectTagsRes.data);
      if (onTagsChange) onTagsChange(projectTagsRes.data);
    } catch (error) {
      console.error('Erreur chargement tags:', error);
      toast.error('Erreur lors du chargement des tags');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTag = async (e) => {
    e.preventDefault();
    if (!newTag.name.trim()) return;

    try {
      await tagsAPI.create(newTag);
      setNewTag({ name: '', color: PRESET_COLORS[0] });
      setShowCreateTag(false);
      await fetchData();
      toast.success('Tag créé');
    } catch (error) {
      console.error('Erreur création tag:', error);
      toast.error('Erreur lors de la création du tag');
    }
  };

  const handleAddTag = async (tagId) => {
    if (!projectId) return;

    try {
      await tagsAPI.addToProject(projectId, tagId);
      await fetchData();
      toast.success('Tag ajouté au projet');
    } catch (error) {
      console.error('Erreur ajout tag:', error);
      toast.error('Erreur lors de l\'ajout du tag');
    }
  };

  const handleRemoveTag = async (tagId) => {
    if (!projectId) return;

    try {
      await tagsAPI.removeFromProject(projectId, tagId);
      await fetchData();
      toast.success('Tag retiré du projet');
    } catch (error) {
      console.error('Erreur retrait tag:', error);
      toast.error('Erreur lors du retrait du tag');
    }
  };

  const isTagInProject = (tagId) => {
    return projectTags.some(t => t.id === tagId);
  };

  if (loading) {
    return <div className="tag-manager loading">Chargement des tags...</div>;
  }

  return (
    <div className="tag-manager">
      <div className="tag-manager-header">
        <h3>
          <TagIcon size={18} />
          Tags
        </h3>
        <button
          className="btn-create-tag"
          onClick={() => setShowCreateTag(!showCreateTag)}
        >
          <Plus size={16} />
          {showCreateTag ? 'Annuler' : 'Créer un tag'}
        </button>
      </div>

      {showCreateTag && (
        <form onSubmit={handleCreateTag} className="create-tag-form">
          <input
            type="text"
            placeholder="Nom du tag..."
            value={newTag.name}
            onChange={(e) => setNewTag({ ...newTag, name: e.target.value })}
            required
          />
          <div className="color-picker">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className={`color-option ${newTag.color === color ? 'active' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => setNewTag({ ...newTag, color })}
              />
            ))}
          </div>
          <button type="submit" className="btn btn-primary btn-small">
            Créer
          </button>
        </form>
      )}

      {projectId && (
        <div className="project-tags">
          <h4>Tags du projet</h4>
          <div className="tags-list">
            {projectTags.length === 0 ? (
              <p className="empty-state">Aucun tag sur ce projet</p>
            ) : (
              projectTags.map((tag) => (
                <span
                  key={tag.id}
                  className="tag"
                  style={{ backgroundColor: tag.color }}
                >
                  {tag.name}
                  <button
                    className="tag-remove"
                    onClick={() => handleRemoveTag(tag.id)}
                  >
                    <X size={14} />
                  </button>
                </span>
              ))
            )}
          </div>
        </div>
      )}

      <div className="available-tags">
        <h4>Tags disponibles</h4>
        <div className="tags-list">
          {allTags.length === 0 ? (
            <p className="empty-state">Créez votre premier tag</p>
          ) : (
            allTags
              .filter(tag => !isTagInProject(tag.id))
              .map((tag) => (
                <span
                  key={tag.id}
                  className="tag clickable"
                  style={{ backgroundColor: tag.color }}
                  onClick={() => projectId && handleAddTag(tag.id)}
                >
                  {tag.name}
                  {projectId && <Plus size={14} />}
                </span>
              ))
          )}
        </div>
      </div>
    </div>
  );
};

export default TagManager;
