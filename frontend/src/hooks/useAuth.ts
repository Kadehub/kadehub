'use client';
import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types';

interface AuthStore {
  user: User | null;
  token: string | null;
  logoUrl: string | null;
  setAuth: (user: User, token: string) => void;
  setLogoUrl: (url: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      logoUrl: null,
      setAuth: (user, token) => set({ user, token }),
      setLogoUrl: (logoUrl) => set({ logoUrl }),
      logout: () => set({ user: null, token: null, logoUrl: null }),
    }),
    { name: 'auth-store' },
  ),
);

export function useAuthHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const persistApi = useAuthStore.persist;
    if (typeof persistApi?.hasHydrated === 'function' && persistApi.hasHydrated()) {
      setHydrated(true);
      return;
    }
    if (typeof persistApi?.onFinishHydration === 'function') {
      return persistApi.onFinishHydration(() => setHydrated(true));
    }
    setHydrated(true);
  }, []);
  return hydrated;
}
