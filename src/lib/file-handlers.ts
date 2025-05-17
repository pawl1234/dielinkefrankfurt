import { put, del, list, PutOption } from '@vercel/blob';
import { createHash } from 'crypto';

// Define maximum file sizes
const MAX_INDIVIDUAL_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_TOTAL_UPLOAD_SIZE = 50 * 1024 * 1024; // 50MB

// Define allowed file types for different contexts
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
export const ALLOWED_ATTACHMENT_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_TYPES];

// Cache of file URLs for faster repeat access
const URL_CACHE = new Map<string, { url: string, expiresAt: number }>();
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

// Errors
export class FileUploadError extends Error {
  code: string;
  details?: any;

  constructor(message: string, code: string, details?: any) {
    super(message);
    this.name = 'FileUploadError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Validates a file before upload
 * 
 * @param file The file to validate
 * @param allowedTypes Array of allowed MIME types
 * @param maxSize Maximum file size in bytes (defaults to 5MB)
 * @returns True if file is valid
 * @throws FileUploadError if validation fails
 */
export function validateFile(
  file: File,
  allowedTypes: string[] = ALLOWED_ATTACHMENT_TYPES,
  maxSize: number = MAX_INDIVIDUAL_FILE_SIZE
): boolean {
  // Check file size
  if (file.size > maxSize) {
    throw new FileUploadError(
      `File size exceeds limit of ${Math.round(maxSize / (1024 * 1024))}MB`,
      'FILE_TOO_LARGE',
      { size: file.size, maxSize, name: file.name }
    );
  }

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    throw new FileUploadError(
      `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`,
      'INVALID_FILE_TYPE',
      { type: file.type, allowedTypes, name: file.name }
    );
  }

  return true;
}

/**
 * Generates a content hash for file deduplication
 * 
 * @param file The file to hash
 * @returns Promise resolving to hash string
 */
export async function generateFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hash = createHash('sha256');
  hash.update(Buffer.from(buffer));
  return hash.digest('hex');
}

/**
 * Upload a file to Vercel Blob Storage with optimizations
 * 
 * @param file The file to upload
 * @param pathPrefix Path prefix for the file (e.g., 'appointments/')
 * @param options Additional options for the upload
 * @returns Promise resolving to the URL of the uploaded file
 */
export async function uploadFile(
  file: File,
  pathPrefix: string,
  options?: Partial<PutOption>
): Promise<string> {
  try {
    // Validate file
    validateFile(file);
    
    // Generate a hash for file deduplication
    const fileHash = await generateFileHash(file);
    
    // Create a unique pathname with hash for deduplication
    const timestamp = new Date().getTime();
    const fileExtension = file.name.split('.').pop() || '';
    const sanitizedFileName = file.name.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-_.]/g, '');
    const blobPathname = `${pathPrefix}${timestamp}-${fileHash.substring(0, 10)}-${sanitizedFileName}`;
    
    // Check our cache first to avoid re-uploading
    const cacheKey = `${fileHash}-${file.size}`;
    const cachedUrl = URL_CACHE.get(cacheKey);
    if (cachedUrl && cachedUrl.expiresAt > Date.now()) {
      console.log(`✅ Using cached URL for ${file.name}: ${cachedUrl.url}`);
      return cachedUrl.url;
    }
    
    // Prepare file for upload
    const arrayBuffer = await file.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: file.type });
    
    // Set default options
    const defaultOptions: PutOption = {
      access: 'public',
      contentType: file.type,
      addRandomSuffix: false,
      cacheControlMaxAge: 31536000, // Cache for 1 year (60 * 60 * 24 * 365)
    };
    
    // Upload to Vercel Blob Store
    console.log(`📤 Uploading file to Blob Store: ${blobPathname}`);
    const { url } = await put(blobPathname, blob, { ...defaultOptions, ...options });
    
    // Cache the URL
    URL_CACHE.set(cacheKey, {
      url,
      expiresAt: Date.now() + CACHE_DURATION
    });
    
    console.log(`✅ File uploaded successfully to: ${url}`);
    return url;
  } catch (error) {
    if (error instanceof FileUploadError) {
      throw error;
    }
    
    console.error('❌ Error uploading file:', error);
    throw new FileUploadError(
      'Failed to upload file. Please try again.',
      'UPLOAD_FAILED',
      { fileName: file.name, originalError: error }
    );
  }
}

