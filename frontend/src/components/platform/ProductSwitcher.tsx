'use client';
import { useEffect, useRef, useState } from 'react';
import { LayoutGrid, ChevronUp } from 'lucide-react';
import { PRODUCTS, hubUrl, productUrl, type ProductSlug } from '../../lib/platform';

/** Sidebar control for jumping between KadeHub products on their subdomains. */
export default function ProductSwitcher({ current, label }: { current: ProductSlug; label: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-1 kh-card p-1.5 z-20">
          {PRODUCTS.map(p => {
            const soon = p.status === 'coming_soon';
            return (
              <a key={p.slug} href={p.slug === current ? undefined : productUrl(p.slug, soon ? '/' : undefined)}
                className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm ${p.slug === current ? 'bg-ink-100 cursor-default' : 'hover:bg-ink-50'}`}>
                <span className="w-6 h-6 rounded-md flex items-center justify-center text-2xs font-extrabold text-white flex-shrink-0"
                  style={{ background: p.color }}>{p.name.replace('KadeHub ', '')[0]}</span>
                <span className={`flex-1 truncate font-medium ${soon ? 'text-ink-400' : 'text-ink-700'}`}>{p.name.replace('KadeHub ', '')}</span>
                {soon && <span className="text-2xs text-ink-400">Soon</span>}
              </a>
            );
          })}
          <div className="mt-1 pt-1 border-t border-ink-100">
            <a href={hubUrl('/account')} className="block px-2.5 py-2 rounded-lg text-xs font-semibold text-ink-500 hover:bg-ink-50">
              Account & subscriptions
            </a>
            <a href={hubUrl('/apps')} className="block px-2.5 py-2 rounded-lg text-xs font-semibold text-ink-500 hover:bg-ink-50">
              All apps →
            </a>
            <a href={hubUrl('/')} className="block px-2.5 py-2 rounded-lg text-xs font-semibold text-ink-500 hover:bg-ink-50">
              KadeHub home
            </a>
          </div>
        </div>
      )}
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-ink-500 hover:bg-ink-50 hover:text-ink-800 transition-all">
        <LayoutGrid size={17} />
        <span className="flex-1 text-left">{label}</span>
        <ChevronUp size={14} className={`transition-transform ${open ? '' : 'rotate-180'}`} />
      </button>
    </div>
  );
}
