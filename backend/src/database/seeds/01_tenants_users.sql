-- ============================================================
-- SEED 1: Packages, Tenants, Users, Company Profiles, Subscriptions
-- ============================================================

INSERT INTO `package` (id, name, slug, description, price_monthly, price_yearly, is_active, is_popular, sort_order, employee_limit) VALUES
(1, 'Starter',    'starter',    'Basic POS and inventory',        2999.00,  29990.00,  1, 0, 1, 3),
(2, 'Pro',        'pro',        'Full featured shop management',  4999.00,  49990.00,  1, 1, 2, 10),
(3, 'Enterprise', 'enterprise', 'Multi-user with analytics',      9999.00,  99990.00,  1, 0, 3, NULL);

INSERT INTO `package_module` (id, package_id, module_name) VALUES
(1,1,'pos'),(2,1,'inventory'),(18,1,'reports_basic'),
(3,2,'pos'),(4,2,'inventory'),(5,2,'customer'),(6,2,'supplier'),(7,2,'expense'),(19,2,'reports_basic'),
(8,3,'pos'),(9,3,'inventory'),(10,3,'customer'),(11,3,'supplier'),
(12,3,'expense'),(13,3,'analytics'),(14,3,'staff'),(15,3,'credit'),
(16,3,'discount'),(17,3,'batch'),(20,3,'reports_basic');

INSERT INTO `tenant` (id, name, slug, created_at) VALUES
(1, 'Perera Grocery',  'perera-grocery',  '2024-01-10 08:00:00'),
(2, 'City Pharmacy',   'city-pharmacy',   '2024-01-15 09:00:00'),
(3, 'Nimal Retail',    'nimal-retail',    '2024-02-01 10:00:00'),
(4, 'Saman Supermart', 'saman-supermart', '2024-02-20 11:00:00'),
(5, 'Lakshmi Stores',  'lakshmi-stores',  '2024-03-05 08:30:00');

-- password = Admin@123 (bcrypt)
INSERT INTO `user` (id, tenant_id, name, email, password_hash, role, created_at) VALUES
(1,  1, 'Kamal Perera',    'admin@perera.com',      '$2b$10$ad7JmS4kV9iwigovX2FWE.1uN1WtBqr8qEeA13.1AHK5H4p5CYTai', 'ADMIN',   '2024-01-10 08:00:00'),
(2,  1, 'Sunil Perera',    'cashier@perera.com',    '$2b$10$ad7JmS4kV9iwigovX2FWE.1uN1WtBqr8qEeA13.1AHK5H4p5CYTai', 'CASHIER', '2024-01-10 08:05:00'),
(3,  2, 'Dr. Nirosha',     'admin@citypharm.com',   '$2b$10$ad7JmS4kV9iwigovX2FWE.1uN1WtBqr8qEeA13.1AHK5H4p5CYTai', 'ADMIN',   '2024-01-15 09:00:00'),
(4,  2, 'Priya Silva',     'cashier@citypharm.com', '$2b$10$ad7JmS4kV9iwigovX2FWE.1uN1WtBqr8qEeA13.1AHK5H4p5CYTai', 'CASHIER', '2024-01-15 09:10:00'),
(5,  3, 'Nimal Fernando',  'admin@nimal.com',       '$2b$10$ad7JmS4kV9iwigovX2FWE.1uN1WtBqr8qEeA13.1AHK5H4p5CYTai', 'ADMIN',   '2024-02-01 10:00:00'),
(6,  3, 'Chamara Dias',    'cashier@nimal.com',     '$2b$10$ad7JmS4kV9iwigovX2FWE.1uN1WtBqr8qEeA13.1AHK5H4p5CYTai', 'CASHIER', '2024-02-01 10:10:00'),
(7,  4, 'Saman Kumara',    'admin@saman.com',       '$2b$10$ad7JmS4kV9iwigovX2FWE.1uN1WtBqr8qEeA13.1AHK5H4p5CYTai', 'ADMIN',   '2024-02-20 11:00:00'),
(8,  4, 'Ravi Jayasinghe', 'cashier@saman.com',     '$2b$10$ad7JmS4kV9iwigovX2FWE.1uN1WtBqr8qEeA13.1AHK5H4p5CYTai', 'CASHIER', '2024-02-20 11:10:00'),
(9,  5, 'Lakshmi Raj',     'admin@lakshmi.com',     '$2b$10$ad7JmS4kV9iwigovX2FWE.1uN1WtBqr8qEeA13.1AHK5H4p5CYTai', 'ADMIN',   '2024-03-05 08:30:00'),
(10, 5, 'Muthu Selvam',    'cashier@lakshmi.com',   '$2b$10$ad7JmS4kV9iwigovX2FWE.1uN1WtBqr8qEeA13.1AHK5H4p5CYTai', 'CASHIER', '2024-03-05 08:40:00');

