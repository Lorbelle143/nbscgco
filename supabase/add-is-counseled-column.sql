-- Add is_counseled column to mental_health_assessments table
ALTER TABLE mental_health_assessments
ADD COLUMN IF NOT EXISTS is_counseled boolean DEFAULT false;
