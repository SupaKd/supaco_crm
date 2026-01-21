import { useState, useEffect } from 'react';
import { prospectsAPI } from '../services/api';
import Modal from './Modal';
import { Phone, Mail, MessageSquare, Calendar, Video, FileText, Plus } from 'lucide-react';
import './ProspectModal.scss';

const INTERACTION_TYPES = [
  { id: 'appel', label: 'Appel', icon: Phone },
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'reunion', label: 'Réunion', icon: Video },
  { id: 'note', label: 'Note', icon: FileText }
];

const ProspectModal = ({ prospect, onClose, onSave }) => {
  const [activeTab, setActiveTab] = useState('infos');
  const [saving, setSaving] = useState(false);
  const [interactions, setInteractions] = useState([]);
  const [loadingInteractions, setLoadingInteractions] = useState(false);
  const [newInteraction, setNewInteraction] = useState({ type: 'note', content: '' });

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    company: '',
    source: 'autre',
    estimated_budget: '',
    needs: '',
    notes: ''
  });

  useEffect(() => {
    if (prospect) {
      setFormData({
        first_name: prospect.first_name || '',
        last_name: prospect.last_name || '',
        email: prospect.email || '',
        phone: prospect.phone || '',
        company: prospect.company || '',
        source: prospect.source || 'autre',
        estimated_budget: prospect.estimated_budget || '',
        needs: prospect.needs || '',
        notes: prospect.notes || ''
      });
      fetchInteractions();
    }
  }, [prospect]);

  const fetchInteractions = async () => {
    if (!prospect?.id) return;

    try {
      setLoadingInteractions(true);
      const response = await prospectsAPI.getInteractions(prospect.id);
      setInteractions(response.data);
    } catch (error) {
      console.error('Erreur chargement interactions:', error);
    } finally {
      setLoadingInteractions(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      return;
    }

    setSaving(true);
    try {
      await onSave({
        ...formData,
        estimated_budget: formData.estimated_budget ? parseFloat(formData.estimated_budget) : null
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddInteraction = async () => {
    if (!newInteraction.content.trim() || !prospect?.id) return;

    try {
      await prospectsAPI.addInteraction(prospect.id, newInteraction);
      setNewInteraction({ type: 'note', content: '' });
      await fetchInteractions();
    } catch (error) {
      console.error('Erreur ajout interaction:', error);
    }
  };

  const getInteractionIcon = (type) => {
    const found = INTERACTION_TYPES.find(t => t.id === type);
    return found ? found.icon : FileText;
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={prospect ? 'Modifier le prospect' : 'Nouveau prospect'}
      footer={
        <>
          <button onClick={onClose} className="btn btn-secondary">
            Annuler
          </button>
          <button onClick={handleSubmit} className="btn btn-primary" disabled={saving}>
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </>
      }
    >
      <div className="prospect-modal-content">
        {prospect && (
          <div className="modal-tabs">
            <button
              className={activeTab === 'infos' ? 'tab active' : 'tab'}
              onClick={() => setActiveTab('infos')}
            >
              Informations
            </button>
            <button
              className={activeTab === 'historique' ? 'tab active' : 'tab'}
              onClick={() => setActiveTab('historique')}
            >
              Historique ({interactions.length})
            </button>
          </div>
        )}

        {activeTab === 'infos' && (
          <form className="prospect-form">
            <div className="form-row">
              <div className="form-group">
                <label>Prénom *</label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Nom *</label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label>Téléphone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Entreprise</label>
                <input
                  type="text"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label>Source</label>
                <select name="source" value={formData.source} onChange={handleChange}>
                  <option value="site_web">Site web</option>
                  <option value="recommandation">Recommandation</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="salon">Salon</option>
                  <option value="autre">Autre</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Budget estimé (€)</label>
              <input
                type="number"
                name="estimated_budget"
                value={formData.estimated_budget}
                onChange={handleChange}
                step="0.01"
              />
            </div>

            <div className="form-group">
              <label>Besoins / Description du projet</label>
              <textarea
                name="needs"
                value={formData.needs}
                onChange={handleChange}
                rows="3"
                placeholder="Décrivez les besoins du prospect..."
              />
            </div>

            <div className="form-group">
              <label>Notes internes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows="2"
                placeholder="Notes personnelles..."
              />
            </div>
          </form>
        )}

        {activeTab === 'historique' && (
          <div className="interactions-section">
            <div className="add-interaction">
              <div className="interaction-type-select">
                {INTERACTION_TYPES.map(type => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.id}
                      className={`type-btn ${newInteraction.type === type.id ? 'active' : ''}`}
                      onClick={() => setNewInteraction(prev => ({ ...prev, type: type.id }))}
                      type="button"
                    >
                      <Icon size={16} />
                      <span>{type.label}</span>
                    </button>
                  );
                })}
              </div>
              <textarea
                placeholder="Ajouter une note, un résumé d'appel..."
                value={newInteraction.content}
                onChange={(e) => setNewInteraction(prev => ({ ...prev, content: e.target.value }))}
                rows="2"
              />
              <button
                className="btn btn-primary btn-sm"
                onClick={handleAddInteraction}
                disabled={!newInteraction.content.trim()}
              >
                <Plus size={16} /> Ajouter
              </button>
            </div>

            <div className="interactions-list">
              {loadingInteractions ? (
                <p className="loading">Chargement...</p>
              ) : interactions.length === 0 ? (
                <p className="empty">Aucune interaction enregistrée</p>
              ) : (
                interactions.map(interaction => {
                  const Icon = getInteractionIcon(interaction.type);
                  return (
                    <div key={interaction.id} className="interaction-item">
                      <div className="interaction-icon">
                        <Icon size={16} />
                      </div>
                      <div className="interaction-content">
                        <div className="interaction-header">
                          <span className="interaction-type">
                            {INTERACTION_TYPES.find(t => t.id === interaction.type)?.label || interaction.type}
                          </span>
                          <span className="interaction-date">
                            {new Date(interaction.created_at).toLocaleDateString('fr-FR')} à{' '}
                            {new Date(interaction.created_at).toLocaleTimeString('fr-FR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <p>{interaction.content}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ProspectModal;
