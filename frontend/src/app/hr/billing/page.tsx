'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Check } from 'lucide-react';
import api from '../../../lib/api';
import { apiError } from '../../../lib/hr/api';
import { useHrT, type HrKey } from '../../../lib/hr/i18n';
import { formatDate, formatLKR } from '../../../lib/hr/format';
import type { HrPlanOffer } from '../../../lib/hr/types';
import { useHr } from '../../../components/hr/HrContext';
import { Badge, Button, Card, Dialog, Field, Loading, PageHeader, TextInput, cn } from '../../../components/hr/ui';
import { OwnerOnly } from '../../../components/hr/people/bits';

interface PaymentOptions {
  bank: { bank_name: string; account_name: string; account_number: string; branch: string; instructions: string };
  onepay_enabled: boolean;
}
type Cycle = 'monthly' | 'yearly';
/** OnePay returns to a shared page, so the reference is kept here and verified on the next visit. */
const ONEPAY_REF_KEY = 'hr_onepay_ref';

function safeGet(key: string) { try { return localStorage.getItem(key); } catch { return null; } }
function safeRemove(key: string) { try { localStorage.removeItem(key); } catch {} }

/** Plan bullets: limits from the plan, two highlights per plan from the dictionary. */
function features(p: HrPlanOffer, t: ReturnType<typeof useHrT>['t']): string[] {
  return [
    p.max_employees === null ? t('bill.staffUnlimited') : t('bill.staffUpTo', { n: p.max_employees }),
    p.max_branches === null ? t('bill.branchesUnlimited') : p.max_branches === 1 ? t('bill.branchOne') : t('bill.branchesUpTo', { n: p.max_branches }),
    t(`bill.feat.${p.key}1` as HrKey),
    t(`bill.feat.${p.key}2` as HrKey),
  ];
}

