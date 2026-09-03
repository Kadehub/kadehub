'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import KadeHubLogo from '../../../components/ui/KadeHubLogo';
import { Input } from '../../../components/ui/Input';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuthHydrated, useAuthStore } from '../../../hooks/useAuth';
import api from '../../../lib/api';
import toast from 'react-hot-toast';

export default function SuperAdminLoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { setAuth, token, user } = useAuthStore();
  const hydrated = useAuthHydrated();
  const router = useRouter();

  useEffect(() => {
    if (hydrated && token && user?.role === 'SUPER_ADMIN') {
      router.replace('/super-admin');
    }
  }, [hydrated, token, user, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', form);
      if (data.user?.role !== 'SUPER_ADMIN') {
        toast.error('This page is for Super Admin only. Use the shop login.');
        return;
      }
      setAuth(data.user, data.access_token);
      router.replace('/super-admin');
    } catch (err: any) {
      const msg = err.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#0F172A' }}>
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <KadeHubLogo width={180} theme="white" />
        </div>
        <div className="kh-card p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
              style={{ background: 'linear-gradient(135deg,#00796B,#00A884)' }}>
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-ink-900">Super Admin</h2>
              <p className="text-sm text-ink-400">Platform sign in</p>
            </div>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <Input label="Email address" type="email" placeholder="superadmin@kadehub.com" required
              value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            <Input label="Password" type="password" placeholder="••••••••" required
              value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            <button type="submit" disabled={loading}
              className="kh-btn-primary w-full py-2.5 rounded-xl flex items-center justify-center gap-2">
              {loading
                ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <><span>Sign in to dashboard</span><ArrowRight size={16} /></>
              }
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
