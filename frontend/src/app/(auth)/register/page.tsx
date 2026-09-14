'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../lib/api';
import { useAuthStore } from '../../../hooks/useAuth';
import KadeHubLogo from '../../../components/ui/KadeHubLogo';
import { Input } from '../../../components/ui/Input';
import toast from 'react-hot-toast';
import {
  Check, ChevronRight, Building2, ArrowLeft, Loader2,
} from 'lucide-react';

type Step = 'account' | 'company' | 'done';

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [step, setStep] = useState<Step>('account');
  const [loading, setLoading] = useState(false);

  const [account, setAccount] = useState({ shopName: '', name: '', email: '', password: '', subdomain: '' });
  const [subdomainStatus, setSubdomainStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [company, setCompany] = useState({ address: '', city: '', phone: '', email: '', website: '', tax_number: '' });

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

  const handleShopNameChange = (value: string) => {
    const suggested = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30);
    setAccount(a => ({ ...a, shopName: value, subdomain: suggested }));
  };

  const submitAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (subdomainStatus === 'taken') return toast.error('Subdomain is already taken');
    if (subdomainStatus === 'invalid' || !account.subdomain) return toast.error('Enter a valid subdomain');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', account);
      setAuth(data.user, data.access_token);
      toast.success('14-day free trial activated!');
      setStep('company');
    } catch (err: any) {
      const msg = err.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'Registration failed');
    } finally { setLoading(false); }
  };

  const submitCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.patch('/billing/profile', { ...company, email: company.email || account.email });
      setStep('done');
    } catch (err: any) {
      const msg = err.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'Failed to save company details');
    } finally { setLoading(false); }
  };

  const STEPS: Step[] = ['account', 'company'];
  const stepIdx = STEPS.indexOf(step === 'done' ? 'company' : step);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F1F5F9' }}>
      <header className="bg-white border-b border-ink-200 px-6 py-4 flex items-center justify-between">
        <KadeHubLogo height={32} />
        <a href="/login" className="text-sm text-ink-500 hover:text-ink-800 transition-colors">
          Already have an account? Sign in
        </a>
      </header>

      <div className="flex-1 flex flex-col items-center py-10 px-4">
        {step !== 'done' && (
          <div className="w-full max-w-2xl mb-8">
            <div className="flex items-center gap-2">
              {['Account', 'Company'].map((label, i) => (
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
                  {i < 1 && <div className="flex-1 h-0.5 rounded-full" style={{ background: i < stepIdx ? '#00A884' : '#E2E8F0' }} />}
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 'account' && (
          <div className="w-full max-w-md kh-card p-5 sm:p-8">
            <h2 className="text-lg sm:text-xl font-bold text-ink-900 mb-1">Create your account</h2>
            <p className="text-sm text-ink-400 mb-1">Start your 14-day free trial — no payment required</p>
            <p className="text-xs text-ink-400 mb-5">Full access to all modules. Choose a plan after your trial ends.</p>
            <form onSubmit={submitAccount} className="space-y-3 sm:space-y-4">
              <Input label="Shop / Business Name" placeholder="e.g. Perera Grocery" required
                value={account.shopName} onChange={e => handleShopNameChange(e.target.value)} />
              <Input label="Your Full Name" placeholder="e.g. Nimal Perera" required
                value={account.name} onChange={e => setAccount(a => ({ ...a, name: e.target.value }))} />

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
                  {subdomainStatus === 'checking' && <span className="text-xs text-ink-400">Checking availability...</span>}
                  {subdomainStatus === 'available' && <span className="text-xs font-medium" style={{ color: '#00A884' }}>{account.subdomain}.kadehub.com is available</span>}
                  {subdomainStatus === 'taken' && <span className="text-xs text-red-500">Already taken — try another</span>}
                  {subdomainStatus === 'invalid' && <span className="text-xs text-red-500">Use lowercase letters, numbers, hyphens only (min 3 chars)</span>}
                </div>
              </div>
              <Input label="Email Address" type="email" placeholder="you@example.com" required
                value={account.email} onChange={e => setAccount(a => ({ ...a, email: e.target.value }))} />
              <Input label="Password" type="password" placeholder="Min 6 characters" required
                value={account.password} onChange={e => setAccount(a => ({ ...a, password: e.target.value }))} />
              <button type="submit" disabled={loading}
                className="kh-btn-primary w-full py-3 rounded-xl flex items-center justify-center gap-2 text-sm sm:text-base">
                {loading ? <Loader2 size={16} className="animate-spin" /> : <>Start Free Trial <ChevronRight size={16} /></>}
              </button>
            </form>
          </div>
        )}

        {step === 'company' && (
          <div className="w-full max-w-xl kh-card p-5 sm:p-8">
            <div className="flex items-center gap-3 mb-5 sm:mb-6">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#E0F2F1' }}>
                <Building2 size={20} style={{ color: '#00A884' }} />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-ink-900">Company Details</h2>
                <p className="text-xs sm:text-sm text-ink-400">Optional — appears on receipts and invoices</p>
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
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <>Finish Setup <ChevronRight size={16} /></>}
                </button>
              </div>
            </form>
          </div>
        )}

        {step === 'done' && (
          <div className="w-full max-w-md kh-card p-10 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: '#E0F2F1' }}>
              <Check size={32} style={{ color: '#00A884' }} />
            </div>
            <h2 className="text-2xl font-bold text-ink-900 mb-2">You&apos;re all set!</h2>
            <p className="text-ink-400 mb-2">Your 14-day free trial is now active with full access to all modules.</p>
            <p className="text-sm text-ink-400 mb-2">
              Your shop: <strong style={{ color: '#00A884' }}>{account.subdomain}.kadehub.com</strong>
            </p>
            <p className="text-xs text-ink-400 mb-8">
              After your trial, choose a plan from Settings. A one-time registration fee (LKR 25,000) applies with your first subscription payment.
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