// staff.kadehub.com/billing — current plan, usage and upgrades through the shared KadeHub checkout
export default function HrBillingPage() {
  const { t } = useHrT();
  const { me, owner, refresh } = useHr();
  const [plans, setPlans] = useState<HrPlanOffer[] | null>(null);
  const [options, setOptions] = useState<PaymentOptions | null>(null);
  const [pendingSlip, setPendingSlip] = useState(false);
  const [cycle, setCycle] = useState<Cycle>('monthly');
  const [checkout, setCheckout] = useState<HrPlanOffer | null>(null);

  const loadPending = () =>
    api.get<{ status: string }[]>('/billing/bank-transfer/mine').then(r => setPendingSlip(r.data.some(x => x.status === 'pending'))).catch(() => {});

  useEffect(() => {
    if (!owner) return;
    api.get<HrPlanOffer[]>('/hr/plans').then(r => setPlans(r.data)).catch(() => setPlans([]));
    api.get<PaymentOptions>('/billing/payment-options').then(r => setOptions(r.data)).catch(() => {});
    loadPending();
    // Coming back from OnePay: confirm the payment, then reload the plan
    const ref = new URLSearchParams(window.location.search).get('ref') || safeGet(ONEPAY_REF_KEY);
    if (ref) {
      api.get<{ status: string }>(`/billing/onepay/verify/${encodeURIComponent(ref)}`)
        .then(r => {
          if (r.data.status === 'completed') { toast.success(t('bill.pay.verified')); refresh(); }
          else toast(t('bill.pay.verifyFailed'));
        })
        .catch(() => toast(t('bill.pay.verifyFailed')))
        .finally(() => safeRemove(ONEPAY_REF_KEY));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [owner]);

  if (!owner) return <OwnerOnly title={t('bill.ownerOnly')} />;

  const plan = me.plan!;
  const sub = me.subscription!;
  const usage = me.usage ?? { employees: 0, branches: 0 };
  const trialLeft = sub.status === 'trialing' && sub.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(sub.trial_ends_at).getTime() - Date.now()) / 86_400_000)) : null;
  const limit = (used: number, max: number | null) => (max === null ? `${used} · ${t('bill.unlimited')}` : `${used} / ${max}`);

  return (
    <div className="space-y-6">
      <PageHeader title={t('nav.billing')} subtitle={t('bill.subtitle')} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={t('bill.currentPlan')}>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-ink-900">{plan.name}</span>
              <Badge tone={sub.status === 'free' ? 'amber' : 'gray'}>{t(`sub.${sub.status}` as HrKey)}</Badge>
            </div>
            {trialLeft !== null && (
              <>
                <p className="text-sm text-ink-500">{trialLeft > 0 ? t('bill.trialLeft', { n: trialLeft }) : t('bill.trialEnded')}</p>
                <p className="text-xs text-ink-400">{t('bill.afterTrial')}</p>
              </>
            )}
            {sub.status === 'active' && sub.current_period_end && <p className="text-sm text-ink-500">{t('bill.paidUntil', { date: formatDate(sub.current_period_end.slice(0, 10)) })}</p>}
            {sub.status === 'free' && <p className="text-sm text-ink-500">{t('bill.freeNote')}</p>}
            {pendingSlip && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">{t('bill.pay.pendingSlip')}</p>}
          </div>
        </Card>
        <Card title={t('bill.usage')}>
          <div className="space-y-3">
            {[
              { label: t('bill.employees'), used: usage.employees, max: plan.max_employees },
              { label: t('bill.branches'), used: usage.branches, max: plan.max_branches },
            ].map(u => (
              <div key={u.label}>
                <div className="flex justify-between text-sm"><span className="text-ink-600">{u.label}</span><span className="font-semibold text-ink-900">{limit(u.used, u.max)}</span></div>
                {u.max !== null && (
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-ink-100">
                    <div className={cn('h-full rounded-full', u.used >= u.max ? 'bg-amber-500' : 'bg-[color:var(--cod-primary)]')}
                      style={{ width: `${Math.min(100, (u.used / Math.max(1, u.max)) * 100)}%` }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold text-ink-900">{t('bill.plans')}</h2>
          <div role="radiogroup" className="inline-flex rounded-xl border border-ink-200 bg-white p-0.5">
            {(['monthly', 'yearly'] as const).map(c => (
              <button key={c} type="button" role="radio" aria-checked={cycle === c} onClick={() => setCycle(c)}
                className={cn('rounded-lg px-3 py-1.5 text-xs font-semibold', cycle === c ? 'bg-[color:var(--cod-primary)] text-[color:var(--cod-primary-fg)]' : 'text-ink-600')}>
                {t(c === 'monthly' ? 'bill.monthly' : 'bill.yearly')}
              </button>
            ))}
          </div>
        </div>
        {plans === null ? <Loading /> : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {plans.map(p => {
              const isCurrent = p.key === plan.key && sub.status !== 'trialing';
              const price = cycle === 'yearly' ? p.yearly_price_lkr : p.monthly_price_lkr;
              const paid = p.monthly_price_lkr > 0;
              // A paid plan can be bought unless it is the one already running (trials can always upgrade)
              const canBuy = paid && p.package_id !== null && !(isCurrent && sub.status === 'active');
              return (
                <section key={p.slug} className={cn('kh-card flex flex-col p-5', isCurrent && 'ring-2 ring-[color:var(--cod-primary)]')}>
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-ink-900">{t(`plan.${p.key}` as HrKey)}</h3>
                    {isCurrent && <Badge tone="brand">{t('bill.current')}</Badge>}
                  </div>
                  <p className="mt-3 text-2xl font-bold text-ink-900">
                    {paid ? formatLKR(price, { decimals: false }) : t('bill.free')}
                    {paid && <span className="text-sm font-normal text-ink-500">{t(cycle === 'yearly' ? 'bill.perYear' : 'bill.perMonth')}</span>}
                  </p>
                  <ul className="mt-3 flex-1 space-y-1.5 text-sm">
                    {features(p, t).map(f => <li key={f} className="flex items-start gap-1.5"><Check size={14} className="mt-0.5 shrink-0 text-emerald-600" />{f}</li>)}
                  </ul>
                  {paid && (
                    <Button className="mt-4 w-full justify-center" disabled={!canBuy || pendingSlip} onClick={() => setCheckout(p)}>
                      {isCurrent ? t('bill.renew') : t('bill.choose')}
                    </Button>
                  )}
                </section>
              );
            })}
          </div>
        )}
        <p className="mt-3 text-xs text-ink-400">{t('bill.note')}</p>
      </div>

      {checkout && (
        <Checkout plan={checkout} cycle={cycle} options={options} onClose={() => setCheckout(null)}
          onSubmitted={() => { setCheckout(null); loadPending(); }} />
      )}
    </div>
  );
}

/** Pay for a Staff package with the platform's bank-transfer slip flow or OnePay. */
function Checkout({ plan, cycle, options, onClose, onSubmitted }: {
  plan: HrPlanOffer; cycle: Cycle; options: PaymentOptions | null; onClose: () => void; onSubmitted: () => void;
}) {
  const { t } = useHrT();
  const [method, setMethod] = useState<'bank' | 'onepay'>('bank');
  const [depositor, setDepositor] = useState('');
  const [reference, setReference] = useState('');
  const [slip, setSlip] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const amount = cycle === 'yearly' ? plan.yearly_price_lkr : plan.monthly_price_lkr;
  const bank = options?.bank;

  async function submitSlip(e: React.FormEvent) {
    e.preventDefault();
    if (depositor.trim().length < 2) { setError(t('bill.pay.depositorRequired')); return; }
    if (!slip) { setError(t('bill.pay.slipRequired')); return; }
    setBusy(true);
    setError(undefined);
    try {
      const fd = new FormData();
      fd.append('type', 'subscription');
      fd.append('package_id', String(plan.package_id));
      fd.append('billing_cycle', cycle);
      fd.append('depositor_name', depositor.trim());
      if (reference.trim()) fd.append('slip_reference', reference.trim());
      fd.append('notes', 'KadeHub Staff');
      fd.append('slip', slip);
      await api.post('/billing/subscribe/bank-transfer', fd, { timeout: 60000 });
      toast.success(t('bill.pay.slipSubmitted'));
      onSubmitted();
    } catch (err) {
      setError(apiError(err, t));
    } finally {
      setBusy(false);
    }
  }

  async function payOnline() {
    setBusy(true);
    setError(undefined);
    try {
      const { data } = await api.post<{ payment_url: string; reference: string }>('/billing/onepay/initiate', { package_id: plan.package_id, billing_cycle: cycle });
      try { localStorage.setItem(ONEPAY_REF_KEY, data.reference); } catch {}
      window.location.assign(data.payment_url);
    } catch (err) {
      setError(apiError(err, t));
      setBusy(false);
    }
  }

  return (
    <Dialog open onClose={() => !busy && onClose()} title={t('bill.pay.title', { plan: t(`plan.${plan.key}` as HrKey) })}>
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-xl border border-ink-200 bg-ink-50 px-4 py-3">
          <span className="text-sm text-ink-500">{t('bill.pay.amount')}</span>
          <span className="text-lg font-bold text-ink-900">{formatLKR(amount)}<span className="text-xs font-normal text-ink-500">{t(cycle === 'yearly' ? 'bill.perYear' : 'bill.perMonth')}</span></span>
        </div>

        {options?.onepay_enabled && (
          <div>
            <p className="mb-1.5 text-sm font-medium text-ink-700">{t('bill.pay.method')}</p>
            <div className="grid grid-cols-2 gap-2">
              {(['bank', 'onepay'] as const).map(m => (
                <button key={m} type="button" onClick={() => setMethod(m)} aria-pressed={method === m}
                  className={cn('rounded-xl border px-3 py-2 text-sm font-semibold', method === m ? 'border-[color:var(--cod-primary)] ring-1 ring-[color:var(--cod-primary)]' : 'border-ink-200')}>
                  {t(m === 'bank' ? 'bill.pay.bank' : 'bill.pay.onepay')}
                </button>
              ))}
            </div>
          </div>
        )}

        {method === 'onepay' ? (
          <div className="space-y-3">
            <p className="text-sm text-ink-500">{t('bill.pay.onepayHelp')}</p>
            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end"><Button onClick={payOnline} disabled={busy}>{busy ? t('bill.pay.redirecting') : t('bill.pay.goToOnepay')}</Button></div>
          </div>
        ) : (
          <form onSubmit={submitSlip} className="space-y-3">
            <p className="text-sm text-ink-500">{t('bill.pay.bankHelp')}</p>
            {bank && (
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-xl border border-ink-200 p-3 text-sm">
                <dt className="col-span-2 mb-1 text-xs font-semibold uppercase tracking-wide text-ink-400">{t('bill.pay.bankDetails')}</dt>
                <dt className="text-ink-500">{t('bill.pay.bankName')}</dt><dd className="font-medium">{bank.bank_name}</dd>
                <dt className="text-ink-500">{t('bill.pay.accountName')}</dt><dd className="font-medium">{bank.account_name}</dd>
                <dt className="text-ink-500">{t('bill.pay.accountNumber')}</dt><dd className="font-mono font-medium">{bank.account_number}</dd>
                <dt className="text-ink-500">{t('bill.pay.branch')}</dt><dd className="font-medium">{bank.branch}</dd>
              </dl>
            )}
            <Field label={t('bill.pay.depositor')} htmlFor="depositor"><TextInput id="depositor" value={depositor} onChange={e => setDepositor(e.target.value)} required /></Field>
            <Field label={t('bill.pay.reference')} htmlFor="slip-ref"><TextInput id="slip-ref" value={reference} onChange={e => setReference(e.target.value)} /></Field>
            <Field label={t('bill.pay.slip')} htmlFor="slip">
              <TextInput id="slip" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={e => setSlip(e.target.files?.[0] ?? null)} />
            </Field>
            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end"><Button type="submit" disabled={busy}>{busy ? t('bill.pay.submitting') : t('bill.pay.submit')}</Button></div>
          </form>
        )}
      </div>
    </Dialog>
  );
}
