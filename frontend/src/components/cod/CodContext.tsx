'use client';

import { createContext, useContext } from 'react';
import type { CodMe } from '../../lib/cod/session';
import type { Business } from '../../lib/cod/types';
import type { ItemLabels } from '../../lib/cod/business-types';

export interface CodContextValue {
  me: CodMe & { business: Business };
  labels: ItemLabels;
  /** Re-fetch /cod/me (after settings, plan or usage changes). */
  refresh: () => Promise<void>;
}

const Ctx = createContext<CodContextValue | null>(null);
export const CodContextProvider = Ctx.Provider;

/** Signed-in COD session for pages inside the COD shell. */
export function useCod(): CodContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useCod() must be used inside the COD layout');
  return v;
}
