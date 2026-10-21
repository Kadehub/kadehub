import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ArrowRight, Check, ChevronDown } from 'lucide-react';
import KadeHubLogo from '../ui/KadeHubLogo';
import ProductIcon from './ProductIcon';
import Reveal from './Reveal';
import Mascot, { type MascotPose } from '../brand/Mascot';
import { PRODUCTS, getProduct, hubUrl, productUrl, type ProductSlug } from '../../lib/platform';
import './product-landing.css';

import { onColor } from '../../lib/color';
/*
 * Building blocks for a product's public landing page (cod.kadehub.com/, tasks.kadehub.com/…).
 * Every string comes from the caller, so a page can pass translated text.
 */

export type LandingItem = { icon: LucideIcon; title: string; text: string };
type Link = { label: string; href: string };

const tint = (color: string, pct: number) => `color-mix(in srgb, ${color} ${pct}%, white)`;

function Eyebrow({ children, color }: { children: ReactNode; color: string }) {
  return <p className="text-xs font-bold uppercase tracking-widest" style={{ color }}>{children}</p>;
}

function SectionHead({ eyebrow, title, subtitle, color }: { eyebrow?: string; title: string; subtitle?: string; color: string }) {
  return (
    <Reveal className="text-center max-w-2xl mx-auto">
      {eyebrow && <Eyebrow color={color}>{eyebrow}</Eyebrow>}
      <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-ink-900">{title}</h2>
      {subtitle && <p className="mt-2 text-sm sm:text-base text-ink-500">{subtitle}</p>}
    </Reveal>
  );
}

/** Sticky top bar: KadeHub logo + product badge, in-page links, sign in and the main call to action. */
export function LandingHeader({ slug, links, signIn, cta }: { slug: ProductSlug; links: Link[]; signIn: Link; cta: Link }) {
  const product = getProduct(slug)!;
  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-ink-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        <a href={hubUrl('/')} className="flex items-center gap-2 min-w-0" aria-label="KadeHub home">
          <KadeHubLogo width={118} theme="color" />
          <span className="hidden sm:inline text-2xs font-bold px-2 py-0.5 rounded-full" style={{ background: product.color, color: onColor(product.color) }}>
            {product.name.replace('KadeHub ', '')}
          </span>
        </a>
        <nav className="flex items-center gap-1 sm:gap-2">
          {links.map(l => (
            <a key={l.href} href={l.href} className="hidden md:inline px-3 py-2 text-sm font-medium text-ink-600 hover:text-ink-900">{l.label}</a>
          ))}
          <a href={signIn.href} className="px-3 py-2 text-sm font-semibold text-ink-700 hover:text-ink-900">{signIn.label}</a>
          <a href={cta.href} className="px-4 py-2 rounded-xl text-sm font-bold transition-opacity hover:opacity-90" style={{ background: product.color, color: onColor(product.color) }}>
            {cta.label}
          </a>
        </nav>
      </div>
    </header>
  );
}

/** A simple banner: product mark, headline, two buttons, short check-list, and a live preview on the right. */
export function LandingHero({
  slug, title, highlight, subtitle, primary, secondary, points, preview,
}: {
  slug: ProductSlug; title: string; highlight?: string; subtitle: string;
  primary: Link; secondary?: Link; points: string[]; preview: ReactNode;
}) {
  const product = getProduct(slug)!;
  return (
    <section className="relative overflow-hidden" style={{ background: `linear-gradient(180deg, ${tint(product.color, 12)} 0%, #FFFFFF 100%)` }}>
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 grid gap-10 lg:grid-cols-[1.1fr_1fr] items-center">
        <div className="group text-center lg:text-left">
          <a href={hubUrl('/')} className="inline-flex items-center gap-2 rounded-full bg-white border border-ink-100 p-1 pr-3 text-xs font-semibold text-ink-600 hover:border-ink-200">
            <ProductIcon slug={slug} color={product.color} size={26} />
            Part of KadeHub
            <ArrowRight size={13} className="text-ink-400" />
          </a>
          <h1 className="mt-5 text-3xl sm:text-5xl font-extrabold text-ink-900 leading-tight tracking-tight">
            {title}{highlight && <> <span style={{ color: product.color }}>{highlight}</span></>}
          </h1>
          <p className="mt-4 text-base sm:text-lg text-ink-500 max-w-xl mx-auto lg:mx-0">{subtitle}</p>
          <div className="mt-7 flex flex-wrap gap-3 justify-center lg:justify-start">
            <a href={primary.href} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white shadow-md transition-opacity hover:opacity-90"
              style={{ background: product.color }}>
              {primary.label} <ArrowRight size={16} />
            </a>
            {secondary && (
              <a href={secondary.href} className="inline-flex items-center px-6 py-3 rounded-xl text-sm font-bold border-2 border-ink-200 text-ink-700 bg-white hover:bg-ink-50">
                {secondary.label}
              </a>
            )}
          </div>
          <ul className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 max-w-xl mx-auto lg:mx-0 text-left">
            {points.map(p => (
              <li key={p} className="flex items-center gap-2 text-sm text-ink-600">
                <Check size={16} className="flex-shrink-0" style={{ color: product.color }} /> {p}
              </li>
            ))}
          </ul>
        </div>
        <Reveal delay={120}>{preview}</Reveal>
      </div>
    </section>
  );
}

