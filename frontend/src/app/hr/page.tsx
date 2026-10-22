import type { Metadata } from 'next';
import {
  Users, CalendarDays, MonitorSmartphone, Plane, Wallet, Share2, Briefcase, Award, Package, BarChart3, Building2, Languages,
  UserPlus, ClipboardList, Clock, BadgeCheck, Store, Utensils, Scissors, Truck,
} from 'lucide-react';
import {
  LandingHeader, LandingHero, LandingStats, LandingFeatures, LandingShowcase, LandingSteps, LandingAudiences,
  LandingFaq, LandingCta, LandingFooter,
} from '../../components/platform/ProductLanding';
import { StaffMock, RosterMock, PayslipMock } from '../../components/platform/ProductMocks';
import StaffPricing from '../../components/hr/site/StaffPricing';

export const metadata: Metadata = {
  title: { absolute: 'KadeHub Staff — Rosters, attendance, leave and payroll for small businesses' },
  description: 'Keep staff records, plan rosters, clock staff in with a PIN, approve leave and run payroll with payslips on WhatsApp. Hiring, reviews and assets included.',
};

// staff.kadehub.com/ — public landing page. The app itself lives at /dashboard (HrRoot skips its sign-in gate here).
export default function StaffLandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <LandingHeader slug="hr"
        links={[{ label: 'Features', href: '#features' }, { label: 'Pricing', href: '#pricing' }, { label: 'FAQ', href: '#faq' }]}
        signIn={{ label: 'Sign in', href: '/login' }}
        cta={{ label: 'Start free', href: '/register' }} />

      <main className="flex-1">
        <LandingHero slug="hr"
          title="Your whole team,"
          highlight="in one place."
          subtitle="Staff records, rosters, clock-in, leave and payroll for shops and small businesses. Payslips go out on WhatsApp, and you always know who is at work."
          primary={{ label: 'Start 14-day free trial', href: '/register' }}
          secondary={{ label: 'Sign in', href: '/login' }}
          points={['No card needed to start', 'Free for up to 3 staff after the trial', 'Works on your phone', 'English and Sinhala']}
          preview={<StaffMock />} />

        <LandingStats slug="hr" items={[
          { value: '14', label: 'day Pro trial' },
          { value: '3', label: 'staff free, for good' },
          { value: '4', label: 'digit PIN clock-in' },
          { value: '1', label: 'tap payslips' },
        ]} />

        <LandingFeatures slug="hr" eyebrow="Features" title="Everything you do for your staff, done properly"
          subtitle="Built for owners who manage people between serving customers, not for an HR department."
          items={[
            { icon: Users,             title: 'Employee records', text: 'Contact, job, emergency contact, bank details and documents such as ID copies and agreements.' },
            { icon: CalendarDays,      title: 'Rosters and shift swaps', text: 'Plan the week with shift templates, copy last week, and approve swaps staff agree between themselves.' },
            { icon: MonitorSmartphone, title: 'Clock-in kiosk', text: 'A shared tablet at the shop: staff tap their name, enter a PIN and clock in, with an optional photo.' },
            { icon: Plane,             title: 'Leave with balances', text: 'Annual, casual, sick and no-pay leave with yearly balances. Approved leave comes off the roster.' },
            { icon: Wallet,            title: 'Payroll', text: 'Monthly, daily or hourly pay with overtime, no-pay days, allowances, bonuses and EPF/ETF worked out.' },
            { icon: Share2,            title: 'Payslips on WhatsApp', text: 'Every payslip is ready to print or send to the employee’s phone.' },
            { icon: Briefcase,         title: 'Hiring', text: 'Post a job, share its page, and move applicants from new to hired. Hiring creates the employee.' },
            { icon: Award,             title: 'Reviews and warnings', text: 'Performance reviews and written warnings on file, acknowledged by the employee with their PIN.' },
            { icon: Package,           title: 'Asset tracking', text: 'Uniforms, keys and phones handed out, returned or lost, with charges on the next payslip.' },
          ]} />

        <LandingShowcase slug="hr" rows={[
          {
            eyebrow: 'Plan the week',
            title: 'A roster everyone can see',
            text: 'Drop shift templates onto the week, copy last week in one tap, and send the roster to the team on WhatsApp. Staff can ask to swap shifts; you approve.',
            bullets: ['Warnings for too many hours and shifts on leave days', 'Lend staff to another branch for a day', 'Swaps go colleague first, then manager'],
            visual: <RosterMock />,
          },
          {
            eyebrow: 'Pay on time',
            title: 'Payroll that reads your attendance',
            text: 'KadeHub Staff takes clock-ins, leave and the roster, works out overtime, late minutes and no-pay days, and takes back salary advances a little each month.',
            bullets: ['EPF and ETF at your own rates', 'Check every payslip before you finalize', 'Bank transfer list and Excel export'],
            visual: <PayslipMock />,
          },
        ]} />

        <LandingSteps slug="hr" eyebrow="How it works" title="From sign-up to first payday" steps={[
          { icon: UserPlus,      title: 'Create your business', text: 'Add your business and first branch. Your 14-day Pro trial starts right away.' },
          { icon: ClipboardList, title: 'Add your staff', text: 'Enter each person once, with their pay and a 4-digit PIN for the kiosk.' },
          { icon: Clock,         title: 'Plan and clock in', text: 'Make the roster, then put the kiosk on a tablet at the shop.' },
          { icon: BadgeCheck,    title: 'Run payroll', text: 'At month end, check the payslips, finalize and send them out.' },
        ]} />

        <LandingAudiences slug="hr" eyebrow="Made for" title="Teams that work in shifts" items={[
          { icon: Store,    title: 'Shops and supermarkets', text: 'Cashiers, store keepers and helpers across opening hours.' },
          { icon: Utensils, title: 'Restaurants and cafés', text: 'Kitchen and floor staff on morning and evening shifts.' },
          { icon: Scissors, title: 'Salons and services', text: 'Small teams paid monthly, daily or by the hour.' },
          { icon: Truck,    title: 'Distribution and delivery', text: 'Drivers and helpers, with vehicles and phones tracked as assets.' },
        ]} />

        <StaffPricing />

        <LandingFeatures slug="hr" id="extras" eyebrow="Also included" title="Small things that save time" items={[
          { icon: Building2, title: 'Branches and managers', text: 'Give each branch a manager who sees only their own staff, never salaries.' },
          { icon: BarChart3, title: 'Reports to Excel', text: 'Payroll, attendance, leave, roster hours, hiring and assets, ready to export.' },
          { icon: Languages, title: 'English and Sinhala', text: 'Switch language any time, on the app and on the kiosk.' },
        ]} />

        <LandingFaq slug="hr" eyebrow="FAQ" title="Questions, answered" items={[
          { q: 'Is there a free trial?', a: 'Yes. Every new business gets 14 days of the Pro plan, with no card needed. After the trial you can stay on Free for up to 3 staff and 1 branch, or choose a plan.' },
          { q: 'Do my staff need their own accounts?', a: 'No. Staff clock in, request leave and ask for shift swaps on the kiosk with a 4-digit PIN. Only owners and branch managers sign in.' },
          { q: 'Can branch managers see salaries?', a: 'No. Managers handle their branch’s roster, attendance, leave, hiring and assets. Pay, payroll and settings are for the owner only.' },
          { q: 'How is EPF and ETF worked out?', a: 'On basic pay after no-pay days, at the rates you set (8%, 12% and 3% to start with). Overtime, allowances and bonuses are left out.' },
          { q: 'What if someone forgets to clock out?', a: 'A manager can fix any punch, and every change is kept in the activity log.' },
          { q: 'Can I use it with KadeHub POS or COD?', a: 'Yes. The same KadeHub account works for every app. Turn Staff on from your app launcher.' },
        ]} />

        <LandingCta slug="hr" title="Ready to stop running your team from a notebook?"
          text="Start your 14-day free trial. Add your first staff member in a couple of minutes."
          action={{ label: 'Start free trial', href: '/register' }} pose="celebrate" />
      </main>

      <LandingFooter slug="hr" blurb="Staff records, rosters, clock-in, leave, payroll, hiring and assets for shops and small businesses." />
    </div>
  );
}
