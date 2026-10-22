'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { ArrowDownToLine, ArrowUpFromLine, History, MoreVertical, Pencil, Plus, Trash2 } from 'lucide-react';
import api from '../../../lib/api';
import { apiError } from '../../../lib/hr/api';
import { useHrT, type HrKey } from '../../../lib/hr/i18n';
import { formatDate, formatLKR, today } from '../../../lib/hr/format';
import { ASSET_CATEGORIES, type Asset, type AssetAssignment, type AssetCategory, type AssetStatus, type Employee } from '../../../lib/hr/types';
import { hrHref, useHr } from '../../../components/hr/HrContext';
import {
  Button, ConfirmDialog, Dialog, EmployeeSelect, EmptyState, ExportButton, Field, Kpi, LoadError, Loading, Menu, MenuItem, NativeSelect,
  PageHeader, Pill, SearchInput, TextArea, TextInput, Toggle, tbl,
} from '../../../components/hr/ui';
import { ASSET_TONE } from '../../../components/hr/talent/shared';

const STATUSES: AssetStatus[] = ['available', 'issued', 'lost', 'retired'];

// staff.kadehub.com/assets — things handed to staff, who has them, and what comes back
export default function AssetsPage() {
  const { t } = useHrT();
  const { branch, branchName } = useHr();
  const [assets, setAssets] = useState<Asset[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState<AssetCategory | ''>('');
  const [status, setStatus] = useState<AssetStatus | ''>('');
  const [editing, setEditing] = useState<Asset | null | 'new'>(null);
  const [issuing, setIssuing] = useState<Asset | null>(null);
  const [returning, setReturning] = useState<Asset | null>(null);
  const [history, setHistory] = useState<Asset | null>(null);
  const [deleting, setDeleting] = useState<Asset | null>(null);

  const load = useCallback(() => {
    setFailed(false);
    setAssets(null);
    api.get<Asset[]>('/hr/assets', { params: { branch_id: branch ?? undefined } }).then(r => setAssets(r.data)).catch(() => setFailed(true));
  }, [branch]);
  useEffect(load, [load]);

  const cat = (c: string) => t(`ast.cat.${c}` as HrKey);
  const st = (s: string) => t(`ast.status.${s}` as HrKey);
  const all = assets ?? [];
  const needle = q.trim().toLowerCase();
  const shown = all.filter(a =>
    (!category || a.category === category) && (!status || a.status === status) &&
    (!needle || [a.code, a.name, a.holder?.name ?? ''].some(s => s.toLowerCase().includes(needle))));
  const count = (s: AssetStatus) => all.filter(a => a.status === s).length;

  const actions = (a: Asset) => (
    <Menu trigger={<MoreVertical />} label={t('common.actions')}>
      {close => (
        <>
          {a.status === 'available' && <MenuItem onClick={() => { close(); setIssuing(a); }}><ArrowUpFromLine /> {t('ast.issue')}</MenuItem>}
          {a.status === 'issued' && <MenuItem onClick={() => { close(); setReturning(a); }}><ArrowDownToLine /> {t('ast.return')}</MenuItem>}
          <MenuItem onClick={() => { close(); setHistory(a); }}><History /> {t('ast.history')}</MenuItem>
          <MenuItem onClick={() => { close(); setEditing(a); }}><Pencil /> {t('common.edit')}</MenuItem>
          {a.status !== 'issued' && <MenuItem danger onClick={() => { close(); setDeleting(a); }}><Trash2 /> {t('common.delete')}</MenuItem>}
        </>
      )}
    </Menu>
  );
  const holder = (a: Asset) => a.holder
    ? <span><Link href={hrHref(`/employees/${a.holder.employee_id}`)} className="font-medium text-ink-800 hover:underline">{a.holder.name}</Link>
      <span className="block text-xs text-ink-400">{t('ast.since', { date: formatDate(a.holder.issued_date) })}</span></span>
    : <span className="text-ink-400">—</span>;

  return (
    <div className="space-y-5">
      <PageHeader title={t('ast.title')} subtitle={t('ast.subtitle')}
        actions={<>
          <ExportButton filename={`assets-${today()}`}
            header={[t('ast.code'), t('ast.name'), t('ast.category'), t('ast.value'), t('common.status'), t('ast.holder'), t('ast.issueDate')]}
            rows={shown.map(a => [a.code, a.name, cat(a.category), a.value, st(a.status), a.holder?.name ?? '', a.holder?.issued_date ?? ''])} />
          <Button onClick={() => setEditing('new')}><Plus /> {t('ast.add')}</Button>
        </>} />

      {assets && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi label={t('ast.kpiValue')} value={formatLKR(all.filter(a => a.status !== 'retired').reduce((s, a) => s + a.value, 0), { decimals: false })} />
          <Kpi label={t('ast.kpiIssued')} value={String(count('issued'))} />
          <Kpi label={t('ast.kpiAvailable')} value={String(count('available'))} />
          <Kpi label={t('ast.kpiLost')} value={String(count('lost'))} tone={count('lost') ? 'danger' : undefined} />
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <SearchInput value={q} onChange={setQ} placeholder={t('ast.searchPlaceholder')} />
        <NativeSelect aria-label={t('ast.category')} value={category} className="sm:w-44" onChange={e => setCategory(e.target.value as AssetCategory | '')}>
          <option value="">{t('ast.allCategories')}</option>
          {ASSET_CATEGORIES.map(c => <option key={c} value={c}>{cat(c)}</option>)}
        </NativeSelect>
        <NativeSelect aria-label={t('common.status')} value={status} className="sm:w-44" onChange={e => setStatus(e.target.value as AssetStatus | '')}>
          <option value="">{t('ast.allStatuses')}</option>
          {STATUSES.map(s => <option key={s} value={s}>{st(s)}</option>)}
        </NativeSelect>
      </div>

      {failed ? <LoadError onRetry={load} />
        : !assets ? <Loading />
        : !all.length ? (
          <div className="kh-card"><EmptyState scene="work" title={t('ast.noAssets')} description={t('ast.noAssetsBody')}
            action={<Button onClick={() => setEditing('new')}><Plus /> {t('ast.add')}</Button>} /></div>
        ) : !shown.length ? (
          <p className="kh-card p-6 text-center text-sm text-ink-500">{t('common.noResults')}</p>
        ) : (
          <>
            <div className={`${tbl.wrap} hidden md:block`}>
              <table className={tbl.table}>
                <thead><tr>
                  <th className={tbl.th}>{t('ast.code')}</th><th className={tbl.th}>{t('ast.name')}</th><th className={tbl.th}>{t('ast.category')}</th>
                  <th className={`${tbl.th} ${tbl.right}`}>{t('ast.value')}</th><th className={tbl.th}>{t('common.status')}</th><th className={tbl.th}>{t('ast.holder')}</th><th className={tbl.th} />
                </tr></thead>
                <tbody>
                  {shown.map(a => (
                    <tr key={a.id}>
                      <td className={`${tbl.td} font-mono text-xs`}>{a.code}</td>
                      <td className={tbl.td}>
                        <span className="font-medium text-ink-800">{a.name}</span>
                        {branch === null && a.branch_id !== null && <span className="block text-xs text-ink-400">{branchName(a.branch_id)}</span>}
                      </td>
                      <td className={tbl.td}>{cat(a.category)}</td>
                      <td className={`${tbl.td} ${tbl.right}`}>{formatLKR(a.value, { decimals: false })}</td>
                      <td className={tbl.td}><Pill tone={ASSET_TONE[a.status]}>{st(a.status)}</Pill></td>
                      <td className={tbl.td}>{holder(a)}</td>
                      <td className={`${tbl.td} ${tbl.right}`}>
                        <div className="flex items-center justify-end gap-1">
                          {a.status === 'available' && <Button variant="outline" size="sm" onClick={() => setIssuing(a)}>{t('ast.issue')}</Button>}
                          {a.status === 'issued' && <Button variant="outline" size="sm" onClick={() => setReturning(a)}>{t('ast.return')}</Button>}
                          {actions(a)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="space-y-2 md:hidden">
              {shown.map(a => (
                <li key={a.id} className="kh-card p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-ink-800">{a.name}</p>
                      <p className="text-xs text-ink-500">{a.code} · {cat(a.category)} · {formatLKR(a.value, { decimals: false })}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1"><Pill tone={ASSET_TONE[a.status]}>{st(a.status)}</Pill>{actions(a)}</div>
                  </div>
                  {a.holder && <div className="mt-2 text-sm">{holder(a)}</div>}
                </li>
              ))}
            </ul>
          </>
        )}

      <AssetDialog asset={editing} onClose={() => setEditing(null)} onSaved={load} />
      <IssueDialog asset={issuing} onClose={() => setIssuing(null)} onDone={load} />
      <ReturnDialog asset={returning} onClose={() => setReturning(null)} onDone={load} />
      <HistoryDialog asset={history} onClose={() => setHistory(null)} />
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} title={t('ast.deleteTitle')}
        message={<><p className="font-semibold text-ink-800">{deleting?.name}</p><p className="mt-1">{t('ast.deleteBody')} {t('common.cannotUndo')}</p></>}
        confirmLabel={t('common.delete')}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await api.delete(`/hr/assets/${deleting.id}`);
            setAssets(l => l?.filter(a => a.id !== deleting.id) ?? null);
          } catch (err) {
            toast.error(apiError(err, t));
          }
        }} />
    </div>
  );
}

function AssetDialog({ asset, onClose, onSaved }: { asset: Asset | null | 'new'; onClose: () => void; onSaved: () => void }) {
  const { t } = useHrT();
  const { branches, branch, owner } = useHr();
  const existing = asset && asset !== 'new' ? asset : null;
  const [form, setForm] = useState({ code: '', name: '', category: 'other' as AssetCategory, value: '', branch_id: '' as number | '', notes: '', status: 'available' as AssetStatus });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!asset) return;
    setForm(existing
      ? { code: existing.code, name: existing.name, category: existing.category, value: String(existing.value || ''), branch_id: existing.branch_id ?? '', notes: existing.notes, status: existing.status }
      : { code: '', name: '', category: 'uniform', value: '', branch_id: branch ?? (branches.length === 1 ? branches[0].id : ''), notes: '', status: 'available' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        code: form.code.trim() || undefined, name: form.name.trim(), category: form.category, value: Number(form.value) || 0,
        branch_id: form.branch_id === '' ? null : form.branch_id, notes: form.notes,
      };
      if (form.status !== 'issued') body.status = form.status;
      if (existing) await api.patch(`/hr/assets/${existing.id}`, body);
      else await api.post('/hr/assets', body);
      toast.success(t('common.saved'));
      onSaved();
      onClose();
    } catch (err) {
      toast.error(apiError(err, t));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!!asset} onClose={onClose} title={existing ? t('ast.edit') : t('ast.add')}>
      <form onSubmit={save} className="space-y-4">
        <Field label={t('ast.name')} htmlFor="as_name">
          <TextInput id="as_name" required maxLength={150} placeholder={t('ast.namePlaceholder')} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('ast.code')} htmlFor="as_code" hint={existing ? undefined : t('ast.codeHint')}>
            <TextInput id="as_code" maxLength={40} value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} />
          </Field>
          <Field label={t('ast.category')} htmlFor="as_cat">
            <NativeSelect id="as_cat" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as AssetCategory }))}>
              {ASSET_CATEGORIES.map(c => <option key={c} value={c}>{t(`ast.cat.${c}` as HrKey)}</option>)}
            </NativeSelect>
          </Field>
          <Field label={t('ast.value')} htmlFor="as_value">
            <TextInput id="as_value" type="number" min={0} step="any" inputMode="decimal" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} />
          </Field>
          <Field label={t('app.branch')} htmlFor="as_branch">
            <NativeSelect id="as_branch" value={form.branch_id} required={!owner} onChange={e => setForm(f => ({ ...f, branch_id: e.target.value ? Number(e.target.value) : '' }))}>
              {owner && <option value="">{t('common.unassigned')}</option>}
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </NativeSelect>
          </Field>
        </div>
        {existing && existing.status !== 'issued' && (
          <Field label={t('common.status')} htmlFor="as_status">
            <NativeSelect id="as_status" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as AssetStatus }))}>
              {(['available', 'lost', 'retired'] as const).map(s => <option key={s} value={s}>{t(`ast.status.${s}`)}</option>)}
            </NativeSelect>
          </Field>
        )}
        <Field label={t('common.notes')} htmlFor="as_notes">
          <TextArea id="as_notes" rows={2} maxLength={300} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>{t('common.cancel')}</Button>
          <Button type="submit" disabled={saving}>{saving ? t('common.saving') : t('common.save')}</Button>
        </div>
      </form>
    </Dialog>
  );
}

