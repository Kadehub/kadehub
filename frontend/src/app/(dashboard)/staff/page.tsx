'use client';
import { useEffect, useRef, useState } from 'react';
import { Shift, AuditLog } from '../../../types';
import { Card } from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import Modal from '../../../components/ui/Modal';
import { Input } from '../../../components/ui/Input';
import { LKR } from '../../../lib/format';
import api from '../../../lib/api';
import toast from 'react-hot-toast';
import { Clock, ClipboardList, TrendingUp, Plus, Users, Pencil, Camera, X } from 'lucide-react';
import { useLang } from '../../../hooks/useLang';

const today = () => new Date().toISOString().split('T')[0];

const EMPTY_EMP = { name: '', email: '', password: '', role: 'CASHIER', phone: '', emp_no: '' };

function resolvePhoto(url?: string) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ?? 'http://localhost:3001'}${url}`;
}

export default function StaffPage() {
  const { t } = useLang();
  const [tab, setTab] = useState<'employees' | 'shifts' | 'performance' | 'audit'>('employees');
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [performance, setPerformance] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());

  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [editEmployee, setEditEmployee] = useState<any | null>(null);
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState<Shift | null>(null);
  const [saving, setSaving] = useState(false);

  const [empForm, setEmpForm] = useState(EMPTY_EMP);
  const [empPhoto, setEmpPhoto] = useState<File | null>(null);
  const [empPhotoPreview, setEmpPhotoPreview] = useState('');
  const photoRef = useRef<HTMLInputElement>(null);

  const [openForm, setOpenForm] = useState({ opening_cash: '', notes: '' });
  const [closeForm, setCloseForm] = useState({ closing_cash: '', notes: '' });

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [s, l, p, e] = await Promise.all([
        api.get('/staff/shifts'),
        api.get(`/staff/audit?from=${from}&to=${to}`),
        api.get(`/staff/performance?from=${from}&to=${to}`),
        api.get('/tenant/users'),
      ]);
      setShifts(Array.isArray(s.data) ? s.data : []);
      setLogs(Array.isArray(l.data) ? l.data : []);
      setPerformance(Array.isArray(p.data) ? p.data : []);
      setEmployees(Array.isArray(e.data) ? e.data : []);
    } catch { }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, [from, to]);

  const openAddModal = () => {
    setEmpForm(EMPTY_EMP);
    setEmpPhoto(null);
    setEmpPhotoPreview('');
    setShowAddEmployee(true);
  };

  const openEditModal = (emp: any) => {
    setEmpForm({ name: emp.name, email: emp.email, password: '', role: emp.role, phone: emp.phone || '', emp_no: emp.emp_no || '' });
    setEmpPhoto(null);
    setEmpPhotoPreview(resolvePhoto(emp.photo_url));
    setEditEmployee(emp);
  };

  const handlePhotoPick = (file: File) => {
    setEmpPhoto(file);
    setEmpPhotoPreview(URL.createObjectURL(file));
  };

  const submitEmployee = async (e: React.FormEvent, mode: 'add' | 'edit') => {
    e.preventDefault();
    setSaving(true);
    try {
      let userId: number;
      if (mode === 'add') {
        const res = await api.post('/tenant/users', empForm);
        userId = res.data.id;
        toast.success('Employee added');
      } else {
        const payload: any = { ...empForm };
        if (!payload.password) delete payload.password;
        await api.patch(`/tenant/users/${editEmployee.id}`, payload);
        userId = editEmployee.id;
        toast.success('Employee updated');
      }
      if (empPhoto) {
        const fd = new FormData();
        fd.append('photo', empPhoto);
        await api.post(`/tenant/users/${userId}/photo`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      setShowAddEmployee(false);
      setEditEmployee(null);
      setEmpForm(EMPTY_EMP);
      setEmpPhoto(null);
      setEmpPhotoPreview('');
      fetchAll();
    } catch (err: any) {
      const msg = err.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'Failed');
    } finally { setSaving(false); }
  };

  const openShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/staff/shifts', { opening_cash: +openForm.opening_cash, notes: openForm.notes });
      toast.success('Shift opened');
      setShowOpenModal(false);
      setOpenForm({ opening_cash: '', notes: '' });
      fetchAll();
    } catch (err: any) {
      const msg = err.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'Failed');
    } finally { setSaving(false); }
  };

  const closeShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showCloseModal) return;
    setSaving(true);
    try {
      await api.patch(`/staff/shifts/${showCloseModal.id}/close`, { closing_cash: +closeForm.closing_cash, notes: closeForm.notes });
      toast.success('Shift closed');
      setShowCloseModal(null);
      setCloseForm({ closing_cash: '', notes: '' });
      fetchAll();
    } catch (err: any) {
      const msg = err.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'Failed');
    } finally { setSaving(false); }
  };

  const EmpForm = ({ mode }: { mode: 'add' | 'edit' }) => (
    <form onSubmit={(e) => submitEmployee(e, mode)} className="space-y-4">
      {/* Photo picker */}
      <div className="flex items-center gap-4">
        <div className="relative flex-shrink-0">
          {empPhotoPreview ? (
            <img src={empPhotoPreview} alt="photo"
              className="w-20 h-20 rounded-full object-cover border-2 border-ink-200" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-ink-100 flex items-center justify-center text-2xl font-bold text-ink-400"
              style={{ background: 'linear-gradient(135deg,#00796B,#00A884)', color: 'white' }}>
              {empForm.name?.[0]?.toUpperCase() || '?'}
            </div>
          )}
          {empPhotoPreview && (
            <button type="button" onClick={() => { setEmpPhoto(null); setEmpPhotoPreview(''); }}
              className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center">
              <X size={10} />
            </button>
          )}
        </div>
        <div>
          <p className="text-sm font-semibold text-ink-700 mb-0.5">{t('staff.photo')}</p>
          <p className="text-xs text-ink-400 mb-2">{t('staff.photoHint')}</p>
          <button type="button" onClick={() => photoRef.current?.click()}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-ink-200 text-sm font-medium text-ink-600 hover:bg-ink-50">
            <Camera size={13} /> {empPhotoPreview ? t('staff.changePhoto') : t('staff.uploadPhoto')}
          </button>
          <input ref={photoRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoPick(f); e.target.value = ''; }} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Input label={t('staff.name')} placeholder="Sunil Fernando" required
            value={empForm.name} onChange={e => setEmpForm(f => ({ ...f, name: e.target.value }))} />
        </div>
        <Input label={t('staff.empNo')} placeholder="EMP-001"
          value={empForm.emp_no} onChange={e => setEmpForm(f => ({ ...f, emp_no: e.target.value }))} />
        <Input label={t('staff.phone')} placeholder="0771234567"
          value={empForm.phone} onChange={e => setEmpForm(f => ({ ...f, phone: e.target.value }))} />
        <Input label={t('staff.email')} type="email" placeholder="cashier@shop.com" required
          value={empForm.email} onChange={e => setEmpForm(f => ({ ...f, email: e.target.value }))} />
        <div>
          <label className="block text-xs font-semibold text-ink-600 mb-1">{t('staff.role')}</label>
          <select value={empForm.role} onChange={e => setEmpForm(f => ({ ...f, role: e.target.value }))}
            className="w-full border border-ink-200 rounded-lg px-3 py-2 text-sm">
            <option value="CASHIER">{t('staff.cashier')}</option>
            <option value="ADMIN">{t('staff.admin')}</option>
          </select>
        </div>
        <div className="col-span-2">
          <Input label={mode === 'add' ? t('staff.password') : t('staff.newPassword')}
            type="password" placeholder="Min 6 characters" required={mode === 'add'}
            value={empForm.password} onChange={e => setEmpForm(f => ({ ...f, password: e.target.value }))} />
        </div>
      </div>

      <div className="flex gap-3 pt-1">
        <Button type="button" variant="outline" className="flex-1"
          onClick={() => { setShowAddEmployee(false); setEditEmployee(null); }}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" className="flex-1" loading={saving}>
          {mode === 'add' ? t('staff.addEmployee') : t('common.save')}
        </Button>
      </div>
    </form>
  );

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 p-1 rounded-xl bg-white border border-ink-200 overflow-x-auto">
          {([
            { key: 'employees',   labelKey: 'staff.employees',   icon: Users },
            { key: 'shifts',      labelKey: 'staff.shifts',      icon: Clock },
            { key: 'performance', labelKey: 'staff.performance', icon: TrendingUp },
            { key: 'audit',       labelKey: 'staff.audit',       icon: ClipboardList },
          ] as const).map(({ key, labelKey, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
              style={{ background: tab === key ? '#009688' : 'transparent', color: tab === key ? 'white' : '#64748B' }}>
              <Icon size={15} />{t(labelKey)}
            </button>
          ))}
        </div>
        {(tab === 'audit' || tab === 'performance') && (
          <div className="flex items-center gap-2">
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="border border-ink-200 rounded-lg px-3 py-1.5 text-sm" />
            <span className="text-ink-400 text-xs">{t('staff.to')}</span>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} className="border border-ink-200 rounded-lg px-3 py-1.5 text-sm" />
          </div>
        )}
        {tab === 'shifts' && (
          <Button size="sm" icon={<Clock size={15} />} onClick={() => setShowOpenModal(true)}>{t('staff.openShift')}</Button>
        )}
        {tab === 'employees' && (
          <Button size="sm" icon={<Plus size={15} />} onClick={openAddModal}>{t('staff.addEmployee')}</Button>
        )}
      </div>

      {/* ── Employees ── */}
      {tab === 'employees' && (
        <Card padding={false}>
          {loading ? <div className="py-16 text-center text-ink-400 text-sm">{t('common.loading')}</div> :
            employees.length === 0 ? <div className="py-16 text-center text-ink-400 text-sm">{t('staff.noEmployees')}</div> : (
              <div className="overflow-x-auto">
              <table className="mob-cards w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-100">
                    {[t('staff.name'), t('staff.empNo'), t('staff.phone'), t('staff.email'), t('staff.role'), t('staff.joined'), ''].map(h => (
                      <th key={h} className="px-5 py-3 text-xs font-semibold text-ink-400 uppercase tracking-wide text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {employees.map(emp => (
                    <tr key={emp.id} className="border-b border-ink-50 hover:bg-ink-50 last:border-0">
                      <td data-label={t('staff.name')} className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          {emp.photo_url ? (
                            <img src={resolvePhoto(emp.photo_url)} alt={emp.name}
                              className="w-9 h-9 rounded-full object-cover border border-ink-200 flex-shrink-0" />
                          ) : (
                            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                              style={{ background: emp.role === 'ADMIN' ? '#00796B' : '#009688' }}>
                              {emp.name[0].toUpperCase()}
                            </div>
                          )}
                          <span className="font-semibold text-ink-800">{emp.name}</span>
                        </div>
                      </td>
                      <td data-label={t('staff.empNo')} className="px-5 py-3.5">
                        <code className="text-xs text-ink-500 bg-ink-100 px-1.5 py-0.5 rounded">{emp.emp_no || '—'}</code>
                      </td>
                      <td data-label={t('staff.phone')} className="px-5 py-3.5 text-ink-500">{emp.phone || '—'}</td>
                      <td data-label={t('staff.email')} className="px-5 py-3.5 text-ink-500">{emp.email}</td>
                      <td data-label={t('staff.role')} className="px-5 py-3.5">
                        <Badge variant={emp.role === 'ADMIN' ? 'teal' : 'gray'}>
                          {emp.role === 'ADMIN' ? t('staff.admin') : t('staff.cashier')}
                        </Badge>
                      </td>
                      <td data-label={t('staff.joined')} className="px-5 py-3.5 text-ink-400 text-xs">
                        {new Date(emp.created_at).toLocaleDateString('en-LK', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Button size="xs" variant="ghost" icon={<Pencil size={13} />} onClick={() => openEditModal(emp)}>
                          {t('common.adjust')}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
        </Card>
      )}

      {/* ── Shifts ── */}
      {tab === 'shifts' && (
        <Card padding={false}>
          {loading ? <div className="py-16 text-center text-ink-400 text-sm">{t('common.loading')}</div> :
            shifts.length === 0 ? <div className="py-16 text-center text-ink-400 text-sm">{t('staff.noShifts')}</div> : (
              <div className="overflow-x-auto">
              <table className="mob-cards w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-100">
                    {[t('staff.cashierCol'), t('staff.opened'), t('staff.closed'), t('staff.openingCash'), t('staff.closingCash'), t('staff.status'), ''].map(h => (
                      <th key={h} className="px-5 py-3 text-xs font-semibold text-ink-400 uppercase tracking-wide text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {shifts.map(s => (
                    <tr key={s.id} className="border-b border-ink-50 hover:bg-ink-50 last:border-0">
                      <td data-label={t('staff.cashierCol')} className="px-5 py-3.5 font-semibold text-ink-800">{(s.user as any)?.name || `User #${s.user_id}`}</td>
                      <td data-label={t('staff.opened')} className="px-5 py-3.5 text-ink-500 text-xs">{new Date(s.opened_at).toLocaleString('en-LK')}</td>
                      <td data-label={t('staff.closed')} className="px-5 py-3.5 text-ink-500 text-xs">{s.closed_at ? new Date(s.closed_at).toLocaleString('en-LK') : '—'}</td>
                      <td data-label={t('staff.openingCash')} className="px-5 py-3.5 font-medium" style={{ color: '#009688' }}>{LKR(s.opening_cash)}</td>
                      <td data-label={t('staff.closingCash')} className="px-5 py-3.5 font-medium text-ink-700">{s.closing_cash != null ? LKR(s.closing_cash) : '—'}</td>
                      <td data-label={t('staff.status')} className="px-5 py-3.5">
                        <Badge variant={s.closed_at ? 'gray' : 'teal'} dot>
                          {s.closed_at ? t('staff.closed') : t('staff.open')}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5">
                        {!s.closed_at && (
                          <Button size="xs" variant="outline" onClick={() => { setShowCloseModal(s); setCloseForm({ closing_cash: '', notes: '' }); }}>
                            {t('staff.close')}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
        </Card>
      )}

      {/* ── Performance ── */}
      {tab === 'performance' && (
        <Card padding={false}>
          {loading ? <div className="py-16 text-center text-ink-400 text-sm">{t('common.loading')}</div> :
            performance.length === 0 ? <div className="py-16 text-center text-ink-400 text-sm">{t('staff.noPerformance')}</div> : (
              <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[400px]">
                <thead>
                  <tr className="border-b border-ink-100">
                    {[t('staff.cashierCol'), t('staff.totalSales'), t('staff.revenue'), t('staff.avgSale')].map(h => (
                      <th key={h} className="px-5 py-3 text-xs font-semibold text-ink-400 uppercase tracking-wide text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {performance.map((p, i) => (
                    <tr key={i} className="border-b border-ink-50 hover:bg-ink-50 last:border-0">
                      <td className="px-5 py-3.5 font-semibold text-ink-800">{p.cashier}</td>
                      <td className="px-5 py-3.5 text-ink-700">{p.total_sales}</td>
                      <td className="px-5 py-3.5 font-bold" style={{ color: '#009688' }}>{LKR(+p.revenue)}</td>
                      <td className="px-5 py-3.5 text-ink-500">{LKR(+p.avg_sale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
        </Card>
      )}

      {/* ── Audit Log ── */}
      {tab === 'audit' && (
        <Card padding={false}>
          {loading ? <div className="py-16 text-center text-ink-400 text-sm">{t('common.loading')}</div> :
            logs.length === 0 ? <div className="py-16 text-center text-ink-400 text-sm">{t('staff.noAudit')}</div> : (
              <div className="overflow-x-auto">
              <table className="mob-cards w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-100">
                    {[t('staff.time'), t('staff.user'), t('staff.action'), t('staff.entity'), t('staff.details')].map(h => (
                      <th key={h} className="px-5 py-3 text-xs font-semibold text-ink-400 uppercase tracking-wide text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map(l => (
                    <tr key={l.id} className="border-b border-ink-50 hover:bg-ink-50 last:border-0">
                      <td data-label={t('staff.time')} className="px-5 py-3.5 text-ink-400 text-xs">{new Date(l.created_at).toLocaleString('en-LK')}</td>
                      <td data-label={t('staff.user')} className="px-5 py-3.5 font-medium text-ink-700">{l.user_name}</td>
                      <td data-label={t('staff.action')} className="px-5 py-3.5"><Badge variant="teal">{l.action}</Badge></td>
                      <td data-label={t('staff.entity')} className="px-5 py-3.5 text-ink-500">{l.entity}{l.entity_id ? ` #${l.entity_id}` : ''}</td>
                      <td data-label={t('staff.details')} className="px-5 py-3.5 text-ink-400 text-xs">{l.details ? JSON.stringify(l.details) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
        </Card>
      )}

      {/* Add Employee Modal */}
      <Modal open={showAddEmployee} onClose={() => { setShowAddEmployee(false); setEmpPhoto(null); setEmpPhotoPreview(''); }} title={t('staff.addEmployee')} width="max-w-lg">
        <EmpForm mode="add" />
      </Modal>

      {/* Edit Employee Modal */}
      <Modal open={!!editEmployee} onClose={() => { setEditEmployee(null); setEmpPhoto(null); setEmpPhotoPreview(''); }} title={t('staff.editEmployee')} width="max-w-lg">
        <EmpForm mode="edit" />
      </Modal>

      {/* Open Shift Modal */}
      <Modal open={showOpenModal} onClose={() => setShowOpenModal(false)} title={t('staff.openShift')}>
        <form onSubmit={openShift} className="space-y-4">
          <Input label={t('staff.openingCash')} type="number" required min="0" step="0.01" value={openForm.opening_cash}
            onChange={e => setOpenForm(f => ({ ...f, opening_cash: e.target.value }))} />
          <Input label={t('staff.notes')} value={openForm.notes} onChange={e => setOpenForm(f => ({ ...f, notes: e.target.value }))} />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowOpenModal(false)}>{t('common.cancel')}</Button>
            <Button type="submit" className="flex-1" loading={saving}>{t('staff.openShift')}</Button>
          </div>
        </form>
      </Modal>

      {/* Close Shift Modal */}
      <Modal open={!!showCloseModal} onClose={() => setShowCloseModal(null)} title={t('staff.closeShift')}>
        {showCloseModal && (
          <form onSubmit={closeShift} className="space-y-4">
            <div className="p-3 rounded-xl bg-ink-50 text-sm">
              <p className="text-ink-500">{t('staff.openingCash')}: <strong>{LKR(showCloseModal.opening_cash)}</strong></p>
              <p className="text-ink-400 text-xs">{t('staff.opened')}: {new Date(showCloseModal.opened_at).toLocaleString('en-LK')}</p>
            </div>
            <Input label={t('staff.closingCash')} type="number" required min="0" step="0.01" value={closeForm.closing_cash}
              onChange={e => setCloseForm(f => ({ ...f, closing_cash: e.target.value }))} />
            <Input label={t('staff.notes')} value={closeForm.notes} onChange={e => setCloseForm(f => ({ ...f, notes: e.target.value }))} />
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setShowCloseModal(null)}>{t('common.cancel')}</Button>
              <Button type="submit" className="flex-1" loading={saving}>{t('staff.closeShift')}</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
