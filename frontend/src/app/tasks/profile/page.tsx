'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { PageLoader, Spinner, fieldCls } from '../../../components/tasks/ui';
import { productPath } from '../../../lib/platform';
import { useRequireLogin } from '../../../lib/tasks/auth';
import { useTasksT } from '../../../lib/tasks/i18n';
import { apiError } from '../../../lib/tasks/format';
import { DISTRICTS } from '../../../lib/tasks/types';
import api from '../../../lib/api';

const p = (path: string) => productPath('tasks', path);

export default function TaskerProfilePage() {
  const { t } = useTasksT();
  const { ready, user } = useRequireLogin();
  const [form, setForm] = useState<{ headline: string; bio: string; skills: string; district: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!ready) return;
    api.get('/tasks/me/profile')
      .then(({ data }) => setForm({ headline: data.headline || '', bio: data.bio || '', skills: (data.skills || []).join(', '), district: data.district || '' }))
      .catch(() => setForm({ headline: '', bio: '', skills: '', district: '' }));
  }, [ready]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    try {
      await api.put('/tasks/me/profile', { ...form, district: form.district || undefined });
      toast.success(t('profile.saved'));
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setSaving(false);
    }
  }

  if (!ready || !form) return <PageLoader />;
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => f && ({ ...f, [k]: e.target.value }));

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-ink-900">{t('profile.title')}</h1>
          <p className="mt-1 text-sm text-ink-500">{t('profile.subtitle')}</p>
        </div>
        {user && <Link href={p(`/u/${user.id}`)} className="text-sm font-semibold text-amber-dark hover:underline whitespace-nowrap">{t('profile.viewPublic')}</Link>}
      </div>
      <form onSubmit={save} className="kh-card p-5 sm:p-6 mt-5 space-y-4">
        <label className="block space-y-1">
          <span className="text-sm font-medium text-ink-700">{t('profile.headline')}</span>
          <input className={fieldCls} maxLength={120} value={form.headline} placeholder={t('profile.headlinePh')} onChange={set('headline')} />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-ink-700">{t('profile.bio')}</span>
          <textarea className={`${fieldCls} min-h-[130px]`} maxLength={2000} value={form.bio} onChange={set('bio')} />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-ink-700">{t('profile.skills')}</span>
          <input className={fieldCls} maxLength={500} value={form.skills} placeholder={t('profile.skillsPh')} onChange={set('skills')} />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-ink-700">{t('profile.district')}</span>
          <select className={fieldCls} value={form.district} onChange={set('district')}>
            <option value="">—</option>
            {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </label>
        <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm kh-btn-amber">
          {saving && <Spinner className="!w-4 !h-4 !border-white !border-t-transparent" />} {t('profile.save')}
        </button>
      </form>
    </div>
  );
}
