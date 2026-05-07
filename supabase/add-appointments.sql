-- ============================================================
-- Appointments / Scheduling Table
-- ============================================================

CREATE TABLE IF NOT EXISTS appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  reason TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'declined', 'completed', 'cancelled')),
  staff_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_student_user_id ON appointments(student_user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_student_id ON appointments(student_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

-- Disable RLS (consistent with rest of project)
ALTER TABLE appointments DISABLE ROW LEVEL SECURITY;
