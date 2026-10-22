'use client';

import { useState, type ReactNode } from 'react';
import toast from 'react-hot-toast';
import { ImagePlus } from 'lucide-react';
import api from '../../../lib/api';
import { apiError, postForm } from '../../../lib/hr/api';
import { useHrT, type HrKey } from '../../../lib/hr/i18n';
import type { HrSettings } from '../../../lib/hr/types';
import { useHr } from '../HrContext';
import { Button, Card, Field, FilePick, TextArea, TextInput, Toggle, btnClass, cn } from '../ui';

type FormProps = { settings: HrSettings; onSaved: (s: HrSettings) => void };

/** Saves a subset of settings and reports back the stored row. */
function useSave(onSaved: (s: HrSettings) => void) {
  const { t } = useHrT();
  const { refresh } = useHr();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  async function save(body: Partial<HrSettings>) {
    setBusy(true);
    setError(undefined);
    try {
      const { data } = await api.put<HrSettings>('/hr/settings', body);
      toast.success(t('common.saved'));
      onSaved(data);
      refresh();
    } catch (err) {
      setError(apiError(err, t));
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, save };
}

function Footer({ busy, error }: { busy: boolean; error?: string }) {
  const { t } = useHrT();
  return (
    <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
      {error && <p role="alert" className="mr-auto text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={busy}>{busy ? t('common.saving') : t('common.save')}</Button>
    </div>
  );
}

function SwitchRow({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-ink-200 p-3">
      <div>
        <p className="text-sm font-medium text-ink-800">{label}</p>
        <p className="text-xs text-ink-400">{hint}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} label={label} />
    </div>
  );
}

const num = (v: string) => (v === '' ? NaN : Number(v));

export function BusinessForm({ settings, onSaved }: FormProps) {
  const { t } = useHrT();
  const { refresh } = useHr();
  const { busy, error, save } = useSave(onSaved);
  const [v, setV] = useState({ business_name: settings.business_name, phone: settings.phone, address: settings.address, brand_color: settings.brand_color });
  const [logo, setLogo] = useState(settings.logo_url);
  const [uploading, setUploading] = useState(false);

  async function uploadLogo(file: File) {
    setUploading(true);
    try {
      const { data } = await postForm<HrSettings>('/hr/settings/logo', {}, file);
      setLogo(data.logo_url);
      toast.success(t('set.biz.logoUpdated'));
      refresh();
    } catch (err) {
      toast.error(apiError(err, t));
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card>
      <form onSubmit={e => { e.preventDefault(); save(v); }} className="space-y-4">
        <div className="flex items-center gap-4">
          {logo
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={logo} alt="" className="h-16 w-16 rounded-xl border border-ink-200 object-contain" />
            : <span className="flex h-16 w-16 items-center justify-center rounded-xl bg-[color:var(--cod-primary)] text-2xl font-extrabold text-[color:var(--cod-primary-fg)]">{(v.business_name || 'S').slice(0, 1).toUpperCase()}</span>}
          <div>
            <p className="text-sm font-medium text-ink-700">{t('set.biz.logo')}</p>
            <p className="mb-2 text-xs text-ink-400">{t('set.biz.logoHint')}</p>
            <FilePick accept="image/jpeg,image/png,image/webp" onPick={uploadLogo} disabled={uploading}>
              <span className={btnClass('outline', 'sm')}><ImagePlus /> {uploading ? t('common.uploading') : t('set.biz.logoUpload')}</span>
            </FilePick>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('set.biz.name')} htmlFor="biz-name" className="sm:col-span-2">
            <TextInput id="biz-name" required maxLength={150} value={v.business_name} onChange={e => setV({ ...v, business_name: e.target.value })} />
          </Field>
          <Field label={t('common.phone')} htmlFor="biz-phone"><TextInput id="biz-phone" type="tel" maxLength={40} value={v.phone} onChange={e => setV({ ...v, phone: e.target.value })} /></Field>
          <Field label={t('set.biz.color')} htmlFor="biz-color" hint={t('set.biz.colorHint')}>
            <div className="flex items-center gap-2">
              <input id="biz-color" type="color" value={v.brand_color} onChange={e => setV({ ...v, brand_color: e.target.value })}
                className="h-10 w-14 cursor-pointer rounded-lg border border-ink-200 bg-white p-1" />
              <TextInput aria-label={t('set.biz.color')} value={v.brand_color} pattern="#[0-9a-fA-F]{6}" maxLength={7} className="w-28 font-mono"
                onChange={e => setV({ ...v, brand_color: e.target.value })} />
            </div>
          </Field>
          <Field label={t('common.address')} htmlFor="biz-address" className="sm:col-span-2">
            <TextInput id="biz-address" maxLength={300} value={v.address} onChange={e => setV({ ...v, address: e.target.value })} />
          </Field>
        </div>
        <Footer busy={busy} error={error} />
      </form>
    </Card>
  );
}

export function RulesForm({ settings, onSaved }: FormProps) {
  const { t } = useHrT();
  const { busy, error, save } = useSave(onSaved);
  const [v, setV] = useState({
    work_hours_per_day: String(settings.work_hours_per_day), late_grace_minutes: String(settings.late_grace_minutes),
    overtime_min_minutes: String(settings.overtime_min_minutes), overtime_multiplier: String(settings.overtime_multiplier),
    max_weekly_hours: String(settings.max_weekly_hours),
  });
  const [off, setOff] = useState<number[]>(settings.weekly_off_days.split(',').filter(Boolean).map(Number));
  const [flags, setFlags] = useState({ deduct_absent: settings.deduct_absent, deduct_late: settings.deduct_late, require_photo: settings.require_photo });
  const numField = (k: keyof typeof v, label: HrKey, attrs: { min: number; max: number; step?: string }, hint?: HrKey): ReactNode => (
    <Field label={t(label)} htmlFor={`rule-${k}`} hint={hint && t(hint)}>
      <TextInput id={`rule-${k}`} type="number" required inputMode="decimal" {...attrs} value={v[k]} onChange={e => setV({ ...v, [k]: e.target.value })} />
    </Field>
  );

  return (
    <Card>
      <form className="space-y-4" onSubmit={e => {
        e.preventDefault();
        save({
          work_hours_per_day: num(v.work_hours_per_day), late_grace_minutes: num(v.late_grace_minutes),
          overtime_min_minutes: num(v.overtime_min_minutes), overtime_multiplier: num(v.overtime_multiplier),
          max_weekly_hours: num(v.max_weekly_hours), weekly_off_days: [...off].sort().join(','), ...flags,
        });
      }}>
        <div className="grid gap-3 sm:grid-cols-2">
          {numField('work_hours_per_day', 'set.rules.hours', { min: 1, max: 16, step: '0.5' })}
          {numField('max_weekly_hours', 'set.rules.maxWeekly', { min: 10, max: 100 })}
          {numField('late_grace_minutes', 'set.rules.grace', { min: 0, max: 120 }, 'set.rules.graceHint')}
          {numField('overtime_min_minutes', 'set.rules.otMin', { min: 0, max: 240 }, 'set.rules.otMinHint')}
          {numField('overtime_multiplier', 'set.rules.otMultiplier', { min: 1, max: 5, step: '0.25' })}
        </div>
        <fieldset>
          <legend className="text-sm font-medium text-ink-700">{t('set.rules.offDays')}</legend>
          <p className="mb-2 text-xs text-ink-400">{t('set.rules.offDaysHint')}</p>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5, 6, 0].map(d => {
              const on = off.includes(d);
              return (
                <button key={d} type="button" aria-pressed={on} onClick={() => setOff(on ? off.filter(x => x !== d) : [...off, d])}
                  className={cn('rounded-xl border px-3 py-1.5 text-sm font-semibold',
                    on ? 'border-[color:var(--cod-primary)] bg-[color:var(--cod-primary)] text-[color:var(--cod-primary-fg)]' : 'border-ink-200 bg-white text-ink-600')}>
                  {t(`weekday.${d}` as HrKey)}
                </button>
              );
            })}
          </div>
        </fieldset>
        <div className="space-y-2">
          <SwitchRow label={t('set.rules.deductAbsent')} hint={t('set.rules.deductAbsentHint')} checked={flags.deduct_absent} onChange={c => setFlags({ ...flags, deduct_absent: c })} />
          <SwitchRow label={t('set.rules.deductLate')} hint={t('set.rules.deductLateHint')} checked={flags.deduct_late} onChange={c => setFlags({ ...flags, deduct_late: c })} />
          <SwitchRow label={t('set.rules.photo')} hint={t('set.rules.photoHint')} checked={flags.require_photo} onChange={c => setFlags({ ...flags, require_photo: c })} />
        </div>
        <Footer busy={busy} error={error} />
      </form>
    </Card>
  );
}

