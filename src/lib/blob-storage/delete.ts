/**
 * Core delete logic for blob storage with retry.
 * Extracted from file-upload.ts:180-234
 */

import { del } from '@vercel/blob';
import { logger } from '@/lib/logger';
import { DeleteResult, RetryConfig } from './types';
import { withRetry } from './retry';
import { clearCacheForUrls } from './hashing';

/**
 * Deletes files from blob storage with retry
 * PUBLIC: Exported from index.ts
 *
 * @param urls - Array of file URLs to delete
 * @param config - Optional retry configuration
 * @returns Delete result with success status and deleted URLs
 */
export async function deleteFiles(
  urls: string[],
  config?: Partial<RetryConfig>
): Promise<DeleteResult> {
  // STEP 1: Filter invalid URLs
  const validUrls = urls.filter(url => typeof url === 'string' && url.startsWith('http'));

  if (validUrls.length === 0) {
    return { success: true, deletedUrls: [] };
  }

  logger.info('Deleting files', {
    module: 'blob-storage',
    context: { count: validUrls.length }
  });

  try {
    // STEP 2: Delete with retry
    await withRetry(() => del(validUrls), {
      maxRetries: 3,
      baseDelay: 1000,
      timeout: 30000,
      ...config
    });

    // STEP 3: Clear cache entries
    clearCacheForUrls(validUrls);

    logger.info('Files deleted', {
      module: 'blob-storage',
      context: { count: validUrls.length }
    });

    return { success: true, deletedUrls: validUrls };

  } catch (error) {
    logger.error('Delete failed', {
      module: 'blob-storage',
      context: { error }
    });

    // PATTERN: Partial failure - return what was deleted
    return {
      success: false,
      deletedUrls: [],
      failedUrls: validUrls
    };
  }
}
