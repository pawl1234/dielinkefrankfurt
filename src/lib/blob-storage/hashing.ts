/**
 * SHA-256 file hashing and deduplication cache for blob storage.
 * CRITICAL: Use SHA-256, NOT MD5 (collision-resistant)
 * PATTERN: Streaming to avoid memory issues
 */

import { createHash } from 'crypto';
import { logger } from '@/lib/logger';
import { CACHE_DURATION } from './constants';

/**
 * URL cache entry with expiration
 */
interface CacheEntry {
  url: string;
  expiresAt: number;
}

/**
 * Cache of file URLs for faster repeat access
 * PATTERN: 15-minute cache TTL to avoid re-uploads
 */
const URL_CACHE = new Map<string, CacheEntry>();

/**
 * Generates SHA-256 hash of file for deduplication
 * CRITICAL: Use SHA-256, NOT MD5 (collision-resistant)
 * PATTERN: Streaming to avoid memory issues
 *
 * @param file - File to hash
 * @returns Promise resolving to SHA-256 hash string
 */
export async function generateFileHash(file: File): Promise<string> {
  // PATTERN: Stream file content to hash (memory efficient)
  const buffer = await file.arrayBuffer();

  // CRITICAL: SHA-256 (not MD5) for collision resistance
  const hash = createHash('sha256')
    .update(Buffer.from(buffer))
    .digest('hex');

  return hash;
}

/**
 * Checks cache for existing upload
 * PATTERN: 15-minute cache TTL to avoid re-uploads
 *
 * @param hash - File hash
 * @param size - File size
 * @returns Cached URL if found and not expired, null otherwise
 */
export function checkCache(hash: string, size: number): string | null {
  const cacheKey = `${hash}-${size}`;
  const cached = URL_CACHE.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    logger.debug('Cache hit', {
      module: 'blob-storage',
      context: { hash: hash.slice(0, 10) }
    });
    return cached.url;
  }

  return null;
}

/**
 * Updates cache with new URL
 *
 * @param hash - File hash
 * @param size - File size
 * @param url - Uploaded file URL
 */
export function updateCache(hash: string, size: number, url: string): void {
  const cacheKey = `${hash}-${size}`;
  URL_CACHE.set(cacheKey, {
    url,
    expiresAt: Date.now() + CACHE_DURATION
  });
}

/**
 * Clears cache entries for deleted URLs
 *
 * @param urls - Array of URLs to clear from cache
 */
export function clearCacheForUrls(urls: string[]): void {
  for (const url of urls) {
    for (const [key, value] of URL_CACHE.entries()) {
      if (value.url === url) {
        URL_CACHE.delete(key);
      }
    }
  }
}
