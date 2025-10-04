import { deleteFiles } from './blob-storage';
import { FILE_TYPES } from './validation/file-schemas';

/**
 * File constraints for Antrag attachments
 * Using centralized FILE_SIZE_LIMITS constants
 */

/**
 * Allowed file types for Antrag attachments
 * Using centralized file type configuration
 */
export const ALLOWED_ANTRAG_FILE_TYPES = FILE_TYPES.ANTRAG;

/**
 * Get a user-friendly list of allowed file extensions
 */
export function getAllowedFileExtensions(): string {
  const extensions = [
    'jpg', 'jpeg', 'png', 'gif', // Images
    'pdf', // PDF
    'doc', 'docx', // Word
    'xls', 'xlsx' // Excel
  ];
  return extensions.join(', ');
}

/**
 * Delete files from Vercel Blob Storage with retry capability
 * Wrapper around blob-storage deleteFiles for backward compatibility
 *
 * @param urls - Array of URLs to delete
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @param retryDelay - Base delay in ms between retries (default: 1000)
 * @returns Object containing success status and deleted URLs
 */
export async function deleteAntragFiles(
  urls: string[],
  maxRetries: number = 3,
  retryDelay: number = 1000
): Promise<{ success: boolean; deletedUrls: string[] }> {
  console.log(`🗑️ Attempting to delete ${urls.length} Antrag files from blob storage`);

  // Use centralized deleteFiles from blob-storage
  const result = await deleteFiles(urls, {
    maxRetries,
    baseDelay: retryDelay,
    timeout: 30000
  });

  if (result.success) {
    console.log('✅ Antrag files deleted successfully');
  } else {
    console.error('❌ Some Antrag files failed to delete');
  }

  return result;
}
