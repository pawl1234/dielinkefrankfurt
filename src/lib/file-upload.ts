import { put, del } from '@vercel/blob';

/**
 * File upload error class
 */
export class FileUploadError extends Error {
  constructor(
    message: string,
    public readonly status: number = 500,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'FileUploadError';
  }
}

/**
 * File types and their corresponding MIME types
 */
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif'];
export const ALLOWED_DOCUMENT_TYPES = ['application/pdf'];
export const ALLOWED_FILE_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_TYPES];

/**
 * File size limits in bytes
 */
export const MAX_LOGO_SIZE = 2 * 1024 * 1024; // 2MB for logos
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB for general attachments
export const MAX_COMBINED_FILES_SIZE = 10 * 1024 * 1024; // 10MB total per submission
export const MAX_STATUS_REPORT_FILES_SIZE = 5 * 1024 * 1024; // 5MB total for status report files
export const MAX_STATUS_REPORT_FILES_COUNT = 5; // Maximum 5 files per status report

/**
 * Validates a file based on specified constraints
 * 
 * @param file - The file to validate
 * @param allowedTypes - Array of allowed MIME types
 * @param maxSize - Maximum file size in bytes
 * @returns void if valid, throws FileUploadError if invalid
 */
export function validateFile(
  file: File,
  allowedTypes: string[] = ALLOWED_FILE_TYPES,
  maxSize: number = MAX_FILE_SIZE
): void {
  // Check if file exists
  if (!file) {
    throw new FileUploadError(
      'Invalid file provided',
      400,
      'INVALID_FILE'
    );
  }

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    const allowedExtensions = allowedTypes
      .map(type => type.split('/')[1])
      .join(', ');
    
    throw new FileUploadError(
      `Unsupported file type. Please upload only ${allowedExtensions} files.`,
      400,
      'INVALID_FILE_TYPE'
    );
  }

  // Check file size
  if (file.size > maxSize) {
    const maxSizeMB = maxSize / (1024 * 1024);
    throw new FileUploadError(
      `File size exceeds ${maxSizeMB}MB limit. Please upload a smaller file.`,
      400,
      'FILE_TOO_LARGE'
    );
  }
}

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
          'Failed to upload file after multiple attempts. Please try again later.',
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
 * Upload a cropped image pair to Vercel Blob Storage with retry capability
 * 
 * @param originalFile - The original image file
 * @param croppedFile - The cropped version of the image
 * @param category - The category for organizing files (e.g., "groups")
 * @param prefix - Optional prefix to add to the filename (e.g., "logo")
 * @param config - Optional configuration for retries and progress
 * @returns Object containing URLs for both the original and cropped images
 * @throws FileUploadError if upload fails after retries
 */
