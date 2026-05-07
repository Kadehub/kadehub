-- ============================================================
-- SEED 4: Expenses, Credit Sales, Credit Payments, Purchase Orders
-- ============================================================

INSERT INTO `expense` (id, tenant_id, user_id, category, description, amount, expense_date) VALUES
(1,  1, 1, 'Utilities',    'Electricity bill June',       3200.00, '2024-06-01'),
(2,  1, 1, 'Rent',         'Shop rent June',              15000.00,'2024-06-01'),
(3,  1, 1, 'Salary',       'Cashier salary June',         18000.00,'2024-06-30'),
(4,  1, 1, 'Maintenance',  'Fridge repair',               2500.00, '2024-06-10'),
(5,  2, 3, 'Utilities',    'Electricity bill June',       2800.00, '2024-06-01'),
(6,  2, 3, 'Rent',         'Pharmacy rent June',          20000.00,'2024-06-01'),
(7,  2, 3, 'Salary',       'Staff salary June',           22000.00,'2024-06-30'),
(8,  3, 5, 'Utilities',    'Water & electricity',         1900.00, '2024-06-01'),
(9,  3, 5, 'Rent',         'Shop rent June',              12000.00,'2024-06-01'),
(10, 4, 7, 'Utilities',    'Electricity bill June',       4500.00, '2024-06-01'),
(11, 4, 7, 'Rent',         'Supermart rent June',         35000.00,'2024-06-01'),
(12, 4, 7, 'Marketing',    'Flyer printing',              1500.00, '2024-06-05'),
(13, 5, 9, 'Utilities',    'Electricity bill June',       2200.00, '2024-06-01'),
(14, 5, 9, 'Rent',         'Store rent June',             10000.00,'2024-06-01'),
(15, 1, 1, 'Supplies',     'Packaging bags',               800.00, '2024-06-12');

-- Credit sales (sale_id 5 was CREDIT payment)
INSERT INTO `credit_sale` (id, tenant_id, sale_id, customer_id, amount_due, amount_paid, due_date, status) VALUES
(1, 1, 5, 3, 1860.00, 1000.00, '2024-07-01', 'partial'),
(2, 2, 7, 5, 1240.00, 0.00,    '2024-07-15', 'outstanding'),
(3, 4, 10,8, 2250.00, 2250.00, '2024-07-01', 'paid');

INSERT INTO `credit_payment` (id, credit_sale_id, amount, payment_method, paid_at) VALUES
(1, 1, 1000.00, 'CASH',    '2024-06-15 10:00:00'),
(2, 3, 2250.00, 'CARD',    '2024-06-20 14:00:00');

INSERT INTO `purchase_order` (id, tenant_id, supplier_id, user_id, status, total_amount, notes, received_at) VALUES
(1, 1, 1, 1, 'received',  14000.00, 'Monthly restock',  '2024-06-05 10:00:00'),
(2, 1, 2, 1, 'received',  25000.00, 'Dairy restock',    '2024-06-06 11:00:00'),
(3, 2, 3, 3, 'received',  18000.00, 'Medicine restock', '2024-06-04 09:00:00'),
(4, 2, 4, 3, 'pending',   12000.00, 'Skincare order',   NULL),
(5, 3, 5, 5, 'received',   9500.00, 'Noodles & tea',    '2024-06-03 10:00:00'),
(6, 4, 6, 7, 'received',  38000.00, 'Beverages restock','2024-06-05 14:00:00'),
(7, 5, 7, 9, 'pending',   15000.00, 'Household items',  NULL);

INSERT INTO `purchase_order_item` (id, order_id, product_id, quantity, cost, received_qty) VALUES
(1,  1, 1, 100, 140.00, 100), (2,  1, 3, 100,  55.00, 100),
(3,  2, 2,  50, 500.00,  50),
(4,  3, 7, 100,  85.00, 100), (5,  3, 9,  50, 200.00,  50),
(6,  4, 12, 20, 680.00,   0),
(7,  5, 13,100,  38.00, 100), (8,  5, 15, 50, 130.00,  50),
(9,  6, 17, 30, 760.00,  30), (10, 6, 20, 50, 185.00,  50),
(11, 7, 21, 50, 320.00,   0), (12, 7, 22,100,  60.00,   0);
