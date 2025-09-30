import { put, del } from '@vercel/blob';
import { FILE_TYPES } from './validation/file-schemas';
import {
  FileUploadError,
  validateFile,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_DOCUMENT_TYPES,
  ALLOWED_FILE_TYPES,
  MAX_LOGO_SIZE,
  MAX_FILE_SIZE,
  MAX_STATUS_REPORT_FILES_SIZE,
  MAX_STATUS_REPORT_FILES_COUNT
} from './file-handlers';
import { validationMessages } from '@/lib/validation-messages';

/**
 * File size limits in bytes
 * (constants for local use only, main constants imported from file-handlers)
 */
export const MAX_COMBINED_FILES_SIZE = 10 * 1024 * 1024; // 10MB total per submission

// Re-export imported constants for backward compatibility
export {
  ALLOWED_IMAGE_TYPES,
  ALLOWED_DOCUMENT_TYPES,
  ALLOWED_FILE_TYPES,
  MAX_LOGO_SIZE,
  MAX_FILE_SIZE,
  MAX_STATUS_REPORT_FILES_SIZE,
  MAX_STATUS_REPORT_FILES_COUNT,
  FileUploadError,
  validateFile
} from './file-handlers';


/**
 * Generate a unique blob pathname based on timestamp, file type, and name
 * 
 * @param file - The file object
 * @param category - The category for organizing files (e.g., "groups", "appointments")
 * @param prefix - Optional prefix to add to the filename (e.g., "logo", "cover")
 * @returns A unique pathname string
 */
export function generateBlobPathname(
  file: File,
  category: string,
  prefix?: string
): string {
  const timestamp = new Date().getTime();
  const sanitizedFileName = file.name.replace(/\s+/g, '-');
  const prefixStr = prefix ? `${prefix}-` : '';
  
  return `${category}/${timestamp}-${prefixStr}${sanitizedFileName}`;
}

/**
 * Configuration for file upload
 */
export interface FileUploadConfig {
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
  onProgress?: (progress: number) => void;
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Default configuration for file uploads
 */
const DEFAULT_CONFIG: FileUploadConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  timeout: 30000
};

/**
 * Sleep for a specified duration
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Upload a file to Vercel Blob Storage with retry capability
 * 
 * @param file - The file to upload
 * @param category - The category for organizing files
 * @param prefix - Optional prefix to add to the filename
 * @param config - Optional configuration for retries and progress
 * @returns The URL of the uploaded file
 * @throws FileUploadError if upload fails after retries
 */
export async function uploadFile(
  file: File,
  category: string,
  prefix?: string,
  config: FileUploadConfig = {}
): Promise<string> {
  // Combine default config with provided config
  const { maxRetries, retryDelay, timeout, onProgress, onRetry } = {
    ...DEFAULT_CONFIG,
    ...config
  };
  
  // Generate a unique pathname
  const blobPathname = generateBlobPathname(file, category, prefix);
  
  // Get the file data as an ArrayBuffer and convert to Blob for upload
  const arrayBuffer = await file.arrayBuffer();
  const blob = new Blob([arrayBuffer], { type: file.type });
  
  // Initialize counters
  let attempt = 0;
  let lastError: Error | null = null;
  
  // Retry loop
  while (attempt <= maxRetries!) {
    try {
      // If this is a retry, notify via callback
      if (attempt > 0 && onRetry && lastError) {
        onRetry(attempt, lastError);
        console.log(`🔄 Retrying upload (attempt ${attempt}/${maxRetries})...`);
      }
      
      // Update progress
      if (onProgress) {
        onProgress(0); // Start progress
      }
      
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      // Upload to Vercel Blob Store
      const { url } = await put(blobPathname, blob, {
        access: 'public',
        contentType: file.type,
        addRandomSuffix: false, // Use our own timestamp-based naming
        cacheControlMaxAge: 31536000, // Cache for 1 year (60 * 60 * 24 * 365)
      });
      
      clearTimeout(timeoutId);
      
      // Update final progress
      if (onProgress) {
        onProgress(100);
      }
      
      console.log(`✅ File uploaded successfully to: ${url}`);
      return url;
    } catch (error) {
      // Save the error for potential callback
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`❌ Upload attempt ${attempt + 1}/${maxRetries! + 1} failed:`, error);
      
      // If we've reached max retries, throw the error
      if (attempt >= maxRetries!) {
        throw new FileUploadError(
          validationMessages.uploadFailedWithRetries('files'),
          500,
          'UPLOAD_FAILED_WITH_RETRIES'
        );
      }
      
      // Otherwise, wait and retry with exponential backoff
      const delay = retryDelay! * Math.pow(2, attempt);
      console.log(`⏳ Waiting ${delay}ms before retry...`);
      await sleep(delay);
      attempt++;
    }
  }
  
  // This should never be reached due to the throw above, but TypeScript needs it
  throw new FileUploadError('Maximum retries exceeded', 500, 'MAX_RETRIES_EXCEEDED');
}


/**
 * Delete files from Vercel Blob Storage with retry capability
 * 
 * @param urls - Array of URLs to delete
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @param retryDelay - Base delay in ms between retries, will be multiplied by 2^attempt (default: 1000)
 * @returns Object containing success status and deleted URLs
 */
