/**
 * Cloudinary upload utility with backup account fallback
 * Primary account is tried first — if it fails, backup account is used automatically.
 * Free tier per account: 25GB storage + 25GB bandwidth/month
 */

// Primary account
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '';

// Backup account (can be same account with different preset, or a second account)
const BACKUP_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_BACKUP_CLOUD_NAME || '';
const BACKUP_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_BACKUP_UPLOAD_PRESET || '';

function getResourceType(file: File): 'image' | 'video' | 'raw' {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  return 'raw';
}

async function uploadToAccount(
  file: File,
  folder: string,
  cloudName: string,
  uploadPreset: string
): Promise<string> {
  const resourceType = getResourceType(file);
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);
  formData.append('folder', folder);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
    { method: 'POST', body: formData }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Cloudinary upload failed');
  }

  const data = await res.json();
  return data.secure_url as string;
}

export async function uploadToCloudinary(
  file: File,
  folder = 'nbsc-gco'
): Promise<string> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error('Cloudinary is not configured. Add VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET to your .env file.');
  }

  try {
    // Try primary account first
    return await uploadToAccount(file, folder, CLOUD_NAME, UPLOAD_PRESET);
  } catch (primaryError) {
    // Fallback to backup account if configured
    if (BACKUP_CLOUD_NAME && BACKUP_UPLOAD_PRESET) {
      console.warn('Primary Cloudinary failed, trying backup account...', primaryError);
      return await uploadToAccount(file, folder, BACKUP_CLOUD_NAME, BACKUP_UPLOAD_PRESET);
    }
    // No backup configured — rethrow original error
    throw primaryError;
  }
}
