import type { ReactNode } from 'react';
import {
  ShoppingCart, QrCode, FileText, Truck, Hammer, Star, Check, Calculator, Share2, MessageCircle, Lock, FileDown,
} from 'lucide-react';
import './product-landing.css';

/*
 * Decorative product previews for the landing pages (hub, cod., tasks.). They are illustrations,
 * not live data, and animate once their surrounding <Reveal> marks itself .is-in.
 */

export function MockFrame({ children, color, label }: { children: ReactNode; color: string; label: string }) {
  return (
    <div className="hub-mock relative mx-auto w-full max-w-md rounded-3xl p-3 sm:p-4" style={{ background: `color-mix(in srgb, ${color} 10%, white)` }}
      role="img" aria-label={label}>
      <div className="rounded-2xl bg-white shadow-lg border border-ink-100 overflow-hidden">{children}</div>
    </div>
  );
}

function MockHeader({ icon, title, meta, color }: { icon: ReactNode; title: string; meta?: string; color: string }) {
  return (
    <div className="flex items-center justify-between px-5 py-3 border-b border-ink-100">
      <span className="flex items-center gap-2 text-sm font-bold text-ink-800"><span style={{ color }}>{icon}</span> {title}</span>
      {meta && <span className="text-2xs font-semibold text-ink-400">{meta}</span>}
    </div>
  );
}

/* ── POS ── */

export function PosMock() {
  const lines = [['Basmati rice 5kg', '1,450.00'], ['Milk powder 400g', '1,180.00'], ['Soap bar × 3', '435.00'], ['Tea leaves 200g', '620.00']];
  return (
    <MockFrame color="#00796B" label="Preview of a POS sale being rung up">
      <MockHeader icon={<ShoppingCart size={16} />} title="Sale #1042" meta="Counter 1" color="#00796B" />
      <div className="relative mx-5 mt-4 h-14 rounded-xl bg-ink-50 border border-dashed border-ink-200 flex items-center justify-center overflow-hidden">
        <span className="flex gap-[3px]" aria-hidden>
          {[3, 1, 2, 1, 3, 2, 1, 1, 3, 1, 2, 3, 1, 2, 1, 3, 2, 1].map((w, i) => (
            <span key={i} className="block h-8 bg-ink-700 rounded-[1px]" style={{ width: w }} />
          ))}
        </span>
        <span className="hub-beam" />
      </div>
      <ul className="px-5 pt-3">
        {lines.map(([name, price]) => (
          <li key={name} className="hub-pos-line flex justify-between py-1.5 text-sm border-b border-ink-50">
            <span className="text-ink-600">{name}</span><span className="font-semibold text-ink-800">{price}</span>
          </li>
        ))}
      </ul>
      <div className="hub-pos-total flex items-center justify-between px-5 py-4">
        <span className="text-sm font-bold text-ink-800">Total</span>
        <span className="flex items-center gap-2">
          <span className="hub-paid inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-2xs font-bold" style={{ background: '#E0F2F1', color: '#00796B' }}>
            <QrCode size={12} /> Paid · QR
          </span>
          <span className="text-lg font-extrabold" style={{ color: '#00796B' }}>Rs 3,685.00</span>
        </span>
      </div>
    </MockFrame>
  );
}

/* ── COD ── */

