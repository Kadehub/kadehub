import { DataSource } from 'typeorm';
import { addColumn, addEnumValue, tableExists } from './migration-utils';

export type Migration = {
  id: string;
  up: (ds: DataSource, dialect: string) => Promise<void>;
};

export const MIGRATIONS: Migration[] = [
  {
    id: '001_tenant_status_subdomain',
    up: async (ds, dialect) => {
      const statusType = dialect === 'postgres' ? "VARCHAR(20) NOT NULL DEFAULT 'active'" : "ENUM('active','blocked','suspended') NOT NULL DEFAULT 'active'";
      await addColumn(ds, 'tenant', 'status', statusType);
      await addColumn(ds, 'tenant', 'plan_note', 'TEXT NULL');
      await addColumn(ds, 'tenant', 'subdomain', 'VARCHAR(63) NULL');
      if (dialect === 'postgres') {
        await ds.query('CREATE UNIQUE INDEX IF NOT EXISTS uq_tenant_subdomain ON tenant (subdomain)');
      } else {
        await ds.query('CREATE UNIQUE INDEX uq_tenant_subdomain ON `tenant` (`subdomain`)').catch(() => {});
      }
    },
  },
  {
    id: '002_super_admin_role',
    up: async (ds, dialect) => {
      await addEnumValue(ds, dialect, 'user_role', 'SUPER_ADMIN', {
        table: 'user',
        column: 'role',
        values: ['SUPER_ADMIN', 'ADMIN', 'CASHIER'],
        defaultValue: 'CASHIER',
      });
    },
  },
  {
    id: '003_user_staff_columns',
    up: async (ds) => {
      await addColumn(ds, 'user', 'pin', 'VARCHAR(6) NULL');
      await addColumn(ds, 'user', 'phone', 'VARCHAR(50) NULL');
      await addColumn(ds, 'user', 'emp_no', 'VARCHAR(50) NULL');
      await addColumn(ds, 'user', 'photo_url', 'VARCHAR(255) NULL');
    },
  },
  {
    id: '004_billing_enums',
    up: async (ds, dialect) => {
      await addEnumValue(ds, dialect, 'payment_status_type', 'trial', {
        table: 'subscription',
        column: 'payment_status',
        values: ['pending', 'paid', 'failed', 'trial'],
        defaultValue: 'pending',
      });
      await addEnumValue(ds, dialect, 'pt_gateway', 'bank_transfer', {
        table: 'payment_transaction',
        column: 'gateway',
        values: ['paypal', 'card', 'bank', 'bank_transfer', 'onepay'],
      });
      await addEnumValue(ds, dialect, 'pt_gateway', 'onepay', {
        table: 'payment_transaction',
        column: 'gateway',
        values: ['paypal', 'card', 'bank', 'bank_transfer', 'onepay'],
      });
      await addEnumValue(ds, dialect, 'sale_status', 'voided', {
        table: 'sale',
        column: 'status',
        values: ['completed', 'refunded', 'voided'],
        defaultValue: 'completed',
      });
    },
  },
  {
    id: '005_package_employee_limit',
    up: async (ds) => {
      await addColumn(ds, 'package', 'employee_limit', 'INT NULL');
    },
  },
  {
    id: '006_purchase_order_invoice',
    up: async (ds) => {
      await addColumn(ds, 'purchase_order', 'invoice_url', 'VARCHAR(255) NULL');
    },
  },
  {
    id: '007_support_tables',
    up: async (ds, dialect) => {
      const pg = dialect === 'postgres';
      if (!(await tableExists(ds, 'coupon'))) {
        await ds.query(pg ? `
          CREATE TABLE coupon (
            id SERIAL PRIMARY KEY,
            code VARCHAR(50) NOT NULL UNIQUE,
            type VARCHAR(20) NOT NULL,
            value DECIMAL(10,2) NOT NULL,
            duration_months INT,
            max_uses INT,
            used_count INT NOT NULL DEFAULT 0,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            expires_at TIMESTAMP,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
          )
        ` : `
          CREATE TABLE IF NOT EXISTS \`coupon\` (
            \`id\` INT NOT NULL AUTO_INCREMENT,
            \`code\` VARCHAR(50) NOT NULL UNIQUE,
            \`type\` ENUM('percentage','fixed') NOT NULL,
            \`value\` DECIMAL(10,2) NOT NULL,
            \`duration_months\` INT,
            \`max_uses\` INT,
            \`used_count\` INT NOT NULL DEFAULT 0,
            \`is_active\` TINYINT(1) NOT NULL DEFAULT 1,
            \`expires_at\` DATETIME,
            \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (\`id\`)
          )
        `);
      }
      if (!(await tableExists(ds, 'api_log'))) {
        await ds.query(pg ? `
          CREATE TABLE api_log (
            id SERIAL PRIMARY KEY,
            tenant_id INT,
            method VARCHAR(10) NOT NULL,
            path VARCHAR(255) NOT NULL,
            status_code INT NOT NULL DEFAULT 200,
            response_ms INT NOT NULL DEFAULT 0,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
          )
        ` : `
          CREATE TABLE IF NOT EXISTS \`api_log\` (
            \`id\` INT NOT NULL AUTO_INCREMENT,
            \`tenant_id\` INT,
            \`method\` VARCHAR(10) NOT NULL,
            \`path\` VARCHAR(255) NOT NULL,
            \`status_code\` INT NOT NULL DEFAULT 200,
            \`response_ms\` INT NOT NULL DEFAULT 0,
            \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (\`id\`)
          )
        `);
      }
      if (!(await tableExists(ds, 'announcement'))) {
        await ds.query(pg ? `
          CREATE TABLE announcement (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            type VARCHAR(20) NOT NULL DEFAULT 'info',
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            expires_at TIMESTAMP,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
          )
        ` : `
          CREATE TABLE IF NOT EXISTS \`announcement\` (
            \`id\` INT NOT NULL AUTO_INCREMENT,
            \`title\` VARCHAR(255) NOT NULL,
            \`message\` TEXT NOT NULL,
            \`type\` ENUM('info','warning','success','error') NOT NULL DEFAULT 'info',
            \`is_active\` TINYINT(1) NOT NULL DEFAULT 1,
            \`expires_at\` DATETIME,
            \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (\`id\`)
          )
        `);
      }
      if (!(await tableExists(ds, 'expense_category'))) {
        await ds.query(pg ? `
          CREATE TABLE expense_category (
            id SERIAL PRIMARY KEY,
            tenant_id INT NOT NULL,
            name VARCHAR(100) NOT NULL,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
          )
        ` : `
          CREATE TABLE IF NOT EXISTS \`expense_category\` (
            \`id\` INT NOT NULL AUTO_INCREMENT,
            \`tenant_id\` INT NOT NULL,
            \`name\` VARCHAR(100) NOT NULL,
            \`is_active\` TINYINT(1) NOT NULL DEFAULT 1,
            \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (\`id\`)
          )
        `);
      }
    },
  },
  {
    id: '008_invoice_quotation',
    up: async (ds, dialect) => {
      const pg = dialect === 'postgres';
      if (!(await tableExists(ds, 'invoice'))) {
        await ds.query(pg ? `
          CREATE TABLE invoice (
            id SERIAL PRIMARY KEY,
            invoice_number VARCHAR(50) NOT NULL UNIQUE,
            tenant_id INT NOT NULL,
            payment_transaction_id INT,
            package_id INT,
            type VARCHAR(30) NOT NULL,
            amount DECIMAL(10,2) NOT NULL,
            currency VARCHAR(10) NOT NULL DEFAULT 'LKR',
            status VARCHAR(20) NOT NULL DEFAULT 'pending',
            description TEXT,
            line_items JSONB,
            bill_to_name VARCHAR(255),
            bill_to_email VARCHAR(255),
            issued_at TIMESTAMP,
            due_at TIMESTAMP,
            paid_at TIMESTAMP,
            notes TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
          )
        ` : `
          CREATE TABLE IF NOT EXISTS \`invoice\` (
            \`id\` INT NOT NULL AUTO_INCREMENT,
            \`invoice_number\` VARCHAR(50) NOT NULL UNIQUE,
            \`tenant_id\` INT NOT NULL,
            \`payment_transaction_id\` INT NULL,
            \`package_id\` INT NULL,
            \`type\` ENUM('registration_fee','subscription','renewal') NOT NULL,
            \`amount\` DECIMAL(10,2) NOT NULL,
            \`currency\` VARCHAR(10) NOT NULL DEFAULT 'LKR',
            \`status\` ENUM('pending','paid','cancelled','overdue') NOT NULL DEFAULT 'pending',
            \`description\` TEXT NULL,
            \`line_items\` JSON NULL,
            \`bill_to_name\` VARCHAR(255) NULL,
            \`bill_to_email\` VARCHAR(255) NULL,
            \`issued_at\` DATETIME NULL,
            \`due_at\` DATETIME NULL,
            \`paid_at\` DATETIME NULL,
            \`notes\` TEXT NULL,
            \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (\`id\`),
            CONSTRAINT \`fk_invoice_tenant\` FOREIGN KEY (\`tenant_id\`) REFERENCES \`tenant\` (\`id\`) ON DELETE CASCADE
          )
        `);
      }
      if (!(await tableExists(ds, 'quotation'))) {
        await ds.query(pg ? `
          CREATE TABLE quotation (
            id SERIAL PRIMARY KEY,
            quote_number VARCHAR(50) NOT NULL UNIQUE,
            contact_name VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL,
            business_type VARCHAR(100),
            country VARCHAR(100),
            description TEXT,
            budget_range VARCHAR(100),
            status VARCHAR(20) NOT NULL DEFAULT 'new',
            package_id INT,
            quoted_amount DECIMAL(10,2),
            valid_until TIMESTAMP,
            notes TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
          )
        ` : `
          CREATE TABLE IF NOT EXISTS \`quotation\` (
            \`id\` INT NOT NULL AUTO_INCREMENT,
            \`quote_number\` VARCHAR(50) NOT NULL UNIQUE,
            \`contact_name\` VARCHAR(255) NOT NULL,
            \`email\` VARCHAR(255) NOT NULL,
            \`business_type\` VARCHAR(100) NULL,
            \`country\` VARCHAR(100) NULL,
            \`description\` TEXT NULL,
            \`budget_range\` VARCHAR(100) NULL,
            \`status\` ENUM('new','sent','accepted','rejected','converted') NOT NULL DEFAULT 'new',
            \`package_id\` INT NULL,
            \`quoted_amount\` DECIMAL(10,2) NULL,
            \`valid_until\` DATETIME NULL,
            \`notes\` TEXT NULL,
            \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (\`id\`)
          )
        `);
      }
    },
  },
  {
    id: '009_quotation_line_items',
    up: async (ds) => {
      await addColumn(ds, 'quotation', 'line_items', 'JSON NULL');
      await addColumn(ds, 'quotation', 'billing_cycle', "ENUM('monthly','yearly') NULL");
    },
  },
];
