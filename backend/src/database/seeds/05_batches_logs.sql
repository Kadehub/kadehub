-- ============================================================
-- SEED 5: Batches, Audit Logs, Payment Transactions
-- ============================================================

INSERT INTO `batch` (id, tenant_id, product_id, batch_number, quantity, cost, manufactured_date, expiry_date) VALUES
(1,  1, 1,  'BT-2024-001', 100, 140.00, '2024-01-01', '2025-01-01'),
(2,  1, 2,  'BT-2024-002',  50, 500.00, '2024-02-01', '2025-02-01'),
(3,  1, 5,  'BT-2024-003',  90, 240.00, '2024-03-01', '2024-09-01'),
(4,  1, 6,  'BT-2024-004',  45, 370.00, '2024-04-01', '2024-10-01'),
(5,  2, 7,  'BT-2024-005', 150,  85.00, '2024-01-15', '2026-01-15'),
(6,  2, 8,  'BT-2024-006',  70, 320.00, '2024-02-15', '2025-08-15'),
(7,  2, 9,  'BT-2024-007',  55, 200.00, '2024-03-01', '2026-03-01'),
(8,  2, 12, 'BT-2024-008',  30, 680.00, '2024-04-01', '2024-07-01'),
(9,  3, 13, 'BT-2024-009', 180,  38.00, '2024-02-01', '2025-02-01'),
(10, 3, 15, 'BT-2024-010',  90, 130.00, '2024-01-01', '2025-01-01'),
(11, 4, 17, 'BT-2024-011',  50, 760.00, '2024-03-01', '2025-09-01'),
(12, 4, 20, 'BT-2024-012',  95, 185.00, '2024-04-01', '2024-10-01'),
(13, 5, 21, 'BT-2024-013',  85, 320.00, '2024-02-01', '2025-02-01'),
(14, 5, 23, 'BT-2024-014',  60, 520.00, '2024-03-01', '2025-09-01'),
-- Expiring soon (within 30 days from 2024-06-01)
(15, 1, 3,  'BT-2024-015', 200,  55.00, '2023-07-01', '2024-06-20'),
(16, 2, 10, 'BT-2024-016',  80, 260.00, '2023-08-01', '2024-06-25');

INSERT INTO `audit_log` (id, tenant_id, user_id, action, entity, entity_id, details) VALUES
(1,  1, 1, 'CREATE', 'product',  1,  '{"name":"Maliban Cream Cracker 200g"}'),
(2,  1, 1, 'CREATE', 'product',  2,  '{"name":"Anchor Milk Powder 400g"}'),
(3,  1, 2, 'CREATE', 'sale',     1,  '{"total":960.00,"method":"CASH"}'),
(4,  1, 2, 'CREATE', 'sale',     2,  '{"total":650.00,"method":"CARD"}'),
(5,  1, 1, 'UPDATE', 'product',  3,  '{"field":"price","old":70,"new":75}'),
(6,  2, 3, 'CREATE', 'product',  7,  '{"name":"Panadol 500mg x10"}'),
(7,  2, 4, 'CREATE', 'sale',     6,  '{"total":570.00,"method":"CASH"}'),
(8,  3, 5, 'CREATE', 'supplier', 5,  '{"name":"Prima Ceylon"}'),
(9,  4, 7, 'CREATE', 'sale',     10, '{"total":2450.00,"method":"CASH"}'),
(10, 4, 7, 'UPDATE', 'inventory',17, '{"field":"quantity","old":80,"new":50}'),
(11, 5, 9, 'CREATE', 'customer', 10, '{"name":"Selvam Murugan"}'),
(12, 1, 1, 'DELETE', 'expense',  NULL,'{"reason":"Duplicate entry"}'),
(13, 2, 3, 'CREATE', 'discount', 3,  '{"name":"Pharmacy 10% Off"}'),
(14, 1, 2, 'CREATE', 'sale',     5,  '{"total":1860.00,"method":"CREDIT"}'),
(15, 4, 7, 'CREATE', 'purchase_order', 6, '{"supplier":"Nestle Lanka","total":38000}');

INSERT INTO `payment_transaction` (id, tenant_id, package_id, amount, currency, billing_cycle, gateway, gateway_ref, status) VALUES
(1, 1, 2, 1990.00, 'LKR', 'monthly', 'card',   'TXN-2024-0001', 'completed'),
(2, 2, 3, 34900.00,'LKR', 'yearly',  'bank',   'TXN-2024-0002', 'completed'),
(3, 3, 1,  990.00, 'LKR', 'monthly', 'paypal', 'TXN-2024-0003', 'completed'),
(4, 4, 2, 19900.00,'LKR', 'yearly',  'card',   'TXN-2024-0004', 'completed'),
(5, 5, 3, 1990.00, 'LKR', 'monthly', 'card',   'TXN-2024-0005', 'completed');
