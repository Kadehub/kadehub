-- ============================================================
-- SEED 2: Products, Inventory, Suppliers, Customers
-- ============================================================

INSERT INTO `supplier` (id, tenant_id, name, contact_person, phone, email, address, is_active) VALUES
(1, 1, 'Maliban Biscuits',     'Rohan Silva',   '0112233445', 'rohan@maliban.lk',   'Colombo 10', 1),
(2, 1, 'Cargills Foods',       'Amara Perera',  '0112233446', 'amara@cargills.lk',  'Colombo 02', 1),
(3, 2, 'Hemas Pharma',         'Dilshan Raj',   '0112233447', 'dilshan@hemas.lk',   'Colombo 14', 1),
(4, 2, 'Asiri Pharma',         'Kumari Dias',   '0112233448', 'kumari@asiri.lk',    'Colombo 05', 1),
(5, 3, 'Prima Ceylon',         'Suresh Kumar',  '0112233449', 'suresh@prima.lk',    'Colombo 15', 1),
(6, 4, 'Nestlé Lanka',         'Fathima Noor',  '0112233450', 'fathima@nestle.lk',  'Colombo 03', 1),
(7, 5, 'Unilever Lanka',       'Pradeep Raj',   '0112233451', 'pradeep@unilever.lk','Colombo 08', 1),
(8, 5, 'Fonterra Lanka',       'Siva Murugan',  '0112233452', 'siva@fonterra.lk',   'Colombo 12', 1);

INSERT INTO `product` (id, tenant_id, name, barcode, price, cost, category, is_active) VALUES
-- Tenant 1 - Grocery
(1,  1, 'Maliban Cream Cracker 200g', '4890001001', 185.00, 140.00, 'Biscuits',   1),
(2,  1, 'Anchor Milk Powder 400g',    '4890001002', 650.00, 500.00, 'Dairy',      1),
(3,  1, 'Sunlight Soap 90g',          '4890001003',  75.00,  55.00, 'Household',  1),
(4,  1, 'Astra Margarine 200g',       '4890001004', 220.00, 170.00, 'Dairy',      1),
(5,  1, 'Milo 200g',                  '4890001005', 310.00, 240.00, 'Beverages',  1),
(6,  1, 'Keells Sausages 500g',       '4890001006', 480.00, 370.00, 'Meat',       1),
-- Tenant 2 - Pharmacy
(7,  2, 'Panadol 500mg x10',          '4890002001', 120.00,  85.00, 'Medicine',   1),
(8,  2, 'Vitamin C 1000mg x30',       '4890002002', 450.00, 320.00, 'Vitamins',   1),
(9,  2, 'Dettol Antiseptic 100ml',    '4890002003', 280.00, 200.00, 'Antiseptic', 1),
(10, 2, 'Strepsils x24',              '4890002004', 350.00, 260.00, 'Medicine',   1),
(11, 2, 'Bandage Roll 5cm',           '4890002005',  95.00,  65.00, 'First Aid',  1),
(12, 2, 'Cetaphil Lotion 250ml',      '4890002006', 890.00, 680.00, 'Skincare',   1),
-- Tenant 3 - Retail
(13, 3, 'Prima Noodles 80g',          '4890003001',  55.00,  38.00, 'Noodles',    1),
(14, 3, 'Elephant House Ginger Beer', '4890003002',  90.00,  65.00, 'Beverages',  1),
(15, 3, 'Laojee Tea 100g',            '4890003003', 175.00, 130.00, 'Tea',        1),
(16, 3, 'Sunlight Dish Wash 400ml',   '4890003004', 195.00, 145.00, 'Household',  1),
-- Tenant 4 - Supermart
(17, 4, 'Nestlé Milo 1kg',            '4890004001', 980.00, 760.00, 'Beverages',  1),
(18, 4, 'Maggi Noodles 77g',          '4890004002',  65.00,  45.00, 'Noodles',    1),
(19, 4, 'Astra Butter 200g',          '4890004003', 320.00, 250.00, 'Dairy',      1),
(20, 4, 'Coca-Cola 1.5L',             '4890004004', 250.00, 185.00, 'Beverages',  1),
-- Tenant 5 - Lakshmi
(21, 5, 'Surf Excel 1kg',             '4890005001', 420.00, 320.00, 'Household',  1),
(22, 5, 'Lifebuoy Soap 100g',         '4890005002',  85.00,  60.00, 'Personal',   1),
(23, 5, 'Horlicks 500g',              '4890005003', 680.00, 520.00, 'Beverages',  1),
(24, 5, 'Pears Soap 75g',             '4890005004', 120.00,  88.00, 'Personal',   1);

INSERT INTO `inventory` (id, product_id, quantity, reorder_level) VALUES
(1,  1,  120, 20), (2,  2,  80,  15), (3,  3,  200, 30), (4,  4,  60,  10),
(5,  5,  90,  15), (6,  6,  45,  10), (7,  7,  150, 25), (8,  8,  70,  10),
(9,  9,  55,  10), (10, 10, 80,  15), (11, 11, 100, 20), (12, 12, 30,   5),
(13, 13, 180, 30), (14, 14, 120, 20), (15, 15, 90,  15), (16, 16, 75,  10),
(17, 17, 50,  10), (18, 18, 160, 25), (19, 19, 70,  10), (20, 20, 95,  15),
(21, 21, 85,  15), (22, 22, 200, 30), (23, 23, 60,  10), (24, 24, 110, 20);

INSERT INTO `customer` (id, tenant_id, name, phone, loyalty_points, created_at) VALUES
(1,  1, 'Anura Bandara',    '0771234501', 150, '2024-01-15 10:00:00'),
(2,  1, 'Sandya Kumari',    '0771234502', 80,  '2024-01-20 11:00:00'),
(3,  1, 'Roshan Perera',    '0771234503', 220, '2024-02-05 09:30:00'),
(4,  2, 'Malini Fernando',  '0771234504', 50,  '2024-01-18 14:00:00'),
(5,  2, 'Thilak Jayawardena','0771234505', 120, '2024-02-10 10:30:00'),
(6,  3, 'Chaminda Silva',   '0771234506', 90,  '2024-02-08 09:00:00'),
(7,  3, 'Nilmini Rajapaksa','0771234507', 60,  '2024-02-15 15:00:00'),
(8,  4, 'Prasad Wickrama',  '0771234508', 200, '2024-02-25 11:00:00'),
(9,  4, 'Dilrukshi Perera', '0771234509', 75,  '2024-03-01 10:00:00'),
(10, 5, 'Selvam Murugan',   '0771234510', 180, '2024-03-10 09:00:00'),
(11, 5, 'Kavitha Nair',     '0771234511', 95,  '2024-03-12 14:00:00'),
(12, 1, 'Pradeep Gunasekara','0771234512', 40,  '2024-03-20 10:00:00');
