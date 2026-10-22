'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { ArrowLeft, Camera, KeyRound, MoreVertical, Pencil, RotateCcw, Trash2, UserMinus } from 'lucide-react';
import api from '../../../../lib/api';
import { apiError, postForm } from '../../../../lib/hr/api';
import { useHrT, type HrKey } from '../../../../lib/hr/i18n';
import { formatDate, today } from '../../../../lib/hr/format';
import type { EmployeeProfile } from '../../../../lib/hr/types';
import { hrHref, useHr } from '../../../../components/hr/HrContext';
import {
  Avatar, Button, ConfirmDialog, Dialog, EmptyState, Field, FilePick, LoadError, Loading, Menu, MenuItem, NativeSelect, Tabs, TextInput,
} from '../../../../components/hr/ui';
import EmployeeForm from '../../../../components/hr/people/EmployeeForm';
import { EmployeeStatusPill } from '../../../../components/hr/people/bits';
import {
  AssetsTab, AttendanceTab, DocumentsTab, LeaveTab, OverviewTab, PayTab, PerformanceTab,
} from '../../../../components/hr/people/ProfileTabs';

type Tab = 'overview' | 'documents' | 'leave' | 'attendance' | 'assets' | 'performance' | 'pay';

// staff.kadehub.com/employees/:id — one person with everything around them
export default function EmployeeProfilePage() {
  const { t } = useHrT();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = Number(params?.id);
  const { owner, branchName, refresh } = useHr();
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [failed, setFailed] = useState<'error' | 'missing' | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [dialog, setDialog] = useState<'edit' | 'pin' | 'end' | 'delete' | null>(null);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    setFailed(null);
    try {
      const { data } = await api.get<EmployeeProfile>(`/hr/employees/${id}`);
      setProfile(data);
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      setFailed(status === 404 || status === 403 ? 'missing' : 'error');
    }
  }, [id]);

  useEffect(() => { if (id) load(); }, [id, load]);

  if (failed === 'missing') {
    return <EmptyState title={t('emp.notFound')} action={<Link href={hrHref('/employees')} className="text-sm font-semibold underline">{t('emp.back')}</Link>} />;
  }
  if (failed) return <LoadError onRetry={load} />;
  if (!profile) return <Loading />;

  const e = profile.employee;
  const active = e.status === 'active';

  async function uploadPhoto(file: File) {
    setUploading(true);
    try {
      await postForm(`/hr/employees/${e.id}/photo`, {}, file);
      toast.success(t('emp.photoUpdated'));
      load();
    } catch (err) {
      toast.error(apiError(err, t));
    } finally {
      setUploading(false);
    }
  }

  async function reactivate() {
    try {
      await api.post(`/hr/employees/${e.id}/reactivate`);
      toast.success(t('emp.reactivated'));
      refresh();
      load();
    } catch (err) {
      toast.error(apiError(err, t));
    }
  }

  const tabs: Array<{ value: Tab; label: string }> = [
    { value: 'overview', label: t('emp.tab.overview') },
    { value: 'documents', label: t('emp.tab.documents') },
    { value: 'leave', label: t('emp.tab.leave') },
    { value: 'attendance', label: t('emp.tab.attendance') },
    { value: 'assets', label: t('emp.tab.assets') },
    { value: 'performance', label: t('emp.tab.performance') },
    ...(owner ? [{ value: 'pay' as Tab, label: t('emp.tab.pay') }] : []),
  ];
  const tabProps = { profile, reload: load };

  return (
    <div className="space-y-5">
      <Link href={hrHref('/employees')} className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-ink-800">
        <ArrowLeft size={15} /> {t('emp.back')}
      </Link>

      <div className="kh-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <FilePick accept="image/jpeg,image/png,image/webp" onPick={uploadPhoto} disabled={uploading}>
            <span className="group relative block" title={t('emp.photoChange')}>
              <Avatar name={e.full_name} src={e.photo_url} size={64} />
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-ink-900/40 text-white opacity-0 transition-opacity group-hover:opacity-100">
                <Camera size={18} />
              </span>
              <span className="sr-only">{t('emp.photoChange')}</span>
            </span>
          </FilePick>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-bold tracking-tight text-ink-900">{e.full_name}</h1>
              <EmployeeStatusPill status={e.status} />
            </div>
            <p className="text-sm text-ink-500">
              {[e.emp_code, e.job_title, branchName(e.branch_id), t(`emp.type.${e.employment_type}` as HrKey)].filter(Boolean).join(' · ')}
            </p>
            {e.leave_date && <p className="text-xs text-ink-400">{t('emp.leftOn', { date: formatDate(e.leave_date) })}</p>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {active ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setDialog('edit')}><Pencil /> {t('common.edit')}</Button>
              <Button variant="outline" size="sm" onClick={() => setDialog('pin')}><KeyRound /> {t('emp.setPin')}</Button>
            </>
          ) : (
            <Button size="sm" onClick={reactivate}><RotateCcw /> {t('emp.reactivate')}</Button>
          )}
          <Menu trigger={<MoreVertical />} label={t('common.actions')}>
            {close => (
              <>
                {!active && <MenuItem onClick={() => { close(); setDialog('edit'); }}><Pencil /> {t('common.edit')}</MenuItem>}
                {active && <MenuItem onClick={() => { close(); setDialog('end'); }}><UserMinus /> {t('emp.end')}</MenuItem>}
                {owner && <MenuItem danger onClick={() => { close(); setDialog('delete'); }}><Trash2 /> {t('emp.delete')}</MenuItem>}
              </>
            )}
          </Menu>
        </div>
      </div>

      <Tabs<Tab> value={tab} onChange={setTab} items={tabs} />
      {tab === 'overview' && <OverviewTab {...tabProps} />}
      {tab === 'documents' && <DocumentsTab {...tabProps} />}
      {tab === 'leave' && <LeaveTab {...tabProps} />}
      {tab === 'attendance' && <AttendanceTab {...tabProps} />}
      {tab === 'assets' && <AssetsTab {...tabProps} />}
      {tab === 'performance' && <PerformanceTab {...tabProps} />}
      {tab === 'pay' && owner && <PayTab {...tabProps} />}

      {dialog === 'edit' && (
        <EmployeeForm employee={e} open onClose={() => setDialog(null)} onSaved={() => { setDialog(null); load(); }} />
      )}
      {dialog === 'pin' && <PinDialog id={e.id} name={e.full_name} onClose={() => setDialog(null)} onSaved={() => { setDialog(null); load(); }} />}
      {dialog === 'end' && (
        <EndDialog profile={profile} onClose={() => setDialog(null)} onDone={() => { setDialog(null); refresh(); load(); }} />
      )}
      <ConfirmDialog open={dialog === 'delete'} onClose={() => setDialog(null)} title={t('emp.delete')}
        message={<>{t('emp.deleteBody', { name: e.full_name })} {t('common.cannotUndo')}</>} confirmLabel={t('common.delete')}
        onConfirm={async () => {
          try {
            await api.delete(`/hr/employees/${e.id}`);
            toast.success(t('emp.deleted'));
            refresh();
            router.replace(hrHref('/employees'));
          } catch (err) {
            toast.error(apiError(err, t));
          }
        }} />
    </div>
  );
}

