-- ⚠️  SEED ONLY — Change all passwords immediately after first login.
-- Run: UPDATE `user` SET password_hash = '<new_bcrypt_hash>' WHERE email = '<email>';
UPDATE `user` SET password_hash = '$2b$10$ad7JmS4kV9iwigovX2FWE.1uN1WtBqr8qEeA13.1AHK5H4p5CYTai'
WHERE email IN (
  'admin@perera.com',
  'cashier@perera.com',
  'admin@citypharm.com',
  'cashier@citypharm.com',
  'admin@nimal.com',
  'cashier@nimal.com',
  'admin@saman.com',
  'cashier@saman.com',
  'admin@lakshmi.com',
  'cashier@lakshmi.com'
);
