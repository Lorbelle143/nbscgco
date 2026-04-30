-- ============================================================
-- Setup Staff (Peer Counselor) Accounts
-- Run this AFTER creating the accounts in Supabase Dashboard:
--   Authentication → Users → "Add user"
--
-- Accounts to create:
--   20241283@nbsc.edu.ph  → role: staff
--   20240264@nbsc.edu.ph  → role: staff
--   20240364@nbsc.edu.ph  → role: staff
-- ============================================================

UPDATE profiles
SET role = 'staff', is_admin = TRUE
WHERE email IN (
  '20241283@nbsc.edu.ph',
  '20240264@nbsc.edu.ph',
  '20240364@nbsc.edu.ph'
);

-- Verify
SELECT id, email, full_name, role, is_admin
FROM profiles
WHERE email IN (
  '20241283@nbsc.edu.ph',
  '20240264@nbsc.edu.ph',
  '20240364@nbsc.edu.ph'
)
ORDER BY email;
