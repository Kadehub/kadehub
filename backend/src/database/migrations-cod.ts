import type { DataSource } from 'typeorm';
import type { Migration } from './migrations';
import { tableExists } from './migration-utils';
import { COD_PLANS, COD_TOPUP } from '../modules/cod/cod-plans';
import { COD_ORDER_MIGRATIONS } from './migrations-cod-orders';
import { COD_EXPENSE_MIGRATIONS } from './migrations-cod-expenses';

/** Column spec: name, Postgres type, MySQL type (constraints included). */
type Col = [string, string, string];

const ID: Col = ['id', 'SERIAL PRIMARY KEY', 'INT NOT NULL AUTO_INCREMENT PRIMARY KEY'];
const TENANT: Col = ['tenant_id', 'INT NOT NULL REFERENCES tenant(id) ON DELETE CASCADE', 'INT NOT NULL'];
const CREATED: Col = ['created_at', 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP', 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP'];
const UPDATED: Col = ['updated_at', 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP', 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'];
const money = (name: string, def = '0'): Col => [name, `DECIMAL(14,2) NOT NULL DEFAULT ${def}`, `DECIMAL(14,2) NOT NULL DEFAULT ${def}`];
const text = (name: string, len = 255, def = "''"): Col => [name, `VARCHAR(${len}) NOT NULL DEFAULT ${def}`, `VARCHAR(${len}) NOT NULL DEFAULT ${def}`];

/** CREATE TABLE for either dialect; `extra` holds table constraints written for both (UNIQUE …). */
async function createTable(ds: DataSource, pg: boolean, table: string, cols: Col[], extra: string[] = [], mysqlOnly: string[] = []) {
  if (await tableExists(ds, table)) return;
  const q = (n: string) => (pg ? n : `\`${n}\``);
  const body = [
    ...cols.map(([n, p, m]) => `${q(n)} ${pg ? p : m}`),
    ...extra,
    ...(pg ? [] : mysqlOnly),
  ].join(',\n  ');
  await ds.query(`CREATE TABLE ${q(table)} (\n  ${body}\n)`);
}

async function createIndex(ds: DataSource, pg: boolean, name: string, table: string, cols: string) {
  if (pg) await ds.query(`CREATE INDEX IF NOT EXISTS ${name} ON ${table} (${cols})`);
  else await ds.query(`CREATE INDEX ${name} ON \`${table}\` (${cols})`).catch(() => {});
}

interface PackageSeed {
  slug: string; name: string; description: string; price_monthly: number; price_yearly: number;
  sort_order: number; is_popular: boolean; is_active: boolean;
}

/** Inserts a COD package (granting the 'cod' module) unless its slug already exists. */
async function seedCodPackage(ds: DataSource, pg: boolean, pkg: PackageSeed) {
  const p = (i: number) => (pg ? `$${i}` : '?');
  const found: Array<{ id: number }> = await ds.query(`SELECT id FROM package WHERE slug = ${p(1)}`, [pkg.slug]);
  let packageId = found[0]?.id;
  if (!packageId) {
    const values = [pkg.slug, pkg.name, pkg.description, pkg.price_monthly, pkg.price_yearly, pkg.sort_order, pkg.is_popular, pkg.is_active];
    const cols = 'slug, name, description, price_monthly, price_yearly, sort_order, is_popular, is_active, product';
    const ph = values.map((_, i) => p(i + 1)).join(', ');
    if (pg) {
      const rows = await ds.query(`INSERT INTO package (${cols}) VALUES (${ph}, 'cod') RETURNING id`, values);
      packageId = rows[0].id;
    } else {
      await ds.query(`INSERT INTO package (${cols}) VALUES (${ph}, 'cod')`, values);
      packageId = (await ds.query('SELECT id FROM package WHERE slug = ?', [pkg.slug]))[0].id;
    }
  }
  const mod = await ds.query(`SELECT id FROM package_module WHERE package_id = ${p(1)} AND module_name = 'cod'`, [packageId]);
  if (!mod.length) await ds.query(`INSERT INTO package_module (package_id, module_name) VALUES (${p(1)}, 'cod')`, [packageId]);
}

