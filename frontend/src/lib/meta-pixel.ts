import { ROOT_DOMAIN, resolveHost, type ProductSlug } from './platform';
import { readConsent, saveConsent, type ConsentChoice } from './privacy-consent';
import { deleteCookie } from './session';

const PIXEL_ID = '1802641850848541';
const LIVE_ROOT_DOMAIN = 'kadehub.com';

/**
 * Browser paths of the public marketing and sign-up pages, the same on the hub and every product subdomain.
 * Everything else (the apps, /login, /super-admin, /jobs/<token>) stays away from Meta: it receives each tracked URL.
 */
const TRACKED_PATHS = new Set(['/', '/register', '/landing']);

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

/** Live hub and product hosts only, so shop addresses, staging and local traffic are not tracked. */
export function isTrackedPage(host: string, path: string, rootDomain: string = ROOT_DOMAIN): boolean {
  if (rootDomain !== LIVE_ROOT_DOMAIN || !TRACKED_PATHS.has(path)) return false;
  const { kind } = resolveHost(host);
  return kind === 'hub' || kind === 'product';
}

/** Meta's base code, plus the settings that keep it to the pages we report ourselves. */
function loadPixel(): void {
  if (window.fbq) return;
  const fbq: any = function () {
    // eslint-disable-next-line prefer-rest-params
    if (fbq.callMethod) fbq.callMethod.apply(fbq, arguments); else fbq.queue.push(arguments);
  };
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = '2.0';
  fbq.queue = [];
  // By default it reports every client-side navigation, including into the signed-in apps...
  fbq.disablePushState = true;
  // ...and drops all but the first PageView of a document, which would lose our own route reporting
  fbq.allowDuplicatePageViews = true;
  window.fbq = fbq;
  window._fbq = fbq;

  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://connect.facebook.net/en_US/fbevents.js';
  document.head.appendChild(script);

  // Automatic events keep reporting button clicks after a client-side move into the apps
  fbq('set', 'autoConfig', false, PIXEL_ID);
  fbq('init', PIXEL_ID);
}

export function trackPageView(): void {
  loadPixel();
  window.fbq?.('track', 'PageView');
}

/**
 * The conversion to optimise adverts for. content_name tells the products apart in Events Manager.
 * Without consent the script was never loaded, or it was revoked, so nothing is sent.
 * `email` is what the visitor typed: the auth response has none, and adding a product to an account has no form field.
 */
export function trackRegistration(product: ProductSlug, email?: string): void {
  if (!window.fbq || readConsent() === 'denied') return;
  // Data matching: Meta's script SHA-256 hashes this before sending. Covered in /privacy.
  const em = email?.trim().toLowerCase();
  if (em) window.fbq('init', PIXEL_ID, { em });
  window.fbq('track', 'CompleteRegistration', { content_name: product, status: true });
}

/** Records the visitor's choice and applies it to a pixel already running on this page. */
export function applyConsent(choice: ConsentChoice): void {
  saveConsent(choice);
  if (choice === 'granted') {
    window.fbq?.('consent', 'grant');
    return;
  }
  window.fbq?.('consent', 'revoke');
  deleteCookie('_fbp');
  deleteCookie('_fbc');
}
