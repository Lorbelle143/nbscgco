-- Drop the check constraint on counseling_status
ALTER TABLE mental_health_assessments
  DROP CONSTRAINT IF EXISTS mental_health_assessments_counseling_status_check;

-- Re-add with all valid values
ALTER TABLE mental_health_assessments
  ADD CONSTRAINT mental_health_assessments_counseling_status_check
  CHECK (counseling_status IN ('pending', 'scheduled', 'in-progress', 'completed'));

SELECT 'Constraint fixed!' as status;
