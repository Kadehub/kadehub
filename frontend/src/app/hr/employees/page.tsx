'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, KeyRound } from 'lucide-react';
import api from '../../../lib/api';
import { useHrT, type HrKey } from '../../../lib/hr/i18n';
import { formatDate } from '../../../lib/hr/format';
import type { Employee } from '../../../lib/hr/types';
import { hrHref, useHr } from '../../../components/hr/HrContext';
import {
  Button, EmptyState, ExportButton, LoadError, Loading, NativeSelect, PageHeader, PersonCell, Pill, SearchInput, tbl, cn,
} from '../../../components/hr/ui';
import EmployeeForm from '../../../components/hr/people/EmployeeForm';
import { EmployeeStatusPill } from '../../../components/hr/people/bits';

type StatusFilter = 'active' | 'left' | 'all';

// staff.kadehub.com/employees — everyone in the selected branch (or every branch the user sees)
export default function EmployeesPage() {
  const { t } = useHrT();
  const router = useRouter();
  const { branch, branchName, refresh } = useHr();
  const [rows, setRows] = useState<Employee[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('active');
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setFailed(false);
    try {
      const { data } = await api.get<Employee[]>('/hr/employees', {
        params: { status: status === 'left' ? 'all' : status, ...(branch ? { branch_id: branch } : {}), ...(search.trim() ? { q: search.trim() } : {}) },
      });
      setRows(status === 'left' ? data.filter(e => e.status !== 'active') : data);
    } catch {
      setFailed(true);
    }
  }, [branch, status, search]);

  // Search waits for a short pause in typing
  useEffect(() => {
    const id = setTimeout(load, search ? 250 : 0);
    return () => clearTimeout(id);
  }, [load, search]);

  const header = [t('emp.f.code'), t('emp.f.fullName'), t('emp.col.job'), t('emp.col.branch'), t('common.phone'), t('emp.col.joined'), t('common.status')];
  const exportRows = (rows ?? []).map(e => [e.emp_code, e.full_name, e.job_title, branchName(e.branch_id), e.phone, e.join_date ?? '', t(`emp.status.${e.status}` as HrKey)]);
  const filtered = !!search.trim() || status !== 'active';

  return (
    <div className="space-y-5">
      <PageHeader title={t('emp.title')} subtitle={t('emp.subtitle')}
        actions={<>
          <ExportButton filename="employees" header={header} rows={exportRows} />
          <Button onClick={() => setAdding(true)}><Plus /> {t('emp.add')}</Button>
        </>} />

      <div className="flex flex-col gap-2 sm:flex-row">
        <SearchInput value={search} onChange={setSearch} placeholder={t('emp.searchPh')} />
        <NativeSelect aria-label={t('common.status')} value={status} className="sm:w-44" onChange={e => setStatus(e.target.value as StatusFilter)}>
          {(['active', 'left', 'all'] as const).map(s => <option key={s} value={s}>{t(`emp.filter.${s}` as HrKey)}</option>)}
        </NativeSelect>
      </div>

      {failed ? <LoadError onRetry={load} /> : rows === null ? <Loading /> : rows.length === 0 ? (
        filtered
          ? <EmptyState title={t('emp.emptyFiltered')} scene="relax" />
          : <EmptyState title={t('emp.emptyTitle')} description={t('emp.emptyBody')} scene="grow"
              action={<Button onClick={() => setAdding(true)}><Plus /> {t('emp.add')}</Button>} />
      ) : (
        <>
          <p className="text-xs text-ink-400">{t('emp.count', { n: rows.length })}</p>
          {/* Phones: one card per person */}
          <ul className="space-y-2 md:hidden">
            {rows.map(e => (
              <li key={e.id}>
                <Link href={hrHref(`/employees/${e.id}`)} className="kh-card flex items-center justify-between gap-3 p-3">
                  <PersonCell name={e.full_name} src={e.photo_url} sub={[e.emp_code, e.job_title].filter(Boolean).join(' · ')} />
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <EmployeeStatusPill status={e.status} />
                    {e.status === 'active' && e.has_pin === false && <Pill tone="amber"><KeyRound size={10} /> {t('emp.pinMissing')}</Pill>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <div className={cn(tbl.wrap, 'hidden md:block')}>
            <table className={tbl.table}>
              <thead>
                <tr>
                  <th className={tbl.th}>{t('common.employee')}</th>
                  <th className={tbl.th}>{t('emp.col.job')}</th>
                  <th className={tbl.th}>{t('emp.col.branch')}</th>
                  <th className={tbl.th}>{t('common.phone')}</th>
                  <th className={tbl.th}>{t('emp.col.pin')}</th>
                  <th className={tbl.th}>{t('common.status')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(e => (
                  <tr key={e.id} className="cursor-pointer hover:bg-ink-50/60" onClick={() => router.push(hrHref(`/employees/${e.id}`))}>
                    <td className={tbl.td}>
                      <Link href={hrHref(`/employees/${e.id}`)} onClick={ev => ev.stopPropagation()}>
                        <PersonCell name={e.full_name} src={e.photo_url} sub={e.emp_code} />
                      </Link>
                    </td>
                    <td className={tbl.td}>{e.job_title || '—'}</td>
                    <td className={tbl.td}>{branchName(e.branch_id) || '—'}</td>
                    <td className={tbl.td}>{e.phone || '—'}</td>
                    <td className={tbl.td}>
                      {e.has_pin ? <Pill tone="green">{t('emp.pinSet')}</Pill> : <Pill tone="amber">{t('emp.pinMissing')}</Pill>}
                    </td>
                    <td className={tbl.td}>
                      <div className="flex flex-col items-start gap-0.5">
                        <EmployeeStatusPill status={e.status} />
                        {e.leave_date && <span className="text-2xs text-ink-400">{t('emp.leftOn', { date: formatDate(e.leave_date) })}</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {adding && (
        <EmployeeForm employee={null} open onClose={() => setAdding(false)}
          onSaved={e => { setAdding(false); refresh(); router.push(hrHref(`/employees/${e.id}`)); }} />
      )}
    </div>
  );
}
