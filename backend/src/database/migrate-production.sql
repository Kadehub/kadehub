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
