import axios from 'axios';

export const API_BASE_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 65000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('researchx_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.error ||
      error.message ||
      'A network error occurred while communicating with RESEARCHX AI.';
    error.friendlyMessage = message;
    return Promise.reject(error);
  }
);

export default api;
