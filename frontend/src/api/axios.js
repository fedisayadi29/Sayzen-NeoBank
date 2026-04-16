import axios from 'axios';

const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const api = axios.create({ baseURL: apiUrl });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sayzen_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('sayzen_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
