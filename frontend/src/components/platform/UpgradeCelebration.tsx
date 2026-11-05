'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { readAuthToken } from '../../lib/session';
import type { UpgradeNotice } from './UpgradeCelebrationDialog';

const Dialog = dynamic(() => import('./UpgradeCelebrationDialog'), { ssr: false });

/** Places where a popup would get in the way: signing in, printing, a shop's shared kiosk, the super admin's own console. */
const QUIET_PATHS = /\/(login|register|print|labels|kiosk|super-admin)(\/|$)/;

/**
 * Congratulates the owner once on a plan a super admin gave them, in whichever KadeHub app they open next.
 * Uses plain fetch, not the shared api client: an expired session on a public page must stay silent, not redirect to login.
 */
export default function UpgradeCelebration() {
  const pathname = usePathname();
  const [notice, setNotice] = useState<UpgradeNotice | null>(null);
  const checkedFor = useRef<string | null>(null);

  useEffect(() => {
    const token = readAuthToken();
    if (!token || checkedFor.current === token || QUIET_PATHS.test(window.location.pathname)) return;
    checkedFor.current = token;
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/platform/upgrade-notice/claim`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
      .then(res => (res.ok ? res.json() : null))
      .then(data => { if (data?.notice) setNotice(data.notice); })
      .catch(() => {});
  }, [pathname]);

  return notice ? <Dialog notice={notice} onClose={() => setNotice(null)} /> : null;
}
