'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Pencil, Plus, Upload } from 'lucide-react';
import api from '../../lib/api';
import { useT } from '../../lib/cod/i18n/client';
import { computeCosts } from '../../lib/cod/calc';
import { formatLKR, formatPercent } from '../../lib/cod/format';
import { COST_CURRENCIES, type Item } from '../../lib/cod/types';
import { apiError } from '../../lib/cod/session';
import { useCod } from './CodContext';
import { Button, Dialog, Field, NativeSelect, TextInput } from './ui';

const EMPTY = {
  name: '', sku: '', category: '', image_url: '' as string | null,
  cost_currency: 'LKR', buying_price: 0, exchange_rate: 1, shipping_cost: 0, customs_price: 0, other_cost: 0,
  selling_price: 0, stock_quantity: 0, low_stock_threshold: 5,
};

/** Add / edit an item with the live landed-cost calculator. */
export default function ItemForm({ item, categorySuggestions, onSaved }: {
  item?: Item; categorySuggestions: string[]; onSaved: () => void;
}) {
  const t = useT();
  const { me, labels, refresh } = useCod();
  const importsGoods = me.business.imports_goods;
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>();
  const [values, setValues] = useState(item ? { ...EMPTY, ...item } : EMPTY);
  const costs = computeCosts(values);

  function set<K extends keyof typeof values>(key: K, value: (typeof values)[K]) {
    setValues(v => ({ ...v, [key]: value }));
  }
  const num = (key: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) => set(key, Number(e.target.value) as never);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post<{ url: string }>('/cod/items/image', fd, { timeout: 60000 });
      set('image_url', data.url);
    } catch (err) {
      toast.error(apiError(err, t) || t('items.uploadFailed'));
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.name.trim() || !values.sku.trim()) { setError(t('err.nameSku')); return; }
    setPending(true);
    setError(undefined);
    const body = {
      name: values.name, sku: values.sku, category: values.category, image_url: values.image_url || null,
      cost_currency: values.cost_currency, buying_price: values.buying_price, exchange_rate: values.exchange_rate,
      shipping_cost: values.shipping_cost, customs_price: values.customs_price, other_cost: values.other_cost,
      selling_price: values.selling_price, stock_quantity: Math.max(0, Math.trunc(values.stock_quantity)),
      low_stock_threshold: Math.max(0, Math.trunc(values.low_stock_threshold)),
    };
    try {
      if (item) await api.patch(`/cod/items/${item.id}`, body);
      else await api.post('/cod/items', body);
      toast.success(t(item ? 'items.updated' : 'items.added', { item: labels.singular }));
      setOpen(false);
      if (!item) setValues(EMPTY);
      onSaved();
      if (!item) refresh();
    } catch (err) {
      setError(apiError(err, t, me));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      {item ? (
        <Button variant="ghost" size="icon" aria-label={t('items.edit', { item: labels.singularLower })} onClick={() => setOpen(true)}>
          <Pencil />
        </Button>
      ) : (
        <Button onClick={() => setOpen(true)}><Plus /> {t('items.add', { item: labels.singularLower })}</Button>
      )}
      <Dialog open={open} onClose={() => setOpen(false)} title={t(item ? 'items.edit' : 'items.add', { item: labels.singularLower })}>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('common.name')} htmlFor="name" className="col-span-2">
              <TextInput id="name" required value={values.name} onChange={e => set('name', e.target.value)} />
            </Field>
            <Field label={t('common.sku')} htmlFor="sku">
              <TextInput id="sku" required value={values.sku} onChange={e => set('sku', e.target.value)} />
            </Field>
            <Field label={t('common.category')} htmlFor="category">
              <TextInput id="category" value={values.category} onChange={e => set('category', e.target.value)}
                placeholder={categorySuggestions[0] ?? 'Uncategorized'} list="cod-category-suggestions" autoComplete="off" />
              <datalist id="cod-category-suggestions">
                {categorySuggestions.map(c => <option key={c} value={c} />)}
              </datalist>
            </Field>

            <Field label={t('common.image')} className="col-span-2">
              <div className="flex items-center gap-3">
                {values.image_url
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={values.image_url} alt="" className="h-12 w-12 rounded-lg border border-ink-200 object-cover" />
                  : <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-ink-200 bg-ink-50 text-ink-400"><Upload size={16} /></div>}
                <TextInput type="file" accept="image/*" onChange={onUpload} disabled={uploading} />
              </div>
            </Field>

            {importsGoods && (
              <>
                <Field label={t('items.costCurrency')} htmlFor="cost_currency">
                  <NativeSelect id="cost_currency" value={values.cost_currency} onChange={e => set('cost_currency', e.target.value)}>
                    {COST_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </NativeSelect>
                </Field>
                <Field label={t('items.exchangeRate')} htmlFor="exchange_rate">
                  <TextInput id="exchange_rate" type="number" step="0.0001" min={0} value={values.exchange_rate} onChange={num('exchange_rate')} />
                </Field>
              </>
            )}
            {/* Local businesses don't see the import fields; an item keeps whatever currency / rate / customs it already has */}

            <Field label={t(importsGoods ? 'items.buyingPrice' : 'items.costPrice', { currency: values.cost_currency })} htmlFor="buying_price">
              <TextInput id="buying_price" type="number" step="0.01" min={0} value={values.buying_price} onChange={num('buying_price')} />
            </Field>
            <Field label={t(importsGoods ? 'items.shipping' : 'items.packagingDelivery')} htmlFor="shipping_cost">
              <TextInput id="shipping_cost" type="number" step="0.01" min={0} value={values.shipping_cost} onChange={num('shipping_cost')} />
            </Field>
            {importsGoods && (
              <Field label={t('items.customs')} htmlFor="customs_price">
                <TextInput id="customs_price" type="number" step="0.01" min={0} value={values.customs_price} onChange={num('customs_price')} />
              </Field>
            )}
            <Field label={t('items.otherCost')} htmlFor="other_cost">
              <TextInput id="other_cost" type="number" step="0.01" min={0} value={values.other_cost} onChange={num('other_cost')} />
            </Field>
            <Field label={t('items.sellingPriceLkr')} htmlFor="selling_price">
              <TextInput id="selling_price" type="number" step="0.01" min={0} value={values.selling_price} onChange={num('selling_price')} />
            </Field>
            <Field label={t('items.stockQuantity')} htmlFor="stock_quantity">
              <TextInput id="stock_quantity" type="number" min={0} value={values.stock_quantity} onChange={num('stock_quantity')} />
            </Field>
            <Field label={t('items.lowThreshold')} htmlFor="low_stock_threshold">
              <TextInput id="low_stock_threshold" type="number" min={0} value={values.low_stock_threshold} onChange={num('low_stock_threshold')} />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-2 rounded-xl border border-ink-200 bg-ink-50 p-3 text-sm">
            <div><p className="text-xs text-ink-500">{t('items.landedCost')}</p><p className="font-semibold">{formatLKR(costs.landedCost)}</p></div>
            <div><p className="text-xs text-ink-500">{t('items.profitPerUnit')}</p>
              <p className={costs.profitPerUnit < 0 ? 'font-semibold text-red-600' : 'font-semibold'}>{formatLKR(costs.profitPerUnit)}</p></div>
            <div><p className="text-xs text-ink-500">{t('items.margin')}</p><p className="font-semibold">{formatPercent(costs.marginPercent)}</p></div>
          </div>

          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end">
            <Button type="submit" disabled={pending || uploading}>
              {pending ? t('common.saving') : item ? t('common.saveChanges') : t('items.add', { item: labels.singularLower })}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
