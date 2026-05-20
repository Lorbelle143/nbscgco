/**
 * Document upload utility using Cloudinary
 * Supports PDF — stored as 'raw' resource type
 * Free tier: 25GB storage + 25GB bandwidth/month
 */

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '';

export async function uploadDocument(
  file: File,
  folder = 'nbsc-gco/paper-forms'
): Promise<string> {
  if (file.type !== 'application/pdf') {
    throw new Error('Only PDF files are allowed.');
  }

  if (file.size > 10 * 1024 * 1024) {
    throw new Error('File size must be less than 10MB.');
  }

  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error('Cloudinary not configured. Please set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET.');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', folder);
  formData.append('resource_type', 'raw'); // required for PDF

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/raw/upload`,
      { method: 'POST', body: formData, signal: controller.signal }
    );

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || 'PDF upload failed');
    }

    const data = await res.json();
    return data.secure_url as string;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function uploadMultipleDocuments(
  files: File[],
  folder = 'nbsc-gco/paper-forms'
): Promise<string[]> {
  const urls: string[] = [];
  for (const file of files) {
    const url = await uploadDocument(file, folder);
    urls.push(url);
  }
  return urls;
}
