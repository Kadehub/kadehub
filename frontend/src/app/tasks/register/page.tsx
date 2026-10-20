'use client';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { MascotScene } from '../../../components/brand/Mascot';
import { Input } from '../../../components/ui/Input';
import { Spinner } from '../../../components/tasks/ui';
import { useAuthStore } from '../../../hooks/useAuth';
import { useViewer } from '../../../lib/tasks/auth';
import { productPath } from '../../../lib/platform';
import { useTasksT } from '../../../lib/tasks/i18n';
import { apiError } from '../../../lib/tasks/format';
import api from '../../../lib/api';

// tasks.kadehub.com/register — free KadeHub account with Tasks turned on
export default function TasksRegisterPage() {
  const { t } = useTasksT();
  const { signedIn } = useViewer();
  const setAuth = useAuthStore(s => s.setAuth);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  // Set once sign-up succeeds, so the "already signed in" redirect doesn't override the jump to /profile
  const justRegistered = useRef(false);

  useEffect(() => {
    if (signedIn && !justRegistered.current) window.location.href = productPath('tasks', '/');
  }, [signedIn]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register-account', { product: 'tasks', ...form, email: form.email.trim() });
      justRegistered.current = true;
      setAuth(data.user, data.access_token);
      toast.success(t('reg.welcome'));
      window.location.href = productPath('tasks', '/profile');
    } catch (err) {
      toast.error(apiError(err, t('common.error')));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <div className="flex justify-center">
        <MascotScene scene="grow" size="md" animation="enter" priority decorative />
      </div>
      <div className="kh-card p-6 sm:p-8 mt-4">
        <h1 className="text-xl font-extrabold text-ink-900 text-center">{t('reg.title')}</h1>
        <p className="mt-1 text-sm text-ink-500 text-center">{t('reg.subtitle')}</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <Input label={t('reg.name')} required minLength={2} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <Input label={t('reg.email')} type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          <div>
            <Input label={t('reg.password')} type="password" required minLength={8} value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            <p className="mt-1 text-xs text-ink-400">{t('reg.passwordHint')}</p>
          </div>
          <button type="submit" disabled={loading} className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl text-sm kh-btn-amber">
            {loading && <Spinner className="!w-4 !h-4 !border-white !border-t-transparent" />} {t('reg.submit')}
          </button>
        </form>
        <p className="mt-5 text-center text-sm text-ink-500">
          {t('reg.haveAccount')} <a href="/login" className="font-semibold text-amber-dark hover:underline">{t('reg.signIn')}</a>
        </p>
      </div>
    </div>
  );
}
