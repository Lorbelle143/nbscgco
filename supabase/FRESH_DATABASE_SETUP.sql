-- ============================================
-- COMPLETE FRESH DATABASE SETUP
-- Run this in Supabase SQL Editor
-- ============================================

-- TABLES

CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  student_id TEXT NOT NULL UNIQUE,
  is_admin BOOLEAN DEFAULT FALSE,
  profile_picture_url TEXT,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL,
  full_name TEXT NOT NULL,
  course TEXT NOT NULL,
  year_level TEXT NOT NULL,
  contact_number TEXT NOT NULL,
  photo_url TEXT NOT NULL,
  form_data JSONB NOT NULL,
  google_form_response_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mental_health_assessments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL,
  full_name TEXT NOT NULL,
  feeling_alone INTEGER DEFAULT 0,
  feeling_blue INTEGER DEFAULT 0,
  feeling_easily_annoyed INTEGER DEFAULT 0,
  feeling_tense_anxious INTEGER DEFAULT 0,
  feeling_inferior INTEGER DEFAULT 0,
  having_suicidal_thoughts INTEGER DEFAULT 0,
  total_score INTEGER NOT NULL,
  risk_level TEXT NOT NULL,
  requires_counseling BOOLEAN DEFAULT FALSE,
  responses JSONB,
  counseling_status TEXT DEFAULT 'pending',
  counselor_notes TEXT,
  is_counseled BOOLEAN DEFAULT FALSE,
  counseled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_id UUID,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id TEXT,
  details TEXT,
  performed_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  master_key TEXT NOT NULL DEFAULT 'sirjogwapo',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO admin_settings (id, master_key)
VALUES (1, 'sirjogwapo')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS password_reset_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id TEXT NOT NULL,
  email TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_profiles_student_id ON profiles(student_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_inventory_student_id ON inventory_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_mental_health_student_id ON mental_health_assessments(student_id);
CREATE INDEX IF NOT EXISTS idx_mental_health_risk_level ON mental_health_assessments(risk_level);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON student_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- DISABLE RLS
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_submissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE mental_health_assessments DISABLE ROW LEVEL SECURITY;
ALTER TABLE student_notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE admin_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_requests DISABLE ROW LEVEL SECURITY;

-- STORAGE BUCKETS
INSERT INTO storage.buckets (id, name, public)
VALUES ('student-photos', 'student-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-pictures', 'profile-pictures', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Allow all storage operations" ON storage.objects;
CREATE POLICY "Allow all storage operations"
  ON storage.objects FOR ALL
  USING (bucket_id IN ('student-photos', 'profile-pictures'))
  WITH CHECK (bucket_id IN ('student-photos', 'profile-pictures'));

-- AUTO-CONFIRM NEW USERS (bypass email verification)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE auth.users
  SET email_confirmed_at = NOW(), confirmed_at = NOW()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ALSO CONFIRM ANY EXISTING UNCONFIRMED USERS
UPDATE auth.users
SET email_confirmed_at = NOW(), confirmed_at = NOW()
WHERE email_confirmed_at IS NULL;

-- DONE
SELECT 'Setup complete!' as status;
