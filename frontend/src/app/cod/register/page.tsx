'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, ArrowRight, Baby, BookOpen, Cake, Car, Gem, HeartPulse, Home, Shirt, ShoppingBasket, Smartphone, Sparkles, Store,
  type LucideIcon,
} from 'lucide-react';
import { MascotScene, MascotState } from '../../../components/brand/Mascot';
import { LanguageSwitcher, codHref } from '../../../components/cod/bits';
import { Button, Field, TextInput, Toggle, btnClass, cn } from '../../../components/cod/ui';
import KadeHubLogo from '../../../components/ui/KadeHubLogo';
import { useAuthHydrated, useAuthStore } from '../../../hooks/useAuth';
import api from '../../../lib/api';
import { useT } from '../../../lib/cod/i18n/client';
import { BUSINESS_TYPES, businessTypeBlurb, businessTypeLabel, getBusinessType, type BusinessTypeKey } from '../../../lib/cod/business-types';
import { apiError, type CodMe } from '../../../lib/cod/session';

const TYPE_ICONS: Record<BusinessTypeKey, LucideIcon> = {
  fashion: Shirt, electronics: Smartphone, beauty: Sparkles, food: Cake, grocery: ShoppingBasket, home: Home,
  kids: Baby, jewellery: Gem, health: HeartPulse, books: BookOpen, auto: Car, general: Store,
};

/**
 * cod.kadehub.com/register
 *  - signed out: CODPlatform's 3-step wizard (business type → details → account) creating a KadeHub account
 *  - signed in without COD: "Enable KadeHub COD", then the same wizard without the account step
 *  - signed in with COD but no business profile yet: the wizard without the account step
 */
export default function CodRegisterPage() {
  const t = useT();
  const router = useRouter();
  const hydrated = useAuthHydrated();
  const token = useAuthStore(s => s.token);
  const [mode, setMode] = useState<'checking' | 'new' | 'enable' | 'setup' | 'done'>('checking');
  const [me, setMe] = useState<CodMe | null>(null);

  useEffect(() => {
    if (!hydrated || mode !== 'checking') return;
    if (!token) { setMode('new'); return; }
    api.get<CodMe>('/cod/me')
      .then(({ data }) => {
        setMe(data);
        if (data.enabled && data.business) router.replace(codHref('/dashboard'));
        else setMode(data.enabled ? 'setup' : 'enable');
      })
      .catch(() => setMode('new'));
  }, [hydrated, token, mode, router]);

  return (
    <div className="relative flex min-h-screen items-start justify-center bg-ink-50 px-4 py-10 sm:items-center">
      <div className="absolute right-4 top-4"><LanguageSwitcher /></div>
      <div className="w-full max-w-xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <KadeHubLogo width={130} theme="color" />
          <p className="mt-2 text-sm font-semibold text-ink-700">KadeHub COD</p>
          <p className="text-sm text-ink-500">{t('app.tagline')}</p>
        </div>
        {mode === 'checking' && <MascotState variant="loading" size="sm" title={t('app.loading')} />}
        {mode === 'enable' && <EnableCod onEnabled={() => setMode('setup')} />}
        {(mode === 'new' || mode === 'setup') && (
          <Wizard hasSession={mode === 'setup'} defaultName={me?.name ?? ''} onDone={() => setMode('done')} />
        )}
        {mode === 'done' && (
          <div className="kh-card p-6">
            <MascotState variant="success" size="lg" title={t('reg.successTitle')} description={t('reg.successBody')}
              action={<a href={codHref('/dashboard')} className={btnClass('primary')}>{t('reg.openDashboard')} <ArrowRight /></a>} />
          </div>
        )}
      </div>
    </div>
  );
}

function EnableCod({ onEnabled }: { onEnabled: () => void }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function enable() {
    setBusy(true);
    setError(undefined);
    try {
      await api.post('/platform/enable/cod');
      onEnabled();
    } catch (err) {
      setError((err as { response?: { status?: number } })?.response?.status === 403 ? t('enable.adminOnly') : apiError(err, t));
      setBusy(false);
    }
  }

  return (
    <div className="kh-card p-6">
      <MascotState variant="empty" size="md" scene="grow" title={t('enable.title')} description={t('enable.body')}
        action={<div className="flex flex-col items-center gap-2">
          <Button onClick={enable} disabled={busy}>{busy ? t('enable.working') : t('enable.cta')}</Button>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        </div>} />
    </div>
  );
}

