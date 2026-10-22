import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import {
  KeyRound, Languages, Smartphone, Wallet, ArrowRight, Check, ChevronDown, QrCode, WifiOff, Boxes, CalendarClock,
  Users, Truck, BarChart3, Receipt, Calculator, PackageCheck, FileText, Share2,
  UserPlus, LayoutGrid, Rocket, Sparkles, ShieldCheck, Store, BadgeCheck, CalendarDays, MonitorSmartphone, Plane, Briefcase, Package,
} from 'lucide-react';
import KadeHubLogo from '../../components/ui/KadeHubLogo';
import ProductCard from '../../components/platform/ProductCard';
import ProductIcon from '../../components/platform/ProductIcon';
import Reveal from '../../components/platform/Reveal';
import Mascot from '../../components/brand/Mascot';
import InteractiveMascot from '../../components/brand/InteractiveMascot';
import { LISTED_PRODUCTS, getProduct, productUrl, type ProductSlug } from '../../lib/platform';
import { PosMock, CodMock, StaffMock } from '../../components/platform/ProductMocks';

export const metadata: Metadata = {
  title: 'KadeHub — Business apps for growing businesses',
  description: 'One KadeHub account for every tool your business needs: POS for shops, COD order management and staff management.',
};

const TRUST = [
  { icon: Sparkles,   text: 'Free trial on every paid app' },
  { icon: KeyRound,   text: 'One sign-in for all apps' },
  { icon: Smartphone, text: 'Works on phone, tablet and desktop' },
  { icon: Languages,  text: 'English, Sinhala and Tamil' },
];

const STATS = [
  { value: '3', label: 'apps, one account' },
  { value: '14', label: 'day free trial' },
  { value: '3', label: 'languages' },
  { value: '0', label: 'things to install' },
];

type Detail = {
  slug: ProductSlug;
  title: string;
  body: string;
  bestFor: string;
  features: { icon: typeof Check; title: string; text: string }[];
  mock: ReactNode;
};

const DETAILS: Detail[] = [
  {
    slug: 'pos',
    title: 'A fast counter, a tidy stockroom',
    body: 'Ring up sales in seconds, keep every product counted, and see how the day went before you lock up.',
    bestFor: 'Grocery stores, pharmacies, hardware and retail shops',
    features: [
      { icon: QrCode,        title: 'Every way to pay', text: 'Cash, card, QR and credit sales at one till.' },
      { icon: WifiOff,       title: 'Keeps selling offline', text: 'Sales are saved and synced when you are back online.' },
      { icon: Boxes,         title: 'Stock you can trust', text: 'Live stock levels with low-stock alerts.' },
      { icon: CalendarClock, title: 'Batches and expiry', text: 'Track batches and see what is about to expire.' },
      { icon: Users,         title: 'Customers and loyalty', text: 'Customer history, credit and loyalty points.' },
      { icon: BarChart3,     title: 'Reports and staff', text: 'Daily sales, top products, shifts and cashier performance.' },
    ],
    mock: <PosMock />,
  },
  {
    slug: 'cod',
    title: 'Every cash-on-delivery order, under control',
    body: 'Know what each item really costs you, move orders from pending to delivered, and send invoices in a tap.',
    bestFor: 'Online sellers, importers and social-media shops',
    features: [
      { icon: Truck,        title: 'Order pipeline', text: 'Pending, confirmed, ongoing, delivered, returned, cancelled.' },
      { icon: Calculator,   title: 'Landed cost', text: 'Buying price, shipping and customs worked out per item.' },
      { icon: PackageCheck, title: 'Stock follows orders', text: 'Stock goes down on delivery and back up on returns.' },
      { icon: FileText,     title: 'Invoices and catalogs', text: 'Printable invoices and product catalogs as PDF or JPG.' },
      { icon: Share2,       title: 'Share on WhatsApp', text: 'Send order details and invoices straight to customers.' },
      { icon: Receipt,      title: 'Profit you can see', text: 'Revenue, expenses and net profit for any date range.' },
    ],
    mock: <CodMock />,
  },
  {
    slug: 'hr',
    title: 'Your whole team, in one place',
    body: 'Keep staff records, plan the roster, clock people in with a PIN, approve leave and run payroll with payslips on WhatsApp.',
    bestFor: 'Shops, restaurants, salons and any business with shift workers',
    features: [
      { icon: CalendarDays,      title: 'Rosters and swaps', text: 'Plan the week, copy last week and approve shift swaps.' },
      { icon: MonitorSmartphone, title: 'Clock-in kiosk', text: 'Staff clock in on a shared tablet with a PIN and photo.' },
      { icon: Plane,             title: 'Leave and balances', text: 'Requests, approvals and yearly balances for every leave type.' },
      { icon: Wallet,            title: 'Payroll and payslips', text: 'Overtime, no-pay, EPF/ETF and advances, payslips on WhatsApp.' },
      { icon: Briefcase,         title: 'Hiring', text: 'Share a job page and move applicants through to hired.' },
      { icon: Package,           title: 'Reviews and assets', text: 'Reviews, warnings and who holds which uniform or key.' },
    ],
    mock: <StaffMock />,
  },
];

