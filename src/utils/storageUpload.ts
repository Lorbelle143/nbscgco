/**
 * Document upload utility
 * Uses Supabase Storage for PDFs — gives direct public URLs
 */

import { supabase } from '../lib/supabase';

export async function uploadDocument(
  file: File,
  folder = 'paper-forms'
): Promise<string> {
  if (file.type !== 'application/pdf') {
    throw new Error('Only PDF files are allowed.');
  }

  if (file.size > 10 * 1024 * 1024) {
    throw new Error('File size must be less than 10MB.');
  }

  // Generate unique filename
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  const fileName = `${folder}/${timestamp}-${random}.pdf`;

  const { error } = await supabase.storage
    .from('documents')
    .upload(fileName, file, {
      contentType: 'application/pdf',
      upsert: false,
    });

  if (error) throw new Error('Upload failed: ' + error.message);

  const { data } = supabase.storage
    .from('documents')
    .getPublicUrl(fileName);

  return data.publicUrl;
}

export async function uploadMultipleDocuments(
  files: File[],
  folder = 'paper-forms'
): Promise<string[]> {
  const urls: string[] = [];
  for (const file of files) {
    const url = await uploadDocument(file, folder);
    urls.push(url);
  }
  return urls;
}
