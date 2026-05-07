'use client';
import { useLang } from '../../hooks/useLang';

export default function LanguageSwitcher() {
  const { locale, setLocale } = useLang();
  return (
    <div className="flex items-center gap-0.5 p-0.5 rounded-lg border border-ink-200 bg-ink-50">
      {(['en', 'si'] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLocale(l)}
          className="px-2.5 py-1 rounded-md text-xs font-bold transition-all"
          style={{
            background: locale === l ? '#00A884' : 'transparent',
            color: locale === l ? 'white' : '#64748B',
          }}
        >
          {l === 'en' ? 'EN' : 'සිං'}
        </button>
      ))}
    </div>
  );
}
