-- Add notes/remarks column to consent_records
ALTER TABLE consent_records ADD COLUMN IF NOT EXISTS notes TEXT;

SELECT 'consent_records.notes column added!' as status;
