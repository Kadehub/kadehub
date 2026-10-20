import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { PRODUCTS, resolveHost, productForHost, ROOT_DOMAIN, type ProductDef } from './lib/platform';

/** Served only on the hub (bare domain). */
const HUB_PATHS = ['/hub', '/apps', '/account', '/super-admin', '/portfolio'];
/** Served on every host as-is: one login page for the whole platform. */
const SHARED_PATHS = ['/login'];
/** Products whose pages live under src/app/<slug>; POS owns the app root. */
const PREFIXED_PRODUCTS = PRODUCTS.filter(p => p.slug !== 'pos');

function matches(path: string, prefixes: string[]) {
  return prefixes.some(p => path === p || path.startsWith(`${p}/`));
}

function prefixedProduct(path: string): ProductDef | undefined {
  return PREFIXED_PRODUCTS.find(p => matches(path, [`/${p.slug}`]));
}

export function proxy(request: NextRequest) {
  const host = (request.headers.get('x-forwarded-host') || request.headers.get('host') || '').split(',')[0].trim();
  const ctx = resolveHost(host);
  if (ctx.kind === 'unknown') return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  const proto = (request.headers.get('x-forwarded-proto') || request.nextUrl.protocol.replace(':', '')).split(',')[0];
  const redirectTo = (subdomain: string | null, path: string) =>
    NextResponse.redirect(`${proto}://${subdomain ? `${subdomain}.` : ''}${ROOT_DOMAIN}${path}${search}`);

  // /cod/orders on any host → cod.kadehub.com/orders
  const internal = prefixedProduct(pathname);
  if (internal) return redirectTo(internal.subdomain, pathname.slice(internal.slug.length + 1) || '/');

  if (ctx.kind === 'hub') {
    if (pathname === '/') return NextResponse.rewrite(new URL(`/hub${search}`, request.url));
    if (pathname === '/hub') return redirectTo(null, '/');
    if (matches(pathname, HUB_PATHS) || matches(pathname, SHARED_PATHS)) return NextResponse.next();
    // Everything else is POS (keeps old kadehub.com/dashboard links working)
    return redirectTo('pos', pathname);
  }

  if (matches(pathname, HUB_PATHS)) return redirectTo(null, pathname);

  const product = productForHost(ctx)!;
  if (product.slug === 'pos' || matches(pathname, SHARED_PATHS)) return NextResponse.next();
  return NextResponse.rewrite(new URL(`/${product.slug}${pathname === '/' ? '' : pathname}${search}`, request.url));
}

export const config = {
  // Skip API routes, Next internals and files with an extension (public assets, /portfolio/index.html)
  matcher: ['/((?!api/|api$|_next/static|_next/image|.*\\..*).*)'],
};
