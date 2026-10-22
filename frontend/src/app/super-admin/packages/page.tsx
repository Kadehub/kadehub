'use client';
import { useEffect, useState } from 'react';
import api from '../../../lib/api';
import { Package, Check, Plus, Pencil, Trash2, X } from 'lucide-react';
import Modal from '../../../components/ui/Modal';
import toast from 'react-hot-toast';
import { errMsg, inputCls } from '../../../components/super-admin/bits';

const PRODUCTS = [
  { value: 'pos', label: 'POS' },
  { value: 'cod', label: 'COD' },
  { value: 'tasks', label: 'Tasks' },
  { value: 'hr', label: 'Staff' },
];

type Draft = {
  id?: number; name: string; slug: string; product: string; description: string;
  price_monthly: string; price_yearly: string; is_active: boolean; is_popular: boolean;
  sort_order: string; employee_limit: string; modules: string[];
};

const blank = (product = 'pos'): Draft => ({
  name: '', slug: '', product, description: '', price_monthly: '', price_yearly: '',
  is_active: true, is_popular: false, sort_order: '0', employee_limit: '', modules: [],
});

const toDraft = (p: any): Draft => ({
  id: p.id, name: p.name, slug: p.slug, product: p.product || 'pos', description: p.description || '',
  price_monthly: String(p.price_monthly ?? ''), price_yearly: String(p.price_yearly ?? ''),
  is_active: !!p.is_active, is_popular: !!p.is_popular, sort_order: String(p.sort_order ?? 0),
  employee_limit: p.employee_limit ? String(p.employee_limit) : '', modules: (p.modules || []).map((m: any) => m.module_name),
});

