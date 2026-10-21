/**
 * Accounts the super admin has switched off. Tokens are stateless, so the JWT guard checks this set to cut off
 * sessions that were signed in before the switch. Kept fresh by SuperAdminService (on change + every minute,
 * which also covers other server instances).
 */
const disabled = new Set<number>();

export function isUserDisabled(userId: number | undefined): boolean {
  return userId !== undefined && disabled.has(Number(userId));
}

export function setDisabledUsers(ids: number[]) {
  disabled.clear();
  for (const id of ids) disabled.add(Number(id));
}

export function markUserDisabled(userId: number, off: boolean) {
  if (off) disabled.add(userId); else disabled.delete(userId);
}
