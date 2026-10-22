'use client';

import { useEffect, useState } from 'react';
import { Delete } from 'lucide-react';
import { useHrT } from '../../../../lib/hr/i18n';
import { cn } from '../../ui';

/** Four-digit PIN entry with big buttons; submits on the fourth digit. Keyboard digits work too. */
export default function PinPad({ busy, error, onSubmit }: { busy: boolean; error: string | null; onSubmit: (pin: string) => void }) {
  const { t } = useHrT();
  const [pin, setPin] = useState('');

  useEffect(() => { if (error) setPin(''); }, [error]);

  useEffect(() => {
    if (pin.length !== 4) return;
    const id = setTimeout(() => onSubmit(pin), 120);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  const press = (d: string) => {
    if (busy) return;
    setPin(p => (p.length >= 4 ? p : p + d));
  };

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') setPin(p => p.slice(0, -1));
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy]);

  return (
    <div className="mx-auto w-full max-w-xs">
      <div className="mb-2 flex justify-center gap-4" aria-label={t('ksk.pin.entered', { n: pin.length })} role="status">
        {[0, 1, 2, 3].map(i => (
          <span key={i} className={cn('h-4 w-4 rounded-full border-2 border-ink-400 transition-colors', i < pin.length && 'border-[color:var(--cod-primary)] bg-[color:var(--cod-primary)]')} />
        ))}
      </div>
      <p className={cn('mb-4 min-h-[1.25rem] text-center text-sm font-semibold', error ? 'text-red-600' : 'text-ink-400')} role={error ? 'alert' : undefined}>
        {error ?? (busy ? t('ksk.pin.checking') : t('ksk.pin.prompt'))}
      </p>
      <div className="grid grid-cols-3 gap-3">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => (
          <button key={d} type="button" onClick={() => press(d)} disabled={busy}
            className="h-16 rounded-2xl bg-white text-2xl font-bold text-ink-800 shadow-sm ring-1 ring-ink-200 active:scale-95 active:bg-ink-100 disabled:opacity-50">
            {d}
          </button>
        ))}
        <button type="button" onClick={() => setPin('')} disabled={busy} className="h-16 rounded-2xl text-sm font-semibold text-ink-500 active:bg-ink-100">
          {t('ksk.pin.clear')}
        </button>
        <button type="button" onClick={() => press('0')} disabled={busy}
          className="h-16 rounded-2xl bg-white text-2xl font-bold text-ink-800 shadow-sm ring-1 ring-ink-200 active:scale-95 active:bg-ink-100 disabled:opacity-50">
          0
        </button>
        <button type="button" onClick={() => setPin(p => p.slice(0, -1))} disabled={busy} aria-label={t('ksk.pin.backspace')}
          className="flex h-16 items-center justify-center rounded-2xl text-ink-500 active:bg-ink-100">
          <Delete size={24} />
        </button>
      </div>
    </div>
  );
}
