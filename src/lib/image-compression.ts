/**
 * Shared image compression utility for client-side image optimization.
 *
 * Compresses images by resizing and reducing quality while maintaining
 * visual quality. Only compresses when beneficial (file size or dimensions exceed thresholds).
 *
 * @param file - Image file to compress
 * @param maxDimension - Maximum width OR height in pixels (default: 2000)
 * @param quality - JPEG compression quality 0.0-1.0 (default: 0.75)
 * @param minSizeThreshold - Only compress files larger than this size in MB (default: 1.5)
 * @returns Promise resolving to compressed file or original if compression not beneficial
 */
export const compressImage = (
  file: File,
  maxDimension = 2000,
  quality = 0.75,
  minSizeThreshold = 1.5
): Promise<File> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = document.createElement('img');

    img.onload = () => {
      const { width, height } = img;

      // Check if compression is needed based on file size and dimensions
      const fileSizeMB = file.size / 1024 / 1024;
      const needsCompression = fileSizeMB > minSizeThreshold || width > maxDimension || height > maxDimension;

      if (!needsCompression) {
        console.log(
          `✅ Image already optimized: ${fileSizeMB.toFixed(2)}MB, ${width}x${height}px - skipping compression`
        );
        resolve(file);
        return;
      }

      // Calculate new dimensions while maintaining aspect ratio
      let newWidth = width;
      let newHeight = height;

      if (width > maxDimension || height > maxDimension) {
        const ratio = Math.min(maxDimension / width, maxDimension / height);
        newWidth = width * ratio;
        newHeight = height * ratio;
      }

      // Set canvas dimensions
      canvas.width = newWidth;
      canvas.height = newHeight;

      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      // Enable high-quality image smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Draw compressed image to canvas
      ctx.drawImage(img, 0, 0, newWidth, newHeight);

      // Convert to blob with compression
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });

            const originalSizeMB = file.size / 1024 / 1024;
            const compressedSizeMB = compressedFile.size / 1024 / 1024;

            // Only use compressed version if it's significantly smaller (>20% reduction)
            if (compressedSizeMB < originalSizeMB * 0.8) {
              console.log(
                `🗜️ Image compressed: ${originalSizeMB.toFixed(2)}MB → ${compressedSizeMB.toFixed(2)}MB (${width}x${height} → ${Math.round(newWidth)}x${Math.round(newHeight)})`
              );
              resolve(compressedFile);
            } else {
              console.log(
                `↩️ Compression not beneficial: ${originalSizeMB.toFixed(2)}MB → ${compressedSizeMB.toFixed(2)}MB - using original`
              );
              resolve(file);
            }
          } else {
            reject(new Error('Failed to compress image'));
          }
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};
