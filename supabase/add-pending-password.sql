-- Add pending_password column to profiles table
-- Admin sets this, student auto-applies it on next login
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pending_password TEXT DEFAULT NULL;
