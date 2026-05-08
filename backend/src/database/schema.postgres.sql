-- ============================================================
-- KadeHub - PostgreSQL Schema
-- Run this on your Neon (or any Postgres) database
-- ============================================================

-- Core: tenant
CREATE TABLE IF NOT EXISTS tenant (
  id         SERIAL       PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  slug       VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Billing: package
CREATE TABLE IF NOT EXISTS package (
  id            SERIAL         PRIMARY KEY,
  name          VARCHAR(255)   NOT NULL,
  slug          VARCHAR(255)   NOT NULL UNIQUE,
  description   TEXT,
  price_monthly DECIMAL(10,2)  NOT NULL,
  price_yearly  DECIMAL(10,2)  NOT NULL,
  is_active     BOOLEAN        NOT NULL DEFAULT TRUE,
  is_popular    BOOLEAN        NOT NULL DEFAULT FALSE,
  sort_order    INT            NOT NULL DEFAULT 0
);

-- Billing: package_module
CREATE TABLE IF NOT EXISTS package_module (
  id          SERIAL       PRIMARY KEY,
  package_id  INT          NOT NULL,
  module_name VARCHAR(100) NOT NULL,
  CONSTRAINT fk_pm_package FOREIGN KEY (package_id) REFERENCES package (id) ON DELETE CASCADE
);

-- Auth: user
CREATE TYPE user_role AS ENUM ('ADMIN', 'CASHIER');
CREATE TABLE IF NOT EXISTS "user" (
  id            SERIAL       PRIMARY KEY,
  tenant_id     INT          NOT NULL,
  name          VARCHAR(255) NOT NULL,
  email         VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          user_role    NOT NULL DEFAULT 'CASHIER',
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_tenant FOREIGN KEY (tenant_id) REFERENCES tenant (id) ON DELETE CASCADE
);

-- Tenant: company_profile
CREATE TABLE IF NOT EXISTS company_profile (
  id         SERIAL       PRIMARY KEY,
  tenant_id  INT          NOT NULL,
  logo_url   VARCHAR(255),
  address    TEXT,
  city       VARCHAR(100),
  country    VARCHAR(100),
  phone      VARCHAR(50),
  email      VARCHAR(255),
  website    VARCHAR(255),
  tax_number VARCHAR(100),
  currency   VARCHAR(10)  NOT NULL DEFAULT 'LKR',
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cp_tenant FOREIGN KEY (tenant_id) REFERENCES tenant (id) ON DELETE CASCADE
);

-- Billing: subscription
CREATE TYPE sub_status AS ENUM ('active', 'inactive');
CREATE TYPE billing_cycle_type AS ENUM ('monthly', 'yearly');
CREATE TYPE payment_status_type AS ENUM ('pending', 'paid', 'failed');
CREATE TABLE IF NOT EXISTS subscription (
  id             SERIAL             PRIMARY KEY,
  tenant_id      INT                NOT NULL,
  module_name    VARCHAR(100)       NOT NULL,
  status         sub_status         NOT NULL DEFAULT 'active',
  package_id     INT,
  billing_cycle  billing_cycle_type,
  started_at     TIMESTAMP          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at     TIMESTAMP,
  payment_status payment_status_type NOT NULL DEFAULT 'pending',
  payment_ref    VARCHAR(255),
  CONSTRAINT fk_sub_tenant FOREIGN KEY (tenant_id) REFERENCES tenant (id) ON DELETE CASCADE
);

-- Billing: payment_transaction
CREATE TYPE pt_gateway AS ENUM ('paypal', 'card', 'bank');
CREATE TYPE pt_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TABLE IF NOT EXISTS payment_transaction (
  id            SERIAL         PRIMARY KEY,
  tenant_id     INT            NOT NULL,
  package_id    INT            NOT NULL,
  amount        DECIMAL(10,2)  NOT NULL,
  currency      VARCHAR(10)    NOT NULL DEFAULT 'LKR',
  billing_cycle billing_cycle_type NOT NULL,
  gateway       pt_gateway     NOT NULL,
  gateway_ref   VARCHAR(255),
  status        pt_status      NOT NULL DEFAULT 'pending',
  metadata      JSONB,
  created_at    TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pt_tenant  FOREIGN KEY (tenant_id)  REFERENCES tenant  (id) ON DELETE CASCADE,
  CONSTRAINT fk_pt_package FOREIGN KEY (package_id) REFERENCES package (id)
);

-- Inventory: product
CREATE TABLE IF NOT EXISTS product (
  id         SERIAL        PRIMARY KEY,
  tenant_id  INT           NOT NULL,
  name       VARCHAR(255)  NOT NULL,
  barcode    VARCHAR(100),
  price      DECIMAL(10,2) NOT NULL,
  cost       DECIMAL(10,2) NOT NULL DEFAULT 0,
  category   VARCHAR(100),
  image_url  VARCHAR(255),
  is_active  BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_product_tenant FOREIGN KEY (tenant_id) REFERENCES tenant (id) ON DELETE CASCADE
);

-- Inventory: inventory
CREATE TABLE IF NOT EXISTS inventory (
  id            SERIAL    PRIMARY KEY,
  product_id    INT       NOT NULL UNIQUE,
  quantity      INT       NOT NULL DEFAULT 0,
  reorder_level INT       NOT NULL DEFAULT 10,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_inv_product FOREIGN KEY (product_id) REFERENCES product (id) ON DELETE CASCADE
);

-- Inventory: batch
CREATE TABLE IF NOT EXISTS batch (
  id                SERIAL        PRIMARY KEY,
  tenant_id         INT           NOT NULL,
  product_id        INT           NOT NULL,
  batch_number      VARCHAR(100)  NOT NULL,
  quantity          INT           NOT NULL,
  cost              DECIMAL(10,2) NOT NULL DEFAULT 0,
  manufactured_date DATE,
  expiry_date       DATE,
  created_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_batch_tenant  FOREIGN KEY (tenant_id)  REFERENCES tenant  (id) ON DELETE CASCADE,
  CONSTRAINT fk_batch_product FOREIGN KEY (product_id) REFERENCES product (id) ON DELETE CASCADE
);

-- CRM: customer
CREATE TABLE IF NOT EXISTS customer (
  id             SERIAL       PRIMARY KEY,
  tenant_id      INT          NOT NULL,
  name           VARCHAR(255) NOT NULL,
  phone          VARCHAR(50),
  loyalty_points INT          NOT NULL DEFAULT 0,
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_customer_tenant FOREIGN KEY (tenant_id) REFERENCES tenant (id) ON DELETE CASCADE
);

-- Supplier: supplier
CREATE TABLE IF NOT EXISTS supplier (
  id             SERIAL       PRIMARY KEY,
  tenant_id      INT          NOT NULL,
  name           VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255),
  phone          VARCHAR(50),
  email          VARCHAR(255),
  address        TEXT,
  notes          TEXT,
  is_active      BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_supplier_tenant FOREIGN KEY (tenant_id) REFERENCES tenant (id) ON DELETE CASCADE
);

