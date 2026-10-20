'use client';
import { useEffect } from 'react';
import { useAuthHydrated, useAuthStore } from '../../hooks/useAuth';

/** For pages that need a signed-in user: sends anyone else to the shared /login page. */
export function useRequireLogin() {
  const hydrated = useAuthHydrated();
  const token = useAuthStore(s => s.token);
  const user = useAuthStore(s => s.user);
  useEffect(() => {
    if (hydrated && !token) window.location.href = '/login';
  }, [hydrated, token]);
  return { ready: hydrated && !!token, user };
}

/** Signed-in state for public pages, without redirecting. */
export function useViewer() {
  const hydrated = useAuthHydrated();
  const token = useAuthStore(s => s.token);
  const user = useAuthStore(s => s.user);
  return { hydrated, signedIn: hydrated && !!token, user };
}
