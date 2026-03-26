-- Add last_login column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_login timestamptz;
