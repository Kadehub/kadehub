'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Briefcase, Plus, User } from 'lucide-react';
import { MascotState } from '../../../components/brand/Mascot';
import { codHref } from '../../../components/cod/bits';
import { Button, PageHeader, cn } from '../../../components/cod/ui';
import ExpenseSheet, { type SheetState } from '../../../components/cod/expenses-sheet';
import BusinessExpenses from '../../../components/cod/expenses-business';
import PersonalExpenses from '../../../components/cod/expenses-personal';
import api from '../../../lib/api';
import { useT } from '../../../lib/cod/i18n/client';
import { useCodCan } from '../../../lib/cod/capabilities';
import { formatLKR } from '../../../lib/cod/format';
import { inRange, periodRange } from '../../../lib/cod/expenses/dates';
import { sumAmounts } from '../../../lib/cod/expenses/stats';
import type { BusinessExpense, PersonalExpense } from '../../../lib/cod/expenses/types';

type Tab = 'business' | 'personal';

// cod.kadehub.com/expenses — one page, Business | Personal (personal only for the account owner)
export default function CodExpensesPage() {
  const t = useT();
  const router = useRouter();
  const can = useCodCan();
  const canBusiness = can('expenses');
  const canPersonal = can('personal_finance');

  const [tab, setTab] = useState<Tab>('business');
  const [business, setBusiness] = useState<BusinessExpense[] | null>(null);
  const [personal, setPersonal] = useState<PersonalExpense[] | null>(null);
  const [budget, setBudget] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const [sheet, setSheet] = useState<SheetState | null>(null);

  // Not allowed here at all → back to orders
  useEffect(() => { if (!canBusiness) router.replace(codHref('/orders')); }, [canBusiness, router]);

  // ?tab=personal (kept in the URL with replaceState, no server round-trip)
  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get('tab');
    if (wanted === 'personal' && canPersonal) setTab('personal');
  }, [canPersonal]);
  const switchTab = (next: Tab) => {
    setTab(next);
    const url = new URL(window.location.href);
    if (next === 'personal') url.searchParams.set('tab', 'personal'); else url.searchParams.delete('tab');
    window.history.replaceState(window.history.state, '', url.toString());
  };

  const load = useCallback(async () => {
    setFailed(false);
    try {
      const [b, p, s] = await Promise.all([
        api.get<BusinessExpense[]>('/cod/expenses'),
        canPersonal ? api.get<PersonalExpense[]>('/cod/personal-expenses') : Promise.resolve({ data: null }),
        canPersonal ? api.get<{ monthly_budget: number | null }>('/cod/personal-settings') : Promise.resolve({ data: null }),
      ]);
      setBusiness(b.data.map(r => ({ ...r, amount: Number(r.amount) })));
      if (p.data) setPersonal(p.data.map(r => ({ ...r, amount: Number(r.amount) })));
      if (s.data) setBudget(s.data.monthly_budget);
    } catch {
      setFailed(true);
    }
  }, [canPersonal]);
  useEffect(() => { if (canBusiness) load(); }, [canBusiness, load]);

  const month = useMemo(() => periodRange('this_month'), []);
  const businessMonth = useMemo(() => sumAmounts((business ?? []).filter(r => inRange(r.expense_date, month))), [business, month]);
  const personalMonth = useMemo(() => sumAmounts((personal ?? []).filter(r => inRange(r.expense_date, month))), [personal, month]);

  if (!canBusiness) return null;
  if (failed) {
    return <MascotState variant="error" title={t('app.loadErrorTitle')} description={t('app.loadErrorBody')}
      action={<Button onClick={load}>{t('common.retry')}</Button>} />;
  }
  if (!business || (canPersonal && !personal)) return <MascotState variant="loading" size="sm" title={t('app.loading')} />;

  const active: Tab = tab === 'personal' && canPersonal ? 'personal' : 'business';
  const openAdd = (category?: string) => setSheet({ kind: active, category });
  const addLabel = active === 'business' ? t('xp.addBusiness') : t('xp.addPersonal');

  return (
    <div className="space-y-4 pb-20 md:pb-0">
      <PageHeader title={t('nav.expenses')}
        actions={<Button onClick={() => openAdd()} className="hidden md:inline-flex"><Plus /> {addLabel}</Button>} />

      {canPersonal && (
        <div role="tablist" aria-label={t('nav.expenses')} className="grid grid-cols-2 gap-1 rounded-2xl bg-ink-100 p-1">
          {([
            { key: 'business', label: t('xp.business'), total: businessMonth, Icon: Briefcase },
            { key: 'personal', label: t('xp.personal'), total: personalMonth, Icon: User },
          ] as const).map(({ key, label, total, Icon }) => (
            <button key={key} type="button" role="tab" aria-selected={active === key} onClick={() => switchTab(key)}
              className={cn('flex min-h-[56px] flex-col items-center justify-center rounded-xl px-2 py-2 transition-colors',
                active === key ? 'bg-white shadow-sm' : 'text-ink-500 hover:text-ink-800')}>
              <span className="flex items-center gap-1.5 text-sm font-bold"><Icon size={15} /> {label}</span>
              <span className="text-xs tabular-nums text-ink-500">{t('xp.thisMonth')}: {formatLKR(total)}</span>
            </button>
          ))}
        </div>
      )}

      {active === 'business'
        ? <BusinessExpenses rows={business} onAdd={openAdd} onEdit={row => setSheet({ kind: 'business', editing: row })} onChanged={load} />
        : <PersonalExpenses rows={personal!} budget={budget} onAdd={openAdd} onEdit={row => setSheet({ kind: 'personal', editing: row })}
            onChanged={load} onBudgetChanged={setBudget} />}

      {/* Phones: floating add button above the bottom nav and the safe area */}
      <button type="button" onClick={() => openAdd()} aria-label={addLabel}
        className="fixed right-4 z-30 inline-flex min-h-[48px] items-center gap-1.5 rounded-full bg-[color:var(--cod-primary)] px-5 text-sm font-bold text-[color:var(--cod-primary-fg)] shadow-lg md:hidden"
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 5rem)' }}>
        <Plus size={18} /> {active === 'business' ? t('xp.fabBusiness') : t('xp.fabPersonal')}
      </button>

      <ExpenseSheet state={sheet} onClose={() => setSheet(null)} onChanged={load}
        history={(sheet?.kind ?? active) === 'business' ? business : personal ?? []} />
    </div>
  );
}
