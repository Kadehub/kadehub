import type { Migration } from './migrations';

/** COD expenses schema changes (ids 140-169). Additive and idempotent: create-if-missing / add-column-if-missing only. */
export const COD_EXPENSE_MIGRATIONS: Migration[] = [];
