'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowRight, Check, X } from 'lucide-react';
import api from '../../../lib/api';
import { apiError } from '../../../lib/hr/api';
import { useHrT } from '../../../lib/hr/i18n';
import { formatDate, formatDayShort, formatShift } from '../../../lib/hr/format';
import type { RosterEntry, ShiftSwap } from '../../../lib/hr/types';
import { useHr } from '../HrContext';
import { Button, Card, EmptyState, LoadError, Loading, Pill } from '../ui';
import { SWAP_STATUS, useApi } from './shared';

function ShiftLine({ e }: { e: RosterEntry }) {
  return <span className="whitespace-nowrap">{formatDayShort(e.work_date)} {formatDate(e.work_date, true)} · {formatShift(e.start_time, e.end_time)}</span>;
}

/** Swap requests for one branch: waiting ones first with approve / reject, then the last few decided. */
export default function SwapsPanel({ branchId, onChanged }: { branchId: number; onChanged: () => void }) {
  const { t } = useHrT();
  const { branchName } = useHr();
  const { data, error, reload } = useApi<ShiftSwap[]>('/hr/swaps');
  const [busy, setBusy] = useState<number | null>(null);

  async function decide(s: ShiftSwap, approve: boolean) {
    setBusy(s.id);
    try {
      await api.post(`/hr/swaps/${s.id}/${approve ? 'approve' : 'reject'}`);
      toast.success(approve ? t('ros.swap.approvedToast') : t('ros.swap.rejectedToast'));
      reload();
      onChanged();
    } catch (err) {
      toast.error(apiError(err, t));
    } finally {
      setBusy(null);
    }
  }

  if (error) return <LoadError onRetry={reload} />;
  if (!data) return <Loading />;
  const mine = data.filter(s => s.entry?.branch_id === branchId || s.target_entry?.branch_id === branchId);
  const open = mine.filter(s => s.status === 'pending_colleague' || s.status === 'pending_manager');
  const done = mine.filter(s => !open.includes(s)).slice(0, 20);

  const row = (s: ShiftSwap) => {
    const st = SWAP_STATUS[s.status];
    const pending = open.includes(s);
    return (
      <li key={s.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1 text-sm">
          <p className="flex flex-wrap items-center gap-1.5 font-semibold text-ink-800">
            {s.requester_name} <ArrowRight size={14} className="text-ink-400" /> {s.target_name}
            <Pill tone={st.tone}>{t(st.key)}</Pill>
          </p>
          <p className="mt-0.5 text-xs text-ink-500">
            {s.entry && <ShiftLine e={s.entry} />}
            {s.target_entry && <> ⇄ <ShiftLine e={s.target_entry} /></>}
            {!s.target_entry && ` · ${t('ros.swap.giveAwayShort')}`}
            {s.entry && s.entry.branch_id !== branchId && ` · ${branchName(s.entry.branch_id)}`}
          </p>
          {s.reason && <p className="mt-0.5 text-xs italic text-ink-400">“{s.reason}”</p>}
        </div>
        {pending && (
          <div className="flex shrink-0 gap-2">
            <Button size="sm" variant="outline" disabled={busy === s.id} onClick={() => decide(s, false)}><X /> {t('common.reject')}</Button>
            <Button size="sm" disabled={busy === s.id} onClick={() => decide(s, true)}><Check /> {t('common.approve')}</Button>
          </div>
        )}
      </li>
    );
  };

  return (
    <div className="space-y-4">
      <Card title={t('ros.swap.waiting')} bodyClassName="p-0">
        {open.length
          ? <ul className="divide-y divide-ink-100">{open.map(row)}</ul>
          : <EmptyState scene="relax" title={t('ros.swap.noneWaiting')} description={t('ros.swap.noneWaitingBody')} />}
      </Card>
      {done.length > 0 && (
        <Card title={t('ros.swap.history')} bodyClassName="p-0">
          <ul className="divide-y divide-ink-100">{done.map(row)}</ul>
        </Card>
      )}
    </div>
  );
}