export async function uploadCroppedImagePair(
  originalFile: File,
  croppedFile: File | Blob,
  category: string,
  prefix: string,
  config: FileUploadConfig = {}
): Promise<{ originalUrl: string; croppedUrl: string }> {
  // Combine default config with provided config
  const { maxRetries, retryDelay, timeout, onProgress, onRetry } = {
    ...DEFAULT_CONFIG,
    ...config
  };

  // Generate unique pathnames for both images
  const timestamp = new Date().getTime();
  const sanitizedFileName = originalFile.name.replace(/\s+/g, '-');
  
  // Original image pathname
  const originalBlobPathname = `${category}/${timestamp}-${prefix}-${sanitizedFileName}`;
  
  // Prepare original image blob
  const originalArrayBuffer = await originalFile.arrayBuffer();
  const originalBlob = new Blob([originalArrayBuffer], { type: originalFile.type });
  
  // Prepare cropped image blob
  let croppedBlob: Blob;
  if (croppedFile instanceof Blob) {
    croppedBlob = croppedFile;
  } else {
    const croppedArrayBuffer = await (croppedFile as File).arrayBuffer();
    croppedBlob = new Blob([croppedArrayBuffer], { type: 'image/jpeg' });
  }
  
  // Use _crop suffix to identify cropped versions
  const fileNameWithoutExt = sanitizedFileName.replace(/\.[^.]+$/, '');
  const croppedBlobPathname = `${category}/${timestamp}-${prefix}-${fileNameWithoutExt}_crop.jpg`;
  
  let attempt = 0;
  let lastError: Error | null = null;
  
  // Retry loop
  while (attempt <= maxRetries!) {
    try {
      // If this is a retry, notify via callback
      if (attempt > 0 && onRetry && lastError) {
        onRetry(attempt, lastError);
        console.log(`🔄 Retrying image pair upload (attempt ${attempt}/${maxRetries})...`);
      }
      
      // Update progress - start
      if (onProgress) {
        onProgress(0);
      }
      
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      // Upload the original image
      const { url: originalUrl } = await put(originalBlobPathname, originalBlob, {
        access: 'public',
        contentType: originalFile.type,
        addRandomSuffix: false,
        cacheControlMaxAge: 31536000, // Cache for 1 year
      });
      
      console.log(`✅ Original image uploaded successfully to: ${originalUrl}`);
      
      // Update progress - halfway
      if (onProgress) {
        onProgress(50);
      }
      
      // Upload the cropped image
      const { url: croppedUrl } = await put(croppedBlobPathname, croppedBlob, {
        access: 'public',
        contentType: 'image/jpeg',
        addRandomSuffix: false,
        cacheControlMaxAge: 31536000, // Cache for 1 year
      });
      
      clearTimeout(timeoutId);
      
      // Update progress - complete
      if (onProgress) {
        onProgress(100);
      }
      
      console.log(`✅ Cropped image uploaded successfully to: ${croppedUrl}`);
      
      return {
        originalUrl,
        croppedUrl
      };
    } catch (error) {
      // Save the error for potential callback
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`❌ Image pair upload attempt ${attempt + 1}/${maxRetries! + 1} failed:`, error);
      
      // If we've reached max retries, throw the error
      if (attempt >= maxRetries!) {
        throw new FileUploadError(
          'Failed to upload images after multiple attempts. Please try again later.',
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
 * 2. Individual file type
 * 3. Individual file size
 * 4. Combined file size
 * 
 * @param files - Array of files to validate
 * @returns void if valid, throws FileUploadError if invalid
 */
export function validateStatusReportFiles(files: File[]): void {
  // Check file count
  if (files.length > MAX_STATUS_REPORT_FILES_COUNT) {
    throw new FileUploadError(
      `Too many files. Maximum of ${MAX_STATUS_REPORT_FILES_COUNT} files allowed.`,
      400,
      'TOO_MANY_FILES'
    );
  }
  
  // Check individual files and track total size
  let totalSize = 0;
  
  for (const file of files) {
    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      const allowedExtensions = ALLOWED_FILE_TYPES
        .map(type => type.split('/')[1])
        .join(', ');
      
      throw new FileUploadError(
        `Unsupported file type for "${file.name}". Please upload only ${allowedExtensions} files.`,
        400,
        'INVALID_FILE_TYPE'
      );
    }
    
    // Validate individual file size
    if (file.size > MAX_FILE_SIZE) {
      const maxSizeMB = MAX_FILE_SIZE / (1024 * 1024);
      throw new FileUploadError(
        `File "${file.name}" exceeds ${maxSizeMB}MB limit. Please upload a smaller file.`,
        400,
        'FILE_TOO_LARGE'
      );
    }
    
    totalSize += file.size;
  }
  
  // Validate combined file size
  if (totalSize > MAX_STATUS_REPORT_FILES_SIZE) {
    const maxSizeMB = MAX_STATUS_REPORT_FILES_SIZE / (1024 * 1024);
    throw new FileUploadError(
      `Total file size exceeds ${maxSizeMB}MB limit. Please reduce the size or number of files.`,
      400,
      'COMBINED_FILES_TOO_LARGE'
    );
  }
}

/**
 * Uploads multiple files for status report attachments
 * 
 * @param files - Array of files to upload
 * @returns Array of uploaded file URLs
 * @throws FileUploadError if validation or upload fails
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
      'Failed to upload files. Please try again later.',
      500,
      'UPLOAD_FAILED'
    );
  }
}

/**
 * Validates a group logo file specifically
 * 
 * @param file - The logo file to validate
 * @returns void if valid, throws FileUploadError if invalid
 */
export function validateGroupLogoFile(file: File): void {
  validateFile(file, ALLOWED_IMAGE_TYPES, MAX_LOGO_SIZE);
}

/**
 * Uploads a group logo file with validation
 * 
 * @param file - The logo file to upload
 * @returns The URL of the uploaded logo
 * @throws FileUploadError if validation or upload fails
 */
export async function uploadGroupLogoFile(file: File): Promise<string> {
  // Validate the logo file first
  validateGroupLogoFile(file);
  
  // Upload the file
  return uploadFile(file, 'groups', 'logo');
}