'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../lib/api';
import { useAuthStore } from '../../../hooks/useAuth';
import KadeHubLogo from '../../../components/ui/KadeHubLogo';
import { Input } from '../../../components/ui/Input';
import { LKR } from '../../../lib/format';
import toast from 'react-hot-toast';

const formatPrice = (amount: number, currency: string) =>
  currency === 'USD'
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
    : LKR(amount);
import {
  Check, ChevronRight, ShoppingCart, Boxes, Users, BarChart2,
  Tag, Receipt, Truck, CreditCard, FlaskConical, UserCog, Star,
  Building2, ArrowLeft, Loader2,
} from 'lucide-react';

// ── Module metadata ──
const MODULE_META: Record<string, { label: string; icon: any; desc: string }> = {
  pos:       { label: 'POS',        icon: ShoppingCart, desc: 'Sales & checkout' },
  inventory: { label: 'Inventory',  icon: Boxes,        desc: 'Stock management' },
  analytics: { label: 'Analytics',  icon: BarChart2,    desc: 'Reports & insights' },
  customer:  { label: 'Customers',  icon: Users,        desc: 'CRM & loyalty' },
  discounts: { label: 'Discounts',  icon: Tag,          desc: 'Promotions' },
  expenses:  { label: 'Expenses',   icon: Receipt,      desc: 'Cost tracking' },
  suppliers: { label: 'Suppliers',  icon: Truck,        desc: 'Purchase orders' },
  credit:    { label: 'Credit',     icon: CreditCard,   desc: 'Debt tracking' },
  batches:   { label: 'Batches',    icon: FlaskConical, desc: 'Expiry tracking' },
  staff:     { label: 'Staff',      icon: UserCog,      desc: 'Shifts & audit' },
};

