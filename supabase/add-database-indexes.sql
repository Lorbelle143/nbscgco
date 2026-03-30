-- Database Indexes for Performance
-- Run this in Supabase SQL Editor
-- Speeds up queries for 5000+ students

-- profiles
CREATE INDEX IF NOT EXISTS idx_profiles_student_id     ON profiles(student_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email          ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin       ON profiles(is_admin);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at     ON profiles(created_at DESC);

-- inventory_submissions
CREATE INDEX IF NOT EXISTS idx_submissions_user_id     ON inventory_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student_id  ON inventory_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_created_at  ON inventory_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_course      ON inventory_submissions(course);
CREATE INDEX IF NOT EXISTS idx_submissions_year_level  ON inventory_submissions(year_level);

-- mental_health_assessments
CREATE INDEX IF NOT EXISTS idx_mha_user_id             ON mental_health_assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_mha_student_id          ON mental_health_assessments(student_id);
CREATE INDEX IF NOT EXISTS idx_mha_risk_level          ON mental_health_assessments(risk_level);
CREATE INDEX IF NOT EXISTS idx_mha_created_at          ON mental_health_assessments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mha_requires_counseling ON mental_health_assessments(requires_counseling);

-- audit_logs (uses performed_at, entity, entity_id — not created_at/table_name)
CREATE INDEX IF NOT EXISTS idx_audit_logs_action       ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity       ON audit_logs(entity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_performed_at ON audit_logs(performed_at DESC);

-- student_notifications
CREATE INDEX IF NOT EXISTS idx_notif_user_id           ON student_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_student_id        ON student_notifications(student_id);
CREATE INDEX IF NOT EXISTS idx_notif_is_read           ON student_notifications(is_read);

-- password_reset_requests
CREATE INDEX IF NOT EXISTS idx_reset_student_id        ON password_reset_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_reset_status            ON password_reset_requests(status);

-- Verify
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'profiles', 'inventory_submissions', 'mental_health_assessments',
    'audit_logs', 'student_notifications', 'password_reset_requests'
  )
ORDER BY tablename, indexname;
thanks 