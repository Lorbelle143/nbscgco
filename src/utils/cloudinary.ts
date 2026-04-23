/**
 * Cloudinary upload utility with backup account fallback
 * Primary account is tried first — if it fails, backup account is used automatically.
 * Free tier per account: 25GB storage + 25GB bandwidth/month
 * Max file size: 10MB per upload
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

/** Compress image if larger than maxSizeMB */
async function compressImage(file: File, maxSizeMB = 2): Promise<File> {
  if (file.size <= maxSizeMB * 1024 * 1024) return file; // already small enough
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        
        // Scale down if too large
        const maxDim = 1920;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = (height / width) * maxDim;
            width = maxDim;
          } else {
            width = (width / height) * maxDim;
            height = maxDim;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (!blob) { reject(new Error('Compression failed')); return; }
            const compressed = new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() });
            resolve(compressed);
          },
          'image/jpeg',
          0.85 // quality
        );
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
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

  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files are allowed.');
  }

  // Hard limit — reject files over 10MB before even trying
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('File is too large. Maximum size is 10MB.');
  }

  // Compress if larger than 2MB
  const fileToUpload = file.type.startsWith('image/') ? await compressImage(file, 2) : file;

  try {
    return await uploadToAccount(fileToUpload, folder, CLOUD_NAME, UPLOAD_PRESET);
  } catch (primaryError) {
    if (BACKUP_CLOUD_NAME && BACKUP_UPLOAD_PRESET) {
      console.warn('Primary Cloudinary failed, trying backup account...', primaryError);
      return await uploadToAccount(fileToUpload, folder, BACKUP_CLOUD_NAME, BACKUP_UPLOAD_PRESET);
    }
    throw primaryError;
  }
}
