'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Check, Crown } from 'lucide-react';
import { MascotState } from '../../../components/brand/Mascot';
import { useCod } from '../../../components/cod/CodContext';
import { Badge, Button, Card, Dialog, Field, TextInput, cn } from '../../../components/cod/ui';
import api from '../../../lib/api';
import { useT } from '../../../lib/cod/i18n/client';
import { formatDate, formatLKR } from '../../../lib/cod/format';
import { daysRemaining, planLabel } from '../../../lib/cod/plans';
import { apiError, type CodPlanOffer } from '../../../lib/cod/session';

interface PaymentOptions {
  bank: { bank_name: string; account_name: string; account_number: string; branch: string; instructions: string };
  onepay_enabled: boolean;
}
type Cycle = 'monthly' | 'yearly';
/** OnePay returns to a shared page, so the reference is kept here and verified on the next visit. */
const ONEPAY_REF_KEY = 'cod_onepay_ref';

// cod.kadehub.com/billing — current plan, usage, Premium features and upgrades through the shared KadeHub checkout
export default function CodBillingPage() {
  const t = useT();
  const { me, refresh } = useCod();
  const [plans, setPlans] = useState<CodPlanOffer[] | null>(null);
  const [options, setOptions] = useState<PaymentOptions | null>(null);
  const [pendingSlip, setPendingSlip] = useState(false);
  const [cycle, setCycle] = useState<Cycle>('monthly');
  const [checkout, setCheckout] = useState<CodPlanOffer | null>(null);

  const loadPending = () =>
    api.get<{ status: string }[]>('/billing/bank-transfer/mine').then(r => setPendingSlip(r.data.some(x => x.status === 'pending'))).catch(() => {});

  useEffect(() => {
    api.get<CodPlanOffer[]>('/cod/plans').then(r => setPlans(r.data)).catch(() => setPlans([]));
    api.get<PaymentOptions>('/billing/payment-options').then(r => setOptions(r.data)).catch(() => {});
    loadPending();
    // Coming back from OnePay: confirm the payment, then reload the plan
    const ref = new URLSearchParams(window.location.search).get('ref') || safeGet(ONEPAY_REF_KEY);
    if (ref) {
      api.get<{ status: string }>(`/billing/onepay/verify/${encodeURIComponent(ref)}`)
        .then(r => {
          if (r.data.status === 'completed') { toast.success(t('pay.verified')); refresh(); }
          else toast(t('pay.verifyFailed'));
        })
        .catch(() => toast(t('pay.verifyFailed')))
        .finally(() => safeRemove(ONEPAY_REF_KEY));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const plan = me.plan!;
  const sub = me.subscription!;
  const active = !!me.active;
  const trialLeft = sub.status === 'trialing' ? daysRemaining(sub.trial_ends_at) : null;
  const usage = me.usage ?? { items: 0, orders_this_month: 0 };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-ink-900">{t('nav.billing')}</h1>
        <p className="text-sm text-ink-500">{t('bill.subtitle')}</p>
      </div>

      {!active && (
        <div className="kh-card py-2">
          <MascotState variant="error" size="sm" title={t('bill.lapsedTitle')} description={t('bill.lapsed')} />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={t('bill.currentPlan')}>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-ink-900">{planLabel(t, { id: plan.key, name: plan.name })}</span>
              <Badge tone={active ? 'gray' : 'red'}>{t(`subStatus.${sub.status}`)}</Badge>
            </div>
            {trialLeft !== null && <p className="text-sm text-ink-500">{trialLeft > 0 ? t.n('bill.trialLeft', trialLeft) : t('bill.trialEnded')}</p>}
            {sub.current_period_end && (
              <p className="text-sm text-ink-500">{t(active ? 'bill.renews' : 'bill.expired', { date: formatDate(sub.current_period_end, t.locale) })}</p>
            )}
            <div className="pt-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">{t('bill.usage')}</p>
              <p className="mt-1 text-sm text-ink-700">
                {plan.max_items === null ? t('bill.usageUnlimitedItems', { used: usage.items }) : t('bill.usageItems', { used: usage.items, limit: plan.max_items })}
              </p>
              <p className="text-sm text-ink-700">
                {plan.max_orders_per_month === null
                  ? t('bill.usageUnlimitedOrders', { used: usage.orders_this_month })
                  : t('bill.usageOrders', { used: usage.orders_this_month, limit: plan.max_orders_per_month })}
              </p>
            </div>
            {pendingSlip && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">{t('pay.pendingSlip')}</p>}
          </div>
        </Card>

        <Card title={<span className="flex items-center gap-2"><Crown size={16} className="text-amber-500" /> {t('bill.premiumTitle')}
          {me.premium && <Badge tone="amber">{t('premium.badge')}</Badge>}</span>}>
          <div className="space-y-1.5 text-sm">
            {me.premium && <p className="text-ink-500">{t('bill.premiumActive')}</p>}
            {(['bill.premium.units', 'bill.premium.bulk', 'bill.premium.chart'] as const).map(k => (
              <p key={k} className="flex items-start gap-1.5"><Check size={14} className="mt-0.5 shrink-0 text-emerald-600" />{t(k)}</p>
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
                className={cn('rounded-lg px-3 py-1.5 text-xs font-semibold',
                  cycle === c ? 'bg-[color:var(--cod-primary)] text-[color:var(--cod-primary-fg)]' : 'text-ink-600')}>
                {t(c === 'monthly' ? 'bill.monthly' : 'bill.yearly')}
              </button>
            ))}
          </div>
        </div>
        {plans === null ? (
          <MascotState variant="loading" size="sm" title={t('app.loading')} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            {plans.map(p => {
              const isCurrent = p.key === plan.key;
              const price = cycle === 'yearly' ? p.yearly_price_lkr : p.monthly_price_lkr;
              const paid = p.monthly_price_lkr > 0;
              // Free is the trial plan; a paid plan can be bought, or renewed once it has lapsed
              const canBuy = paid && p.package_id !== null && (!isCurrent || !active || sub.status === 'trialing');
              return (
                <section key={p.slug} className={cn('kh-card flex flex-col p-5', isCurrent && 'ring-2 ring-[color:var(--cod-primary)]')}>
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-ink-900">{planLabel(t, { id: p.key, name: p.name })}</h3>
                    {isCurrent && <Badge tone="brand">{t('bill.current')}</Badge>}
                  </div>
                  <p className="mt-3 text-2xl font-bold text-ink-900">
                    {paid ? formatLKR(price) : t('common.free')}
                    {paid && <span className="text-sm font-normal text-ink-500">{t(cycle === 'yearly' ? 'bill.perYear' : 'bill.perMonth')}</span>}
                  </p>
                  <ul className="mt-3 flex-1 space-y-1.5 text-sm">
                    {p.features.map(f => (
                      <li key={f} className="flex items-start gap-1.5"><Check size={14} className="mt-0.5 shrink-0 text-emerald-600" />{t.lookup('feat', f)}</li>
                    ))}
                  </ul>
                  <Button className="mt-4 w-full justify-center" disabled={!canBuy || pendingSlip} onClick={() => setCheckout(p)}>
                    {isCurrent && active && sub.status !== 'trialing' ? t('bill.currentPlan') : isCurrent && paid ? t('bill.renew') : t('bill.upgrade')}
                  </Button>
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

function safeGet(key: string) { try { return localStorage.getItem(key); } catch { return null; } }
function safeRemove(key: string) { try { localStorage.removeItem(key); } catch {} }

/** Pay for a COD package with the platform's bank-transfer slip flow or OnePay. */
function Checkout({ plan, cycle, options, onClose, onSubmitted }: {
  plan: CodPlanOffer; cycle: Cycle; options: PaymentOptions | null; onClose: () => void; onSubmitted: () => void;
}) {
  const t = useT();
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
    if (depositor.trim().length < 2) { setError(t('pay.depositorRequired')); return; }
    if (!slip) { setError(t('pay.slipRequired')); return; }
    setBusy(true);
    setError(undefined);
    try {
      const fd = new FormData();
      fd.append('type', 'subscription');
      fd.append('package_id', String(plan.package_id));
      fd.append('billing_cycle', cycle);
      fd.append('depositor_name', depositor.trim());
      if (reference.trim()) fd.append('slip_reference', reference.trim());
      fd.append('notes', 'KadeHub COD');
      fd.append('slip', slip);
      await api.post('/billing/subscribe/bank-transfer', fd, { timeout: 60000 });
      toast.success(t('pay.slipSubmitted'));
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
    <Dialog open onClose={() => !busy && onClose()} title={t('pay.title', { plan: planLabel(t, { id: plan.key, name: plan.name }) })}>
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-xl border border-ink-200 bg-ink-50 px-4 py-3">
          <span className="text-sm text-ink-500">{t('pay.amount')}</span>
          <span className="text-lg font-bold text-ink-900">{formatLKR(amount)}<span className="text-xs font-normal text-ink-500">{t(cycle === 'yearly' ? 'bill.perYear' : 'bill.perMonth')}</span></span>
        </div>

        {options?.onepay_enabled && (
          <div>
            <p className="mb-1.5 text-sm font-medium text-ink-700">{t('pay.method')}</p>
            <div className="grid grid-cols-2 gap-2">
              {(['bank', 'onepay'] as const).map(m => (
                <button key={m} type="button" onClick={() => setMethod(m)} aria-pressed={method === m}
                  className={cn('rounded-xl border px-3 py-2 text-sm font-semibold', method === m ? 'border-[color:var(--cod-primary)] ring-1 ring-[color:var(--cod-primary)]' : 'border-ink-200')}>
                  {t(m === 'bank' ? 'pay.bank' : 'pay.onepay')}
                </button>
              ))}
            </div>
          </div>
        )}

        {method === 'onepay' ? (
          <div className="space-y-3">
            <p className="text-sm text-ink-500">{t('pay.onepayHelp')}</p>
            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end"><Button onClick={payOnline} disabled={busy}>{busy ? t('pay.redirecting') : t('pay.goToOnepay')}</Button></div>
          </div>
        ) : (
          <form onSubmit={submitSlip} className="space-y-3">
            <p className="text-sm text-ink-500">{t('pay.bankHelp')}</p>
            {bank && (
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-xl border border-ink-200 p-3 text-sm">
                <dt className="col-span-2 mb-1 text-xs font-semibold uppercase tracking-wide text-ink-400">{t('pay.bankDetails')}</dt>
                <dt className="text-ink-500">{t('pay.bankName')}</dt><dd className="font-medium">{bank.bank_name}</dd>
                <dt className="text-ink-500">{t('pay.accountName')}</dt><dd className="font-medium">{bank.account_name}</dd>
                <dt className="text-ink-500">{t('pay.accountNumber')}</dt><dd className="font-mono font-medium">{bank.account_number}</dd>
                <dt className="text-ink-500">{t('pay.branch')}</dt><dd className="font-medium">{bank.branch}</dd>
              </dl>
            )}
            <Field label={t('pay.depositor')} htmlFor="depositor"><TextInput id="depositor" value={depositor} onChange={e => setDepositor(e.target.value)} required /></Field>
            <Field label={t('pay.reference')} htmlFor="slip-ref"><TextInput id="slip-ref" value={reference} onChange={e => setReference(e.target.value)} /></Field>
            <Field label={t('pay.slip')} htmlFor="slip">
              <TextInput id="slip" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={e => setSlip(e.target.files?.[0] ?? null)} />
            </Field>
            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end"><Button type="submit" disabled={busy}>{busy ? t('pay.submitting') : t('pay.submitSlip')}</Button></div>
          </form>
        )}
      </div>
    </Dialog>
  );
}