export function LandingStats({ slug, items }: { slug: ProductSlug; items: { value: string; label: string }[] }) {
  const color = getProduct(slug)!.color;
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-2 pb-4">
      <Reveal>
        <div className="grid grid-cols-2 sm:grid-cols-4 rounded-2xl bg-white border border-ink-100 shadow-sm divide-x divide-y sm:divide-y-0 divide-ink-100">
          {items.map(s => (
            <div key={s.label} className="px-4 py-5 text-center">
              <p className="text-2xl sm:text-3xl font-extrabold" style={{ color }}>{s.value}</p>
              <p className="mt-0.5 text-xs sm:text-sm text-ink-500">{s.label}</p>
            </div>
          ))}
        </div>
      </Reveal>
    </div>
  );
}

export function LandingFeatures({ slug, id = 'features', eyebrow, title, subtitle, items }: {
  slug: ProductSlug; id?: string; eyebrow?: string; title: string; subtitle?: string; items: LandingItem[];
}) {
  const color = getProduct(slug)!.color;
  return (
    <section id={id} className="scroll-mt-20 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <SectionHead eyebrow={eyebrow} title={title} subtitle={subtitle} color={color} />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(({ icon: Icon, title: t, text }, i) => (
            <Reveal key={t} delay={(i % 3) * 90} className="h-full">
              <div className="group h-full rounded-2xl border border-ink-100 bg-white p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
                <span className="kh-ficon w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: tint(color, 14), color }}>
                  <Icon size={20} />
                </span>
                <h3 className="mt-4 font-bold text-ink-900">{t}</h3>
                <p className="mt-1 text-sm text-ink-500">{text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Alternating text + preview rows that walk through the product's main jobs. */
export function LandingShowcase({ slug, rows }: {
  slug: ProductSlug; rows: { eyebrow: string; title: string; text: string; bullets: string[]; visual: ReactNode }[];
}) {
  const color = getProduct(slug)!.color;
  return (
    <>
      {rows.map((r, i) => {
        const flip = i % 2 === 1;
        return (
          <section key={r.title} className={i % 2 === 0 ? 'bg-[#F8FAFC]' : 'bg-white'}>
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 grid gap-10 lg:grid-cols-2 items-center">
              <Reveal className={flip ? 'lg:order-2' : ''}>
                <Eyebrow color={color}>{r.eyebrow}</Eyebrow>
                <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-ink-900 leading-tight">{r.title}</h2>
                <p className="mt-3 text-ink-500">{r.text}</p>
                <ul className="mt-5 space-y-2.5">
                  {r.bullets.map(b => (
                    <li key={b} className="flex items-start gap-2.5 text-sm text-ink-700">
                      <span className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: tint(color, 16), color }}>
                        <Check size={13} strokeWidth={3} />
                      </span>
                      {b}
                    </li>
                  ))}
                </ul>
              </Reveal>
              <Reveal delay={140} className={flip ? 'lg:order-1' : ''}>{r.visual}</Reveal>
            </div>
          </section>
        );
      })}
    </>
  );
}

export function LandingSteps({ slug, id = 'how', eyebrow, title, steps }: {
  slug: ProductSlug; id?: string; eyebrow?: string; title: string; steps: LandingItem[];
}) {
  const color = getProduct(slug)!.color;
  return (
    <section id={id} className="scroll-mt-20 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <SectionHead eyebrow={eyebrow} title={title} color={color} />
        <Reveal className="relative mt-12">
          <div className="hub-connector hidden md:block absolute top-7 left-[16%] right-[16%] h-1 rounded-full" aria-hidden
            style={{ background: `linear-gradient(90deg, ${color} 0 50%, #E2E8F0 50% 100%)`, backgroundSize: '200% 100%', backgroundPosition: '100% 0' }} />
          <ol className={`relative grid gap-8 ${steps.length === 4 ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
            {steps.map(({ icon: Icon, title: t, text }, i) => (
              <li key={t} className="group text-center">
                <span className="kh-ficon relative mx-auto w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-md" style={{ background: color }}>
                  <Icon size={24} />
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white text-xs font-extrabold flex items-center justify-center shadow" style={{ color }}>
                    {i + 1}
                  </span>
                </span>
                <h3 className="mt-4 font-bold text-ink-900">{t}</h3>
                <p className="mt-1 text-sm text-ink-500 max-w-xs mx-auto">{text}</p>
              </li>
            ))}
          </ol>
        </Reveal>
      </div>
    </section>
  );
}

/** "Made for" cards: who the product is built for. */
export function LandingAudiences({ slug, eyebrow, title, items }: { slug: ProductSlug; eyebrow?: string; title: string; items: LandingItem[] }) {
  const color = getProduct(slug)!.color;
  return (
    <section className="bg-[#F8FAFC]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <SectionHead eyebrow={eyebrow} title={title} color={color} />
        <div className={`mt-10 grid gap-4 sm:grid-cols-2 ${items.length >= 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
          {items.map(({ icon: Icon, title: t, text }, i) => (
            <Reveal key={t} delay={i * 90} className="h-full">
              <div className="group h-full rounded-2xl bg-white border border-ink-100 p-5 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
                <span className="kh-ficon mx-auto w-12 h-12 rounded-full flex items-center justify-center" style={{ background: tint(color, 14), color }}>
                  <Icon size={22} />
                </span>
                <h3 className="mt-3 font-bold text-ink-900">{t}</h3>
                <p className="mt-1 text-sm text-ink-500">{text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function LandingFaq({ slug, id = 'faq', eyebrow, title, items }: { slug: ProductSlug; id?: string; eyebrow?: string; title: string; items: { q: string; a: string }[] }) {
  const color = getProduct(slug)!.color;
  return (
    <section id={id} className="scroll-mt-20 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <SectionHead eyebrow={eyebrow} title={title} color={color} />
        <div className="mt-8 space-y-3">
          {items.map(f => (
            <details key={f.q} className="group rounded-2xl border border-ink-100 bg-white px-5 py-4 open:shadow-sm">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-ink-800 [&::-webkit-details-marker]:hidden">
                {f.q}
                <ChevronDown size={18} className="flex-shrink-0 text-ink-400 transition-transform duration-300 group-open:rotate-180" />
              </summary>
              <p className="mt-3 text-sm text-ink-500">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function LandingCta({ slug, title, text, action, pose = 'celebrate' }: { slug: ProductSlug; title: string; text: string; action: Link; pose?: MascotPose }) {
  const color = getProduct(slug)!.color;
  return (
    <section className="px-4 sm:px-6 py-16 bg-white">
      <Reveal>
        <div className="max-w-6xl mx-auto rounded-3xl px-6 py-10 sm:px-10 flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left"
          style={{ background: `linear-gradient(135deg, color-mix(in srgb, ${color} 70%, #000) 0%, ${color} 100%)` }}>
          <Mascot pose={pose} size="md" decorative />
          <div className="flex-1">
            <h2 className="text-xl sm:text-2xl font-extrabold text-white">{title}</h2>
            <p className="mt-1 text-sm text-white/80">{text}</p>
          </div>
          <a href={action.href} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold bg-white hover:bg-ink-50" style={{ color }}>
            {action.label} <ArrowRight size={16} />
          </a>
        </div>
      </Reveal>
    </section>
  );
}

/** Footer for a product site: what it is, the other KadeHub apps, and contact. */
export function LandingFooter({ slug, blurb }: { slug: ProductSlug; blurb: string }) {
  const product = getProduct(slug)!;
  return (
    <footer className="border-t border-ink-100 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2">
            <ProductIcon slug={slug} color={product.color} size={34} />
            <span className="font-extrabold text-ink-900">{product.name}</span>
          </div>
          <p className="mt-3 text-sm text-ink-500 max-w-sm">{blurb}</p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-ink-400">KadeHub apps</p>
          <ul className="mt-3 space-y-2 text-sm">
            {PRODUCTS.map(p => (
              <li key={p.slug}>
                <a href={productUrl(p.slug, '/')} className={p.slug === slug ? 'font-semibold text-ink-900' : 'text-ink-600 hover:text-ink-900'}>{p.name}</a>
              </li>
            ))}
            <li><a href={hubUrl('/')} className="text-ink-600 hover:text-ink-900">All apps</a></li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-ink-400">Help</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><a href="#faq" className="text-ink-600 hover:text-ink-900">FAQ</a></li>
            <li><a href="mailto:official.kadehub@gmail.com" className="text-ink-600 hover:text-ink-900">Contact us</a></li>
            <li><a href="/login" className="text-ink-600 hover:text-ink-900">Sign in</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-ink-100">
        <p className="max-w-6xl mx-auto px-4 sm:px-6 py-5 text-xs text-ink-400">© {new Date().getFullYear()} KadeHub. All rights reserved.</p>
      </div>
    </footer>
  );
}
