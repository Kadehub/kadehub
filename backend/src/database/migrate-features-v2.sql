-- Migration: Features v2 (Coupons, Announcements, API Log)

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

CREATE TABLE IF NOT EXISTS `announcement` (
  `id`         INT          NOT NULL AUTO_INCREMENT,
  `title`      VARCHAR(255) NOT NULL,
  `message`    TEXT         NOT NULL,
  `type`       ENUM('info','warning','success','error') NOT NULL DEFAULT 'info',
  `is_active`  TINYINT(1)   NOT NULL DEFAULT 1,
  `expires_at` DATETIME,
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
