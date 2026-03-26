-- Fix profiles table: add missing columns + fix RLS
-- Run this in Supabase SQL Editor

-- Add missing columns (safe — won't fail if they already exist)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_picture TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pending_password TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS course TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS year_level TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS contact_number TEXT;

-- Fix RLS: drop all old policies and create one permissive policy
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Allow all operations on profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Allow public profile creation" ON profiles;

CREATE POLICY "Allow all operations on profiles"
  ON profiles FOR ALL
  USING (true)
  WITH CHECK (true);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Verify
SELECT COUNT(*) as total_students FROM profiles WHERE is_admin = false;
