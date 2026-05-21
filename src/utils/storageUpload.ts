/**
 * Document upload utility using Cloudinary
 * Uploads PDFs as images (fl_attachment:false) for direct browser viewing
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
    throw new Error('Cloudinary not configured.');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', folder);
  // Use 'image' resource type — Cloudinary converts PDF pages to images
  // This gives a publicly accessible URL without authentication

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    // Try image upload first (converts PDF to viewable format)
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      { method: 'POST', body: formData, signal: controller.signal }
    );

    if (!res.ok) {
      // Fallback to raw upload
      const formData2 = new FormData();
      formData2.append('file', file);
      formData2.append('upload_preset', UPLOAD_PRESET);
      formData2.append('folder', folder);
      const res2 = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/raw/upload`,
        { method: 'POST', body: formData2 }
      );
      if (!res2.ok) {
        const err = await res2.json();
        throw new Error(err.error?.message || 'PDF upload failed');
      }
      const data2 = await res2.json();
      // Return with Google Docs viewer prefix for raw URLs
      return `GDOCS:${data2.secure_url}`;
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

// Helper to get viewable URL
export function getViewableUrl(url: string): string {
  if (url.startsWith('GDOCS:')) {
    const actualUrl = url.replace('GDOCS:', '');
    return `https://docs.google.com/viewer?url=${encodeURIComponent(actualUrl)}`;
  }
  return url;
}
