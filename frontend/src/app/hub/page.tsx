import type { Metadata } from 'next';
import { KeyRound, Languages, Smartphone, Wallet, ArrowRight } from 'lucide-react';
import KadeHubLogo from '../../components/ui/KadeHubLogo';
import ProductCard from '../../components/platform/ProductCard';
import Mascot from '../../components/brand/Mascot';
import { PRODUCTS, productUrl } from '../../lib/platform';

export const metadata: Metadata = {
  title: 'KadeHub — Business apps for Sri Lankan businesses',
  description: 'One KadeHub account for every tool your business needs: POS for shops, COD order management, and a local task marketplace.',
};

const BENEFITS = [
  { icon: KeyRound,   title: 'One login',               desc: 'Sign in once and move between POS, COD and Tasks without signing in again.' },
  { icon: Languages,  title: 'Built for Sri Lanka',      desc: 'Prices in LKR, local payments, and Sinhala and Tamil where you need them.' },
  { icon: Smartphone, title: 'Any device',               desc: 'Works in the browser on desktop, tablet and phone. Nothing to install.' },
  { icon: Wallet,     title: 'Pay for what you use',     desc: 'Each app has its own plan and free trial. Add another app when you need it.' },
];

// Served at the bare domain; src/proxy.ts rewrites "/" here.
export default function HubPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-ink-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <KadeHubLogo width={132} theme="color" />
          <nav className="flex items-center gap-1 sm:gap-2">
            <a href="#products" className="hidden sm:inline px-3 py-2 text-sm font-medium text-ink-600 hover:text-ink-900">Products</a>
            <a href="#why" className="hidden md:inline px-3 py-2 text-sm font-medium text-ink-600 hover:text-ink-900">Why KadeHub</a>
            <a href="/portfolio" className="hidden md:inline px-3 py-2 text-sm font-medium text-ink-600 hover:text-ink-900">Portfolio</a>
            <a href="/apps" className="px-4 py-2 rounded-xl text-sm font-bold kh-btn-primary">Sign in</a>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section style={{ background: 'linear-gradient(180deg, #E0F2F1 0%, #F8FAFC 100%)' }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-20 grid gap-10 md:grid-cols-[1.2fr_1fr] items-center">
            <div className="text-center md:text-left order-2 md:order-1">
              <span className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-white border border-teal-light text-teal-dark">
                <span className="w-2 h-2 rounded-full" style={{ background: '#FFB703' }} />
                Built for Sri Lankan businesses
              </span>
              <h1 className="mt-5 text-3xl sm:text-5xl font-extrabold text-ink-900 leading-tight tracking-tight">
                One account. <span style={{ color: '#00A884' }}>Every tool</span> your business needs.
              </h1>
              <p className="mt-4 text-base sm:text-lg text-ink-500 max-w-xl mx-auto md:mx-0">
                Run your shop counter, your cash-on-delivery orders and the odd jobs around your business, all with a single KadeHub sign-in.
              </p>
              <div className="mt-8 flex flex-wrap gap-3 justify-center md:justify-start">
                <a href="#products" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold kh-btn-primary">
                  Explore the apps <ArrowRight size={16} />
                </a>
                <a href="/apps" className="inline-flex items-center px-6 py-3 rounded-xl text-sm font-bold border-2 border-ink-200 text-ink-700 hover:bg-white">
                  Sign in
                </a>
              </div>
            </div>
            <div className="order-1 md:order-2 flex justify-center">
              <div className="relative flex items-center justify-center">
                <div className="absolute inset-4 rounded-full blur-2xl" style={{ background: 'rgba(255,183,3,0.25)' }} aria-hidden />
                <Mascot width={260} animation="enter" priority className="relative hidden sm:block"
                  alt="KadeHub's capybara mascot holding a cup of tea" />
                <Mascot size="lg" animation="enter" priority className="relative sm:hidden"
                  alt="KadeHub's capybara mascot holding a cup of tea" />
              </div>
            </div>
          </div>
        </section>

        {/* Products */}
        <section id="products" className="scroll-mt-20" style={{ background: '#F8FAFC' }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-ink-900">Our apps</h2>
              <p className="mt-2 text-sm sm:text-base text-ink-500">Each app has its own address and works on its own. Use one, or all of them together.</p>
            </div>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {PRODUCTS.map(p => (
                <ProductCard key={p.slug} product={p} href={productUrl(p.slug, '/')}
                  cta={p.status === 'coming_soon' ? 'Learn more' : `Open ${p.name.replace('KadeHub ', '')}`} />
              ))}
            </div>
          </div>
        </section>

        {/* Why */}
        <section id="why" className="scroll-mt-20 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-ink-900 text-center">Why one KadeHub account</h2>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {BENEFITS.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="rounded-2xl border border-ink-100 p-5">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#E0F2F1' }}>
                    <Icon size={19} style={{ color: '#00796B' }} />
                  </div>
                  <h3 className="mt-4 font-bold text-ink-900">{title}</h3>
                  <p className="mt-1 text-sm text-ink-500">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="px-4 sm:px-6 pb-16 bg-white">
          <div className="max-w-6xl mx-auto rounded-3xl px-6 py-10 sm:px-10 flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left"
            style={{ background: 'linear-gradient(135deg,#004D40 0%,#00796B 55%,#00A884 100%)' }}>
            <Mascot size="md" decorative />
            <div className="flex-1">
              <h2 className="text-xl sm:text-2xl font-extrabold text-white">Start with the app you need today</h2>
              <p className="mt-1 text-sm text-white/75">Every app comes with a free trial. No card needed to begin.</p>
            </div>
            <a href="#products" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold kh-btn-amber">
              Choose an app <ArrowRight size={16} />
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-ink-100 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm">
            {PRODUCTS.map(p => (
              <a key={p.slug} href={productUrl(p.slug, '/')} className="text-ink-500 hover:text-ink-900">{p.name}</a>
            ))}
            <a href="mailto:official.kadehub@gmail.com" className="text-ink-500 hover:text-ink-900">Contact</a>
          </div>
          <p className="text-xs text-ink-400">© {new Date().getFullYear()} KadeHub</p>
        </div>
      </footer>
    </div>
  );
}
