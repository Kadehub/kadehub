'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, Expand, MapPin } from 'lucide-react';
import api from '../../../lib/api';
import { apiError } from '../../../lib/hr/api';
import { useHrT, type HrKey } from '../../../lib/hr/i18n';
import { formatDate, formatMinutes, formatShift, formatTime, localTime, today, weekday } from '../../../lib/hr/format';
import type { KioskSession, KioskStaff } from '../../../lib/hr/types';
import { hrHref, useHr } from '../../../components/hr/HrContext';
import { Avatar, Button, EmptyState, LoadError, Loading, SearchInput, cn } from '../../../components/hr/ui';
import LanguageSwitcher from '../../../components/ui/LanguageSwitcher';
import PinPad from '../../../components/hr/time/kiosk/PinPad';
import KioskSessionView, { type PunchResult } from '../../../components/hr/time/kiosk/KioskSessionView';
import { useApi } from '../../../components/hr/time/shared';

const BRANCH_KEY = 'hr_kiosk_branch';
/** The employee screen closes itself after this long without a touch. */
const IDLE_MS = 45_000;

type Mode =
  | { kind: 'tiles' }
  | { kind: 'pin'; staff: KioskStaff }
  | { kind: 'session'; session: KioskSession; pin: string }
  | { kind: 'done'; result: PunchResult };

function readBranch(): number | null {
  try { const v = localStorage.getItem(BRANCH_KEY); return v ? Number(v) : null; } catch { return null; }
}

