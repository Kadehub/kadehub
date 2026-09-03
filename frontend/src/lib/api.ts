import axios from 'axios';

const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL, timeout: 10000 });

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
    const url = err.config?.url || '';
    const isAuthRoute = url.includes('/auth/');
    const isBillingProfile = url.includes('/billing/profile');
    const isAnnouncements = url.includes('/announcements');
    if (err.response?.status === 401 && !isAuthRoute && !isBillingProfile && !isAnnouncements && typeof window !== 'undefined') {
      localStorage.removeItem('auth-store');
      const dest = window.location.pathname.startsWith('/super-admin')
        ? '/super-admin/login'
        : '/login';
      window.location.href = dest;
    }
    return Promise.reject(err);
  },
);

export default api;
