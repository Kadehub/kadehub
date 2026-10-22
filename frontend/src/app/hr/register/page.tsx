'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { MascotScene, MascotState } from '../../../components/brand/Mascot';
import { hrHref } from '../../../components/hr/HrContext';
import { Button, Field, TextInput, btnClass, cn } from '../../../components/hr/ui';
import KadeHubLogo from '../../../components/ui/KadeHubLogo';
import LanguageSwitcher from '../../../components/ui/LanguageSwitcher';
import { useAuthHydrated, useAuthStore } from '../../../hooks/useAuth';
import api from '../../../lib/api';
import { apiError } from '../../../lib/hr/api';
import { useHrT, type HrKey } from '../../../lib/hr/i18n';
import type { HrMe } from '../../../lib/hr/types';

/** Monday first, the way people read a week; values are JS weekdays (0 = Sunday). */
const WEEK = [1, 2, 3, 4, 5, 6, 0];

/**
 * staff.kadehub.com/register
 *  - signed out: business details, then a new KadeHub account
 *  - signed in without Staff: "Turn on KadeHub Staff", then the business details
 *  - signed in with Staff but not set up yet: the business details only
 */
export default function StaffRegisterPage() {
  const { t } = useHrT();
  const router = useRouter();
  const hydrated = useAuthHydrated();
  const token = useAuthStore(s => s.token);
  const [mode, setMode] = useState<'checking' | 'new' | 'enable' | 'setup' | 'done'>('checking');
  const [me, setMe] = useState<HrMe | null>(null);

  useEffect(() => {
    if (!hydrated || mode !== 'checking') return;
    if (!token) { setMode('new'); return; }
    api.get<HrMe>('/hr/me')
      .then(({ data }) => {
        setMe(data);
        if (data.enabled && data.setup_done) router.replace(hrHref('/dashboard'));
        else setMode(data.enabled ? 'setup' : 'enable');
      })
      .catch(() => setMode('new'));
  }, [hydrated, token, mode, router]);

  return (
    <div className="relative flex min-h-screen items-start justify-center bg-ink-50 px-4 py-10 sm:items-center">
      <div className="absolute right-4 top-4"><LanguageSwitcher /></div>
      <div className="w-full max-w-xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <a href={hrHref('/')} aria-label="KadeHub Staff"><KadeHubLogo width={130} theme="color" /></a>
          <a href={hrHref('/')} className="mt-2 text-sm font-semibold text-ink-700 hover:underline">{t('app.name')}</a>
          <p className="text-sm text-ink-500">{t('app.tagline')}</p>
        </div>
        {mode === 'checking' && <MascotState variant="loading" size="sm" title={t('app.loading')} />}
        {mode === 'enable' && <EnableStaff onEnabled={() => setMode('setup')} />}
        {(mode === 'new' || mode === 'setup') && (
          <Wizard hasSession={mode === 'setup'} defaultName={me?.name ?? ''} onDone={() => setMode('done')} />
        )}
        {mode === 'done' && (
          <div className="kh-card p-6">
            <MascotState variant="success" size="lg" title={t('reg.successTitle')} description={t('reg.successBody')}
              action={<a href={hrHref('/dashboard')} className={btnClass('primary')}>{t('reg.openDashboard')} <ArrowRight /></a>} />
          </div>
        )}
      </div>
    </div>
  );
}

function EnableStaff({ onEnabled }: { onEnabled: () => void }) {
  const { t } = useHrT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function enable() {
    setBusy(true);
    setError(undefined);
    try {
      await api.post('/platform/enable/hr');
      onEnabled();
    } catch (err) {
      setError((err as { response?: { status?: number } })?.response?.status === 403 ? t('reg.adminOnly') : apiError(err, t));
      setBusy(false);
    }
  }

  return (
    <div className="kh-card p-6">
      <MascotState variant="empty" size="md" scene="grow" title={t('reg.enableTitle')} description={t('reg.enableBody')}
        action={<div className="flex flex-col items-center gap-2">
          <Button onClick={enable} disabled={busy}>{busy ? t('reg.enabling') : t('reg.enableCta')}</Button>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        </div>} />
    </div>
  );
}

