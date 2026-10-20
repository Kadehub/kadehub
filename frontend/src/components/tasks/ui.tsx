'use client';
import {
  Sparkles, Truck, Package, Hammer, Flower2, Armchair, Paintbrush, Zap, Wrench, GraduationCap, Laptop, Camera,
  PartyPopper, Palette, PenLine, ClipboardList, HelpCircle, Star,
} from 'lucide-react';
import { useTasksT } from '../../lib/tasks/i18n';
import type { TaskStatus } from '../../lib/tasks/types';
import { MascotState, type MascotPose, type MascotSceneName } from '../brand/Mascot';

const ICONS: Record<string, any> = {
  Sparkles, Truck, Package, Hammer, Flower2, Armchair, PaintRoller: Paintbrush, Paintbrush, Zap, Wrench, GraduationCap,
  Laptop, Camera, PartyPopper, Palette, PenLine, ClipboardList, CircleHelp: HelpCircle, HelpCircle,
};

export function CategoryIcon({ name, size = 18, className = '' }: { name?: string | null; size?: number; className?: string }) {
  const Icon = (name && ICONS[name]) || HelpCircle;
  return <Icon size={size} className={className} />;
}

const STATUS_CLS: Record<TaskStatus, string> = {
  open: 'kh-badge-teal',
  assigned: 'kh-badge-blue',
  completed: 'kh-badge-amber',
  closed: 'kh-badge-gray',
  cancelled: 'kh-badge-red',
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  const { t } = useTasksT();
  return (
    <span className={`inline-flex items-center text-2xs font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${STATUS_CLS[status] || 'kh-badge-gray'}`}>
      {t(`status.${status}` as any)}
    </span>
  );
}

export function Stars({ value, size = 14, onChange }: { value: number; size?: number; onChange?: (v: number) => void }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <button key={i} type="button" disabled={!onChange} onClick={() => onChange?.(i)}
          className={onChange ? 'cursor-pointer' : 'cursor-default'} aria-label={`${i} star`}>
          <Star size={size} className={i <= Math.round(value) ? 'fill-amber-dark text-amber-dark' : 'text-ink-300'} />
        </button>
      ))}
    </span>
  );
}

export function RatingLine({ avg, count }: { avg: number; count: number }) {
  const { t } = useTasksT();
  if (!count) return <span className="text-xs text-ink-400">{t('user.noReviews')}</span>;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-ink-600">
      <Star size={13} className="fill-amber-dark text-amber-dark" />
      <b>{Number(avg).toFixed(1)}</b> <span className="text-ink-400">({count})</span>
    </span>
  );
}

export function Avatar({ name, url, size = 36 }: { name?: string; url?: string | null; size?: number }) {
  if (url) return <img src={url} alt={name} className="rounded-full object-cover flex-shrink-0" style={{ width: size, height: size }} />;
  return (
    <span className="rounded-full flex items-center justify-center font-bold text-white flex-shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.42, background: 'linear-gradient(135deg,#F59E0B,#FFB703)' }}>
      {(name || '?')[0]?.toUpperCase()}
    </span>
  );
}

export function Spinner({ className = '' }: { className?: string }) {
  return <span className={`inline-block w-5 h-5 border-2 border-amber-dark border-t-transparent rounded-full animate-spin ${className}`} />;
}

/** Main page loading state (mascot). Use Spinner for small inline waits. */
export function PageLoader() {
  const { t } = useTasksT();
  return <MascotState variant="loading" title={t('common.loading')} size="sm" className="py-20" />;
}

/** Empty list / section state with the mascot and an optional next step. */
export function EmptyState({ title, text, action, size = 'sm', pose, scene }: {
  title?: string; text: string; action?: React.ReactNode; size?: 'xs' | 'sm' | 'md'; pose?: MascotPose; scene?: MascotSceneName;
}) {
  return (
    <div className="kh-card px-6 py-10">
      <MascotState variant="empty" title={title} description={text} action={action} size={size} pose={pose} scene={scene} />
    </div>
  );
}

/** Full-page error / not-found state. */
export function ErrorState({ title, text, action }: { title: string; text: string; action?: React.ReactNode }) {
  return <MascotState variant="error" title={title} description={text} action={action} size="md" className="py-16" />;
}

export const fieldCls = 'w-full border border-ink-200 rounded-lg bg-white text-ink-800 placeholder:text-ink-400 text-sm px-3 py-2.5 focus:outline-none focus:border-amber-dark';
