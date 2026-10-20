import { ArrowRight, Check } from 'lucide-react';
import type { ProductDef } from '../../lib/platform';

const STATUS_LABEL: Record<ProductDef['status'], { text: string; cls: string }> = {
  live:        { text: 'Live',        cls: 'kh-badge-teal' },
  beta:        { text: 'Beta',        cls: 'kh-badge-blue' },
  coming_soon: { text: 'Coming soon', cls: 'kh-badge-amber' },
};

interface Props {
  product: ProductDef;
  href: string;
  cta: string;
  /** Shown instead of the status badge, e.g. "Active" on the launcher. */
  badge?: { text: string; cls: string };
}

export default function ProductCard({ product, href, cta, badge }: Props) {
  const status = badge ?? STATUS_LABEL[product.status];
  return (
    <div className="kh-card p-6 flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-lg font-extrabold flex-shrink-0"
          style={{ background: product.color }}>
          {product.name.replace('KadeHub ', '')[0]}
        </div>
        <span className={`text-2xs font-semibold px-2 py-1 rounded-full ${status.cls}`}>{status.text}</span>
      </div>
      <h3 className="mt-4 text-lg font-bold text-ink-900">{product.name}</h3>
      <p className="mt-1 text-sm text-ink-500">{product.tagline}</p>
      <ul className="mt-4 space-y-2 flex-1">
        {product.features.map(f => (
          <li key={f} className="flex items-start gap-2 text-sm text-ink-600">
            <Check size={15} className="mt-0.5 flex-shrink-0" style={{ color: product.color }} />
            {f}
          </li>
        ))}
      </ul>
      <a href={href}
        className="mt-6 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold border-2 transition-colors hover:bg-ink-50"
        style={{ borderColor: product.color, color: product.color }}>
        {cta} <ArrowRight size={15} />
      </a>
    </div>
  );
}
