-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,         -- create, update, delete, view, export
  entity TEXT NOT NULL,         -- inventory_submission, student, mental_health, user
  entity_id TEXT,               -- ID of the affected record
  details TEXT,                 -- Human-readable description
  performed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow insert from authenticated users (admin)
CREATE POLICY "Allow insert audit logs" ON audit_logs
  FOR INSERT WITH CHECK (true);

-- Allow admin to read all logs
CREATE POLICY "Allow read audit logs" ON audit_logs
  FOR SELECT USING (true);
