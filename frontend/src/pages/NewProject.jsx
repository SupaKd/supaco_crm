import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectsAPI } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { ArrowLeft, Save } from 'lucide-react';
import './NewProject.scss';

const NewProject = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    client_name: '',
    client_email: '',
    client_phone: '',
    website_url: '',
    description: '',
    budget: '',
    status: 'devis',
    deadline: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Préparer les données (convertir les champs vides en null)
      const projectData = {
        ...formData,
        budget: formData.budget ? parseFloat(formData.budget) : null,
        deadline: formData.deadline || null,
        client_email: formData.client_email || null,
        client_phone: formData.client_phone || null,
        website_url: formData.website_url || null,
        description: formData.description || null
      };

      const response = await projectsAPI.create(projectData);
      toast.success('Projet créé avec succès');
      navigate(`/projects/${response.data.id}`);
    } catch (err) {
      console.error('Erreur création projet:', err);
      const errorMsg = err.response?.data?.message || 'Erreur lors de la création du projet';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="new-project-page">
      <div className="page-header">
        <button onClick={() => navigate('/projects')} className="back-btn">
          <ArrowLeft size={20} />
          Retour
        </button>
        <h1>Nouveau Projet</h1>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="project-form">
        <div className="form-section">
          <h2>Informations du projet</h2>

          <div className="form-group">
            <label htmlFor="name">
              Nom du projet <span className="required">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Ex: Site web entreprise ABC"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="status">Statut</label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="devis">Devis</option>
                <option value="en_cours">En cours</option>
                <option value="termine">Terminé</option>
                <option value="annule">Annulé</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="budget">Budget (€)</label>
              <input
                type="number"
                id="budget"
                name="budget"
                value={formData.budget}
                onChange={handleChange}
                placeholder="5000"
                step="0.01"
                min="0"
              />
            </div>

            <div className="form-group">
              <label htmlFor="deadline">Date limite</label>
              <input
                type="date"
                id="deadline"
                name="deadline"
                value={formData.deadline}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="4"
              placeholder="Décrivez brièvement le projet..."
            />
          </div>
        </div>

        <div className="form-section">
          <h2>Informations du client</h2>

          <div className="form-group">
            <label htmlFor="client_name">
              Nom du client <span className="required">*</span>
            </label>
            <input
              type="text"
              id="client_name"
              name="client_name"
              value={formData.client_name}
              onChange={handleChange}
              required
              placeholder="Ex: Jean Dupont"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="client_email">Email</label>
              <input
                type="email"
                id="client_email"
                name="client_email"
                value={formData.client_email}
                onChange={handleChange}
                placeholder="client@example.com"
              />
            </div>

            <div className="form-group">
              <label htmlFor="client_phone">Téléphone</label>
              <input
                type="tel"
                id="client_phone"
                name="client_phone"
                value={formData.client_phone}
                onChange={handleChange}
                placeholder="06 12 34 56 78"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="website_url">URL du site web</label>
            <input
              type="url"
              id="website_url"
              name="website_url"
              value={formData.website_url}
              onChange={handleChange}
              placeholder="https://www.example.com"
            />
          </div>
        </div>

        <div className="form-actions">
          <button
            type="button"
            onClick={() => navigate('/projects')}
            className="btn btn-secondary"
            disabled={loading}
          >
            Annuler
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            <Save size={20} />
            {loading ? 'Création...' : 'Créer le projet'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewProject;
