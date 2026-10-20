'use client';

import { MessageCircle } from 'lucide-react';
import { useCod } from './CodContext';
import { useT } from '../../lib/cod/i18n/client';
import { buildCreditReminder } from '../../lib/cod/order-messages';
import { whatsappUrl } from '../../lib/cod/order-share';
import { BUCKET_TONE } from '../../lib/cod/credit';
import type { DueBucket } from '../../lib/cod/types';
import { Badge, btnClass, cn } from './ui';

/** WhatsApp "Remind" link: total outstanding plus each open invoice and its due date. */
export function RemindButton({ name, phone, invoices, compact = false, className = '' }: {
  name: string; phone: string;
  invoices: { invoice_number: string; outstanding: number; payment_due_date: string | null }[];
  compact?: boolean; className?: string;
}) {
  const t = useT();
  const { me } = useCod();
  if (!invoices.some(i => i.outstanding > 0)) return null;
  const href = whatsappUrl(phone, buildCreditReminder(name, invoices, me.business.name, t));
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label={t('remind.aria', { name })}
      className={cn(compact
        ? 'flex w-11 shrink-0 items-center justify-center rounded-r-xl text-emerald-600 hover:bg-emerald-50'
        : btnClass('outline', 'sm', 'text-emerald-700'), className)}>
      <MessageCircle size={compact ? 18 : undefined} />{!compact && t('remind.button')}
    </a>
  );
}

/** Paid / overdue / due soon / upcoming label for a balance (text, not colour alone). */
export function BucketBadge({ bucket, settled }: { bucket: DueBucket; settled?: boolean }) {
  const t = useT();
  if (settled) return <Badge tone="green">{t('credit.status.paid')}</Badge>;
  if (bucket === 'none') return null;
  return <Badge tone={BUCKET_TONE[bucket]}>{t(`credit.bucket.${bucket}`)}</Badge>;
}
