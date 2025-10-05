/**
 * Constants for blob storage operations.
 * Centralizes configuration values used across the module.
 */

import { RetryConfig } from './types';

/**
 * Default retry configuration
 * CRITICAL: maxRetries=3 is Vercel best practice
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,    // 1 second
  timeout: 30000,     // 30 seconds
};

/**
 * Batch size for parallel uploads
 * CRITICAL: 4 concurrent uploads for optimal performance
 */
export const BATCH_SIZE = 4;

/**
 * URL cache duration in milliseconds
 * PATTERN: 15-minute cache TTL to avoid re-uploads
 */
export const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes
