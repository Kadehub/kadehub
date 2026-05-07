import axios from 'axios';

const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL });

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('auth-store');
      const token = stored ? JSON.parse(stored)?.state?.token : null;
      if (token) config.headers.Authorization = `Bearer ${token}`;
    } catch {}
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const isAuthRoute = err.config?.url?.includes('/auth/');
    if (err.response?.status === 401 && !isAuthRoute && typeof window !== 'undefined') {
      localStorage.removeItem('auth-store');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

export default api;
