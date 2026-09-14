'use client';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../../hooks/useAuth';
import api from '../../lib/api';
import { LKR } from '../../lib/format';
import BankTransferForm from '../../components/billing/BankTransferForm';
import { Check, ArrowLeft, Star, Clock } from 'lucide-react';

const fmt = (n: number, currency: string) =>
  currency === 'USD'
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
    : LKR(n);

export default function SubscribePage() {
  const { logout } = useAuthStore();
  const [packages, setPackages] = useState<any[]>([]);
  const [currency, setCurrency] = useState('LKR');
  const [registrationFeeDue, setRegistrationFeeDue] = useState(25000);
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedPkg, setSelectedPkg] = useState<any>(null);
  const [pendingSlip, setPendingSlip] = useState<any>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const loadCheckoutInfo = () => {
    setLoading(true);
    setLoadError(false);
    api.get('/billing/checkout-info').then(r => {
      const d = r.data;
      setPackages(Array.isArray(d) ? d : (d.packages ?? []));
      if (d.currency) setCurrency(d.currency);
      if (d.registrationFeeDue != null) setRegistrationFeeDue(d.registrationFeeDue);
      else if (d.registrationFee != null) setRegistrationFeeDue(d.registrationFee);
    }).catch(() => {
      setLoadError(true);
    }).finally(() => setLoading(false));
    api.get('/billing/bank-transfer/mine').then(r => {
      const pending = (Array.isArray(r.data) ? r.data : []).find((t: any) => t.status === 'pending');
      if (pending) setPendingSlip(pending);
    }).catch(() => {});
  };

  useEffect(() => { loadCheckoutInfo(); }, []);

  const price = selectedPkg
    ? billing === 'yearly' ? selectedPkg.price_yearly : selectedPkg.price_monthly
    : 0;
  const total = price + registrationFeeDue;

  if (pendingSlip || submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#F1F5F9' }}>
        <div className="w-full max-w-md bg-white rounded-2xl p-8 text-center shadow-sm">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: '#FFF8E1' }}>
            <Clock size={26} style={{ color: '#F59E0B' }} />
          </div>
          <h2 className="text-xl font-bold text-ink-900 mb-2">Payment under review</h2>
          <p className="text-sm text-ink-500 mb-4">
            Your bank slip has been submitted. We will activate your shop as soon as the transfer is verified.
          </p>
          {pendingSlip && (
            <p className="text-xs text-ink-400 mb-6">
              Ref {pendingSlip.gateway_ref} · {fmt(pendingSlip.amount, currency)}
            </p>
          )}
          <button onClick={() => { logout(); window.location.href = '/login'; }}
            className="text-sm font-semibold" style={{ color: '#00A884' }}>
            Sign out
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg,#0a4f40,#0d6e5a)' }}>
        <div className="w-8 h-8 rounded-full border-2 border-white/30 border-t-white animate-spin" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg,#0a4f40,#0d6e5a)' }}>
        <div className="w-full max-w-md bg-white rounded-2xl p-8 text-center shadow-sm">
          <h2 className="text-xl font-bold text-ink-900 mb-2">Couldn&apos;t load plans</h2>
          <p className="text-sm text-ink-500 mb-6">Something went wrong reaching KadeHub. Check your connection and try again.</p>
          <button onClick={loadCheckoutInfo}
            className="kh-btn-primary w-full py-2.5 rounded-xl font-semibold">
            Try again
          </button>
          <button onClick={() => { logout(); window.location.href = '/login'; }}
            className="mt-4 text-sm font-semibold" style={{ color: '#00A884' }}>
            Sign out
          </button>
        </div>
      </div>
    );
  }

  // ── Package selection ──
  if (!selectedPkg) return (
    <div className="min-h-screen flex flex-col items-center py-12 px-4" style={{ background: 'linear-gradient(135deg,#0a4f40,#0d6e5a)' }}>
      <button onClick={() => { logout(); window.location.href = '/login'; }}
        className="self-end mr-4 mb-6 text-sm font-semibold text-white/70 hover:text-white">
        Sign Out
      </button>

      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4 text-sm font-bold"
          style={{ background: 'rgba(245,166,35,0.2)', color: '#f5a623', border: '1px solid rgba(245,166,35,0.4)' }}>
          ⏰ Your 14-day free trial has ended
        </div>
        <h1 className="text-3xl font-extrabold text-white mb-2">Choose a Plan to Continue</h1>
        <p className="text-white/70 text-sm">
          {registrationFeeDue > 0
            ? 'One-time registration fee + subscription due with your first payment'
            : 'Choose a subscription plan to continue'}
        </p>

        <div className="flex items-center justify-center gap-3 mt-5">
          <span className="text-sm font-semibold" style={{ color: billing === 'monthly' ? '#fff' : 'rgba(255,255,255,0.5)' }}>Monthly</span>
          <button onClick={() => setBilling(b => b === 'monthly' ? 'yearly' : 'monthly')}
            className="w-12 h-6 rounded-full relative transition-colors"
            style={{ background: billing === 'yearly' ? '#f5a623' : 'rgba(255,255,255,0.25)' }}>
            <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
              style={{ left: billing === 'yearly' ? '26px' : '2px' }} />
          </button>
          <span className="text-sm font-semibold" style={{ color: billing === 'yearly' ? '#fff' : 'rgba(255,255,255,0.5)' }}>Yearly</span>
          {billing === 'yearly' && <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: '#f5a623', color: '#0a2e25' }}>Save 17%</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 w-full max-w-5xl mb-8">
        {packages.map(pkg => {
          const pkgPrice = billing === 'yearly' ? pkg.price_yearly : pkg.price_monthly;
          return (
            <div key={pkg.id} className="bg-white rounded-2xl p-6 flex flex-col relative"
              style={{ border: pkg.is_popular ? '2px solid #f5a623' : undefined, transform: pkg.is_popular ? 'scale(1.03)' : undefined }}>
              {pkg.is_popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"
                  style={{ background: '#f5a623', color: '#0a2e25' }}>
                  <Star size={11} fill="#0a2e25" /> Most Popular
                </div>
              )}
              <h3 className="font-bold text-ink-900 text-lg mb-1">{pkg.name}</h3>
              <p className="text-xs text-ink-400 mb-3">{pkg.description}</p>
              <div className="mb-3">
                <span className="text-3xl font-extrabold" style={{ color: '#00A884' }}>{fmt(pkgPrice, currency)}</span>
                <span className="text-ink-400 text-sm ml-1">/{billing === 'yearly' ? 'yr' : 'mo'}</span>
              </div>
              {registrationFeeDue > 0 && (
                <div className="rounded-xl p-3 mb-4 text-xs space-y-1" style={{ background: '#FEF9C3' }}>
                  <div className="flex justify-between text-ink-600">
                    <span>Subscription</span><span>{fmt(pkgPrice, currency)}</span>
                  </div>
                  <div className="flex justify-between text-ink-600">
                    <span>One-time registration fee</span>
                    <span style={{ color: '#00A884' }}>{fmt(registrationFeeDue, currency)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-ink-800 border-t border-yellow-200 pt-1">
                    <span>First payment</span><span>{fmt(pkgPrice + registrationFeeDue, currency)}</span>
                  </div>
                </div>
              )}
              <div className="flex-1 space-y-1.5 mb-5">
                {pkg.modules?.slice(0, 6).map((m: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-ink-600">
                    <Check size={12} style={{ color: '#00A884' }} />
                    <span className="capitalize">{m.module_name}</span>
                  </div>
                ))}
                {pkg.modules?.length > 6 && <p className="text-xs text-ink-400">+{pkg.modules.length - 6} more</p>}
              </div>
              <button onClick={() => setSelectedPkg(pkg)}
                className="w-full py-2.5 rounded-xl text-sm font-bold transition-all"
                style={{ background: pkg.is_popular ? '#00A884' : 'white', color: pkg.is_popular ? 'white' : '#00A884', border: '2px solid #00A884' }}>
                Select {pkg.name}
              </button>
            </div>
          );
        })}
      </div>

      <p className="text-white/50 text-xs">
        Need help?{' '}
        <a href="https://wa.me/94702470064" target="_blank" rel="noreferrer" className="font-semibold" style={{ color: '#25d366' }}>Chat on WhatsApp</a>
      </p>
    </div>
  );

  // ── Payment screen ──
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#F1F5F9' }}>
      <div className="w-full max-w-2xl">
        <button onClick={() => setSelectedPkg(null)} className="flex items-center gap-1 text-sm text-ink-500 hover:text-ink-800 mb-4">
          <ArrowLeft size={14} /> Back to plans
        </button>

        <div className="flex flex-col md:grid md:grid-cols-5 gap-4">
          <div className="md:col-span-3 bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="font-bold text-ink-900 text-lg mb-4">Payment</h2>
            <BankTransferForm
              type="subscription"
              amount={total}
              currency={currency}
              packageId={selectedPkg.id}
              billingCycle={billing}
              registrationFee={registrationFeeDue > 0 ? registrationFeeDue : undefined}
              onSuccess={() => { setSubmitted(true); setPendingSlip({ gateway_ref: 'pending', amount: total }); }}
            />
          </div>

          {/* Order summary */}
          <div className="md:col-span-2 bg-white rounded-2xl p-5 shadow-sm h-fit">
            <h3 className="font-semibold text-ink-800 mb-4">Order Summary</h3>
            <div className="space-y-2 text-sm mb-3">
              <div className="flex justify-between">
                <span className="text-ink-600">{selectedPkg.name} Plan</span>
                <span className="font-bold">{fmt(price, currency)}</span>
              </div>
              <div className="flex justify-between text-xs text-ink-400">
                <span>Billing</span><span className="capitalize">{billing}</span>
              </div>
            </div>
            <div className="border-t border-ink-100 pt-3 mb-3 space-y-2">
              {registrationFeeDue > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-ink-500">Registration fee (one-time)</span>
                  <span className="font-semibold" style={{ color: '#00A884' }}>{fmt(registrationFeeDue, currency)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm border-t border-ink-100 pt-2">
                <span>Total</span>
                <span style={{ color: '#00A884' }}>{fmt(total, currency)}</span>
              </div>
              <p className="text-xs text-ink-400">Subsequent: {fmt(price, currency)}/{billing === 'yearly' ? 'yr' : 'mo'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
