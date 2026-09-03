import { DataSource } from 'typeorm';

export async function tableExists(ds: DataSource, table: string): Promise<boolean> {
  const rows = await ds.query(
    `SELECT 1 AS ok FROM information_schema.tables
     WHERE table_schema NOT IN ('pg_catalog','information_schema')
       AND LOWER(table_name) = LOWER($1)
     LIMIT 1`,
    [table],
  ).catch(async () => ds.query(
    `SELECT 1 AS ok FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = ?
     LIMIT 1`,
    [table],
  ));
  return rows.length > 0;
}

export async function columnExists(ds: DataSource, table: string, column: string): Promise<boolean> {
  const rows = await ds.query(
    `SELECT 1 AS ok FROM information_schema.columns
     WHERE table_schema NOT IN ('pg_catalog','information_schema')
       AND LOWER(table_name) = LOWER($1) AND LOWER(column_name) = LOWER($2)
     LIMIT 1`,
    [table, column],
  ).catch(async () => ds.query(
    `SELECT 1 AS ok FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?
     LIMIT 1`,
    [table, column],
  ));
  return rows.length > 0;
}

export function quoteTable(ds: DataSource, table: string) {
  if (ds.options.type === 'postgres') return table === 'user' ? '"user"' : table;
  return `\`${table}\``;
}

export async function addColumn(ds: DataSource, table: string, column: string, definition: string) {
  if (await columnExists(ds, table, column)) return;
  await ds.query(`ALTER TABLE ${quoteTable(ds, table)} ADD COLUMN ${column} ${definition}`);
}

export async function addEnumValue(
  ds: DataSource,
  dialect: string,
  typeName: string,
  value: string,
  mysql?: { table: string; column: string; values: string[]; notNull?: boolean; defaultValue?: string },
) {
  if (dialect === 'postgres') {
    await ds.query(`ALTER TYPE ${typeName} ADD VALUE IF NOT EXISTS '${value}'`).catch(() => {});
    return;
  }
  if (mysql) {
    const nn = mysql.notNull === false ? '' : 'NOT NULL';
    const def = mysql.defaultValue ? ` DEFAULT '${mysql.defaultValue}'` : '';
    const list = mysql.values.map(v => `'${v}'`).join(',');
    await ds.query(`ALTER TABLE \`${mysql.table}\` MODIFY COLUMN \`${mysql.column}\` ENUM(${list}) ${nn}${def}`);
  }
}
