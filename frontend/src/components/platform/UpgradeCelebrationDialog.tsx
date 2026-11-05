'use client';

import Modal from '../ui/Modal';
import { MascotState } from '../brand/Mascot';

export interface UpgradeNotice { plan_name: string; product_name: string; expires_at: string | null }

/** This sits outside each app's own translations, so it carries its own words. */
const COPY = {
  en: { title: 'Congratulations! 🎉', body: 'Your {product} plan is now {plan}.', until: 'Active until {date}.', ok: 'Thanks' },
  si: { title: 'සුභ පැතුම්! 🎉', body: 'ඔබේ {product} plan එක දැන් {plan}.', until: '{date} දක්වා සක්‍රීයයි.', ok: 'ස්තූතියි' },
  ta: { title: 'வாழ்த்துகள்! 🎉', body: 'உங்கள் {product} திட்டம் இப்போது {plan}.', until: '{date} வரை செயலில் இருக்கும்.', ok: 'நன்றி' },
};
type Locale = keyof typeof COPY;

function currentLocale(): Locale {
  try {
    const saved = localStorage.getItem('cod_locale') ?? localStorage.getItem('kh_locale');
    return saved && saved in COPY ? (saved as Locale) : 'en';
  } catch {
    return 'en';
  }
}

export default function UpgradeCelebrationDialog({ notice, onClose }: { notice: UpgradeNotice; onClose: () => void }) {
  const locale = currentLocale();
  const copy = COPY[locale];
  const until = notice.expires_at
    ? copy.until.replace('{date}', new Date(notice.expires_at).toLocaleDateString(locale === 'en' ? 'en-GB' : locale, { day: 'numeric', month: 'long', year: 'numeric' }))
    : '';
  return (
    <Modal open onClose={onClose} title={copy.title} width="max-w-md">
      <MascotState variant="success" size="sm" title={copy.body.replace('{product}', notice.product_name).replace('{plan}', notice.plan_name)} description={until}
        action={<button type="button" onClick={onClose} className="kh-btn-primary rounded-xl px-6 py-2.5 text-sm">{copy.ok}</button>} />
    </Modal>
  );
}
