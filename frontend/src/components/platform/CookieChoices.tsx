'use client';
import { useEffect, useState } from 'react';
import { applyConsent } from '../../lib/meta-pixel';
import { readConsent, type ConsentChoice } from '../../lib/privacy-consent';

const STATUS: Record<ConsentChoice, string> = {
  granted: 'Advertising cookies are on.',
  denied: 'Advertising cookies are off.',
};

/** Lets a visitor change their answer at any time, on the page that explains it. */
export default function CookieChoices() {
  const [choice, setChoice] = useState<ConsentChoice | null>(null);

  useEffect(() => { setChoice(readConsent()); }, []);

  function choose(next: ConsentChoice) {
    applyConsent(next);
    setChoice(next);
  }

  return (
    <div className="mt-4 rounded-2xl border border-ink-200 bg-white p-4">
      <p className="text-sm font-semibold text-ink-900" role="status">
        {choice ? STATUS[choice] : "You haven't made a choice about advertising cookies on this device."}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => choose('denied')} aria-pressed={choice === 'denied'}
          className="min-h-11 rounded-xl border-2 border-ink-200 bg-white px-5 text-sm font-bold text-ink-900 hover:bg-ink-50">
          Turn off
        </button>
        <button type="button" onClick={() => choose('granted')} aria-pressed={choice === 'granted'}
          className="min-h-11 rounded-xl border-2 border-ink-900 bg-ink-900 px-5 text-sm font-bold text-white hover:opacity-90">
          Turn on
        </button>
      </div>
    </div>
  );
}