export const COD_MIGRATIONS: Migration[] = [
  {
    id: '100_cod_schema',
    up: async (ds, dialect) => {
      const pg = dialect === 'postgres';
      const bool = (name: string, def: boolean): Col => [name, `BOOLEAN NOT NULL DEFAULT ${def ? 'TRUE' : 'FALSE'}`, `TINYINT(1) NOT NULL DEFAULT ${def ? 1 : 0}`];
      const tenantFk = 'FOREIGN KEY (`tenant_id`) REFERENCES `tenant` (`id`) ON DELETE CASCADE';

      // One business profile per tenant: name, branding and business type used across COD
      await createTable(ds, pg, 'cod_business', [
        ID, TENANT,
        text('name'), text('phone', 40), text('address', 300), text('city', 100),
        ['logo_url', 'VARCHAR(500) NULL', 'VARCHAR(500) NULL'],
        text('business_type', 40, "'general'"), text('tagline', 100),
        text('brand_color', 7, "'#0f172a'"), text('invoice_footer', 300),
        bool('imports_goods', true),
        CREATED, UPDATED,
      ], ['UNIQUE (tenant_id)'], [tenantFk]);

      await createTable(ds, pg, 'cod_item', [
        ID, TENANT,
        text('name'), text('sku', 100), text('category', 100, "'Uncategorized'"),
        ['image_url', 'VARCHAR(500) NULL', 'VARCHAR(500) NULL'],
        text('cost_currency', 3, "'LKR'"),
        ['buying_price', 'DECIMAL(14,4) NOT NULL DEFAULT 0', 'DECIMAL(14,4) NOT NULL DEFAULT 0'],
        ['exchange_rate', 'DECIMAL(14,6) NOT NULL DEFAULT 1', 'DECIMAL(14,6) NOT NULL DEFAULT 1'],
        money('shipping_cost'), money('customs_price'), money('other_cost'), money('selling_price'),
        ['stock_quantity', 'INT NOT NULL DEFAULT 0', 'INT NOT NULL DEFAULT 0'],
        ['low_stock_threshold', 'INT NOT NULL DEFAULT 5', 'INT NOT NULL DEFAULT 5'],
        // Stored by the service on every save (Postgres generated columns in the original)
        money('landed_cost'), money('profit_per_unit'),
        CREATED, UPDATED,
      ], ['UNIQUE (tenant_id, sku)'], [tenantFk]);
      await createIndex(ds, pg, 'cod_item_category_idx', 'cod_item', 'tenant_id, category');

      await createTable(ds, pg, 'cod_expense', [
        ID, TENANT,
        text('title'), text('category', 100, "'Misc'"), money('amount'),
        ['expense_date', 'DATE NOT NULL', 'DATE NOT NULL'],
        ['notes', 'TEXT NULL', 'TEXT NULL'],
        CREATED,
      ], [], [tenantFk]);
      await createIndex(ds, pg, 'cod_expense_date_idx', 'cod_expense', 'tenant_id, expense_date');

      await createTable(ds, pg, 'cod_order', [
        ID, TENANT,
        text('invoice_number', 30), text('customer_name'), text('customer_phone', 40),
        text('customer_address', 300), text('city', 100),
        text('status', 20, "'pending'"),
        money('subtotal'), money('delivery_charge'), money('discount'), money('total_amount'),
        ['notes', 'TEXT NULL', 'TEXT NULL'],
        bool('stock_deducted', false),
        CREATED, UPDATED,
      ], ['UNIQUE (tenant_id, invoice_number)'], [tenantFk]);
      await createIndex(ds, pg, 'cod_order_status_idx', 'cod_order', 'tenant_id, status');
      await createIndex(ds, pg, 'cod_order_date_idx', 'cod_order', 'tenant_id, created_at');

      await createTable(ds, pg, 'cod_order_item', [
        ID, TENANT,
        ['order_id', 'INT NOT NULL REFERENCES cod_order(id) ON DELETE CASCADE', 'INT NOT NULL'],
        // Nullable so an item can be deleted later; the name/price snapshot keeps the invoice intact
        ['item_id', 'INT NULL REFERENCES cod_item(id) ON DELETE SET NULL', 'INT NULL'],
        text('item_name'),
        ['quantity', 'INT NOT NULL DEFAULT 1', 'INT NOT NULL DEFAULT 1'],
        money('unit_price'), money('line_total'),
      ], [], [
        tenantFk,
        'FOREIGN KEY (`order_id`) REFERENCES `cod_order` (`id`) ON DELETE CASCADE',
        'FOREIGN KEY (`item_id`) REFERENCES `cod_item` (`id`) ON DELETE SET NULL',
      ]);
      await createIndex(ds, pg, 'cod_order_item_order_idx', 'cod_order_item', 'order_id');
    },
  },
  {
    id: '101_cod_packages',
    up: async (ds, dialect) => {
      // COD plans live in the shared package table (product = 'cod') so the existing
      // bank-transfer / OnePay checkout can sell them; each grants the single 'cod' module.
      for (const plan of COD_PLANS) {
        await seedCodPackage(ds, dialect === 'postgres', {
          slug: plan.slug, name: plan.name, description: plan.description, price_monthly: plan.monthly_price_lkr,
          price_yearly: plan.monthly_price_lkr * 12, sort_order: plan.sort_order, is_popular: plan.slug === 'cod-growth', is_active: !plan.legacy,
        });
      }
    },
  },
  {
    id: '102_cod_volume_plans',
    up: async (ds, dialect) => {
      // Volume pricing: Free 50 / Growth 100 / Scale 200 orders a month, plus a hidden +100 top-up.
      // Pro and Business stop being sold; current subscribers keep them until they expire.
      const pg = dialect === 'postgres';
      const p = (i: number) => (pg ? `$${i}` : '?');
      for (const plan of COD_PLANS) {
        await seedCodPackage(ds, pg, {
          slug: plan.slug, name: plan.name, description: plan.description, price_monthly: plan.monthly_price_lkr,
          price_yearly: plan.monthly_price_lkr * 12, sort_order: plan.sort_order, is_popular: plan.slug === 'cod-growth', is_active: !plan.legacy,
        });
        await ds.query(`UPDATE package SET is_active = ${p(1)}, is_popular = ${p(2)}, description = ${p(3)} WHERE slug = ${p(4)}`,
          [!plan.legacy, plan.slug === 'cod-growth', plan.description, plan.slug]);
      }
      // Monthly and yearly cost the same: a top-up only ever lasts until the end of the month
      await seedCodPackage(ds, pg, {
        slug: COD_TOPUP.slug, name: COD_TOPUP.name, description: COD_TOPUP.description, price_monthly: COD_TOPUP.price_lkr,
        price_yearly: COD_TOPUP.price_lkr, sort_order: COD_TOPUP.sort_order, is_popular: false, is_active: true,
      });
    },
  },
  {
    id: '103_cod_order_topup',
    up: async (ds, dialect) => {
      const pg = dialect === 'postgres';
      await createTable(ds, pg, 'cod_order_topup', [
        ID, TENANT,
        ['month', 'CHAR(7) NOT NULL', 'CHAR(7) NOT NULL'], // Colombo calendar month, 'YYYY-MM'
        ['orders', 'INT NOT NULL', 'INT NOT NULL'],
        text('payment_ref'),
        CREATED,
      ], [], ['FOREIGN KEY (`tenant_id`) REFERENCES `tenant` (`id`) ON DELETE CASCADE']);
      await createIndex(ds, pg, 'cod_order_topup_month_idx', 'cod_order_topup', 'tenant_id, month');
    },
  },
  // Orders + credit (ids 110-139) and expenses (ids 140-169) live in their own files
  ...COD_ORDER_MIGRATIONS,
  ...COD_EXPENSE_MIGRATIONS,
];
