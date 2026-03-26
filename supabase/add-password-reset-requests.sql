-- Password reset requests table
-- Students submit requests, admin approves by setting a new password
CREATE TABLE IF NOT EXISTS password_reset_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id TEXT NOT NULL,
  full_name TEXT,
  email TEXT,
  reason TEXT,
  status TEXT DEFAULT 'pending', -- pending | resolved
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- RLS: students can insert, admin can read/update
ALTER TABLE password_reset_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert reset requests"
  ON password_reset_requests FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can read all reset requests"
  ON password_reset_requests FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can update reset requests"
  ON password_reset_requests FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );
