import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import KadeHubLogo from '../../components/ui/KadeHubLogo';
import CookieChoices from '../../components/platform/CookieChoices';

export const metadata: Metadata = {
  title: 'Privacy notice — KadeHub',
  description: 'What personal data KadeHub collects, why, who receives it, and the choices you have.',
};

const CONTACT_EMAIL = 'official.kadehub@gmail.com';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-lg font-bold tracking-tight text-ink-900">{title}</h2>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-ink-700">{children}</div>
    </section>
  );
}

function List({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5">
      {items.map((item, i) => <li key={i}>{item}</li>)}
    </ul>
  );
}

function Rows({ head, rows }: { head: [string, string]; rows: [string, string][] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white">
      <table className="w-full table-fixed text-left text-sm">
        <thead className="border-b border-ink-200 text-ink-500">
          <tr>
            <th scope="col" className="w-[38%] px-3 py-3 font-semibold sm:w-1/3 sm:px-4">{head[0]}</th>
            <th scope="col" className="px-3 py-3 font-semibold sm:px-4">{head[1]}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-100">
          {rows.map(([a, b]) => (
            <tr key={a} className="align-top">
              <td className="break-words px-3 py-3 font-semibold text-ink-900 sm:px-4">{a}</td>
              <td className="break-words px-3 py-3 sm:px-4">{b}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-ink-50">
      <header className="border-b border-ink-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center px-4 py-4 sm:px-6">
          <a href="/" aria-label="KadeHub home"><KadeHubLogo height={32} /></a>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink-900">Privacy notice</h1>
        <p className="mt-2 text-sm text-ink-500">Last updated 5 November 2026</p>
        <p className="mt-6 text-[15px] leading-relaxed text-ink-700">
          KadeHub provides business apps: POS, COD order management, Staff and Tasks. This notice explains what personal data we
          collect, why we use it, who receives it, and the choices you have. Questions go
          to <a className="font-semibold text-ink-900 underline underline-offset-2" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>

        <Section title="Advertising and your choices">
          <p>
            We advertise on Facebook and Instagram and use the Meta Pixel to see which adverts lead to sign-ups. On our public home,
            product and sign-up pages, the pixel sends Meta the page address, your IP address and browser details, and it uses
            Meta&apos;s cookies to recognise your browser.
          </p>
          <p>
            When you finish signing up, we also send Meta an event naming the app you joined and a hashed copy of your email address.
            Meta uses the hash to match you to an advert and to its own accounts. Hashing scrambles the address, but Meta can still
            match it to anyone who has given it the same email, so treat it as personal data.
          </p>
          <p>
            The pixel doesn&apos;t run inside the apps, on the sign-in page or on job application pages. Meta uses this data as described in
            its <a className="font-semibold text-ink-900 underline underline-offset-2" href="https://www.facebook.com/privacy/policy" target="_blank" rel="noreferrer">Privacy Policy</a>.
          </p>
          <p>
            In the European Economic Area, the UK, Switzerland, and anywhere we can&apos;t tell your location, nothing goes to Meta unless you
            accept. Elsewhere it runs from your first visit to these pages, and you can turn it off. You can change your choice here at any time:
          </p>
          <CookieChoices />
        </Section>

        <Section title="What we collect">
          <List items={[
            <><strong>Your account:</strong> your name, email address, business name, phone number and address. We store passwords only in hashed form.</>,
            <><strong>Business records you add:</strong> customers, orders, delivery details, products, sales, suppliers, expenses, invoices and credit records.</>,
            <><strong>Staff records:</strong> employee details such as identity card number, bank account, pay, attendance and leave, plus job applications and CVs.</>,
            <><strong>Tasks:</strong> your profile, tasks, offers, messages, reviews and attachments. Profiles, tasks and reviews can be public.</>,
            <><strong>Payments:</strong> your plan, amounts, payment status and any bank transfer slip you upload. OnePay handles card payments, and we don&apos;t store card numbers.</>,
            <><strong>Technical data:</strong> your IP address and browser details when you use KadeHub. We also look up your IP&apos;s country to show prices in the right currency.</>,
            <><strong>Emails:</strong> messages you send us, and our replies.</>,
            <><strong>Business contacts:</strong> we may find business email addresses printed on public websites and send a business an introduction. Every sequence stops when someone opts out.</>,
          ]} />
        </Section>

        <Section title="Data about your customers and staff">
          <p>
            When a business uses KadeHub to keep records about its customers, staff or job applicants, that business decides what is
            collected and why, and we process it on its behalf. If you are one of those people, please contact the business first. We will
            help it answer your request.
          </p>
        </Section>

        <Section title="How we use your data">
          <List items={[
            'To provide the apps, including accounts, trials, subscriptions and support.',
            'To keep KadeHub secure, prevent abuse and fix problems.',
            'To send service messages, such as receipts and account notices.',
            'To promote KadeHub, including the advertising described above and business introductions by email.',
            'To meet legal, tax and accounting duties.',
          ]} />
          <p>
            If you are in the European Economic Area or the UK, our legal bases are: performing our contract with you, our legitimate
            interests in running and promoting KadeHub, your consent for advertising cookies and data matching, and legal obligations.
          </p>
        </Section>

        <Section title="Who receives your data">
          <p>We don&apos;t sell your personal data for money. These providers receive it to run KadeHub:</p>
          <Rows head={['Provider', 'What for']} rows={[
            ['Meta', 'Measuring and targeting adverts, within the choices above.'],
            ['Cloudflare', 'Delivering and protecting our websites. It handles all web traffic, including IP addresses.'],
            ['Our hosting and file storage providers', 'Running our servers and database, and storing uploaded files.'],
            ['Google (Gmail)', 'Sending and receiving email.'],
            ['Anthropic (Claude)', 'When our email assistant is on, it reads emails sent to our mailbox and helps write replies and research businesses. A person approves each email before it is sent.'],
            ['OnePay', 'Processing card payments.'],
            ['ipapi.co', 'Finding the country of an IP address, for pricing.'],
            ['Courier companies', 'Delivery and tracking details, when a COD business connects its courier account.'],
          ]} />
          <p>
            We may also share data when the law requires it, or to protect people or KadeHub. If you share an invoice, payslip or roster on
            WhatsApp, it goes to WhatsApp and the people you send it to.
          </p>
          <p>These providers may process data in other countries, so it may be handled under different data protection laws from your own.</p>
        </Section>

        <Section title="Cookies and browser storage">
          <Rows head={['Name', 'What it does']} rows={[
            ['kh_auth', 'Keeps you signed in across KadeHub apps, for up to 7 days. Required.'],
            ['kh_sa_backup', 'Used only when our staff sign in to an account for support. Required for that.'],
            ['kh_consent', 'Remembers your advertising choice for 180 days. Required.'],
            ['Language settings', 'Remembers your language. Required.'],
            ['_fbp, _fbc', "Meta's advertising cookies, which recognise your browser and the advert you came from. Set by the pixel, within the choices above, and they last up to 90 days."],
          ]} />
        </Section>

        <Section title="How long we keep data">
          <p>
            We keep account and business records while your account is active. After that we keep what we need for legal, tax and accounting
            duties or to settle disputes, and delete or anonymise the rest when you ask us to.
          </p>
        </Section>

        <Section title="Your rights">
          <p>
            Depending on where you live, you can ask to see, correct, delete or export your data, object to or limit how we use it, and
            withdraw consent. You can always opt out of marketing. Email <a className="font-semibold text-ink-900 underline underline-offset-2" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> and
            we&apos;ll reply as soon as we can. You can also complain to your local data protection authority.
          </p>
        </Section>

        <Section title="Children">
          <p>KadeHub is made for businesses and isn&apos;t meant for children.</p>
        </Section>

        <Section title="Changes to this notice">
          <p>We update this page when our practices change and revise the date at the top.</p>
        </Section>
      </main>
    </div>
  );
}
