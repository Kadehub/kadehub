import { readCookie, writeCookie } from './session';

export type ConsentChoice = 'granted' | 'denied';

/** On the parent domain, so a choice made on kadehub.com also holds on cod.kadehub.com and the rest. */
const CONSENT_COOKIE = 'kh_consent';
const CONSENT_MAX_AGE = 180 * 24 * 60 * 60;

/** Advertising cookies need a prior yes in the EU, the rest of the EEA, the UK and Switzerland. */
const OPT_IN_COUNTRIES = new Set([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
  'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'IS', 'LI', 'NO', 'GB', 'CH',
]);

/**
 * From Cloudflare's CF-IPCountry header. A location we can't tell (no header, XX unknown, T1 Tor) gets the
 * stricter opt-in, so a Cloudflare or proxy change can cost page views but can't start tracking without consent.
 */
export function requiresOptIn(country: string | null | undefined): boolean {
  const code = (country || '').trim().toUpperCase();
  if (!code || code === 'XX' || code === 'T1') return true;
  return OPT_IN_COUNTRIES.has(code);
}

export function readConsent(): ConsentChoice | null {
  const value = readCookie(CONSENT_COOKIE);
  return value === 'granted' || value === 'denied' ? value : null;
}

export function saveConsent(choice: ConsentChoice): void {
  writeCookie(CONSENT_COOKIE, choice, CONSENT_MAX_AGE);
}
