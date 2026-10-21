'use client';
import { useCallback, useEffect, useState } from 'react';
import api from '../../../lib/api';
import { Download, Search, Store, Users, Receipt } from 'lucide-react';
import toast from 'react-hot-toast';
import { Pager, Stat, downloadCsv, errMsg, fmtDate, fmtLKR, inputCls, titleCase } from '../../../components/super-admin/bits';

type Tab = 'businesses' | 'customers' | 'orders';
const LIMIT = 25;
const STATUSES = ['pending', 'confirmed', 'ongoing', 'delivered', 'returned', 'cancelled'];
const PAYMENT: Record<string, string> = { cod: 'Cash on delivery', pay_now: 'Paid now', credit: 'Credit' };
const STATUS_BADGE: Record<string, string> = {
  delivered: 'kh-badge-teal', confirmed: 'kh-badge-blue', ongoing: 'kh-badge-blue', pending: 'kh-badge-amber',
  returned: 'kh-badge-coral', cancelled: 'kh-badge-gray',
};

export default function CodDirectoryPage() {
  const [tab, setTab] = useState<Tab>('businesses');
  const [stats, setStats] = useState<any>(null);
  const [cats, setCats] = useState<{ business_types: string[]; item_categories: string[] }>({ business_types: [], item_categories: [] });
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    api.get('/super-admin/cod/stats').then(r => setStats(r.data)).catch(() => {});
    api.get('/super-admin/cod/categories').then(r => setCats(r.data)).catch(() => {});
  }, []);

  const params = useCallback(() => ({
    q: q.trim() || undefined,
    type: type || undefined,
    category: tab !== 'businesses' ? category || undefined : undefined,
    ...(tab === 'orders' ? { status: status || undefined, from: from || undefined, to: to || undefined } : {}),
  }), [q, type, category, status, from, to, tab]);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/super-admin/cod/${tab}`, { params: { ...params(), page: p } });
      setRows(data.data); setTotal(data.total); setPage(p);
    } catch (err) {
      toast.error(errMsg(err, 'Could not load the COD directory'));
    } finally { setLoading(false); }
  }, [tab, params]);

  // Filters apply straight away; the search box applies on Enter / Search
  useEffect(() => { load(1); }, [tab, type, category, status, from, to]); // eslint-disable-line react-hooks/exhaustive-deps

  async function exportCsv() {
    setExporting(true);
    try {
      const parts = [`cod-${tab}`, type, tab !== 'businesses' && category, tab === 'orders' && status, tab === 'orders' && from && `from-${from}`, tab === 'orders' && to && `to-${to}`]
        .filter(Boolean).map(s => String(s).toLowerCase().replace(/[^a-z0-9-]+/g, '-'));
      await downloadCsv(`/super-admin/cod/${tab}/export/csv`, params(), parts.join('-'));
    } catch (err) {
      toast.error(errMsg(err, 'Could not export'));
    } finally { setExporting(false); }
  }

  const filtered = !!(q.trim() || type || (tab !== 'businesses' && category) || (tab === 'orders' && (status || from || to)));
  const placeholder = { businesses: 'Business, phone or city…', customers: 'Name, phone, email or city…', orders: 'Name, phone, email, address or invoice…' }[tab];
  const headers = {
    businesses: ['Business', 'Category', 'Owner', 'Email', 'Phone', 'City', 'Plan', 'Orders', 'Joined'],
    customers: ['Customer', 'Phone', 'Email', 'Address', 'Bought', 'Orders', 'Spent', 'Last order', 'Business'],
    orders: ['Date', 'Customer', 'Phone', 'Email', 'Address', 'Items', 'Total', 'Status', 'Business'],
  }[tab];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-ink-900">COD Directory</h2>
        <p className="text-sm text-ink-400 mt-0.5">COD businesses, their customers and every order — filter and download as CSV</p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat label="Businesses" value={stats.businesses.toLocaleString()} hint={`${stats.paid} paid · ${stats.trial} on trial`} />
          <Stat label="Orders (all time)" value={stats.orders.toLocaleString()} hint={fmtLKR(stats.order_value)} />
          <Stat label="Orders (30 days)" value={stats.orders_30d.toLocaleString()} hint={fmtLKR(stats.order_value_30d)} />
          <Stat label="On trial" value={stats.trial.toLocaleString()} hint="Not paying yet" />
        </div>
      )}

      <div className="flex flex-wrap gap-1.5" role="tablist">
        {([['businesses', 'Businesses', Store], ['customers', 'Customers', Users], ['orders', 'Orders', Receipt]] as const).map(([key, label, Icon]) => (
          <button key={key} role="tab" aria-selected={tab === key} onClick={() => { setTab(key); setRows([]); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold ${tab === key ? 'bg-teal-700 text-white' : 'bg-white text-ink-600 border border-ink-200 hover:bg-ink-50'}`}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      <div className="kh-card p-4 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_230px_230px_auto]">
          <form onSubmit={e => { e.preventDefault(); load(1); }} className="flex gap-2 sm:col-span-2 lg:col-span-1">
            <input value={q} onChange={e => setQ(e.target.value)} className={inputCls} placeholder={placeholder} aria-label="Search" />
            <button type="submit" className="kh-btn-primary px-3 py-2 rounded-xl" aria-label="Search"><Search size={15} /></button>
          </form>
          <select value={type} onChange={e => setType(e.target.value)} className={inputCls} aria-label="Business category">
            <option value="">All business categories</option>
            {cats.business_types.map(b => <option key={b} value={b}>{titleCase(b)}</option>)}
          </select>
          {tab !== 'businesses' ? (
            <select value={category} onChange={e => setCategory(e.target.value)} className={inputCls} aria-label="Item category">
              <option value="">Any item category</option>
              {cats.item_categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          ) : <div className="hidden lg:block" />}
          <button onClick={exportCsv} disabled={exporting || total === 0}
            className="kh-btn-primary flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm disabled:opacity-50 whitespace-nowrap">
            <Download size={15} /> {exporting ? 'Exporting…' : `Download CSV (${total.toLocaleString()})`}
          </button>
        </div>
        {tab === 'orders' && (
          <div className="grid gap-3 sm:grid-cols-3">
            <select value={status} onChange={e => setStatus(e.target.value)} className={inputCls} aria-label="Order status">
              <option value="">Any status</option>
              {STATUSES.map(s => <option key={s} value={s}>{titleCase(s)}</option>)}
            </select>
            <label className="flex items-center gap-2 text-sm text-ink-600">
              <span className="shrink-0">From</span>
              <input type="date" value={from} max={to || undefined} onChange={e => setFrom(e.target.value)} className={inputCls} />
            </label>
            <label className="flex items-center gap-2 text-sm text-ink-600">
              <span className="shrink-0">To</span>
              <input type="date" value={to} min={from || undefined} onChange={e => setTo(e.target.value)} className={inputCls} />
            </label>
          </div>
        )}
      </div>
      <p className="text-xs text-ink-400 -mt-2">
        {tab === 'customers' && 'One row per customer phone number per business (orders without a phone number are in the Orders tab). '}
        {tab === 'orders' && 'Customer details exactly as typed on each order, including orders without a phone number. '}
        {tab !== 'businesses' && 'Every download is recorded in the activity log.'}
      </p>

      <div className="kh-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-100">
                {headers.map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-ink-400 uppercase tracking-wide whitespace-nowrap">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-50">
              {loading ? (
                [...Array(6)].map((_, i) => <tr key={i}><td colSpan={9} className="px-4 py-3"><div className="h-6 bg-ink-100 rounded-lg animate-pulse" /></td></tr>)
              ) : rows.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-ink-400">{filtered ? 'Nothing matches these filters' : 'No COD data yet'}</td></tr>
              ) : tab === 'businesses' ? rows.map(r => (
                <tr key={r.tenant_id} className="hover:bg-ink-50">
                  <td className="px-4 py-3 font-semibold text-ink-900">
                    <a href={`/super-admin/shops/${r.tenant_id}`} className="hover:underline">{r.business}</a>
                  </td>
                  <td className="px-4 py-3 text-ink-600">{titleCase(r.category)}</td>
                  <td className="px-4 py-3 text-ink-600">{r.owner || '—'}</td>
                  <td className="px-4 py-3 min-w-[11rem]"><Email v={r.email} /></td>
                  <td className="px-4 py-3 whitespace-nowrap"><Phone v={r.phone} /></td>
                  <td className="px-4 py-3 text-ink-600">{r.city || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${r.plan === 'Paid' ? 'kh-badge-teal' : r.plan === 'Trial' ? 'kh-badge-amber' : 'kh-badge-gray'}`}>{r.plan}</span>
                  </td>
                  <td className="px-4 py-3 text-ink-600 whitespace-nowrap">{r.orders.toLocaleString()} <span className="text-xs text-ink-400">· {fmtLKR(r.order_value)}</span></td>
                  <td className="px-4 py-3 text-xs text-ink-400 whitespace-nowrap">{fmtDate(r.joined)}</td>
                </tr>
              )) : tab === 'customers' ? rows.map(r => (
                <tr key={`${r.tenant_id}-${r.phone}`} className="hover:bg-ink-50">
                  <td className="px-4 py-3 font-semibold text-ink-900">{r.name}</td>
                  <td className="px-4 py-3 whitespace-nowrap"><Phone v={r.phone} /></td>
                  <td className="px-4 py-3 min-w-[11rem]"><Email v={r.email} /></td>
                  <td className="px-4 py-3 text-ink-600 min-w-[12rem]"><Address address={r.address} city={r.city} /></td>
                  <td className="px-4 py-3 text-xs text-ink-500 max-w-[14rem]">{r.item_categories.join(', ') || '—'}</td>
                  <td className="px-4 py-3 text-ink-600">{r.orders}</td>
                  <td className="px-4 py-3 text-ink-600 whitespace-nowrap">{fmtLKR(r.spent)}</td>
                  <td className="px-4 py-3 text-xs text-ink-400 whitespace-nowrap">{fmtDate(r.last_order)}</td>
                  <td className="px-4 py-3 text-ink-600">{r.business} <span className="text-xs text-ink-400">· {titleCase(r.business_type)}</span></td>
                </tr>
              )) : rows.map(r => (
                <tr key={r.id} className="hover:bg-ink-50 align-top">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <p className="text-ink-700">{fmtDate(r.date)}</p>
                    <p className="text-xs text-ink-400">{r.invoice}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-ink-900">{r.name}</p>
                    <p className="text-xs text-ink-400">{titleCase(r.customer_type)}</p>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap"><Phone v={r.phone} /></td>
                  <td className="px-4 py-3 min-w-[11rem]"><Email v={r.email} /></td>
                  <td className="px-4 py-3 text-ink-600 min-w-[12rem]"><Address address={r.address} city={r.city} /></td>
                  <td className="px-4 py-3 text-xs text-ink-600 min-w-[12rem] max-w-[18rem]">{r.items || '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <p className="font-semibold text-ink-900">{fmtLKR(r.total)}</p>
                    <p className="text-xs text-ink-400">{PAYMENT[r.payment_type] ?? r.payment_type}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[r.status] ?? 'kh-badge-gray'}`}>{titleCase(r.status)}</span>
                  </td>
                  <td className="px-4 py-3 text-ink-600">{r.business} <span className="text-xs text-ink-400">· {titleCase(r.business_type)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pager page={page} total={total} limit={LIMIT} onPage={load} />
      </div>
    </div>
  );
}

function Phone({ v }: { v?: string }) {
  return v ? <a href={`tel:${v}`} className="text-teal-700 hover:underline">{v}</a> : <span className="text-ink-400">—</span>;
}

function Email({ v }: { v?: string }) {
  return v ? <a href={`mailto:${v}`} className="text-teal-700 hover:underline [overflow-wrap:anywhere]">{v}</a> : <span className="text-ink-400">—</span>;
}

function Address({ address, city }: { address?: string; city?: string }) {
  if (!address && !city) return <span className="text-ink-400">—</span>;
  return <>{address}{address && city ? ', ' : ''}{city}</>;
}
