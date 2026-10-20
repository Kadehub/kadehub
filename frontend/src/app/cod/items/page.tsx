'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Trash2 } from 'lucide-react';
import { MascotState } from '../../../components/brand/Mascot';
import { useCod } from '../../../components/cod/CodContext';
import ItemForm from '../../../components/cod/ItemForm';
import { Badge, Button, NativeSelect, PageHeader, SearchInput, tbl } from '../../../components/cod/ui';
import api from '../../../lib/api';
import { useT } from '../../../lib/cod/i18n/client';
import { itemCategorySuggestions } from '../../../lib/cod/business-types';
import { marginPercent } from '../../../lib/cod/calc';
import { formatLKR, formatPercent } from '../../../lib/cod/format';
import { apiError } from '../../../lib/cod/session';
import type { Item } from '../../../lib/cod/types';

// cod.kadehub.com/items — stock list with landed cost, margin and low-stock flags
export default function CodItemsPage() {
  const t = useT();
  const { me, labels, refresh } = useCod();
  const [items, setItems] = useState<Item[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  const load = () => {
    setFailed(false);
    api.get<Item[]>('/cod/items').then(r => setItems(r.data)).catch(() => setFailed(true));
  };
  useEffect(load, []);

  const categories = useMemo(() => Array.from(new Set((items ?? []).map(i => i.category))).sort(), [items]);
  const suggestions = useMemo(() => itemCategorySuggestions(me.business.business_type, categories), [me.business.business_type, categories]);

  if (failed) {
    return <MascotState variant="error" title={t('app.loadErrorTitle')} description={t('app.loadErrorBody')}
      action={<Button onClick={load}>{t('common.retry')}</Button>} />;
  }
  if (!items) return <MascotState variant="loading" size="sm" title={t('app.loading')} />;

  const q = search.toLowerCase();
  const filtered = items.filter(i =>
    (!q || i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q)) && (category === 'all' || i.category === category));
  const importsGoods = me.business.imports_goods;

  async function onDelete(id: number, name: string) {
    if (!confirm(t('items.deleteConfirm', { name }))) return;
    try {
      await api.delete(`/cod/items/${id}`);
      toast.success(t('items.deleted', { item: labels.singular }));
      setItems(list => (list ?? []).filter(i => i.id !== id));
      refresh();
    } catch (err) {
      toast.error(apiError(err, t, me));
    }
  }

  const addButton = <ItemForm categorySuggestions={suggestions} onSaved={load} />;

  return (
    <div className="space-y-4">
      <PageHeader title={labels.plural} actions={items.length > 0 && addButton} />

      {items.length === 0 ? (
        <MascotState variant="empty" title={t('items.emptyTitle', { items: labels.pluralLower })}
          description={t('items.empty', { items: labels.pluralLower, item: labels.singularLower })} action={addButton} />
      ) : (
        <>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <SearchInput value={search} onChange={setSearch} placeholder={t('items.searchPlaceholder')} />
            <NativeSelect value={category} onChange={e => setCategory(e.target.value)} className="sm:w-48">
              <option value="all">{t('common.allCategories')}</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </NativeSelect>
          </div>

          {filtered.length === 0 ? (
            <p className="rounded-xl border border-dashed border-ink-300 p-8 text-center text-sm text-ink-500">
              {t('items.noMatch', { items: labels.pluralLower })}
            </p>
          ) : (
            <div className={tbl.wrap}>
              <table className={tbl.table}>
                <thead><tr>
                  <th className={tbl.th}>{labels.singular}</th>
                  <th className={tbl.th}>{t('common.category')}</th>
                  <th className={`${tbl.th} ${tbl.right}`}>{importsGoods ? t('items.landedCost') : t('items.cost')}</th>
                  <th className={`${tbl.th} ${tbl.right}`}>{t('items.sellingPrice')}</th>
                  <th className={`${tbl.th} ${tbl.right}`}>{t('items.margin')}</th>
                  <th className={`${tbl.th} ${tbl.right}`}>{t('common.stock')}</th>
                  <th className={tbl.th} />
                </tr></thead>
                <tbody>
                  {filtered.map(i => {
                    const margin = marginPercent(i.selling_price, i.landed_cost);
                    return (
                      <tr key={i.id}>
                        <td className={tbl.td}>
                          <div className="flex items-center gap-2">
                            {i.image_url
                              // eslint-disable-next-line @next/next/no-img-element
                              ? <img src={i.image_url} alt="" className="h-8 w-8 shrink-0 rounded object-cover" />
                              : <div className="h-8 w-8 shrink-0 rounded bg-ink-100" />}
                            <div className="min-w-0">
                              <p className="truncate font-medium text-ink-900">{i.name}</p>
                              <p className="truncate text-xs text-ink-400">{i.sku}</p>
                            </div>
                          </div>
                        </td>
                        <td className={tbl.td}>{i.category}</td>
                        <td className={`${tbl.td} ${tbl.right}`}>{formatLKR(i.landed_cost)}</td>
                        <td className={`${tbl.td} ${tbl.right}`}>{formatLKR(i.selling_price)}</td>
                        <td className={`${tbl.td} ${tbl.right} ${margin < 0 ? 'text-red-600' : ''}`}>{formatPercent(margin)}</td>
                        <td className={`${tbl.td} ${tbl.right}`}>
                          <Badge tone={i.stock_quantity <= i.low_stock_threshold ? 'red' : 'gray'}>{i.stock_quantity}</Badge>
                        </td>
                        <td className={tbl.td}>
                          <div className="flex justify-end gap-1">
                            <ItemForm item={i} categorySuggestions={suggestions} onSaved={load} />
                            <Button variant="ghost" size="icon" aria-label={t('items.delete', { item: labels.singularLower })} onClick={() => onDelete(i.id, i.name)}>
                              <Trash2 />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
