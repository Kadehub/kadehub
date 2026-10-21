'use client';
import { useEffect, useState } from 'react';
import api from '../../../lib/api';
import toast from 'react-hot-toast';
import { Pager, errMsg } from '../../../components/super-admin/bits';

const LIMIT = 30;
const AREAS = [
  { value: '', label: 'Everything' },
  { value: 'shop', label: 'Shops' },
  { value: 'user', label: 'People' },
  { value: 'tasks', label: 'Tasks bans' },
  { value: 'package', label: 'Packages' },
  { value: 'payment', label: 'Payments' },
  { value: 'cod', label: 'COD exports' },
  { value: 'admin', label: 'Admins' },
  { value: 'coupon', label: 'Coupons' },
  { value: 'settings', label: 'Settings' },
];

const LABELS: Record<string, string> = {
  'shop.active': 'Unblocked shop', 'shop.blocked': 'Blocked shop', 'shop.suspended': 'Suspended shop',
  'shop.plan': 'Changed plan', 'shop.delete': 'Deleted shop', 'shop.sign_in_as': 'Signed in as shop',
  'user.reset_password': 'Reset password', 'user.email': 'Changed email', 'user.disable': 'Switched off account', 'user.enable': 'Switched on account',
  'tasks.ban': 'Banned from Tasks', 'tasks.unban': 'Lifted Tasks ban',
  'package.create': 'Created package', 'package.update': 'Edited package', 'package.delete': 'Deleted package', 'package.product': 'Moved package',
  'payment.approve': 'Approved payment slip', 'payment.reject': 'Rejected payment slip',
  'cod.export_businesses': 'Downloaded COD businesses', 'cod.export_customers': 'Downloaded COD customers', 'cod.export_orders': 'Downloaded COD orders',
  'admin.add': 'Added super admin', 'admin.disable': 'Switched off admin', 'admin.enable': 'Switched on admin', 'admin.password': 'Changed own password',
  'coupon.create': 'Created coupon', 'coupon.toggle': 'Turned coupon on/off', 'coupon.delete': 'Deleted coupon',
  'announcement.create': 'Posted announcement', 'announcement.delete': 'Deleted announcement',
  'settings.bank_details': 'Edited bank details', 'settings.company': 'Edited company details',
};

function describe(details: Record<string, unknown> | null) {
  if (!details) return '';
  return Object.entries(details)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
    .join(' · ');
}

export default function ActivityPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [area, setArea] = useState('');
  const [loading, setLoading] = useState(true);

  async function load(p: number, a = area) {
    setLoading(true);
    try {
      const { data } = await api.get('/super-admin/activity', { params: { page: p, action: a || undefined } });
      setRows(data.data); setTotal(data.total); setPage(p);
    } catch (err) {
      toast.error(errMsg(err, 'Could not load the activity log'));
    } finally { setLoading(false); }
  }
  useEffect(() => { load(1); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-ink-900">Activity Log</h2>
        <p className="text-sm text-ink-400 mt-0.5">Every change made from the super admin dashboard, newest first</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {AREAS.map(a => (
          <button key={a.value} onClick={() => { setArea(a.value); load(1, a.value); }} aria-pressed={area === a.value}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${area === a.value ? 'bg-teal-700 border-teal-700 text-white' : 'bg-white border-ink-200 text-ink-600 hover:bg-ink-50'}`}>
            {a.label}
          </button>
        ))}
      </div>

      <div className="kh-card overflow-hidden">
        <ul className="divide-y divide-ink-50">
          {loading ? (
            [...Array(8)].map((_, i) => <li key={i} className="px-5 py-3"><div className="h-6 bg-ink-100 rounded-lg animate-pulse" /></li>)
          ) : rows.length === 0 ? (
            <li className="px-5 py-12 text-center text-sm text-ink-400">Nothing recorded yet</li>
          ) : rows.map(r => (
            <li key={r.id} className="px-5 py-3 flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4">
              <span className="text-xs text-ink-400 sm:w-40 shrink-0 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-ink-900">
                  <span className="font-semibold">{LABELS[r.action] ?? r.action}</span>
                  {r.entity_id ? <span className="text-ink-400"> · {r.entity} #{r.entity_id}</span> : null}
                </p>
                {describe(r.details) && <p className="text-xs text-ink-500 [overflow-wrap:anywhere]">{describe(r.details)}</p>}
              </div>
              <span className="text-xs text-ink-500 sm:text-right shrink-0">{r.admin?.name}</span>
            </li>
          ))}
        </ul>
        <Pager page={page} total={total} limit={LIMIT} onPage={p => load(p)} />
      </div>
    </div>
  );
}
