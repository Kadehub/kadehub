'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Download, FileText, Image as ImageIcon, Share2 } from 'lucide-react';
import { MascotState } from '../../../components/brand/Mascot';
import { useCod } from '../../../components/cod/CodContext';
import { codHref } from '../../../components/cod/bits';
import { Button, Card, Field, SearchInput, TextInput, Toggle, btnClass, cn } from '../../../components/cod/ui';
import api from '../../../lib/api';
import { useT } from '../../../lib/cod/i18n/client';
import { BRAND_SWATCHES, normalizeHex } from '../../../lib/cod/brand';
import { catalogTitleFor } from '../../../lib/cod/business-types';
import type { Columns } from '../../../lib/cod/catalog-layout';
import {
  canvasToBlob, catalogFileName, catalogToPdf, downloadBlob, renderCatalogPages,
  type CatalogBusiness, type CatalogEntry, type CatalogOptions,
} from '../../../lib/cod/catalog-render';
import type { MessageKey } from '../../../lib/cod/i18n/messages/en';
import { shareFiles, useCanShare } from '../../../lib/cod/use-can-share';
import type { Item } from '../../../lib/cod/types';

const COLUMN_CHOICES: { value: Columns; label: MessageKey; hint: MessageKey }[] = [
  { value: 2, label: 'cat.size.large', hint: 'cat.size.largeHint' },
  { value: 3, label: 'cat.size.medium', hint: 'cat.size.mediumHint' },
  { value: 4, label: 'cat.size.compact', hint: 'cat.size.compactHint' },
];
const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

// cod.kadehub.com/catalog — loads items, then hands over to the generator
export default function CodCatalogPage() {
  const t = useT();
  const { me } = useCod();
  const [items, setItems] = useState<Item[] | null>(null);
  const [failed, setFailed] = useState(false);
  const load = () => { setFailed(false); api.get<Item[]>('/cod/items').then(r => setItems(r.data)).catch(() => setFailed(true)); };
  useEffect(load, []);

  if (failed) {
    return <MascotState variant="error" title={t('app.loadErrorTitle')} description={t('app.loadErrorBody')}
      action={<Button onClick={load}>{t('common.retry')}</Button>} />;
  }
  if (!items) return <MascotState variant="loading" size="sm" title={t('app.loading')} />;
  // Reset the editable title/subtitle when the language changes
  return <CatalogGenerator key={t.locale} items={items} defaultTitle={catalogTitleFor(me.business.business_type, t)} />;
}

