'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Boxes, Lock } from 'lucide-react';
import { MascotState } from '../../../../components/brand/Mascot';
import { useCod } from '../../../../components/cod/CodContext';
import { PremiumLock, codHref } from '../../../../components/cod/bits';
import { Button, NativeSelect, PageHeader, SearchInput, btnClass, cn } from '../../../../components/cod/ui';
import api from '../../../../lib/api';
import { useT } from '../../../../lib/cod/i18n/client';
import { formatLKR, formatNumber } from '../../../../lib/cod/format';
import type { RangeKey } from '../../../../lib/cod/dates';
import { STATUS_STYLE } from '../../../../lib/cod/order-status';
import type { StageUnits } from '../../../../lib/cod/units';

const RANGE_KEYS: RangeKey[] = ['all', 'today', 'yesterday', 'this_month', 'last_month', 'last_3_months', 'this_year'];

// cod.kadehub.com/orders/units — units & revenue per item by order stage (per-item rows are Premium)
export default function CodUnitsPage() {
  const t = useT();
  const { me, labels } = useCod();
  const premium = !!me.premium;
  const [rangeKey, setRangeKey] = useState<RangeKey>('all');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [stages, setStages] = useState<StageUnits[] | null>(null);
  const [failed, setFailed] = useState(false);

  // Debounced search → server recomputes the stage totals
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const id = setTimeout(() => setQuery(search.trim()), 350);
    return () => clearTimeout(id);
  }, [search]);

  const load = () => {
    setFailed(false);
    api.get<{ stages: StageUnits[] }>('/cod/units', { params: { range: rangeKey, q: query || undefined } })
      .then(r => setStages(r.data.stages))
      .catch(() => setFailed(true));
  };
  useEffect(load, [rangeKey, query]);

  return (
    <div className="space-y-4">
      <PageHeader title={t('units.title', { item: labels.singular })} subtitle={t('units.subtitle', { item: labels.singularLower })}
        actions={<Link href={codHref('/orders')} className={btnClass('outline')}><ArrowLeft /> {t('orders.breadcrumb')}</Link>} />

      {!premium && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-ink-200 bg-white px-4 py-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-100 text-[color:var(--cod-primary)]"><Lock size={15} /></span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink-900">{t('units.lockedTitle')}</p>
            <p className="text-xs text-ink-500">{t('units.lockedBody')}</p>
          </div>
          <Link href={codHref('/billing')} className={btnClass('primary', 'sm')}>{t('premium.upgrade')}</Link>
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchInput value={search} onChange={setSearch} disabled={!premium}
          placeholder={premium ? t('units.searchPlaceholder') : t('units.searchLocked')}
          trailing={!premium ? <Lock size={13} /> : undefined} />
        <NativeSelect value={rangeKey} onChange={e => setRangeKey(e.target.value as RangeKey)} className="sm:w-44">
          {RANGE_KEYS.map(k => <option key={k} value={k}>{t(`range.${k}`)}</option>)}
        </NativeSelect>
      </div>

      {failed ? (
        <MascotState variant="error" title={t('app.loadErrorTitle')} description={t('app.loadErrorBody')}
          action={<Button onClick={load}>{t('common.retry')}</Button>} />
      ) : !stages ? (
        <MascotState variant="loading" size="sm" title={t('app.loading')} />
      ) : (
        <div className="grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stages.map(s => (
            <section key={s.status} className="overflow-hidden rounded-xl border border-ink-200 bg-white">
              <div className="p-4 pb-3">
                <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold', STATUS_STYLE[s.status].badge)}>
                  {t(`status.${s.status}`)}
                </span>
                <p className="mt-2 text-xl font-bold tracking-tight text-ink-900">{formatLKR(s.revenue)}</p>
                <p className="text-xs text-ink-500">{t('units.summary', { units: formatNumber(s.units), products: formatNumber(s.products) })}</p>
              </div>
              {s.products === 0 ? (
                <div className="flex flex-col items-center gap-2 border-t border-ink-100 px-4 py-10 text-ink-400">
                  <Boxes size={20} /><p className="text-xs">{t('units.empty')}</p>
                </div>
              ) : (
                <PremiumLock compact locked={!premium} className="border-t border-ink-100" title={t('premium.badge')} message={t('units.lockedBody')}>
                  <div className="max-h-96 overflow-y-auto">
                    <table className="w-full table-fixed text-sm">
                      <colgroup><col /><col className="w-16" /><col className="w-32" /></colgroup>
                      <thead className="sticky top-0 bg-white">
                        <tr className="text-left text-xs text-ink-500">
                          <th className="px-4 py-2 font-medium">{labels.singular}</th>
                          <th className="px-1 py-2 text-right font-medium">{t('orders.units')}</th>
                          <th className="px-4 py-2 text-right font-medium">{t('common.revenue')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {s.rows.map(r => (
                          <tr key={r.key} className="border-t border-ink-100">
                            <td className="px-4 py-2">
                              <p className="line-clamp-2 break-words font-medium leading-snug" title={r.name}>{r.name}</p>
                              {r.sku && <p className="truncate text-[11px] text-ink-400">{r.sku}</p>}
                            </td>
                            <td className="px-1 py-2 text-right tabular-nums">{formatNumber(r.units)}</td>
                            <td className="whitespace-nowrap px-4 py-2 text-right font-semibold tabular-nums">{formatLKR(r.revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </PremiumLock>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
