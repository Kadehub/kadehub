'use client';
import { useAuthStore } from '../../hooks/useAuth';

/**
 * Mirror of backend/src/modules/cod/cod-capabilities.ts — keep the two in sync.
 * The UI uses this only to hide what the user can't do; the backend guard is the real check.
 */
export type CodCapability =
  | 'orders_create' | 'orders_status' | 'credit' | 'costs' | 'expenses' | 'reports' | 'personal_finance';

const ALL: CodCapability[] = ['orders_create', 'orders_status', 'credit', 'costs', 'expenses', 'reports', 'personal_finance'];

const ROLE_CAPABILITIES: Record<string, CodCapability[]> = {
  ADMIN: ALL,
  CASHIER: ['orders_create', 'orders_status', 'credit'],
};

export function hasCodCapability(role: string | undefined, cap: CodCapability): boolean {
  if (role === 'SUPER_ADMIN') return true;
  return (ROLE_CAPABILITIES[role ?? ''] ?? []).includes(cap);
}

/** `const can = useCodCan(); if (can('costs')) …` */
export function useCodCan() {
  const role = useAuthStore(s => s.user?.role);
  return (cap: CodCapability) => hasCodCapability(role, cap);
}
