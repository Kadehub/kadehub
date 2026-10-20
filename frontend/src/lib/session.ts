import type { StateStorage } from 'zustand/middleware';
import { COOKIE_DOMAIN } from './platform';

/**
 * The signed-in session is kept in a cookie scoped to the parent domain so a
 * login on any product subdomain is seen by all of them. localStorage is
 * per-origin, so it can't do that.
 */
const AUTH_COOKIE = 'kh_auth';
const LEGACY_STORAGE_KEY = 'auth-store';
const IMPERSONATION_COOKIE = 'kh_sa_backup';
const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // matches the backend JWT expiry

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.split('; ').find(c => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

function writeCookie(name: string, value: string, maxAge?: number) {
  if (typeof document === 'undefined') return;
  const parts = [`${name}=${encodeURIComponent(value)}`, 'path=/', 'SameSite=Lax'];
  if (COOKIE_DOMAIN) parts.push(`domain=${COOKIE_DOMAIN}`);
  if (window.location.protocol === 'https:') parts.push('Secure');
  if (maxAge !== undefined) parts.push(`max-age=${maxAge}`);
  document.cookie = parts.join('; ');
}

function deleteCookie(name: string) {
  writeCookie(name, '', 0);
}

/** zustand persist storage backed by the shared auth cookie. */
export const authCookieStorage: StateStorage = {
  getItem: () => {
    const value = readCookie(AUTH_COOKIE);
    if (value !== null) return value;
    // One-time move of sessions saved before the cookie existed
    try {
      const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacy) {
        localStorage.removeItem(LEGACY_STORAGE_KEY);
        writeCookie(AUTH_COOKIE, legacy, SESSION_MAX_AGE);
        return legacy;
      }
    } catch {}
    return null;
  },
  setItem: (_name, value) => writeCookie(AUTH_COOKIE, value, SESSION_MAX_AGE),
  removeItem: () => deleteCookie(AUTH_COOKIE),
};

export function readAuthToken(): string | null {
  try {
    const raw = authCookieStorage.getItem(AUTH_COOKIE) as string | null;
    return raw ? JSON.parse(raw)?.state?.token ?? null : null;
  } catch {
    return null;
  }
}

export function clearAuthSession() {
  deleteCookie(AUTH_COOKIE);
  try { localStorage.removeItem(LEGACY_STORAGE_KEY); } catch {}
}

/** Super admin's own session, kept while impersonating a shop (possibly on another subdomain). */
export function saveImpersonationBackup(backup: { token: string | null; user: unknown }) {
  writeCookie(IMPERSONATION_COOKIE, JSON.stringify(backup));
}

export function readImpersonationBackup(): { token: string; user: any } | null {
  try {
    const raw = readCookie(IMPERSONATION_COOKIE);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearImpersonationBackup() {
  deleteCookie(IMPERSONATION_COOKIE);
}
