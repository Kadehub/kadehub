import type { Migration } from './migrations';
import { addColumn, tableExists } from './migration-utils';

/** Starting shared list. Tracking links are added from the super admin dashboard once each one has been checked. */
const SEED_COURIERS = [
  'Koombiyo Delivery', 'Domex', 'Pronto Lanka', 'Prompt Xpress', 'Fardar Express', 'Citypak', 'Trans Express',
  'Simple Express', 'Simplex', 'Daraz Express', 'SL Post', 'Grasshoppers', 'Royal Express', 'Certis Lanka',
];

/** COD couriers (ids 170-179). Additive and idempotent. */
export const COD_COURIER_MIGRATIONS: Migration[] = [
  {
    id: '170_cod_couriers',
    up: async (ds, dialect) => {
      const pg = dialect === 'postgres';
      if (!(await tableExists(ds, 'cod_courier'))) {
        await ds.query(pg ? `
          CREATE TABLE cod_courier (
            id SERIAL PRIMARY KEY,
            tenant_id INT NULL REFERENCES tenant(id) ON DELETE CASCADE,
            name VARCHAR(100) NOT NULL,
            tracking_url VARCHAR(500) NULL,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            sort_order INT NOT NULL DEFAULT 0,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
          )` : `
          CREATE TABLE \`cod_courier\` (
            \`id\` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
            \`tenant_id\` INT NULL,
            \`name\` VARCHAR(100) NOT NULL,
            \`tracking_url\` VARCHAR(500) NULL,
            \`is_active\` TINYINT(1) NOT NULL DEFAULT 1,
            \`sort_order\` INT NOT NULL DEFAULT 0,
            \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (\`tenant_id\`) REFERENCES \`tenant\` (\`id\`) ON DELETE CASCADE
          )`);
      }
      if (pg) await ds.query('CREATE INDEX IF NOT EXISTS cod_courier_tenant_idx ON cod_courier (tenant_id)');
      else await ds.query('CREATE INDEX cod_courier_tenant_idx ON `cod_courier` (tenant_id)').catch(() => {});

      await addColumn(ds, 'cod_order', 'courier_id', pg ? 'INT NULL REFERENCES cod_courier(id) ON DELETE SET NULL' : 'INT NULL');
      if (!pg) {
        const fk = await ds.query(
          "SELECT 1 FROM information_schema.table_constraints WHERE table_schema = DATABASE() AND table_name = 'cod_order' AND constraint_name = 'cod_order_courier_fk'",
        );
        if (!fk.length) await ds.query('ALTER TABLE `cod_order` ADD CONSTRAINT cod_order_courier_fk FOREIGN KEY (`courier_id`) REFERENCES `cod_courier` (`id`) ON DELETE SET NULL');
      }

      const p = (i: number) => (pg ? `$${i}` : '?');
      for (const [i, name] of SEED_COURIERS.entries()) {
        const found = await ds.query(`SELECT id FROM cod_courier WHERE tenant_id IS NULL AND name = ${p(1)}`, [name]);
        if (!found.length) await ds.query(`INSERT INTO cod_courier (name, sort_order) VALUES (${p(1)}, ${p(2)})`, [name, (i + 1) * 10]);
      }
    },
  },
  {
    id: '171_cod_courier_tracking',
    up: async (ds, dialect) => {
      const pg = dialect === 'postgres';
      const ts = pg ? 'TIMESTAMP NULL' : 'DATETIME NULL';
      const now = pg ? 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP' : 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP';
      const updated = pg ? now : `${now} ON UPDATE CURRENT_TIMESTAMP`;
      const id = pg ? 'id SERIAL PRIMARY KEY' : 'id INT NOT NULL AUTO_INCREMENT PRIMARY KEY';
      const tenant = pg ? 'tenant_id INT NOT NULL REFERENCES tenant(id) ON DELETE CASCADE' : 'tenant_id INT NOT NULL';
      const tenantFk = pg ? '' : ', FOREIGN KEY (tenant_id) REFERENCES tenant (id) ON DELETE CASCADE';

      await addColumn(ds, 'cod_courier', 'adapter', 'VARCHAR(30) NULL');
      await addColumn(ds, 'cod_order', 'courier_status', 'VARCHAR(120) NULL');
      await addColumn(ds, 'cod_order', 'courier_synced_at', ts);
      await addColumn(ds, 'cod_order', 'courier_state', 'VARCHAR(20) NULL');
      await addColumn(ds, 'cod_order', 'courier_attention', 'VARCHAR(30) NULL');
      await addColumn(ds, 'cod_order', 'delivered_at', ts);
      // Best available date for orders delivered before this column existed
      await ds.query("UPDATE cod_order SET delivered_at = updated_at WHERE status = 'delivered' AND delivered_at IS NULL");
      if (pg) await ds.query('CREATE INDEX IF NOT EXISTS cod_order_courier_idx ON cod_order (tenant_id, courier_id, status)');
      else await ds.query('CREATE INDEX cod_order_courier_idx ON `cod_order` (tenant_id, courier_id, status)').catch(() => {});

      if (!(await tableExists(ds, 'cod_courier_account'))) {
        await ds.query(`CREATE TABLE cod_courier_account (
          ${id}, ${tenant},
          courier_id INT NOT NULL${pg ? ' REFERENCES cod_courier(id) ON DELETE CASCADE' : ''},
          api_key_enc TEXT NULL, connected_by INT NULL, statement_mapping TEXT NULL,
          last_ok_at ${ts}, last_error VARCHAR(300) NULL,
          created_at ${now}, updated_at ${updated},
          UNIQUE (tenant_id, courier_id)${tenantFk}${pg ? '' : ', FOREIGN KEY (courier_id) REFERENCES cod_courier (id) ON DELETE CASCADE'}
        )`);
      }
      if (!(await tableExists(ds, 'cod_shipment_event'))) {
        await ds.query(`CREATE TABLE cod_shipment_event (
          ${id}, ${tenant},
          order_id INT NOT NULL${pg ? ' REFERENCES cod_order(id) ON DELETE CASCADE' : ''},
          event_key VARCHAR(64) NOT NULL, status VARCHAR(120) NOT NULL, occurred_at ${ts}, note VARCHAR(300) NULL,
          created_at ${now},
          UNIQUE (order_id, event_key)${tenantFk}${pg ? '' : ', FOREIGN KEY (order_id) REFERENCES cod_order (id) ON DELETE CASCADE'}
        )`);
      }

      // Tracking page and status API as published in the Koombiyo Node SDK; confirm with Koombiyo before relying on them
      const p = (i: number) => (pg ? `$${i}` : '?');
      await ds.query(`UPDATE cod_courier SET adapter = 'koombiyo' WHERE tenant_id IS NULL AND name = ${p(1)}`, ['Koombiyo Delivery']);
      await ds.query(`UPDATE cod_courier SET tracking_url = ${p(1)} WHERE tenant_id IS NULL AND name = ${p(2)} AND tracking_url IS NULL`,
        ['https://koombiyodelivery.lk/Track/track_id?id={tracking}&phone={phone}', 'Koombiyo Delivery']);
    },
  },
  {
    id: '172_cod_remittances',
    up: async (ds, dialect) => {
      const pg = dialect === 'postgres';
      const now = pg ? 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP' : 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP';
      const id = pg ? 'id SERIAL PRIMARY KEY' : 'id INT NOT NULL AUTO_INCREMENT PRIMARY KEY';
      const tenant = pg ? 'tenant_id INT NOT NULL REFERENCES tenant(id) ON DELETE CASCADE' : 'tenant_id INT NOT NULL';
      const money = 'DECIMAL(14,2) NOT NULL DEFAULT 0';

      if (!(await tableExists(ds, 'cod_remittance'))) {
        await ds.query(`CREATE TABLE cod_remittance (
          ${id}, ${tenant},
          courier_id INT NOT NULL${pg ? ' REFERENCES cod_courier(id) ON DELETE CASCADE' : ''},
          reference VARCHAR(100) NOT NULL DEFAULT '', paid_on DATE NOT NULL,
          collected ${money}, fees ${money}, received ${money},
          expense_id INT NULL, notes TEXT NULL, created_by INT NULL, created_at ${now}
          ${pg ? '' : ', FOREIGN KEY (tenant_id) REFERENCES tenant (id) ON DELETE CASCADE, FOREIGN KEY (courier_id) REFERENCES cod_courier (id) ON DELETE CASCADE'}
        )`);
      }
      if (!(await tableExists(ds, 'cod_remittance_line'))) {
        await ds.query(`CREATE TABLE cod_remittance_line (
          ${id}, ${tenant},
          remittance_id INT NOT NULL${pg ? ' REFERENCES cod_remittance(id) ON DELETE CASCADE' : ''},
          order_id INT NULL${pg ? ' REFERENCES cod_order(id) ON DELETE SET NULL' : ''},
          tracking_number VARCHAR(100) NOT NULL DEFAULT '',
          collected ${money}, fee ${money}, expected ${money}, outcome VARCHAR(20) NOT NULL
          ${pg ? '' : ', FOREIGN KEY (tenant_id) REFERENCES tenant (id) ON DELETE CASCADE, FOREIGN KEY (remittance_id) REFERENCES cod_remittance (id) ON DELETE CASCADE, FOREIGN KEY (order_id) REFERENCES cod_order (id) ON DELETE SET NULL'}
        )`);
      }
      if (pg) await ds.query('CREATE INDEX IF NOT EXISTS cod_remittance_tenant_idx ON cod_remittance (tenant_id, paid_on)');
      else await ds.query('CREATE INDEX cod_remittance_tenant_idx ON `cod_remittance` (tenant_id, paid_on)').catch(() => {});
      if (pg) await ds.query('CREATE INDEX IF NOT EXISTS cod_remittance_line_idx ON cod_remittance_line (remittance_id)');
      else await ds.query('CREATE INDEX cod_remittance_line_idx ON `cod_remittance_line` (remittance_id)').catch(() => {});

      await addColumn(ds, 'cod_order', 'remittance_id', pg ? 'INT NULL REFERENCES cod_remittance(id) ON DELETE SET NULL' : 'INT NULL');
      if (!pg) {
        const fk = await ds.query(
          "SELECT 1 FROM information_schema.table_constraints WHERE table_schema = DATABASE() AND table_name = 'cod_order' AND constraint_name = 'cod_order_remittance_fk'",
        );
        if (!fk.length) await ds.query('ALTER TABLE `cod_order` ADD CONSTRAINT cod_order_remittance_fk FOREIGN KEY (`remittance_id`) REFERENCES `cod_remittance` (`id`) ON DELETE SET NULL');
      }
    },
  },
];
