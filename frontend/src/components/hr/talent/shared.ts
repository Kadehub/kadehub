import type { HrKey, HrT } from '../../../lib/hr/i18n';
import type { ApplicantStage, AssetStatus, EmploymentType, WarningLevel } from '../../../lib/hr/types';
import { formatLKR } from '../../../lib/hr/format';
import { hrHref } from '../HrContext';
import type { Tone } from '../ui';

export const STAGES: ApplicantStage[] = ['new', 'shortlisted', 'interview', 'offered', 'hired', 'rejected'];
export const STAGE_TONE: Record<ApplicantStage, Tone> = {
  new: 'blue', shortlisted: 'violet', interview: 'amber', offered: 'amber', hired: 'green', rejected: 'gray',
};
/** Stages a card can be moved to by hand; "hired" only happens through Hire. */
export const MOVABLE: ApplicantStage[] = ['new', 'shortlisted', 'interview', 'offered', 'rejected'];

export const EMPLOYMENT_TYPES: EmploymentType[] = ['full_time', 'part_time', 'daily', 'contract'];
export const typeLabel = (t: HrT, type: string) => t(`job.type.${type}` as HrKey);

export const LEVEL_TONE: Record<WarningLevel, Tone> = { verbal: 'amber', written: 'red', final: 'red' };
export const ASSET_TONE: Record<AssetStatus, Tone> = { available: 'green', issued: 'violet', lost: 'red', retired: 'gray' };

/** Full public URL of a job advert (staff.kadehub.com/jobs/<token>, or localhost/hr/jobs/<token>). */
export function jobLink(token: string) {
  return `${window.location.origin}${hrHref(`/jobs/${token}`)}`;
}

export function salaryText(t: HrT, min: number, max: number): string | null {
  const f = (n: number) => formatLKR(n, { decimals: false });
  if (min > 0 && max > 0) return min === max ? f(min) : `${f(min)} – ${f(max)}`;
  if (max > 0) return t('job.salaryUpTo', { max: f(max) });
  if (min > 0) return t('job.salaryFrom', { min: f(min) });
  return null;
}

/** ISO instant ↔ value of an <input type="datetime-local"> in the viewer's own time zone. */
export function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true });
}
