import axios from 'axios';
import { readAuthToken, clearAuthSession } from './session';

const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL, timeout: 10000 });

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = readAuthToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
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
    // Background badge poll on public Tasks pages; an expired session there shouldn't force a login
    const isUnreadPoll = url.includes('/tasks/me/notifications/unread-count');
    if (err.response?.status === 401 && !isAuthRoute && !isBillingProfile && !isAnnouncements && !isUnreadPoll && typeof window !== 'undefined') {
      clearAuthSession();
      const dest = window.location.pathname.startsWith('/super-admin')
        ? '/super-admin/login'
        : '/login';
      window.location.href = dest;
    }
    return Promise.reject(err);
  },
);

export default api;
