'use client';
import { useEffect, useState } from 'react';
import { Check, ArrowRight } from 'lucide-react';
import api from '../../lib/api';
import { productPath } from '../../lib/platform';
import Reveal from '../platform/Reveal';

type PublicPlan = {
  slug: string; key: 'free' | 'growth' | 'scale'; name: string;
  monthly_price_lkr: number; features: string[];
};

const BLUE = '#2563EB';
const fmt = (n: number) => `Rs ${n.toLocaleString('en-LK')}`;

/** Plans for the cod.kadehub.com landing page, read from the public plans endpoint (prices come from the package table). */
export default function CodPricing() {
  const [plans, setPlans] = useState<PublicPlan[] | null>(null);
  useEffect(() => {
    api.get<PublicPlan[]>('/cod/public/plans').then(r => setPlans(r.data)).catch(() => setPlans([]));
  }, []);

  // Nothing to show if the API is unreachable; the rest of the page still works
  if (plans && plans.length === 0) return null;

  return (
    <section id="pricing" className="scroll-mt-20 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <Reveal className="text-center max-w-2xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: BLUE }}>Pricing</p>
          <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-ink-900">Start free, upgrade when you grow</h2>
          <p className="mt-2 text-sm sm:text-base text-ink-500">Your first 50 orders every month are free. Pay monthly by bank transfer or card when you need more.</p>
        </Reveal>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {(plans ?? [null, null, null]).map((p, i) => p ? (
            <Reveal key={p.slug} delay={i * 110} className="h-full">
              <div className={`relative h-full rounded-2xl border p-6 flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${p.key === 'growth' ? 'border-blue-500 shadow-md' : 'border-ink-100'}`}>
                {p.key === 'growth' && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-2xs font-bold text-white" style={{ background: BLUE }}>Most popular</span>
                )}
                <h3 className="text-lg font-bold text-ink-900">{p.name.replace('COD ', '')}</h3>
                <p className="mt-3">
                  <span className="text-3xl font-extrabold text-ink-900">{p.monthly_price_lkr === 0 ? 'Free' : fmt(p.monthly_price_lkr)}</span>
                  {p.monthly_price_lkr > 0 && <span className="text-sm text-ink-400"> / month</span>}
                </p>
                <p className="mt-1 text-xs text-ink-400">{p.key === 'free' ? 'Free every month, no time limit' : p.key === 'growth' ? 'Unlocks Premium reports and bulk actions' : 'For high-volume sellers'}</p>
                <ul className="mt-5 space-y-2 flex-1">
                  {p.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-ink-600">
                      <Check size={15} className="mt-0.5 flex-shrink-0" style={{ color: BLUE }} /> {f}
                    </li>
                  ))}
                </ul>
                <a href={productPath('cod', '/register')}
                  className={`mt-6 inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold ${p.key === 'growth' ? 'text-white' : 'border-2'}`}
                  style={p.key === 'growth' ? { background: BLUE } : { borderColor: BLUE, color: BLUE }}>
                  Start free <ArrowRight size={15} />
                </a>
              </div>
            </Reveal>
          ) : (
            <div key={i} className="h-80 rounded-2xl border border-ink-100 bg-ink-50 animate-pulse" />
          ))}
        </div>
      </div>
    </section>
  );
}
