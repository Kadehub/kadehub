-- ============================================================
-- KadeHub - Full Database Schema
-- Run this BEFORE the seed files (01 → 05)
-- ------------------------------------------------------------
-- Tables (in creation order):
--   Core    : tenant
--   Billing : package, package_module, subscription,
--             payment_transaction
--   Auth    : user
--   Tenant  : company_profile
--   Inventory: product, inventory, batch
--   CRM     : customer
--   Supplier: supplier, purchase_order, purchase_order_item
--   POS     : sale, sale_item
--   Credit  : credit_sale, credit_payment
--   Expense : expense
--   Discount: discount
--   Staff   : shift, audit_log
--   SuperAdmin: announcement, coupon, api_log
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------
-- Core: tenant
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `tenant` (
  `id`         INT          NOT NULL AUTO_INCREMENT,
  `name`       VARCHAR(255) NOT NULL,
  `slug`       VARCHAR(255) NOT NULL UNIQUE,
  `status`     ENUM('active', 'blocked', 'suspended') NOT NULL DEFAULT 'active',
  `plan_note`  TEXT,
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- Billing: package
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `package` (
  `id`             INT            NOT NULL AUTO_INCREMENT,
  `name`           VARCHAR(255)   NOT NULL,
  `slug`           VARCHAR(255)   NOT NULL UNIQUE,
  `description`    TEXT,
  `price_monthly`  DECIMAL(10,2)  NOT NULL,
  `price_yearly`   DECIMAL(10,2)  NOT NULL,
  `is_active`      TINYINT(1)     NOT NULL DEFAULT 1,
  `is_popular`     TINYINT(1)     NOT NULL DEFAULT 0,
  `sort_order`     INT            NOT NULL DEFAULT 0,
  `employee_limit` INT            NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- Billing: package_module
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `package_module` (
  `id`          INT          NOT NULL AUTO_INCREMENT,
  `package_id`  INT          NOT NULL,
  `module_name` VARCHAR(100) NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_pm_package` FOREIGN KEY (`package_id`) REFERENCES `package` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- Auth: user
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `user` (
  `id`            INT          NOT NULL AUTO_INCREMENT,
  `tenant_id`     INT          NOT NULL,
  `name`          VARCHAR(255) NOT NULL,
  `email`         VARCHAR(255) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role`          ENUM('SUPER_ADMIN','ADMIN','CASHIER') NOT NULL DEFAULT 'CASHIER',
  `phone`         VARCHAR(50),
  `emp_no`        VARCHAR(100),
  `photo_url`     VARCHAR(255),
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_user_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenant` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- Tenant: company_profile
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `company_profile` (
  `id`         INT          NOT NULL AUTO_INCREMENT,
  `tenant_id`  INT          NOT NULL,
  `logo_url`   VARCHAR(255),
  `address`    TEXT,
  `city`       VARCHAR(100),
  `country`    VARCHAR(100),
  `phone`      VARCHAR(50),
  `email`      VARCHAR(255),
  `website`    VARCHAR(255),
  `tax_number` VARCHAR(100),
  `currency`   VARCHAR(10)  NOT NULL DEFAULT 'LKR',
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_cp_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenant` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- Billing: subscription
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `subscription` (
  `id`             INT          NOT NULL AUTO_INCREMENT,
  `tenant_id`      INT          NOT NULL,
  `module_name`    VARCHAR(100) NOT NULL,
  `status`         ENUM('active','inactive') NOT NULL DEFAULT 'active',
  `package_id`     INT,
  `billing_cycle`  ENUM('monthly','yearly'),
  `started_at`     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at`     DATETIME,
  `payment_status` ENUM('pending','paid','failed') NOT NULL DEFAULT 'pending',
  `payment_ref`    VARCHAR(255),
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_sub_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenant` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- Billing: payment_transaction
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `payment_transaction` (
  `id`            INT          NOT NULL AUTO_INCREMENT,
  `tenant_id`     INT          NOT NULL,
  `package_id`    INT          NOT NULL,
  `amount`        DECIMAL(10,2) NOT NULL,
  `currency`      VARCHAR(10)  NOT NULL DEFAULT 'LKR',
  `billing_cycle` ENUM('monthly','yearly') NOT NULL,
  `gateway`       ENUM('paypal','card','bank') NOT NULL,
  `gateway_ref`   VARCHAR(255),
  `status`        ENUM('pending','completed','failed','refunded') NOT NULL DEFAULT 'pending',
  `metadata`      JSON,
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_pt_tenant`  FOREIGN KEY (`tenant_id`)  REFERENCES `tenant`  (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pt_package` FOREIGN KEY (`package_id`) REFERENCES `package` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- Inventory: product
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `product` (
  `id`         INT           NOT NULL AUTO_INCREMENT,
  `tenant_id`  INT           NOT NULL,
  `name`       VARCHAR(255)  NOT NULL,
  `barcode`    VARCHAR(100),
  `price`      DECIMAL(10,2) NOT NULL,
  `cost`       DECIMAL(10,2) NOT NULL DEFAULT 0,
  `category`   VARCHAR(100),
  `image_url`  VARCHAR(255),
  `is_active`  TINYINT(1)    NOT NULL DEFAULT 1,
  `created_at` DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_product_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenant` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- Inventory: inventory
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `inventory` (
  `id`            INT      NOT NULL AUTO_INCREMENT,
  `product_id`    INT      NOT NULL UNIQUE,
  `quantity`      INT      NOT NULL DEFAULT 0,
  `reorder_level` INT      NOT NULL DEFAULT 10,
  `updated_at`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_inv_product` FOREIGN KEY (`product_id`) REFERENCES `product` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- Inventory: batch
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `batch` (
  `id`                INT           NOT NULL AUTO_INCREMENT,
  `tenant_id`         INT           NOT NULL,
  `product_id`        INT           NOT NULL,
  `batch_number`      VARCHAR(100)  NOT NULL,
  `quantity`          INT           NOT NULL,
  `cost`              DECIMAL(10,2) NOT NULL DEFAULT 0,
  `manufactured_date` DATE,
  `expiry_date`       DATE,
  `created_at`        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_batch_tenant`  FOREIGN KEY (`tenant_id`)  REFERENCES `tenant`  (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_batch_product` FOREIGN KEY (`product_id`) REFERENCES `product` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- CRM: customer
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `customer` (
  `id`             INT          NOT NULL AUTO_INCREMENT,
  `tenant_id`      INT          NOT NULL,
  `name`           VARCHAR(255) NOT NULL,
  `phone`          VARCHAR(50),
  `loyalty_points` INT          NOT NULL DEFAULT 0,
  `created_at`     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_customer_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenant` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- Supplier: supplier
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `supplier` (
  `id`             INT          NOT NULL AUTO_INCREMENT,
  `tenant_id`      INT          NOT NULL,
  `name`           VARCHAR(255) NOT NULL,
  `contact_person` VARCHAR(255),
  `phone`          VARCHAR(50),
  `email`          VARCHAR(255),
  `address`        TEXT,
  `notes`          TEXT,
  `is_active`      TINYINT(1)   NOT NULL DEFAULT 1,
  `created_at`     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_supplier_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenant` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- Supplier: purchase_order
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `purchase_order` (
  `id`           INT           NOT NULL AUTO_INCREMENT,
  `tenant_id`    INT           NOT NULL,
  `supplier_id`  INT           NOT NULL,
  `user_id`      INT           NOT NULL,
  `status`       ENUM('pending','received','cancelled') NOT NULL DEFAULT 'pending',
  `total_amount` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `notes`        TEXT,
  `created_at`   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `received_at`  DATETIME,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_po_tenant`   FOREIGN KEY (`tenant_id`)   REFERENCES `tenant`   (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_po_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `supplier` (`id`),
  CONSTRAINT `fk_po_user`     FOREIGN KEY (`user_id`)     REFERENCES `user`     (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- Supplier: purchase_order_item
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `purchase_order_item` (
  `id`           INT           NOT NULL AUTO_INCREMENT,
  `order_id`     INT           NOT NULL,
  `product_id`   INT           NOT NULL,
  `quantity`     INT           NOT NULL,
  `cost`         DECIMAL(10,2) NOT NULL,
  `received_qty` INT           NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_poi_order`   FOREIGN KEY (`order_id`)   REFERENCES `purchase_order` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_poi_product` FOREIGN KEY (`product_id`) REFERENCES `product`        (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- POS: sale
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sale` (
  `id`             INT           NOT NULL AUTO_INCREMENT,
  `tenant_id`      INT           NOT NULL,
  `user_id`        INT           NOT NULL,
  `customer_id`    INT,
  `total_amount`   DECIMAL(10,2) NOT NULL,
  `discount`       DECIMAL(10,2) NOT NULL DEFAULT 0,
  `payment_method` ENUM('CASH','CARD','LANKAQR','CREDIT') NOT NULL,
  `status`         ENUM('completed','refunded') NOT NULL DEFAULT 'completed',
  `created_at`     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_sale_tenant`   FOREIGN KEY (`tenant_id`)   REFERENCES `tenant`   (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sale_user`     FOREIGN KEY (`user_id`)     REFERENCES `user`     (`id`),
  CONSTRAINT `fk_sale_customer` FOREIGN KEY (`customer_id`) REFERENCES `customer` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- POS: sale_item
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sale_item` (
  `id`         INT           NOT NULL AUTO_INCREMENT,
  `sale_id`    INT           NOT NULL,
  `product_id` INT           NOT NULL,
  `quantity`   INT           NOT NULL,
  `price`      DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_si_sale`    FOREIGN KEY (`sale_id`)    REFERENCES `sale`    (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_si_product` FOREIGN KEY (`product_id`) REFERENCES `product` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- Credit: credit_sale
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `credit_sale` (
  `id`          INT           NOT NULL AUTO_INCREMENT,
  `tenant_id`   INT           NOT NULL,
  `sale_id`     INT           NOT NULL,
  `customer_id` INT           NOT NULL,
  `amount_due`  DECIMAL(10,2) NOT NULL,
  `amount_paid` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `due_date`    DATE,
  `status`      ENUM('outstanding','partial','paid') NOT NULL DEFAULT 'outstanding',
  `created_at`  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_cs_tenant`   FOREIGN KEY (`tenant_id`)   REFERENCES `tenant`   (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cs_sale`     FOREIGN KEY (`sale_id`)     REFERENCES `sale`     (`id`),
  CONSTRAINT `fk_cs_customer` FOREIGN KEY (`customer_id`) REFERENCES `customer` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- Credit: credit_payment
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `credit_payment` (
  `id`             INT           NOT NULL AUTO_INCREMENT,
  `credit_sale_id` INT           NOT NULL,
  `amount`         DECIMAL(10,2) NOT NULL,
  `payment_method` ENUM('CASH','CARD','LANKAQR') NOT NULL,
  `paid_at`        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_cp_credit_sale` FOREIGN KEY (`credit_sale_id`) REFERENCES `credit_sale` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- Expense: expense
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `expense` (
  `id`           INT           NOT NULL AUTO_INCREMENT,
  `tenant_id`    INT           NOT NULL,
  `user_id`      INT           NOT NULL,
  `category`     VARCHAR(100)  NOT NULL,
  `description`  VARCHAR(255)  NOT NULL,
  `amount`       DECIMAL(10,2) NOT NULL,
  `expense_date` DATE          NOT NULL,
  `created_at`   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_exp_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenant` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_exp_user`   FOREIGN KEY (`user_id`)   REFERENCES `user`   (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- Discount: discount
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `discount` (
  `id`           INT           NOT NULL AUTO_INCREMENT,
  `tenant_id`    INT           NOT NULL,
  `name`         VARCHAR(255)  NOT NULL,
  `type`         ENUM('percentage','fixed') NOT NULL,
  `value`        DECIMAL(10,2) NOT NULL,
  `min_purchase` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `is_active`    TINYINT(1)    NOT NULL DEFAULT 1,
  `valid_from`   DATE,
  `valid_to`     DATE,
  `created_at`   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_disc_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenant` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- Staff: shift
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `shift` (
  `id`           INT           NOT NULL AUTO_INCREMENT,
  `tenant_id`    INT           NOT NULL,
  `user_id`      INT           NOT NULL,
  `opened_at`    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `closed_at`    DATETIME,
  `opening_cash` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `closing_cash` DECIMAL(10,2),
  `notes`        TEXT,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_shift_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenant` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_shift_user`   FOREIGN KEY (`user_id`)   REFERENCES `user`   (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- Staff: audit_log
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `audit_log` (
  `id`         INT          NOT NULL AUTO_INCREMENT,
  `tenant_id`  INT          NOT NULL,
  `user_id`    INT          NOT NULL,
  `action`     VARCHAR(100) NOT NULL,
  `entity`     VARCHAR(100) NOT NULL,
  `entity_id`  INT,
  `details`    JSON,
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_al_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenant` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_al_user`   FOREIGN KEY (`user_id`)   REFERENCES `user`   (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- Super Admin: announcement
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `announcement` (
  `id`         INT          NOT NULL AUTO_INCREMENT,
  `title`      VARCHAR(255) NOT NULL,
  `message`    TEXT         NOT NULL,
  `type`       ENUM('info', 'warning', 'success', 'error') NOT NULL DEFAULT 'info',
  `is_active`  TINYINT(1)   NOT NULL DEFAULT 1,
  `expires_at` DATETIME,
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- Super Admin: coupon
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `coupon` (
  `id`              INT           NOT NULL AUTO_INCREMENT,
  `code`            VARCHAR(50)   NOT NULL UNIQUE,
  `type`            ENUM('percentage','fixed') NOT NULL,
  `value`           DECIMAL(10,2) NOT NULL,
  `duration_months` INT,
  `max_uses`        INT,
  `used_count`      INT           NOT NULL DEFAULT 0,
  `is_active`       TINYINT(1)    NOT NULL DEFAULT 1,
  `expires_at`      DATETIME,
  `created_at`      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- Super Admin: api_log
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `api_log` (
  `id`          INT          NOT NULL AUTO_INCREMENT,
  `tenant_id`   INT,
  `method`      VARCHAR(10)  NOT NULL,
  `path`        VARCHAR(255) NOT NULL,
  `status_code` INT          NOT NULL DEFAULT 200,
  `response_ms` INT          NOT NULL DEFAULT 0,
  `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_api_log_tenant_date` (`tenant_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;
