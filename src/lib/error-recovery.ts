import { logger } from './logger';

/**
 * Configuration for recovery operations
 */
export interface RecoveryConfig {
  maxAttempts?: number;
  retryDelay?: number;
  logFailures?: boolean;
  onRetry?: (attempt: number, error: Error) => void;
  shouldRetry?: (error: Error) => boolean;
}

/**
 * Default configuration for recovery operations
 */
const DEFAULT_RECOVERY_CONFIG: RecoveryConfig = {
  maxAttempts: 3,
  retryDelay: 1000,
  logFailures: true,
  shouldRetry: () => true, // By default, retry all errors
};

/**
 * Sleep for a specified duration
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Attempts to execute an operation with automatic retries
 * 
 * @param operation - The async operation to execute and potentially retry
 * @param config - Configuration for retry behavior
 * @returns The result of the operation, or throws the final error
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config?: RecoveryConfig
): Promise<T> {
  const {
    maxAttempts,
    retryDelay,
    logFailures,
    onRetry,
    shouldRetry,
  } = { ...DEFAULT_RECOVERY_CONFIG, ...config };

  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxAttempts!; attempt++) {
    try {
      // Execute the operation
      return await operation();
    } catch (error) {
      // Convert to Error object if needed
      const errorObj = error instanceof Error ? error : new Error(String(error));
      lastError = errorObj;
      
      // Log the failure if enabled
      if (logFailures) {
        logger.warn(`Operation failed (attempt ${attempt + 1}/${maxAttempts})`, {
          context: {
            attempt: attempt + 1,
            maxAttempts,
            error: errorObj.message,
          },
          tags: ['retry', 'recovery'],
        });
      }
      
      // Check if we should retry this error
      const canRetry = shouldRetry!(errorObj);
      
      // If we can't retry this error, or we've reached the max attempts, throw
      if (!canRetry || attempt === maxAttempts! - 1) {
        throw errorObj;
      }
      
      // Notify of retry if callback provided
      if (onRetry) {
        onRetry(attempt + 1, errorObj);
      }
      
      // Wait before retrying (with exponential backoff)
      const delay = retryDelay! * Math.pow(2, attempt);
      await sleep(delay);
    }
  }
  
  // This should never be reached due to the throw in the loop
  throw lastError || new Error('Operation failed with unknown error');
}

/**
 * Resilient fetch function with retry capabilities for network requests
 * 
 * @param url - The URL to fetch
 * @param options - Standard fetch options
 * @param retryConfig - Configuration for retry behavior
 * @returns The fetch response
 */
export async function resilientFetch(
  url: string,
  options?: RequestInit,
  retryConfig?: RecoveryConfig
): Promise<Response> {
  // Default retry configuration specifically for network requests
  const fetchRetryConfig: RecoveryConfig = {
    ...DEFAULT_RECOVERY_CONFIG,
    // By default, only retry network errors and 5xx responses
    shouldRetry: (error) => {
      // Retry network errors
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        return true;
      }
      
      // Don't retry if we got a response but it was an error
      if (error instanceof Response) {
        // Only retry server errors (5xx), not client errors (4xx)
        return error.status >= 500 && error.status < 600;
      }
      
      return false;
    },
    ...retryConfig,
  };
  
  return withRetry(async () => {
    const response = await fetch(url, options);
    
    // If response is not ok, throw it as an error to trigger retry
    if (!response.ok) {
      throw response;
    }
    
    return response;
  }, fetchRetryConfig);
}

/**
 * Executes an operation with automatic recovery on specific recoverable errors
 * 
 * @param operation - The operation to execute
 * @param errorHandler - Function to handle specific errors and potentially recover
 * @param finalCleanup - Optional cleanup function to run regardless of success/failure
 * @returns The result of the operation or recovery
 */