export default function PackagesPage() {
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [knownModules, setKnownModules] = useState<string[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [removing, setRemoving] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/super-admin/packages').then(({ data }) => { setPackages(data); setLoading(false); }).catch(() => setLoading(false));
    api.get('/super-admin/packages/modules').then(({ data }) => setKnownModules(data)).catch(() => {});
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    setBusy(true);
    try {
      const body = {
        name: draft.name, slug: draft.slug || undefined, product: draft.product, description: draft.description || undefined,
        price_monthly: Number(draft.price_monthly) || 0, price_yearly: Number(draft.price_yearly) || 0,
        is_active: draft.is_active, is_popular: draft.is_popular, sort_order: Number(draft.sort_order) || 0,
        employee_limit: draft.employee_limit ? Number(draft.employee_limit) : null, modules: draft.modules,
      };
      const { data } = draft.id ? await api.put(`/super-admin/packages/${draft.id}`, body) : await api.post('/super-admin/packages', body);
      setPackages(list => draft.id ? list.map(p => (p.id === data.id ? data : p)) : [...list, data]);
      setKnownModules(m => Array.from(new Set([...m, ...data.modules.map((x: any) => x.module_name)])).sort());
      toast.success(draft.id ? `${data.name} saved` : `${data.name} created`);
      setDraft(null);
    } catch (err) {
      toast.error(errMsg(err, 'Could not save the package'));
    } finally { setBusy(false); }
  }

  async function remove() {
    if (!removing) return;
    setBusy(true);
    try {
      await api.delete(`/super-admin/packages/${removing.id}`);
      setPackages(list => list.filter(p => p.id !== removing.id));
      toast.success(`${removing.name} deleted`);
      setRemoving(null);
    } catch (err) {
      toast.error(errMsg(err, 'Could not delete the package'));
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-ink-900">Subscription Packages</h2>
          <p className="text-sm text-ink-400 mt-0.5">Plans, prices and features for every product. Price changes apply to new payments and renewals.</p>
        </div>
        <button onClick={() => setDraft(blank())} className="kh-btn-primary flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm">
          <Plus size={15} /> New package
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="kh-card h-64 animate-pulse bg-ink-100" />)}
        </div>
      ) : PRODUCTS.map(prod => {
        const list = packages.filter(p => (p.product || 'pos') === prod.value);
        return (
          <section key={prod.value} className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wide text-ink-500">{prod.label} <span className="font-semibold text-ink-400">· {list.length}</span></h3>
            {list.length === 0 ? (
              <p className="kh-card p-5 text-sm text-ink-400">No {prod.label} packages yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {list.map((pkg: any) => (
                  <div key={pkg.id} className={`kh-card p-6 relative ${pkg.is_popular ? 'ring-2 ring-teal-600' : ''} ${pkg.is_active ? '' : 'opacity-60'}`}>
                    {pkg.is_popular && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold text-white"
                        style={{ background: 'linear-gradient(135deg,#00796B,#00796B)' }}>Most Popular</span>
                    )}
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#E0F2F1' }}>
                        <Package size={18} style={{ color: '#00796B' }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-ink-900">{pkg.name}</h3>
                        <p className="text-xs text-ink-400">{pkg.description || 'No description'}</p>
                      </div>
                      <button onClick={() => setDraft(toDraft(pkg))} className="p-2 rounded-lg text-ink-400 hover:bg-teal-50 hover:text-teal-700" aria-label={`Edit ${pkg.name}`}><Pencil size={15} /></button>
                      <button onClick={() => setRemoving(pkg)} className="p-2 rounded-lg text-ink-400 hover:bg-red-50 hover:text-red-600" aria-label={`Delete ${pkg.name}`}><Trash2 size={15} /></button>
                    </div>
                    <div className="mb-4">
                      <p className="text-2xl font-bold text-ink-900">LKR {pkg.price_monthly?.toLocaleString()}<span className="text-sm font-medium text-ink-400">/mo</span></p>
                      <p className="text-sm text-ink-400 mt-0.5">LKR {pkg.price_yearly?.toLocaleString()}/yr</p>
                    </div>
                    <div className="space-y-2">
                      {pkg.modules?.map((m: any) => (
                        <div key={m.id ?? m.module_name} className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#E0F2F1' }}>
                            <Check size={10} style={{ color: '#00796B' }} />
                          </div>
                          <span className="text-xs text-ink-600 capitalize">{m.module_name.replace(/_/g, ' ')}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 pt-4 border-t border-ink-100 flex items-center justify-between text-xs text-ink-400">
                      <span>{pkg.is_active ? '✓ On sale' : '✗ Switched off'}</span>
                      <span className="font-mono">{pkg.slug}</span>
                      {pkg.employee_limit && <span>Max {pkg.employee_limit} staff</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}

      <Modal open={!!draft} onClose={() => !busy && setDraft(null)} title={draft?.id ? `Edit ${draft.name}` : 'New package'} width="max-w-2xl">
        {draft && <PackageForm draft={draft} setDraft={setDraft} knownModules={knownModules} busy={busy} onSubmit={save} onCancel={() => setDraft(null)} />}
      </Modal>

      <Modal open={!!removing} onClose={() => !busy && setRemoving(null)} title="Delete package">
        <p className="text-sm text-ink-600">
          Delete <b>{removing?.name}</b>? Packages that anyone has subscribed to can&apos;t be deleted — switch them off instead so no one new can buy them.
        </p>
        <div className="kh-modal-actions flex justify-end gap-2 mt-5">
          <button type="button" disabled={busy} onClick={() => setRemoving(null)} className="px-4 py-2 text-sm font-semibold text-ink-500">Cancel</button>
          <button type="button" disabled={busy} onClick={remove} className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-red-600 disabled:opacity-50">
            {busy ? 'Deleting…' : 'Delete package'}
          </button>
        </div>
      </Modal>
    </div>
  );
}

function PackageForm({ draft, setDraft, knownModules, busy, onSubmit, onCancel }: {
  draft: Draft; setDraft: (d: Draft) => void; knownModules: string[]; busy: boolean;
  onSubmit: (e: React.FormEvent) => void; onCancel: () => void;
}) {
  const [newModule, setNewModule] = useState('');
  const set = (patch: Partial<Draft>) => setDraft({ ...draft, ...patch });
  const toggle = (m: string) => set({ modules: draft.modules.includes(m) ? draft.modules.filter(x => x !== m) : [...draft.modules, m] });
  const addModule = () => {
    const m = newModule.trim().toLowerCase().replace(/\s+/g, '_');
    if (m && !draft.modules.includes(m)) set({ modules: [...draft.modules, m] });
    setNewModule('');
  };
  const choices = Array.from(new Set([...knownModules, ...draft.modules])).sort();

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name"><input required value={draft.name} onChange={e => set({ name: e.target.value })} className={inputCls} maxLength={80} /></Field>
        <Field label="Product">
          <select value={draft.product} onChange={e => set({ product: e.target.value })} className={inputCls}>
            {PRODUCTS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </Field>
        <Field label="Monthly price (LKR)"><input required type="number" min={0} step="0.01" value={draft.price_monthly} onChange={e => set({ price_monthly: e.target.value })} className={inputCls} /></Field>
        <Field label="Yearly price (LKR)"><input required type="number" min={0} step="0.01" value={draft.price_yearly} onChange={e => set({ price_yearly: e.target.value })} className={inputCls} /></Field>
        <Field label="Staff limit (empty = no limit)"><input type="number" min={1} value={draft.employee_limit} onChange={e => set({ employee_limit: e.target.value })} className={inputCls} /></Field>
        <Field label="Order on the pricing page"><input type="number" min={0} value={draft.sort_order} onChange={e => set({ sort_order: e.target.value })} className={inputCls} /></Field>
      </div>
      <Field label="Description"><input value={draft.description} onChange={e => set({ description: e.target.value })} className={inputCls} maxLength={500} /></Field>
      <Field label="Slug (used in links; made from the name if empty)"><input value={draft.slug} onChange={e => set({ slug: e.target.value })} className={`${inputCls} font-mono`} maxLength={80} /></Field>

      <div>
        <p className="text-sm font-semibold text-ink-700 mb-1.5">Features included</p>
        <div className="flex flex-wrap gap-1.5">
          {choices.map(m => (
            <button type="button" key={m} onClick={() => toggle(m)} aria-pressed={draft.modules.includes(m)}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${draft.modules.includes(m) ? 'bg-teal-700 border-teal-700 text-white' : 'bg-white border-ink-200 text-ink-600'}`}>
              {draft.modules.includes(m) ? <Check size={11} className="inline mr-1" /> : null}{m.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input value={newModule} onChange={e => setNewModule(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addModule(); } }}
            placeholder="Add a feature key…" className={inputCls} aria-label="New feature key" />
          <button type="button" onClick={addModule} className="px-3 rounded-xl border border-ink-200 text-sm font-semibold text-ink-600 hover:bg-ink-50">Add</button>
        </div>
        <p className="mt-1 text-xs text-ink-400">Feature keys switch parts of the app on (e.g. pos, inventory, reports_basic, cod). Changing them affects new subscriptions; current subscribers keep what they bought until their next plan change.</p>
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" checked={draft.is_active} onChange={e => set({ is_active: e.target.checked })} /> On sale</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={draft.is_popular} onChange={e => set({ is_popular: e.target.checked })} /> Mark as “Most popular”</label>
      </div>

      <div className="kh-modal-actions flex justify-end gap-2">
        <button type="button" disabled={busy} onClick={onCancel} className="px-4 py-2 text-sm font-semibold text-ink-500 flex items-center gap-1"><X size={14} /> Cancel</button>
        <button type="submit" disabled={busy} className="kh-btn-primary px-4 py-2 rounded-xl text-sm disabled:opacity-50">{busy ? 'Saving…' : 'Save package'}</button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm"><span className="font-semibold text-ink-700">{label}</span><div className="mt-1">{children}</div></label>;
}
