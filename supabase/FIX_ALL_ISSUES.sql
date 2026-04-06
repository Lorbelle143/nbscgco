-- ============================================
-- FIX ALL ISSUES MIGRATION
-- Run this in Supabase SQL Editor
-- Fixes all column mismatches and missing tables
-- ============================================

-- ============================================
-- FIX 1: audit_logs — column name mismatch
-- Code uses: entity, entity_id, performed_by, performed_at
-- Schema had: table_name, record_id, created_at (no performed_by/performed_at)
-- ============================================
ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS entity TEXT,
  ADD COLUMN IF NOT EXISTS entity_id TEXT,
  ADD COLUMN IF NOT EXISTS performed_by TEXT DEFAULT 'admin',
  ADD COLUMN IF NOT EXISTS performed_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================
-- FIX 2: profiles — missing pending_password column
-- Used by Login.tsx, authStore.ts, AdminDashboard.tsx
-- ============================================
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS pending_password TEXT,
  ADD COLUMN IF NOT EXISTS profile_picture TEXT,
  ADD COLUMN IF NOT EXISTS profile_picture_url TEXT,
  ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

-- ============================================
-- FIX 3: password_reset_requests — missing columns
-- full_name used in ForgotPassword.tsx insert
-- resolved_at used in AdminDashboard.tsx update
-- ============================================
ALTER TABLE password_reset_requests
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS reason TEXT,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

-- ============================================
-- FIX 4: student_notifications — type constraint too strict
-- 'session_recorded' and 'consent_updated' not in original CHECK
-- Drop old constraint and replace with a permissive one
-- ============================================
ALTER TABLE student_notifications
  DROP CONSTRAINT IF EXISTS student_notifications_type_check;

-- No constraint — allow any type string (simpler, more flexible)

-- ============================================
-- FIX 5: consent_records — table missing entirely
-- Used by ConsentTracker, FollowUpTracker, CounselingSessionNotes, StudentDashboard
-- ============================================
CREATE TABLE IF NOT EXISTS consent_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'signed', 'declined')),
  notes TEXT,
  signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consent_records_student_id ON consent_records(student_id);
CREATE INDEX IF NOT EXISTS idx_consent_records_status ON consent_records(status);

ALTER TABLE consent_records DISABLE ROW LEVEL SECURITY;

-- ============================================
-- FIX 6: counseling_sessions — table missing entirely
-- Used by CounselingSessionNotes and ReportsExport
-- ============================================
CREATE TABLE IF NOT EXISTS counseling_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id TEXT NOT NULL,
  full_name TEXT NOT NULL,
  session_number INTEGER NOT NULL DEFAULT 1,
  session_date DATE NOT NULL,
  session_status TEXT NOT NULL DEFAULT 'completed' CHECK (session_status IN ('completed', 'scheduled', 'no-show', 'cancelled')),
  presenting_problem TEXT,
  session_notes TEXT,
  interventions_used TEXT,
  progress_notes TEXT,
  next_session_plan TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_counseling_sessions_student_id ON counseling_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_counseling_sessions_date ON counseling_sessions(session_date);

ALTER TABLE counseling_sessions DISABLE ROW LEVEL SECURITY;

-- ============================================
-- FIX 7: mental_health_assessments — missing counseling_notes column
-- Used by MentalHealthAdmin.tsx (edit notes), pdfUtils, formHtml
-- ============================================
ALTER TABLE mental_health_assessments
  ADD COLUMN IF NOT EXISTS counseling_notes TEXT,
  ADD COLUMN IF NOT EXISTS counseling_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS counselor_notes TEXT,
  ADD COLUMN IF NOT EXISTS is_counseled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS counseled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================
-- FIX 8: inventory_submissions — missing status columns
-- Used by AdminDashboard for submission review workflow
-- ============================================
ALTER TABLE inventory_submissions
  ADD COLUMN IF NOT EXISTS submission_status TEXT DEFAULT 'submitted',
  ADD COLUMN IF NOT EXISTS admin_remarks TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================
-- VERIFY
-- ============================================
SELECT 'consent_records' as tbl, COUNT(*) FROM consent_records
UNION ALL SELECT 'counseling_sessions', COUNT(*) FROM counseling_sessions
UNION ALL SELECT 'audit_logs', COUNT(*) FROM audit_logs
UNION ALL SELECT 'password_reset_requests', COUNT(*) FROM password_reset_requests;

SELECT 'All fixes applied successfully!' as status;
