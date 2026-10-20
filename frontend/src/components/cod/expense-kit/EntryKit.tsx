'use client';
/**
 * Shared tap-to-add pieces for business and personal expenses: big amount display, keypad,
 * category tiles, chip rows, When chips and the lookalike warning. Built once, used by both sheets.
 */
import { useEffect, useRef } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Delete } from 'lucide-react';
import { cn } from '../ui';
import { keyFromKeyboard, pushKey, type KeypadKey } from '../../../lib/cod/expenses/keypad';

/** "1250.5" → "Rs. 1,250.5" (keeps what's typed, adds thousands separators). */
export function formatTyped(value: string): string {
  if (!value) return 'Rs. 0';
  const [int, dec] = value.split('.');
  const grouped = Number(int || '0').toLocaleString('en-US');
  return `Rs. ${grouped}${dec !== undefined ? `.${dec}` : ''}`;
}

export function AmountDisplay({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center" aria-live="polite">
      <p className="text-2xs font-semibold uppercase tracking-widest text-ink-400">{label}</p>
      <p className={cn('mt-0.5 font-extrabold tracking-tight tabular-nums', value ? 'text-ink-900' : 'text-ink-300', 'text-4xl')}>
        {formatTyped(value)}
      </p>
    </div>
  );
}

const KEYS: KeypadKey[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'back'];

/**
 * 3×4 keypad with 48px keys. Hold ⌫ to clear. While `active`, the physical keyboard works too
 * (digits, . or , , Backspace, Enter = submit) unless a text field has focus.
 */
export function Keypad({ value, onChange, onSubmit, active, backLabel }: {
  value: string; onChange: (v: string) => void; onSubmit: () => void; active: boolean; backLabel: string;
}) {
  const valueRef = useRef(value);
  valueRef.current = value;
  const holdTimer = useRef<ReturnType<typeof setTimeout>>();
  const held = useRef(false);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'Enter') { e.preventDefault(); onSubmit(); return; }
      const k = keyFromKeyboard(e.key);
      if (!k) return;
      e.preventDefault();
      onChange(pushKey(valueRef.current, k));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, onChange, onSubmit]);

  const press = (k: KeypadKey) => onChange(pushKey(valueRef.current, k));

  return (
    <div className="grid grid-cols-3 gap-2" role="group" aria-label="Keypad">
      {KEYS.map(k => k === 'back' ? (
        <button key={k} type="button" aria-label={backLabel}
          onPointerDown={() => { held.current = false; holdTimer.current = setTimeout(() => { held.current = true; onChange(''); }, 550); }}
          onPointerUp={() => clearTimeout(holdTimer.current)}
          onPointerLeave={() => clearTimeout(holdTimer.current)}
          onClick={() => { if (!held.current) press('back'); }}
          className="flex h-12 items-center justify-center rounded-xl bg-ink-100 text-ink-700 active:bg-ink-200 select-none">
          <Delete size={20} />
        </button>
      ) : (
        <button key={k} type="button" onClick={() => press(k)}
          className="h-12 rounded-xl bg-ink-50 text-xl font-semibold text-ink-900 active:bg-ink-200 select-none tabular-nums">
          {k}
        </button>
      ))}
    </div>
  );
}

export interface TileOption { value: string; label: string; icon: LucideIcon; color: string }

/** Category tiles as a radio group (icon in a ~12% tinted circle, full-colour glyph). */
export function CategoryTiles({ options, value, onChange, columns, label }: {
  options: TileOption[]; value: string; onChange: (v: string) => void; columns: 4 | 5; label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('grid gap-1.5', columns === 5 ? 'grid-cols-5' : 'grid-cols-4')}>
      {options.map(({ value: v, label: l, icon: Icon, color }) => {
        const on = v === value;
        return (
          <button key={v} type="button" role="radio" aria-checked={on} onClick={() => onChange(v)}
            className={cn('flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-xl border px-1 py-1.5 text-center transition-colors',
              on ? 'border-[color:var(--cod-primary)] ring-1 ring-[color:var(--cod-primary)]' : 'border-ink-100 hover:bg-ink-50')}>
            <span className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: `${color}1f`, color }}>
              <Icon size={17} />
            </span>
            <span className="text-[11px] font-semibold leading-tight text-ink-700 line-clamp-2">{l}</span>
          </button>
        );
      })}
    </div>
  );
}

/** A row of toggle chips (aria-pressed). */
export function ChipRow<T extends string | number>({ options, value, onChange, label, className = '' }: {
  options: { value: T; label: string }[]; value: T | null; onChange: (v: T) => void; label: string; className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={cn('flex flex-wrap gap-1.5', className)}>
      {options.map(o => {
        const on = o.value === value;
        return (
          <button key={String(o.value)} type="button" aria-pressed={on} onClick={() => onChange(o.value)}
            className={cn('min-h-[36px] rounded-full border px-3 text-sm font-semibold transition-colors',
              on ? 'border-[color:var(--cod-primary)] bg-[color:var(--cod-primary)] text-[color:var(--cod-primary-fg)]' : 'border-ink-200 bg-white text-ink-700 hover:bg-ink-50')}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Today / Yesterday / Pick date (native picker, no future dates). */
export function WhenChips({ value, onChange, today, yesterday, labels }: {
  value: string; onChange: (v: string) => void; today: string; yesterday: string;
  labels: { today: string; yesterday: string; pick: string; group: string };
}) {
  const picked = value !== today && value !== yesterday;
  return (
    <div role="group" aria-label={labels.group} className="flex flex-wrap items-center gap-1.5">
      <ChipRow label={labels.group} value={picked ? null : value}
        options={[{ value: today, label: labels.today }, { value: yesterday, label: labels.yesterday }]} onChange={onChange} />
      <label className={cn('relative inline-flex min-h-[36px] cursor-pointer items-center rounded-full border px-3 text-sm font-semibold',
        picked ? 'border-[color:var(--cod-primary)] bg-[color:var(--cod-primary)] text-[color:var(--cod-primary-fg)]' : 'border-ink-200 bg-white text-ink-700')}>
        {picked ? value : labels.pick}
        <input type="date" max={today} value={value} aria-label={labels.pick}
          onChange={e => e.target.value && onChange(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0" />
      </label>
    </div>
  );
}

export function DuplicatePanel({ message, onCancel, onConfirm, labels, busy }: {
  message: string; onCancel: () => void; onConfirm: () => void; labels: { title: string; no: string; yes: string }; busy?: boolean;
}) {
  return (
    <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
      <p className="font-bold">{labels.title}</p>
      <p className="mt-0.5">{message}</p>
      <div className="mt-2 flex gap-2">
        <button type="button" onClick={onCancel} className="min-h-[40px] flex-1 rounded-lg border border-amber-300 bg-white font-semibold">{labels.no}</button>
        <button type="button" onClick={onConfirm} disabled={busy} className="min-h-[40px] flex-1 rounded-lg bg-amber-500 font-semibold text-white disabled:opacity-60">{labels.yes}</button>
      </div>
    </div>
  );
}
