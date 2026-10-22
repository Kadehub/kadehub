'use client';

import { createContext, useContext } from 'react';
import type { Branch, HrMe, HrSettings } from '../../lib/hr/types';
import { productPath } from '../../lib/platform';

/** Same-product link: "/roster" on staff.kadehub.com, "/hr/roster" on plain localhost. */
export const hrHref = (path: string) => productPath('hr', path);

export interface HrContextValue {
  me: HrMe & { settings: HrSettings; branches: Branch[] };
  /** Account owner: salaries, payroll, settings and every branch. Branch managers see their branches only. */
  owner: boolean;
  /** Branches this user works with (active ones). */
  branches: Branch[];
  /** The branch picked in the header; null = all branches (owners with more than one). */
  branch: number | null;
  setBranch: (id: number | null) => void;
  branchName: (id: number | null | undefined) => string;
  /** Re-fetch /hr/me (after settings, plan or branch changes). */
  refresh: () => Promise<void>;
}

const Ctx = createContext<HrContextValue | null>(null);
export const HrContextProvider = Ctx.Provider;

/** Signed-in Staff session for pages inside the Staff layout. */
export function useHr(): HrContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useHr() must be used inside the KadeHub Staff layout');
  return v;
}