function CatalogGenerator({ items, defaultTitle }: { items: Item[]; defaultTitle: string }) {
  const t = useT();
  const { me, labels } = useCod();
  const b = me.business;
  const business = useMemo<CatalogBusiness>(() => ({
    name: b.name, phone: b.phone, address: [b.address, b.city].filter(Boolean).join(', '), tagline: b.tagline, logoUrl: b.logo_url,
  }), [b]);
  const categories = useMemo(() => Array.from(new Set(items.map(i => i.category || 'Uncategorized'))).sort(), [items]);

  const [title, setTitle] = useState(defaultTitle);
  const [subtitle, setSubtitle] = useState(t('cat.defaultSubtitle'));
  const [columns, setColumns] = useState<Columns>(3);
  const [showPrice, setShowPrice] = useState(true);
  const [showStock, setShowStock] = useState(true);
  const [showSku, setShowSku] = useState(false);
  const [groupByCategory, setGroupByCategory] = useState(categories.length > 1);
  const [includeSoldOut, setIncludeSoldOut] = useState(false);
  const [accent, setAccent] = useState(normalizeHex(b.brand_color));
  const [pickedCategories, setPickedCategories] = useState<Set<string>>(new Set());
  const [excluded, setExcluded] = useState<Set<number>>(new Set());
  const [pickerSearch, setPickerSearch] = useState('');
  const [busy, setBusy] = useState<'pdf' | 'jpg' | 'share' | null>(null);
  const canShare = useCanShare();

  // Items passing the category / stock filters — the checklist chooses within these
  const pool = useMemo(() => items.filter(i =>
    (includeSoldOut || i.stock_quantity > 0) && (pickedCategories.size === 0 || pickedCategories.has(i.category || 'Uncategorized'))),
  [items, includeSoldOut, pickedCategories]);

  const entries = useMemo<CatalogEntry[]>(() => pool.filter(i => !excluded.has(i.id)).map(i => ({
    id: String(i.id), name: i.name, sku: i.sku, category: i.category || 'Uncategorized', price: Number(i.selling_price),
    stock: i.stock_quantity, lowStockThreshold: i.low_stock_threshold, imageUrl: i.image_url,
  })), [pool, excluded]);

  const options = useMemo<CatalogOptions>(() => ({
    title, subtitle, columns, showPrice, showStock, showSku, groupByCategory, accent,
    // Templates keep their placeholders; the renderer fills them in per page / item
    labels: {
      toOrder: t('catr.toOrder', { phone: '{phone}' }),
      page: t('catr.page', { n: '{n}', total: '{total}' }),
      soldOut: t('catr.soldOut'),
      onlyLeft: t('catr.onlyLeft', { n: '{n}' }),
      empty: t('catr.empty'),
    },
  }), [title, subtitle, columns, showPrice, showStock, showSku, groupByCategory, accent, t]);

  // Live preview, rendered small and re-rendered shortly after each change
  const previewKey = useMemo(() => JSON.stringify([business, options, entries]), [business, options, entries]);
  const [preview, setPreview] = useState<{ key: string; urls: string[] }>({ key: '', urls: [] });
  const rendering = preview.key !== previewKey;

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const canvases = await renderCatalogPages(business, entries, options, 0.6);
        const blobs = await Promise.all(canvases.map(c => canvasToBlob(c, 0.85)));
        const urls = blobs.map(x => URL.createObjectURL(x));
        if (cancelled) urls.forEach(u => URL.revokeObjectURL(u));
        else setPreview({ key: previewKey, urls });
      } catch {
        if (!cancelled) setPreview({ key: previewKey, urls: [] });
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [business, entries, options, previewKey]);

  useEffect(() => {
    const urls = preview.urls;
    return () => urls.forEach(u => URL.revokeObjectURL(u));
  }, [preview.urls]);

  async function run(kind: 'pdf' | 'jpg' | 'share', job: () => Promise<void>) {
    setBusy(kind);
    try { await job(); } catch (err) { toast.error(err instanceof Error ? err.message : t('cat.error')); } finally { setBusy(null); }
  }
  const downloadPdf = () => run('pdf', async () => {
    downloadBlob(await catalogToPdf(await renderCatalogPages(business, entries, options, 1)), catalogFileName(business.name, 'pdf'));
    toast.success(t('cat.pdfDone'));
  });
  const downloadJpg = () => run('jpg', async () => {
    const pages = await renderCatalogPages(business, entries, options, 1);
    for (let i = 0; i < pages.length; i++) {
      downloadBlob(await canvasToBlob(pages[i], 0.92), catalogFileName(business.name, 'jpg', pages.length > 1 ? i + 1 : undefined));
      if (i < pages.length - 1) await wait(300); // browsers drop back-to-back downloads
    }
    toast.success(t.n('cat.jpgDone', pages.length));
  });
  const share = () => run('share', async () => {
    const pdf = await catalogToPdf(await renderCatalogPages(business, entries, options, 1));
    const file = new File([pdf], catalogFileName(business.name, 'pdf'), { type: 'application/pdf' });
    if ((await shareFiles([file], { title: `${business.name} — ${title}` })) === 'unsupported') toast.error(t('cat.shareUnsupported'));
  });

  function toggle<T>(set: Set<T>, value: T): Set<T> {
    const next = new Set(set);
    if (!next.delete(value)) next.add(value);
    return next;
  }

  if (items.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold tracking-tight text-ink-900">{t('nav.catalog')}</h1>
        <div className="rounded-xl border border-dashed border-ink-300 bg-white p-10 text-center text-sm text-ink-500">
          <p>{t('cat.emptyHelp', { items: labels.pluralLower })}</p>
          <Link href={codHref('/items')} className={btnClass('primary', 'md', 'mt-4')}>{t('cat.goTo', { items: labels.plural })}</Link>
        </div>
      </div>
    );
  }

  const noEntries = entries.length === 0;
  const visibleInPicker = pool.filter(i => !pickerSearch || `${i.name} ${i.sku}`.toLowerCase().includes(pickerSearch.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink-900">{t('nav.catalog')}</h1>
          <p className="text-sm text-ink-500">{t('cat.subtitle', { items: labels.pluralLower })}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={downloadPdf} disabled={noEntries || busy !== null}><FileText /> {busy === 'pdf' ? t('cat.creatingPdf') : t('cat.downloadPdf')}</Button>
          <Button variant="outline" onClick={downloadJpg} disabled={noEntries || busy !== null}><ImageIcon /> {busy === 'jpg' ? t('cat.creatingImages') : t('cat.downloadJpg')}</Button>
          {canShare && <Button variant="outline" onClick={share} disabled={noEntries || busy !== null}><Share2 /> {busy === 'share' ? t('common.preparing') : t('common.share')}</Button>}
        </div>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[22rem_1fr]">
        <div className="space-y-4">
          <Card title={t('cat.heading')}>
            <div className="space-y-3">
              <Field label={t('cat.title')} htmlFor="cat-title"><TextInput id="cat-title" value={title} maxLength={60} onChange={e => setTitle(e.target.value)} /></Field>
              <Field label={t('cat.subtitleField')} htmlFor="cat-subtitle"><TextInput id="cat-subtitle" value={subtitle} maxLength={100} onChange={e => setSubtitle(e.target.value)} /></Field>
            </div>
          </Card>

          <Card title={t('cat.include')}>
            <div className="space-y-3">
              {categories.length > 1 && (
                <div className="space-y-1.5">
                  <p className="text-sm font-medium text-ink-700">{t('cat.categories')}</p>
                  <div className="flex flex-wrap gap-1.5">
                    <Chip active={pickedCategories.size === 0} onClick={() => setPickedCategories(new Set())}>{t('common.all')}</Chip>
                    {categories.map(c => <Chip key={c} active={pickedCategories.has(c)} onClick={() => setPickedCategories(s => toggle(s, c))}>{c}</Chip>)}
                  </div>
                </div>
              )}
              <ToggleRow label={t('cat.includeSoldOut')} checked={includeSoldOut} onChange={setIncludeSoldOut} />
              <details className="group rounded-lg border border-ink-200">
                <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-sm font-medium">
                  <span>{t('cat.choose', { items: labels.pluralLower })}{' '}
                    <span className="font-normal text-ink-500">{t('cat.chosenCount', { selected: entries.length, total: pool.length })}</span>
                  </span>
                  <span className="text-xs text-ink-500 group-open:hidden">{t('cat.show')}</span>
                  <span className="hidden text-xs text-ink-500 group-open:inline">{t('cat.hide')}</span>
                </summary>
                <div className="space-y-2 border-t border-ink-100 p-3">
                  <SearchInput value={pickerSearch} onChange={setPickerSearch} placeholder={t('cat.search')} />
                  <div className="flex gap-3 text-xs">
                    <button type="button" className="text-[color:var(--cod-primary)] underline underline-offset-4" onClick={() => setExcluded(new Set())}>{t('cat.selectAll')}</button>
                    <button type="button" className="text-[color:var(--cod-primary)] underline underline-offset-4" onClick={() => setExcluded(new Set(pool.map(i => i.id)))}>{t('cat.selectNone')}</button>
                  </div>
                  <ul className="max-h-64 space-y-0.5 overflow-y-auto">
                    {visibleInPicker.map(i => (
                      <li key={i.id}>
                        <label className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-ink-50">
                          <input type="checkbox" className="h-4 w-4 accent-[color:var(--cod-primary)]" checked={!excluded.has(i.id)}
                            onChange={() => setExcluded(s => toggle(s, i.id))} />
                          <span className="min-w-0 flex-1 truncate">{i.name}</span>
                          {i.stock_quantity <= 0 && <span className="text-xs text-ink-400">{t('cat.soldOutTag')}</span>}
                        </label>
                      </li>
                    ))}
                    {visibleInPicker.length === 0 && <li className="px-1.5 py-2 text-sm text-ink-400">{t('cat.nothingMatches')}</li>}
                  </ul>
                </div>
              </details>
            </div>
          </Card>

          <Card title={t('cat.look')}>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-ink-700">{t('cat.cardSize')}</p>
                <div role="radiogroup" aria-label={t('cat.cardSize')} className="grid grid-cols-3 gap-2">
                  {COLUMN_CHOICES.map(c => (
                    <button key={c.value} type="button" role="radio" aria-checked={columns === c.value} onClick={() => setColumns(c.value)}
                      className={cn('rounded-lg border px-2 py-2 text-center text-sm transition-colors',
                        columns === c.value ? 'border-[color:var(--cod-primary)] font-semibold ring-1 ring-[color:var(--cod-primary)]' : 'border-ink-200 hover:bg-ink-50')}>
                      {t(c.label)}<span className="block text-[11px] font-normal text-ink-400">{t(c.hint)}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-ink-700">{t('cat.accent')}</p>
                <div className="flex flex-wrap items-center gap-2">
                  {BRAND_SWATCHES.map(c => (
                    <button key={c} type="button" aria-label={t('set.useColour', { colour: c })} aria-pressed={accent === c} onClick={() => setAccent(c)}
                      style={{ backgroundColor: c }}
                      className={cn('h-7 w-7 rounded-full border-2 border-white ring-1 ring-ink-200', accent === c && 'ring-2 ring-ink-900')} />
                  ))}
                  <input type="color" aria-label={t('set.customColour')} value={normalizeHex(accent)} onChange={e => setAccent(e.target.value)}
                    className="h-7 w-7 cursor-pointer rounded border border-ink-200 bg-transparent p-0" />
                </div>
              </div>
              <div className="space-y-2">
                <ToggleRow label={t('cat.showPrices')} checked={showPrice} onChange={setShowPrice} />
                <ToggleRow label={t('cat.showStock')} hint={t('cat.showStockHint')} checked={showStock} onChange={setShowStock} />
                <ToggleRow label={t('cat.showSku')} checked={showSku} onChange={setShowSku} />
                <ToggleRow label={t('cat.groupBy')} checked={groupByCategory} onChange={setGroupByCategory} />
              </div>
            </div>
          </Card>
        </div>

        <Card title={t('cat.preview')} className="lg:sticky lg:top-20"
          action={<span className="text-xs text-ink-400">{rendering ? t('cat.updating') : t('cat.summary', { count: entries.length, pages: preview.urls.length })}</span>}>
          <div className={cn('max-h-[75vh] space-y-4 overflow-y-auto rounded-lg bg-ink-100 p-3 transition-opacity', rendering && 'opacity-60')}>
            {preview.urls.length === 0 ? (
              <div className="aspect-[1240/1754] animate-pulse rounded-lg bg-ink-200" />
            ) : preview.urls.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={url} src={url} alt={t('cat.pageAlt', { n: i + 1 })} className="mx-auto w-full max-w-xl rounded-lg border border-ink-200 bg-white shadow-sm" />
            ))}
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-400"><Download size={14} className="shrink-0" />{t('cat.note')}</p>
        </Card>
      </div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick}
      className={cn('rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
        active ? 'border-[color:var(--cod-primary)] bg-[color:var(--cod-primary)] text-[color:var(--cod-primary-fg)]' : 'border-ink-200 hover:bg-ink-50')}>
      {children}
    </button>
  );
}

function ToggleRow({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span>{label}{hint && <span className="block text-xs text-ink-400">{hint}</span>}</span>
      <Toggle checked={checked} onChange={onChange} label={label} />
    </div>
  );
}
