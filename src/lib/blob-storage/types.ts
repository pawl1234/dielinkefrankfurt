/**
 * TypeScript interfaces and types for the blob storage module.
 * Provides type safety for all blob storage operations.
 */

/**
 * Upload category determines the blob storage path prefix
 */
export type UploadCategory =
  | 'appointments'
  | 'groups'
  | 'status-reports'
  | 'antraege'
  | 'newsletter-headers';

/**
 * Upload configuration options
 */
export interface UploadConfig {
  category: UploadCategory;
  allowedTypes?: string[];        // Defaults to FILE_TYPES.ALL
  maxSizePerFile?: number;        // Defaults to FILE_SIZE_LIMITS.DEFAULT
  maxFiles?: number;              // Defaults to unlimited
  prefix?: string;                // Optional prefix (e.g., 'cover', 'logo')
  onProgress?: (progress: number) => void;  // Optional progress callback
  onRetry?: (attempt: number, error: Error) => void;  // Optional retry callback
}

/**
 * Upload result metadata
 */
export interface UploadResult {
  url: string;
  filename: string;
  size: number;
  type: string;
  hash: string;  // SHA-256 hash for deduplication
}

/**
 * Delete result metadata
 */
export interface DeleteResult {
  success: boolean;
  deletedUrls: string[];
  failedUrls?: string[];
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxRetries: number;      // Default: 3
  baseDelay: number;       // Default: 1000ms
  timeout: number;         // Default: 30000ms
  onRetry?: (attempt: number, error: Error) => void;
}