const STEPS = [
  { icon: UserPlus,   title: 'Create one account', text: 'Sign up from any KadeHub app. It takes a minute.' },
  { icon: LayoutGrid, title: 'Pick your apps',     text: 'Start with one app and add the others whenever you need them.' },
  { icon: Rocket,     title: 'Run your business',  text: 'Move between apps with the same login, on any device.' },
];

const BENEFITS = [
  { icon: KeyRound,    title: 'One login',             text: 'Sign in once and move between POS, COD and Staff without signing in again.' },
  { icon: Languages,   title: 'Your language',         text: 'Local currency and payments, with Sinhala and Tamil where you need them.' },
  { icon: Smartphone,  title: 'Any device',            text: 'Works in the browser on desktop, tablet and phone. Nothing to install.' },
  { icon: Wallet,      title: 'Pay for what you use',  text: 'Each app has its own plan and free trial. Add another app when you need it.' },
  { icon: Store,       title: 'Your own shop address', text: 'POS shops get their own web address, like yourshop.kadehub.com.' },
  { icon: ShieldCheck, title: 'Your data stays yours', text: 'Every business sees only its own data, in every app.' },
];

const FAQS = [
  { q: 'Do I need a separate account for each app?', a: 'No. One KadeHub account signs you in to POS, COD and Staff. Sign in on one and you are signed in on the others.' },
  { q: 'Is there a free trial?', a: 'Yes. POS and COD start with a 14-day free trial, no card needed. Staff starts with 14 days of Pro, then stays free for up to 3 staff.' },
  { q: 'How do I pay for a plan?', a: 'From the billing page inside each app, by bank transfer (upload your slip) or by online card payment.' },
  { q: 'Can I use more than one app?', a: 'Yes. Open the app launcher after you sign in and turn on any other app for the same account.' },
  { q: 'Which languages are supported?', a: 'English and Sinhala across the apps. KadeHub COD is also fully available in Tamil, including invoices and catalogs.' },
];

