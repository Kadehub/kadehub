import api from '../api';
import { hasKey, type HrT } from './i18n';

/**
 * Translated message for a failed Staff API call. The backend sends stable codes either as
 * `code` (with extra values such as `limit`) or as the message itself.
 */
export function apiError(err: unknown, t: HrT): string {
  const res = (err as { response?: { status?: number; data?: Record<string, unknown> } })?.response;
  if (!res) return t('err.network');
  const data = res.data ?? {};
  const raw = data.message;
  const message = Array.isArray(raw) ? String(raw[0] ?? '') : typeof raw === 'string' ? raw : '';
  const code = typeof data.code === 'string' ? data.code : message;
  const key = `err.${code}`;
  if (hasKey(key)) {
    const vars: Record<string, string | number> = {};
    for (const k of ['limit', 'remaining']) if (typeof data[k] === 'number') vars[k] = data[k] as number;
    return t(key, vars);
  }
  // Validation messages from class-validator are plain English sentences; show them as they are
  if (message && res.status === 400 && !/^[A-Z_]+$/.test(message)) return message;
  return t('err.generic');
}

/** Error code of a failed call ('PLAN_LIMIT_EMPLOYEES', 'RUN_EXISTS'…), or null. */
export function apiCode(err: unknown): string | null {
  const data = (err as { response?: { data?: Record<string, unknown> } })?.response?.data;
  if (!data) return null;
  if (typeof data.code === 'string') return data.code;
  return typeof data.message === 'string' && /^[A-Z_]+$/.test(data.message) ? data.message : null;
}

/** POST a multipart form (file uploads); uploads get a longer timeout than the default 10 s. */
export function postForm<T>(url: string, fields: Record<string, string | number | boolean | null | undefined>, file?: File | Blob | null, fileName?: string) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) if (v !== undefined && v !== null) fd.append(k, String(v));
  if (file) fd.append('file', file, fileName ?? (file instanceof File ? file.name : 'upload.jpg'));
  return api.post<T>(url, fd, { timeout: 60000 });
}

export default api;
