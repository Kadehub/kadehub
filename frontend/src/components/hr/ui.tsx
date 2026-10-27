'use client';

/**
 * UI kit for KadeHub Staff. The basic controls are COD's kit (components/cod/ui), which is driven
 * by --cod-primary / --cod-primary-fg; the Staff layout sets those to the business's brand colour.
 * Everything Staff-specific (avatars, pickers, confirm dialogs…) lives here.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, Download, Star } from 'lucide-react';
import { Button, Dialog, NativeSelect, cn } from '../cod/ui';
import { useStayOnScreen } from '../../hooks/useStayOnScreen';
import { MascotState } from '../brand/Mascot';
import { useHrT, type HrKey } from '../../lib/hr/i18n';
import { addDays, addMonths, downloadCsv, formatDate, formatPeriod, initials, weekStart } from '../../lib/hr/format';
import type { Branch, Employee } from '../../lib/hr/types';

export {
  Button, btnClass, TextInput, TextArea, NativeSelect, Field, SearchInput, Toggle, Card, Badge, tbl, Dialog, Menu, MenuItem,
  PageHeader, Kpi, cn,
} from '../cod/ui';

/** Photo, or initials on a colour picked from the name. */
export function Avatar({ name, src, size = 36, className = '' }: { name: string; src?: string | null; size?: number; className?: string }) {
  const hues = ['#7c3aed', '#0ea5e9', '#16a34a', '#f59e0b', '#ef4444', '#14b8a6', '#6366f1', '#db2777'];
  const hue = hues[name.split('').reduce((s, c) => s + c.charCodeAt(0), 0) % hues.length];
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" width={size} height={size} className={cn('shrink-0 rounded-full object-cover', className)} style={{ width: size, height: size }} />;
  }
  return (
    <span aria-hidden className={cn('flex shrink-0 items-center justify-center rounded-full font-bold text-white', className)}
      style={{ width: size, height: size, background: hue, fontSize: Math.max(10, Math.round(size * 0.38)) }}>
      {initials(name)}
    </span>
  );
}

/** Name with photo and a muted second line (code, job title…). */
export function PersonCell({ name, sub, src, size = 32 }: { name: string; sub?: ReactNode; src?: string | null; size?: number }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <Avatar name={name} src={src} size={size} />
      <span className="min-w-0">
        <span className="block truncate font-medium text-ink-800">{name}</span>
        {sub && <span className="block truncate text-xs text-ink-400">{sub}</span>}
      </span>
    </span>
  );
}

export function EmptyState({ title, description, action, scene = 'sleep' }: {
  title: string; description?: string; action?: ReactNode; scene?: 'sleep' | 'relax' | 'grow' | 'work';
}) {
  return <MascotState variant="empty" size="sm" scene={scene} title={title} description={description} action={action} />;
}

export function Loading({ label }: { label?: string }) {
  const { t } = useHrT();
  return <MascotState variant="loading" size="sm" title={label ?? t('app.loading')} />;
}

export function LoadError({ onRetry, message }: { onRetry: () => void; message?: string }) {
  const { t } = useHrT();
  return (
    <MascotState variant="error" size="sm" title={message ?? t('err.generic')}
      action={<Button variant="outline" onClick={onRetry}>{t('common.retry')}</Button>} />
  );
}

/** Underlined tabs; `value` is controlled by the page. */
export function Tabs<T extends string>({ value, onChange, items, className = '' }: {
  value: T; onChange: (v: T) => void; items: Array<{ value: T; label: ReactNode; badge?: number }>; className?: string;
}) {
  return (
    // overflow-y-hidden: the tabs' -mb-px underline would otherwise give the bar a stray vertical scrollbar
    <div role="tablist" className={cn('flex gap-1 overflow-x-auto overflow-y-hidden border-b border-ink-200 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden', className)}>
      {items.map(i => (
        <button key={i.value} type="button" role="tab" aria-selected={value === i.value} onClick={() => onChange(i.value)}
          className={cn('-mb-px inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors',
            value === i.value ? 'border-[color:var(--cod-primary)] text-ink-900' : 'border-transparent text-ink-500 hover:text-ink-800')}>
          {i.label}
          {!!i.badge && <span className="rounded-full bg-[color:var(--cod-primary)] px-1.5 text-2xs font-bold text-[color:var(--cod-primary-fg)]">{i.badge}</span>}
        </button>
      ))}
    </div>
  );
}

/** Short month names in the current language (Jan… / ජන…). */
function monthNames(locale: string): string[] {
  const fmt = new Intl.DateTimeFormat(locale === 'si' ? 'si-LK' : 'en-GB', { month: 'short', timeZone: 'UTC' });
  return Array.from({ length: 12 }, (_, m) => fmt.format(new Date(Date.UTC(2000, m, 1))));
}

