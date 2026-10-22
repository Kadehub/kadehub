'use client';
import { useCallback } from 'react';
import { useLang } from '../../../hooks/useLang';
import { core } from './core';
import { people } from './people';
import { time } from './time';
import { payroll } from './payroll';
import { talent } from './talent';
import { site } from './site';

/**
 * KadeHub Staff strings, split by area so each part of the app owns its own file.
 * The locale comes from the shared useLang() switcher (en / si); missing si strings fall back to English.
 */
const en = { ...core.en, ...people.en, ...time.en, ...payroll.en, ...talent.en, ...site.en };
export type HrKey = keyof typeof en;
const si: Partial<Record<HrKey, string>> = { ...core.si, ...people.si, ...time.si, ...payroll.si, ...talent.si, ...site.si };

export type HrVars = Record<string, string | number>;
export type HrT = (key: HrKey, vars?: HrVars) => string;

export function translate(locale: string, key: HrKey, vars?: HrVars): string {
  const text = (locale === 'si' ? si[key] : undefined) ?? en[key] ?? key;
  return vars ? text.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : text;
}

/** True when a string is a translation key (API error codes are looked up as err.<CODE>). */
export function hasKey(key: string): key is HrKey {
  return key in en;
}

export function useHrT() {
  const { locale } = useLang();
  const t = useCallback<HrT>((key, vars) => translate(locale, key, vars), [locale]);
  return { t, locale };
}
