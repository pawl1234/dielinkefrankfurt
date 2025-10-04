/**
 * Core upload logic for blob storage with retry, hashing, and deduplication.
 * Combines best features from file-upload.ts, file-handlers.ts, and file-upload-helpers.ts
 */

import { put, del } from '@vercel/blob';
import crypto from 'crypto';
import { logger } from '@/lib/logger';
import { UploadConfig, UploadResult } from './types';
import { validateFile } from './validation';
import { generateFileHash, checkCache, updateCache } from './hashing';
import { withRetry } from './retry';
import { BATCH_SIZE } from './constants';

/**
 * Uploads single file with retry, hashing, and deduplication
 * INTERNAL: Not exported from index.ts
 *
 * @param file - File to upload
 * @param config - Upload configuration
 * @returns Upload result with metadata
 * @throws FileUploadError if upload fails
 */
async function uploadSingleFile(
  file: File,
  config: UploadConfig
): Promise<UploadResult> {
  // STEP 1: Validate file (throws FileUploadError if invalid)
  validateFile(file, config.allowedTypes, config.maxSizePerFile);

  // STEP 2: Generate hash for deduplication
  const hash = await generateFileHash(file);

  // STEP 3: Check cache (avoid re-uploading same file)
  const cachedUrl = checkCache(hash, file.size);
  if (cachedUrl) {
    logger.info('Using cached upload', {
      module: 'blob-storage',
      context: { hash: hash.slice(0, 10), filename: file.name }
    });
    return { url: cachedUrl, filename: file.name, size: file.size, type: file.type, hash };
  }

  // STEP 4: Prepare file for upload
  const timestamp = Date.now();
  const sanitizedFilename = file.name
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9-_.]/g, '');
  const prefix = config.prefix ? `${config.prefix}-` : '';
  const pathname = `${config.category}/${timestamp}-${hash.slice(0, 10)}-${prefix}${sanitizedFilename}`;

  const arrayBuffer = await file.arrayBuffer();
  const blob = new Blob([arrayBuffer], { type: file.type });

  // STEP 5: Upload with retry
  const url = await withRetry(async () => {
    const { url: uploadedUrl } = await put(pathname, blob, {
      access: 'public',
      contentType: file.type,
      addRandomSuffix: false,
      cacheControlMaxAge: 31536000,
    });
    return uploadedUrl;
  }, {
    maxRetries: 3,
    baseDelay: 1000,
    timeout: 30000,
    onRetry: config.onRetry
  });

  // STEP 6: Update cache
  updateCache(hash, file.size, url);

  logger.debug('File uploaded', {
    module: 'blob-storage',
    context: { url, hash: hash.slice(0, 10), filename: file.name }
  });

  return { url, filename: file.name, size: file.size, type: file.type, hash };
}

/**
 * Uploads a Buffer (server-generated content like composed images) to blob storage with retry.
 * PUBLIC: Exported from index.ts
 *
 * Use this for server-side generated content like image compositions, PDFs, etc.
 * For user-uploaded files, use uploadFiles() instead.
 *
 * @param buffer - Buffer containing the data to upload
 * @param filename - Desired filename (will be sanitized)
 * @param config - Upload configuration (omit allowedTypes as buffer has no type validation)
 * @returns Upload result with metadata
 * @throws FileUploadError if upload fails
 */
export async function uploadBuffer(
  buffer: Buffer,
  filename: string,
  config: Omit<UploadConfig, 'allowedTypes' | 'maxSizePerFile'> & {
    contentType: string;
    allowOverwrite?: boolean;
  }
): Promise<UploadResult> {
  logger.info('Uploading buffer', {
    module: 'blob-storage',
    context: { category: config.category, filename, size: buffer.length }
  });

  // STEP 1: Generate hash for deduplication
  const hash = crypto
    .createHash('sha256')
    .update(buffer)
    .digest('hex');

  // STEP 2: Check cache (avoid re-uploading same buffer)
  const cachedUrl = checkCache(hash, buffer.length);
  if (cachedUrl) {
    logger.info('Using cached upload', {
      module: 'blob-storage',
      context: { hash: hash.slice(0, 10), filename }
    });
    return { url: cachedUrl, filename, size: buffer.length, type: config.contentType, hash };
  }

  // STEP 3: Prepare pathname
  const timestamp = Date.now();
  const sanitizedFilename = filename
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9-_.]/g, '');
  const prefix = config.prefix ? `${config.prefix}-` : '';
  const pathname = `${config.category}/${timestamp}-${hash.slice(0, 10)}-${prefix}${sanitizedFilename}`;

  // STEP 4: Upload with retry
  const url = await withRetry(async () => {
    const { url: uploadedUrl } = await put(pathname, buffer, {
      access: 'public',
      contentType: config.contentType,
      addRandomSuffix: false,
      allowOverwrite: config.allowOverwrite ?? false,
      cacheControlMaxAge: 31536000,
    });
    return uploadedUrl;
  }, {
    maxRetries: 3,
    baseDelay: 1000,
    timeout: 30000,
    onRetry: config.onRetry
  });

  // STEP 5: Update cache
  updateCache(hash, buffer.length, url);

  logger.debug('Buffer uploaded', {
    module: 'blob-storage',
    context: { url, hash: hash.slice(0, 10), filename }
  });

  return { url, filename, size: buffer.length, type: config.contentType, hash };
}

/**
 * Uploads multiple files with batching and cleanup on failure
 * PUBLIC: Exported from index.ts
 *
 * @param files - Array of files to upload
 * @param config - Upload configuration
 * @returns Array of upload results
 * @throws FileUploadError if upload fails
 */
export async function uploadFiles(
  files: (File | Blob)[],
  config: UploadConfig
): Promise<UploadResult[]> {
  logger.info('Uploading files', {
    module: 'blob-storage',
    context: { category: config.category, count: files.length }
  });

  // STEP 1: Validate all files first (fail fast)
  for (const file of files) {
    validateFile(file, config.allowedTypes, config.maxSizePerFile);
  }

  // STEP 2: Track uploaded URLs for cleanup on failure
  const uploadedUrls: string[] = [];
  const results: UploadResult[] = [];

  try {
    // STEP 3: Batch uploads (4 at a time for optimal performance)
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);

      // CRITICAL: Use Promise.all for parallel upload within batch
      const batchResults = await Promise.all(
        batch.map(file => uploadSingleFile(file as File, config))
      );

      results.push(...batchResults);
      uploadedUrls.push(...batchResults.map(r => r.url));

      // Optional: Progress callback
      if (config.onProgress) {
        const progress = Math.round(((i + batch.length) / files.length) * 100);
        config.onProgress(progress);
      }
    }

    logger.info('All files uploaded', {
      module: 'blob-storage',
      context: { count: results.length }
    });
    return results;

  } catch (error) {
    // CRITICAL: Clean up uploaded files on ANY failure
    logger.error('Upload failed, cleaning up', {
      module: 'blob-storage',
      context: { uploadedCount: uploadedUrls.length, error }
    });

    if (uploadedUrls.length > 0) {
      try {
        await del(uploadedUrls);
        logger.info('Cleanup successful', {
          module: 'blob-storage',
          context: { deletedCount: uploadedUrls.length }
        });
      } catch (deleteError) {
        logger.error('Cleanup failed', {
          module: 'blob-storage',
          context: { error: deleteError }
        });
      }
    }

    throw error;
  }
}
