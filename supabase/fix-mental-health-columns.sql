-- Fix mental_health_assessments table
-- Adds all missing individual response columns

ALTER TABLE mental_health_assessments
  ADD COLUMN IF NOT EXISTS feeling_alone INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS feeling_blue INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS feeling_easily_annoyed INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS feeling_tense_anxious INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS feeling_inferior INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS having_suicidal_thoughts INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS requires_counseling BOOLEAN DEFAULT FALSE;

SELECT 'Columns added!' as status;
