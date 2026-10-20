/**
 * On-screen keypad reducer. The amount is kept as the typed string ("1250.5") so "0." and "12." can be shown
 * while typing. Rules: no leading zeros, one dot, at most 2 decimals, at most 9 integer digits.
 */
export type KeypadKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '.' | 'back' | 'clear';

export const MAX_INT_DIGITS = 9;
export const MAX_DECIMALS = 2;

export function pushKey(value: string, key: KeypadKey): string {
  if (key === 'clear') return '';
  if (key === 'back') return value.slice(0, -1);
  if (key === '.') {
    if (value.includes('.')) return value;
    return value === '' ? '0.' : `${value}.`;
  }
  // digit
  const [int, dec] = value.split('.');
  if (dec !== undefined) {
    if (dec.length >= MAX_DECIMALS) return value;
    return `${value}${key}`;
  }
  if (int === '0') return key; // replace a lone leading zero
  if (int.length >= MAX_INT_DIGITS) return value;
  return `${value}${key}`;
}

/** Numeric value of the typed string (0 when empty or just "."). */
export function keypadValue(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Map a physical keyboard key to a keypad key; `,` works as the decimal point. */
export function keyFromKeyboard(key: string): KeypadKey | null {
  if (/^[0-9]$/.test(key)) return key as KeypadKey;
  if (key === '.' || key === ',') return '.';
  if (key === 'Backspace') return 'back';
  if (key === 'Delete' || key === 'Escape') return null;
  return null;
}

/** Amount → keypad string (for editing an existing expense). */
export function amountToKeypad(amount: number): string {
  if (!(amount > 0)) return '';
  const fixed = (Math.round(amount * 100) / 100).toFixed(2);
  return fixed.replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
}
