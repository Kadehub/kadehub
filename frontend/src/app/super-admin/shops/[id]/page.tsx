'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import api from '../../../../lib/api';
import { ArrowLeft, Lock, Unlock, RefreshCw, Users, CreditCard, Package, AlertTriangle } from 'lucide-react';

export default function ShopDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<any>(null);
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [planModal, setPlanModal] = useState(false);
  const [planForm, setPlanForm] = useState({ package_id: '', billing_cycle: 'monthly', plan_note: '' });
  const [statusNote, setStatusNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, [id]);

  async function load() {
    setLoading(true);
    const [d, p] = await Promise.all([api.get(`/super-admin/shops/${id}`), api.get('/super-admin/packages')]);
    setDetail(d.data); setPackages(p.data); setLoading(false);
  }

  async function toggleStatus() {
    const newStatus = detail.tenant.status === 'active' ? 'blocked' : 'active';
    setSaving(true);
    await api.patch(`/super-admin/shops/${id}/status`, { status: newStatus, plan_note: statusNote || undefined });
    await load(); setSaving(false); setStatusNote('');
  }

  async function changePlan() {
    if (!planForm.package_id) return;
    setSaving(true);
    await api.patch(`/super-admin/shops/${id}/plan`, {
      package_id: +planForm.package_id,
      billing_cycle: planForm.billing_cycle,
      plan_note: planForm.plan_note || undefined,
    });
    await load(); setSaving(false); setPlanModal(false);
  }

  if (loading) return (
    <div className="space-y-4">
      {[...Array(4)].map((_, i) => <div key={i} className="kh-card h-24 animate-pulse bg-ink-100" />)}
    </div>
  );
  if (!detail) return null;

  const { tenant, users, subscriptions, transactions, currentPlan } = detail;
  const totalPaid = transactions.filter((t: any) => t.status === 'completed').reduce((s: number, t: any) => s + t.amount, 0);
  const pendingSlips = transactions.filter((t: any) => t.gateway === 'bank_transfer' && t.status === 'pending');

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.push('/super-admin/shops')}
          className="p-2 rounded-xl border border-ink-200 hover:bg-ink-50 transition-colors">
          <ArrowLeft size={17} />
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-ink-900">{tenant.name}</h2>
          <p className="text-xs font-mono text-ink-400">{tenant.slug}</p>
        </div>
        <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
          tenant.status === 'active' ? 'kh-badge-teal' :
          tenant.status === 'blocked' ? 'kh-badge-coral' : 'kh-badge-amber'
        }`}>{tenant.status}</span>
      </div>

      {pendingSlips.length > 0 && (
        <div className="flex items-center justify-between gap-3 p-4 rounded-xl border" style={{ background: '#FFF8E1', borderColor: '#FDE68A' }}>
          <p className="text-sm text-ink-700">
            <span className="font-semibold">{pendingSlips.length} bank slip{pendingSlips.length > 1 ? 's' : ''}</span> waiting for review
          </p>
          <button onClick={() => router.push('/super-admin/payments')}
            className="text-xs font-bold px-3 py-1.5 rounded-lg" style={{ background: '#00A884', color: 'white' }}>
            Review slips
          </button>
        </div>
      )}

      {/* Admin note */}
      {tenant.plan_note && (
        <div className="flex items-start gap-3 p-4 rounded-xl border" style={{ background: '#FFF8E1', borderColor: '#FDE68A' }}>
          <AlertTriangle size={16} style={{ color: '#F59E0B' }} className="mt-0.5 flex-shrink-0" />
          <p className="text-sm text-ink-700"><span className="font-semibold">Admin Note:</span> {tenant.plan_note}</p>
        </div>
      )}

      {/* Actions */}
      <div className="kh-card p-5 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-52">
          <label className="text-xs font-semibold text-ink-500 mb-1.5 block">Reason / Note (optional)</label>
          <input value={statusNote} onChange={e => setStatusNote(e.target.value)}
            placeholder="e.g. Violated terms of service"
            className="border border-ink-200 rounded-xl px-4 py-2 text-sm w-full focus:outline-none" />
        </div>
        <button onClick={toggleStatus} disabled={saving}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 ${
            tenant.status === 'active'
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}>
          {tenant.status === 'active' ? <><Lock size={15} /> Block Shop</> : <><Unlock size={15} /> Unblock Shop</>}
        </button>
        <button onClick={() => setPlanModal(true)}
          className="kh-btn-primary flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm">
          <RefreshCw size={15} /> Change Plan
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Current Plan', value: currentPlan?.name || 'Free', sub: currentPlan ? `LKR ${currentPlan.price_monthly}/mo` : 'No active plan', icon: Package, color: '#2563EB', bg: '#EFF6FF' },
          { label: 'Staff Members', value: users.length, sub: 'registered users', icon: Users, color: '#00796B', bg: '#E0F2F1' },
          { label: 'Total Revenue', value: `LKR ${totalPaid.toLocaleString()}`, sub: `${transactions.length} transactions`, icon: CreditCard, color: '#F59E0B', bg: '#FFF8E1' },
        ].map(({ label, value, sub, icon: Icon, color, bg }) => (
          <div key={label} className="kh-card p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
              <Icon size={20} style={{ color }} />
            </div>
            <div>
              <p className="text-xs text-ink-400">{label}</p>
              <p className="text-lg font-bold text-ink-900">{value}</p>
              <p className="text-xs text-ink-400">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Users table */}
      <div className="kh-card">
        <div className="px-5 py-4 border-b border-ink-100">
          <h3 className="font-semibold text-ink-800">Staff Members</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-100">
              {['Name', 'Email', 'Role', 'Joined'].map(h => (
                <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-ink-400 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-50">
            {users.map((u: any) => (
              <tr key={u.id} className="hover:bg-ink-50">
                <td className="px-5 py-3 font-semibold text-ink-800">{u.name}</td>
                <td className="px-5 py-3 text-ink-500">{u.email}</td>
                <td className="px-5 py-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${u.role === 'ADMIN' ? 'kh-badge-blue' : 'kh-badge-gray'}`}>{u.role}</span>
                </td>
                <td className="px-5 py-3 text-ink-400 text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Transactions */}
      <div className="kh-card">
        <div className="px-5 py-4 border-b border-ink-100">
          <h3 className="font-semibold text-ink-800">Payment History</h3>
        </div>
        {transactions.length === 0 ? (
          <p className="px-5 py-8 text-sm text-ink-400 text-center">No transactions yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-100">
                {['Package', 'Amount', 'Cycle', 'Gateway', 'Reference', 'Status', 'Date'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-ink-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-50">
              {transactions.map((tx: any) => (
                <tr key={tx.id} className="hover:bg-ink-50">
                  <td className="px-5 py-3 font-semibold text-ink-800">{tx.package?.name}</td>
                  <td className="px-5 py-3 font-semibold text-ink-900">LKR {tx.amount?.toLocaleString()}</td>
                  <td className="px-5 py-3 capitalize text-ink-500">{tx.billing_cycle}</td>
                  <td className="px-5 py-3 capitalize text-ink-500">{tx.gateway}</td>
                  <td className="px-5 py-3 font-mono text-xs text-ink-400">{tx.gateway_ref}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      tx.status === 'completed' ? 'kh-badge-teal' :
                      tx.status === 'pending' ? 'kh-badge-amber' : 'kh-badge-coral'
                    }`}>{tx.status === 'pending' ? 'pending review' : tx.status}</span>
                    {tx.metadata?.slip_url && (
                      <a href={tx.metadata.slip_url} target="_blank" rel="noreferrer" className="ml-2 text-xs font-semibold" style={{ color: '#00A884' }}>Slip</a>
                    )}
                  </td>
                  <td className="px-5 py-3 text-ink-400 text-xs">{new Date(tx.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Change Plan Modal */}
      {planModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold text-ink-900 mb-1">Change Plan</h3>
            <p className="text-sm text-ink-400 mb-5">Updating plan for <span className="font-semibold text-ink-700">{tenant.name}</span></p>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-ink-500 mb-1.5 block">Package</label>
                <select value={planForm.package_id} onChange={e => setPlanForm(f => ({ ...f, package_id: e.target.value }))}
                  className="border border-ink-200 rounded-xl px-4 py-2.5 text-sm w-full focus:outline-none">
                  <option value="">Select a package...</option>
                  {packages.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name} — LKR {p.price_monthly}/mo · LKR {p.price_yearly}/yr</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-ink-500 mb-1.5 block">Billing Cycle</label>
                <select value={planForm.billing_cycle} onChange={e => setPlanForm(f => ({ ...f, billing_cycle: e.target.value }))}
                  className="border border-ink-200 rounded-xl px-4 py-2.5 text-sm w-full focus:outline-none">
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-ink-500 mb-1.5 block">Admin Note (optional)</label>
                <input value={planForm.plan_note} onChange={e => setPlanForm(f => ({ ...f, plan_note: e.target.value }))}
                  placeholder="e.g. Upgraded by admin request"
                  className="border border-ink-200 rounded-xl px-4 py-2.5 text-sm w-full focus:outline-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setPlanModal(false)}
                className="flex-1 px-4 py-2.5 border border-ink-200 rounded-xl text-sm font-semibold hover:bg-ink-50">Cancel</button>
              <button onClick={changePlan} disabled={saving || !planForm.package_id}
                className="flex-1 kh-btn-primary px-4 py-2.5 rounded-xl text-sm">
                {saving ? 'Saving...' : 'Apply Plan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
