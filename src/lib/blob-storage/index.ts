/**
 * Public API for blob storage operations.
 * Single source of truth for Vercel Blob Storage uploads and deletes.
 *
 * Usage:
 * ```typescript
 * import { uploadFiles, deleteFiles } from '@/lib/blob-storage';
 *
 * // Upload files
 * const results = await uploadFiles(files, {
 *   category: 'appointments',
 *   allowedTypes: FILE_TYPES.IMAGE,
 *   maxSizePerFile: FILE_SIZE_LIMITS.COVER_IMAGE,
 *   prefix: 'cover'
 * });
 *
 * // Delete files
 * await deleteFiles(urls);
 * ```
 */

// Export public functions
export { uploadFiles, uploadBuffer } from './upload';
export { deleteFiles } from './delete';

// Export types
export type {
  UploadCategory,
  UploadConfig,
  UploadResult,
  DeleteResult,
  RetryConfig
} from './types';

// Export constants
export { DEFAULT_RETRY_CONFIG, BATCH_SIZE, CACHE_DURATION } from './constants';
