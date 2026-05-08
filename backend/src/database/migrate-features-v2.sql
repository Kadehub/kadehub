-- Migration: Features v2 (Announcements)
-- coupon and api_log are already handled by migrate-billing-v2.sql

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
