-- ============================================================
-- KadeHub — Production Migration Log
-- Run each section ONCE on the production database.
-- Sections are ordered chronologically.
-- ============================================================

-- ------------------------------------------------------------
-- [2025] MinIO + country field cleanup
-- ------------------------------------------------------------

-- Drop the hardcoded 'Sri Lanka' default from company_profile.country
ALTER TABLE `company_profile`
  MODIFY COLUMN `country` VARCHAR(100) NULL DEFAULT NULL;

-- ------------------------------------------------------------
-- [2025-07-28] Add reports_basic module to all packages
-- ------------------------------------------------------------

INSERT IGNORE INTO `package_module` (id, package_id, module_name) VALUES
  (18, 1, 'reports_basic'),
  (19, 2, 'reports_basic'),
  (20, 3, 'reports_basic');

-- ------------------------------------------------------------
-- [2025-07-29] Add 'trial' to subscription.payment_status enum
-- ------------------------------------------------------------

ALTER TABLE `subscription`
  MODIFY COLUMN `payment_status` ENUM('pending','paid','failed','trial') NOT NULL DEFAULT 'pending';

-- ------------------------------------------------------------
-- [2025-07-29] Add 'bank_transfer' and 'onepay' to payment_transaction.gateway enum
-- ------------------------------------------------------------

ALTER TABLE `payment_transaction`
  MODIFY COLUMN `gateway` ENUM('paypal','card','bank','bank_transfer','onepay') NOT NULL;

-- ------------------------------------------------------------
-- [2025-01-XX] Staff PIN login, supplier invoice attachment,
--              sale void status, custom expense categories
-- ------------------------------------------------------------

ALTER TABLE `user`
  ADD COLUMN IF NOT EXISTS `pin` VARCHAR(6) NULL DEFAULT NULL AFTER `password_hash`;

ALTER TABLE `purchase_order`
  ADD COLUMN IF NOT EXISTS `invoice_url` VARCHAR(255) NULL DEFAULT NULL AFTER `notes`;

ALTER TABLE `sale`
  MODIFY COLUMN `status` ENUM('completed','refunded','voided') NOT NULL DEFAULT 'completed';

CREATE TABLE IF NOT EXISTS `expense_category` (
  `id`         INT          NOT NULL AUTO_INCREMENT,
  `tenant_id`  INT          NOT NULL,
  `name`       VARCHAR(100) NOT NULL,
  `is_active`  TINYINT(1)   NOT NULL DEFAULT 1,
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_expc_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenant` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