export function CodMock() {
  const steps = ['Pending', 'Confirmed', 'Ongoing', 'Delivered'];
  return (
    <MockFrame color="#2563EB" label="Preview of a cash-on-delivery order moving to delivered">
      <MockHeader icon={<FileText size={16} />} title="INV-2026-0042" meta="Cash on delivery" color="#2563EB" />
      <div className="px-5 py-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-ink-500">Customer</span><span className="font-semibold text-ink-800">Nimali P.</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-sm">
          <span className="text-ink-500">Wireless earbuds × 2</span><span className="font-semibold text-ink-800">Rs 9,800.00</span>
        </div>
        <div className="mt-8 hub-track">
          <span className="hub-track-fill" />
          <span className="hub-truck"><Truck size={20} /></span>
        </div>
        <ol className="mt-4 grid grid-cols-4 gap-1.5">
          {steps.map(s => (
            <li key={s} className="hub-step rounded-lg px-1 py-1.5 text-center text-2xs font-bold bg-ink-100 text-ink-500">{s}</li>
          ))}
        </ol>
      </div>
      <div className="grid grid-cols-3 border-t border-ink-100 text-center">
        {[['Landed cost', 'Rs 3,120'], ['Profit / unit', 'Rs 1,780'], ['Margin', '36%']].map(([k, v]) => (
          <div key={k} className="px-2 py-3">
            <p className="text-2xs text-ink-400">{k}</p>
            <p className="text-sm font-extrabold text-ink-800">{v}</p>
          </div>
        ))}
      </div>
    </MockFrame>
  );
}

export function LandedCostMock() {
  const rows: [string, string, boolean?][] = [
    ['Buying price  $12.00 × 300', 'Rs 3,600'],
    ['Shipping', 'Rs 400'],
    ['Customs', 'Rs 250'],
    ['Landed cost', 'Rs 4,250', true],
    ['Selling price', 'Rs 6,500'],
  ];
  return (
    <MockFrame color="#2563EB" label="Preview of the landed cost calculator">
      <MockHeader icon={<Calculator size={16} />} title="Smart watch · SW-21" meta="Cost calculator" color="#2563EB" />
      <ul className="px-5 py-3">
        {rows.map(([k, v, strong]) => (
          <li key={k} className={`lm-in flex justify-between py-2 text-sm ${strong ? 'border-y border-ink-100 font-bold text-ink-900' : 'text-ink-600'}`}>
            <span>{k}</span><span className={strong ? 'text-blue-700' : 'font-semibold text-ink-800'}>{v}</span>
          </li>
        ))}
        <li className="lm-in mt-2 flex items-center justify-between rounded-xl px-3 py-3" style={{ background: '#DBEAFE' }}>
          <span className="text-sm font-bold text-blue-800">Profit per unit</span>
          <span className="text-right">
            <span className="block text-lg font-extrabold text-blue-800">Rs 2,250</span>
            <span className="block text-2xs font-semibold text-blue-700">35% margin</span>
          </span>
        </li>
      </ul>
    </MockFrame>
  );
}

export function ShareMock() {
  return (
    <MockFrame color="#2563EB" label="Preview of an invoice shared on WhatsApp">
      <MockHeader icon={<Share2 size={16} />} title="Share order" meta="WhatsApp" color="#16A34A" />
      <div className="px-4 py-4 space-y-2.5" style={{ background: '#F0FDF4' }}>
        <div className="lm-in ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-white px-3.5 py-2.5 text-sm text-ink-700 shadow-sm">
          <p className="font-bold text-ink-900">Order INV-2026-0042</p>
          <p className="mt-1">Wireless earbuds × 2 — Rs 9,800</p>
          <p>Delivery: tomorrow · Pay on delivery</p>
        </div>
        <div className="lm-in ml-auto max-w-[85%] flex items-center gap-2 rounded-2xl rounded-tr-sm bg-white px-3.5 py-2.5 shadow-sm">
          <span className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ background: '#EF4444' }}><FileDown size={16} /></span>
          <span className="text-sm"><span className="block font-semibold text-ink-800">INV-2026-0042.pdf</span><span className="text-2xs text-ink-400">Invoice · 1 page</span></span>
        </div>
        <div className="lm-in max-w-[70%] rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-sm text-ink-800 shadow-sm" style={{ background: '#DCFCE7' }}>
          Thank you! I&apos;ll be home after 5 🙏
        </div>
      </div>
    </MockFrame>
  );
}

/* ── Tasks ── */

