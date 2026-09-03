'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../lib/api';
import { useAuthStore } from '../../../hooks/useAuth';
import KadeHubLogo from '../../../components/ui/KadeHubLogo';
import { Input } from '../../../components/ui/Input';
import { LKR } from '../../../lib/format';
import toast from 'react-hot-toast';
import BankTransferForm from '../../../components/billing/BankTransferForm';

const formatPrice = (amount: number, currency: string) =>
  currency === 'USD'
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
    : LKR(amount);
import {
  Check, ChevronRight, ShoppingCart, Boxes, Users, BarChart2,
  Tag, Receipt, Truck, FlaskConical, UserCog, CreditCard,
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

type Step = 'account' | 'company' | 'payment' | 'done';

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [step, setStep] = useState<Step>('account');
  const [packages, setPackages] = useState<any[]>([]);
  const [currency, setCurrency] = useState<string>('LKR');
  const [registrationFee] = useState<number>(25000);
  const [loading, setLoading] = useState(false);

  // Form state
  const [account, setAccount] = useState({ shopName: '', name: '', email: '', password: '', subdomain: '' });
  const [subdomainStatus, setSubdomainStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [company, setCompany] = useState({ address: '', city: '', phone: '', email: '', website: '', tax_number: '' });
  const [billing] = useState<'monthly'>('monthly');
  const [pendingReview, setPendingReview] = useState(false);

  useEffect(() => {
    api.get('/billing/packages')
      .then(r => {
        const data = r.data;
        setPackages(Array.isArray(data) ? data : (data.packages ?? []));
        if (data.currency) setCurrency(data.currency);
      })
      .catch(() => setPackages([]));
  }, []);

  // ── Subdomain availability check (debounced) ──
  const checkSubdomain = useCallback((value: string) => {
    if (!value) return setSubdomainStatus('idle');
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(value) || value.length < 3) return setSubdomainStatus('invalid');
    setSubdomainStatus('checking');
    api.get(`/auth/check-subdomain/${value}`)
      .then(r => setSubdomainStatus(r.data.available ? 'available' : 'taken'))
      .catch(() => setSubdomainStatus('idle'));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => checkSubdomain(account.subdomain), 500);
    return () => clearTimeout(t);
  }, [account.subdomain, checkSubdomain]);

  // Auto-suggest subdomain from shop name
  const handleShopNameChange = (value: string) => {
    const suggested = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30);
    setAccount(a => ({ ...a, shopName: value, subdomain: suggested }));
  };

  // ── Step 1: Create account ──
  const submitAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (subdomainStatus === 'taken') return toast.error('Subdomain is already taken');
    if (subdomainStatus === 'invalid' || !account.subdomain) return toast.error('Enter a valid subdomain');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', account);
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
      setStep('payment');
    } catch (err: any) {
      const msg = err.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'Failed to save company details');
    }
    finally { setLoading(false); }
  };

  const fmt = (n: number) => formatPrice(n, currency);

  const STEPS: Step[] = ['account', 'company', 'payment'];
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
              {['Account', 'Company', 'Payment'].map((label, i) => (
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
                  {i < 2 && <div className="flex-1 h-0.5 rounded-full" style={{ background: i < stepIdx ? '#00A884' : '#E2E8F0' }} />}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 1: Account ── */}
        {step === 'account' && (
          <div className="w-full max-w-md kh-card p-5 sm:p-8">
            <h2 className="text-lg sm:text-xl font-bold text-ink-900 mb-1">Create your account</h2>
            <p className="text-sm text-ink-400 mb-5">Start your KadeHub journey</p>
            <form onSubmit={submitAccount} className="space-y-3 sm:space-y-4">
              <Input label="Shop / Business Name" placeholder="e.g. Perera Grocery" required
                value={account.shopName} onChange={e => handleShopNameChange(e.target.value)} />
              <Input label="Your Full Name" placeholder="e.g. Nimal Perera" required
                value={account.name} onChange={e => setAccount(a => ({ ...a, name: e.target.value }))} />

              {/* Subdomain field */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-ink-700">Your Shop Subdomain</label>
                <div className="flex items-center border rounded-lg overflow-hidden bg-white"
                  style={{ borderColor: subdomainStatus === 'available' ? '#00A884' : subdomainStatus === 'taken' || subdomainStatus === 'invalid' ? '#ef4444' : '#e2e8f0' }}>
                  <input
                    className="flex-1 px-3 py-2.5 text-sm text-ink-800 outline-none bg-transparent"
                    placeholder="yourshop"
                    required
                    minLength={3}
                    maxLength={30}
                    value={account.subdomain}
                    onChange={e => setAccount(a => ({ ...a, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                  />
                  <span className="px-3 py-2.5 text-xs font-semibold text-ink-400 bg-ink-50 border-l border-ink-200 whitespace-nowrap">.kadehub.com</span>
                </div>
                <div className="flex items-center gap-1.5 min-h-[18px]">
                  {subdomainStatus === 'checking' && <span className="text-xs text-ink-400">⏳ Checking availability...</span>}
                  {subdomainStatus === 'available' && <span className="text-xs font-medium" style={{ color: '#00A884' }}>✓ <strong>{account.subdomain}.kadehub.com</strong> is available!</span>}
                  {subdomainStatus === 'taken' && <span className="text-xs text-red-500">✗ Already taken — try another</span>}
                  {subdomainStatus === 'invalid' && <span className="text-xs text-red-500">✗ Use lowercase letters, numbers, hyphens only (min 3 chars)</span>}
                </div>
              </div>
              <Input label="Email Address" type="email" placeholder="you@example.com" required
                value={account.email} onChange={e => setAccount(a => ({ ...a, email: e.target.value }))} />
              <Input label="Password" type="password" placeholder="Min 6 characters" required
                value={account.password} onChange={e => setAccount(a => ({ ...a, password: e.target.value }))} />
              <button type="submit" disabled={loading}
                className="kh-btn-primary w-full py-3 rounded-xl flex items-center justify-center gap-2 text-sm sm:text-base">
                {loading ? <Loader2 size={16} className="animate-spin" /> : <>Continue <ChevronRight size={16} /></>}
              </button>
            </form>
          </div>
        )}

        {/* ── STEP 2: Company Details ── */}
        {step === 'company' && (
          <div className="w-full max-w-xl kh-card p-5 sm:p-8">
            <div className="flex items-center gap-3 mb-5 sm:mb-6">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#E0F2F1' }}>
                <Building2 size={20} style={{ color: '#00A884' }} />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-ink-900">Company Details</h2>
                <p className="text-xs sm:text-sm text-ink-400">This appears on your receipts and invoices</p>
              </div>
            </div>
            <form onSubmit={submitCompany} className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="col-span-1 sm:col-span-2">
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
              <div className="col-span-1 sm:col-span-2">
                <Input label="Tax / VAT Number (optional)" placeholder="VAT123456789"
                  value={company.tax_number} onChange={e => setCompany(c => ({ ...c, tax_number: e.target.value }))} />
              </div>
              <div className="col-span-1 sm:col-span-2 flex gap-3 pt-2">
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

        {/* ── STEP 3: Registration Fee Payment ── */}
        {step === 'payment' && (
          <div className="w-full max-w-md">
            <div className="kh-card p-6 sm:p-8">
              <h2 className="text-lg sm:text-xl font-bold text-ink-900 mb-1">Registration Fee</h2>
              <p className="text-sm text-ink-400 mb-6">A one-time registration fee is required to activate your shop.</p>

              {/* Fee breakdown */}
              <div className="rounded-xl p-4 mb-5" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-ink-600">One-time registration fee</span>
                  <span className="font-bold text-ink-900">{fmt(registrationFee)}</span>
                </div>
                <div className="flex justify-between text-xs text-ink-400 mb-3">
                  <span>Includes 14-day free trial of all modules</span>
                </div>
                <div className="border-t border-ink-100 pt-3 flex justify-between font-bold">
                  <span>Total due today</span>
                  <span style={{ color: '#00A884' }}>{fmt(registrationFee)}</span>
                </div>
              </div>

              {/* What you get */}
              <div className="rounded-xl p-4 mb-5" style={{ background: '#E0F2F1', border: '1px solid #B2DFDB' }}>
                <p className="text-xs font-semibold mb-2" style={{ color: '#00A884' }}>What you get after payment:</p>
                <ul className="space-y-1.5">
                  {['14-day free trial — all modules unlocked', 'Your custom subdomain: ' + account.subdomain + '.kadehub.com', 'Full POS, Inventory, Analytics & more', 'Choose a paid plan anytime from settings'].map(item => (
                    <li key={item} className="flex items-center gap-2 text-xs text-ink-700">
                      <Check size={12} style={{ color: '#00A884' }} /> {item}
                    </li>
                  ))}
                </ul>
              </div>

              <BankTransferForm
                type="registration_fee"
                amount={registrationFee}
                currency={currency}
                depositorDefault={account.name}
                onSuccess={() => { setPendingReview(true); setStep('done'); toast.success('Slip submitted for review'); }}
              />
              <button onClick={() => setStep('company')}
                className="mt-3 text-xs text-ink-400 hover:text-ink-700 flex items-center gap-1 mx-auto">
                <ArrowLeft size={12} /> Back
              </button>
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
            <h2 className="text-2xl font-bold text-ink-900 mb-2">
              {pendingReview ? 'Slip received' : "You're all set! 🎉"}
            </h2>
            {pendingReview ? (
              <>
                <p className="text-ink-400 mb-2">We will activate your 14-day trial after verifying the bank transfer.</p>
                <p className="text-sm text-ink-400 mb-2">
                  Your shop will go live at: <strong style={{ color: '#00A884' }}>{account.subdomain}.kadehub.com</strong>
                </p>
                <p className="text-xs text-ink-400 mb-8">You can sign in anytime — access unlocks once the slip is approved.</p>
                <button onClick={() => router.push('/login')}
                  className="kh-btn-primary w-full py-3 rounded-xl text-base font-bold flex items-center justify-center gap-2">
                  Back to sign in <ChevronRight size={16} />
                </button>
              </>
            ) : (
              <>
                <p className="text-ink-400 mb-2">Registration fee paid. Your 14-day free trial is now active.</p>
                <p className="text-sm text-ink-400 mb-2">
                  Your shop is live at: <strong style={{ color: '#00A884' }}>{account.subdomain}.kadehub.com</strong>
                </p>
                <p className="text-xs text-ink-400 mb-8">Choose a paid plan anytime from Settings → Billing.</p>
                <button onClick={() => router.push('/pos')}
                  className="kh-btn-primary w-full py-3 rounded-xl text-base font-bold flex items-center justify-center gap-2">
                  Go to Dashboard <ChevronRight size={16} />
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
