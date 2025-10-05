/**
 * Retry logic with exponential backoff for blob storage operations.
 * PATTERN: Used by Vercel for batch operations
 * CRITICAL: maxRetries=3 is Vercel best practice
 */

import { FileUploadError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { RetryConfig } from './types';
import { DEFAULT_RETRY_CONFIG } from './constants';

/**
 * Sleep for a specified duration
 *
 * @param ms - Milliseconds to sleep
 * @returns Promise that resolves after the delay
 */
const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Executes operation with exponential backoff retry
 * PATTERN: Used by Vercel for batch operations
 * CRITICAL: maxRetries=3 is Vercel best practice
 *
 * @param operation - Async operation to execute
 * @param config - Retry configuration options
 * @returns Result of the operation
 * @throws FileUploadError if max retries exceeded
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const finalConfig: RetryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let attempt = 0;
  let lastError: Error | null = null;

  while (attempt <= finalConfig.maxRetries) {
    try {
      // Optional: Retry callback for logging
      if (attempt > 0 && finalConfig.onRetry && lastError) {
        finalConfig.onRetry(attempt, lastError);
      }

      // Create timeout abort controller
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), finalConfig.timeout);

      // Execute operation
      const result = await operation();
      clearTimeout(timeoutId);

      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // If max retries exceeded, throw
      if (attempt >= finalConfig.maxRetries) {
        logger.error('Operation failed after maximum retries', {
          module: 'blob-storage',
          context: {
            attempts: attempt + 1,
            maxRetries: finalConfig.maxRetries,
            lastError: lastError.message,
            timeout: finalConfig.timeout
          },
          tags: ['retry', 'max-retries-exceeded']
        });

        throw new FileUploadError(
          'Operation failed after maximum retries',
          500,
          'MAX_RETRIES_EXCEEDED'
        );
      }

      // Log retry attempt
      logger.warn(`Retrying operation (attempt ${attempt + 1}/${finalConfig.maxRetries})`, {
        module: 'blob-storage',
        context: {
          attempt: attempt + 1,
          maxRetries: finalConfig.maxRetries,
          error: lastError.message,
          nextRetryDelay: `${finalConfig.baseDelay * Math.pow(2, attempt)}ms`
        },
        tags: ['retry', 'attempt']
      });

      // Exponential backoff: 1s, 2s, 4s
      const delay = finalConfig.baseDelay * Math.pow(2, attempt);
      await sleep(delay);
      attempt++;
    }
  }

  // This should never be reached
  throw lastError || new Error('Unknown error');
}
