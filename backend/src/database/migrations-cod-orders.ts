import type { Migration } from './migrations';

/** COD orders schema changes (ids 110-139). Additive and idempotent: create-if-missing / add-column-if-missing only. */
export const COD_ORDER_MIGRATIONS: Migration[] = [];
