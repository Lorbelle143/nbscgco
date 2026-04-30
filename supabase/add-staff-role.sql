-- ============================================================
-- STEP 1: Add role column (run this first, only once)
-- ============================================================
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'student'
CHECK (role IN ('student', 'staff', 'admin'));

-- ============================================================
-- STEP 2: Set admin accounts
-- ============================================================
UPDATE profiles
SET role = 'admin', is_admin = TRUE
WHERE email IN (
  'gco@nbsc.edu.ph',
  'lorbelleganzan@gmail.com',
  'jacorpuz@nbsc.edu.ph',
  'jfnganzan@nbsc.edu.ph'
);

-- ============================================================
-- STEP 3: Set staff (peer counselor) accounts
-- ============================================================
UPDATE profiles
SET role = 'staff', is_admin = TRUE
WHERE email IN (
  '20241283@nbsc.edu.ph',
  '20240264@nbsc.edu.ph',
  '20240364@nbsc.edu.ph'
);

-- ============================================================
-- STEP 4: Verify
-- ============================================================
SELECT email, full_name, role, is_admin
FROM profiles
ORDER BY role, email;
