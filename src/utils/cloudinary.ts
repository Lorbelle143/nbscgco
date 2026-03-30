/**
 * Cloudinary upload utility
 * Uses unsigned upload preset — no API secret needed on frontend
 * Free tier: 25GB storage + 25GB bandwidth/month
 */

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '';

// Determine Cloudinary resource type based on file MIME type
function getResourceType(file: File): 'image' | 'video' | 'raw' {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  return 'raw'; // PDFs, DOCX, XLSX, etc.
}

export async function uploadToCloudinary(
  file: File,
  folder = 'nbsc-gco'
): Promise<string> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error('Cloudinary is not configured. Add VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET to your .env file.');
  }

  const resourceType = getResourceType(file);

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', folder);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`,
    { method: 'POST', body: formData }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Cloudinary upload failed');
  }

  const data = await res.json();
  return data.secure_url as string;
}
