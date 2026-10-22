/** Formatting for KadeHub Staff. Calendar dates are Colombo days ("YYYY-MM-DD"); money is LKR. */

const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const OFFSET_MS = 5.5 * 60 * 60 * 1000;

export function formatLKR(v: number | null | undefined, opts: { decimals?: boolean } = {}): string {
  const n = Number(v ?? 0);
  const decimals = opts.decimals ?? true;
  return `Rs ${n.toLocaleString('en-LK', { minimumFractionDigits: decimals ? 2 : 0, maximumFractionDigits: decimals ? 2 : 0 })}`;
}

export function formatNumber(v: number | null | undefined, maxDecimals = 2): string {
  return Number(v ?? 0).toLocaleString('en-LK', { maximumFractionDigits: maxDecimals });
}

/** Today in Colombo, "YYYY-MM-DD". */
export function today(): string {
  return new Date(Date.now() + OFFSET_MS).toISOString().slice(0, 10);
}

export function thisPeriod(): string {
  return today().slice(0, 7);
}

export function addDays(date: string, n: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
}

export function addMonths(period: string, n: number): string {
  const [y, m] = period.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}

export function weekday(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

/** Monday of the week a date falls in. */
export function weekStart(date: string): string {
  const wd = weekday(date);
  return addDays(date, wd === 0 ? -6 : 1 - wd);
}

/** "12 Mar 2026" (or "12 Mar" with `short`). */
export function formatDate(date: string | null | undefined, short = false): string {
  if (!date) return '—';
  const [y, m, d] = date.slice(0, 10).split('-').map(Number);
  return short ? `${d} ${MONTHS_EN[m - 1]}` : `${d} ${MONTHS_EN[m - 1]} ${y}`;
}

/** "Mon 12" for roster column headers. */
export function formatDayShort(date: string): string {
  return `${DAYS_EN[weekday(date)]} ${Number(date.slice(8, 10))}`;
}

export function dayName(date: string): string {
  return DAYS_EN[weekday(date)];
}

/** "March 2026" from "2026-03". */
export function formatPeriod(period: string): string {
  const [y, m] = period.split('-').map(Number);
  return `${MONTHS_LONG_EN[m - 1]} ${y}`;
}

/** Colombo wall-clock "HH:MM" of an ISO instant. */
export function localTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(new Date(iso).getTime() + OFFSET_MS).toISOString().slice(11, 16);
}

/** "08:00" → "8:00 AM". */
export function formatTime(hhmm: string | null | undefined): string {
  if (!hhmm) return '—';
  const [h, m] = hhmm.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${suffix}`;
}

export function formatShift(start: string, end: string): string {
  return `${formatTime(start)} – ${formatTime(end)}`;
}

/** 135 → "2h 15m". */
export function formatMinutes(min: number | null | undefined): string {
  const v = Math.max(0, Math.round(Number(min ?? 0)));
  const h = Math.floor(v / 60);
  const m = v % 60;
  if (!h) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
}

/** Paid minutes of a shift; an end at or before the start runs past midnight. */
export function shiftMinutes(start: string, end: string, breakMinutes = 0): number {
  const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  let len = toMin(end) - toMin(start);
  if (len <= 0) len += 24 * 60;
  return Math.max(0, len - breakMinutes);
}

export function initials(name: string | null | undefined): string {
  return (name ?? '').trim().split(/\s+/).slice(0, 2).map(s => s[0]?.toUpperCase() ?? '').join('') || '?';
}

/** wa.me link; local numbers (07…) get the 94 country code. */
export function whatsappLink(phone: string | null | undefined, text: string): string {
  const digits = (phone ?? '').replace(/\D/g, '');
  const intl = digits.startsWith('0') ? `94${digits.slice(1)}` : digits;
  return `https://wa.me/${intl}?text=${encodeURIComponent(text)}`;
}

/** Download rows as a CSV that Excel opens directly (UTF-8 with BOM, so Sinhala names survive). */
export function downloadCsv(filename: string, header: string[], rows: Array<Array<string | number | null | undefined>>) {
  const esc = (v: string | number | null | undefined) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [header, ...rows].map(r => r.map(esc).join(',')).join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
