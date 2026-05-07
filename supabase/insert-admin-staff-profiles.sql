-- ============================================================
-- Insert profiles for admin and staff accounts
-- Run this AFTER adding them in Authentication > Users
-- ============================================================

-- First, let's see their auth UUIDs
-- (copy the IDs from Authentication > Users in the dashboard)
-- Then this script will insert their profiles automatically

INSERT INTO profiles (id, email, full_name, student_id, is_admin, role)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)) as full_name,
  au.email as student_id,  -- use email as student_id for staff/admin
  TRUE as is_admin,
  CASE 
    WHEN au.email IN ('gco@nbsc.edu.ph', 'lorbelleganzan@gmail.com', 'jacorpuz@nbsc.edu.ph', 'jfnganzan@nbsc.edu.ph') 
      THEN 'admin'
    WHEN au.email IN ('20241283@nbsc.edu.ph', '20240264@nbsc.edu.ph', '20240364@nbsc.edu.ph') 
      THEN 'staff'
    ELSE 'admin'
  END as role
FROM auth.users au
WHERE au.email IN (
  'gco@nbsc.edu.ph',
  'lorbelleganzan@gmail.com',
  'jacorpuz@nbsc.edu.ph',
  'jfnganzan@nbsc.edu.ph',
  '20241283@nbsc.edu.ph',
  '20240264@nbsc.edu.ph',
  '20240364@nbsc.edu.ph'
)
ON CONFLICT (id) DO UPDATE SET
  is_admin = TRUE,
  role = EXCLUDED.role;

-- Verify
SELECT p.email, p.full_name, p.role, p.is_admin
FROM profiles p
WHERE p.email IN (
  'gco@nbsc.edu.ph',
  'lorbelleganzan@gmail.com',
  'jacorpuz@nbsc.edu.ph',
  'jfnganzan@nbsc.edu.ph',
  '20241283@nbsc.edu.ph',
  '20240264@nbsc.edu.ph',
  '20240364@nbsc.edu.ph'
)
ORDER BY p.role, p.email;
