'use client';

/**
 * Small UI kit for KadeHub COD, in KadeHub's Tailwind v3 style. The business's brand colour is
 * the primary colour: the COD layout sets --cod-primary / --cod-primary-fg on :root.
 */
import { forwardRef, useEffect, useRef, useState } from 'react';
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import Modal from '../ui/Modal';

export function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(' ');
}

type Variant = 'primary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'icon' | 'icon-sm';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-[color:var(--cod-primary)] text-[color:var(--cod-primary-fg)] hover:opacity-90 shadow-sm',
  outline: 'border border-ink-200 bg-white text-ink-700 hover:bg-ink-50',
  ghost: 'text-ink-600 hover:bg-ink-100',
  danger: 'bg-red-600 text-white hover:bg-red-700',
};
const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  icon: 'h-9 w-9 justify-center',
  'icon-sm': 'h-7 w-7 justify-center',
};

export function btnClass(variant: Variant = 'primary', size: Size = 'md', extra = '') {
  return cn(
    'inline-flex items-center rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap [&_svg]:w-4 [&_svg]:h-4 [&_svg]:shrink-0',
    VARIANTS[variant], SIZES[size], extra,
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }>(
  function Button({ variant = 'primary', size = 'md', className = '', type = 'button', ...props }, ref) {
    return <button ref={ref} type={type} className={btnClass(variant, size, className)} {...props} />;
  },
);

const fieldBase = 'w-full rounded-lg border border-ink-200 bg-white text-sm text-ink-800 placeholder:text-ink-400 focus:outline-none focus:border-[color:var(--cod-primary)] focus:ring-1 focus:ring-[color:var(--cod-primary)] disabled:bg-ink-50 disabled:text-ink-400';

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function TextInput({ className = '', ...props }, ref) {
    return <input ref={ref} className={cn(fieldBase, 'h-10 px-3', props.type === 'file' && 'py-1.5 h-auto file:mr-3 file:rounded-md file:border-0 file:bg-ink-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold', className)} {...props} />;
  },
);

export function TextArea({ className = '', ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldBase, 'px-3 py-2', className)} {...props} />;
}

export function NativeSelect({ className = '', children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(fieldBase, 'h-10 px-3 pr-8', className)} {...props}>{children}</select>;
}

export function Field({ label, htmlFor, hint, children, className = '' }: { label: ReactNode; htmlFor?: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink-700">{label}</label>
      {children}
      {hint && <p className="text-xs text-ink-400">{hint}</p>}
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder, disabled, trailing }: {
  value: string; onChange: (v: string) => void; placeholder: string; disabled?: boolean; trailing?: ReactNode;
}) {
  return (
    <div className="relative flex-1">
      <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
      </svg>
      <TextInput value={value} disabled={disabled} placeholder={placeholder} onChange={e => onChange(e.target.value)} className="pl-9" />
      {trailing && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400">{trailing}</span>}
    </div>
  );
}

export function Toggle({ checked, onChange, label, id }: { checked: boolean; onChange: (v: boolean) => void; label?: string; id?: string }) {
  return (
    <button id={id} type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
      className={cn('relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors', checked ? 'bg-[color:var(--cod-primary)]' : 'bg-ink-200')}>
      <span className={cn('inline-block h-5 w-5 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-5' : 'translate-x-0.5')} />
    </button>
  );
}

export function Card({ title, action, children, className = '', bodyClassName = '' }: {
  title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; bodyClassName?: string;
}) {
  return (
    <section className={cn('kh-card', className)}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-2 px-5 pt-4">
          {title && <h2 className="text-sm font-semibold text-ink-800">{title}</h2>}
          {action}
        </header>
      )}
      <div className={cn('p-5', title || action ? 'pt-3' : '', bodyClassName)}>{children}</div>
    </section>
  );
}

export function Badge({ children, tone = 'gray', className = '' }: { children: ReactNode; tone?: 'gray' | 'red' | 'green' | 'amber' | 'brand'; className?: string }) {
  const tones = {
    gray: 'bg-ink-100 text-ink-700',
    red: 'bg-red-100 text-red-700',
    green: 'bg-emerald-100 text-emerald-800',
    amber: 'bg-amber-100 text-amber-800',
    brand: 'bg-[color:var(--cod-primary)] text-[color:var(--cod-primary-fg)]',
  } as const;
  return <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-2xs font-semibold', tones[tone], className)}>{children}</span>;
}

/** Table styling shared by every COD list. */
export const tbl = {
  wrap: 'overflow-x-auto rounded-xl border border-ink-200 bg-white',
  table: 'w-full text-sm',
  th: 'px-3 py-2.5 text-left text-xs font-semibold text-ink-500 whitespace-nowrap border-b border-ink-100 bg-ink-50/60',
  td: 'px-3 py-2.5 border-b border-ink-100 align-middle',
  right: 'text-right',
};

export function Dialog({ open, onClose, title, children, width }: { open: boolean; onClose: () => void; title: string; children: ReactNode; width?: string }) {
  return (
    // Modal scrolls its own body (and pins the submit row), so no extra scroll box here
    <Modal open={open} onClose={onClose} title={title} width={width}>{children}</Modal>
  );
}

/** Minimal dropdown menu: an icon button (`trigger` is its icon) and a list of actions. */
export function Menu({ trigger, label, align = 'right', children }: { trigger: ReactNode; label: string; align?: 'left' | 'right'; children: (close: () => void) => ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);
  return (
    <div ref={ref} className="relative inline-block">
      <Button variant="ghost" size="icon-sm" aria-label={label} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(o => !o)}>
        {trigger}
      </Button>
      {open && (
        <div role="menu" className={cn('absolute z-30 mt-1 min-w-[12rem] rounded-xl border border-ink-200 bg-white p-1 shadow-lg', align === 'right' ? 'right-0' : 'left-0')}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

export function MenuItem({ onClick, children, danger }: { onClick: () => void; children: ReactNode; danger?: boolean }) {
  return (
    <button type="button" role="menuitem" onClick={onClick}
      className={cn('flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm [&_svg]:w-4 [&_svg]:h-4 [&_svg]:shrink-0', danger ? 'text-red-600 hover:bg-red-50' : 'text-ink-700 hover:bg-ink-50')}>
      {children}
    </button>
  );
}

export function PageHeader({ title, subtitle, actions, leading }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; leading?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        {leading}
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-ink-900">{title}</h1>
          {subtitle && <p className="text-sm text-ink-500">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Kpi({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: 'danger' }) {
  return (
    <div className="kh-card min-w-0 p-4">
      <p className="text-xs text-ink-500">{label}</p>
      {/* Very large amounts step down a size and may wrap inside the card instead of spilling out */}
      <p className={cn('mt-1 font-bold tracking-tight [overflow-wrap:anywhere]', value.length > 16 ? 'text-base' : 'text-xl', tone === 'danger' ? 'text-red-600' : 'text-ink-900')}>{value}</p>
      {hint && <p className="mt-1 text-2xs text-ink-400">{hint}</p>}
    </div>
  );
}
