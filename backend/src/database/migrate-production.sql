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