-- Supplier: purchase_order
CREATE TYPE po_status AS ENUM ('pending', 'received', 'cancelled');
CREATE TABLE IF NOT EXISTS purchase_order (
  id           SERIAL        PRIMARY KEY,
  tenant_id    INT           NOT NULL,
  supplier_id  INT           NOT NULL,
  user_id      INT           NOT NULL,
  status       po_status     NOT NULL DEFAULT 'pending',
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  notes        TEXT,
  created_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  received_at  TIMESTAMP,
  CONSTRAINT fk_po_tenant   FOREIGN KEY (tenant_id)   REFERENCES tenant   (id) ON DELETE CASCADE,
  CONSTRAINT fk_po_supplier FOREIGN KEY (supplier_id) REFERENCES supplier (id),
  CONSTRAINT fk_po_user     FOREIGN KEY (user_id)     REFERENCES "user"   (id)
);

-- Supplier: purchase_order_item
CREATE TABLE IF NOT EXISTS purchase_order_item (
  id           SERIAL        PRIMARY KEY,
  order_id     INT           NOT NULL,
  product_id   INT           NOT NULL,
  quantity     INT           NOT NULL,
  cost         DECIMAL(10,2) NOT NULL,
  received_qty INT           NOT NULL DEFAULT 0,
  CONSTRAINT fk_poi_order   FOREIGN KEY (order_id)   REFERENCES purchase_order (id) ON DELETE CASCADE,
  CONSTRAINT fk_poi_product FOREIGN KEY (product_id) REFERENCES product        (id)
);

-- POS: sale
CREATE TYPE payment_method_type AS ENUM ('CASH', 'CARD', 'LANKAQR', 'CREDIT');
CREATE TYPE sale_status AS ENUM ('completed', 'refunded');
CREATE TABLE IF NOT EXISTS sale (
  id             SERIAL              PRIMARY KEY,
  tenant_id      INT                 NOT NULL,
  user_id        INT                 NOT NULL,
  customer_id    INT,
  total_amount   DECIMAL(10,2)       NOT NULL,
  discount       DECIMAL(10,2)       NOT NULL DEFAULT 0,
  payment_method payment_method_type NOT NULL,
  status         sale_status         NOT NULL DEFAULT 'completed',
  created_at     TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sale_tenant   FOREIGN KEY (tenant_id)   REFERENCES tenant   (id) ON DELETE CASCADE,
  CONSTRAINT fk_sale_user     FOREIGN KEY (user_id)     REFERENCES "user"   (id),
  CONSTRAINT fk_sale_customer FOREIGN KEY (customer_id) REFERENCES customer (id) ON DELETE SET NULL
);

