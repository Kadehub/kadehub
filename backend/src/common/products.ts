/**
 * KadeHub product registry. Each product is served on its own subdomain
 * (pos.kadehub.com, cod.kadehub.com, …); the bare domain is the platform hub.
 *
 * Keep in sync with frontend/src/lib/platform.ts — the frontend proxy needs the
 * same list synchronously to route requests by hostname.
 */
export type ProductStatus = 'live' | 'beta' | 'coming_soon';

export interface ProductDef {
  slug: string;
  name: string;
  subdomain: string;
  tagline: string;
  status: ProductStatus;
}

export const PRODUCTS: ProductDef[] = [
  { slug: 'pos',   name: 'KadeHub POS',   subdomain: 'pos',   tagline: 'Point of sale, inventory and CRM for local shops', status: 'live' },
  { slug: 'cod',   name: 'KadeHub COD',   subdomain: 'cod',   tagline: 'Cash-on-delivery orders, landed costs and invoices', status: 'live' },
  { slug: 'tasks', name: 'KadeHub Tasks', subdomain: 'tasks', tagline: 'Post a task, get offers from local taskers', status: 'live' },
];

export const DEFAULT_PRODUCT = 'pos';

/** Subdomains a shop can never claim: infrastructure names + every product subdomain. */
export const RESERVED_SUBDOMAINS = new Set<string>([
  'www', 'api', 'app', 'apps', 'admin', 'mail', 'ftp', 'kadehub', 'support', 'billing', 'dashboard',
  'accounts', 'auth', 'login', 'hub', 'static', 'cdn', 'docs', 'help', 'status', 'portfolio',
  ...PRODUCTS.map(p => p.subdomain),
]);

/**
 * Public base URL of a product's frontend, for links in emails and payment redirects.
 * Local dev (NEXT_PUBLIC_APP_URL on localhost) has no subdomains, so products live under /<slug> there.
 */
export function productAppUrl(product: string): string {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
  if (product === DEFAULT_PRODUCT) return appUrl;
  if (/\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(appUrl)) return `${appUrl}/${product}`;
  const sub = PRODUCTS.find(p => p.slug === product)?.subdomain ?? product;
  return `https://${sub}.${process.env.CLOUDFLARE_BASE_DOMAIN || 'kadehub.com'}`;
}
