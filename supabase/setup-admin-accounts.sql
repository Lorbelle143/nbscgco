-- ============================================================
-- Setup Admin Accounts
-- Run this AFTER creating the accounts in Supabase Dashboard:
--   Authentication → Users → "Add user" (invite or create)
--
-- Accounts to create:
--   gco@nbsc.edu.ph          → role: admin
--   lorbelleganzan@gmail.com → role: admin
--   jacorpuz@nbsc.edu.ph     → role: admin
--   jfnganzan@nbsc.edu.ph    → role: admin
-- ============================================================

-- Mark all four accounts as admin role
UPDATE profiles
SET role = 'admin', is_admin = TRUE
WHERE email IN (
  'gco@nbsc.edu.ph',
  'lorbelleganzan@gmail.com',
  'jacorpuz@nbsc.edu.ph',
  'jfnganzan@nbsc.edu.ph'
);

-- Verify
SELECT id, email, full_name, role, is_admin
FROM profiles
WHERE email IN (
  'gco@nbsc.edu.ph',
  'lorbelleganzan@gmail.com',
  'jacorpuz@nbsc.edu.ph',
  'jfnganzan@nbsc.edu.ph'
)
ORDER BY email;