// Served at the bare domain; src/proxy.ts rewrites "/" here.
export default function HubPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-ink-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <KadeHubLogo width={132} theme="color" />
          <nav className="flex items-center gap-1 sm:gap-2">
            <a href="#products" className="hidden sm:inline px-3 py-2 text-sm font-medium text-ink-600 hover:text-ink-900">Products</a>
            <a href="#how" className="hidden md:inline px-3 py-2 text-sm font-medium text-ink-600 hover:text-ink-900">How it works</a>
            <a href="#faq" className="hidden md:inline px-3 py-2 text-sm font-medium text-ink-600 hover:text-ink-900">FAQ</a>
            <a href="/portfolio" className="hidden lg:inline px-3 py-2 text-sm font-medium text-ink-600 hover:text-ink-900">Portfolio</a>
            <a href="/apps" className="px-4 py-2 rounded-xl text-sm font-bold kh-btn-primary">Sign in</a>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden" style={{ background: 'linear-gradient(180deg, #E0F2F1 0%, #F8FAFC 100%)' }}>
          <div className="hub-blob absolute -top-24 -left-24 w-80 h-80 rounded-full blur-3xl" style={{ background: 'rgba(0,168,132,.14)' }} aria-hidden />
          <div className="hub-blob hub-blob-2 absolute -bottom-32 right-0 w-96 h-96 rounded-full blur-3xl" style={{ background: 'rgba(255,183,3,.14)' }} aria-hidden />
          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-20 grid gap-10 md:grid-cols-[1.2fr_1fr] items-center">
            <div className="text-center md:text-left order-2 md:order-1">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/80 border border-ink-100 p-1 pr-3 text-xs font-semibold text-ink-600">
                {LISTED_PRODUCTS.map(p => <ProductIcon key={p.slug} slug={p.slug} color={p.color} size={24} />)}
                <span className="ml-1">POS · COD · Staff</span>
              </div>
              <h1 className="mt-5 text-3xl sm:text-5xl font-extrabold text-ink-900 leading-tight tracking-tight">
                One account. <span style={{ color: '#00796B' }}>Every tool</span> your business needs.
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
              <ul className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 max-w-xl mx-auto md:mx-0 text-left">
                {TRUST.map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-center gap-2 text-sm text-ink-600">
                    <Icon size={16} className="flex-shrink-0" style={{ color: '#00796B' }} /> {text}
                  </li>
                ))}
              </ul>
            </div>
            <div className="order-1 md:order-2 flex justify-center pt-12 md:pt-0">
              <div className="relative flex items-center justify-center">
                <div className="absolute inset-4 rounded-full blur-2xl" style={{ background: 'rgba(255,183,3,0.25)' }} aria-hidden />
                <InteractiveMascot width="clamp(170px, 30vw, 260px)" priority className="relative kh-mascot-enter"
                  greeting="Hi there! Welcome to KadeHub."
                  messages={[
                    'One account opens POS, COD and Staff.',
                    'Every app comes with a free trial.',
                    'Pick an app below to get started!',
                  ]} />
              </div>
            </div>
          </div>

          {/* Stats strip */}
          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pb-12">
            <Reveal>
              <div className="grid grid-cols-2 sm:grid-cols-4 rounded-2xl bg-white border border-ink-100 shadow-sm divide-x divide-y sm:divide-y-0 divide-ink-100">
                {STATS.map(s => (
                  <div key={s.label} className="px-4 py-5 text-center">
                    <p className="text-2xl sm:text-3xl font-extrabold" style={{ color: '#00796B' }}>{s.value}</p>
                    <p className="mt-0.5 text-xs sm:text-sm text-ink-500">{s.label}</p>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* Products overview */}
        <section id="products" className="scroll-mt-20" style={{ background: '#F8FAFC' }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
            <Reveal className="text-center max-w-2xl mx-auto">
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#00796B' }}>Our apps</p>
              <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-ink-900">Three apps. One KadeHub.</h2>
              <p className="mt-2 text-sm sm:text-base text-ink-500">Each app has its own address and works on its own. Use one, or all of them together.</p>
            </Reveal>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {LISTED_PRODUCTS.map((p, i) => (
                <Reveal key={p.slug} delay={i * 120} className="flex flex-col">
                  <ProductCard product={p} href={productUrl(p.slug, '/')}
                    cta={p.status === 'coming_soon' ? 'Learn more' : `Open ${p.name.replace('KadeHub ', '')}`} />
                  <a href={`#${p.slug}`} className="mt-2 text-center text-xs font-semibold text-ink-400 hover:text-ink-700">
                    See what’s inside ↓
                  </a>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Product deep dives */}
        {DETAILS.map((d, i) => {
          const product = getProduct(d.slug)!;
          const flip = i % 2 === 1;
          return (
            <section key={d.slug} id={d.slug} className={`scroll-mt-20 ${flip ? 'bg-[#F8FAFC]' : 'bg-white'}`}>
              <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 grid gap-10 lg:grid-cols-2 items-center">
                <Reveal className={flip ? 'lg:order-2' : ''}>
                  <div className="group flex items-center gap-3">
                    <ProductIcon slug={d.slug} color={product.color} size={44} />
                    <p className="text-xs font-bold uppercase tracking-widest" style={{ color: product.color }}>{product.name}</p>
                  </div>
                  <h2 className="mt-4 text-2xl sm:text-3xl font-extrabold text-ink-900 leading-tight">{d.title}</h2>
                  <p className="mt-3 text-ink-500">{d.body}</p>
                  <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-ink-600 bg-ink-100 rounded-full px-3 py-1">
                    <BadgeCheck size={14} style={{ color: product.color }} /> Best for: {d.bestFor}
                  </p>
                  <ul className="mt-6 grid gap-4 sm:grid-cols-2">
                    {d.features.map(({ icon: Icon, title, text }) => (
                      <li key={title} className="kh-ficon-wrap flex gap-3">
                        <span className="kh-ficon w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: `color-mix(in srgb, ${product.color} 14%, white)`, color: product.color }}>
                          <Icon size={18} />
                        </span>
                        <span>
                          <span className="block text-sm font-bold text-ink-800">{title}</span>
                          <span className="block text-sm text-ink-500">{text}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-7 flex flex-wrap gap-3">
                    <a href={productUrl(d.slug, '/')} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90"
                      style={{ background: product.color }}>
                      Open {product.name.replace('KadeHub ', '')} <ArrowRight size={15} />
                    </a>
                    <a href={productUrl(d.slug, '/register')} className="inline-flex items-center px-5 py-2.5 rounded-xl text-sm font-bold border-2 border-ink-200 text-ink-700 hover:bg-white">
                      Start free trial
                    </a>
                  </div>
                </Reveal>
                <Reveal delay={150} className={flip ? 'lg:order-1' : ''}>
                  {d.mock}
                </Reveal>
              </div>
            </section>
          );
        })}

        {/* How it works */}
        <section id="how" className="scroll-mt-20 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
            <Reveal className="text-center max-w-2xl mx-auto">
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#00796B' }}>How it works</p>
              <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-ink-900">Up and running in minutes</h2>
            </Reveal>
            <Reveal className="relative mt-12">
              <div className="hub-connector hidden md:block absolute top-7 left-[16%] right-[16%] h-1 rounded-full" aria-hidden />
              <ol className="relative grid gap-8 md:grid-cols-3">
                {STEPS.map(({ icon: Icon, title, text }, i) => (
                  <li key={title} className="group text-center">
                    <span className="kh-ficon relative mx-auto w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-md"
                      style={{ background: 'linear-gradient(135deg,#00796B,#00796B)' }}>
                      <Icon size={24} />
                      <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white text-xs font-extrabold flex items-center justify-center shadow"
                        style={{ color: '#00796B' }}>{i + 1}</span>
                    </span>
                    <h3 className="mt-4 font-bold text-ink-900">{title}</h3>
                    <p className="mt-1 text-sm text-ink-500 max-w-xs mx-auto">{text}</p>
                  </li>
                ))}
              </ol>
            </Reveal>
          </div>
        </section>

        {/* Benefits */}
        <section id="why" className="scroll-mt-20" style={{ background: '#F8FAFC' }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
            <Reveal className="text-center max-w-2xl mx-auto">
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#00796B' }}>Why KadeHub</p>
              <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-ink-900">Built to make running a business simpler</h2>
            </Reveal>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {BENEFITS.map(({ icon: Icon, title, text }, i) => (
                <Reveal key={title} delay={(i % 3) * 100} className="h-full">
                  <div className="group h-full rounded-2xl bg-white border border-ink-100 p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
                    <span className="kh-ficon w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#E0F2F1' }}>
                      <Icon size={19} style={{ color: '#00796B' }} />
                    </span>
                    <h3 className="mt-4 font-bold text-ink-900">{title}</h3>
                    <p className="mt-1 text-sm text-ink-500">{text}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-20 bg-white">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
            <Reveal className="text-center">
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#00796B' }}>FAQ</p>
              <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-ink-900">Questions, answered</h2>
            </Reveal>
            <div className="mt-8 space-y-3">
              {FAQS.map(f => (
                <details key={f.q} className="group rounded-2xl border border-ink-100 bg-white px-5 py-4 open:shadow-sm">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-ink-800 [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <ChevronDown size={18} className="flex-shrink-0 text-ink-400 transition-transform duration-300 group-open:rotate-180" />
                  </summary>
                  <p className="mt-3 text-sm text-ink-500">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="px-4 sm:px-6 pb-16 bg-white">
          <Reveal>
            <div className="max-w-6xl mx-auto rounded-3xl px-6 py-10 sm:px-10 flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left"
              style={{ background: 'linear-gradient(135deg,#004D40 0%,#00796B 55%,#00796B 100%)' }}>
              <Mascot pose="love" size="md" decorative />
              <div className="flex-1">
                <h2 className="text-xl sm:text-2xl font-extrabold text-white">Start with the app you need today</h2>
                <p className="mt-1 text-sm text-white/75">Every app comes with a free trial. No card needed to begin.</p>
              </div>
              <a href="#products" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold kh-btn-amber">
                Choose an app <ArrowRight size={16} />
              </a>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-ink-100 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <KadeHubLogo width={124} theme="color" />
            <p className="mt-3 text-sm text-ink-500 max-w-sm">Business apps that share one account: point of sale, cash-on-delivery orders and staff management.</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-ink-400">Apps</p>
            <ul className="mt-3 space-y-2 text-sm">
              {LISTED_PRODUCTS.map(p => (
                <li key={p.slug}><a href={productUrl(p.slug, '/')} className="text-ink-600 hover:text-ink-900">{p.name}</a></li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-ink-400">Company</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li><a href="/portfolio" className="text-ink-600 hover:text-ink-900">Portfolio</a></li>
              <li><a href="#faq" className="text-ink-600 hover:text-ink-900">FAQ</a></li>
              <li><a href="mailto:official.kadehub@gmail.com" className="text-ink-600 hover:text-ink-900">Contact us</a></li>
              <li><a href="/apps" className="text-ink-600 hover:text-ink-900">Sign in</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-ink-100">
          <p className="max-w-6xl mx-auto px-4 sm:px-6 py-5 text-xs text-ink-400">© {new Date().getFullYear()} KadeHub. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
