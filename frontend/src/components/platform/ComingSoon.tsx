import { Check } from 'lucide-react';
import KadeHubLogo from '../ui/KadeHubLogo';
import { getProduct, hubUrl, type ProductSlug } from '../../lib/platform';

/** Placeholder home for a product that is registered on the platform but not built yet. */
export default function ComingSoon({ slug }: { slug: ProductSlug }) {
  const product = getProduct(slug)!;
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12" style={{ background: '#F1F5F9' }}>
      <a href={hubUrl('/')}><KadeHubLogo width={150} theme="color" /></a>
      <div className="kh-card mt-8 p-8 w-full max-w-lg text-center">
        <span className="text-2xs font-semibold px-2 py-1 rounded-full kh-badge-amber">Coming soon</span>
        <h1 className="mt-4 text-2xl font-extrabold text-ink-900">{product.name}</h1>
        <p className="mt-2 text-sm text-ink-500">{product.tagline}</p>
        <ul className="mt-6 space-y-2 text-left inline-block">
          {product.features.map(f => (
            <li key={f} className="flex items-start gap-2 text-sm text-ink-600">
              <Check size={15} className="mt-0.5 flex-shrink-0" style={{ color: product.color }} />
              {f}
            </li>
          ))}
        </ul>
        <div className="mt-8">
          <a href={hubUrl('/')} className="inline-flex px-5 py-2.5 rounded-xl text-sm font-bold kh-btn-primary">
            Explore KadeHub apps
          </a>
        </div>
      </div>
    </div>
  );
}
