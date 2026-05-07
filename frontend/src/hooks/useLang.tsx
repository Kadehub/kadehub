'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { Locale, TranslationKey, translations } from '../lib/i18n';

interface LangContextType {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: TranslationKey) => string;
}

const LangContext = createContext<LangContextType>({
  locale: 'en',
  setLocale: () => {},
  t: (key) => key,
});

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');

  useEffect(() => {
    const saved = localStorage.getItem('kh_locale') as Locale | null;
    if (saved === 'en' || saved === 'si') setLocaleState(saved);
  }, []);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    localStorage.setItem('kh_locale', l);
  };

  const t = (key: TranslationKey): string => translations[locale][key] ?? translations['en'][key] ?? key;

  return <LangContext.Provider value={{ locale, setLocale, t }}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);
