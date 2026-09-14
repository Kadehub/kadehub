'use client';
import { useEffect, useState } from 'react';

const WHATSAPP_URL = 'https://wa.me/94702470064';

function scrollTo(selector: string) {
  document.querySelector(selector)?.scrollIntoView({ behavior: 'smooth' });
}

function useReveal() {
  useEffect(() => {
    const root = document.querySelector('.landing-page');
    if (!root) return;
    const els = root.querySelectorAll('.reveal');
    const io = new IntersectionObserver(
      (entries) => entries.forEach(e => e.isIntersecting && e.target.classList.add('revealed')),
      { threshold: 0.12 },
    );
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);
}

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'Why Us', href: '#pain-points' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'Contact', href: '#contact' },
  ];

  const linkStyle = (scrolled: boolean): React.CSSProperties => ({
    padding: '8px 14px', borderRadius: 8, fontWeight: 600, fontSize: 14,
    color: scrolled ? '#374151' : 'rgba(255,255,255,0.88)',
    textDecoration: 'none', transition: 'all 0.2s', fontFamily: 'Poppins,sans-serif',
  });

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
      background: scrolled ? 'rgba(255,255,255,0.97)' : 'transparent',
      backdropFilter: scrolled ? 'blur(12px)' : 'none',
      boxShadow: scrolled ? '0 1px 24px rgba(0,0,0,0.08)' : 'none',
      transition: 'all 0.3s ease',
      borderBottom: scrolled ? '1px solid #e5e7eb' : 'none',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', height: 68 }}>
        <a href="#" onClick={e => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flexShrink: 0 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, #0d6e5a, #14a085)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(13,110,90,0.35)',
          }}>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 16, fontFamily: 'Poppins,sans-serif' }}>K</span>
          </div>
          <span style={{ fontWeight: 800, fontSize: 20, color: scrolled ? '#0d6e5a' : '#fff', fontFamily: 'Poppins,sans-serif', letterSpacing: '-0.03em' }}>
            KadeHub
          </span>
        </a>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto', marginRight: 16 }} className="nav-desktop">
          {navLinks.map(l => (
            <a key={l.label} href={l.href} onClick={e => { e.preventDefault(); scrollTo(l.href); }}
              style={linkStyle(scrolled)}
              onMouseEnter={e => (e.currentTarget.style.background = scrolled ? '#f3f4f6' : 'rgba(255,255,255,0.12)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >{l.label}</a>
          ))}
        </div>

        <div className="nav-desktop" style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <a href="/login" style={{
            padding: '10px 16px', borderRadius: 10, fontWeight: 600, fontSize: 14,
            color: scrolled ? '#0d6e5a' : '#fff', textDecoration: 'none',
            fontFamily: 'Poppins,sans-serif',
          }}>Sign In</a>
          <a href="/register" style={{
            padding: '10px 20px', borderRadius: 10, fontWeight: 700, fontSize: 14,
            background: scrolled ? 'linear-gradient(135deg,#0d6e5a,#14a085)' : '#f5a623',
            color: scrolled ? '#fff' : '#0a2e25',
            textDecoration: 'none', boxShadow: '0 2px 8px rgba(13,110,90,0.25)',
            fontFamily: 'Poppins,sans-serif',
          }}>Start Free Trial</a>
        </div>

        <button onClick={() => setMenuOpen(!menuOpen)} className="nav-mobile" aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: scrolled ? '#0d6e5a' : '#fff', padding: 8 }}>
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            {menuOpen ? (<><line x1="4" y1="4" x2="20" y2="20"/><line x1="20" y1="4" x2="4" y2="20"/></>) : (<><line x1="3" y1="7" x2="21" y2="7"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="17" x2="21" y2="17"/></>)}
          </svg>
        </button>
      </div>

      {menuOpen && (
        <div style={{ background: '#fff', borderTop: '1px solid #e5e7eb', padding: '12px 24px 20px' }}>
          {navLinks.map(l => (
            <a key={l.label} href={l.href} onClick={e => { e.preventDefault(); setMenuOpen(false); scrollTo(l.href); }}
              style={{ display: 'block', padding: '12px 0', fontWeight: 600, fontSize: 15, color: '#374151', textDecoration: 'none', borderBottom: '1px solid #f3f4f6', fontFamily: 'Poppins,sans-serif' }}>
              {l.label}
            </a>
          ))}
          <a href="/register" style={{ display: 'block', marginTop: 16, padding: '12px 0', textAlign: 'center', borderRadius: 10, background: '#f5a623', color: '#0a2e25', fontWeight: 700, fontSize: 15, textDecoration: 'none', fontFamily: 'Poppins,sans-serif' }}>
            Start Free Trial
          </a>
          <a href="/login" style={{ display: 'block', marginTop: 10, padding: '12px 0', textAlign: 'center', borderRadius: 10, border: '2px solid #0d6e5a', color: '#0d6e5a', fontWeight: 700, fontSize: 15, textDecoration: 'none', fontFamily: 'Poppins,sans-serif' }}>
            Sign In
          </a>
        </div>
      )}
    </nav>
  );
}