function IssueDialog({ asset, onClose, onDone }: { asset: Asset | null; onClose: () => void; onDone: () => void }) {
  const { t } = useHrT();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [form, setForm] = useState({ employee_id: '' as number | '', issued_date: today(), condition_out: '', notes: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!asset) return;
    setForm({ employee_id: '', issued_date: today(), condition_out: '', notes: '' });
    // Staff of the asset's own branch first; the whole visible team when it has none
    api.get<Employee[]>('/hr/employees', { params: { branch_id: asset.branch_id ?? undefined } }).then(r => setEmployees(r.data)).catch(() => setEmployees([]));
  }, [asset]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!asset) return;
    setSaving(true);
    try {
      await api.post(`/hr/assets/${asset.id}/issue`, form);
      toast.success(t('ast.issuedToast', { name: employees.find(x => x.id === form.employee_id)?.full_name ?? '' }));
      onDone();
      onClose();
    } catch (err) {
      toast.error(apiError(err, t));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!!asset} onClose={onClose} title={t('ast.issueTitle', { name: asset?.name ?? '' })}>
      <form onSubmit={save} className="space-y-4">
        <Field label={t('common.employee')} htmlFor="is_emp">
          <EmployeeSelect id="is_emp" required employees={employees} value={form.employee_id} onChange={v => setForm(f => ({ ...f, employee_id: v }))} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('ast.issueDate')} htmlFor="is_date">
            <TextInput id="is_date" type="date" required value={form.issued_date} onChange={e => setForm(f => ({ ...f, issued_date: e.target.value }))} />
          </Field>
          <Field label={t('ast.conditionOut')} htmlFor="is_cond">
            <TextInput id="is_cond" maxLength={100} placeholder={t('ast.conditionPlaceholder')} value={form.condition_out} onChange={e => setForm(f => ({ ...f, condition_out: e.target.value }))} />
          </Field>
        </div>
        <Field label={t('common.notes')} htmlFor="is_notes">
          <TextArea id="is_notes" rows={2} maxLength={300} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>{t('common.cancel')}</Button>
          <Button type="submit" disabled={saving}>{saving ? t('common.saving') : t('ast.issue')}</Button>
        </div>
      </form>
    </Dialog>
  );
}