// staff.kadehub.com/kiosk — the shop's shared tablet: tap your name, enter your PIN, clock in or out
export default function KioskPage() {
  const { t } = useHrT();
  const { me, branches } = useHr();
  const [branchId, setBranchId] = useState<number | null>(null);
  const [mode, setMode] = useState<Mode>({ kind: 'tiles' });
  const [verifying, setVerifying] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [now, setNow] = useState(() => new Date());
  const lastTouch = useRef(Date.now());

  useEffect(() => {
    const saved = readBranch();
    setBranchId(saved && branches.some(b => b.id === saved) ? saved : branches.length === 1 ? branches[0].id : null);
  }, [branches]);

  const chooseBranch = (id: number | null) => {
    setBranchId(id);
    setMode({ kind: 'tiles' });
    try { if (id) localStorage.setItem(BRANCH_KEY, String(id)); else localStorage.removeItem(BRANCH_KEY); } catch {}
  };

  const staff = useApi<KioskStaff[]>(branchId ? '/hr/kiosk/staff' : null, { branch_id: branchId });
  const reloadStaff = staff.reload;

  // Clock, a staff refresh every minute, and the idle check
  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 10_000);
    const refresh = setInterval(() => reloadStaff(), 60_000);
    return () => { clearInterval(tick); clearInterval(refresh); };
  }, [reloadStaff]);

  useEffect(() => {
    const touch = () => { lastTouch.current = Date.now(); };
    window.addEventListener('pointerdown', touch);
    window.addEventListener('keydown', touch);
    return () => { window.removeEventListener('pointerdown', touch); window.removeEventListener('keydown', touch); };
  }, []);

  useEffect(() => {
    if (mode.kind === 'tiles') return;
    lastTouch.current = Date.now();
    if (mode.kind === 'done') {
      const id = setTimeout(() => setMode({ kind: 'tiles' }), 6000);
      return () => clearTimeout(id);
    }
    const id = setInterval(() => { if (Date.now() - lastTouch.current > IDLE_MS) setMode({ kind: 'tiles' }); }, 3000);
    return () => clearInterval(id);
  }, [mode.kind]);

  const verify = useCallback(async (employeeId: number, pin: string) => {
    const { data } = await api.post<KioskSession>('/hr/kiosk/verify', { employee_id: employeeId, pin });
    return data;
  }, []);

  async function submitPin(pin: string) {
    if (mode.kind !== 'pin') return;
    setVerifying(true);
    setPinError(null);
    try {
      const session = await verify(mode.staff.id, pin);
      setMode({ kind: 'session', session, pin });
    } catch (err) {
      setPinError(apiError(err, t));
    } finally {
      setVerifying(false);
    }
  }

  async function refreshSession() {
    if (mode.kind !== 'session') return;
    try {
      const session = await verify(mode.session.employee.id, mode.pin);
      setMode({ kind: 'session', session, pin: mode.pin });
    } catch {
      setMode({ kind: 'tiles' });
    }
  }

  const s = me.settings;
  const time = formatTime(localTime(now.toISOString()));
  const date = today();
  const list = (staff.data ?? []).filter(x => !search.trim() || x.full_name.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-ink-50 to-white" style={{ backgroundImage: 'linear-gradient(180deg, color-mix(in srgb, var(--cod-primary) 10%, white), #fff 40%)' }}>
      <header className="flex items-center justify-between gap-3 px-4 py-3 sm:px-8 sm:py-5">
        <div className="flex min-w-0 items-center gap-3">
          {s.logo_url
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={s.logo_url} alt="" className="h-10 w-10 shrink-0 rounded-xl object-contain" />
            : <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color:var(--cod-primary)] text-lg font-extrabold text-[color:var(--cod-primary-fg)]">{(s.business_name || 'S').slice(0, 1)}</span>}
          <div className="min-w-0">
            <p className="truncate text-base font-bold text-ink-900">{s.business_name}</p>
            {branchId && (
              <button type="button" onClick={() => branches.length > 1 && chooseBranch(null)} disabled={branches.length <= 1}
                className="flex items-center gap-1 text-xs text-ink-500 enabled:hover:text-ink-800">
                <MapPin size={12} /> {branches.find(b => b.id === branchId)?.name}{branches.length > 1 && ` · ${t('ksk.changeBranch')}`}
              </button>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-3xl font-extrabold tabular-nums text-ink-900 sm:text-4xl">{time}</p>
          <p className="text-xs text-ink-500 sm:text-sm">{t(`weekday.${weekday(date)}` as HrKey)}, {formatDate(date)}</p>
        </div>
      </header>

      <main className="flex flex-1 flex-col px-4 pb-6 sm:px-8">
        {!branchId ? (
          <div className="mx-auto w-full max-w-lg py-8">
            {branches.length ? (
              <>
                <p className="mb-4 text-center text-lg font-bold text-ink-800">{t('ksk.pickBranch')}</p>
                <div className="grid gap-3">
                  {branches.map(b => (
                    <button key={b.id} type="button" onClick={() => chooseBranch(b.id)}
                      className="flex h-16 items-center gap-3 rounded-2xl bg-white px-5 text-left text-lg font-semibold text-ink-800 shadow-sm ring-1 ring-ink-200 active:scale-[.99]">
                      <MapPin className="text-[color:var(--cod-primary)]" /> {b.name}
                    </button>
                  ))}
                </div>
              </>
            ) : <EmptyState title={t('ros.noBranches')} />}
          </div>
        ) : mode.kind === 'pin' ? (
          <div className="mx-auto flex w-full max-w-sm flex-col items-center py-4">
            <button type="button" onClick={() => setMode({ kind: 'tiles' })} className="mb-4 flex items-center gap-1.5 self-start text-sm font-semibold text-ink-500">
              <ArrowLeft size={16} /> {t('common.back')}
            </button>
            <Avatar name={mode.staff.full_name} src={mode.staff.photo_url} size={88} />
            <p className="mb-5 mt-3 text-2xl font-extrabold text-ink-900">{mode.staff.full_name}</p>
            {!mode.staff.has_pin && <p className="mb-3 text-center text-sm font-semibold text-amber-700">{t('err.PIN_NOT_SET')}</p>}
            <PinPad busy={verifying} error={pinError} onSubmit={submitPin} />
          </div>
        ) : mode.kind === 'session' ? (
          <KioskSessionView session={mode.session} pin={mode.pin} branchId={branchId}
            onRefresh={refreshSession} onDone={() => setMode({ kind: 'tiles' })}
            onPunched={r => { setMode({ kind: 'done', result: r }); reloadStaff(); }} />
        ) : mode.kind === 'done' ? (
          <button type="button" onClick={() => setMode({ kind: 'tiles' })} className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-4 text-center">
            <CheckCircle2 size={96} className={mode.result.action === 'in' ? 'text-emerald-600' : 'text-[color:var(--cod-primary)]'} />
            <p className="text-3xl font-extrabold text-ink-900">
              {mode.result.action === 'in' ? t('ksk.done.inTitle', { name: mode.result.name.split(' ')[0] }) : t('ksk.done.outTitle', { name: mode.result.name.split(' ')[0] })}
            </p>
            <p className="text-lg text-ink-600">
              {mode.result.action === 'in'
                ? t('ksk.done.inAt', { time: formatTime(localTime(mode.result.at)) })
                : t('ksk.done.outAt', { time: formatTime(localTime(mode.result.at)), worked: formatMinutes(mode.result.worked_minutes) })}
            </p>
            {mode.result.action === 'in' && mode.result.late_minutes > 0 && (
              <p className="rounded-full bg-amber-100 px-4 py-1.5 text-sm font-semibold text-amber-800">{t('ksk.done.late', { m: mode.result.late_minutes })}</p>
            )}
          </button>
        ) : (
          <>
            {(staff.data?.length ?? 0) > 12 && (
              <div className="mx-auto mb-4 w-full max-w-md"><SearchInput value={search} onChange={setSearch} placeholder={t('ksk.search')} /></div>
            )}
            <p className="mb-4 text-center text-lg font-semibold text-ink-700">{t('ksk.tapName')}</p>
            {staff.error ? <LoadError onRetry={staff.reload} /> : !staff.data ? <Loading /> : !list.length ? (
              <EmptyState title={t('ksk.noStaff')} description={t('ksk.noStaffBody')} />
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {list.map(x => (
                  <button key={x.id} type="button" onClick={() => { setPinError(null); setMode({ kind: 'pin', staff: x }); }}
                    className="flex flex-col items-center gap-2 rounded-3xl bg-white p-4 text-center shadow-sm ring-1 ring-ink-200 transition-transform active:scale-95">
                    <span className="relative">
                      <Avatar name={x.full_name} src={x.photo_url} size={72} />
                      <span className={cn('absolute bottom-0.5 right-0.5 h-4 w-4 rounded-full ring-2 ring-white', x.clocked_in ? 'bg-emerald-500' : 'bg-ink-300')} />
                    </span>
                    <span className="line-clamp-2 text-base font-bold text-ink-900">{x.full_name}</span>
                    <span className={cn('text-xs font-semibold', x.clocked_in ? 'text-emerald-700' : 'text-ink-400')}>
                      {x.clocked_in ? t('ksk.tile.in') : x.shift ? formatShift(x.shift.start_time, x.shift.end_time) : t('ksk.tile.out')}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 px-4 py-3 text-xs text-ink-400 sm:px-8">
        <a href={hrHref('/dashboard')} className="font-semibold hover:text-ink-700">{t('ksk.exit')}</a>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Button variant="ghost" size="sm" onClick={() => document.documentElement.requestFullscreen?.().catch(() => {})}>
            <Expand /> {t('ksk.fullscreen')}
          </Button>
        </div>
      </footer>
    </div>
  );
}
