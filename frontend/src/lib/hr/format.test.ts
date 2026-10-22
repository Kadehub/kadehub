import { describe, expect, it } from 'vitest';
import { addMonths, formatMinutes, formatShift, initials, shiftMinutes, weekStart, whatsappLink } from './format';
import { apiCode, apiError } from './api';
import { translate } from './i18n';

describe('Staff date and time helpers', () => {
  it('starts weeks on Monday', () => {
    expect(weekStart('2026-10-22')).toBe('2026-10-19');
    expect(weekStart('2026-10-25')).toBe('2026-10-19');
    expect(weekStart('2026-10-26')).toBe('2026-10-26');
  });

  it('moves between months across the year end', () => {
    expect(addMonths('2026-12', 1)).toBe('2027-01');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
  });

  it('measures shifts, including ones past midnight (same rule as the backend)', () => {
    expect(shiftMinutes('08:00', '17:00', 60)).toBe(480);
    expect(shiftMinutes('22:00', '06:00', 30)).toBe(450);
    expect(formatShift('08:00', '17:30')).toBe('8:00 AM – 5:30 PM');
    expect(formatMinutes(135)).toBe('2h 15m');
    expect(formatMinutes(45)).toBe('45m');
  });

  it('builds WhatsApp links with the country code for local numbers', () => {
    expect(whatsappLink('077 123 4567', 'Hi')).toBe('https://wa.me/94771234567?text=Hi');
    expect(whatsappLink('+94771234567', 'a b')).toBe('https://wa.me/94771234567?text=a%20b');
  });

  it('makes initials', () => {
    expect(initials('Nimal Perera')).toBe('NP');
    expect(initials('')).toBe('?');
  });
});

describe('apiError', () => {
  const t = (key: Parameters<typeof translate>[1], vars?: Record<string, string | number>) => translate('en', key, vars);
  const res = (status: number, data: unknown) => ({ response: { status, data } });

  it('translates stable codes with their values', () => {
    expect(apiError(res(403, { code: 'PLAN_LIMIT_EMPLOYEES', limit: 3, message: 'PLAN_LIMIT_EMPLOYEES' }), t))
      .toBe('Your plan allows 3 active staff. Upgrade to add more.');
    expect(apiError(res(400, { message: 'PIN_WRONG' }), t)).toBe('Wrong PIN. Try again.');
    expect(apiCode(res(409, { code: 'RUN_EXISTS', run_id: 4 }))).toBe('RUN_EXISTS');
  });

  it('shows validation sentences as they are and falls back for the rest', () => {
    expect(apiError(res(400, { message: ['full_name should not be empty'] }), t)).toBe('full_name should not be empty');
    expect(apiError(res(500, { message: 'Internal server error' }), t)).toBe('Something went wrong. Please try again.');
    expect(apiError(new Error('offline'), t)).toBe('Can’t reach KadeHub. Check your connection.');
  });

  it('falls back to English when a Sinhala string is missing', () => {
    expect(translate('si', 'common.save')).toBe('සුරකින්න');
    expect(translate('si', 'app.trialEndsIn', { n: 3 })).toContain('3');
  });
});
