'use client';
import { useEffect, useState } from 'react';
import { LogOut, ShieldCheck } from 'lucide-react';
import KadeHubLogo from '../../components/ui/KadeHubLogo';
import ProductCard from '../../components/platform/ProductCard';
import Mascot from '../../components/brand/Mascot';
import { useAuthHydrated, useAuthStore } from '../../hooks/useAuth';
import { PRODUCTS, productUrl, type ProductDef } from '../../lib/platform';
import api from '../../lib/api';

type MyProduct = { slug: string; enabled: boolean };

// App launcher on the hub: every product, with the ones this account uses marked active.
export default function AppsPage() {
  const hydrated = useAuthHydrated();
  const { token, user, logout } = useAuthStore();
  const [enabled, setEnabled] = useState<Set<string> | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (!token) { window.location.href = '/login'; return; }
    api.get<MyProduct[]>('/platform/my-products')
      .then(({ data }) => setEnabled(new Set(data.filter(p => p.enabled).map(p => p.slug))))
      .catch(() => setEnabled(new Set()));
  }, [hydrated, token]);

  function cardProps(p: ProductDef) {
    if (p.status === 'coming_soon') return { href: productUrl(p.slug, '/'), cta: 'Learn more' };
    if (enabled?.has(p.slug)) return { href: productUrl(p.slug), cta: 'Open', badge: { text: 'Active', cls: 'kh-badge-green' } };
    return { href: productUrl(p.slug, '/'), cta: 'Get started' };
  }

  return (
    <div className="min-h-screen" style={{ background: '#F1F5F9' }}>
      <header className="bg-white border-b border-ink-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <a href="/"><KadeHubLogo width={140} theme="color" /></a>
          <div className="flex items-center gap-2 min-w-0">
            {user?.role === 'SUPER_ADMIN' && (
              <a href="/super-admin" className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-ink-600 hover:bg-ink-50">
                <ShieldCheck size={16} /> Super admin
              </a>
            )}
            <span className="text-sm font-semibold text-ink-700 truncate">{user?.name}</span>
            <button onClick={() => { logout(); window.location.href = '/login'; }}
              className="p-2 rounded-xl text-ink-500 hover:bg-red-50 hover:text-red-600" title="Sign out">
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center gap-4">
          <Mascot size="sm" animation="enter" decorative priority />
          <div>
            <h1 className="text-2xl font-extrabold text-ink-900">Your KadeHub apps</h1>
            <p className="mt-1 text-sm text-ink-500">One account works across every product.</p>
          </div>
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {enabled === null
            ? PRODUCTS.map(p => <div key={p.slug} className="kh-card h-72 animate-pulse" />)
            : PRODUCTS.map(p => <ProductCard key={p.slug} product={p} {...cardProps(p)} />)}
        </div>
      </main>
    </div>
  );
}
