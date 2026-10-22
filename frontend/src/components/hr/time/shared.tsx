'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../../../lib/api';
import type { HrKey } from '../../../lib/hr/i18n';
import type { DayStatus, MonthCode, SwapStatus } from '../../../lib/hr/types';
import type { Tone } from '../ui';

/** GET with loading / error / reload. A null url waits (e.g. until a branch is picked). */
export function useApi<T>(url: string | null, params?: Record<string, string | number | null | undefined>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const key = url ? `${url}?${JSON.stringify(params ?? {})}` : null;
  const seq = useRef(0);

  const reload = useCallback(async () => {
    if (!url) return;
    const mine = ++seq.current;
    setLoading(true);
    setError(false);
    try {
      const clean = Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v !== null && v !== undefined && v !== ''));
      const { data: res } = await api.get<T>(url, { params: clean });
      if (mine === seq.current) setData(res);
    } catch {
      if (mine === seq.current) setError(true);
    } finally {
      if (mine === seq.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => { setData(null); reload(); }, [reload]);
  return { data, error, loading, reload, setData };
}

export const DAY_STATUS: Record<DayStatus, { tone: Tone; key: HrKey }> = {
  present: { tone: 'green', key: 'att.status.present' },
  late: { tone: 'amber', key: 'att.status.late' },
  absent: { tone: 'red', key: 'att.status.absent' },
  not_in: { tone: 'amber', key: 'att.status.not_in' },
  leave: { tone: 'violet', key: 'att.status.leave' },
  holiday: { tone: 'blue', key: 'att.status.holiday' },
  off: { tone: 'gray', key: 'att.status.off' },
  upcoming: { tone: 'gray', key: 'att.status.upcoming' },
};

export const MONTH_CODE: Record<MonthCode, { cls: string; key: HrKey }> = {
  P: { cls: 'bg-emerald-100 text-emerald-800', key: 'att.code.P' },
  L: { cls: 'bg-amber-100 text-amber-800', key: 'att.code.L' },
  A: { cls: 'bg-red-100 text-red-700', key: 'att.code.A' },
  V: { cls: 'bg-violet-100 text-violet-800', key: 'att.code.V' },
  H: { cls: 'bg-sky-100 text-sky-800', key: 'att.code.H' },
  O: { cls: 'bg-ink-50 text-ink-400', key: 'att.code.O' },
  '-': { cls: 'bg-white text-ink-300', key: 'att.code.-' },
};

export const SWAP_STATUS: Record<SwapStatus, { tone: Tone; key: HrKey }> = {
  pending_colleague: { tone: 'amber', key: 'ros.swap.status.pending_colleague' },
  pending_manager: { tone: 'blue', key: 'ros.swap.status.pending_manager' },
  approved: { tone: 'green', key: 'ros.swap.status.approved' },
  rejected: { tone: 'red', key: 'ros.swap.status.rejected' },
  cancelled: { tone: 'gray', key: 'ros.swap.status.cancelled' },
};

/** Days of the week starting Monday (1…6, 0), for checkbox pickers. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

/** First and last day of a "YYYY-MM" month. */
export function periodRangeOf(period: string): { from: string; to: string } {
  const [y, m] = period.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${period}-01`, to: `${period}-${String(last).padStart(2, '0')}` };
}
