import { NextRequest, NextResponse } from 'next/server';
import { requiresOptIn } from '../../../lib/privacy-consent';

export const dynamic = 'force-dynamic';

/** The pages are static, so the browser asks here whether this visitor's location needs opt-in consent. */
export function GET(req: NextRequest) {
  return NextResponse.json(
    { optIn: requiresOptIn(req.headers.get('cf-ipcountry')) },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