function ReturnDialog({ asset, onClose, onDone }: { asset: Asset | null; onClose: () => void; onDone: () => void }) {
  const { t } = useHrT();
  const [form, setForm] = useState({ returned_date: today(), condition_in: '', lost: false, deduction_amount: '', notes: '' });
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (asset) setForm({ returned_date: today(), condition_in: '', lost: false, deduction_amount: '', notes: '' }); }, [asset]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!asset) return;
    setSaving(true);
    try {
      await api.post(`/hr/assets/${asset.id}/return`, { ...form, deduction_amount: Number(form.deduction_amount) || 0 });
      toast.success(t('ast.returnedToast'));
      onDone();
      onClose();
    } catch (err) {
      toast.error(apiError(err, t));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!!asset} onClose={onClose} title={t('ast.returnTitle', { name: asset?.name ?? '' })}>
      <form onSubmit={save} className="space-y-4">
        {asset?.holder && <p className="text-sm text-ink-600">{asset.holder.name} · {t('ast.since', { date: formatDate(asset.holder.issued_date) })}</p>}
        <div className="flex items-start justify-between gap-4 rounded-xl border border-ink-200 p-3">
          <span className="text-sm">
            <span className="font-medium">{t('ast.lost')}</span>
            <span className="block text-xs text-ink-500">{t('ast.lostHint')}</span>
          </span>
          <Toggle checked={form.lost} label={t('ast.lost')}
            onChange={v => setForm(f => ({ ...f, lost: v, deduction_amount: v && !f.deduction_amount ? String(asset?.value || '') : f.deduction_amount }))} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('ast.returnDate')} htmlFor="rt_date">
            <TextInput id="rt_date" type="date" required value={form.returned_date} onChange={e => setForm(f => ({ ...f, returned_date: e.target.value }))} />
          </Field>
          {!form.lost && (
            <Field label={t('ast.conditionIn')} htmlFor="rt_cond">
              <TextInput id="rt_cond" maxLength={100} placeholder={t('ast.conditionPlaceholder')} value={form.condition_in} onChange={e => setForm(f => ({ ...f, condition_in: e.target.value }))} />
            </Field>
          )}
        </div>
        <Field label={t('ast.charge')} htmlFor="rt_charge" hint={t('ast.chargeHint')}>
          <TextInput id="rt_charge" type="number" min={0} step="any" inputMode="decimal" value={form.deduction_amount} onChange={e => setForm(f => ({ ...f, deduction_amount: e.target.value }))} />
        </Field>
        <Field label={t('common.notes')} htmlFor="rt_notes">
          <TextArea id="rt_notes" rows={2} maxLength={300} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>{t('common.cancel')}</Button>
          <Button type="submit" disabled={saving}>{saving ? t('common.saving') : t('ast.return')}</Button>
        </div>
      </form>
    </Dialog>
  );
}