function Hero() {
  return (
    <section style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #0a4f40 0%, #0d6e5a 40%, #0f8a6e 70%, #1aab87 100%)',
      position: 'relative', overflow: 'hidden', padding: '120px 24px 80px',
    }}>
      <div style={{ position: 'absolute', inset: 0, opacity: 0.06 }}>
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)"/>
        </svg>
      </div>
      <div style={{ position: 'absolute', top: '10%', right: '8%', width: 320, height: 320, borderRadius: '50%', background: 'rgba(245,166,35,0.12)', filter: 'blur(60px)' }}/>
      <div style={{ position: 'absolute', bottom: '15%', left: '5%', width: 240, height: 240, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', filter: 'blur(50px)' }}/>

      <div style={{ maxWidth: 1200, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 28,
          background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.2)', borderRadius: 100,
          padding: '8px 18px', color: '#fff', fontSize: 13, fontWeight: 600, fontFamily: 'Poppins,sans-serif',
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f5a623', display: 'inline-block', boxShadow: '0 0 8px #f5a623' }}/>
          Built for Sri Lankan Retailers
        </div>

        <h1 style={{
          fontSize: 'clamp(2.6rem, 6vw, 4.2rem)', fontWeight: 800, color: '#fff',
          lineHeight: 1.1, letterSpacing: '-0.03em', marginBottom: 24,
          fontFamily: 'Poppins,sans-serif', maxWidth: 800,
        }}>
          Smart Retail,{' '}
          <span style={{ color: '#f5a623' }}>Simplified.</span>
        </h1>

        <p style={{
          fontSize: 'clamp(1rem, 2vw, 1.2rem)', color: 'rgba(255,255,255,0.82)',
          maxWidth: 640, lineHeight: 1.7, marginBottom: 12,
          fontFamily: 'Poppins,sans-serif', fontWeight: 400,
        }}>
          POS, inventory, loyalty, LANKAQR payments, and analytics — in one platform built for grocery stores, pharmacies, and retail shops in Sri Lanka.
        </p>
        <p style={{
          fontSize: 14, color: 'rgba(255,255,255,0.65)', maxWidth: 520, marginBottom: 40,
          fontFamily: 'Poppins,sans-serif', fontWeight: 500,
        }}>
          14-day free trial · No payment required · Full access to all modules
        </p>

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
          <a href="/register" style={{
            padding: '16px 36px', borderRadius: 12, fontWeight: 700, fontSize: 16,
            background: '#f5a623', color: '#0a2e25',
            textDecoration: 'none', boxShadow: '0 4px 20px rgba(245,166,35,0.45)',
            transition: 'all 0.2s', fontFamily: 'Poppins,sans-serif',
            display: 'inline-flex', alignItems: 'center', gap: 8,
          }}>
            Start Free Trial
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
          </a>
          <a href="/login" style={{
            padding: '16px 36px', borderRadius: 12, fontWeight: 700, fontSize: 16,
            background: 'rgba(255,255,255,0.1)', color: '#fff',
            border: '2px solid rgba(255,255,255,0.35)',
            textDecoration: 'none', transition: 'all 0.2s', fontFamily: 'Poppins,sans-serif',
            backdropFilter: 'blur(8px)',
          }}>Sign In to POS</a>
        </div>

        <div style={{ display: 'flex', gap: 40, marginTop: 72, flexWrap: 'wrap', justifyContent: 'center' }}>
          {[['Offline POS', 'Works without internet'], ['LANKAQR', 'Local payments ready'], ['Sinhala + EN', 'Bilingual interface']].map(([val, label]) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#f5a623', fontFamily: 'Poppins,sans-serif', lineHeight: 1 }}>{val}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 6, fontFamily: 'Poppins,sans-serif', fontWeight: 500 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const PAIN_POINTS = [
  { problem: 'Manual cash reconciliation and missing shift reports', solution: 'Shift open/close with automatic cash reconciliation' },
  { problem: 'Stockouts from poor reorder visibility', solution: 'Real-time inventory with low-stock alerts' },
  { problem: 'Lost sales when internet goes down', solution: 'Offline-first POS that syncs when back online' },
  { problem: 'Expired stock waste (pharmacies)', solution: 'Batch & expiry tracking with expiring-soon alerts' },
  { problem: 'Untracked customer credit and debt', solution: 'Credit sales with outstanding balance tracking' },
  { problem: 'Manual supplier orders and follow-ups', solution: 'Digital purchase orders with one-click receiving' },
];

function PainPoints() {
  return (
    <section id="pain-points" style={{ padding: '96px 24px', background: '#f8fffe' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div className="reveal" style={{ textAlign: 'center', marginBottom: 56 }}>
          <span style={{ display: 'inline-block', padding: '6px 16px', borderRadius: 100, background: '#e6f4f1', color: '#0d6e5a', fontSize: 13, fontWeight: 700, marginBottom: 16, fontFamily: 'Poppins,sans-serif' }}>Why KadeHub</span>
          <h2 style={{ fontSize: 'clamp(1.8rem,4vw,2.6rem)', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em', fontFamily: 'Poppins,sans-serif' }}>Problems We Solve Every Day</h2>
          <p style={{ marginTop: 16, color: '#6b7280', fontSize: 17, maxWidth: 560, margin: '16px auto 0', fontFamily: 'Poppins,sans-serif', fontWeight: 400 }}>
            Built around real shop-owner pain points — not generic enterprise software.
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {PAIN_POINTS.map((p, i) => (
            <div key={i} className="reveal pain-row" style={{
              display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 16, alignItems: 'center',
              background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '18px 24px',
            }}>
              <div style={{ fontSize: 14, color: '#991b1b', fontFamily: 'Poppins,sans-serif', fontWeight: 500, lineHeight: 1.5 }}>
                <span style={{ marginRight: 6 }}>✕</span>{p.problem}
              </div>
              <div style={{ color: '#d1d5db', fontSize: 20, fontWeight: 700 }}>→</div>
              <div style={{ fontSize: 14, color: '#0d6e5a', fontFamily: 'Poppins,sans-serif', fontWeight: 600, lineHeight: 1.5 }}>
                <span style={{ marginRight: 6 }}>✓</span>{p.solution}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const FEATURES = [
  { icon: '⚡', title: 'Fast POS', desc: 'Barcode scan, keyboard shortcuts, and printable receipts — checkout in seconds.' },
  { icon: '📡', title: 'Offline-First POS', desc: 'Keep selling when internet drops. Sales queue locally and sync automatically.' },
  { icon: '📦', title: 'Real-Time Inventory', desc: 'Stock updates on every sale with configurable low-stock alerts.' },
  { icon: '📱', title: 'LANKAQR Payments', desc: 'Accept Cash, Card, LANKAQR, and Credit in one checkout flow.' },
  { icon: '🎁', title: 'Loyalty CRM', desc: 'Automatic reward points — 1 point per LKR 100 spent.' },
  { icon: '💳', title: 'Credit & Debt Tracking', desc: 'Track credit sales, outstanding balances, and repayments.' },
  { icon: '💊', title: 'Batch & Expiry', desc: 'Lot tracking and expiring-soon alerts — essential for pharmacies.' },
  { icon: '👥', title: 'Staff & Shifts', desc: 'Role-based access with shift open/close and cash reconciliation.' },
  { icon: '🚚', title: 'Supplier Management', desc: 'Purchase orders and one-click stock receiving.' },
  { icon: '📊', title: 'Analytics Dashboard', desc: 'Revenue trends, top products, and stock reports at a glance.' },
  { icon: '🌐', title: 'Sinhala + English UI', desc: 'Bilingual interface designed for local shop teams.' },
  { icon: '🏪', title: 'Your Own Subdomain', desc: 'yourshop.kadehub.com — branded and ready in hours.' },
];

function Features() {
  return (
    <section id="features" style={{ padding: '96px 24px', background: '#fff' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div className="reveal" style={{ textAlign: 'center', marginBottom: 64 }}>
          <span style={{ display: 'inline-block', padding: '6px 16px', borderRadius: 100, background: '#e6f4f1', color: '#0d6e5a', fontSize: 13, fontWeight: 700, marginBottom: 16, fontFamily: 'Poppins,sans-serif' }}>Features</span>
          <h2 style={{ fontSize: 'clamp(1.8rem,4vw,2.6rem)', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em', fontFamily: 'Poppins,sans-serif' }}>Everything You Need to Run Your Shop</h2>
          <p style={{ marginTop: 16, color: '#6b7280', fontSize: 17, maxWidth: 520, margin: '16px auto 0', fontFamily: 'Poppins,sans-serif', fontWeight: 400 }}>One platform. Every tool your retail business needs.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 24 }}>
          {FEATURES.map((f) => (
            <div key={f.title} className="reveal" style={{
              background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16,
              padding: '28px 24px', transition: 'all 0.25s', cursor: 'default',
              boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
            }}>
              <div style={{ fontSize: 32, marginBottom: 16 }}>{f.icon}</div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', marginBottom: 8, fontFamily: 'Poppins,sans-serif' }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.65, fontFamily: 'Poppins,sans-serif', fontWeight: 400 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const STEPS = [
  { num: '01', title: 'Register Your Shop', desc: 'Create your account and choose your custom subdomain (yourshop.kadehub.com). No payment required.' },
  { num: '02', title: 'Add Your Products', desc: 'Import via CSV or add inventory manually with prices, stock levels, and barcodes.' },
  { num: '03', title: 'Start Selling', desc: 'Process sales immediately. Your 14-day free trial includes all modules — even offline POS.' },
  { num: '04', title: 'Choose a Plan', desc: 'After your trial, pick Starter, Pro, or Enterprise. Pay only when you are ready to continue.' },
];

function HowItWorks() {
  return (
    <section style={{ padding: '96px 24px', background: '#f8fffe' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div className="reveal" style={{ textAlign: 'center', marginBottom: 64 }}>
          <span style={{ display: 'inline-block', padding: '6px 16px', borderRadius: 100, background: '#e6f4f1', color: '#0d6e5a', fontSize: 13, fontWeight: 700, marginBottom: 16, fontFamily: 'Poppins,sans-serif' }}>How It Works</span>
          <h2 style={{ fontSize: 'clamp(1.8rem,4vw,2.6rem)', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em', fontFamily: 'Poppins,sans-serif' }}>Go Live in Hours, Not Weeks</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 24, position: 'relative' }}>
          {STEPS.map((s, i) => (
            <div key={s.num} className="reveal" style={{ textAlign: 'center', padding: '36px 28px', background: '#fff', borderRadius: 20, border: '1px solid #e5e7eb', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', position: 'relative' }}>
              {i < STEPS.length - 1 && (
                <div style={{ position: 'absolute', top: '50%', right: -14, transform: 'translateY(-50%)', color: '#d1d5db', fontSize: 22, zIndex: 1 }} className="step-arrow">→</div>
              )}
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg,#0d6e5a,#14a085)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 4px 16px rgba(13,110,90,0.3)' }}>
                <span style={{ color: '#fff', fontWeight: 800, fontSize: 16, fontFamily: 'Poppins,sans-serif' }}>{s.num}</span>
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', marginBottom: 10, fontFamily: 'Poppins,sans-serif' }}>{s.title}</h3>
              <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.65, fontFamily: 'Poppins,sans-serif', fontWeight: 400 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const PLANS = [
  {
    name: 'Starter', price: { mo: 2999, yr: 2499 }, badge: null,
    features: ['3 employees', 'POS system', 'Inventory management', 'Basic reports', 'Email support'],
    cta: 'Get Started', ctaHref: '/register',
  },
  {
    name: 'Pro', price: { mo: 4999, yr: 4149 }, badge: 'Most Popular',
    features: ['10 employees', 'POS + Inventory', 'Customer CRM & Loyalty', 'Supplier management', 'Expense tracking', 'Priority support'],
    cta: 'Get Started', ctaHref: '/register',
  },
  {
    name: 'Enterprise', price: { mo: 9999, yr: 8299 }, badge: null,
    features: ['Unlimited employees', 'All Pro features', 'Analytics dashboard', 'Staff & shifts', 'Credit & debt tracking', 'Discounts & batch/expiry tracking', 'Dedicated support'],
    cta: 'Get Started', ctaHref: '/register',
  },
];

function Pricing() {
  const [yearly, setYearly] = useState(false);
  return (
    <section id="pricing" style={{ padding: '96px 24px', background: '#fff' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div className="reveal" style={{ textAlign: 'center', marginBottom: 40 }}>
          <span style={{ display: 'inline-block', padding: '6px 16px', borderRadius: 100, background: '#e6f4f1', color: '#0d6e5a', fontSize: 13, fontWeight: 700, marginBottom: 16, fontFamily: 'Poppins,sans-serif' }}>Pricing</span>
          <h2 style={{ fontSize: 'clamp(1.8rem,4vw,2.6rem)', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em', fontFamily: 'Poppins,sans-serif' }}>Simple, Transparent Pricing</h2>
          <div style={{
            marginTop: 24, padding: '16px 24px', borderRadius: 12, background: '#f0faf7',
            border: '1px solid #a7f3d0', maxWidth: 640, margin: '24px auto 0',
            fontSize: 14, color: '#0d6e5a', fontFamily: 'Poppins,sans-serif', fontWeight: 600, lineHeight: 1.6,
          }}>
            <strong>14-day free trial</strong> — full access, no payment upfront.
            After your trial, choose a plan below. A one-time registration fee (LKR 25,000) applies with your first subscription payment.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 28 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: !yearly ? '#0d6e5a' : '#9ca3af', fontFamily: 'Poppins,sans-serif' }}>Monthly</span>
            <button type="button" onClick={() => setYearly(y => !y)} aria-label="Toggle yearly billing"
              style={{ width: 52, height: 28, borderRadius: 100, border: 'none', cursor: 'pointer', background: yearly ? '#0d6e5a' : '#d1d5db', position: 'relative', transition: 'background 0.25s' }}>
              <span style={{ position: 'absolute', top: 3, left: yearly ? 26 : 3, width: 22, height: 22, borderRadius: '50%', background: '#fff', transition: 'left 0.25s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }}/>
            </button>
            <span style={{ fontSize: 14, fontWeight: 600, color: yearly ? '#0d6e5a' : '#9ca3af', fontFamily: 'Poppins,sans-serif' }}>Yearly</span>
            {yearly && <span style={{ background: '#fef3c7', color: '#d97706', fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 100, fontFamily: 'Poppins,sans-serif' }}>Save 17%</span>}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 24, alignItems: 'start' }}>
          {PLANS.map((plan) => {
            const featured = plan.badge === 'Most Popular';
            return (
              <div key={plan.name} className={`reveal${featured ? ' pricing-featured' : ''}`} style={{
                borderRadius: 20, padding: featured ? '36px 28px' : '32px 28px',
                border: featured ? '2px solid #0d6e5a' : '1px solid #e5e7eb',
                background: featured ? 'linear-gradient(160deg,#f0faf7,#fff)' : '#fff',
                boxShadow: featured ? '0 8px 40px rgba(13,110,90,0.15)' : '0 2px 12px rgba(0,0,0,0.04)',
                position: 'relative', transform: featured ? 'scale(1.03)' : 'none',
              }}>
                {plan.badge && (
                  <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: '#f5a623', color: '#0a2e25', fontSize: 12, fontWeight: 700, padding: '4px 16px', borderRadius: 100, whiteSpace: 'nowrap', fontFamily: 'Poppins,sans-serif' }}>{plan.badge}</div>
                )}
                <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 8, fontFamily: 'Poppins,sans-serif' }}>{plan.name}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
                  <span style={{ fontSize: 13, color: '#6b7280', fontFamily: 'Poppins,sans-serif' }}>LKR</span>
                  <span style={{ fontSize: 36, fontWeight: 800, color: '#0d6e5a', fontFamily: 'Poppins,sans-serif', lineHeight: 1 }}>{(yearly ? plan.price.yr : plan.price.mo).toLocaleString()}</span>
                  <span style={{ fontSize: 14, color: '#9ca3af', fontFamily: 'Poppins,sans-serif' }}>/mo</span>
                </div>
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 20, minHeight: 18, fontFamily: 'Poppins,sans-serif' }}>
                  {yearly ? 'Billed annually' : '\u00A0'}
                </div>
                <div style={{ height: 1, background: '#e5e7eb', margin: '0 0 20px' }}/>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
                  {plan.features.map(f => (
                    <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#374151', fontFamily: 'Poppins,sans-serif', fontWeight: 500 }}>
                      <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#e6f4f1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="#0d6e5a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
                <a href={plan.ctaHref} style={{
                  display: 'block', textAlign: 'center', padding: '13px 0', borderRadius: 10, fontWeight: 700, fontSize: 15,
                  background: featured ? 'linear-gradient(135deg,#0d6e5a,#14a085)' : 'transparent',
                  color: featured ? '#fff' : '#0d6e5a',
                  border: featured ? 'none' : '2px solid #0d6e5a',
                  textDecoration: 'none', fontFamily: 'Poppins,sans-serif',
                  boxShadow: featured ? '0 4px 16px rgba(13,110,90,0.3)' : 'none',
                }}>{plan.cta}</a>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

const USE_CASES = [
  { icon: '🛒', shop: 'Grocery Stores', text: 'A fast POS and inventory tracking built to keep checkout lines moving and shelves stocked, without a second person watching stock levels by hand.' },
  { icon: '💊', shop: 'Pharmacies', text: 'Batch and expiry tracking flags stock approaching its expiry date automatically, so nothing gets sold — or written off — by surprise.' },
  { icon: '🏪', shop: 'Retail Shops', text: 'Loyalty points and an analytics dashboard designed to bring customers back and show, at a glance, what is actually selling.' },
];

function Testimonials() {
  return (
    <section style={{ padding: '96px 24px', background: '#f8fffe' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div className="reveal" style={{ textAlign: 'center', marginBottom: 16 }}>
          <span style={{ display: 'inline-block', padding: '6px 16px', borderRadius: 100, background: '#e6f4f1', color: '#0d6e5a', fontSize: 13, fontWeight: 700, marginBottom: 16, fontFamily: 'Poppins,sans-serif' }}>Built For</span>
          <h2 style={{ fontSize: 'clamp(1.8rem,4vw,2.6rem)', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em', fontFamily: 'Poppins,sans-serif' }}>Built for Sri Lankan Retailers</h2>
          <p style={{ marginTop: 12, color: '#9ca3af', fontSize: 13, fontFamily: 'Poppins,sans-serif' }}>What KadeHub is designed to solve for shops like yours</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 24, marginTop: 48 }}>
          {USE_CASES.map(u => (
            <div key={u.shop} className="reveal" style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 20, padding: '32px 28px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg,#0d6e5a,#14a085)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, fontSize: 20 }}>
                {u.icon}
              </div>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a', marginBottom: 10, fontFamily: 'Poppins,sans-serif' }}>{u.shop}</div>
              <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.7, fontFamily: 'Poppins,sans-serif', fontWeight: 400 }}>{u.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const FAQS = [
  { q: 'Is the 14-day trial really free?', a: 'Yes. Register and get full access to every module for 14 days — no payment, no credit card, no bank transfer required upfront.' },
  { q: 'What happens after the 14-day trial?', a: 'Choose a Starter, Pro, or Enterprise plan. Your first payment includes a one-time registration fee (LKR 25,000) plus your subscription. Your data stays intact.' },
  { q: 'Do I need a credit card?', a: 'No credit card needed. Start free, then pay via bank transfer when you subscribe after the trial.' },
  { q: 'Does it work without internet?', a: 'Yes. KadeHub has offline-first POS. Sales are queued locally and sync automatically when your connection returns.' },
  { q: 'Which payment methods can my shop accept?', a: 'Cash, Card, LANKAQR, and Credit sales — all from one checkout screen.' },
];

function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" style={{ padding: '96px 24px', background: '#fff' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div className="reveal" style={{ textAlign: 'center', marginBottom: 48 }}>
          <span style={{ display: 'inline-block', padding: '6px 16px', borderRadius: 100, background: '#e6f4f1', color: '#0d6e5a', fontSize: 13, fontWeight: 700, marginBottom: 16, fontFamily: 'Poppins,sans-serif' }}>FAQ</span>
          <h2 style={{ fontSize: 'clamp(1.8rem,4vw,2.6rem)', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em', fontFamily: 'Poppins,sans-serif' }}>Common Questions</h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {FAQS.map((f, i) => (
            <div key={i} className="reveal" style={{ border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
              <button type="button" onClick={() => setOpen(open === i ? null : i)}
                style={{ width: '100%', textAlign: 'left', padding: '18px 20px', background: open === i ? '#f0faf7' : '#fff', border: 'none', cursor: 'pointer', fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: 15, color: '#0f172a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {f.q}
                <span style={{ color: '#0d6e5a', fontSize: 20, lineHeight: 1 }}>{open === i ? '−' : '+'}</span>
              </button>
              {open === i && (
                <div style={{ padding: '0 20px 18px', fontSize: 14, color: '#6b7280', lineHeight: 1.7, fontFamily: 'Poppins,sans-serif', fontWeight: 400, background: '#f0faf7' }}>
                  {f.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CustomDevBanner() {
  return (
    <section style={{ padding: '48px 24px', background: '#0a2e25' }}>
      <div className="reveal" style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#f5a623', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12, fontFamily: 'Poppins,sans-serif' }}>Custom Development</p>
        <h3 style={{ fontSize: 'clamp(1.2rem,3vw,1.6rem)', fontWeight: 700, color: '#fff', marginBottom: 12, fontFamily: 'Poppins,sans-serif' }}>
          Need a bespoke POS, ERP, or web app?
        </h3>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.65)', marginBottom: 24, lineHeight: 1.6, fontFamily: 'Poppins,sans-serif', fontWeight: 400 }}>
          Beyond KadeHub, we also build custom web applications for retail, healthcare, and other industries.
        </p>
        <a href="#quote" onClick={e => { e.preventDefault(); scrollTo('#quote'); }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 28px', borderRadius: 10, background: 'transparent', color: '#f5a623', fontWeight: 700, fontSize: 15, textDecoration: 'none', border: '2px solid #f5a623', fontFamily: 'Poppins,sans-serif' }}>
          Request a Custom Quote →
        </a>
      </div>
    </section>
  );
}

function QuoteForm() {
  const [form, setForm] = useState({ name: '', email: '', business: '', country: 'Sri Lanka', description: '', budget: '' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 16px', borderRadius: 10, border: '1.5px solid #e5e7eb',
    fontSize: 14, fontFamily: 'Poppins,sans-serif', fontWeight: 500, color: '#0f172a',
    outline: 'none', transition: 'border-color 0.2s', background: '#fff',
  };

  return (
    <section id="quote" style={{ padding: '96px 24px', background: '#f8fffe' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div className="reveal" style={{ textAlign: 'center', marginBottom: 48 }}>
          <span style={{ display: 'inline-block', padding: '6px 16px', borderRadius: 100, background: '#e6f4f1', color: '#0d6e5a', fontSize: 13, fontWeight: 700, marginBottom: 16, fontFamily: 'Poppins,sans-serif' }}>Custom Projects</span>
          <h2 style={{ fontSize: 'clamp(1.8rem,4vw,2.6rem)', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em', fontFamily: 'Poppins,sans-serif' }}>Get a Quote for Custom Development</h2>
          <p style={{ marginTop: 14, color: '#6b7280', fontSize: 16, fontFamily: 'Poppins,sans-serif', fontWeight: 400 }}>
            For bespoke POS, ERP, or web apps — not for standard KadeHub registration.{' '}
            <a href="/register" style={{ color: '#0d6e5a', fontWeight: 600 }}>Register for KadeHub here →</a>
          </p>
        </div>
        {submitted ? (
          <div className="reveal" style={{ textAlign: 'center', padding: '64px 32px', background: '#f0faf7', borderRadius: 20, border: '1px solid #a7f3d0' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
            <h3 style={{ fontSize: 22, fontWeight: 700, color: '#0d6e5a', marginBottom: 8, fontFamily: 'Poppins,sans-serif' }}>Request Sent!</h3>
            <p style={{ color: '#6b7280', fontSize: 16, fontFamily: 'Poppins,sans-serif', fontWeight: 400 }}>We&apos;ll get back to you within 24 hours.</p>
          </div>
        ) : (
          <form className="reveal" onSubmit={async e => {
            e.preventDefault();
            setLoading(true); setError('');
            try {
              const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
              const res = await fetch(`${apiUrl}/quotations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contact_name: form.name,
                  email: form.email,
                  business_type: form.business,
                  country: form.country,
                  description: form.description,
                  budget_range: form.budget,
                }),
              });
              if (!res.ok) throw new Error('Failed to send');
              setSubmitted(true);
            } catch {
              setError('Could not send your request.');
            } finally {
              setLoading(false);
            }
          }}
          style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 20, padding: '40px 36px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }} className="form-grid">
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6, fontFamily: 'Poppins,sans-serif' }}>Full Name *</label>
                <input required value={form.name} onChange={set('name')} placeholder="Your name" style={inputStyle}/>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6, fontFamily: 'Poppins,sans-serif' }}>Email Address *</label>
                <input required type="email" value={form.email} onChange={set('email')} placeholder="you@company.com" style={inputStyle}/>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }} className="form-grid">
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6, fontFamily: 'Poppins,sans-serif' }}>Business Type *</label>
                <select required value={form.business} onChange={set('business')} style={inputStyle}>
                  <option value="">Select type</option>
                  {['Grocery / Convenience', 'Pharmacy', 'Retail Store', 'Restaurant', 'Healthcare', 'E-commerce', 'Other'].map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6, fontFamily: 'Poppins,sans-serif' }}>Country *</label>
                <input required value={form.country} onChange={set('country')} placeholder="Sri Lanka" style={inputStyle}/>
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6, fontFamily: 'Poppins,sans-serif' }}>Project Description *</label>
              <textarea required value={form.description} onChange={set('description')} rows={4} placeholder="Describe what you need built..." style={{ ...inputStyle, resize: 'vertical' }}/>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6, fontFamily: 'Poppins,sans-serif' }}>Budget Range *</label>
              <select required value={form.budget} onChange={set('budget')} style={inputStyle}>
                <option value="">Select budget</option>
                {['Under LKR 100,000', 'LKR 100,000 – 500,000', 'LKR 500,000 – 1,000,000', 'LKR 1,000,000+', 'Under $2,000', '$2,000 – $10,000', '$10,000+'].map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <button type="submit" disabled={loading} style={{
              padding: '15px 0', borderRadius: 12, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              background: 'linear-gradient(135deg,#0d6e5a,#14a085)', color: '#fff',
              fontWeight: 700, fontSize: 16, fontFamily: 'Poppins,sans-serif',
              boxShadow: '0 4px 16px rgba(13,110,90,0.3)', opacity: loading ? 0.7 : 1,
            }}>{loading ? 'Sending…' : 'Send My Request →'}</button>
            {error && (
              <p style={{ color: '#dc2626', fontSize: 13, textAlign: 'center', fontFamily: 'Poppins,sans-serif' }}>
                {error}{' '}
                <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" style={{ color: '#0d6e5a', fontWeight: 700 }}>Chat on WhatsApp instead →</a>
              </p>
            )}
          </form>
        )}
      </div>
    </section>
  );
}

function Footer() {
  const links = ['Features', 'Pricing', 'FAQ', 'Register', 'Sign In'];
  const hrefs: Record<string, string> = { Features: '#features', Pricing: '#pricing', FAQ: '#faq', Register: '/register', 'Sign In': '/login' };
  const socials = [
    { label: 'WhatsApp', href: WHATSAPP_URL, icon: '💬' },
    { label: 'Email', href: 'mailto:official.kadehub@gmail.com', icon: '📧' },
    { label: 'Website', href: 'https://www.kadehub.lk', icon: '🌐' },
  ];

  return (
    <footer id="contact" style={{ background: '#0a2e25', color: '#fff', padding: '64px 24px 32px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 48, marginBottom: 48 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#0d6e5a,#14a085)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#fff', fontWeight: 800, fontSize: 16, fontFamily: 'Poppins,sans-serif' }}>K</span>
              </div>
              <span style={{ fontWeight: 800, fontSize: 20, fontFamily: 'Poppins,sans-serif', letterSpacing: '-0.03em' }}>KadeHub</span>
            </div>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, fontFamily: 'Poppins,sans-serif', fontWeight: 400, maxWidth: 260 }}>
              Smart retail, simplified. The all-in-one POS and shop management platform for Sri Lankan retailers.
            </p>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              {socials.map(s => (
                <a key={s.label} href={s.href} target={s.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer"
                  title={s.label} aria-label={s.label}
                  style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, textDecoration: 'none' }}>
                  {s.icon}
                </a>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16, fontFamily: 'Poppins,sans-serif' }}>Navigation</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {links.map(l => (
                <a key={l} href={hrefs[l]}
                  onClick={hrefs[l].startsWith('#') ? e => { e.preventDefault(); scrollTo(hrefs[l]); } : undefined}
                  style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', textDecoration: 'none', fontFamily: 'Poppins,sans-serif', fontWeight: 500 }}>
                  {l}
                </a>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16, fontFamily: 'Poppins,sans-serif' }}>Contact</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <a href={WHATSAPP_URL} target="_blank" rel="noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'rgba(255,255,255,0.65)', textDecoration: 'none', fontFamily: 'Poppins,sans-serif', fontWeight: 500 }}>
                <span style={{ fontSize: 18 }}>💬</span> WhatsApp: +94 70 247 0064
              </a>
              <a href="mailto:official.kadehub@gmail.com"
                style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'rgba(255,255,255,0.65)', textDecoration: 'none', fontFamily: 'Poppins,sans-serif', fontWeight: 500 }}>
                <span style={{ fontSize: 18 }}>📧</span> official.kadehub@gmail.com
              </a>
              <a href="https://www.kadehub.lk" target="_blank" rel="noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'rgba(255,255,255,0.65)', textDecoration: 'none', fontFamily: 'Poppins,sans-serif', fontWeight: 500 }}>
                <span style={{ fontSize: 18 }}>🌐</span> www.kadehub.lk
              </a>
            </div>
          </div>
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', fontFamily: 'Poppins,sans-serif', fontWeight: 400 }}>© 2026 KadeHub. All rights reserved.</p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', fontFamily: 'Poppins,sans-serif', fontWeight: 400 }}>Smart retail, simplified.</p>
        </div>
      </div>
    </footer>
  );
}

function WhatsAppFAB() {
  const [hovered, setHovered] = useState(false);
  return (
    <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" aria-label="Chat on WhatsApp"
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{
        position: 'fixed', bottom: 28, right: 28, zIndex: 9999,
        width: 56, height: 56, borderRadius: '50%',
        background: '#25d366', display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 20px rgba(37,211,102,0.45)', textDecoration: 'none',
        transition: 'all 0.25s', transform: hovered ? 'scale(1.1)' : 'scale(1)',
      }}>
      {hovered && (
        <span style={{
          position: 'absolute', right: 68, background: '#0a2e25', color: '#fff',
          fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 8,
          whiteSpace: 'nowrap', fontFamily: 'Poppins,sans-serif',
        }}>Chat with us</span>
      )}
      <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    </a>
  );
}

export default function LandingContent() {
  useReveal();
  return (
    <div className="landing-page">
      <Navbar />
      <Hero />
      <PainPoints />
      <Features />
      <HowItWorks />
      <Pricing />
      <Testimonials />
      <FAQ />
      <CustomDevBanner />
      <QuoteForm />
      <Footer />
      <WhatsAppFAB />
    </div>
  );
}