function Wizard({ hasSession, defaultName, onDone }: { hasSession: boolean; defaultName: string; onDone: () => void }) {
  const { t } = useHrT();
  const setAuth = useAuthStore(s => s.setAuth);
  const [step, setStep] = useState(0);
  const [values, setValues] = useState({
    business_name: '', phone: '', address: '', branch_name: '', full_name: defaultName, email: '', password: '',
  });
  const [offDays, setOffDays] = useState<number[]>([0]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ text: string; signIn?: boolean }>();
  // Set once the account exists, so a retry after a failed set-up doesn't sign up twice
  const [accountCreated, setAccountCreated] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const steps: HrKey[] = hasSession ? ['reg.stepBusiness'] : ['reg.stepBusiness', 'reg.stepAccount'];
  const last = steps.length - 1;
  const field = (name: keyof typeof values) => ({
    name, value: values[name], onChange: (e: React.ChangeEvent<HTMLInputElement>) => setValues(v => ({ ...v, [name]: e.target.value })),
  });
  const toggleDay = (d: number) => setOffDays(cur => (cur.includes(d) ? cur.filter(x => x !== d) : [...cur, d]));

  function goNext() {
    const inputs = formRef.current?.querySelectorAll<HTMLInputElement>(`[data-step="${step}"] input:not([type=hidden]):not([type=checkbox])`) ?? [];
    for (const el of Array.from(inputs)) if (!el.reportValidity()) return;
    setStep(s => Math.min(s + 1, last));
  }

  async function submit() {
    if (!values.business_name.trim()) { setError({ text: t('reg.businessRequired') }); setStep(0); return; }
    setPending(true);
    setError(undefined);
    try {
      if (!hasSession && !accountCreated) {
        const { data } = await api.post('/auth/register-account', {
          product: 'hr',
          name: values.full_name.trim() || values.business_name.trim(),
          email: values.email.trim(),
          password: values.password,
          businessName: values.business_name.trim(),
        });
        setAuth(data.user, data.access_token);
        setAccountCreated(true);
      }
      await api.post('/hr/setup', {
        business_name: values.business_name.trim(),
        phone: values.phone.trim(),
        address: values.address.trim(),
        branch_name: values.branch_name.trim() || undefined,
        weekly_off_days: [...offDays].sort().join(','),
      });
      onDone();
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      setError(status === 409 && !accountCreated ? { text: t('reg.emailTaken'), signIn: true } : { text: apiError(err, t) });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="kh-card space-y-6 p-6">
      {steps.length > 1 && (
        <ol className="flex gap-2" aria-label={t('reg.progress')}>
          {steps.map((key, i) => (
            <li key={key} className="flex-1" aria-current={i === step ? 'step' : undefined}>
              <div className={cn('h-1.5 rounded-full transition-colors', i <= step ? 'bg-[color:var(--cod-primary)]' : 'bg-ink-200')} />
              <p className={cn('mt-1.5 text-xs', i === step ? 'font-semibold text-ink-900' : 'text-ink-500')}>{i + 1}. {t(key)}</p>
            </li>
          ))}
        </ol>
      )}

      <form ref={formRef} className="space-y-6" onSubmit={e => {
        e.preventDefault();
        // Enter inside a step moves on instead of submitting half a form
        if (step < last) goNext(); else submit();
      }}>
        <div data-step={0} hidden={step !== 0} className="space-y-4">
          <div className="flex items-center gap-4">
            <MascotScene scene="work" size="sm" animation="enter" decorative priority className="hidden sm:block" />
            <div>
              <h2 className="text-lg font-bold tracking-tight text-ink-900">{hasSession ? t('reg.detailsTitleSession') : t('reg.detailsTitle')}</h2>
              <p className="text-sm text-ink-500">{t('reg.detailsHelp')}</p>
            </div>
          </div>
          <Field label={t('reg.businessName')} htmlFor="business_name">
            <TextInput id="business_name" {...field('business_name')} required maxLength={150} autoComplete="organization" />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t('reg.phone')} htmlFor="phone">
              <TextInput id="phone" {...field('phone')} type="tel" inputMode="tel" placeholder="077 123 4567" maxLength={40} autoComplete="tel" />
            </Field>
            <Field label={t('reg.branchName')} htmlFor="branch_name" hint={t('reg.branchHelp')}>
              <TextInput id="branch_name" {...field('branch_name')} placeholder={t('reg.branchPlaceholder')} maxLength={120} />
            </Field>
          </div>
          <Field label={t('reg.addressOptional')} htmlFor="address">
            <TextInput id="address" {...field('address')} maxLength={300} autoComplete="street-address" />
          </Field>
          <fieldset className="space-y-1.5">
            <legend className="text-sm font-medium text-ink-700">{t('reg.offDays')}</legend>
            <div className="flex flex-wrap gap-1.5">
              {WEEK.map(d => {
                const on = offDays.includes(d);
                return (
                  <label key={d} className="cursor-pointer">
                    <input type="checkbox" className="peer sr-only" checked={on} onChange={() => toggleDay(d)} />
                    <span className={cn('inline-flex h-9 items-center rounded-lg border px-3 text-sm font-medium transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-ink-400',
                      on ? 'border-[color:var(--cod-primary)] bg-[color:var(--cod-primary)] text-[color:var(--cod-primary-fg)]' : 'border-ink-200 bg-white text-ink-600 hover:bg-ink-50')}>
                      {t(`weekday.${d}` as HrKey).slice(0, 3)}
                    </span>
                  </label>
                );
              })}
            </div>
            <p className="text-xs text-ink-400">{t('reg.offDaysHelp')}</p>
          </fieldset>
        </div>

        {!hasSession && (
          <div data-step={1} hidden={step !== 1} className="space-y-4">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-ink-900">{t('reg.accountTitle')}</h2>
              <p className="text-sm text-ink-500">{t('reg.accountHelp')}</p>
            </div>
            <Field label={t('reg.yourName')} htmlFor="full_name">
              <TextInput id="full_name" {...field('full_name')} autoComplete="name" required minLength={2} maxLength={100} />
            </Field>
            <Field label={t('common.email')} htmlFor="email"><TextInput id="email" {...field('email')} type="email" autoComplete="email" required /></Field>
            <Field label={t('reg.password')} htmlFor="password" hint={t('reg.passwordHelp')}>
              <TextInput id="password" {...field('password')} type="password" autoComplete="new-password" minLength={8} required
                pattern="(?=.*[A-Z])(?=.*\d).{8,}" />
            </Field>
          </div>
        )}

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error.text}{' '}
            {error.signIn && <a href="/login" className="font-semibold underline underline-offset-4">{t('reg.signIn')}</a>}
          </p>
        )}

        <div className="flex gap-2">
          {step > 0 && <Button variant="outline" onClick={() => setStep(s => s - 1)}><ArrowLeft /> {t('common.back')}</Button>}
          {step < last ? (
            <Button className="flex-1 justify-center" onClick={goNext}>{t('reg.continue')} <ArrowRight /></Button>
          ) : (
            <Button type="submit" className="flex-1 justify-center" disabled={pending}>
              {pending ? (hasSession ? t('reg.finishing') : t('reg.creating')) : hasSession ? t('reg.finish') : t('reg.create')}
            </Button>
          )}
        </div>
        <p className="text-center text-xs text-ink-400">{t('reg.trialNote')}</p>
      </form>

      {!hasSession && (
        <p className="text-center text-sm text-ink-500">
          {t('reg.already')}{' '}
          <Link href="/login" className="font-semibold text-[color:var(--cod-primary)] underline underline-offset-4">{t('reg.signIn')}</Link>
        </p>
      )}
    </div>
  );
}
