/**
 * Document upload utility using Cloudinary
 * Supports PDF, DOC, DOCX — stored as 'raw' resource type
 * Free tier: 25GB storage + 25GB bandwidth/month
 */

import { uploadToCloudinary } from './cloudinary';

const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export async function uploadDocument(
  file: File,
  folder = 'nbsc-gco/documents'
): Promise<string> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Only PDF and Word documents (.doc, .docx) are allowed.');
  }

  if (file.size > 10 * 1024 * 1024) {
    throw new Error('File size must be less than 10MB.');
  }

  return uploadToCloudinary(file, folder);
}
