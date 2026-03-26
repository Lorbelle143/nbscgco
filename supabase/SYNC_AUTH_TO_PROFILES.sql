-- ============================================================
-- SYNC AUTH USERS BACK TO PROFILES TABLE
-- Run this AFTER EMERGENCY_FIX.sql
-- This re-creates profile rows for all existing auth.users
-- ============================================================

-- Step 1: Insert back all auth users into profiles
-- Uses metadata if available, otherwise falls back to email prefix
-- student_id uses email prefix (e.g. "20201362" from "20201362@nbsc.edu.ph")
-- Admin can fix names/IDs later via User Management
INSERT INTO profiles (id, email, full_name, student_id, is_admin, created_at)
SELECT 
  au.id,
  au.email,
  COALESCE(
    NULLIF(au.raw_user_meta_data->>'full_name', ''),
    split_part(au.email, '@', 1)
  ) AS full_name,
  COALESCE(
    NULLIF(au.raw_user_meta_data->>'student_id', ''),
    split_part(au.email, '@', 1)
  ) AS student_id,
  FALSE AS is_admin,
  au.created_at
FROM auth.users au
WHERE NOT EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = au.id
  )
ON CONFLICT (id) DO NOTHING;

-- Step 2: Fix any duplicate student_id conflicts by appending a suffix
-- (happens when email prefix is used as fallback for multiple users)
UPDATE profiles p
SET student_id = p.student_id || '_' || substr(p.id::text, 1, 4)
WHERE p.student_id IN (
  SELECT student_id FROM profiles
  GROUP BY student_id
  HAVING COUNT(*) > 1
)
AND p.full_name = split_part(p.email, '@', 1); -- only fix auto-generated ones

-- Step 3: Show what was synced
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.student_id,
  p.is_admin,
  p.created_at
FROM profiles p
ORDER BY p.created_at DESC;

-- Step 4: Count
SELECT 
  COUNT(*) FILTER (WHERE is_admin = false) AS total_students,
  COUNT(*) FILTER (WHERE is_admin = true) AS total_admins
FROM profiles;
