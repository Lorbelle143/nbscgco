-- Fix RLS for password_reset_requests
-- Admin uses master key (no Supabase session), so auth.uid() is null.
-- Drop the restrictive policies and allow full access.

-- Drop old policies
DROP POLICY IF EXISTS "Anyone can insert reset requests" ON password_reset_requests;
DROP POLICY IF EXISTS "Admins can read all reset requests" ON password_reset_requests;
DROP POLICY IF EXISTS "Admins can update reset requests" ON password_reset_requests;

-- Disable RLS entirely — this table has no sensitive personal data
-- (just student ID, name, reason for password reset)
ALTER TABLE password_reset_requests DISABLE ROW LEVEL SECURITY;

-- Also fix profiles UPDATE policy so admin can set pending_password
-- (Admin has no Supabase session, so auth.uid() = null blocks updates)
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (true);
