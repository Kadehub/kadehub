/** Whole rupees: task prices are never fractional. */
export function lkr(amount: number | null | undefined): string {
  return `LKR ${Math.round(Number(amount) || 0).toLocaleString('en-LK')}`;
}

export function timeAgo(iso: string, locale: 'en' | 'si' = 'en'): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const m = Math.floor(diff / 60000);
  const units: Array<[number, string, string]> = [
    [60 * 24 * 30, 'mo', 'මාස'],
    [60 * 24, 'd', 'දින'],
    [60, 'h', 'පැය'],
    [1, 'm', 'මිනි'],
  ];
  for (const [size, en, si] of units) {
    if (m >= size) {
      const n = Math.floor(m / size);
      return locale === 'si' ? `${si} ${n}කට පෙර` : `${n}${en} ago`;
    }
  }
  return locale === 'si' ? 'දැන්' : 'just now';
}

export function fmtDay(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso.length === 10 ? `${iso}T00:00:00` : iso)
    .toLocaleDateString('en-LK', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function apiError(err: any, fallback = 'Something went wrong'): string {
  const msg = err?.response?.data?.message;
  return Array.isArray(msg) ? msg[0] : msg || fallback;
}