export async function withErrorRecovery<T>(
  operation: () => Promise<T>,
  errorHandler: (error: Error) => Promise<T | null>,
  finalCleanup?: () => Promise<void>
): Promise<T> {
  try {
    // First try the main operation
    return await operation();
  } catch (error) {
    // Convert to Error object if needed
    const errorObj = error instanceof Error ? error : new Error(String(error));
    
    logger.warn('Operation failed, attempting recovery', {
      context: { error: errorObj.message },
      tags: ['recovery'],
    });
    
    // Attempt recovery
    const recoveryResult = await errorHandler(errorObj);
    
    if (recoveryResult !== null) {
      logger.info('Recovery successful', { tags: ['recovery', 'success'] });
      return recoveryResult;
    }
    
    // If recovery returned null, it couldn't recover, so re-throw
    logger.error('Recovery failed', {
      context: { error: errorObj.message },
      tags: ['recovery', 'failure'],
    });
    throw errorObj;
  } finally {
    // Always run cleanup if provided
    if (finalCleanup) {
      try {
        await finalCleanup();
      } catch (cleanupError) {
        logger.error('Cleanup failed', {
          context: { error: String(cleanupError) },
          tags: ['recovery', 'cleanup', 'failure'],
        });
      }
    }
  }
}

/**
 * Safe JSON parse with fallback for invalid JSON
 * 
 * @param text - The JSON text to parse
 * @param fallback - The fallback value if parsing fails
 * @returns The parsed object or fallback
 */
export function safeJsonParse<T>(text: string, fallback: T): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    logger.warn('Failed to parse JSON', {
      context: {
        text: text.slice(0, 100) + (text.length > 100 ? '...' : ''),
      },
      tags: ['json', 'parse', 'failure'],
    });
    return fallback;
  }
}

/**
 * Cache error state recovery - attempts to recover a session from cache
 * in the event of a primary storage failure
 * 
 * @param cacheKey - The key to use for the cache
 * @param fetchFn - Function to fetch the data
 * @param ttl - Time-to-live for the cache in milliseconds
 * @returns The data, either from cache or freshly fetched
 */
export async function withCacheRecovery<T>(
  cacheKey: string,
  fetchFn: () => Promise<T>,
  ttl: number = 5 * 60 * 1000 // 5 minute default
): Promise<T> {
  // Try to get from cache first
  const cachedData = sessionStorage.getItem(cacheKey);
  
  if (cachedData) {
    try {
      const parsed = JSON.parse(cachedData);
      const { data, timestamp } = parsed;
      
      // Check if cache is still valid
      if (Date.now() - timestamp < ttl) {
        logger.info('Using cached data', {
          context: { cacheKey },
          tags: ['cache', 'hit'],
        });
        return data;
      }
    } catch (error) {
      // Cache parsing failed, will fetch fresh data
      logger.warn('Cache parse failed', {
        context: { cacheKey, error: String(error) },
        tags: ['cache', 'parse', 'failure'],
      });
    }
  }
  
  try {
    // Fetch fresh data
    const data = await fetchFn();
    
    // Update cache
    try {
      sessionStorage.setItem(
        cacheKey,
        JSON.stringify({
          data,
          timestamp: Date.now(),
        })
      );
    } catch (cacheError) {
      // Non-critical error, just log warning
      logger.warn('Failed to update cache', {
        context: { cacheKey, error: String(cacheError) },
        tags: ['cache', 'write', 'failure'],
      });
    }
    
    return data;
  } catch (fetchError) {
    // Fetch failed, try to recover from possibly stale cache
    if (cachedData) {
      try {
        logger.warn('Fetch failed, using stale cache', {
          context: { cacheKey, error: String(fetchError) },
          tags: ['cache', 'recovery'],
        });
        
        const { data } = JSON.parse(cachedData);
        return data;
      } catch (cacheError) {
        // Both fetch and cache recovery failed
        logger.error('Both fetch and cache recovery failed', {
          context: {
            cacheKey,
            fetchError: String(fetchError),
            cacheError: String(cacheError),
          },
          tags: ['cache', 'recovery', 'failure'],
        });
      }
    }
    
    // Nothing worked, re-throw the original error
    throw fetchError;
  }
}

const errorRecoveryModule = {
  withRetry,
  resilientFetch,
  withErrorRecovery,
  safeJsonParse,
  withCacheRecovery,
};

export default errorRecoveryModule;