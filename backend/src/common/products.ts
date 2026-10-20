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
