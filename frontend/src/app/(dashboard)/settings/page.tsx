'use client';
import { useEffect, useRef, useState } from 'react';
import { Card } from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { LKR } from '../../../lib/format';
import api from '../../../lib/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../../hooks/useAuth';
import { Building2, Camera, CreditCard, Package, Check, Star, ArrowLeft, Loader2 } from 'lucide-react';

export default function SettingsPage() {
  const { setLogoUrl } = useAuthStore();
  const [tab, setTab] = useState<'company' | 'billing'>('company');

  // Company
  const [form, setForm] = useState({ address: '', city: '', country: '', phone: '', email: '', website: '', tax_number: '' });
  const [saving, setSaving] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState('');

  // Billing
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [currency, setCurrency] = useState<string>('LKR');
  const [regFee, setRegFee] = useState<number>(50000);
  const [billingLoaded, setBillingLoaded] = useState(false);
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedPkg, setSelectedPkg] = useState<any>(null);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    api.get('/billing/profile').then(r => {
      setForm({
        address: r.data.address || '', city: r.data.city || '',
        country: r.data.country || '', phone: r.data.phone || '',
        email: r.data.email || '', website: r.data.website || '',
        tax_number: r.data.tax_number || '',
      });
      setLogoPreview(r.data.logo_url || '');
      setLogoUrl(r.data.logo_url || null);
    }).catch(() => {});

    Promise.all([
      api.get('/billing/subscriptions'),
      api.get('/billing/transactions'),
      api.get('/billing/packages'),
    ]).then(([subs, txs, pkgs]) => {
      setSubscriptions(Array.isArray(subs.data) ? subs.data : []);
      setTransactions(Array.isArray(txs.data) ? txs.data : []);
      // /billing/packages always returns { currency, registrationFee, packages: [...] }
      setPackages(pkgs.data?.packages ?? []);
      setCurrency(pkgs.data?.currency ?? 'LKR');
      setRegFee(pkgs.data?.registrationFee ?? 50000);
    }).catch(() => {}).finally(() => setBillingLoaded(true));
  }, []);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch('/billing/profile', form);
      toast.success('Company details saved');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const uploadLogo = async (file: File) => {
    const fd = new FormData();
    fd.append('logo', file);
    try {
      const r = await api.post('/billing/profile/logo', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setLogoPreview(r.data.logo_url);
      setLogoUrl(r.data.logo_url);
      toast.success('Logo updated');
    } catch { toast.error('Failed to upload logo'); }
  };

  const submitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPkg) return;
    setPaying(true);
    try {
      const res = await api.post('/billing/onepay/initiate', {
        package_id: selectedPkg.id,
        billing_cycle: billing,
        ...(!activeSub && { registration_fee: regFee }),
      });
      window.location.href = res.data.payment_url;
    } catch (err: any) {
      const msg = err.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'Payment failed');
      setPaying(false);
    }
  };

  const activeSub = subscriptions[0];
  const currentPkg = packages.find(p => p.id === activeSub?.package_id) ?? null;
  const price = selectedPkg ? (billing === 'yearly' ? selectedPkg.price_yearly : selectedPkg.price_monthly) : 0;
  const [userCount, setUserCount] = useState<number | null>(null);

  useEffect(() => {
    api.get('/tenant/users').then(r => setUserCount(Array.isArray(r.data) ? r.data.length : null)).catch(() => {});
  }, []);

  // Handle OnePay return redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    const ref    = params.get('ref');
    if (status === 'success' && ref) {
      setTab('billing');
      api.get(`/billing/onepay/verify/${ref}`)
        .then(r => {
          if (r.data.status === 'completed') {
            toast.success('Payment successful! Your plan is now active.');
          } else {
            toast.error('Payment is still being processed. Please wait a moment.');
          }
        })
        .catch(() => toast.error('Could not verify payment.'))
        .finally(() => {
          // Clean URL
          window.history.replaceState({}, '', '/settings?tab=billing');
          setBillingLoaded(false);
          Promise.all([
            api.get('/billing/subscriptions'),
            api.get('/billing/transactions'),
            api.get('/billing/packages'),
          ]).then(([subs, txs, pkgs]) => {
            setSubscriptions(Array.isArray(subs.data) ? subs.data : []);
            setTransactions(Array.isArray(txs.data) ? txs.data : []);
            setPackages(pkgs.data?.packages ?? []);
            setCurrency(pkgs.data?.currency ?? 'LKR');
            setRegFee(pkgs.data?.registrationFee ?? 50000);
          }).finally(() => setBillingLoaded(true));
        });
    }
  }, []);

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-white border border-ink-200 w-full sm:w-fit overflow-x-auto">
        {[
          { key: 'company', label: 'Company Profile', icon: Building2 },
          { key: 'billing', label: 'Billing & Plan', icon: CreditCard },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key as any)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all flex-1 sm:flex-none justify-center"
            style={{ background: tab === key ? '#00A884' : 'transparent', color: tab === key ? 'white' : '#64748B' }}>
            <Icon size={15} />{label}
          </button>
        ))}
      </div>

      {/* ── Company Profile ── */}
      {tab === 'company' && (
        <Card>
          <h3 className="font-semibold text-ink-800 mb-5">Company Profile</h3>
          <div className="flex items-center gap-5 mb-6 pb-6 border-b border-ink-100">
            <div className="relative">
              {logoPreview
                ? <img src={logoPreview} alt="logo" className="w-20 h-20 rounded-xl object-contain border border-ink-200 bg-white p-1" />
                : <div className="w-20 h-20 rounded-xl bg-ink-100 flex items-center justify-center text-ink-400"><Building2 size={28} /></div>
              }
              <button onClick={() => logoRef.current?.click()}
                className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full bg-white border border-ink-200 flex items-center justify-center hover:bg-ink-50 shadow-sm">
                <Camera size={13} style={{ color: '#00A884' }} />
              </button>
              <input ref={logoRef} type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) { setLogoPreview(URL.createObjectURL(f)); uploadLogo(f); } }} />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink-700">Company Logo</p>
              <p className="text-xs text-ink-400 mt-0.5">PNG, JPG or SVG · Max 5MB</p>
            </div>
          </div>
          <form onSubmit={saveProfile} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="col-span-2">
              <Input label="Business Address" placeholder="No 45, Main Street"
                value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
            </div>
            <Input label="City" placeholder="Colombo" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
            <Input label="Country" placeholder="Country" value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} />
            <Input label="Phone" placeholder="0112345678" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            <Input label="Business Email" type="email" placeholder="shop@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            <Input label="Website" placeholder="www.yourshop.lk" value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} />
            <Input label="Tax / VAT Number" placeholder="VAT123456789" value={form.tax_number} onChange={e => setForm(f => ({ ...f, tax_number: e.target.value }))} />
            <div className="col-span-2 flex justify-between items-center pt-2">
              <button type="button" onClick={() => setTab('billing')} className="text-sm font-semibold" style={{ color: '#00A884' }}>
                Upgrade Plan →
              </button>
              <Button type="submit" loading={saving}>Save Changes</Button>
            </div>
          </form>
        </Card>
      )}

      {/* ── Billing & Plan ── */}
      {tab === 'billing' && (
        <div className="space-y-5">

          {/* ── Payment form (shown when a package is selected) ── */}
          {!billingLoaded ? (
            <div className="py-16 text-center text-ink-400 text-sm">Loading billing info…</div>
          ) : selectedPkg ? (
            <Card>
              <div className="flex items-center gap-3 mb-5">
                <button onClick={() => setSelectedPkg(null)} className="text-ink-400 hover:text-ink-700">
                  <ArrowLeft size={18} />
                </button>
                <h3 className="font-semibold text-ink-800">Complete Payment</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
                {/* Payment form */}
                <div className="md:col-span-3 space-y-4">
                  <div className="rounded-xl p-5 text-center space-y-3" style={{ background: '#E0F2F1', border: '1.5px solid #B2DFDB' }}>
                    <p className="font-bold text-ink-800">Pay securely with OnePay</p>
                    <p className="text-xs text-ink-500">Supports Visa, Mastercard, LANKAQR &amp; internet banking.</p>
                    <div className="flex justify-center gap-2">
                      {['VISA', 'MC', 'QR', 'Bank'].map(m => (
                        <span key={m} className="px-2 py-0.5 rounded text-xs font-bold bg-white border border-ink-200 text-ink-600">{m}</span>
                      ))}
                    </div>
                  </div>
                  <form onSubmit={submitPayment} className="space-y-3">
                    <button type="submit" disabled={paying}
                      className="w-full py-3 rounded-xl text-base font-bold flex items-center justify-center gap-2 text-white transition-all"
                      style={{ background: '#00A884' }}>
                      {paying ? <Loader2 size={18} className="animate-spin" /> : <>Proceed to OnePay &rarr;</>}
                    </button>
                    <p className="text-xs text-center text-ink-400">🔒 Secured via OnePay</p>
                  </form>
                </div>
                {/* Order summary */}
                <div className="md:col-span-2 rounded-xl p-4 h-fit" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                  <p className="font-semibold text-ink-800 mb-3">Order Summary</p>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-ink-600">{selectedPkg.name} Plan</span>
                    <span className="font-bold">{LKR(price)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-ink-400 mb-1">
                    <span>Billing</span><span className="capitalize">{billing}</span>
                  </div>
                  {!activeSub && (
                    <>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-ink-500">Registration fee</span>
                        <span className="flex items-center gap-1.5">
                          <span className="line-through text-ink-300">{LKR(regFee * 2)}</span>
                          <span className="font-bold" style={{ color: '#FF6B6B' }}>{LKR(regFee)}</span>
                        </span>
                      </div>
                      <div className="flex justify-between text-xs text-green-600 font-semibold mb-3">
                        <span>🎉 50% discount applied</span>
                        <span>-{LKR(regFee)}</span>
                      </div>
                    </>
                  )}
                  <div className="border-t border-ink-200 pt-3 mb-3 flex justify-between font-bold">
                    <span>Total</span>
                    <span style={{ color: '#00A884' }}>{LKR(!activeSub ? price + regFee : price)}</span>
                  </div>
                  <p className="text-xs font-semibold text-ink-500 mb-2">Included modules:</p>
                  {selectedPkg.modules?.map((m: any) => (
                    <div key={m.module_name} className="flex items-center gap-2 text-xs text-ink-600 mb-1">
                      <Check size={11} style={{ color: '#00A884' }} /> {m.module_name}
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ) : (
            <>
              {/* Current plan */}
              {activeSub && (
                <Card>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#E0F2F1' }}>
                        <Package size={18} style={{ color: '#00A884' }} />
                      </div>
                      <div>
                        <p className="font-semibold text-ink-800">{currentPkg ? `${currentPkg.name} Plan` : 'Free Plan'}</p>
                        <p className="text-xs text-ink-400 mt-0.5 capitalize">
                          {currentPkg
                            ? `${activeSub.billing_cycle || 'monthly'} billing · ${LKR(activeSub.billing_cycle === 'yearly' ? currentPkg.price_yearly : currentPkg.price_monthly)}`
                            : `${subscriptions.length} modules active`
                          }
                        </p>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: '#E0F2F1', color: '#00A884' }}>Active</span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-ink-400 text-xs">Started</p>
                      <p className="font-medium text-ink-700">{new Date(activeSub.started_at).toLocaleDateString('en-LK')}</p>
                    </div>
                    <div>
                      <p className="text-ink-400 text-xs">Renews</p>
                      <p className="font-medium text-ink-700">{activeSub.expires_at ? new Date(activeSub.expires_at).toLocaleDateString('en-LK') : '—'}</p>
                    </div>
                    {currentPkg && userCount !== null && (
                      <div className="col-span-2">
                        <p className="text-ink-400 text-xs mb-1">Employees</p>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 rounded-full bg-ink-100 overflow-hidden">
                            <div className="h-2 rounded-full transition-all"
                              style={{
                                width: currentPkg.employee_limit ? `${Math.min(100, (userCount / currentPkg.employee_limit) * 100)}%` : '10%',
                                background: currentPkg.employee_limit && userCount >= currentPkg.employee_limit ? '#FF6B6B' : '#00A884',
                              }} />
                          </div>
                          <span className="text-xs font-semibold text-ink-700 whitespace-nowrap">
                            {userCount} / {currentPkg.employee_limit ?? '∞'}
                          </span>
                        </div>
                        {currentPkg.employee_limit && userCount >= currentPkg.employee_limit && (
                          <p className="text-xs text-red-500 font-semibold mt-1">⚠ Limit reached — upgrade to add more employees</p>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="mt-4 pt-4 border-t border-ink-100">
                    <p className="text-xs font-semibold text-ink-500 mb-2">Active Modules</p>
                    <div className="flex flex-wrap gap-2">
                      {(currentPkg?.modules ?? subscriptions).map((s: any) => (
                        <span key={s.module_name} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
                          style={{ background: '#E0F2F1', color: '#00796B' }}>
                          <Check size={10} /> {s.module_name}
                        </span>
                      ))}
                    </div>
                  </div>
                </Card>
              )}

              {/* Package selection */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <p className="font-semibold text-ink-800">Choose a Plan</p>
                  <div className="flex gap-1 p-1 rounded-xl bg-white border border-ink-200">
                    {(['monthly', 'yearly'] as const).map(b => (
                      <button key={b} onClick={() => setBilling(b)}
                        className="px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all"
                        style={{ background: billing === b ? '#00A884' : 'transparent', color: billing === b ? 'white' : '#64748B' }}>
                        {b === 'yearly' ? 'Yearly — Save 17%' : 'Monthly'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {packages.map(pkg => {
                    const pkgPrice = billing === 'yearly' ? pkg.price_yearly : pkg.price_monthly;
                    const isCurrent = pkg.id === activeSub?.package_id;
                    return (
                      <div key={pkg.id} className="rounded-xl p-5 flex flex-col relative transition-all hover:shadow-md"
                        style={{ border: isCurrent ? '2px solid #00A884' : pkg.is_popular ? '2px solid #00A884' : '1px solid #E2E8F0', background: isCurrent ? '#F0FDF9' : 'white' }}>
                        {isCurrent && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold text-white flex items-center gap-1"
                            style={{ background: '#00A884' }}>
                            <Check size={10} fill="white" /> Current Plan
                          </div>
                        )}
                        {!isCurrent && pkg.is_popular && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold text-white flex items-center gap-1"
                            style={{ background: '#64748B' }}>
                            <Star size={10} fill="white" /> Most Popular
                          </div>
                        )}
                        <p className="font-bold text-ink-900">{pkg.name}</p>
                        <p className="text-xs text-ink-400 mt-0.5 mb-3">{pkg.description}</p>
                        <p className="text-2xl font-extrabold mb-1" style={{ color: '#00A884' }}>
                          {LKR(pkgPrice)}
                          <span className="text-xs font-normal text-ink-400 ml-1">/{billing === 'yearly' ? 'yr' : 'mo'}</span>
                        </p>
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: '#F1F5F9', color: '#475569' }}>
                            👤 {pkg.employee_limit ? `${pkg.employee_limit} employees` : 'Unlimited employees'}
                          </span>
                        </div>
                        <div className="flex-1 space-y-1 mb-4 mt-2">
                          <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: '#00796B' }}>
                            <Check size={11} style={{ color: '#00796B' }} /> Basic Report
                            <span className="px-1.5 py-0.5 rounded-full text-white font-bold" style={{ background: '#00A884', fontSize: '9px' }}>FREE</span>
                          </div>
                          {pkg.modules?.map((m: any) => (
                            <div key={m.module_name} className="flex items-center gap-2 text-xs text-ink-600">
                              <Check size={11} style={{ color: '#00A884' }} /> {m.module_name}
                            </div>
                          ))}
                        </div>
                        {isCurrent ? (
                          <div className="w-full py-2 rounded-xl text-sm font-bold text-center"
                            style={{ background: '#E0F2F1', color: '#00A884', border: '2px solid #00A884' }}>
                            ✓ Active Plan
                          </div>
                        ) : (
                          <button onClick={() => setSelectedPkg(pkg)}
                            className="w-full py-2 rounded-xl text-sm font-bold transition-all"
                            style={{ background: pkg.is_popular ? '#00A884' : 'white', color: pkg.is_popular ? 'white' : '#00A884', border: '2px solid #00A884' }}>
                            Select {pkg.name}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Transaction history */}
              <Card padding={false}>
                <div className="px-5 py-4 border-b border-ink-100">
                  <h3 className="font-semibold text-ink-800">Payment History</h3>
                </div>
                {transactions.length === 0 ? (
                  <p className="text-center text-ink-300 text-sm py-10">No transactions yet</p>
                ) : (
                  <div className="overflow-x-auto">
                  <table className="mob-cards w-full text-sm">
                    <thead>
                      <tr className="border-b border-ink-100">
                        {['Date', 'Plan', 'Billing', 'Gateway', 'Amount', 'Status'].map(h => (
                          <th key={h} className={`px-5 py-3 text-xs font-semibold text-ink-400 uppercase tracking-wide ${h === 'Amount' ? 'text-right' : 'text-left'}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map(tx => (
                        <tr key={tx.id} className="border-b border-ink-50 hover:bg-ink-50 last:border-0">
                          <td data-label="Date" className="px-5 py-3 text-ink-500 text-xs">{new Date(tx.created_at).toLocaleDateString('en-LK')}</td>
                          <td data-label="Plan" className="px-5 py-3 font-medium text-ink-700">{tx.package?.name}</td>
                          <td data-label="Billing" className="px-5 py-3 text-ink-500 capitalize">{tx.billing_cycle}</td>
                          <td data-label="Gateway" className="px-5 py-3 text-ink-500 capitalize">{tx.gateway}</td>
                          <td data-label="Amount" className="px-5 py-3 text-right font-bold" style={{ color: '#FF7A00' }}>{LKR(tx.amount)}</td>
                          <td data-label="Status" className="px-5 py-3">
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                              style={{ background: tx.status === 'completed' ? '#E0F2F1' : '#FFF0F0', color: tx.status === 'completed' ? '#00796B' : '#E53E3E' }}>
                              {tx.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                )}
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  );
}
