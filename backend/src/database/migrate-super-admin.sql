-- Migration: Super Admin Support
-- Run this on your existing kadehub database

ALTER TABLE `tenant`
  ADD COLUMN IF NOT EXISTS `status`    ENUM('active','blocked','suspended') NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS `plan_note` TEXT NULL;

ALTER TABLE `user`
  MODIFY COLUMN `role` ENUM('SUPER_ADMIN','ADMIN','CASHIER') NOT NULL DEFAULT 'CASHIER';

-- Create the super admin user (tenant_id=0 is a placeholder — adjust as needed)
-- First insert a system tenant for super admin
INSERT IGNORE INTO `tenant` (`id`, `name`, `slug`, `status`) VALUES (0, 'KadeHub Platform', 'kadehub-platform', 'active');

-- Insert super admin user (change email/password as needed)
-- Password below is bcrypt hash of: SuperAdmin@123
INSERT IGNORE INTO `user` (`tenant_id`, `name`, `email`, `password_hash`, `role`)
VALUES (0, 'Super Admin', 'superadmin@kadehub.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'SUPER_ADMIN');
