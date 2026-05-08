'use client';
import { useEffect, useState } from 'react';
import { Product } from '../../../types';
import { Card } from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import Alert from '../../../components/ui/Alert';
import { Input } from '../../../components/ui/Input';
import { LKR } from '../../../lib/format';
import api from '../../../lib/api';
import toast from 'react-hot-toast';
import { Search, RefreshCw, Plus, Minus, Boxes, Upload, Download } from 'lucide-react';
import { ProductImage } from '../../../components/ui/ProductImage';
import { useLang } from '../../../hooks/useLang';

interface InventoryProduct extends Product {
  inventory: { quantity: number; reorder_level: number };
}
type Filter = 'all' | 'low' | 'out';

export default function InventoryPage() {
  const { t } = useLang();
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [adjustId, setAdjustId] = useState<number | null>(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);

  const fetchAll = () => {
    setLoading(true);
    api.get('/inventory/products')
      .then((r) => setProducts(Array.isArray(r.data) ? r.data : []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchAll(); }, []);

  const adjust = async (productId: number) => {
    if (!adjustQty || adjustQty === '0') return toast.error('Enter a quantity');
    setSaving(true);
    try {
      await api.patch(`/inventory/products/${productId}/stock`, { quantity: +adjustQty });
      toast.success('Stock updated');
      setAdjustId(null); setAdjustQty('');
      fetchAll();
    } catch { toast.error('Failed to update stock'); }
    finally { setSaving(false); }
  };

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    const form = new FormData();
    form.append('file', file);
    try {
      const r = await api.post('/inventory/products/csv-import', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(`Imported ${r.data.imported} products${r.data.skipped ? `, ${r.data.skipped} skipped` : ''}`);
      if (r.data.errors?.length) r.data.errors.slice(0, 3).forEach((err: string) => toast.error(err));
      fetchAll();
    } catch { toast.error('CSV import failed'); }
    finally { setImporting(false); e.target.value = ''; }
  };

  const downloadSample = () => {
    const csv = 'name,barcode,price,cost,category,stock,reorder_level\nRice 1kg,8901234567890,250,180,Grocery,100,20\nParacetamol 500mg,8907654321098,45,30,Pharmacy,200,50';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'kadehub-products-sample.csv';
    a.click();
  };

  const lowCount = products.filter((p) => { const q = p.inventory?.quantity ?? 0; return q > 0 && q <= (p.inventory?.reorder_level ?? 10); }).length;
  const outCount = products.filter((p) => (p.inventory?.quantity ?? 0) <= 0).length;

  const filtered = products.filter((p) => {
    const q = p.inventory?.quantity ?? 0;
    const r = p.inventory?.reorder_level ?? 10;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || (p.barcode || '').includes(search) || (p.category || '').toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' ? true : filter === 'low' ? q > 0 && q <= r : q <= 0;
    return matchSearch && matchFilter;
  });

  const statusOf = (q: number, r: number) =>
    q <= 0 ? { variant: 'coral' as const, label: t('inventory.outOfStock') } :
    q <= r  ? { variant: 'amber' as const, label: t('inventory.lowStock') } :
              { variant: 'teal' as const, label: t('inventory.inStock') };

  return (
    <div className="space-y-5 max-w-6xl">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: t('inventory.totalSkus'),   value: products.length, color: '#009688', bg: '#E0F2F1', icon: Boxes },
          { label: t('inventory.lowStock'),    value: lowCount,         color: '#F59E0B', bg: '#FFF8E1', icon: Boxes },
          { label: t('inventory.outOfStock'), value: outCount,         color: '#FF6B6B', bg: '#FFF0F0', icon: Boxes },
        ].map(({ label, value, color, bg, icon: Icon }) => (
          <div key={label} className="kh-card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
              <Icon size={18} style={{ color }} />
            </div>
            <div>
              <p className="text-xs text-ink-400 font-medium">{label}</p>
              <p className="text-2xl font-bold" style={{ color }}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Alert */}
      {(lowCount > 0 || outCount > 0) && (
        <Alert variant="warning" title={t('inventory.stockAlert')}>
          {lowCount > 0 && <><strong>{lowCount}</strong> product{lowCount !== 1 ? 's' : ''} running low. </>}
          {outCount > 0 && <><strong>{outCount}</strong> product{outCount !== 1 ? 's' : ''} out of stock.</>}
        </Alert>
      )}

      {/* Table */}
      <Card padding={false}>
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-ink-100">
          <div className="relative w-full sm:w-auto sm:flex-1 sm:max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input placeholder={t('common.search')} value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 border border-ink-200 rounded-lg text-sm bg-white" />
          </div>
          <div className="flex gap-1 flex-wrap">
            {(['all', 'low', 'out'] as Filter[]).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all"
                style={{ background: filter === f ? '#009688' : '#F1F5F9', color: filter === f ? 'white' : '#475569' }}>
                {f === 'all' ? `${t('inventory.status')} (${products.length})` : f === 'low' ? `${t('inventory.lowStock')} (${lowCount})` : `${t('inventory.outOfStock')} (${outCount})`}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <button onClick={fetchAll} className="flex items-center gap-1.5 text-xs text-ink-400 hover:text-ink-700 transition-colors">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> {t('common.refresh')}
            </button>
            <button onClick={downloadSample} className="flex items-center gap-1.5 text-xs text-ink-400 hover:text-ink-700 transition-colors">
              <Download size={13} /> {t('inventory.sampleCsv')}
            </button>
            <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${importing ? 'opacity-50 pointer-events-none' : 'bg-teal-50 text-teal-700 hover:bg-teal-100'}`}>
              <Upload size={13} /> {importing ? t('inventory.importing') : t('inventory.importCsv')}
              <input type="file" accept=".csv" className="hidden" onChange={handleCsvImport} />
            </label>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-ink-400 text-sm">{t('common.loading')}</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-ink-400 text-sm">{t('common.noData')}</div>
        ) : (
          <div className="overflow-x-auto">
          <table className="mob-cards w-full text-sm">
            <thead>
              <tr className="border-b border-ink-100">
                {[t('inventory.product'), t('inventory.category'), t('inventory.price'), t('inventory.cost'), t('inventory.stock'), t('inventory.reorderAt'), t('inventory.status'), t('common.adjust')].map((h) => (
                  <th key={h} className={`px-5 py-3 text-xs font-semibold text-ink-400 uppercase tracking-wide ${['Price','Cost'].includes(h) ? 'text-right' : ['Stock','Reorder At','Status','Adjust'].includes(h) ? 'text-center' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const qty = p.inventory?.quantity ?? 0;
                const reorder = p.inventory?.reorder_level ?? 10;
                const { variant, label } = statusOf(qty, reorder);
                return (
                  <tr key={p.id} className="border-b border-ink-50 hover:bg-ink-50 transition-colors last:border-0">
                    <td data-label={t('inventory.product')} className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <ProductImage imageUrl={p.image_url} category={p.category} name={p.name} size={40} />
                        <div>
                          <p className="font-semibold text-ink-800">{p.name}</p>
                          {p.barcode && <code className="text-2xs text-ink-400">{p.barcode}</code>}
                        </div>
                      </div>
                    </td>
                    <td data-label={t('inventory.category')} className="px-5 py-3.5">
                      {p.category ? <Badge variant="gray">{p.category}</Badge> : <span className="text-ink-300">—</span>}
                    </td>
                    <td data-label={t('inventory.price')} className="px-5 py-3.5 text-right font-bold" style={{ color: '#FFB703' }}>{LKR(p.price)}</td>
                    <td data-label={t('inventory.cost')} className="px-5 py-3.5 text-right text-ink-400">{LKR(p.cost)}</td>
                    <td data-label={t('inventory.stock')} className="px-5 py-3.5 text-center">
                      <span className="text-lg font-extrabold" style={{ color: qty <= 0 ? '#FF6B6B' : qty <= reorder ? '#F59E0B' : '#009688' }}>{qty}</span>
                    </td>
                    <td data-label={t('inventory.reorderAt')} className="px-5 py-3.5 text-center text-ink-400">{reorder}</td>
                    <td data-label={t('inventory.status')} className="px-5 py-3.5 text-center"><Badge variant={variant} dot>{label}</Badge></td>
                    <td data-label={t('common.adjust')} className="px-5 py-3.5 text-center">
                      {adjustId === p.id ? (
                        <div className="flex items-center gap-1 justify-center flex-wrap">
                          <button onClick={() => setAdjustQty((v) => String((parseInt(v) || 0) - 1))}
                            className="w-6 h-6 rounded border border-ink-200 hover:bg-ink-100 flex items-center justify-center">
                            <Minus size={11} />
                          </button>
                          <input type="number" value={adjustQty} onChange={(e) => setAdjustQty(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && adjust(p.id)}
                            autoFocus placeholder="±qty"
                            className="w-14 border border-ink-200 rounded-lg px-2 py-1 text-xs text-center" />
                          <button onClick={() => setAdjustQty((v) => String((parseInt(v) || 0) + 1))}
                            className="w-6 h-6 rounded border border-ink-200 hover:bg-ink-100 flex items-center justify-center">
                            <Plus size={11} />
                          </button>
                          <Button size="xs" onClick={() => adjust(p.id)} loading={saving}>{t('common.save')}</Button>
                          <Button size="xs" variant="ghost" onClick={() => { setAdjustId(null); setAdjustQty(''); }}>✕</Button>
                        </div>
                      ) : (
                        <Button size="xs" variant="outline" onClick={() => { setAdjustId(p.id); setAdjustQty(''); }}>{t('common.adjust')}</Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </Card>
    </div>
  );
}
