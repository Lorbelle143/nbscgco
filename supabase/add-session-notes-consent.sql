-- Counseling Session Notes table
CREATE TABLE IF NOT EXISTS counseling_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id TEXT NOT NULL,
  full_name TEXT NOT NULL,
  session_date DATE NOT NULL,
  session_number INTEGER DEFAULT 1,
  presenting_problem TEXT,
  session_notes TEXT NOT NULL,
  interventions_used TEXT,
  progress_notes TEXT,
  next_session_plan TEXT,
  session_status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Consent Records table
CREATE TABLE IF NOT EXISTS consent_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE counseling_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE consent_records DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_sessions_student_id ON counseling_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_consent_student_id ON consent_records(student_id);

SELECT 'Tables created!' as status;
