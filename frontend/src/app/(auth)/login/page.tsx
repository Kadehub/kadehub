'use client';
import { useRouter } from 'next/navigation';
import KadeHubLogo from '../../../components/ui/KadeHubLogo';
import { Input } from '../../../components/ui/Input';
import { ShoppingCart, Boxes, Users, BarChart2, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '../../../hooks/useAuth';
import api from '../../../lib/api';
import toast from 'react-hot-toast';

const features = [
  { icon: ShoppingCart, label: 'Fast POS',   desc: 'Process sales in seconds' },
  { icon: Boxes,        label: 'Inventory',   desc: 'Real-time stock tracking' },
  { icon: Users,        label: 'Loyalty CRM', desc: 'Reward your customers' },
  { icon: BarChart2,    label: 'Analytics',   desc: 'Daily business insights' },
];

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const router = useRouter();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', form);
      setAuth(data.user, data.access_token);
      router.push('/pos');
    } catch (err: any) {
      const msg = err.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] flex-shrink-0 p-10 text-white"
        style={{ background: 'linear-gradient(160deg, #004D40 0%, #00796B 50%, #00A884 100%)' }}>
        <KadeHubLogo width={200} theme="white" />
        <div>
          <h2 className="text-3xl font-extrabold leading-tight">
            Smart retail,<br />
            <span style={{ color: '#FFB703' }}>simplified.</span>
          </h2>
          <p className="mt-3 text-sm opacity-70 leading-relaxed">
            Everything your shop needs — POS, inventory, customers and analytics — in one fast platform.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-3">
            {features.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="rounded-xl p-3.5"
                style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}>
                <Icon size={18} style={{ color: '#FFB703' }} />
                <p className="mt-2 text-sm font-semibold">{label}</p>
                <p className="text-xs opacity-60 mt-0.5">{desc}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs opacity-40">© {new Date().getFullYear()} KadeHub · Built for Sri Lankan shops</p>
      </div>

      {/* Right — login form */}
      <div className="flex-1 flex items-center justify-center p-6" style={{ background: '#F1F5F9' }}>
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 flex justify-center">
            <KadeHubLogo width={180} theme="color" />
          </div>

          <div className="kh-card p-8">
            <h2 className="text-xl font-bold text-ink-900 mb-1">Welcome back 👋</h2>
            <p className="text-sm text-ink-400 mb-6">Sign in to your KadeHub account</p>

            <form onSubmit={submit} className="space-y-4">
              <Input label="Email address" type="email" placeholder="you@example.com" required
                value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              <Input label="Password" type="password" placeholder="••••••••" required
                value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />

              <button type="submit" disabled={loading}
                className="kh-btn-primary w-full py-2.5 rounded-xl flex items-center justify-center gap-2">
                {loading
                  ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <><span>Sign In</span><ArrowRight size={16} /></>
                }
              </button>
            </form>

            {/* Register CTA */}
            <div className="mt-6 pt-5 border-t border-ink-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-ink-700">New to KadeHub?</p>
                  <p className="text-xs text-ink-400 mt-0.5">Create your shop in 4 easy steps</p>
                </div>
                <a href="/register"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all border-2"
                  style={{ borderColor: '#00A884', color: '#00A884' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#00A884'; (e.currentTarget as HTMLElement).style.color = 'white'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#00A884'; }}>
                  Register Shop <ArrowRight size={14} />
                </a>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-ink-100 text-center">
              <p className="text-xs text-ink-400 mb-1">Demo credentials</p>
              <code className="text-xs font-mono px-3 py-1.5 rounded-lg inline-block"
                style={{ background: '#E0F2F1', color: '#00796B' }}>
                admin@demo.com · Admin@123
              </code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
