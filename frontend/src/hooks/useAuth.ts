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
  const [hydrated, setHydrated] = useState(useAuthStore.persist.hasHydrated());
  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true));
    setHydrated(useAuthStore.persist.hasHydrated());
    return unsub;
  }, []);
  return hydrated;
}
