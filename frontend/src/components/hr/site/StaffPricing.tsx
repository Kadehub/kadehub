'use client';
import { useEffect, useState } from 'react';
import { Check, ArrowRight } from 'lucide-react';
import api from '../../../lib/api';
import { productPath } from '../../../lib/platform';
import Reveal from '../../platform/Reveal';
import type { HrPlanOffer } from '../../../lib/hr/types';

const VIOLET = '#7C3AED';
const fmt = (n: number) => `Rs ${n.toLocaleString('en-LK')}`;

const BLURB: Record<HrPlanOffer['key'], string> = {
  free: 'Free for good, for the smallest teams',
  starter: 'For one shop with a growing team',
  business: 'Several branches with their own managers',
  pro: 'No limits. Every trial starts here',
};

/** Plans for the staff.kadehub.com landing page, read from the public plans endpoint (prices come from the package table). */
export default function StaffPricing() {
  const [plans, setPlans] = useState<HrPlanOffer[] | null>(null);
  useEffect(() => {
    api.get<HrPlanOffer[]>('/hr/public/plans').then(r => setPlans(r.data)).catch(() => setPlans([]));
  }, []);

  // Nothing to show if the API is unreachable; the rest of the page still works
  if (plans && plans.length === 0) return null;

  return (
    <section id="pricing" className="scroll-mt-20 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <Reveal className="text-center max-w-2xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: VIOLET }}>Pricing</p>
          <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-ink-900">Priced by the size of your team</h2>
          <p className="mt-2 text-sm sm:text-base text-ink-500">Every new business gets 14 days of Pro. After that, keep going on Free or pick a plan. Pay by bank transfer or card.</p>
        </Reveal>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {(plans ?? [null, null, null, null]).map((p, i) => p ? (
            <Reveal key={p.slug} delay={i * 110} className="h-full">
              <div className={`relative h-full rounded-2xl border p-6 flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${p.key === 'business' ? 'border-violet-500 shadow-md' : 'border-ink-100'}`}>
                {p.key === 'business' && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-1 text-2xs font-bold text-white" style={{ background: VIOLET }}>Most popular</span>
                )}
                <h3 className="text-lg font-bold text-ink-900">{p.name.replace('Staff ', '')}</h3>
                <p className="mt-3">
                  <span className="text-3xl font-extrabold text-ink-900">{p.monthly_price_lkr === 0 ? 'Free' : fmt(p.monthly_price_lkr)}</span>
                  {p.monthly_price_lkr > 0 && <span className="text-sm text-ink-400"> / month</span>}
                </p>
                <p className="mt-1 text-xs text-ink-400">{BLURB[p.key]}</p>
                <ul className="mt-5 space-y-2 flex-1">
                  {p.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-ink-600">
                      <Check size={15} className="mt-0.5 flex-shrink-0" style={{ color: VIOLET }} /> {f}
                    </li>
                  ))}
                </ul>
                <a href={productPath('hr', '/register')}
                  className={`mt-6 inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold ${p.key === 'business' ? 'text-white' : 'border-2'}`}
                  style={p.key === 'business' ? { background: VIOLET } : { borderColor: VIOLET, color: VIOLET }}>
                  {p.key === 'free' ? 'Start free' : 'Start 14-day trial'} <ArrowRight size={15} />
                </a>
              </div>
            </Reveal>
          ) : (
            <div key={i} className="h-80 rounded-2xl border border-ink-100 bg-ink-50 animate-pulse" />
          ))}
        </div>
        <p className="mt-6 text-center text-xs text-ink-400">Yearly plans cost 10 months’ worth: two months free.</p>
      </div>
    </section>
  );
}
