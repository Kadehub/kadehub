/**
 * KadeHub platform: every product lives on its own subdomain of ROOT_DOMAIN,
 * the bare domain is the hub (landing, app launcher, super admin), and any
 * other subdomain is a shop's address, which is served by POS.
 *
 *   kadehub.com           → hub
 *   pos.kadehub.com       → POS (the routes at the app root)
 *   cod.kadehub.com       → COD   (src/app/cod, rewritten by src/proxy.ts)
 *   tasks.kadehub.com     → Tasks (src/app/tasks)
 *   myshop.kadehub.com    → POS for that shop
 *
 * Keep PRODUCTS in sync with backend/src/common/products.ts.
 * Imported by src/proxy.ts, so keep this file free of browser-only code at module level.
 */
export type ProductSlug = 'pos' | 'cod' | 'tasks';
export type ProductStatus = 'live' | 'beta' | 'coming_soon';

export interface ProductDef {
  slug: ProductSlug;
  name: string;
  subdomain: string;
  tagline: string;
  status: ProductStatus;
  /** Where a signed-in user lands when opening the product. */
  homePath: string;
  color: string;
  features: string[];
}

export const PRODUCTS: ProductDef[] = [
  {
    slug: 'pos', name: 'KadeHub POS', subdomain: 'pos', status: 'live', homePath: '/dashboard', color: '#00796B',
    tagline: 'Point of sale, inventory and CRM for local shops',
    features: ['Fast checkout with cash, card, QR and credit', 'Stock, batches and expiry alerts', 'Loyalty, suppliers, expenses and reports'],
  },
  {
    slug: 'cod', name: 'KadeHub COD', subdomain: 'cod', status: 'live', homePath: '/dashboard', color: '#2563EB',
    tagline: 'Cash-on-delivery orders, landed costs and invoices',
    features: ['Order pipeline from pending to delivered', 'Landed cost and profit per item', 'Invoices, catalogs and WhatsApp sharing'],
  },
  {
    slug: 'tasks', name: 'KadeHub Tasks', subdomain: 'tasks', status: 'live', homePath: '/', color: '#B45309',
    tagline: 'Post a task, get offers from local taskers',
    features: ['Post any job with a budget', 'Compare offers and pick a tasker', 'Ratings and reviews you can trust'],
  },
];

export const ROOT_DOMAIN = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'kadehub.com').toLowerCase();
const ROOT_HOSTNAME = ROOT_DOMAIN.split(':')[0];
const IS_LOCAL_ROOT = ROOT_HOSTNAME === 'localhost' || ROOT_HOSTNAME.endsWith('.localhost');

/** Domain attribute for cookies shared by every product. Empty means host-only (browsers ignore Domain=localhost). */
export const COOKIE_DOMAIN = process.env.NEXT_PUBLIC_COOKIE_DOMAIN ?? (IS_LOCAL_ROOT ? '' : `.${ROOT_HOSTNAME}`);

export type HostContext =
  | { kind: 'hub' }
  | { kind: 'product'; product: ProductDef }
  | { kind: 'shop'; subdomain: string }
  /** A host outside ROOT_DOMAIN (IP, platform preview URL, localhost with the default root). No routing is applied. */
  | { kind: 'unknown' };

export function getProduct(slug: string): ProductDef | undefined {
  return PRODUCTS.find(p => p.slug === slug);
}

export function resolveHost(host: string | null | undefined): HostContext {
  const hostname = (host || '').toLowerCase().split(':')[0];
  if (!hostname) return { kind: 'unknown' };
  if (hostname === ROOT_HOSTNAME) return { kind: 'hub' };
  if (!hostname.endsWith(`.${ROOT_HOSTNAME}`)) return { kind: 'unknown' };

  const sub = hostname.slice(0, -(ROOT_HOSTNAME.length + 1));
  if (sub === 'www') return { kind: 'hub' };
  if (sub.includes('.')) return { kind: 'unknown' };
  const product = PRODUCTS.find(p => p.subdomain === sub);
  if (product) return { kind: 'product', product };
  return { kind: 'shop', subdomain: sub };
}

/** The product that serves a host; shops and unknown hosts are POS. Null for the hub. */
export function productForHost(ctx: HostContext): ProductDef | null {
  if (ctx.kind === 'hub') return null;
  if (ctx.kind === 'product') return ctx.product;
  return getProduct('pos')!;
}

function protocol(): string {
  if (typeof window !== 'undefined') return window.location.protocol;
  return IS_LOCAL_ROOT || ROOT_HOSTNAME === 'lvh.me' ? 'http:' : 'https:';
}

/** On a host outside ROOT_DOMAIN (e.g. plain localhost) links stay on this origin, using the internal paths. */
function onUnknownHost(): boolean {
  return typeof window !== 'undefined' && resolveHost(window.location.host).kind === 'unknown';
}

export function hubUrl(path = '/'): string {
  if (onUnknownHost()) return path === '/' ? '/hub' : path;
  return `${protocol()}//${ROOT_DOMAIN}${path}`;
}

export function productUrl(slug: ProductSlug, path?: string): string {
  const product = getProduct(slug)!;
  const target = path ?? product.homePath;
  if (onUnknownHost()) return slug === 'pos' ? target : `/${slug}${target === '/' ? '' : target}`;
  return `${protocol()}//${product.subdomain}.${ROOT_DOMAIN}${target}`;
}

/**
 * Same-product link for pages under src/app/<slug>: "/orders" on cod.kadehub.com, "/cod/orders" on a host
 * without subdomain routing (plain localhost). Use for every internal href / router.push inside COD and Tasks.
 */
export function productPath(slug: Exclude<ProductSlug, 'pos'>, path = '/'): string {
  if (!onUnknownHost()) return path;
  return `/${slug}${path === '/' ? '' : path}`;
}

/** Where to send a user right after they sign in on the current host. Absolute URLs mean a different subdomain. */
export function homeAfterLogin(user: { role: string }, host: string): string {
  const ctx = resolveHost(host);
  if (user.role === 'SUPER_ADMIN') return ctx.kind === 'hub' || ctx.kind === 'unknown' ? '/super-admin' : hubUrl('/super-admin');
  if (ctx.kind === 'hub') return '/apps';
  const product = productForHost(ctx)!;
  return product.slug === 'pos' ? '/pos' : product.homePath;
}

/** Navigate to a path on this host, or to an absolute URL on another subdomain. */
export function navigate(target: string, router?: { replace: (href: string) => void }) {
  if (/^https?:\/\//.test(target) || !router) window.location.assign(target);
  else router.replace(target);
}
