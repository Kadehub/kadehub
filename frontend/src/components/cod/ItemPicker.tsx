'use client';

import { useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { useT } from '../../lib/cod/i18n/client';
import { formatLKR } from '../../lib/cod/format';
import type { Item } from '../../lib/cod/types';
import { Button, Dialog, cn } from './ui';

const MAX_ROWS = 300;

/**
 * "Add items" sheet opened from the order form: the whole catalogue, searchable by name or SKU.
 * Tapping a row adds one (or one more) of that item and keeps the sheet open; Done closes it.
 */
export function ItemPicker({ open, onClose, items, inOrder, lineCount, onAdd }: {
  open: boolean;
  onClose: () => void;
  items: Item[];
  /** item id → quantity already in the order */
  inOrder: Map<number, number>;
  /** Lines in the order (catalogue + custom), shown in the subtitle and on Done */
  lineCount: number;
  onAdd: (item: Item) => void;
}) {
  const t = useT();
  const [q, setQ] = useState('');

  const sorted = useMemo(() => [...items].sort((a, b) => a.name.localeCompare(b.name)), [items]);
  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return sorted;
    return sorted.filter(i => i.name.toLowerCase().includes(needle) || i.sku.toLowerCase().includes(needle));
  }, [sorted, q]);
  const shown = matches.slice(0, MAX_ROWS);

  const close = () => { setQ(''); onClose(); };

  return (
    <Dialog open={open} onClose={close} title={t('picker.title')} width="max-w-lg">
      {/* Search stays put while the list scrolls */}
      <div className="sticky z-[1] bg-white pb-2"
        style={{ top: 'calc(-1 * var(--kh-my))', margin: 'calc(-1 * var(--kh-my)) calc(-1 * var(--kh-mx)) 0', padding: 'var(--kh-my) var(--kh-mx) .5rem' }}>
        <p className="mb-2 text-sm text-ink-500">{t('picker.subtitle', { count: lineCount })}</p>
        <label className="relative block">
          <span className="sr-only">{t('picker.search')}</span>
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" aria-hidden />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder={t('picker.search')} type="search" autoComplete="off"
            className="h-11 w-full rounded-xl border border-ink-200 bg-white pl-9 pr-3 text-[16px] sm:text-sm text-ink-800 placeholder:text-ink-400 focus:border-[color:var(--cod-primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--cod-primary)]/30" />
        </label>
      </div>

      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-500">{t('picker.empty')}</p>
      ) : shown.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-500">{t('picker.noMatch', { q })}</p>
      ) : (
        <ul className="divide-y divide-ink-100">
          {shown.map(i => {
            const added = inOrder.get(i.id) ?? 0;
            const out = i.stock_quantity <= 0;
            return (
              <li key={i.id}>
                <button type="button" onClick={() => onAdd(i)}
                  className="flex w-full items-center gap-3 py-2.5 text-left transition-colors hover:bg-ink-50 focus-visible:bg-ink-50 focus-visible:outline-none">
                  <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                    added ? 'bg-[color:var(--cod-primary)] text-[color:var(--cod-primary-fg)]' : 'bg-blue-50 text-[color:var(--cod-primary)]')}>
                    {added ? <span className="text-sm font-bold">{added}</span> : <Plus size={18} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink-900">{i.name}</span>
                    <span className="block truncate text-xs text-ink-500">
                      {i.sku} · <span className={out ? 'font-semibold text-red-600' : undefined}>{t('picker.stock', { count: i.stock_quantity })}</span>
                      {added > 0 && <span className="ml-1.5 font-semibold text-[color:var(--cod-primary)]">· {t('picker.inOrder', { count: added })}</span>}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold text-ink-900">{formatLKR(i.selling_price)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {matches.length > MAX_ROWS && <p className="py-3 text-center text-xs text-ink-400">{t('picker.more', { count: MAX_ROWS })}</p>}

      <div className="kh-modal-actions">
        <Button className="w-full justify-center" onClick={close}>{t('picker.done', { count: lineCount })}</Button>
      </div>
    </Dialog>
  );
}