function Wizard({ hasSession, defaultName, onDone }: { hasSession: boolean; defaultName: string; onDone: () => void }) {
  const t = useT();
  const setAuth = useAuthStore(s => s.setAuth);
  const [step, setStep] = useState(0);
  const [typeKey, setTypeKey] = useState<string>('');
  const [importsGoods, setImportsGoods] = useState(true);
  const [values, setValues] = useState({
    business_name: '', phone: '', city: '', address: '', full_name: defaultName, email: '', password: '',
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ text: string; signIn?: boolean }>();
  // Set once the account exists, so a retry after a failed profile save doesn't sign up twice
  const [accountCreated, setAccountCreated] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const preset = getBusinessType(typeKey);
  const steps = [t('reg.step1'), t('reg.step2'), hasSession ? t('reg.step3Session') : t('reg.step3')];
  const last = steps.length - 1;
  const field = (name: keyof typeof values) => ({
    name, value: values[name], onChange: (e: React.ChangeEvent<HTMLInputElement>) => setValues(v => ({ ...v, [name]: e.target.value })),
  });

  function pickType(key: string) {
    setTypeKey(key);
    setImportsGoods(getBusinessType(key).importsGoods);
  }

  function goNext() {
    const inputs = formRef.current?.querySelectorAll<HTMLInputElement>(`[data-step="${step}"] input:not([type=hidden])`) ?? [];
    for (const el of Array.from(inputs)) if (!el.reportValidity()) return;
    setStep(s => Math.min(s + 1, last));
  }

  async function submit() {
    if (!values.business_name.trim()) { setError({ text: t('err.businessName') }); setStep(1); return; }
    if (!values.phone.trim()) { setError({ text: t('err.phone') }); setStep(1); return; }
    setPending(true);
    setError(undefined);
    try {
      if (!hasSession && !accountCreated) {
        if (values.password.length < 8) { setError({ text: t('err.passwordShort') }); setPending(false); return; }
        const { data } = await api.post('/auth/register-account', {
          product: 'cod',
          name: values.full_name.trim() || values.business_name.trim(),
          email: values.email.trim(),
          password: values.password,
          businessName: values.business_name.trim(),
        });
        setAuth(data.user, data.access_token);
        setAccountCreated(true);
      }
      await api.put('/cod/business', {
        name: values.business_name.trim(),
        phone: values.phone.trim(),
        city: values.city.trim(),
        address: values.address.trim(),
        business_type: typeKey || 'general',
        brand_color: preset.color,
        imports_goods: importsGoods,
      });
      onDone();
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      setError(status === 409 ? { text: t('err.emailTaken'), signIn: true } : { text: apiError(err, t) });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="kh-card space-y-6 p-6">
      <ol className="flex gap-2" aria-label={t('reg.progress')}>
        {steps.map((label, i) => (
          <li key={label} className="flex-1" aria-current={i === step ? 'step' : undefined}>
            <div className={cn('h-1.5 rounded-full transition-colors', i <= step ? 'bg-[color:var(--cod-primary)]' : 'bg-ink-200')} />
            <p className={cn('mt-1.5 text-xs', i === step ? 'font-semibold text-ink-900' : 'text-ink-500')}>{i + 1}. {label}</p>
          </li>
        ))}
      </ol>

      <form ref={formRef} className="space-y-6" onSubmit={e => {
        e.preventDefault();
        // Enter inside a step moves on instead of submitting half a form
        if (step < last) goNext(); else submit();
      }}>
        {/* Step 1 — what kind of business */}
        <div data-step={0} hidden={step !== 0} className="space-y-4">
          <div className="flex items-center gap-4">
            <MascotScene scene="grow" size="sm" animation="enter" decorative priority className="hidden sm:block" />
            <div>
              <h2 className="text-lg font-bold tracking-tight text-ink-900">{hasSession ? t('reg.typeTitleSession') : t('reg.typeTitle')}</h2>
              <p className="text-sm text-ink-500">{t('reg.typeHelp')}</p>
            </div>
          </div>
          <div role="radiogroup" aria-label={t('reg.typeGroup')} className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {BUSINESS_TYPES.map(bt => {
              const Icon = TYPE_ICONS[bt.key];
              const checked = typeKey === bt.key;
              return (
                <label key={bt.key} className="cursor-pointer">
                  <input type="radio" name="business_type" value={bt.key} checked={checked} onChange={() => pickType(bt.key)} className="peer sr-only" />
                  <div className={cn('flex h-full flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-colors hover:bg-ink-50 peer-focus-visible:ring-2 peer-focus-visible:ring-ink-400',
                    checked ? 'border-[color:var(--cod-primary)] ring-2 ring-[color:var(--cod-primary)]' : 'border-ink-200')}>
                    <span className="flex h-9 w-9 items-center justify-center rounded-full text-white" style={{ backgroundColor: bt.color }}><Icon size={18} /></span>
                    <span className="text-sm font-semibold leading-tight text-ink-900">{businessTypeLabel(t, bt.key)}</span>
                    <span className="text-[11px] leading-tight text-ink-500">{businessTypeBlurb(t, bt.key)}</span>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Step 2 — business details */}
        <div data-step={1} hidden={step !== 1} className="space-y-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-ink-900">{t('reg.detailsTitle')}</h2>
            <p className="text-sm text-ink-500">{t('reg.detailsHelp')}</p>
          </div>
          <Field label={t('reg.businessName')} htmlFor="business_name">
            <TextInput id="business_name" {...field('business_name')} required maxLength={100} autoComplete="organization" />
          </Field>
          <Field label={t('reg.phone')} htmlFor="phone" hint={t('reg.phoneHelp')}>
            <TextInput id="phone" {...field('phone')} type="tel" inputMode="tel" placeholder="077 123 4567" required autoComplete="tel" />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t('reg.city')} htmlFor="city"><TextInput id="city" {...field('city')} autoComplete="address-level2" /></Field>
            <Field label={t('reg.addressOptional')} htmlFor="address"><TextInput id="address" {...field('address')} autoComplete="street-address" /></Field>
          </div>
          <div className="flex items-start justify-between gap-4 rounded-xl border border-ink-200 p-3">
            <span className="text-sm">
              <span className="font-medium">{t('reg.importsTitle')}</span>
              <span className="block text-xs text-ink-500">{t('reg.importsHelp')}</span>
            </span>
            <Toggle checked={importsGoods} onChange={setImportsGoods} label={t('reg.importsTitle')} />
          </div>
        </div>

        {/* Step 3 — account */}
        <div data-step={2} hidden={step !== 2} className="space-y-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-ink-900">{hasSession ? t('reg.accountTitleSession') : t('reg.accountTitle')}</h2>
            <p className="text-sm text-ink-500">{hasSession ? t('reg.accountHelpSession') : t('reg.accountHelp')}</p>
          </div>
          {!hasSession && (
            <>
              <Field label={t('reg.yourName')} htmlFor="full_name"><TextInput id="full_name" {...field('full_name')} autoComplete="name" /></Field>
              <Field label={t('common.email')} htmlFor="email"><TextInput id="email" {...field('email')} type="email" autoComplete="email" required /></Field>
              <Field label={t('common.password')} htmlFor="password" hint={t('reg.passwordHelp')}>
                <TextInput id="password" {...field('password')} type="password" autoComplete="new-password" minLength={8} required
                  pattern="(?=.*[A-Z])(?=.*\d).{8,}" />
              </Field>
            </>
          )}
          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error.text}{' '}
              {error.signIn && <a href="/login" className="font-semibold underline underline-offset-4">{t('reg.signIn')}</a>}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          {step > 0 && (
            <Button variant="outline" onClick={() => setStep(s => s - 1)}><ArrowLeft /> {t('common.back')}</Button>
          )}
          {step < last ? (
            <Button className="flex-1 justify-center" onClick={goNext} disabled={step === 0 && !typeKey}>{t('common.continue')} <ArrowRight /></Button>
          ) : (
            <Button type="submit" className="flex-1 justify-center" disabled={pending}>
              {pending ? (hasSession ? t('reg.finishing') : t('reg.creating')) : hasSession ? t('reg.finish') : t('reg.create')}
            </Button>
          )}
        </div>
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