export async function deleteFiles(
  urls: string[], 
  maxRetries: number = 3,
  retryDelay: number = 1000
): Promise<{ success: boolean; deletedUrls: string[] }> {
  if (urls.length === 0) return { success: true, deletedUrls: [] };
  
  let attempt = 0;
  const deletedUrls: string[] = [];
  let remainingUrls = [...urls];
  
  console.log(`🗑️ Attempting to delete ${urls.length} files from blob storage`);
  
  while (attempt <= maxRetries && remainingUrls.length > 0) {
    try {
      // If this is a retry, log the retry attempt
      if (attempt > 0) {
        console.log(`🔄 Retrying file deletion (attempt ${attempt}/${maxRetries})...`);
      }
      
      // Delete the remaining files
      await del(remainingUrls);
      
      // If we get here, all remaining files were deleted successfully
      deletedUrls.push(...remainingUrls);
      remainingUrls = [];
      
      console.log('✅ Files deleted successfully');
      return { success: true, deletedUrls };
    } catch (error) {
      console.error(`❌ File deletion attempt ${attempt + 1}/${maxRetries + 1} failed:`, error);
      
      // If we've reached max retries, return partial success
      if (attempt >= maxRetries) {
        console.error('Maximum retries exceeded for file deletion');
        return { 
          success: false, 
          deletedUrls
        };
      }
      
      // Otherwise, wait and retry with exponential backoff
      const delay = retryDelay * Math.pow(2, attempt);
      console.log(`⏳ Waiting ${delay}ms before retry...`);
      await sleep(delay);
      attempt++;
    }
  }
  
  // This should only be reached if all retries failed
  return { 
    success: deletedUrls.length === urls.length,
    deletedUrls
  };
}

/**
 * Validates multiple files for status report attachments
 * Checks:
 * 1. File count limit
 * 2. Individual file type and size (using centralized validation)
 * 3. Combined file size
 *
 * @param files - Array of files to validate
 * @returns void if valid, throws FileUploadError if invalid
 */
export function validateStatusReportFiles(files: File[]): void {
  // Check file count
  if (files.length > MAX_STATUS_REPORT_FILES_COUNT) {
    throw new FileUploadError(
      validationMessages.tooManyFiles('files', MAX_STATUS_REPORT_FILES_COUNT),
      400,
      'TOO_MANY_FILES'
    );
  }

  // Check individual files using centralized validation and track total size
  let totalSize = 0;

  for (const file of files) {
    try {
      // Use centralized validation for type and size checking
      validateFile(file, ALLOWED_FILE_TYPES, MAX_FILE_SIZE);
    } catch (error) {
      // Re-throw with filename context for better error messages
      if (error instanceof FileUploadError) {
        if (error.code === 'INVALID_FILE_TYPE') {
          throw new FileUploadError(
            `"${file.name}": ${validationMessages.unsupportedFileType()}`,
            400,
            'INVALID_FILE_TYPE'
          );
        } else if (error.code === 'FILE_TOO_LARGE') {
          const maxSizeMB = MAX_FILE_SIZE / (1024 * 1024);
          throw new FileUploadError(
            `"${file.name}": ${validationMessages.fileSizeExceeds(maxSizeMB)}`,
            400,
            'FILE_TOO_LARGE'
          );
        }
      }
      throw error;
    }

    totalSize += file.size;
  }

  if (totalSize > MAX_STATUS_REPORT_FILES_SIZE) {
    const maxSizeMB = MAX_STATUS_REPORT_FILES_SIZE / (1024 * 1024);
    throw new FileUploadError(
      validationMessages.fileSizeExceeds(maxSizeMB),
      400,
      'COMBINED_FILES_TOO_LARGE'
    );
  }
}

export async function uploadGroupLogo(logoFile: File | Blob): Promise<string> {
  const isFileObject = logoFile && typeof logoFile === 'object' && 'name' in logoFile;

  try {
    const timestamp = new Date().getTime();
    const fileName = isFileObject ? (logoFile as File).name : 'logo.jpg';
    const sanitizedFileName = fileName.replace(/\s+/g, '-');
    const blobPathname = `groups/${timestamp}-logo-${sanitizedFileName}`;

    const arrayBuffer = await logoFile.arrayBuffer();
    const blob = new Blob([arrayBuffer], {
      type: logoFile.type || 'image/jpeg'
    });

    const { url } = await put(blobPathname, blob, {
      access: 'public',
      contentType: blob.type,
      addRandomSuffix: false,
      cacheControlMaxAge: 31536000,
    });

    return url;
  } catch (error) {
    throw new FileUploadError(
      validationMessages.uploadFailed('logo'),
      500
    );
  }
}

/**
 * Uploads multiple files for status report attachments
 */
export async function uploadStatusReportFiles(files: File[]): Promise<string[]> {
  // Validate files first
  validateStatusReportFiles(files);
  
  // Skip if no files
  if (files.length === 0) {
    return [];
  }
  
  try {
    const timestamp = new Date().getTime();
    const fileUrls: string[] = [];
    
    // Upload each file sequentially
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Create a unique pathname for the blob
      const sanitizedFileName = file.name.replace(/\s+/g, '-');
      const blobPathname = `status-reports/${timestamp}-${i}-${sanitizedFileName}`;
      
      // Upload the file
      const arrayBuffer = await file.arrayBuffer();
      const blob = new Blob([arrayBuffer], { type: file.type });
      
      const { url } = await put(blobPathname, blob, {
        access: 'public',
        contentType: file.type,
        addRandomSuffix: false,
        cacheControlMaxAge: 31536000, // Cache for 1 year
      });
      
      fileUrls.push(url);
      console.log(`✅ File ${i + 1}/${files.length} uploaded successfully to: ${url}`);
    }
    
    return fileUrls;
  } catch (error) {
    console.error('❌ Error uploading status report files:', error);
    throw new FileUploadError(
      validationMessages.uploadFailed('files'),
      500,
      'UPLOAD_FAILED'
    );
  }
}

