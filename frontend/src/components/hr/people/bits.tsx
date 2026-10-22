'use client';

import { useHrT, type HrKey } from '../../../lib/hr/i18n';
import type { EmployeeStatus } from '../../../lib/hr/types';
import { Pill } from '../ui';

export function EmployeeStatusPill({ status }: { status: EmployeeStatus }) {
  const { t } = useHrT();
  const tone = status === 'active' ? 'green' : status === 'resigned' ? 'gray' : 'red';
  return <Pill tone={tone}>{t(`emp.status.${status}` as HrKey)}</Pill>;
}

/** Short owner-only notice for pages managers can reach by URL. */
export function OwnerOnly({ title, body }: { title: string; body?: string }) {
  return (
    <div className="kh-card mx-auto max-w-md p-6 text-center">
      <p className="font-bold text-ink-800">{title}</p>
      {body && <p className="mt-1 text-sm text-ink-500">{body}</p>}
    </div>
  );
}