type Step = 'account' | 'company' | 'package' | 'payment' | 'done';

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [step, setStep] = useState<Step>('account');
  const [packages, setPackages] = useState<any[]>([]);
  const [currency, setCurrency] = useState<string>('LKR');
  const [registrationFee, setRegistrationFee] = useState<number>(25000);
  const [loading, setLoading] = useState(false);

  // Form state
  const [account, setAccount] = useState({ shopName: '', name: '', email: '', password: '' });
  const [company, setCompany] = useState({ address: '', city: '', phone: '', email: '', website: '', tax_number: '' });
  const [selectedPkg, setSelectedPkg] = useState<any>(null);
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');
  const [gateway, setGateway] = useState<'paypal' | 'card'>('card');
  const [card, setCard] = useState({ number: '', name: '', expiry: '', cvv: '' });
  const [authData, setAuthData] = useState<any>(null); // after register

  useEffect(() => {
    api.get('/billing/packages')
      .then(r => {
        const data = r.data;
        setPackages(Array.isArray(data) ? data : (data.packages ?? []));
        if (data.currency) setCurrency(data.currency);
        if (data.registrationFee != null) setRegistrationFee(data.registrationFee);
      })
      .catch(() => setPackages([]));
  }, []);

  // ── Step 1: Create account ──
  const submitAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', account);
      setAuthData(data);
      setAuth(data.user, data.access_token);
      setStep('company');
    } catch (err: any) {
      const msg = err.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'Registration failed');
    } finally { setLoading(false); }
  };

  // ── Step 2: Save company details ──
  const submitCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.patch('/billing/profile', { ...company, email: company.email || account.email });
      setStep('package');
    } catch { toast.error('Failed to save company details'); }
    finally { setLoading(false); }
  };

  // ── Step 3: Select package → go to payment ──
  const selectPackage = (pkg: any) => { setSelectedPkg(pkg); setStep('payment'); };

  // ── Step 4: Process payment ──
  const submitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPkg) return;
    setLoading(true);
    try {
      // Simulate payment gateway — in production integrate real PayPal/Stripe SDK
      const gatewayRef = gateway === 'paypal'
        ? `PAYPAL-${Date.now()}`
        : `CARD-${card.number.slice(-4)}-${Date.now()}`;

      await api.post('/billing/subscribe', {
        package_id: selectedPkg.id,
        billing_cycle: billing,
        gateway,
        gateway_ref: gatewayRef,
        currency,
        registration_fee: registrationFee,
      });
      setStep('done');
    } catch (err: any) {
      const msg = err.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'Payment failed');
    } finally { setLoading(false); }
  };

  const price = selectedPkg
    ? billing === 'yearly' ? selectedPkg.price_yearly : selectedPkg.price_monthly
    : 0;

  const fmt = (n: number) => formatPrice(n, currency);

  const STEPS: Step[] = ['account', 'company', 'package', 'payment'];
  const stepIdx = STEPS.indexOf(step);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F1F5F9' }}>
      {/* Header */}
      <header className="bg-white border-b border-ink-200 px-6 py-4 flex items-center justify-between">
        <KadeHubLogo height={32} />
        <a href="/login" className="text-sm text-ink-500 hover:text-ink-800 transition-colors">
          Already have an account? Sign in
        </a>
      </header>

      <div className="flex-1 flex flex-col items-center py-10 px-4">
        {/* Progress bar */}
        {step !== 'done' && (
          <div className="w-full max-w-2xl mb-8">
            <div className="flex items-center gap-2">
              {['Account', 'Company', 'Package', 'Payment'].map((label, i) => (
                <div key={label} className="flex items-center gap-2 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                      style={{
                        background: i < stepIdx ? '#00A884' : i === stepIdx ? '#00A884' : '#E2E8F0',
                        color: i <= stepIdx ? 'white' : '#94A3B8',
                      }}>
                      {i < stepIdx ? <Check size={13} /> : i + 1}
                    </div>
                    <span className="text-xs font-semibold hidden sm:block"
                      style={{ color: i <= stepIdx ? '#00A884' : '#94A3B8' }}>{label}</span>
                  </div>
                  {i < 3 && <div className="flex-1 h-0.5 rounded-full" style={{ background: i < stepIdx ? '#00A884' : '#E2E8F0' }} />}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 1: Account ── */}
        {step === 'account' && (
          <div className="w-full max-w-md kh-card p-8">
            <h2 className="text-xl font-bold text-ink-900 mb-1">Create your account</h2>
            <p className="text-sm text-ink-400 mb-6">Start your KadeHub journey</p>
            <form onSubmit={submitAccount} className="space-y-4">
              <Input label="Shop / Business Name" placeholder="e.g. Perera Grocery" required
                value={account.shopName} onChange={e => setAccount(a => ({ ...a, shopName: e.target.value }))} />
              <Input label="Your Full Name" placeholder="e.g. Nimal Perera" required
                value={account.name} onChange={e => setAccount(a => ({ ...a, name: e.target.value }))} />
              <Input label="Email Address" type="email" placeholder="you@example.com" required
                value={account.email} onChange={e => setAccount(a => ({ ...a, email: e.target.value }))} />
              <Input label="Password" type="password" placeholder="Min 6 characters" required
                value={account.password} onChange={e => setAccount(a => ({ ...a, password: e.target.value }))} />
              <button type="submit" disabled={loading}
                className="kh-btn-primary w-full py-2.5 rounded-xl flex items-center justify-center gap-2">
                {loading ? <Loader2 size={16} className="animate-spin" /> : <>Continue <ChevronRight size={16} /></>}
              </button>
            </form>
          </div>
        )}

        {/* ── STEP 2: Company Details ── */}
        {step === 'company' && (
          <div className="w-full max-w-xl kh-card p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#E0F2F1' }}>
                <Building2 size={20} style={{ color: '#00A884' }} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-ink-900">Company Details</h2>
                <p className="text-sm text-ink-400">This appears on your receipts and invoices</p>
              </div>
            </div>
            <form onSubmit={submitCompany} className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Input label="Business Address" placeholder="No 45, Main Street, Colombo"
                  value={company.address} onChange={e => setCompany(c => ({ ...c, address: e.target.value }))} />
              </div>
              <Input label="City" placeholder="Colombo"
                value={company.city} onChange={e => setCompany(c => ({ ...c, city: e.target.value }))} />
              <Input label="Phone" placeholder="0112345678"
                value={company.phone} onChange={e => setCompany(c => ({ ...c, phone: e.target.value }))} />
              <Input label="Business Email" type="email" placeholder="shop@example.com"
                value={company.email} onChange={e => setCompany(c => ({ ...c, email: e.target.value }))} />
              <Input label="Website" placeholder="www.yourshop.lk"
                value={company.website} onChange={e => setCompany(c => ({ ...c, website: e.target.value }))} />
              <div className="col-span-2">
                <Input label="Tax / VAT Number (optional)" placeholder="VAT123456789"
                  value={company.tax_number} onChange={e => setCompany(c => ({ ...c, tax_number: e.target.value }))} />
              </div>
              <div className="col-span-2 flex gap-3 pt-2">
                <button type="button" onClick={() => setStep('account')}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-ink-200 text-sm font-semibold text-ink-600 hover:bg-ink-50 transition-colors">
                  <ArrowLeft size={15} /> Back
                </button>
                <button type="submit" disabled={loading}
                  className="kh-btn-primary flex-1 py-2.5 rounded-xl flex items-center justify-center gap-2">
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <>Continue <ChevronRight size={16} /></>}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── STEP 3: Package Selection ── */}
        {step === 'package' && (
          <div className="w-full max-w-5xl">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-ink-900">Choose your plan</h2>
              <p className="text-ink-400 mt-2">Select the modules your shop needs. Upgrade anytime.</p>
              {/* Registration fee notice */}
              <div className="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-xl text-sm font-medium" style={{ background: '#FEF9C3', color: '#92400E' }}>
                One-time registration fee: <strong>{fmt(registrationFee)}</strong>
              </div>
              {/* Billing toggle */}
              <div className="inline-flex items-center gap-1 mt-4 p-1 rounded-xl bg-white border border-ink-200">
                {(['monthly', 'yearly'] as const).map(b => (
                  <button key={b} onClick={() => setBilling(b)}
                    className="px-5 py-2 rounded-lg text-sm font-semibold capitalize transition-all"
                    style={{ background: billing === b ? '#00A884' : 'transparent', color: billing === b ? 'white' : '#64748B' }}>
                    {b === 'yearly' ? 'Yearly — Save 17%' : 'Monthly'}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {packages.map(pkg => {
                const pkgPrice = billing === 'yearly' ? pkg.price_yearly : pkg.price_monthly;
                return (
                  <div key={pkg.id}
                    className="kh-card p-6 flex flex-col relative transition-all hover:shadow-lg"
                    style={{ border: pkg.is_popular ? '2px solid #00A884' : undefined }}>
                    {pkg.is_popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold text-white flex items-center gap-1"
                        style={{ background: '#00A884' }}>
                        <Star size={11} fill="white" /> Most Popular
                      </div>
                    )}
                    <div className="mb-4">
                      <h3 className="text-lg font-bold text-ink-900">{pkg.name}</h3>
                      <p className="text-xs text-ink-400 mt-1">{pkg.description}</p>
                    </div>
                    <div className="mb-5">
                      <span className="text-3xl font-extrabold" style={{ color: '#00A884' }}>{fmt(pkgPrice)}</span>
                      <span className="text-ink-400 text-sm ml-1">/{billing === 'yearly' ? 'year' : 'month'}</span>
                      {billing === 'yearly' && (
                        <p className="text-xs text-ink-400 mt-0.5">{fmt(pkg.price_monthly)}/mo billed annually</p>
                      )}
                    </div>
                    {/* Modules */}
                    <div className="flex-1 space-y-2 mb-6">
                      {pkg.modules?.map((m: any, idx: number) => {
                        const meta = MODULE_META[m.module_name];
                        if (!meta) return null;
                        const Icon = meta.icon;
                        return (
                          <div key={`${pkg.id}-${m.module_name}-${idx}`} className="flex items-center gap-2.5 text-sm">
                            <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ background: '#E0F2F1' }}>
                              <Icon size={13} style={{ color: '#00A884' }} />
                            </div>
                            <span className="text-ink-700 font-medium">{meta.label}</span>
                            <span className="text-ink-400 text-xs ml-auto">{meta.desc}</span>
                          </div>
                        );
                      })}
                    </div>
                    <button onClick={() => selectPackage(pkg)}
                      className="w-full py-2.5 rounded-xl text-sm font-bold transition-all"
                      style={{
                        background: pkg.is_popular ? '#00A884' : 'white',
                        color: pkg.is_popular ? 'white' : '#00A884',
                        border: `2px solid #00A884`,
                      }}>
                      Select {pkg.name}
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="text-center mt-6">
              <button onClick={() => setStep('company')} className="text-sm text-ink-400 hover:text-ink-700 flex items-center gap-1 mx-auto">
                <ArrowLeft size={14} /> Back to company details
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 4: Payment ── */}
        {step === 'payment' && selectedPkg && (
          <div className="w-full max-w-2xl">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
              {/* Payment form */}
              <div className="md:col-span-3 kh-card p-6">
                <h2 className="text-lg font-bold text-ink-900 mb-5">Payment Details</h2>

                {/* Gateway selector */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                  {(['card', 'paypal'] as const).map(g => (
                    <button key={g} onClick={() => setGateway(g)}
                      className="flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-semibold transition-all"
                      style={{
                        borderColor: gateway === g ? '#00A884' : '#E2E8F0',
                        background: gateway === g ? '#E0F2F1' : 'white',
                        color: gateway === g ? '#00A884' : '#64748B',
                      }}>
                      {g === 'card' ? <CreditCard size={16} /> : <span className="font-extrabold text-blue-600">Pay</span>}
                      {g === 'card' ? 'Credit / Debit Card' : 'PayPal'}
                    </button>
                  ))}
                </div>

                <form onSubmit={submitPayment} className="space-y-4">
                  {gateway === 'card' && (
                    <>
                      <Input label="Card Number" placeholder="1234 5678 9012 3456" required
                        value={card.number} onChange={e => setCard(c => ({ ...c, number: e.target.value }))}
                        maxLength={19} />
                      <Input label="Cardholder Name" placeholder="NIMAL PERERA" required
                        value={card.name} onChange={e => setCard(c => ({ ...c, name: e.target.value }))} />
                      <div className="grid grid-cols-2 gap-3">
                        <Input label="Expiry (MM/YY)" placeholder="04/28" required
                          value={card.expiry} onChange={e => setCard(c => ({ ...c, expiry: e.target.value }))} />
                        <Input label="CVV" placeholder="123" required type="password" maxLength={4}
                          value={card.cvv} onChange={e => setCard(c => ({ ...c, cvv: e.target.value }))} />
                      </div>
                    </>
                  )}
                  {gateway === 'paypal' && (
                    <div className="p-4 rounded-xl text-center" style={{ background: '#EFF6FF' }}>
                      <p className="text-sm text-blue-700 font-medium">You will be redirected to PayPal to complete payment.</p>
                      <p className="text-xs text-blue-500 mt-1">Secure payment powered by PayPal</p>
                    </div>
                  )}
                  <button type="submit" disabled={loading}
                    className="kh-btn-primary w-full py-3 rounded-xl flex items-center justify-center gap-2 text-base font-bold">
                    {loading
                      ? <Loader2 size={18} className="animate-spin" />
                      : <>Pay {fmt(price)} <ChevronRight size={16} /></>
                    }
                  </button>
                  <p className="text-xs text-center text-ink-400">🔒 Secured with 256-bit SSL encryption</p>
                </form>
              </div>

              {/* Order summary */}
              <div className="md:col-span-2 kh-card p-5 h-fit">
                <h3 className="font-semibold text-ink-800 mb-4">Order Summary</h3>
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-ink-600">{selectedPkg.name} Plan</span>
                    <span className="font-bold text-ink-800">{fmt(price)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-ink-400">
                    <span>Billing</span>
                    <span className="capitalize">{billing}</span>
                  </div>
                  {billing === 'yearly' && (
                    <div className="flex justify-between text-xs" style={{ color: '#00A884' }}>
                      <span>Annual discount</span>
                      <span>-{fmt(selectedPkg.price_monthly * 12 - selectedPkg.price_yearly)}</span>
                    </div>
                  )}
                </div>
                <div className="border-t border-ink-100 pt-3 mb-4">
                  <div className="flex justify-between text-xs text-ink-500 mb-1">
                    <span>Registration fee (one-time)</span>
                    <span>{fmt(registrationFee)}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Total</span>
                    <span style={{ color: '#00A884' }}>{fmt(price + registrationFee)}</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-ink-500 mb-2">Included modules:</p>
                  {selectedPkg.modules?.map((m: any, idx: number) => {
                    const meta = MODULE_META[m.module_name];
                    if (!meta) return null;
                    const Icon = meta.icon;
                    return (
                      <div key={`summary-${m.module_name}-${idx}`} className="flex items-center gap-2 text-xs text-ink-600">
                        <Check size={12} style={{ color: '#00A884' }} />
                        <Icon size={12} />
                        {meta.label}
                      </div>
                    );
                  })}
                </div>
                <button onClick={() => setStep('package')}
                  className="mt-4 text-xs text-ink-400 hover:text-ink-700 flex items-center gap-1">
                  <ArrowLeft size={12} /> Change plan
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 5: Done ── */}
        {step === 'done' && (
          <div className="w-full max-w-md kh-card p-10 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: '#E0F2F1' }}>
              <Check size={32} style={{ color: '#00A884' }} />
            </div>
            <h2 className="text-2xl font-bold text-ink-900 mb-2">You're all set! 🎉</h2>
            <p className="text-ink-400 mb-2">
              <strong>{selectedPkg?.name}</strong> plan activated successfully.
            </p>
            <p className="text-sm text-ink-400 mb-8">
              Your shop is ready. Start managing sales, inventory and customers right away.
            </p>
            <button onClick={() => router.push('/pos')}
              className="kh-btn-primary w-full py-3 rounded-xl text-base font-bold flex items-center justify-center gap-2">
              Go to Dashboard <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
