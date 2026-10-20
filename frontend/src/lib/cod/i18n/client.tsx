'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from './config';
import { MESSAGES } from './messages';
import { createTranslator, type Translator } from './translator';

interface CodI18n {
  t: Translator;
  setLocale: (l: Locale) => void;
}

const I18nContext = createContext<CodI18n | null>(null);

/** COD's own en/si/ta translations. The choice is kept in localStorage and a cookie
 *  (CODPlatform used a server cookie; here everything renders on the client). */
export function CodI18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCALE_COOKIE);
      if (isLocale(saved)) setLocaleState(saved);
    } catch {}
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem(LOCALE_COOKIE, l);
      document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    } catch {}
  }, []);

  const value = useMemo(() => ({ t: createTranslator(locale, MESSAGES[locale]), setLocale }), [locale, setLocale]);
  useEffect(() => { document.documentElement.lang = locale; }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** Translator for COD components. */
export function useT(): Translator {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useT() must be used inside <CodI18nProvider>');
  return ctx.t;
}

export function useSetLocale() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useSetLocale() must be used inside <CodI18nProvider>');
  return ctx.setLocale;
}
