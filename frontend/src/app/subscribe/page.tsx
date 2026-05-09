'use client';
import { useState } from 'react';
import { useAuthStore } from '../../hooks/useAuth';
import api from '../../lib/api';

const PLANS = [
  {
    id: 1,
    name: 'Starter',
    price: { mo: 2999, yr: 2499 },
    features: ['3 employees', 'POS system', 'Inventory management', 'Basic reports', 'Email support'],
    popular: false,
  },
  {
    id: 2,
    name: 'Pro',
    price: { mo: 4999, yr: 4149 },
    features: ['10 employees', 'POS system', 'Inventory management', 'Customer CRM & Loyalty', 'Supplier management', 'Expense tracking', 'Priority support'],
    popular: true,
  },
  {
    id: 3,
    name: 'Enterprise',
    price: { mo: 9999, yr: 8299 },
    features: ['Unlimited employees', 'All Pro features', 'Analytics dashboard', 'Staff & shifts', 'Credit & debt tracking', 'Discount & promotions', 'Batch & expiry tracking', 'Dedicated support'],
    popular: false,
  },
];

const BANK_DETAILS = [
  { label: 'Bank', value: 'Commercial Bank of Ceylon' },
  { label: 'Account Name', value: 'KadeHub (Pvt) Ltd' },
  { label: 'Account Number', value: '8001234567' },
  { label: 'Branch', value: 'Colombo 03' },
];

type Plan = typeof PLANS[0];

