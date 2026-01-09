import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
};

// Profile API
export const profileAPI = {
  get: () => api.get('/profiles'),
  save: (profile) => api.post('/profiles', profile),
};

// Clients API
export const clientsAPI = {
  getAll: () => api.get('/clients'),
  create: (client) => api.post('/clients', client),
  update: (id, client) => api.put(`/clients/${id}`, client),
  delete: (id) => api.delete(`/clients/${id}`),
  // Work order helpers
  createWorkOrder: (clientId, wo) => api.post(`/clients/${clientId}/workorders`, wo),
  updateWorkOrder: (clientId, woId, wo) => api.put(`/clients/${clientId}/workorders/${woId}`, wo),
  deleteWorkOrder: (clientId, woId) => api.delete(`/clients/${clientId}/workorders/${woId}`),
};

// Catalog API
export const catalogAPI = {
  getAll: () => api.get('/catalog'),
  create: (item) => api.post('/catalog', item),
  update: (id, item) => api.put(`/catalog/${id}`, item),
  delete: (id) => api.delete(`/catalog/${id}`),
};

// Invoices API
export const invoicesAPI = {
  getAll: () => api.get('/invoices'),
  create: (invoice) => api.post('/invoices', invoice),
  update: (id, invoice) => api.put(`/invoices/${id}`, invoice),
  delete: (id) => api.delete(`/invoices/${id}`),
};

export default api;