export function TasksMock() {
  const offers = [
    { initials: 'KS', name: 'Kasun S.', rating: '4.9', price: 'Rs 5,500', picked: false },
    { initials: 'DR', name: 'Dilini R.', rating: '5.0', price: 'Rs 6,000', picked: true },
    { initials: 'AM', name: 'Amal M.', rating: '4.7', price: 'Rs 6,800', picked: false },
  ];
  return (
    <MockFrame color="#F59E0B" label="Preview of offers arriving on a posted task">
      <div className="px-5 py-4 border-b border-ink-100">
        <p className="flex items-center gap-2 text-sm font-bold text-ink-800"><Hammer size={16} style={{ color: '#B45309' }} /> Assemble a wardrobe</p>
        <p className="mt-1 text-xs text-ink-400">Budget Rs 6,000 · Tomorrow · In person</p>
      </div>
      <ul className="px-4 py-3 space-y-2">
        {offers.map(o => (
          <li key={o.name} className={`hub-offer ${o.picked ? 'hub-offer-picked' : ''} flex items-center gap-3 rounded-xl border border-ink-100 px-3 py-2.5`}>
            <span className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-ink-900 flex-shrink-0" style={{ background: '#F59E0B' }}>{o.initials}</span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-semibold text-ink-800">{o.name}</span>
              <span className="flex items-center gap-1 text-2xs text-ink-400"><Star size={11} className="fill-current" style={{ color: '#B45309' }} /> {o.rating}</span>
            </span>
            <span className="text-sm font-extrabold text-ink-800">{o.price}</span>
            {o.picked && (
              <span className="hub-accepted inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-2xs font-bold" style={{ background: '#FFF8E1', color: '#B45309' }}>
                <Check size={11} /> Accepted
              </span>
            )}
          </li>
        ))}
      </ul>
    </MockFrame>
  );
}

export function QaMock() {
  return (
    <MockFrame color="#F59E0B" label="Preview of public questions and private messages on a task">
      <MockHeader icon={<MessageCircle size={16} />} title="Questions" meta="Public" color="#F59E0B" />
      <ul className="px-4 py-3 space-y-2.5">
        <li className="lm-in rounded-xl bg-ink-50 px-3 py-2.5 text-sm">
          <p className="text-2xs font-bold text-ink-500">Kasun S. asked</p>
          <p className="text-ink-700">Is the wardrobe already delivered? Call me on <span className="whitespace-nowrap rounded bg-ink-200 px-1 font-mono text-xs text-ink-500">07• ••• ••••</span></p>
        </li>
        <li className="lm-in ml-6 rounded-xl px-3 py-2.5 text-sm" style={{ background: '#FFF8E1' }}>
          <p className="text-2xs font-bold" style={{ color: '#B45309' }}>Poster replied</p>
          <p className="text-ink-700">Yes, it&apos;s in the box. Tools are not provided.</p>
        </li>
        <li className="lm-in flex items-center gap-2 rounded-xl border border-dashed border-ink-200 px-3 py-2 text-2xs text-ink-500">
          <Lock size={13} className="flex-shrink-0" /> Phone numbers and emails stay hidden until you pick a tasker.
        </li>
        <li className="lm-in flex items-center gap-2 px-1 text-2xs text-ink-400">
          Dilini R. is typing <span className="lm-dots" aria-hidden><i /><i /><i /></span>
        </li>
      </ul>
    </MockFrame>
  );
}

export function ReviewMock() {
  return (
    <MockFrame color="#F59E0B" label="Preview of a review left after a task">
      <div className="px-5 py-5">
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-ink-900" style={{ background: '#F59E0B' }}>DR</span>
          <span>
            <span className="block text-sm font-bold text-ink-900">Dilini R.</span>
            <span className="block text-2xs text-ink-400">42 tasks completed · Handyman</span>
          </span>
        </div>
        <div className="mt-4 flex gap-1" aria-hidden>
          {[0, 1, 2, 3, 4].map(i => <Star key={i} size={22} className="lm-star fill-current" />)}
        </div>
        <p className="lm-in mt-3 text-sm text-ink-700">“Arrived on time, assembled the wardrobe in an hour and cleaned up after. Would hire again!”</p>
        <p className="lm-in mt-2 text-2xs text-ink-400">Review for “Assemble a wardrobe”</p>
      </div>
    </MockFrame>
  );
}