/**
 * Upload multiple files to Vercel Blob Storage with optimizations
 * 
 * @param files Array of files to upload
 * @param pathPrefix Path prefix for the files
 * @param options Additional options for the uploads
 * @returns Promise resolving to an array of URLs of the uploaded files
 */
export async function uploadMultipleFiles(
  files: File[],
  pathPrefix: string,
  options?: Partial<PutOption>
): Promise<string[]> {
  // Check total size first
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  if (totalSize > MAX_TOTAL_UPLOAD_SIZE) {
    throw new FileUploadError(
      `Total file size exceeds limit of ${Math.round(MAX_TOTAL_UPLOAD_SIZE / (1024 * 1024))}MB`,
      'TOTAL_SIZE_TOO_LARGE',
      { totalSize, maxSize: MAX_TOTAL_UPLOAD_SIZE }
    );
  }
  
  // Process files in batches of 4 for better performance (parallel uploads)
  const BATCH_SIZE = 4;
  const results: string[] = [];
  
  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE);
    const uploadPromises = batch.map(file => uploadFile(file, pathPrefix, options));
    
    try {
      const batchResults = await Promise.all(uploadPromises);
      results.push(...batchResults);
    } catch (error) {
      // If any upload fails, try to delete the successfully uploaded files
      if (results.length > 0) {
        try {
          await del(results);
        } catch (deleteError) {
          console.error('❌ Error cleaning up after failed batch upload:', deleteError);
        }
      }
      
      throw error;
    }
  }
  
  return results;
}

/**
 * Delete files from Vercel Blob Storage safely
 * 
 * @param urls Array of URLs to delete
 * @returns Promise resolving to a boolean indicating success
 */
export async function deleteFiles(urls: string[]): Promise<boolean> {
  if (!urls || urls.length === 0) {
    return true;
  }
  
  try {
    // Filter out invalid URLs
    const validUrls = urls.filter(url => typeof url === 'string' && url.startsWith('http'));
    
    if (validUrls.length === 0) {
      return true;
    }
    
    // Delete files from storage
    console.log(`🗑️ Deleting ${validUrls.length} files from blob storage`);
    await del(validUrls);
    
    // Clear cache entries
    validUrls.forEach(url => {
      for (const [key, value] of URL_CACHE.entries()) {
        if (value.url === url) {
          URL_CACHE.delete(key);
        }
      }
    });
    
    console.log('✅ Files deleted successfully');
    return true;
  } catch (error) {
    console.error('❌ Error deleting files from blob storage:', error);
    return false;
  }
}

/**
 * Parse a JSON string of file URLs safely
 * 
 * @param jsonString JSON string to parse
 * @returns Array of file URLs
 */
export function parseFileUrls(jsonString: string | null): string[] {
  if (!jsonString) {
    return [];
  }
  
  try {
    const parsed = JSON.parse(jsonString);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Error parsing file URLs:', error);
    return [];
  }
}

/**
 * Cleanup old and unused files to prevent storage bloat
 * 
 * @param prefix Path prefix to clean up
 * @param olderThan Date before which files should be deleted
 * @returns Promise resolving to number of deleted files
 */
export async function cleanupUnusedFiles(
  prefix: string,
  olderThan: Date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
): Promise<number> {
  try {
    const { blobs } = await list({ prefix });
    
    // Find blobs older than the specified date
    const oldBlobs = blobs.filter(blob => 
      new Date(blob.uploadedAt) < olderThan
    );
    
    if (oldBlobs.length === 0) {
      return 0;
    }
    
    // Delete old blobs in batches
    const BATCH_SIZE = 100;
    let deletedCount = 0;
    
    for (let i = 0; i < oldBlobs.length; i += BATCH_SIZE) {
      const batch = oldBlobs.slice(i, i + BATCH_SIZE);
      const urlsToDelete = batch.map(blob => blob.url);
      
      try {
        await del(urlsToDelete);
        deletedCount += urlsToDelete.length;
      } catch (error) {
        console.error(`❌ Error deleting batch ${i / BATCH_SIZE + 1}:`, error);
      }
    }
    
    return deletedCount;
  } catch (error) {
    console.error('❌ Error cleaning up unused files:', error);
    return 0;
  }
}