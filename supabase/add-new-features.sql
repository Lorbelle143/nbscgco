-- ============================================
-- NEW FEATURES MIGRATION
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Add counseling_status + counselor_notes to mental_health_assessments
ALTER TABLE mental_health_assessments
  ADD COLUMN IF NOT EXISTS counseling_status TEXT DEFAULT 'pending' CHECK (counseling_status IN ('pending', 'scheduled', 'in-progress', 'completed')),
  ADD COLUMN IF NOT EXISTS counselor_notes TEXT,
  ADD COLUMN IF NOT EXISTS counseled_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. Add submission_status + admin_remarks to inventory_submissions (for feedback loop)
ALTER TABLE inventory_submissions
  ADD COLUMN IF NOT EXISTS submission_status TEXT DEFAULT 'submitted' CHECK (submission_status IN ('submitted', 'under-review', 'approved', 'needs-revision')),
  ADD COLUMN IF NOT EXISTS admin_remarks TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 3. Create notifications table for in-app student notifications
CREATE TABLE IF NOT EXISTS student_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  student_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('submission_approved', 'submission_needs_revision', 'submission_under_review', 'mental_health_flagged', 'counseling_scheduled', 'general')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  related_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON student_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_student_id ON student_notifications(student_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON student_notifications(is_read);

ALTER TABLE student_notifications DISABLE ROW LEVEL SECURITY;

-- 4. Add profile_picture and last_login to profiles if not exists
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS profile_picture TEXT,
  ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;

-- Done
SELECT 'Migration complete' as status;
