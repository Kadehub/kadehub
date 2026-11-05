'use client';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { applyConsent, isTrackedPage, trackPageView } from '../../lib/meta-pixel';
import { readConsent } from '../../lib/privacy-consent';

type Banner = 'opt-in' | 'notice' | null;

let region: Promise<boolean> | null = null;

/** True when this visitor must say yes first. If the check fails, assume so. */
function needsOptIn(): Promise<boolean> {
  region ??= fetch('/api/privacy-region')
    .then(r => r.json())
    .then(d => d.optIn !== false)
    .catch(() => true);
  return region;
}

/** Reports public page views to Meta, loading its script only on a public page and within the visitor's choice. */
export default function MetaPixel() {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);
  const [banner, setBanner] = useState<Banner>(null);
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // The browser's path: during a subdomain rewrite usePathname() can report the internal /cod/... one
    const { host, pathname: path } = window.location;
    if (path === lastPath.current) return;
    lastPath.current = path;
    if (!isTrackedPage(host, path)) { setBanner(null); return; }

    const consent = readConsent();
    if (consent === 'denied') return;
    if (consent === 'granted') { trackPageView(); return; }

    needsOptIn().then(optIn => {
      // The visitor may have moved into the app while we waited
      if (!isTrackedPage(window.location.host, window.location.pathname)) return;
      if (!optIn) trackPageView();
      setBanner(optIn ? 'opt-in' : 'notice');
    });
  }, [pathname]);

  // Room to scroll past the banner, so it can never sit on top of a sign-up button
  useEffect(() => {
    if (!banner || !bannerRef.current) return;
    document.body.style.paddingBottom = `${bannerRef.current.offsetHeight + 32}px`;
    return () => { document.body.style.paddingBottom = ''; };
  }, [banner]);

  if (!banner) return null;

  function accept() {
    applyConsent('granted');
    if (banner === 'opt-in') trackPageView();
    setBanner(null);
  }

  function decline() {
    applyConsent('denied');
    setBanner(null);
  }

  return (
    <div ref={bannerRef} role="region" aria-label="Advertising cookies"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-3xl rounded-2xl border border-ink-200 bg-white p-3 shadow-xl sm:flex sm:items-center sm:gap-4 sm:p-4">
      <p className="text-xs leading-relaxed text-ink-700 sm:flex-1">
        {banner === 'opt-in' ? (
          <>Can we use advertising cookies? They help Meta measure our adverts and show them to the right people. If you sign up, Meta also gets a hashed copy of your email. Nothing goes to Meta unless you accept.</>
        ) : (
          <>We use advertising cookies so Meta can measure our adverts and show them to the right people. If you sign up, Meta also gets a hashed copy of your email. You can turn this off.</>
        )}{' '}
        <a href="/privacy" className="font-semibold text-ink-900 underline underline-offset-2">Privacy notice</a>
      </p>
      <div className="mt-2 flex gap-2 sm:mt-0 sm:shrink-0">
        <button type="button" onClick={decline}
          className="min-h-11 flex-1 rounded-xl border-2 border-ink-200 bg-white px-5 text-sm font-bold text-ink-900 hover:bg-ink-50 sm:flex-none">
          {banner === 'opt-in' ? 'Decline' : 'Turn off'}
        </button>
        <button type="button" onClick={accept}
          className="min-h-11 flex-1 rounded-xl border-2 border-ink-900 bg-ink-900 px-5 text-sm font-bold text-white hover:opacity-90 sm:flex-none">
          {banner === 'opt-in' ? 'Accept' : 'OK'}
        </button>
      </div>
    </div>
  );
}
