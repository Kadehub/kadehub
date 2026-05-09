'use client';
import { useEffect, useState } from 'react';

/* ── Scroll-reveal hook ── */
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal');
    const io = new IntersectionObserver(
      (entries) => entries.forEach(e => e.isIntersecting && e.target.classList.add('revealed')),
      { threshold: 0.12 }
    );
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);
}

/* ── Navbar ── */
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
    { label: 'Pricing', href: '#pricing' },
    { label: 'Get a Quote', href: '#quote' },
    { label: 'Contact', href: '#footer' },
  ];

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
        {/* Logo */}
        <a href="#" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flexShrink: 0 }}>
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

        {/* Desktop links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto', marginRight: 24 }} className="nav-desktop">
          {navLinks.map(l => (
            <a key={l.label} href={l.href} onClick={e => { e.preventDefault(); document.querySelector(l.href)?.scrollIntoView({ behavior: 'smooth' }); }}
              style={{
                padding: '8px 14px', borderRadius: 8, fontWeight: 600, fontSize: 14,
                color: scrolled ? '#374151' : 'rgba(255,255,255,0.88)',
                textDecoration: 'none', transition: 'all 0.2s',
                fontFamily: 'Poppins,sans-serif',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = scrolled ? '#f3f4f6' : 'rgba(255,255,255,0.12)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >{l.label}</a>
          ))}
        </div>

        <a href="/login" className="nav-desktop" style={{
          padding: '10px 20px', borderRadius: 10, fontWeight: 700, fontSize: 14,
          background: scrolled ? 'linear-gradient(135deg,#0d6e5a,#14a085)' : '#fff',
          color: scrolled ? '#fff' : '#0d6e5a',
          textDecoration: 'none', boxShadow: '0 2px 8px rgba(13,110,90,0.25)',
          transition: 'all 0.2s', fontFamily: 'Poppins,sans-serif', flexShrink: 0,
        }}>Go to POS System</a>

        {/* Mobile hamburger */}
        <button onClick={() => setMenuOpen(!menuOpen)} className="nav-mobile" style={{
          marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer',
          color: scrolled ? '#0d6e5a' : '#fff', padding: 8,
        }}>
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            {menuOpen ? (<><line x1="4" y1="4" x2="20" y2="20"/><line x1="20" y1="4" x2="4" y2="20"/></>) : (<><line x1="3" y1="7" x2="21" y2="7"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="17" x2="21" y2="17"/></>)}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div style={{ background: '#fff', borderTop: '1px solid #e5e7eb', padding: '12px 24px 20px' }}>
          {navLinks.map(l => (
            <a key={l.label} href={l.href} onClick={e => { e.preventDefault(); setMenuOpen(false); document.querySelector(l.href)?.scrollIntoView({ behavior: 'smooth' }); }}
              style={{ display: 'block', padding: '12px 0', fontWeight: 600, fontSize: 15, color: '#374151', textDecoration: 'none', borderBottom: '1px solid #f3f4f6', fontFamily: 'Poppins,sans-serif' }}>
              {l.label}
            </a>
          ))}
          <a href="/login" style={{ display: 'block', marginTop: 16, padding: '12px 0', textAlign: 'center', borderRadius: 10, background: 'linear-gradient(135deg,#0d6e5a,#14a085)', color: '#fff', fontWeight: 700, fontSize: 15, textDecoration: 'none', fontFamily: 'Poppins,sans-serif' }}>
            Go to POS System
          </a>
        </div>
      )}
    </nav>
  );
}

