'use client';
import { useEffect, useState } from 'react';
import { LogOut, LayoutGrid, ShieldCheck, UserRound, KeyRound, Store, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import KadeHubLogo from '../../components/ui/KadeHubLogo';
import ProductIcon from '../../components/platform/ProductIcon';
import { MascotState } from '../../components/brand/Mascot';
import { useAuthHydrated, useAuthStore } from '../../hooks/useAuth';
import { ROOT_DOMAIN, getProduct, productUrl, type ProductSlug } from '../../lib/platform';
import api from '../../lib/api';

import { onColor } from '../../lib/color';
type ProductState = 'not_started' | 'trial' | 'active' | 'expired' | 'free';
type ProductRow = {
  slug: ProductSlug; name: string; tagline: string; color: string; state: ProductState;
  plan: string | null; billing_cycle: string | null; expires_at: string | null; days_left: number | null;
};
type Account = {
  user: { id: number; name: string; email: string; phone: string | null; role: string };
  business: { name: string; subdomain: string | null } | null;
  products: ProductRow[];
};

const STATE_BADGE: Record<ProductState, { text: string; cls: string }> = {
  active:      { text: 'Active',      cls: 'kh-badge-green' },
  trial:       { text: 'Free trial',  cls: 'kh-badge-blue' },
  expired:     { text: 'Expired',     cls: 'kh-badge-red' },
  not_started: { text: 'Not started', cls: 'kh-badge-gray' },
  free:        { text: 'Free',        cls: 'kh-badge-green' },
};

/** Where each product manages plans and payments. */
const BILLING_PATH: Record<ProductSlug, string> = { pos: '/settings?tab=billing', cod: '/billing', tasks: '/' };
const RENEW_PATH: Record<ProductSlug, string> = { pos: '/subscribe', cod: '/billing', tasks: '/' };
/** After turning a product on: COD still needs its business set-up wizard. */
const AFTER_ENABLE_PATH: Record<ProductSlug, string> = { pos: '/dashboard', cod: '/register', tasks: '/' };

const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

// kadehub.com/account — one place for profile, password and every product's subscription.
export default function AccountPage() {
  const hydrated = useAuthHydrated();
  const { token, user, setAuth, logout } = useAuthStore();
  const [account, setAccount] = useState<Account | null>(null);
  const [failed, setFailed] = useState(false);
  const [profile, setProfile] = useState({ name: '', phone: '' });
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [saving, setSaving] = useState<'profile' | 'password' | ProductSlug | null>(null);

  const load = () => {
    setFailed(false);
    api.get<Account>('/platform/account').then(({ data }) => {
      // Colours and display names come from the frontend registry (the API only knows slugs and states)
      setAccount({ ...data, products: data.products.filter(p => getProduct(p.slug)?.listed).map(p => ({ ...p, color: getProduct(p.slug)?.color ?? '#00796B' })) });
      setProfile({ name: data.user.name, phone: data.user.phone ?? '' });
    }).catch(() => setFailed(true));
  };

  useEffect(() => {
    if (!hydrated) return;
    if (!token) { window.location.href = '/login'; return; }
    load();
  }, [hydrated, token]);

  const isAdmin = account?.user.role === 'ADMIN' || account?.user.role === 'SUPER_ADMIN';

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving('profile');
    try {
      const { data } = await api.patch('/platform/account', profile);
      if (user && token) setAuth({ ...user, name: data.name }, token);
      toast.success('Profile saved');
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message?.[0] ?? err?.response?.data?.message ?? 'Could not save profile');
    } finally { setSaving(null); }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (pw.next !== pw.confirm) { toast.error('New passwords do not match'); return; }
    setSaving('password');
    try {
      await api.post('/platform/account/password', { current_password: pw.current, new_password: pw.next });
      toast.success('Password changed');
      setPw({ current: '', next: '', confirm: '' });
    } catch (err: any) {
      const m = err?.response?.data?.message;
      toast.error(Array.isArray(m) ? m[0] : m ?? 'Could not change password');
    } finally { setSaving(null); }
  }

  async function startProduct(p: ProductRow) {
    setSaving(p.slug);
    try {
      await api.post(`/platform/enable/${p.slug}`);
      window.location.assign(productUrl(p.slug, AFTER_ENABLE_PATH[p.slug]));
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? `Could not start ${p.name}`);
      setSaving(null);
    }
  }

  if (failed) {
    return <Page><MascotState variant="error" title="Couldn’t load your account" description="Check your connection and try again."
      action={<button onClick={load} className="px-4 py-2 rounded-xl text-sm font-bold kh-btn-primary">Try again</button>} /></Page>;
  }
  if (!account) return <Page><MascotState variant="loading" size="sm" title="Loading your account…" /></Page>;

  return (
    <Page onSignOut={() => { logout(); window.location.href = '/login'; }} isSuperAdmin={account.user.role === 'SUPER_ADMIN'}>
      <h1 className="text-2xl font-extrabold text-ink-900">Account & subscriptions</h1>
      <p className="mt-1 text-sm text-ink-500">One KadeHub account for every app. Manage your details and see each app’s plan here.</p>

      {/* Subscriptions */}
      <section className="mt-8 kh-card overflow-hidden">
        <div className="px-5 py-4 border-b border-ink-100">
          <h2 className="font-bold text-ink-900">Your apps</h2>
          <p className="text-xs text-ink-400 mt-0.5">Each app has its own plan. Plans and payments are managed inside each app.</p>
        </div>
        <ul className="divide-y divide-ink-100">
          {account.products.map(p => {
            const badge = STATE_BADGE[p.state];
            return (
              <li key={p.slug} className="group px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <ProductIcon slug={p.slug} color={p.color} size={40} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-ink-900">{p.name}</span>
                      <span className={`text-2xs font-semibold px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.text}</span>
                    </div>
                    <p className="text-xs text-ink-500 mt-0.5">{statusLine(p)}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 sm:justify-end">
                  {p.state === 'not_started' ? (
                    isAdmin ? (
                      <button onClick={() => startProduct(p)} disabled={saving === p.slug}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-60" style={{ background: p.color, color: onColor(p.color) }}>
                        {saving === p.slug ? 'Starting…' : p.slug === 'tasks' ? 'Join free' : 'Start free trial'} <ArrowRight size={14} />
                      </button>
                    ) : <span className="text-xs text-ink-400">Ask your account owner to turn this on</span>
                  ) : (
                    <>
                      {p.state !== 'expired' && (
                        <a href={productUrl(p.slug)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold" style={{ background: p.color, color: onColor(p.color) }}>
                          Open <ArrowRight size={14} />
                        </a>
                      )}
                      {p.slug !== 'tasks' && isAdmin && (
                        <a href={productUrl(p.slug, p.state === 'expired' ? RENEW_PATH[p.slug] : BILLING_PATH[p.slug])}
                          className={`inline-flex items-center px-4 py-2 rounded-xl text-sm font-bold ${p.state === 'expired' ? 'text-white' : 'border-2 border-ink-200 text-ink-700 hover:bg-ink-50'}`}
                          style={p.state === 'expired' ? { background: p.color } : undefined}>
                          {p.state === 'expired' ? 'Renew plan' : p.state === 'trial' ? 'Choose a plan' : 'Manage billing'}
                        </a>
                      )}
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Profile */}
        <form onSubmit={saveProfile} className="kh-card p-5">
          <h2 className="flex items-center gap-2 font-bold text-ink-900"><UserRound size={18} className="text-ink-400" /> Profile</h2>
          <div className="mt-4 space-y-3">
            <Field label="Full name">
              <input value={profile.name} onChange={e => setProfile(s => ({ ...s, name: e.target.value }))} required minLength={2} className={inputCls} />
            </Field>
            <Field label="Email" hint="Your sign-in email can’t be changed here.">
              <input value={account.user.email} readOnly className={`${inputCls} bg-ink-50 text-ink-500`} />
            </Field>
            <Field label="Phone">
              <input value={profile.phone} onChange={e => setProfile(s => ({ ...s, phone: e.target.value }))} className={inputCls} placeholder="07X XXX XXXX" />
            </Field>
          </div>
          <button disabled={saving === 'profile'} className="mt-4 px-4 py-2 rounded-xl text-sm font-bold kh-btn-primary">{saving === 'profile' ? 'Saving…' : 'Save profile'}</button>
        </form>

        {/* Password */}
        <form onSubmit={changePassword} className="kh-card p-5">
          <h2 className="flex items-center gap-2 font-bold text-ink-900"><KeyRound size={18} className="text-ink-400" /> Password</h2>
          <p className="text-xs text-ink-400 mt-1">Changing it here changes it for every KadeHub app.</p>
          <div className="mt-4 space-y-3">
            <Field label="Current password">
              <input type="password" value={pw.current} onChange={e => setPw(s => ({ ...s, current: e.target.value }))} required className={inputCls} autoComplete="current-password" />
            </Field>
            <Field label="New password" hint="At least 8 characters, with an uppercase letter and a number.">
              <input type="password" value={pw.next} onChange={e => setPw(s => ({ ...s, next: e.target.value }))} required minLength={8} className={inputCls} autoComplete="new-password" />
            </Field>
            <Field label="Confirm new password">
              <input type="password" value={pw.confirm} onChange={e => setPw(s => ({ ...s, confirm: e.target.value }))} required minLength={8} className={inputCls} autoComplete="new-password" />
            </Field>
          </div>
          <button disabled={saving === 'password'} className="mt-4 px-4 py-2 rounded-xl text-sm font-bold kh-btn-primary">{saving === 'password' ? 'Saving…' : 'Change password'}</button>
        </form>
      </div>

      {/* Business */}
      {account.business && (
        <section className="mt-6 kh-card p-5">
          <h2 className="flex items-center gap-2 font-bold text-ink-900"><Store size={18} className="text-ink-400" /> Business</h2>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2 text-sm">
            <div><dt className="text-xs text-ink-400">Business name</dt><dd className="font-semibold text-ink-800">{account.business.name}</dd></div>
            <div>
              <dt className="text-xs text-ink-400">Shop address</dt>
              <dd className="font-semibold text-ink-800">
                {account.business.subdomain ? `${account.business.subdomain}.${ROOT_DOMAIN}` : <span className="text-ink-400 font-normal">Not set (only POS shops get one)</span>}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-ink-400">Business details, logo and invoice settings are edited inside each app’s Settings.</p>
        </section>
      )}
    </Page>
  );

  function statusLine(p: ProductRow) {
    const plan = p.plan ? `${p.plan}` : '';
    switch (p.state) {
      case 'active':  return [plan || 'Paid plan', p.billing_cycle, p.expires_at && `renews or ends ${fmtDate(p.expires_at)}`].filter(Boolean).join(' · ');
      case 'trial':   return `Free trial · ${p.days_left ?? 0} day${p.days_left === 1 ? '' : 's'} left${p.expires_at ? ` (ends ${fmtDate(p.expires_at)})` : ''}`;
      case 'expired': return `${plan ? `${plan} · ` : ''}Ended ${fmtDate(p.expires_at)} — renew to keep using it`;
      case 'free':    return 'Free to use · post tasks and make offers';
      default:        return p.tagline;
    }
  }
}

const inputCls = 'w-full border border-ink-200 rounded-lg bg-white text-ink-800 text-sm px-3 py-2.5 focus:outline-none focus:border-teal';

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-ink-600 mb-1">{label}</span>
      {children}
      {hint && <span className="block text-2xs text-ink-400 mt-1">{hint}</span>}
    </label>
  );
}

function Page({ children, onSignOut, isSuperAdmin }: { children: React.ReactNode; onSignOut?: () => void; isSuperAdmin?: boolean }) {
  return (
    <div className="min-h-screen" style={{ background: '#F1F5F9' }}>
      <header className="bg-white border-b border-ink-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <a href="/"><KadeHubLogo width={132} theme="color" /></a>
          <nav className="flex items-center gap-1">
            {isSuperAdmin && (
              <a href="/super-admin" className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-ink-600 hover:bg-ink-50">
                <ShieldCheck size={16} /> Super admin
              </a>
            )}
            <a href="/apps" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-ink-600 hover:bg-ink-50">
              <LayoutGrid size={16} /> Apps
            </a>
            {onSignOut && (
              <button onClick={onSignOut} className="p-2 rounded-xl text-ink-500 hover:bg-red-50 hover:text-red-600" title="Sign out" aria-label="Sign out">
                <LogOut size={17} />
              </button>
            )}
          </nav>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">{children}</main>
    </div>
  );
}
