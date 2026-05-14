-- ============================================================
-- KadeHub — Feature Enhancements Migration v3
-- Run this ONCE on production database
-- ============================================================

-- ------------------------------------------------------------
-- [2025-01-XX] Add PIN field for staff quick login
-- ------------------------------------------------------------

ALTER TABLE `user`
  ADD COLUMN `pin` VARCHAR(6) NULL DEFAULT NULL AFTER `password_hash`;

-- ------------------------------------------------------------
-- [2025-01-XX] Add invoice_url to purchase_order for attachments
-- ------------------------------------------------------------

ALTER TABLE `purchase_order`
  ADD COLUMN `invoice_url` VARCHAR(255) NULL DEFAULT NULL AFTER `notes`;

-- ------------------------------------------------------------
-- [2025-01-XX] Add voided status to sale
-- ------------------------------------------------------------

ALTER TABLE `sale`
  MODIFY COLUMN `status` ENUM('completed','refunded','voided') NOT NULL DEFAULT 'completed';

-- ------------------------------------------------------------
-- [2025-01-XX] Add expense_category table for custom categories
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `expense_category` (
  `id`         INT          NOT NULL AUTO_INCREMENT,
  `tenant_id`  INT          NOT NULL,
  `name`       VARCHAR(100) NOT NULL,
  `is_active`  TINYINT(1)   NOT NULL DEFAULT 1,
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_expc_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenant` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed default categories for existing tenants
INSERT IGNORE INTO `expense_category` (tenant_id, name)
SELECT DISTINCT tenant_id, 'Rent' FROM `tenant`
UNION ALL
SELECT DISTINCT tenant_id, 'Utilities' FROM `tenant`
UNION ALL
SELECT DISTINCT tenant_id, 'Salaries' FROM `tenant`
UNION ALL
SELECT DISTINCT tenant_id, 'Transport' FROM `tenant`
UNION ALL
SELECT DISTINCT tenant_id, 'Maintenance' FROM `tenant`
UNION ALL
SELECT DISTINCT tenant_id, 'Marketing' FROM `tenant`
UNION ALL
SELECT DISTINCT tenant_id, 'Other' FROM `tenant`;