INSERT INTO `company_profile` (id, tenant_id, address, city, country, phone, email, currency) VALUES
(1, 1, 'No 12, Galle Road, Colombo 03',       'Colombo',  'Sri Lanka', '0112345678', 'info@perera.com',   'LKR'),
(2, 2, 'No 45, Hospital Road, Kandy',          'Kandy',    'Sri Lanka', '0812345678', 'info@citypharm.com','LKR'),
(3, 3, 'No 7, Main Street, Galle',             'Galle',    'Sri Lanka', '0912345678', 'info@nimal.com',    'LKR'),
(4, 4, 'No 23, Kurunegala Road, Negombo',      'Negombo',  'Sri Lanka', '0312345678', 'info@saman.com',    'LKR'),
(5, 5, 'No 88, Jaffna Road, Vavuniya',         'Vavuniya', 'Sri Lanka', '0242345678', 'info@lakshmi.com',  'LKR');

INSERT INTO `subscription` (id, tenant_id, module_name, status, package_id, billing_cycle, started_at, expires_at, payment_status) VALUES
-- Tenant 1: Pro plan (pos, inventory, customer, supplier, expense)
(1,  1, 'pos',       'active', 2, 'monthly', '2024-01-10', '2025-01-10', 'paid'),
(2,  1, 'inventory', 'active', 2, 'monthly', '2024-01-10', '2025-01-10', 'paid'),
(3,  1, 'customer',  'active', 2, 'monthly', '2024-01-10', '2025-01-10', 'paid'),
(4,  1, 'supplier',  'active', 2, 'monthly', '2024-01-10', '2025-01-10', 'paid'),
(5,  1, 'expense',   'active', 2, 'monthly', '2024-01-10', '2025-01-10', 'paid'),
-- Tenant 2: Enterprise plan (all modules)
(6,  2, 'pos',       'active', 3, 'yearly',  '2024-01-15', '2025-01-15', 'paid'),
(7,  2, 'inventory', 'active', 3, 'yearly',  '2024-01-15', '2025-01-15', 'paid'),
(8,  2, 'customer',  'active', 3, 'yearly',  '2024-01-15', '2025-01-15', 'paid'),
(9,  2, 'supplier',  'active', 3, 'yearly',  '2024-01-15', '2025-01-15', 'paid'),
(10, 2, 'expense',   'active', 3, 'yearly',  '2024-01-15', '2025-01-15', 'paid'),
(11, 2, 'analytics', 'active', 3, 'yearly',  '2024-01-15', '2025-01-15', 'paid'),
(12, 2, 'staff',     'active', 3, 'yearly',  '2024-01-15', '2025-01-15', 'paid'),
(13, 2, 'credit',    'active', 3, 'yearly',  '2024-01-15', '2025-01-15', 'paid'),
(14, 2, 'discount',  'active', 3, 'yearly',  '2024-01-15', '2025-01-15', 'paid'),
(15, 2, 'batch',     'active', 3, 'yearly',  '2024-01-15', '2025-01-15', 'paid'),
-- Tenant 3: Starter plan (pos, inventory)
(16, 3, 'pos',       'active', 1, 'monthly', '2024-02-01', '2025-02-01', 'paid'),
(17, 3, 'inventory', 'active', 1, 'monthly', '2024-02-01', '2025-02-01', 'paid'),
-- Tenant 4: Pro plan (pos, inventory, customer, supplier, expense)
(18, 4, 'pos',       'active', 2, 'yearly',  '2024-02-20', '2025-02-20', 'paid'),
(19, 4, 'inventory', 'active', 2, 'yearly',  '2024-02-20', '2025-02-20', 'paid'),
(20, 4, 'customer',  'active', 2, 'yearly',  '2024-02-20', '2025-02-20', 'paid'),
(21, 4, 'supplier',  'active', 2, 'yearly',  '2024-02-20', '2025-02-20', 'paid'),
(22, 4, 'expense',   'active', 2, 'yearly',  '2024-02-20', '2025-02-20', 'paid'),
-- Tenant 5: Enterprise plan (all modules)
(23, 5, 'pos',       'active', 3, 'monthly', '2024-03-05', '2025-03-05', 'paid'),
(24, 5, 'inventory', 'active', 3, 'monthly', '2024-03-05', '2025-03-05', 'paid'),
(25, 5, 'customer',  'active', 3, 'monthly', '2024-03-05', '2025-03-05', 'paid'),
(26, 5, 'supplier',  'active', 3, 'monthly', '2024-03-05', '2025-03-05', 'paid'),
(27, 5, 'expense',   'active', 3, 'monthly', '2024-03-05', '2025-03-05', 'paid'),
(28, 5, 'analytics', 'active', 3, 'monthly', '2024-03-05', '2025-03-05', 'paid'),
(29, 5, 'staff',     'active', 3, 'monthly', '2024-03-05', '2025-03-05', 'paid'),
(30, 5, 'credit',    'active', 3, 'monthly', '2024-03-05', '2025-03-05', 'paid'),
(31, 5, 'discount',  'active', 3, 'monthly', '2024-03-05', '2025-03-05', 'paid'),
(32, 5, 'batch',     'active', 3, 'monthly', '2024-03-05', '2025-03-05', 'paid');
