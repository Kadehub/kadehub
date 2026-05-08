-- Migration: Billing v2 — add employee_limit to package, add coupon & api_log tables
-- Run this on existing databases that already have the base schema
-- Compatible with MySQL 5.7+, MariaDB 10.0+, phpMyAdmin, and mysql CLI

-- Add employee_limit to package if missing.
-- Safe to run multiple times: INSERT IGNORE into a temp check table is not
-- needed here because ALTER IGNORE + information_schema works without DELIMITER.
SET @dbname = DATABASE();
SET @tbl    = 'package';
SET @col    = 'employee_limit';
SET @sql    = IF(
  EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME   = @tbl
      AND COLUMN_NAME  = @col
  ),
  'SELECT ''employee_limit already exists'' AS note',
  'ALTER TABLE `package` ADD COLUMN `employee_limit` INT NULL'
);
PREPARE _stmt FROM @sql;
EXECUTE _stmt;
DEALLOCATE PREPARE _stmt;

-- Update existing packages with sensible limits
UPDATE `package` SET `employee_limit` = 3    WHERE `slug` = 'starter'    AND `employee_limit` IS NULL;
UPDATE `package` SET `employee_limit` = 10   WHERE `slug` = 'pro'        AND `employee_limit` IS NULL;
UPDATE `package` SET `employee_limit` = NULL WHERE `slug` = 'enterprise' AND `employee_limit` IS NULL;

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
