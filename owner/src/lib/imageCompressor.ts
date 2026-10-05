/**
 * Client-side Image Compressor
 * Resizes and compresses images in the browser before sending them to the backend / Cloudinary.
 * Reduces payload size by 70%-90%, dramatically speeding up upload times.
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxSizeKB?: number;
}

export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const {
    maxWidth = 1600,
    maxHeight = 1600,
    quality = 0.82,
    maxSizeKB = 250,
  } = options;

  // Skip compression if already lightweight or not a compressible image
  if (file.size <= maxSizeKB * 1024) {
    return file;
  }
  if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.type === 'image/svg+xml') {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Proportional scale to fit within maxWidth x maxHeight
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Standardize output to jpeg for broad compatibility and maximum compression
        const outputType = 'image/jpeg';

        canvas.toBlob(
          (blob) => {
            if (!blob || blob.size >= file.size) {
              resolve(file);
              return;
            }

            const ext = '.jpg';
            const baseName = file.name.replace(/\.[^/.]+$/, '');
            const compressedFile = new File([blob], `${baseName}${ext}`, {
              type: outputType,
              lastModified: Date.now(),
            });

            resolve(compressedFile);
          },
          outputType,
          quality
        );
      };

      img.onerror = () => resolve(file);
      img.src = e.target?.result as string;
    };

    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

/**
 * Compress multiple image files with progress callback
 */
export async function compressImages(
  files: File[],
  onProgress?: (completed: number, total: number) => void
): Promise<File[]> {
  const total = files.length;
  let completed = 0;

  const results: File[] = [];
  for (const file of files) {
    const compressed = await compressImage(file);
    results.push(compressed);
    completed++;
    onProgress?.(completed, total);
  }

  return results;
}