/** ‹ March 2026 › — tap the name to jump to any month and year. */
export function MonthPicker({ value, onChange, max }: { value: string; onChange: (p: string) => void; max?: string }) {
  const { t, locale } = useHrT();
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(Number(value.slice(0, 4)));
  const ref = useRef<HTMLDivElement>(null);
  const popup = useStayOnScreen<HTMLDivElement>(open);
  const next = addMonths(value, 1);

  useEffect(() => { if (open) setYear(Number(value.slice(0, 4))); }, [open, value]);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);

  const pick = (period: string) => { onChange(period); setOpen(false); };
  const maxYear = max ? Number(max.slice(0, 4)) : Infinity;

  return (
    <div ref={ref} className="relative inline-flex items-center gap-1 rounded-xl border border-ink-200 bg-white p-0.5">
      <Button variant="ghost" size="icon-sm" aria-label={t('common.previous')} onClick={() => onChange(addMonths(value, -1))}><ChevronLeft /></Button>
      <button type="button" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(o => !o)}
        className="inline-flex min-w-[8.5rem] items-center justify-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold text-ink-800 hover:bg-ink-50">
        {formatPeriod(value)} <ChevronDown size={14} className={cn('text-ink-400 transition-transform', open && 'rotate-180')} />
      </button>
      <Button variant="ghost" size="icon-sm" aria-label={t('common.following')} disabled={!!max && next > max} onClick={() => onChange(next)}><ChevronRight /></Button>

      {open && (
        <div ref={popup} role="dialog" aria-label={formatPeriod(value)}
          className="absolute left-1/2 top-full z-30 mt-1.5 w-64 -translate-x-1/2 rounded-2xl border border-ink-200 bg-white p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <Button variant="ghost" size="icon-sm" aria-label={t('common.previous')} onClick={() => setYear(y => y - 1)}><ChevronLeft /></Button>
            <span className="text-sm font-bold text-ink-900">{year}</span>
            <Button variant="ghost" size="icon-sm" aria-label={t('common.following')} disabled={year >= maxYear} onClick={() => setYear(y => y + 1)}><ChevronRight /></Button>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {monthNames(locale).map((name, i) => {
              const period = `${year}-${String(i + 1).padStart(2, '0')}`;
              const selected = period === value;
              const disabled = !!max && period > max;
              return (
                <button key={period} type="button" disabled={disabled} onClick={() => pick(period)}
                  className={cn('rounded-lg py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:text-ink-300',
                    selected ? 'bg-[color:var(--cod-primary)] text-[color:var(--cod-primary-fg)]' : 'text-ink-700 hover:bg-ink-100')}>
                  {name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/** ‹ 12 – 18 Mar 2026 › (weeks start on Monday). */
export function WeekPicker({ value, onChange }: { value: string; onChange: (monday: string) => void }) {
  const { t } = useHrT();
  const monday = weekStart(value);
  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-ink-200 bg-white p-0.5">
      <Button variant="ghost" size="icon-sm" aria-label={t('common.previous')} onClick={() => onChange(addDays(monday, -7))}><ChevronLeft /></Button>
      <span className="min-w-[10rem] text-center text-sm font-semibold text-ink-800">{formatDate(monday, true)} – {formatDate(addDays(monday, 6))}</span>
      <Button variant="ghost" size="icon-sm" aria-label={t('common.following')} onClick={() => onChange(addDays(monday, 7))}><ChevronRight /></Button>
    </div>
  );
}

/** ‹ 12 Mar 2026 › */
export function DayPicker({ value, onChange, max }: { value: string; onChange: (d: string) => void; max?: string }) {
  const { t } = useHrT();
  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-ink-200 bg-white p-0.5">
      <Button variant="ghost" size="icon-sm" aria-label={t('common.previous')} onClick={() => onChange(addDays(value, -1))}><ChevronLeft /></Button>
      <input type="date" value={value} max={max} onChange={e => e.target.value && onChange(e.target.value)}
        className="h-7 rounded-md border-0 bg-transparent px-1 text-sm font-semibold text-ink-800 focus:outline-none" aria-label={t('common.date')} />
      <Button variant="ghost" size="icon-sm" aria-label={t('common.following')} disabled={!!max && addDays(value, 1) > max} onClick={() => onChange(addDays(value, 1))}><ChevronRight /></Button>
    </div>
  );
}

/** Branch dropdown; `allowAll` adds "All branches" (value null). Hidden when there is only one choice. */
export function BranchSelect({ branches, value, onChange, allowAll = true, className = '', hideSingle = true }: {
  branches: Branch[]; value: number | null; onChange: (id: number | null) => void; allowAll?: boolean; className?: string; hideSingle?: boolean;
}) {
  const { t } = useHrT();
  if (hideSingle && branches.length <= 1 && (!allowAll || branches.length === 0)) return null;
  return (
    <NativeSelect aria-label={t('app.branch')} value={value ?? ''} className={cn('w-auto min-w-[10rem]', className)}
      onChange={e => onChange(e.target.value ? Number(e.target.value) : null)}>
      {allowAll && <option value="">{t('app.allBranches')}</option>}
      {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
    </NativeSelect>
  );
}

export function EmployeeSelect({ employees, value, onChange, placeholder, id, required, className = '' }: {
  employees: Pick<Employee, 'id' | 'full_name' | 'emp_code'>[]; value: number | ''; onChange: (id: number | '') => void;
  placeholder?: string; id?: string; required?: boolean; className?: string;
}) {
  const { t } = useHrT();
  return (
    <NativeSelect id={id} required={required} value={value} className={className} onChange={e => onChange(e.target.value ? Number(e.target.value) : '')}>
      <option value="">{placeholder ?? t('common.selectEmployee')}</option>
      {employees.map(e => <option key={e.id} value={e.id}>{e.full_name} · {e.emp_code}</option>)}
    </NativeSelect>
  );
}

/** Small "are you sure" dialog. `onConfirm` may be async; the button shows progress until it settles. */
export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel, danger = true }: {
  open: boolean; onClose: () => void; onConfirm: () => Promise<unknown> | unknown; title: string; message?: ReactNode;
  confirmLabel?: string; danger?: boolean;
}) {
  const { t } = useHrT();
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (!open) setBusy(false); }, [open]);
  return (
    <Dialog open={open} onClose={onClose} title={title} width="max-w-sm">
      {message && <div className="text-sm text-ink-600">{message}</div>}
      <div className="kh-modal-actions mt-5 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={busy}>{t('common.cancel')}</Button>
        <Button variant={danger ? 'danger' : 'primary'} disabled={busy}
          onClick={async () => { setBusy(true); try { await onConfirm(); onClose(); } finally { setBusy(false); } }}>
          {busy ? t('common.saving') : confirmLabel ?? t('common.confirm')}
        </Button>
      </div>
    </Dialog>
  );
}

/** 1-5 stars; read-only without `onChange`. */
export function Stars({ value, onChange, size = 16, label }: { value: number; onChange?: (v: number) => void; size?: number; label?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" role={onChange ? 'radiogroup' : 'img'} aria-label={label ?? `${value} / 5`}>
      {[1, 2, 3, 4, 5].map(n => {
        const on = n <= Math.round(value);
        const star = <Star size={size} className={on ? 'fill-amber-400 text-amber-400' : 'text-ink-300'} />;
        return onChange
          ? <button key={n} type="button" role="radio" aria-checked={n === value} aria-label={`${n}`} onClick={() => onChange(n === value ? 0 : n)} className="p-0.5">{star}</button>
          : <span key={n}>{star}</span>;
      })}
    </span>
  );
}

const TONES = {
  green: 'bg-emerald-100 text-emerald-800',
  amber: 'bg-amber-100 text-amber-800',
  red: 'bg-red-100 text-red-700',
  blue: 'bg-sky-100 text-sky-800',
  violet: 'bg-violet-100 text-violet-800',
  gray: 'bg-ink-100 text-ink-600',
} as const;
export type Tone = keyof typeof TONES;

export function Pill({ tone = 'gray', children, className = '' }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-2xs font-semibold', TONES[tone], className)}>{children}</span>;
}

/** Translated status pill for the common workflow states. */
export function StatusPill({ status }: { status: string }) {
  const { t } = useHrT();
  const map: Record<string, [Tone, HrKey]> = {
    pending: ['amber', 'common.pending'],
    approved: ['green', 'common.approved'],
    rejected: ['red', 'common.rejected'],
    cancelled: ['gray', 'common.cancelled'],
  };
  const [tone, key] = map[status] ?? ['gray', 'common.pending'];
  return <Pill tone={tone}>{map[status] ? t(key) : status}</Pill>;
}

/** Colour swatch dot (leave types, shifts). */
export function Dot({ color, className = '' }: { color: string; className?: string }) {
  return <span aria-hidden className={cn('inline-block h-2.5 w-2.5 shrink-0 rounded-full', className)} style={{ background: color }} />;
}

/** "Export to Excel" for a table already on screen. */
export function ExportButton({ filename, header, rows, disabled }: {
  filename: string; header: string[]; rows: Array<Array<string | number | null | undefined>>; disabled?: boolean;
}) {
  const { t } = useHrT();
  return (
    <Button variant="outline" size="sm" disabled={disabled || !rows.length} onClick={() => downloadCsv(filename, header, rows)}>
      <Download /> {t('common.exportExcel')}
    </Button>
  );
}

/** Label + value pair for profile and detail views. */
export function InfoRow({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-sm">
      <span className="text-ink-500">{label}</span>
      <span className="text-right font-medium text-ink-800 [overflow-wrap:anywhere]">{value || '—'}</span>
    </div>
  );
}

/** Pick a file and hand it back; no upload of its own. */
export function FilePick({ accept, onPick, children, disabled }: { accept: string; onPick: (f: File) => void; children: ReactNode; disabled?: boolean }) {
  return (
    <label className={cn('inline-flex cursor-pointer', disabled && 'pointer-events-none opacity-50')}>
      <input type="file" accept={accept} className="sr-only" disabled={disabled}
        onChange={e => { const f = e.target.files?.[0]; if (f) onPick(f); e.target.value = ''; }} />
      {children}
    </label>
  );
}
