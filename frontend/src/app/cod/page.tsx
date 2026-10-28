import type { Metadata } from 'next';
import {
  Truck, Calculator, PackageCheck, FileText, Share2, BarChart3, BookImage, Languages, Palette, Wallet, Search,
  Layers, UserPlus, PackagePlus, ClipboardList, TrendingUp, ShoppingBag, Plane, Shirt, Sparkles,
} from 'lucide-react';
import {
  LandingHeader, LandingHero, LandingStats, LandingFeatures, LandingShowcase, LandingSteps, LandingAudiences,
  LandingFaq, LandingCta, LandingFooter,
} from '../../components/platform/ProductLanding';
import { CodMock, LandedCostMock, ShareMock } from '../../components/platform/ProductMocks';
import CodPricing from '../../components/cod/CodPricing';

export const metadata: Metadata = {
  title: { absolute: 'KadeHub COD — Cash-on-delivery orders, costs and invoices' },
  description: 'Run your cash-on-delivery business: track landed costs, move orders from pending to delivered, share invoices on WhatsApp and see your real profit.',
};

// cod.kadehub.com/ — public landing page. The app itself lives at /dashboard (CodRoot skips its sign-in gate here).
export default function CodLandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <LandingHeader slug="cod"
        links={[{ label: 'Features', href: '#features' }, { label: 'Pricing', href: '#pricing' }, { label: 'FAQ', href: '#faq' }]}
        signIn={{ label: 'Sign in', href: '/login' }}
        cta={{ label: 'Start free', href: '/register' }} />

      <main className="flex-1">
        <LandingHero slug="cod"
          title="Every cash-on-delivery order,"
          highlight="under control."
          subtitle="Know what each item really costs you, move orders from pending to delivered, and send invoices to customers in a tap."
          primary={{ label: 'Start free', href: '/register' }}
          secondary={{ label: 'Sign in', href: '/login' }}
          points={['No card needed to start', 'Invoices in English, Sinhala or Tamil', 'Works on your phone', 'Set up in under 5 minutes']}
          preview={<CodMock />} />

        <LandingStats slug="cod" items={[
          { value: '6', label: 'order stages' },
          { value: '50', label: 'free orders every month' },
          { value: '3', label: 'invoice languages' },
          { value: '1', label: 'tap to share' },
        ]} />

        <LandingFeatures slug="cod" eyebrow="Features" title="Everything a COD business runs on"
          subtitle="Built around how cash-on-delivery sellers actually work: buy, list, take orders, deliver, collect."
          items={[
            { icon: Truck,        title: 'Order pipeline', text: 'Pending, confirmed, ongoing, delivered, returned and cancelled, with status cards and totals.' },
            { icon: Calculator,   title: 'Landed cost calculator', text: 'Buying price in any currency, exchange rate, shipping, customs and other costs per item.' },
            { icon: PackageCheck, title: 'Stock that follows orders', text: 'Stock goes down when an order is delivered and comes back if it is returned.' },
            { icon: FileText,     title: 'Printable invoices', text: 'Numbered invoices with your logo and brand colour, ready to print or save as PDF.' },
            { icon: Share2,       title: 'WhatsApp sharing', text: 'Send order details and the invoice PDF straight to your customer.' },
            { icon: BookImage,    title: 'Catalog generator', text: 'Turn your items into a neat catalog and share it as PDF or images.' },
            { icon: BarChart3,    title: 'Reports and profit', text: 'Revenue, cost of goods, expenses and net profit for any date range.' },
            { icon: Wallet,       title: 'Expense tracking', text: 'Log rent, ads, delivery and other costs by category.' },
            { icon: Search,       title: 'Find anything fast', text: 'Search orders by invoice, customer or phone, and filter by date.' },
          ]} />

        <LandingShowcase slug="cod" rows={[
          {
            eyebrow: 'Know your numbers',
            title: 'See the real cost of every item',
            text: 'Add the buying price, exchange rate, shipping and customs once. KadeHub COD works out the landed cost, your profit per unit and your margin.',
            bullets: ['Buy in USD, CNY or LKR with your own exchange rate', 'Profit and margin shown next to every item', 'Turn off import fields if you buy locally'],
            visual: <LandedCostMock />,
          },
          {
            eyebrow: 'Keep customers in the loop',
            title: 'Share orders and invoices on WhatsApp',
            text: 'One tap opens a WhatsApp chat with the full order details, or shares the invoice PDF through any app on your phone.',
            bullets: ['Order message written for you', 'Invoice PDF with your logo and footer', 'Sinhala and Tamil names print correctly'],
            visual: <ShareMock />,
          },
        ]} />

        <LandingSteps slug="cod" eyebrow="How it works" title="From first item to first delivery" steps={[
          { icon: UserPlus,      title: 'Create your business', text: 'Pick your business type and brand colour. You can take orders right away.' },
          { icon: PackagePlus,   title: 'Add your items', text: 'Enter costs once and see profit per item instantly.' },
          { icon: ClipboardList, title: 'Take orders', text: 'Pick items, add the customer and the invoice number is created for you.' },
          { icon: TrendingUp,    title: 'Deliver and grow', text: 'Mark orders delivered, collect cash and watch your profit in reports.' },
        ]} />

        <LandingAudiences slug="cod" eyebrow="Made for" title="Sellers who deliver to the door" items={[
          { icon: ShoppingBag, title: 'Social-media shops', text: 'Sell on Facebook, Instagram or TikTok and deliver cash on delivery.' },
          { icon: Plane,       title: 'Importers', text: 'Buy abroad, add shipping and customs, and price with confidence.' },
          { icon: Shirt,       title: 'Fashion and beauty', text: 'Business-type presets rename sections and suggest categories for you.' },
          { icon: Sparkles,    title: 'Growing brands', text: 'Your logo and colour on invoices, catalogs and across the app.' },
        ]} />

        <CodPricing />

        <LandingFeatures slug="cod" id="extras" eyebrow="Also included" title="Small things that save time" items={[
          { icon: Languages, title: 'Three languages', text: 'Use the app in English, Sinhala or Tamil. Invoices and catalogs follow your choice.' },
          { icon: Palette,   title: 'Your brand', text: 'Logo, brand colour, tagline and invoice footer, applied everywhere.' },
          { icon: Layers,    title: 'Bulk updates', text: 'Select many orders and change their status at once (Premium).' },
        ]} />

        <LandingFaq slug="cod" eyebrow="FAQ" title="Questions, answered" items={[
          { q: 'Is it free?', a: 'Yes. Your first 50 orders every month are free, with no time limit. No card is needed to start.' },
          { q: 'What if I need more than 50 orders a month?', a: 'Choose a bigger plan from the billing page. If a plan ends, you carry on with 50 free orders a month and your items, orders and settings stay as they are.' },
          { q: 'How do I pay?', a: 'By bank transfer (upload your slip from the billing page) or by online card payment.' },
          { q: 'Does stock update automatically?', a: 'Yes. Stock is reduced when an order is marked delivered and restored if the order is returned or cancelled after delivery.' },
          { q: 'Can I use it with KadeHub POS?', a: 'Yes. The same KadeHub account works for both. Turn COD on from your app launcher.' },
          { q: 'Which languages are supported?', a: 'English, Sinhala and Tamil, including printed invoices and catalogs.' },
        ]} />

        <LandingCta slug="cod" title="Ready to run your COD business properly?"
          text="Start free with 50 orders every month. It takes less than five minutes to set up."
          action={{ label: 'Start free', href: '/register' }} pose="celebrate" />
      </main>

      <LandingFooter slug="cod" blurb="Cash-on-delivery orders, landed costs, invoices and reports for sellers who deliver to the door." />
    </div>
  );
}