function BankTransferModal({ plan, yearly, onClose, onSuccess }: {
  plan: Plan; yearly: boolean; onClose: () => void; onSuccess: () => void;
}) {
  const [form, setForm] = useState({ depositor_name: '', slip_reference: '', notes: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const amount = yearly ? plan.price.yr : plan.price.mo;

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '11px 14px', borderRadius: 10,
    border: '1.5px solid #e5e7eb', fontSize: 14, fontFamily: 'Poppins,sans-serif',
    fontWeight: 500, color: '#0f172a', outline: 'none', background: '#fff',
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await api.post('/billing/subscribe/bank-transfer', {
        package_id: plan.id,
        billing_cycle: yearly ? 'yearly' : 'monthly',
        depositor_name: form.depositor_name,
        slip_reference: form.slip_reference,
        notes: form.notes,
      });
      onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 80px rgba(0,0,0,0.25)', fontFamily: 'Poppins,sans-serif' }}>

        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg,#0d6e5a,#14a085)', padding: '24px 28px', borderRadius: '20px 20px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Subscribing to</div>
            <div style={{ color: '#fff', fontSize: 20, fontWeight: 800 }}>{plan.name} Plan</div>
            <div style={{ color: '#f5a623', fontSize: 22, fontWeight: 800, marginTop: 4 }}>
              LKR {amount.toLocaleString()}<span style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', fontWeight: 500 }}>/mo · {yearly ? 'Yearly' : 'Monthly'}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Bank details */}
          <div style={{ background: '#f0faf7', border: '1px solid #a7f3d0', borderRadius: 12, padding: '16px 20px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0d6e5a', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Bank Transfer Details</div>
            {BANK_DETAILS.map(d => (
              <div key={d.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #d1fae5' }}>
                <span style={{ fontSize: 13, color: '#6b7280', fontWeight: 500 }}>{d.label}</span>
                <span style={{ fontSize: 14, color: '#0f172a', fontWeight: 700 }}>{d.value}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8 }}>
              <span style={{ fontSize: 13, color: '#6b7280', fontWeight: 500 }}>Amount</span>
              <span style={{ fontSize: 15, color: '#0d6e5a', fontWeight: 800 }}>LKR {amount.toLocaleString()}</span>
            </div>
          </div>

          <p style={{ fontSize: 13, color: '#6b7280', fontWeight: 400, margin: 0, lineHeight: 1.6 }}>
            Transfer the exact amount to the account above, then fill in your details below. Your subscription will be activated immediately.
          </p>

          {/* Form */}
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Depositor Name *</label>
              <input required value={form.depositor_name} onChange={set('depositor_name')} placeholder="Name on the bank slip"
                style={inputStyle} onFocus={e => e.target.style.borderColor = '#0d6e5a'} onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Slip / Reference Number *</label>
              <input required value={form.slip_reference} onChange={set('slip_reference')} placeholder="e.g. TXN123456789"
                style={inputStyle} onFocus={e => e.target.style.borderColor = '#0d6e5a'} onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Notes <span style={{ color: '#9ca3af', fontWeight: 400 }}>(optional)</span></label>
              <textarea value={form.notes} onChange={set('notes')} rows={2} placeholder="Any additional info..."
                style={{ ...inputStyle, resize: 'vertical' }} onFocus={e => e.target.style.borderColor = '#0d6e5a'} onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
            </div>
            {error && <p style={{ color: '#dc2626', fontSize: 13, margin: 0, fontFamily: 'Poppins,sans-serif' }}>{error}</p>}
            <button type="submit" disabled={loading} style={{
              padding: '14px 0', borderRadius: 12, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              background: 'linear-gradient(135deg,#0d6e5a,#14a085)', color: '#fff',
              fontWeight: 700, fontSize: 15, fontFamily: 'Poppins,sans-serif',
              boxShadow: '0 4px 16px rgba(13,110,90,0.3)', opacity: loading ? 0.7 : 1, transition: 'all 0.2s',
            }}>
              {loading ? 'Activating…' : 'Confirm & Activate Subscription'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function SuccessScreen() {
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0a4f40,#0d6e5a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Poppins,sans-serif', padding: 24 }}>
      <div style={{ background: '#fff', borderRadius: 24, padding: '56px 48px', textAlign: 'center', maxWidth: 440, boxShadow: '0 24px 80px rgba(0,0,0,0.2)' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0d6e5a', marginBottom: 8 }}>Subscription Activated!</h2>
        <p style={{ color: '#6b7280', fontSize: 15, fontWeight: 400, lineHeight: 1.65, marginBottom: 32 }}>
          Your subscription is now active. Welcome to KadeHub — let's get back to running your shop.
        </p>
        <a href="/pos" style={{ display: 'inline-block', padding: '14px 36px', borderRadius: 12, background: 'linear-gradient(135deg,#0d6e5a,#14a085)', color: '#fff', fontWeight: 700, fontSize: 15, textDecoration: 'none', boxShadow: '0 4px 16px rgba(13,110,90,0.3)' }}>
          Go to POS →
        </a>
      </div>
    </div>
  );
}

export default function SubscribePage() {
  const [yearly, setYearly] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [success, setSuccess] = useState(false);
  const logout = useAuthStore(s => s.logout);

  if (success) return <SuccessScreen />;

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0a4f40 0%,#0d6e5a 50%,#0f8a6e 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', fontFamily: 'Poppins,sans-serif', position: 'relative' }}>

      <button onClick={() => { logout(); window.location.href = '/login'; }} style={{ position: 'absolute', top: 24, right: 24, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'Poppins,sans-serif' }}>
        Sign Out
      </button>

      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#0d6e5a', fontWeight: 800, fontSize: 20 }}>K</span>
          </div>
          <span style={{ color: '#fff', fontWeight: 800, fontSize: 22, letterSpacing: '-0.03em' }}>KadeHub</span>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(245,166,35,0.2)', border: '1px solid rgba(245,166,35,0.4)', borderRadius: 100, padding: '8px 20px', marginBottom: 20 }}>
          <span style={{ fontSize: 16 }}>⏰</span>
          <span style={{ color: '#f5a623', fontWeight: 700, fontSize: 14 }}>Your 14-day free trial has ended</span>
        </div>
        <h1 style={{ color: '#fff', fontSize: 'clamp(1.8rem,4vw,2.8rem)', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 12, lineHeight: 1.15 }}>Choose a Plan to Continue</h1>
        <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: 16, fontWeight: 400, maxWidth: 480, margin: '0 auto' }}>
          Pay via bank transfer and activate instantly. Your data is safe and waiting.
        </p>
      </div>

      {/* Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 36 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: !yearly ? '#fff' : 'rgba(255,255,255,0.5)' }}>Monthly</span>
        <button onClick={() => setYearly(y => !y)} style={{ width: 52, height: 28, borderRadius: 100, border: 'none', cursor: 'pointer', background: yearly ? '#f5a623' : 'rgba(255,255,255,0.25)', position: 'relative', transition: 'background 0.25s' }}>
          <span style={{ position: 'absolute', top: 3, left: yearly ? 26 : 3, width: 22, height: 22, borderRadius: '50%', background: '#fff', transition: 'left 0.25s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
        </button>
        <span style={{ fontSize: 14, fontWeight: 600, color: yearly ? '#fff' : 'rgba(255,255,255,0.5)' }}>Yearly</span>
        {yearly && <span style={{ background: '#f5a623', color: '#0a2e25', fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 100 }}>Save 17%</span>}
      </div>

      {/* Plans */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 20, width: '100%', maxWidth: 960, marginBottom: 40 }}>
        {PLANS.map(plan => (
          <div key={plan.name} style={{
            background: plan.popular ? '#fff' : 'rgba(255,255,255,0.1)',
            backdropFilter: plan.popular ? 'none' : 'blur(8px)',
            border: plan.popular ? '2px solid #f5a623' : '1px solid rgba(255,255,255,0.2)',
            borderRadius: 20, padding: '28px 24px', position: 'relative',
            transform: plan.popular ? 'scale(1.04)' : 'none',
            boxShadow: plan.popular ? '0 12px 48px rgba(0,0,0,0.2)' : 'none',
          }}>
            {plan.popular && (
              <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: '#f5a623', color: '#0a2e25', fontSize: 12, fontWeight: 700, padding: '4px 16px', borderRadius: 100, whiteSpace: 'nowrap' }}>Most Popular</div>
            )}
            <div style={{ fontSize: 17, fontWeight: 700, color: plan.popular ? '#0f172a' : '#fff', marginBottom: 8 }}>{plan.name}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: plan.popular ? '#6b7280' : 'rgba(255,255,255,0.6)' }}>LKR</span>
              <span style={{ fontSize: 34, fontWeight: 800, color: plan.popular ? '#0d6e5a' : '#fff', lineHeight: 1 }}>
                {(yearly ? plan.price.yr : plan.price.mo).toLocaleString()}
              </span>
              <span style={{ fontSize: 13, color: plan.popular ? '#9ca3af' : 'rgba(255,255,255,0.5)' }}>/mo</span>
            </div>
            {yearly && <div style={{ fontSize: 11, color: plan.popular ? '#6b7280' : 'rgba(255,255,255,0.55)', marginBottom: 4 }}>Billed annually</div>}
            <div style={{ height: 1, background: plan.popular ? '#e5e7eb' : 'rgba(255,255,255,0.15)', margin: '16px 0' }} />
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
              {plan.features.map(f => (
                <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: plan.popular ? '#374151' : 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
                  <span style={{ width: 16, height: 16, borderRadius: '50%', background: plan.popular ? '#e6f4f1' : 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="9" height="9" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke={plan.popular ? '#0d6e5a' : '#fff'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </span>
                  {f}
                </li>
              ))}
            </ul>
            <button onClick={() => setSelectedPlan(plan)} style={{
              width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: 14, fontFamily: 'Poppins,sans-serif', transition: 'all 0.2s',
              background: plan.popular ? 'linear-gradient(135deg,#0d6e5a,#14a085)' : 'rgba(255,255,255,0.15)',
              color: '#fff',
              boxShadow: plan.popular ? '0 4px 16px rgba(13,110,90,0.4)' : 'none',
            }}>
              Subscribe via Bank Transfer
            </button>
          </div>
        ))}
      </div>

      <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, fontWeight: 400, textAlign: 'center' }}>
        Need help?{' '}
        <a href="https://wa.me/94702470064" target="_blank" rel="noreferrer" style={{ color: '#25d366', fontWeight: 600, textDecoration: 'none' }}>
          Chat on WhatsApp +94 70 247 0064
        </a>
      </p>

      {selectedPlan && (
        <BankTransferModal
          plan={selectedPlan}
          yearly={yearly}
          onClose={() => setSelectedPlan(null)}
          onSuccess={() => { setSelectedPlan(null); setSuccess(true); }}
        />
      )}
    </div>
  );
}
