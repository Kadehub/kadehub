'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Upload } from 'lucide-react';
import { useCod } from '../../../components/cod/CodContext';
import { Button, Card, Field, NativeSelect, TextArea, TextInput, Toggle, cn } from '../../../components/cod/ui';
import api from '../../../lib/api';
import { useT } from '../../../lib/cod/i18n/client';
import { BRAND_SWATCHES, normalizeHex, readableTextColor } from '../../../lib/cod/brand';
import { BUSINESS_TYPES, businessTypeLabel } from '../../../lib/cod/business-types';
import { apiError } from '../../../lib/cod/session';

// cod.kadehub.com/settings — business profile, branding, costing, password (reachable even when the plan lapsed)
export default function CodSettingsPage() {
  const t = useT();
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-xl font-bold tracking-tight text-ink-900">{t('nav.settings')}</h1>
      <Card title={t('set.businessDetails')}><BusinessForm /></Card>
      <Card title={t('set.changePassword')}><PasswordForm /></Card>
    </div>
  );
}

function BusinessForm() {
  const t = useT();
  const { me, refresh } = useCod();
  const b = me.business;
  const [form, setForm] = useState({
    name: b.name, phone: b.phone, city: b.city, address: b.address, tagline: b.tagline, invoice_footer: b.invoice_footer,
  });
  const [logoUrl, setLogoUrl] = useState(b.logo_url ?? '');
  const [businessType, setBusinessType] = useState(b.business_type);
  const [brandColor, setBrandColor] = useState(normalizeHex(b.brand_color));
  const [importsGoods, setImportsGoods] = useState(b.imports_goods);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const f = (key: keyof typeof form) => ({
    value: form[key], onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(v => ({ ...v, [key]: e.target.value })),
  });

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post<{ url: string }>('/cod/business/logo', fd, { timeout: 60000 });
      setLogoUrl(data.url);
    } catch (err) {
      toast.error(apiError(err, t) || t('set.logoFailed'));
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError(t('err.businessName')); return; }
    setSaving(true);
    setError(undefined);
    try {
      await api.put('/cod/business', {
        ...form, name: form.name.trim(), logo_url: logoUrl || null, business_type: businessType,
        brand_color: brandColor, imports_goods: importsGoods,
      });
      toast.success(t('set.saved'));
      // Business type, colour and labels show up across the whole app
      await refresh();
    } catch (err) {
      setError(apiError(err, t));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-ink-800">{t('set.profile')}</h2>
        <Field label={t('set.logo')} hint={t('set.logoHelp')}>
          <div className="flex items-center gap-3">
            {logoUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={logoUrl} alt="" className="h-12 w-12 shrink-0 rounded-lg border border-ink-200 bg-ink-50 object-contain p-1" />
              : <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-ink-200 bg-ink-50 text-ink-400"><Upload size={16} /></div>}
            <TextInput type="file" accept="image/png,image/jpeg,image/webp" onChange={onUpload} disabled={uploading} />
          </div>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('set.businessName')} htmlFor="name"><TextInput id="name" required {...f('name')} /></Field>
          <Field label={t('set.businessType')} htmlFor="business_type">
            <NativeSelect id="business_type" value={businessType} onChange={e => setBusinessType(e.target.value)}>
              {BUSINESS_TYPES.map(bt => <option key={bt.key} value={bt.key}>{businessTypeLabel(t, bt.key)}</option>)}
            </NativeSelect>
          </Field>
          <Field label={t('set.phone')} htmlFor="phone"><TextInput id="phone" type="tel" {...f('phone')} /></Field>
          <Field label={t('common.city')} htmlFor="city"><TextInput id="city" {...f('city')} /></Field>
          <Field label={t('common.address')} htmlFor="address" className="sm:col-span-2"><TextInput id="address" {...f('address')} /></Field>
        </div>
      </section>

      <hr className="border-ink-100" />

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-ink-800">{t('set.branding')}</h2>
        <Field label={t('set.brandColour')} hint={t('set.brandHelp')}>
          <div className="flex flex-wrap items-center gap-2">
            {BRAND_SWATCHES.map(c => (
              <button key={c} type="button" aria-label={t('set.useColour', { colour: c })} aria-pressed={brandColor === c} onClick={() => setBrandColor(c)}
                style={{ backgroundColor: c }} className={cn('h-8 w-8 rounded-full border-2 border-white ring-1 ring-ink-200', brandColor === c && 'ring-2 ring-ink-900')} />
            ))}
            <input type="color" aria-label={t('set.customColour')} value={brandColor} onChange={e => setBrandColor(e.target.value)}
              className="h-8 w-8 cursor-pointer rounded border border-ink-200 bg-transparent p-0" />
            <span className="ml-1 rounded-lg px-2.5 py-1 text-xs font-semibold" style={{ backgroundColor: brandColor, color: readableTextColor(brandColor) }}>
              {t('set.preview')}
            </span>
          </div>
        </Field>
        <Field label={t('set.tagline')} htmlFor="tagline" hint={t('set.taglineHelp')}>
          <TextInput id="tagline" maxLength={100} placeholder={t('set.taglinePlaceholder')} {...f('tagline')} />
        </Field>
        <Field label={t('set.footer')} htmlFor="invoice_footer">
          <TextArea id="invoice_footer" rows={2} maxLength={300} placeholder={t('set.footerPlaceholder')} {...f('invoice_footer')} />
        </Field>
      </section>

      <hr className="border-ink-100" />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-ink-800">{t('set.costing')}</h2>
        <div className="flex items-start justify-between gap-4 rounded-xl border border-ink-200 p-3">
          <span className="text-sm">
            <span className="font-medium">{t('reg.importsTitle')}</span>
            <span className="block text-xs text-ink-500">{t('set.importsHelp')}</span>
          </span>
          <Toggle checked={importsGoods} onChange={setImportsGoods} label={t('reg.importsTitle')} />
        </div>
      </section>

      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={saving || uploading}>{saving ? t('common.saving') : t('common.saveChanges')}</Button>
    </form>
  );
}

function PasswordForm() {
  const t = useT();
  const [form, setForm] = useState({ current: '', password: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password.length < 8) { setError(t('err.passwordShort')); return; }
    if (form.password !== form.confirm) { setError(t('err.passwordMismatch')); return; }
    setBusy(true);
    setError(undefined);
    try {
      await api.post('/cod/account/password', { current_password: form.current, password: form.password });
      toast.success(t('set.passwordUpdated'));
      setForm({ current: '', password: '', confirm: '' });
    } catch (err) {
      setError(apiError(err, t));
    } finally {
      setBusy(false);
    }
  }

  const f = (key: keyof typeof form) => ({ value: form[key], onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm(v => ({ ...v, [key]: e.target.value })) });
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label={t('set.currentPassword')} htmlFor="current-password"><TextInput id="current-password" type="password" autoComplete="current-password" required {...f('current')} /></Field>
      <Field label={t('set.newPassword')} htmlFor="new-password"><TextInput id="new-password" type="password" autoComplete="new-password" minLength={8} required {...f('password')} /></Field>
      <Field label={t('set.confirmPassword')} htmlFor="confirm-password"><TextInput id="confirm-password" type="password" autoComplete="new-password" minLength={8} required {...f('confirm')} /></Field>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={busy}>{busy ? t('set.updating') : t('set.updatePassword')}</Button>
    </form>
  );
}