-- POS: sale_item
CREATE TABLE IF NOT EXISTS sale_item (
  id         SERIAL        PRIMARY KEY,
  sale_id    INT           NOT NULL,
  product_id INT           NOT NULL,
  quantity   INT           NOT NULL,
  price      DECIMAL(10,2) NOT NULL,
  CONSTRAINT fk_si_sale    FOREIGN KEY (sale_id)    REFERENCES sale    (id) ON DELETE CASCADE,
  CONSTRAINT fk_si_product FOREIGN KEY (product_id) REFERENCES product (id)
);

-- Credit: credit_sale
CREATE TYPE credit_status AS ENUM ('outstanding', 'partial', 'paid');
CREATE TABLE IF NOT EXISTS credit_sale (
  id          SERIAL        PRIMARY KEY,
  tenant_id   INT           NOT NULL,
  sale_id     INT           NOT NULL,
  customer_id INT           NOT NULL,
  amount_due  DECIMAL(10,2) NOT NULL,
  amount_paid DECIMAL(10,2) NOT NULL DEFAULT 0,
  due_date    DATE,
  status      credit_status NOT NULL DEFAULT 'outstanding',
  created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cs_tenant   FOREIGN KEY (tenant_id)   REFERENCES tenant   (id) ON DELETE CASCADE,
  CONSTRAINT fk_cs_sale     FOREIGN KEY (sale_id)     REFERENCES sale     (id),
  CONSTRAINT fk_cs_customer FOREIGN KEY (customer_id) REFERENCES customer (id)
);

-- Credit: credit_payment
CREATE TYPE credit_payment_method AS ENUM ('CASH', 'CARD', 'LANKAQR');
CREATE TABLE IF NOT EXISTS credit_payment (
  id             SERIAL                PRIMARY KEY,
  credit_sale_id INT                   NOT NULL,
  amount         DECIMAL(10,2)         NOT NULL,
  payment_method credit_payment_method NOT NULL,
  paid_at        TIMESTAMP             NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cp_credit_sale FOREIGN KEY (credit_sale_id) REFERENCES credit_sale (id) ON DELETE CASCADE
);

-- Expense: expense
CREATE TABLE IF NOT EXISTS expense (
  id           SERIAL        PRIMARY KEY,
  tenant_id    INT           NOT NULL,
  user_id      INT           NOT NULL,
  category     VARCHAR(100)  NOT NULL,
  description  VARCHAR(255)  NOT NULL,
  amount       DECIMAL(10,2) NOT NULL,
  expense_date DATE          NOT NULL,
  created_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_exp_tenant FOREIGN KEY (tenant_id) REFERENCES tenant (id) ON DELETE CASCADE,
  CONSTRAINT fk_exp_user   FOREIGN KEY (user_id)   REFERENCES "user" (id)
);

-- Discount: discount
CREATE TYPE discount_type AS ENUM ('percentage', 'fixed');
CREATE TABLE IF NOT EXISTS discount (
  id           SERIAL        PRIMARY KEY,
  tenant_id    INT           NOT NULL,
  name         VARCHAR(255)  NOT NULL,
  type         discount_type NOT NULL,
  value        DECIMAL(10,2) NOT NULL,
  min_purchase DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_active    BOOLEAN       NOT NULL DEFAULT TRUE,
  valid_from   DATE,
  valid_to     DATE,
  created_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_disc_tenant FOREIGN KEY (tenant_id) REFERENCES tenant (id) ON DELETE CASCADE
);

-- Staff: shift
CREATE TABLE IF NOT EXISTS shift (
  id           SERIAL        PRIMARY KEY,
  tenant_id    INT           NOT NULL,
  user_id      INT           NOT NULL,
  opened_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  closed_at    TIMESTAMP,
  opening_cash DECIMAL(10,2) NOT NULL DEFAULT 0,
  closing_cash DECIMAL(10,2),
  notes        TEXT,
  CONSTRAINT fk_shift_tenant FOREIGN KEY (tenant_id) REFERENCES tenant (id) ON DELETE CASCADE,
  CONSTRAINT fk_shift_user   FOREIGN KEY (user_id)   REFERENCES "user" (id)
);

-- Staff: audit_log
CREATE TABLE IF NOT EXISTS audit_log (
  id         SERIAL       PRIMARY KEY,
  tenant_id  INT          NOT NULL,
  user_id    INT          NOT NULL,
  action     VARCHAR(100) NOT NULL,
  entity     VARCHAR(100) NOT NULL,
  entity_id  INT,
  details    JSONB,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_al_tenant FOREIGN KEY (tenant_id) REFERENCES tenant (id) ON DELETE CASCADE,
  CONSTRAINT fk_al_user   FOREIGN KEY (user_id)   REFERENCES "user" (id)
);
