-- Fix audit_logs table: add performed_by column if missing
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS performed_by TEXT DEFAULT 'admin';

-- Ensure RLS policies exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'audit_logs' AND policyname = 'Allow insert audit logs'
  ) THEN
    CREATE POLICY "Allow insert audit logs" ON audit_logs FOR INSERT WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'audit_logs' AND policyname = 'Allow read audit logs'
  ) THEN
    CREATE POLICY "Allow read audit logs" ON audit_logs FOR SELECT USING (true);
  END IF;
END $$;

-- Create the table fresh if it doesn't exist at all
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  details TEXT,
  performed_by TEXT DEFAULT 'admin',
  performed_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