function HistoryDialog({ asset, onClose }: { asset: Asset | null; onClose: () => void }) {
  const { t } = useHrT();
  const [rows, setRows] = useState<AssetAssignment[] | null>(null);
  const [failed, setFailed] = useState(false);
  const load = useCallback(() => {
    if (!asset) return;
    setFailed(false);
    setRows(null);
    api.get<AssetAssignment[]>(`/hr/assets/${asset.id}/history`).then(r => setRows(r.data)).catch(() => setFailed(true));
  }, [asset]);
  useEffect(load, [load]);

  return (
    <Dialog open={!!asset} onClose={onClose} title={t('ast.historyTitle', { name: asset?.name ?? '' })}>
      {failed ? <LoadError onRetry={load} /> : !rows ? <Loading /> : !rows.length ? <p className="text-sm text-ink-500">{t('ast.noHistory')}</p> : (
        <ol className="space-y-2">
          {rows.map(r => (
            <li key={r.id} className="rounded-xl border border-ink-100 p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <Link href={hrHref(`/employees/${r.employee_id}`)} className="font-semibold text-ink-800 hover:underline">{r.employee_name}</Link>
                {r.returned_date ? <Pill tone={r.condition_in === 'lost' ? 'red' : 'gray'}>{t('ast.returnedOn', { date: formatDate(r.returned_date) })}</Pill> : <Pill tone="violet">{t('ast.stillOut')}</Pill>}
              </div>
              <p className="mt-0.5 text-xs text-ink-500">
                {[`${t('ast.issueDate')}: ${formatDate(r.issued_date)}`, r.condition_out, r.condition_in && r.condition_in !== 'lost' ? r.condition_in : '', r.condition_in === 'lost' ? t('ast.status.lost') : '']
                  .filter(Boolean).join(' · ')}
              </p>
              {r.deduction_amount > 0 && <p className="mt-0.5 text-xs font-medium text-red-600">{t('ast.charged', { amount: formatLKR(r.deduction_amount) })}</p>}
              {r.notes && <p className="mt-1 text-xs text-ink-600">{r.notes}</p>}
            </li>
          ))}
        </ol>
      )}
    </Dialog>
  );
}
