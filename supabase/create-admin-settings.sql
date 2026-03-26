-- Create admin_settings table to store changeable admin credentials
CREATE TABLE IF NOT EXISTS admin_settings (
  id integer PRIMARY KEY DEFAULT 1,
  master_key text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- Insert default row (replace 'CHANGE_ME' with your actual current master key)
INSERT INTO admin_settings (id, master_key)
VALUES (1, 'CHANGE_ME')
ON CONFLICT (id) DO NOTHING;

-- Disable RLS entirely — this table has no user data, access is controlled by app logic
ALTER TABLE admin_settings DISABLE ROW LEVEL SECURITY;