function PinDialog({ id, name, onClose, onSaved }: { id: number; name: string; onClose: () => void; onSaved: () => void }) {
  const { t } = useHrT();
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{4}$/.test(pin)) { setError(t('emp.pinInvalid')); return; }
    setBusy(true);
    setError(undefined);
    try {
      await api.post(`/hr/employees/${id}/pin`, { pin });
      toast.success(t('emp.pinSaved'));
      onSaved();
    } catch (err) {
      setError(apiError(err, t));
      setBusy(false);
    }
  }

  return (
    <Dialog open onClose={() => !busy && onClose()} title={t('emp.setPinTitle', { name })} width="max-w-sm">
      <form onSubmit={submit} className="space-y-3">
        <Field label={t('emp.f.pin')} htmlFor="pin" hint={t('emp.f.pinHint')}>
          <TextInput id="pin" inputMode="numeric" autoComplete="off" maxLength={4} className="text-center text-lg tracking-[0.6em]"
            value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))} />
        </Field>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>{t('common.cancel')}</Button>
          <Button type="submit" disabled={busy}>{busy ? t('common.saving') : t('common.save')}</Button>
        </div>
      </form>
    </Dialog>
  );
}

function EndDialog({ profile, onClose, onDone }: { profile: EmployeeProfile; onClose: () => void; onDone: () => void }) {
  const { t } = useHrT();
  const e = profile.employee;
  const [status, setStatus] = useState<'resigned' | 'terminated'>('resigned');
  const [date, setDate] = useState(today());
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const holding = profile.assets.filter(a => a.outstanding);

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      await api.post(`/hr/employees/${e.id}/end`, { status, leave_date: date, reason });
      toast.success(t('emp.endDone'));
      onDone();
    } catch (err) {
      setError(apiError(err, t));
      setBusy(false);
    }
  }

  return (
    <Dialog open onClose={() => !busy && onClose()} title={t('emp.endTitle', { name: e.full_name })} width="max-w-md">
      <form onSubmit={submit} className="space-y-3">
        {holding.length > 0 && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {t('emp.endAssets', { n: holding.length, items: holding.map(a => a.asset_name).join(', ') })}
          </p>
        )}
        <Field label={t('emp.endStatus')} htmlFor="end-status">
          <NativeSelect id="end-status" value={status} onChange={ev => setStatus(ev.target.value as 'resigned' | 'terminated')}>
            <option value="resigned">{t('emp.endResigned')}</option>
            <option value="terminated">{t('emp.endTerminated')}</option>
          </NativeSelect>
        </Field>
        <Field label={t('emp.endDate')} htmlFor="end-date">
          <TextInput id="end-date" type="date" required value={date} min={e.join_date ?? undefined} onChange={ev => setDate(ev.target.value)} />
        </Field>
        <Field label={t('emp.endReason')} htmlFor="end-reason">
          <TextInput id="end-reason" maxLength={300} value={reason} onChange={ev => setReason(ev.target.value)} />
        </Field>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>{t('common.cancel')}</Button>
          <Button type="submit" variant="danger" disabled={busy}>{busy ? t('common.saving') : t('emp.end')}</Button>
        </div>
      </form>
    </Dialog>
  );
}