export function PayrollForm({ settings, onSaved }: FormProps) {
  const { t } = useHrT();
  const { busy, error, save } = useSave(onSaved);
  const [v, setV] = useState({
    epf_employee_pct: String(settings.epf_employee_pct), epf_employer_pct: String(settings.epf_employer_pct),
    etf_employer_pct: String(settings.etf_employer_pct), nopay_divisor: String(settings.nopay_divisor),
  });
  const [footer, setFooter] = useState(settings.payslip_footer);
  const pct = (k: 'epf_employee_pct' | 'epf_employer_pct' | 'etf_employer_pct', label: HrKey) => (
    <Field label={t(label)} htmlFor={`pay-${k}`}>
      <TextInput id={`pay-${k}`} type="number" required min={0} max={50} step="0.01" inputMode="decimal" value={v[k]} onChange={e => setV({ ...v, [k]: e.target.value })} />
    </Field>
  );

  return (
    <Card>
      <form className="space-y-4" onSubmit={e => {
        e.preventDefault();
        save({
          epf_employee_pct: num(v.epf_employee_pct), epf_employer_pct: num(v.epf_employer_pct), etf_employer_pct: num(v.etf_employer_pct),
          nopay_divisor: num(v.nopay_divisor), payslip_footer: footer,
        });
      }}>
        <div className="grid gap-3 sm:grid-cols-3">
          {pct('epf_employee_pct', 'set.pay.epfEmployee')}
          {pct('epf_employer_pct', 'set.pay.epfEmployer')}
          {pct('etf_employer_pct', 'set.pay.etfEmployer')}
        </div>
        <Field label={t('set.pay.divisor')} htmlFor="pay-divisor" hint={t('set.pay.divisorHint')} className="max-w-xs">
          <TextInput id="pay-divisor" type="number" required min={20} max={31} value={v.nopay_divisor} onChange={e => setV({ ...v, nopay_divisor: e.target.value })} />
        </Field>
        <Field label={t('set.pay.footer')} htmlFor="pay-footer">
          <TextArea id="pay-footer" rows={2} maxLength={300} placeholder={t('set.pay.footerPh')} value={footer} onChange={e => setFooter(e.target.value)} />
        </Field>
        <Footer busy={busy} error={error} />
      </form>
    </Card>
  );
}
