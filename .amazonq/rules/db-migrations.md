# Production DB Migration Rule

Any time a change is made that affects the database schema or seed data, the following file MUST be updated in the same response:

**File:** `backend/src/database/migrate-production.sql`

## What must be added

| Change type | Example | SQL to add |
|---|---|---|
| New table | Adding `notifications` table | Full `CREATE TABLE IF NOT EXISTS` statement |
| New column | Adding `logo_url` to `tenant` | `ALTER TABLE \`tenant\` ADD COLUMN IF NOT EXISTS \`logo_url\` TEXT NULL;` |
| Column modification | Changing default or type | `ALTER TABLE \`x\` MODIFY COLUMN \`y\` ...;` |
| New required seed data | New package, config row | `INSERT IGNORE INTO ...` |
| Dropped column | Removing a column | `ALTER TABLE \`x\` DROP COLUMN IF EXISTS \`y\`;` |

## Format rules

- Add a comment block above each group of changes: `-- [YYYY-MM-DD] Short description`
- Always use `IF NOT EXISTS` / `IF EXISTS` / `INSERT IGNORE` so statements are safe to re-run
- Append to the bottom of the file — never edit existing entries
- Do NOT include full table recreations for existing tables — only the delta (ALTER statements)
- `schema.sql` is the source of truth for new installs; `migrate-production.sql` is only the delta for existing production DBs
