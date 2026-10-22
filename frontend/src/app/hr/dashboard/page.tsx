'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  UserPlus, MonitorSmartphone, CalendarDays, Wallet, Plane, Repeat, Briefcase, Cake, PartyPopper, ArrowRight, KeyRound,
} from 'lucide-react';
import { MascotScene } from '../../../components/brand/Mascot';
import { hrHref, useHr } from '../../../components/hr/HrContext';
import { Avatar, Card, Kpi, Loading, LoadError, PageHeader, Pill, btnClass, cn } from '../../../components/hr/ui';
import api from '../../../lib/api';
import { useHrT, type HrKey } from '../../../lib/hr/i18n';
import { formatDate, formatLKR, formatMinutes, formatPeriod, formatShift } from '../../../lib/hr/format';
import type { Dashboard, RunStatus } from '../../../lib/hr/types';

const RUN_TONE: Record<RunStatus, 'amber' | 'blue' | 'green'> = { draft: 'amber', finalized: 'blue', paid: 'green' };

// staff.kadehub.com/dashboard — today at a glance and what's waiting for a decision
export default function HrDashboardPage() {
  const { t } = useHrT();
  const { me, owner, branch } = useHr();
  const [data, setData] = useState<Dashboard | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    setFailed(false);
    api.get<Dashboard>('/hr/dashboard', { params: branch ? { branch_id: branch } : {} })
      .then(r => setData(r.data))
      .catch(() => setFailed(true));
  }, [branch]);
  useEffect(() => { load(); }, [load]);

  const firstName = (me.name ?? '').split(' ')[0] || me.name || '';

  if (failed) return <LoadError onRetry={load} />;
  if (!data) return <Loading />;

  const header = <PageHeader title={t('dash.hello', { name: firstName })} subtitle={formatDate(data.date)} />;

  if (data.employees === 0) {
    return (
      <div className="space-y-6">
        {header}
        <Welcome />
      </div>
    );
  }

  const { today } = data;
  const attention: Array<{ n: number; key: HrKey; href: string; icon: typeof Plane }> = [
    { n: data.pending.leave, key: 'dash.attnLeave', href: '/leave', icon: Plane },
    { n: data.pending.swaps, key: 'dash.attnSwaps', href: '/roster', icon: Repeat },
    { n: data.pending.new_applicants, key: 'dash.attnApplicants', href: '/hiring', icon: Briefcase },
  ];
  const waiting = attention.filter(a => a.n > 0);
  const soon = (n: number) => (n === 0 ? t('common.today') : n === 1 ? t('dash.tomorrow') : t('dash.inDays', { n }));

  return (
    <div className="space-y-6">
      {header}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Kpi label={t('dash.kpiStaff')} value={String(data.employees)} />
        <Kpi label={t('dash.kpiIn')} value={String(today.present)} />
        <Kpi label={t('dash.kpiLate')} value={String(today.late)} tone={today.late ? 'danger' : undefined} />
        <Kpi label={t('dash.kpiAbsent')} value={String(today.absent)} tone={today.absent ? 'danger' : undefined} />
        <Kpi label={t('dash.kpiLeave')} value={String(today.leave)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title={t('dash.notIn')} action={<Link href={hrHref('/attendance')} className="text-xs font-semibold text-ink-500 hover:text-ink-800">{t('nav.attendance')}</Link>}>
          {data.not_in.length ? (
            <ul className="divide-y divide-ink-100">
              {data.not_in.map(p => (
                <PersonRow key={p.id} id={p.id} name={p.full_name} photo={p.photo_url}
                  right={<span className="text-xs text-ink-500">{p.shift ? formatShift(p.shift.start_time, p.shift.end_time) : t('dash.noShift')}</span>} />
              ))}
            </ul>
          ) : <Muted>{t('dash.notInEmpty')}</Muted>}
        </Card>

        <Card title={t('dash.lateToday')}>
          {data.late.length ? (
            <ul className="divide-y divide-ink-100">
              {data.late.map(p => (
                <PersonRow key={p.id} id={p.id} name={p.full_name} photo={p.photo_url}
                  right={<Pill tone="red">{t('dash.lateBy', { min: formatMinutes(p.late_minutes) })}</Pill>} />
              ))}
            </ul>
          ) : <Muted>{t('dash.lateEmpty')}</Muted>}
        </Card>

        <Card title={t('dash.onLeaveToday')}>
          {data.on_leave.length ? (
            <ul className="divide-y divide-ink-100">
              {data.on_leave.map(p => (
                <PersonRow key={p.id} id={p.id} name={p.full_name} photo={p.photo_url}
                  right={p.leave ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-ink-600">
                      <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: p.leave.color }} />
                      {p.leave.type}{p.leave.half ? ` · ${t('dash.halfDay')}` : ''}
                    </span>
                  ) : null} />
              ))}
            </ul>
          ) : <Muted>{t('dash.leaveEmpty')}</Muted>}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title={t('dash.attention')}>
          {waiting.length ? (
            <ul className="space-y-1">
              {waiting.map(a => (
                <li key={a.key}>
                  <Link href={hrHref(a.href)} className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-ink-50">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink-100 text-ink-600"><a.icon size={17} /></span>
                    <span className="flex-1 text-sm font-medium text-ink-700">{t(a.key)}</span>
                    <span className="rounded-full bg-[color:var(--cod-primary)] px-2 py-0.5 text-xs font-bold text-[color:var(--cod-primary-fg)]">{a.n}</span>
                    <ArrowRight size={15} className="text-ink-400" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : <Muted>{t('dash.attnNone')}</Muted>}
          <div className="mt-3 flex flex-wrap gap-2 border-t border-ink-100 pt-3 text-xs text-ink-500">
            <span>{data.open_jobs} {t('dash.openJobs')}</span>
            <span aria-hidden>·</span>
            <span>{data.assets_out} {t('dash.assetsOut')}</span>
          </div>
        </Card>

        <Card title={t('dash.celebrations')}>
          {data.birthdays.length || data.anniversaries.length ? (
            <ul className="divide-y divide-ink-100">
              {data.birthdays.map(b => (
                <PersonRow key={`b${b.id}`} id={b.id} name={b.full_name} photo={b.photo_url}
                  sub={<span className="inline-flex items-center gap-1"><Cake size={12} /> {t('dash.birthday')}</span>}
                  right={<span className="text-xs font-semibold text-ink-600">{soon(b.in_days)}</span>} />
              ))}
              {data.anniversaries.map(a => (
                <PersonRow key={`a${a.id}`} id={a.id} name={a.full_name}
                  sub={<span className="inline-flex items-center gap-1"><PartyPopper size={12} /> {a.years === 1 ? t('dash.anniversaryOne') : t('dash.anniversary', { n: a.years })}</span>}
                  right={<span className="text-xs font-semibold text-ink-600">{soon(a.in_days)}</span>} />
              ))}
            </ul>
          ) : <Muted>{t('dash.celebrationsEmpty')}</Muted>}
        </Card>

        <div className="space-y-4">
          {owner && (
            <Card title={t('dash.lastRun')}>
              {data.last_run ? (
                <Link href={hrHref(`/payroll/${data.last_run.id}`)} className="flex items-center justify-between gap-3 rounded-xl p-1 hover:bg-ink-50">
                  <span>
                    <span className="block text-sm font-semibold text-ink-800">{formatPeriod(data.last_run.period)}</span>
                    <span className="mt-0.5 block text-lg font-bold text-ink-900">{formatLKR(data.last_run.total_net)}</span>
                  </span>
                  <Pill tone={RUN_TONE[data.last_run.status]}>{t(`pay.status.${data.last_run.status}` as HrKey)}</Pill>
                </Link>
              ) : <Muted>{t('dash.noRun')}</Muted>}
            </Card>
          )}
          <Card title={t('dash.quick')}>
            <div className="grid grid-cols-2 gap-2">
              <QuickLink href="/employees" icon={UserPlus} label={t('dash.qAddEmployee')} />
              <QuickLink href="/kiosk" icon={MonitorSmartphone} label={t('dash.qKiosk')} />
              <QuickLink href="/roster" icon={CalendarDays} label={t('dash.qRoster')} />
              {owner && <QuickLink href="/payroll" icon={Wallet} label={t('dash.qPayroll')} />}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return <p className="py-2 text-sm text-ink-400">{children}</p>;
}

function PersonRow({ id, name, photo, sub, right }: { id: number; name: string; photo?: string | null; sub?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <li>
      <Link href={hrHref(`/employees/${id}`)} className="flex items-center gap-3 py-2 hover:opacity-80">
        <Avatar name={name} src={photo} size={32} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-ink-800">{name}</span>
          {sub && <span className="block text-xs text-ink-400">{sub}</span>}
        </span>
        {right}
      </Link>
    </li>
  );
}

function QuickLink({ href, icon: Icon, label }: { href: string; icon: typeof UserPlus; label: string }) {
  // The kiosk is a full-screen page outside the shell, so it gets a plain link
  const cls = 'flex min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-xl border border-ink-200 px-2 text-center text-xs font-semibold text-ink-700 hover:bg-ink-50';
  return href === '/kiosk'
    ? <a href={hrHref(href)} className={cls}><Icon size={18} /> {label}</a>
    : <Link href={hrHref(href)} className={cls}><Icon size={18} /> {label}</Link>;
}

/** First run: no employees yet. */
function Welcome() {
  const { t } = useHrT();
  const steps: Array<{ icon: typeof UserPlus; title: HrKey; body: HrKey; href: string; cta: HrKey }> = [
    { icon: UserPlus, title: 'dash.step1Title', body: 'dash.step1Body', href: '/employees', cta: 'dash.qAddEmployee' },
    { icon: KeyRound, title: 'dash.step2Title', body: 'dash.step2Body', href: '/kiosk', cta: 'dash.qKiosk' },
    { icon: CalendarDays, title: 'dash.step3Title', body: 'dash.step3Body', href: '/roster', cta: 'dash.qRoster' },
  ];
  return (
    <div className="kh-card grid gap-6 p-6 md:grid-cols-[auto_1fr] md:items-center">
      <div className="flex justify-center"><MascotScene scene="grow" size="md" animation="enter" decorative /></div>
      <div>
        <h2 className="text-lg font-bold text-ink-900">{t('dash.welcomeTitle')}</h2>
        <p className="mt-1 text-sm text-ink-500">{t('dash.welcomeBody')}</p>
        <ol className="mt-5 space-y-3">
          {steps.map((s, i) => (
            <li key={s.title} className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color:var(--cod-primary)] text-sm font-bold text-[color:var(--cod-primary-fg)]">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink-800">{t(s.title)}</p>
                <p className="text-xs text-ink-500">{t(s.body)}</p>
              </div>
              {i === 0
                ? <Link href={hrHref(s.href)} className={cn(btnClass('primary', 'sm'), 'shrink-0')}>{t(s.cta)}</Link>
                : <a href={hrHref(s.href)} className={cn(btnClass('outline', 'sm'), 'shrink-0')}>{t(s.cta)}</a>}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
