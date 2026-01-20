import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Intercepteur pour ajouter le token à chaque requête
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercepteur pour gérer les erreurs d'authentification
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data)
};

// Projects
export const projectsAPI = {
  getAll: () => api.get('/projects'),
  getOne: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.put(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`)
};

// Tasks
export const tasksAPI = {
  getByProject: (projectId) => api.get(`/tasks/project/${projectId}`),
  create: (data) => api.post('/tasks', data),
  update: (id, data) => api.put(`/tasks/${id}`, data),
  delete: (id) => api.delete(`/tasks/${id}`)
};

// Notes
export const notesAPI = {
  getByProject: (projectId) => api.get(`/notes/project/${projectId}`),
  create: (data) => api.post('/notes', data),
  update: (id, data) => api.put(`/notes/${id}`, data),
  delete: (id) => api.delete(`/notes/${id}`)
};

// Tags
export const tagsAPI = {
  getAll: () => api.get('/tags'),
  getByProject: (projectId) => api.get(`/tags/project/${projectId}`),
  create: (data) => api.post('/tags', data),
  update: (id, data) => api.put(`/tags/${id}`, data),
  delete: (id) => api.delete(`/tags/${id}`),
  addToProject: (projectId, tagId) => api.post(`/tags/project/${projectId}/tag/${tagId}`),
  removeFromProject: (projectId, tagId) => api.delete(`/tags/project/${projectId}/tag/${tagId}`)
};

// Quick Notes
export const quicknotesAPI = {
  getAll: () => api.get('/quicknotes'),
  create: (data) => api.post('/quicknotes', data),
  update: (id, data) => api.put(`/quicknotes/${id}`, data),
  togglePin: (id) => api.patch(`/quicknotes/${id}/pin`),
  delete: (id) => api.delete(`/quicknotes/${id}`)
};

export default api;