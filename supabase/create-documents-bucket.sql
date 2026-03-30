-- Create Storage Bucket for Student Documents (PDF, DOCX)
-- Run this in Supabase SQL Editor

-- Step 1: Create the bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'student-documents',
  'student-documents',
  true,
  10485760, -- 10MB in bytes
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

-- Step 2: Drop existing policies if any
DROP POLICY IF EXISTS "Allow all operations on student-documents" ON storage.objects;

-- Step 3: Authenticated users can upload/read their own documents
CREATE POLICY "Allow authenticated uploads to student-documents"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'student-documents');

CREATE POLICY "Allow public read on student-documents"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'student-documents');

CREATE POLICY "Allow authenticated delete on student-documents"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'student-documents');

-- Step 4: Verify
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'student-documents';
