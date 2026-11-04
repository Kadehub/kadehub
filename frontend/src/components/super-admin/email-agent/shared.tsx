'use client';
import Badge from '../../ui/Badge';

export const BASE = '/super-admin/email-agent';

export const errorMessage = (err: any, fallback: string) => {
  const m = err?.response?.data?.message;
  return Array.isArray(m) ? m.join(', ') : m || fallback;
};

export const when = (v?: string | null) =>
  v ? new Date(v).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

const STATUS: Record<string, { label: string; variant: 'teal' | 'amber' | 'coral' | 'blue' | 'gray' }> = {
  draft: { label: 'Needs a person', variant: 'coral' },
  pending_approval: { label: 'Waiting for approval', variant: 'amber' },
  approved: { label: 'Approved', variant: 'blue' },
  sending: { label: 'Sending', variant: 'blue' },
  sent: { label: 'Sent', variant: 'teal' },
  failed: { label: 'Failed', variant: 'coral' },
  rejected: { label: 'Rejected', variant: 'gray' },
  cancelled: { label: 'Cancelled', variant: 'gray' },
};

export const EmailStatus = ({ status }: { status: string }) => {
  const s = STATUS[status] ?? { label: status, variant: 'gray' as const };
  return <Badge variant={s.variant}>{s.label}</Badge>;
};

export const Empty = ({ children }: { children: React.ReactNode }) => (
  <div className="kh-card p-10 text-center text-sm text-ink-400">{children}</div>
);

export const Loading = () => <div className="kh-card p-10 text-center text-sm text-ink-400">Loading…</div>;

export const Label = ({ children }: { children: React.ReactNode }) => (
  <label className="text-xs font-semibold text-ink-500 mb-1.5 block">{children}</label>
);

export const inputClass = 'border border-ink-200 rounded-xl px-4 py-2 text-sm w-full focus:outline-none';
export const secondaryButton = 'border border-ink-200 rounded-xl px-4 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50 transition-colors disabled:opacity-50';