/* ── Hero ── */
function Hero() {
  return (
    <section style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #0a4f40 0%, #0d6e5a 40%, #0f8a6e 70%, #1aab87 100%)',
      position: 'relative', overflow: 'hidden', padding: '120px 24px 80px',
    }}>
      {/* Background pattern */}
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

      {/* Floating blobs */}
      <div style={{ position: 'absolute', top: '10%', right: '8%', width: 320, height: 320, borderRadius: '50%', background: 'rgba(245,166,35,0.12)', filter: 'blur(60px)' }}/>
      <div style={{ position: 'absolute', bottom: '15%', left: '5%', width: 240, height: 240, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', filter: 'blur(50px)' }}/>

      <div style={{ maxWidth: 1200, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', position: 'relative', zIndex: 1 }}>
        {/* Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 28,
          background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.2)', borderRadius: 100,
          padding: '8px 18px', color: '#fff', fontSize: 13, fontWeight: 600, fontFamily: 'Poppins,sans-serif',
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f5a623', display: 'inline-block', boxShadow: '0 0 8px #f5a623' }}/>
          Now available worldwide
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
          maxWidth: 620, lineHeight: 1.7, marginBottom: 44,
          fontFamily: 'Poppins,sans-serif', fontWeight: 400,
        }}>
          Everything your business needs — POS, inventory, customers and analytics — in one powerful platform. Built for retail businesses worldwide.
        </p>

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
          <a href="/register" style={{
            padding: '16px 36px', borderRadius: 12, fontWeight: 700, fontSize: 16,
            background: '#f5a623', color: '#0a2e25',
            textDecoration: 'none', boxShadow: '0 4px 20px rgba(245,166,35,0.45)',
            transition: 'all 0.2s', fontFamily: 'Poppins,sans-serif',
            display: 'inline-flex', alignItems: 'center', gap: 8,
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(245,166,35,0.55)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(245,166,35,0.45)'; }}
          >
            Start Free Trial
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
          </a>
          <a href="/login" style={{
            padding: '16px 36px', borderRadius: 12, fontWeight: 700, fontSize: 16,
            background: 'rgba(255,255,255,0.1)', color: '#fff',
            border: '2px solid rgba(255,255,255,0.35)',
            textDecoration: 'none', transition: 'all 0.2s', fontFamily: 'Poppins,sans-serif',
            backdropFilter: 'blur(8px)',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.18)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.transform = 'none'; }}
          >
            Go to POS System
          </a>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 48, marginTop: 72, flexWrap: 'wrap', justifyContent: 'center' }}>
          {[['500+', 'Shops Onboarded'], ['99.9%', 'Uptime SLA'], ['24/7', 'Support']].map(([val, label]) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#f5a623', fontFamily: 'Poppins,sans-serif', lineHeight: 1 }}>{val}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 6, fontFamily: 'Poppins,sans-serif', fontWeight: 500 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Features ── */
const FEATURES = [
  { icon: '⚡', title: 'Fast POS', desc: 'Process sales in seconds with barcode scan support and keyboard shortcuts.' },
  { icon: '📦', title: 'Real-Time Inventory', desc: 'Stock levels update automatically on every sale — no manual counting.' },
  { icon: '🎁', title: 'Loyalty CRM', desc: 'Reward customers with points automatically. 1 pt per LKR 100 spent.' },
  { icon: '📊', title: 'Analytics Dashboard', desc: 'Daily insights into sales, revenue trends and top-performing products.' },
  { icon: '💳', title: 'Credit & Debt Tracking', desc: 'Manage credit sales, outstanding balances and repayment records.' },
  { icon: '🔄', title: 'Multi-Payment Support', desc: 'Accept Cash, Card, QR codes and Credit — all in one checkout flow.' },
  { icon: '🚚', title: 'Supplier Management', desc: 'Track suppliers, create purchase orders and receive stock seamlessly.' },
  { icon: '👥', title: 'Multi-User & Roles', desc: 'Staff accounts with role-based access — Admin, Cashier and more.' },
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
          {FEATURES.map((f, i) => (
            <div key={f.title} className="reveal" style={{ animationDelay: `${i * 60}ms`,
              background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16,
              padding: '28px 24px', transition: 'all 0.25s', cursor: 'default',
              boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
            }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 32px rgba(13,110,90,0.12)'; e.currentTarget.style.borderColor = '#0d6e5a'; e.currentTarget.style.transform = 'translateY(-4px)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)'; e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.transform = 'none'; }}
            >
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

/* ── How It Works ── */
const STEPS = [
  { num: '01', title: 'Register Your Shop', desc: 'Create your account in 4 easy steps. No credit card required to get started.' },
  { num: '02', title: 'Add Your Products', desc: 'Import via CSV or manually add your inventory with prices, stock and barcodes.' },
  { num: '03', title: 'Start Selling', desc: 'Process your first sale right away. Your dashboard updates in real time.' },
];

function HowItWorks() {
  return (
    <section style={{ padding: '96px 24px', background: '#f8fffe' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div className="reveal" style={{ textAlign: 'center', marginBottom: 64 }}>
          <span style={{ display: 'inline-block', padding: '6px 16px', borderRadius: 100, background: '#e6f4f1', color: '#0d6e5a', fontSize: 13, fontWeight: 700, marginBottom: 16, fontFamily: 'Poppins,sans-serif' }}>How It Works</span>
          <h2 style={{ fontSize: 'clamp(1.8rem,4vw,2.6rem)', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em', fontFamily: 'Poppins,sans-serif' }}>Get Started in Minutes</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 32, position: 'relative' }}>
          {STEPS.map((s, i) => (
            <div key={s.num} className="reveal" style={{ textAlign: 'center', padding: '40px 32px', background: '#fff', borderRadius: 20, border: '1px solid #e5e7eb', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', position: 'relative' }}>
              {i < STEPS.length - 1 && (
                <div style={{ position: 'absolute', top: '50%', right: -20, transform: 'translateY(-50%)', color: '#d1d5db', fontSize: 24, zIndex: 1 }} className="step-arrow">→</div>
              )}
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg,#0d6e5a,#14a085)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: '0 4px 16px rgba(13,110,90,0.3)' }}>
                <span style={{ color: '#fff', fontWeight: 800, fontSize: 18, fontFamily: 'Poppins,sans-serif' }}>{s.num}</span>
              </div>
              <h3 style={{ fontSize: 19, fontWeight: 700, color: '#0f172a', marginBottom: 12, fontFamily: 'Poppins,sans-serif' }}>{s.title}</h3>
              <p style={{ fontSize: 15, color: '#6b7280', lineHeight: 1.65, fontFamily: 'Poppins,sans-serif', fontWeight: 400 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Services ── */
const SERVICES = [
  { icon: '🛍️', title: 'E-commerce Platforms', desc: 'Full-featured online stores with payments, inventory sync and order management.' },
  { icon: '🏢', title: 'Business Management Systems', desc: 'Custom ERP and BMS solutions tailored to your workflows and team size.' },
  { icon: '🖥️', title: 'Custom POS Solutions', desc: 'Bespoke point-of-sale systems built for your specific industry and hardware.' },
  { icon: '🔧', title: 'Industry-Specific Web Apps', desc: 'Healthcare, logistics, hospitality — we build for any vertical, any scale.' },
];

function Services() {
  return (
    <section style={{ padding: '96px 24px', background: '#0d6e5a', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, opacity: 0.05 }}>
        <svg width="100%" height="100%"><defs><pattern id="dots" width="32" height="32" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="2" fill="white"/></pattern></defs><rect width="100%" height="100%" fill="url(#dots)"/></svg>
      </div>
      <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <div className="reveal" style={{ textAlign: 'center', marginBottom: 64 }}>
          <span style={{ display: 'inline-block', padding: '6px 16px', borderRadius: 100, background: 'rgba(245,166,35,0.2)', color: '#f5a623', fontSize: 13, fontWeight: 700, marginBottom: 16, fontFamily: 'Poppins,sans-serif' }}>Our Services</span>
          <h2 style={{ fontSize: 'clamp(1.8rem,4vw,2.6rem)', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', fontFamily: 'Poppins,sans-serif' }}>We Build Web Applications for Every Industry</h2>
          <p style={{ marginTop: 16, color: 'rgba(255,255,255,0.72)', fontSize: 17, maxWidth: 560, margin: '16px auto 0', fontFamily: 'Poppins,sans-serif', fontWeight: 400 }}>Beyond KadeHub, we design and develop custom web applications for businesses of all types — worldwide.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 24, marginBottom: 48 }}>
          {SERVICES.map((s, i) => (
            <div key={s.title} className="reveal" style={{
              background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.15)', borderRadius: 16,
              padding: '28px 24px', transition: 'all 0.25s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.14)'; e.currentTarget.style.transform = 'translateY(-4px)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'none'; }}
            >
              <div style={{ fontSize: 32, marginBottom: 16 }}>{s.icon}</div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: '#fff', marginBottom: 8, fontFamily: 'Poppins,sans-serif' }}>{s.title}</h3>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.68)', lineHeight: 1.65, fontFamily: 'Poppins,sans-serif', fontWeight: 400 }}>{s.desc}</p>
            </div>
          ))}
        </div>
        <div className="reveal" style={{ textAlign: 'center' }}>
          <a href="#quote" onClick={e => { e.preventDefault(); document.querySelector('#quote')?.scrollIntoView({ behavior: 'smooth' }); }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '16px 36px', borderRadius: 12, background: '#f5a623', color: '#0a2e25', fontWeight: 700, fontSize: 16, textDecoration: 'none', boxShadow: '0 4px 20px rgba(245,166,35,0.4)', transition: 'all 0.2s', fontFamily: 'Poppins,sans-serif' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(245,166,35,0.55)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(245,166,35,0.4)'; }}
          >Get a Free Quote →</a>
        </div>
      </div>
    </section>
  );
}

/* ── Pricing ── */
const PLANS = [
  {
    name: 'Starter', price: { mo: 2999, yr: 2499 }, badge: null, color: '#0d6e5a',
    features: ['3 employees', 'POS system', 'Inventory management', 'Basic reports', 'Email support'],
    cta: 'Get Started', ctaHref: '/register',
  },
  {
    name: 'Pro', price: { mo: 4999, yr: 4149 }, badge: 'Most Popular', color: '#0d6e5a',
    features: ['10 employees', 'POS system', 'Inventory management', 'Customer CRM & Loyalty', 'Supplier management', 'Expense tracking', 'Priority support'],
    cta: 'Get Started', ctaHref: '/register',
  },
  {
    name: 'Enterprise', price: { mo: 9999, yr: 8299 }, badge: null, color: '#0d6e5a',
    features: ['Unlimited employees', 'All Pro features', 'Analytics dashboard', 'Staff & shifts', 'Credit & debt tracking', 'Discount & promotions', 'Batch & expiry tracking', 'Dedicated support'],
    cta: 'Contact Us', ctaHref: '#quote',
  },
];

function Pricing() {
  const [yearly, setYearly] = useState(false);
  return (
    <section id="pricing" style={{ padding: '96px 24px', background: '#fff' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div className="reveal" style={{ textAlign: 'center', marginBottom: 56 }}>
          <span style={{ display: 'inline-block', padding: '6px 16px', borderRadius: 100, background: '#e6f4f1', color: '#0d6e5a', fontSize: 13, fontWeight: 700, marginBottom: 16, fontFamily: 'Poppins,sans-serif' }}>Pricing</span>
          <h2 style={{ fontSize: 'clamp(1.8rem,4vw,2.6rem)', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em', fontFamily: 'Poppins,sans-serif' }}>Simple, Transparent Pricing</h2>
          {/* Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 28 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: !yearly ? '#0d6e5a' : '#9ca3af', fontFamily: 'Poppins,sans-serif' }}>Monthly</span>
            <button onClick={() => setYearly(y => !y)} style={{
              width: 52, height: 28, borderRadius: 100, border: 'none', cursor: 'pointer',
              background: yearly ? '#0d6e5a' : '#d1d5db', position: 'relative', transition: 'background 0.25s',
            }}>
              <span style={{ position: 'absolute', top: 3, left: yearly ? 26 : 3, width: 22, height: 22, borderRadius: '50%', background: '#fff', transition: 'left 0.25s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }}/>
            </button>
            <span style={{ fontSize: 14, fontWeight: 600, color: yearly ? '#0d6e5a' : '#9ca3af', fontFamily: 'Poppins,sans-serif' }}>Yearly</span>
            {yearly && <span style={{ background: '#fef3c7', color: '#d97706', fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 100, fontFamily: 'Poppins,sans-serif' }}>Save 17%</span>}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 24, alignItems: 'start' }}>
          {PLANS.map((plan, i) => {
            const featured = plan.badge === 'Most Popular';
            return (
              <div key={plan.name} className="reveal" style={{
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
                {yearly && <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 24, fontFamily: 'Poppins,sans-serif' }}>Billed annually</div>}
                <div style={{ height: 1, background: '#e5e7eb', margin: '20px 0' }}/>
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
                <a href={plan.ctaHref} onClick={plan.ctaHref === '#quote' ? e => { e.preventDefault(); document.querySelector('#quote')?.scrollIntoView({ behavior: 'smooth' }); } : undefined}
                  style={{
                    display: 'block', textAlign: 'center', padding: '13px 0', borderRadius: 10, fontWeight: 700, fontSize: 15,
                    background: featured ? 'linear-gradient(135deg,#0d6e5a,#14a085)' : 'transparent',
                    color: featured ? '#fff' : '#0d6e5a',
                    border: featured ? 'none' : '2px solid #0d6e5a',
                    textDecoration: 'none', transition: 'all 0.2s', fontFamily: 'Poppins,sans-serif',
                    boxShadow: featured ? '0 4px 16px rgba(13,110,90,0.3)' : 'none',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = '0.88'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'none'; }}
                >{plan.cta}</a>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}

/* ── Testimonials ── */
const TESTIMONIALS = [
  { name: 'Amal Perera', shop: 'Grocery Store, Colombo', quote: 'KadeHub transformed how we manage our shop. The POS is lightning fast and the inventory tracking saves us hours every week.', avatar: 'AP' },
  { name: 'Nisha Fernando', shop: 'Pharmacy, Kandy', quote: 'The batch and expiry tracking feature is a lifesaver for our pharmacy. We never miss an expiring product anymore.', avatar: 'NF' },
  { name: 'Rohan Silva', shop: 'Retail Store, Galle', quote: 'Customer loyalty points have brought back so many repeat customers. The analytics dashboard gives us exactly what we need.', avatar: 'RS' },
];

function Testimonials() {
  return (
    <section style={{ padding: '96px 24px', background: '#f8fffe' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div className="reveal" style={{ textAlign: 'center', marginBottom: 64 }}>
          <span style={{ display: 'inline-block', padding: '6px 16px', borderRadius: 100, background: '#e6f4f1', color: '#0d6e5a', fontSize: 13, fontWeight: 700, marginBottom: 16, fontFamily: 'Poppins,sans-serif' }}>Testimonials</span>
          <h2 style={{ fontSize: 'clamp(1.8rem,4vw,2.6rem)', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em', fontFamily: 'Poppins,sans-serif' }}>Trusted by Shops Worldwide</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 24 }}>
          {TESTIMONIALS.map(t => (
            <div key={t.name} className="reveal" style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 20, padding: '32px 28px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', transition: 'all 0.25s' }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 32px rgba(13,110,90,0.1)'; e.currentTarget.style.transform = 'translateY(-4px)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.04)'; e.currentTarget.style.transform = 'none'; }}
            >
              <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
                {[...Array(5)].map((_, i) => <span key={i} style={{ color: '#f5a623', fontSize: 18 }}>★</span>)}
              </div>
              <p style={{ fontSize: 15, color: '#374151', lineHeight: 1.7, marginBottom: 24, fontFamily: 'Poppins,sans-serif', fontWeight: 400, fontStyle: 'italic' }}>&ldquo;{t.quote}&rdquo;</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#0d6e5a,#14a085)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ color: '#fff', fontWeight: 700, fontSize: 14, fontFamily: 'Poppins,sans-serif' }}>{t.avatar}</span>
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', fontFamily: 'Poppins,sans-serif' }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: '#9ca3af', fontFamily: 'Poppins,sans-serif', fontWeight: 500 }}>{t.shop}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Quote Form ── */
function QuoteForm() {
  const [form, setForm] = useState({ name: '', email: '', business: '', country: '', description: '', budget: '' });
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
    <section id="quote" style={{ padding: '96px 24px', background: '#fff' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div className="reveal" style={{ textAlign: 'center', marginBottom: 48 }}>
          <span style={{ display: 'inline-block', padding: '6px 16px', borderRadius: 100, background: '#e6f4f1', color: '#0d6e5a', fontSize: 13, fontWeight: 700, marginBottom: 16, fontFamily: 'Poppins,sans-serif' }}>Get a Quote</span>
          <h2 style={{ fontSize: 'clamp(1.8rem,4vw,2.6rem)', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em', fontFamily: 'Poppins,sans-serif' }}>Build Something Custom for Your Business</h2>
          <p style={{ marginTop: 14, color: '#6b7280', fontSize: 16, fontFamily: 'Poppins,sans-serif', fontWeight: 400 }}>Tell us about your project and we’ll get back to you within 24 hours.</p>
        </div>
        {submitted ? (
          <div className="reveal" style={{ textAlign: 'center', padding: '64px 32px', background: '#f0faf7', borderRadius: 20, border: '1px solid #a7f3d0' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
            <h3 style={{ fontSize: 22, fontWeight: 700, color: '#0d6e5a', marginBottom: 8, fontFamily: 'Poppins,sans-serif' }}>Request Sent!</h3>
            <p style={{ color: '#6b7280', fontSize: 16, fontFamily: 'Poppins,sans-serif', fontWeight: 400 }}>We’ll get back to you within 24 hours!</p>
          </div>
        ) : (
          <form className="reveal" onSubmit={async e => {
              e.preventDefault();
              setLoading(true); setError('');
              try {
                const res = await fetch('/api/quote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
                if (!res.ok) throw new Error('Failed to send');
                setSubmitted(true);
              } catch {
                setError('Something went wrong. Please try WhatsApp instead.');
              } finally {
                setLoading(false);
              }
            }}
            style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 20, padding: '40px 36px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }} className="form-grid">
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6, fontFamily: 'Poppins,sans-serif' }}>Full Name *</label>
                <input required value={form.name} onChange={set('name')} placeholder="John Smith" style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#0d6e5a'} onBlur={e => e.target.style.borderColor = '#e5e7eb'}/>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6, fontFamily: 'Poppins,sans-serif' }}>Email Address *</label>
                <input required type="email" value={form.email} onChange={set('email')} placeholder="you@company.com" style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#0d6e5a'} onBlur={e => e.target.style.borderColor = '#e5e7eb'}/>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }} className="form-grid">
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6, fontFamily: 'Poppins,sans-serif' }}>Business Type *</label>
                <select required value={form.business} onChange={set('business')} style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#0d6e5a'} onBlur={e => e.target.style.borderColor = '#e5e7eb'}>
                  <option value="">Select type</option>
                  {['Retail', 'Restaurant', 'Healthcare', 'E-commerce', 'Other'].map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6, fontFamily: 'Poppins,sans-serif' }}>Country *</label>
                <input required value={form.country} onChange={set('country')} placeholder="Sri Lanka" style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#0d6e5a'} onBlur={e => e.target.style.borderColor = '#e5e7eb'}/>
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6, fontFamily: 'Poppins,sans-serif' }}>Project Description *</label>
              <textarea required value={form.description} onChange={set('description')} rows={4} placeholder="Describe what you need built..." style={{ ...inputStyle, resize: 'vertical' }}
                onFocus={e => e.target.style.borderColor = '#0d6e5a'} onBlur={e => e.target.style.borderColor = '#e5e7eb'}/>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6, fontFamily: 'Poppins,sans-serif' }}>Budget Range *</label>
              <select required value={form.budget} onChange={set('budget')} style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#0d6e5a'} onBlur={e => e.target.style.borderColor = '#e5e7eb'}>
                <option value="">Select budget</option>
                {['Under $500', '$500–$2,000', '$2,000–$5,000', '$5,000+'].map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <button type="submit" disabled={loading} style={{
              padding: '15px 0', borderRadius: 12, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              background: 'linear-gradient(135deg,#0d6e5a,#14a085)', color: '#fff',
              fontWeight: 700, fontSize: 16, fontFamily: 'Poppins,sans-serif',
              boxShadow: '0 4px 16px rgba(13,110,90,0.3)', transition: 'all 0.2s',
              opacity: loading ? 0.7 : 1,
            }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'none'; }}
            >{loading ? 'Sending…' : 'Send My Request →'}</button>
            {error && <p style={{ color: '#dc2626', fontSize: 13, textAlign: 'center', fontFamily: 'Poppins,sans-serif' }}>{error}</p>}
          </form>
        )}
      </div>
    </section>
  );
}

/* ── Footer ── */
function Footer() {
  const links = ['Features', 'Pricing', 'Get a Quote', 'POS Login', 'Register'];
  const hrefs: Record<string, string> = { 'Features': '#features', 'Pricing': '#pricing', 'Get a Quote': '#quote', 'POS Login': '/login', 'Register': '/register' };
  return (
    <footer id="footer" style={{ background: '#0a2e25', color: '#fff', padding: '64px 24px 32px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 48, marginBottom: 48 }}>
          {/* Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#0d6e5a,#14a085)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#fff', fontWeight: 800, fontSize: 16, fontFamily: 'Poppins,sans-serif' }}>K</span>
              </div>
              <span style={{ fontWeight: 800, fontSize: 20, fontFamily: 'Poppins,sans-serif', letterSpacing: '-0.03em' }}>KadeHub</span>
            </div>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, fontFamily: 'Poppins,sans-serif', fontWeight: 400, maxWidth: 240 }}>Smart retail, simplified. The all-in-one platform for modern retail businesses worldwide.</p>
            {/* Social placeholders */}
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              {['📱', '💻', '📧'].map((icon, i) => (
                <div key={i} style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 16, transition: 'background 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.16)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}>{icon}</div>
              ))}
            </div>
          </div>
          {/* Links */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16, fontFamily: 'Poppins,sans-serif' }}>Navigation</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {links.map(l => (
                <a key={l} href={hrefs[l]}
                  onClick={hrefs[l].startsWith('#') ? e => { e.preventDefault(); document.querySelector(hrefs[l])?.scrollIntoView({ behavior: 'smooth' }); } : undefined}
                  style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', textDecoration: 'none', fontFamily: 'Poppins,sans-serif', fontWeight: 500, transition: 'color 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#f5a623'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.65)'}>{l}</a>
              ))}
            </div>
          </div>
          {/* Contact */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16, fontFamily: 'Poppins,sans-serif' }}>Contact</div>
            <a href="https://wa.me/94702470064" target="_blank" rel="noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'rgba(255,255,255,0.65)', textDecoration: 'none', fontFamily: 'Poppins,sans-serif', fontWeight: 500, transition: 'color 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.color = '#25d366'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.65)'}>
              <span style={{ fontSize: 18 }}>💬</span> WhatsApp: +94 70 247 0064
            </a>
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

/* ── WhatsApp FAB ── */
function WhatsAppFAB() {
  const [hovered, setHovered] = useState(false);
  return (
    <a href="https://wa.me/94702470064" target="_blank" rel="noreferrer"
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
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}>Chat with us</span>
      )}
      <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    </a>
  );
}

const GLOBAL_CSS = `
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { font-family: 'Poppins', sans-serif; }
        .nav-desktop { display: flex !important; }
        .nav-mobile  { display: none  !important; }
        @media (max-width: 768px) {
          .nav-desktop { display: none  !important; }
          .nav-mobile  { display: flex  !important; }
        }
        .reveal { opacity: 0; transform: translateY(32px); transition: opacity 0.6s ease, transform 0.6s ease; }
        .revealed { opacity: 1; transform: none; }
        @media (max-width: 640px) {
          .form-grid { grid-template-columns: 1fr !important; }
          .step-arrow { display: none !important; }
        }
`;

export default function LandingPage() {
  useReveal();
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
      <Navbar />
      <Hero />
      <Features />
      <HowItWorks />
      <Services />
      <Pricing />
      <Testimonials />
      <QuoteForm />
      <Footer />
      <WhatsAppFAB />
    </>
  );
}
