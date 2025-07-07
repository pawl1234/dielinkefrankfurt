import { put, del } from '@vercel/blob';
import { FileUploadError } from './file-upload';

/**
 * File constraints for Antrag attachments
 */
export const MAX_ANTRAG_FILES_COUNT = 5; // Maximum 5 files per Antrag
export const MAX_ANTRAG_FILE_SIZE = 5 * 1024 * 1024; // 5MB per file
export const MAX_ANTRAG_TOTAL_SIZE = 10 * 1024 * 1024; // 10MB total

/**
 * Allowed file types for Antrag attachments
 */
export const ALLOWED_ANTRAG_FILE_TYPES = [
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  // Documents
  'application/pdf',
  'application/msword', // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.ms-excel', // .xls
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
];

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
 * Sleep for a specified duration
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Validates files for Antrag attachments
 * Checks:
 * 1. File count limit
 * 2. Individual file type
 * 3. Individual file size
 * 4. Combined file size
 * 
 * @param files - Array of files to validate
 * @returns void if valid, throws FileUploadError if invalid
 */
export function validateAntragFiles(files: File[]): void {
  if (!files || files.length === 0) {
    return; // No files to validate
  }

  // Check file count
  if (files.length > MAX_ANTRAG_FILES_COUNT) {
    throw new FileUploadError(
      `Zu viele Dateien. Maximal ${MAX_ANTRAG_FILES_COUNT} Dateien erlaubt.`,
      400,
      'TOO_MANY_FILES'
    );
  }

  // Check individual files and track total size
  let totalSize = 0;

  for (const file of files) {
    // Check if file exists and has content
    if (!file || file.size === 0) {
      throw new FileUploadError(
        'Ungültige oder leere Datei gefunden.',
        400,
        'INVALID_FILE'
      );
    }

    // Validate file type
    if (!ALLOWED_ANTRAG_FILE_TYPES.includes(file.type)) {
      throw new FileUploadError(
        `Nicht unterstützter Dateityp für "${file.name}". Erlaubte Dateitypen: ${getAllowedFileExtensions()}.`,
        400,
        'INVALID_FILE_TYPE'
      );
    }

    // Validate individual file size
    if (file.size > MAX_ANTRAG_FILE_SIZE) {
      const maxSizeMB = MAX_ANTRAG_FILE_SIZE / (1024 * 1024);
      throw new FileUploadError(
        `Datei "${file.name}" überschreitet das ${maxSizeMB}MB Limit. Bitte laden Sie eine kleinere Datei hoch.`,
        400,
        'FILE_TOO_LARGE'
      );
    }

    totalSize += file.size;
  }

  // Validate combined file size
  if (totalSize > MAX_ANTRAG_TOTAL_SIZE) {
    const maxSizeMB = MAX_ANTRAG_TOTAL_SIZE / (1024 * 1024);
    throw new FileUploadError(
      `Gesamtgröße der Dateien überschreitet das ${maxSizeMB}MB Limit. Bitte reduzieren Sie die Größe oder Anzahl der Dateien.`,
      400,
      'COMBINED_FILES_TOO_LARGE'
    );
  }
}

/**
 * Uploads multiple files for Antrag attachments with retry capability
 * 
 * @param files - Array of files to upload
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @param retryDelay - Base delay in ms between retries (default: 1000)
 * @returns Array of uploaded file URLs
 * @throws FileUploadError if validation or upload fails
 */
export async function uploadAntragFiles(
  files: File[],
  maxRetries: number = 3,
  retryDelay: number = 1000
): Promise<string[]> {
  // Validate files first
  validateAntragFiles(files);

  // Skip if no files
  if (!files || files.length === 0) {
    return [];
  }

  const uploadedUrls: string[] = [];
  const timestamp = new Date().getTime();

  try {
    // Upload each file sequentially with retry logic
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const sanitizedFileName = file.name.replace(/\s+/g, '-');
      const blobPathname = `antraege/${timestamp}-${i}-${sanitizedFileName}`;

      let attempt = 0;
      let uploaded = false;

      while (attempt <= maxRetries && !uploaded) {
        try {
          if (attempt > 0) {
            console.log(`🔄 Retrying upload for file ${i + 1}/${files.length} (attempt ${attempt}/${maxRetries})...`);
          }

          const arrayBuffer = await file.arrayBuffer();
          const blob = new Blob([arrayBuffer], { type: file.type });

          const { url } = await put(blobPathname, blob, {
            access: 'public',
            contentType: file.type,
            addRandomSuffix: false,
            cacheControlMaxAge: 31536000, // Cache for 1 year
          });

          uploadedUrls.push(url);
          uploaded = true;
          console.log(`✅ File ${i + 1}/${files.length} uploaded successfully to: ${url}`);
        } catch (error) {
          console.error(`❌ Upload attempt ${attempt + 1}/${maxRetries + 1} failed for file ${i + 1}:`, error);

          if (attempt >= maxRetries) {
            // Clean up any successfully uploaded files before throwing
            if (uploadedUrls.length > 0) {
              console.log('🧹 Cleaning up successfully uploaded files after failure...');
              await deleteAntragFiles(uploadedUrls).catch(deleteError => {
                console.error('Failed to clean up uploaded files:', deleteError);
              });
            }

            throw new FileUploadError(
              `Fehler beim Hochladen der Datei "${file.name}". Bitte versuchen Sie es später erneut.`,
              500,
              'UPLOAD_FAILED'
            );
          }

          // Wait before retry with exponential backoff
          const delay = retryDelay * Math.pow(2, attempt);
          console.log(`⏳ Waiting ${delay}ms before retry...`);
          await sleep(delay);
          attempt++;
        }
      }
    }

    return uploadedUrls;
  } catch (error) {
    // Re-throw FileUploadError
    if (error instanceof FileUploadError) {
      throw error;
    }

    // Clean up any successfully uploaded files before throwing generic error
    if (uploadedUrls.length > 0) {
      console.log('🧹 Cleaning up successfully uploaded files after unexpected error...');
      await deleteAntragFiles(uploadedUrls).catch(deleteError => {
        console.error('Failed to clean up uploaded files:', deleteError);
      });
    }

    console.error('❌ Unexpected error uploading Antrag files:', error);
    throw new FileUploadError(
      'Fehler beim Hochladen der Dateien. Bitte versuchen Sie es später erneut.',
      500,
      'UPLOAD_FAILED'
    );
  }
}

/**
 * Delete files from Vercel Blob Storage with retry capability
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
  if (!urls || urls.length === 0) {
    return { success: true, deletedUrls: [] };
  }

  let attempt = 0;
  const deletedUrls: string[] = [];
  let remainingUrls = [...urls];

  console.log(`🗑️ Attempting to delete ${urls.length} Antrag files from blob storage`);

  while (attempt <= maxRetries && remainingUrls.length > 0) {
    try {
      if (attempt > 0) {
        console.log(`🔄 Retrying file deletion (attempt ${attempt}/${maxRetries})...`);
      }

      // Delete the remaining files
      await del(remainingUrls);

      // If we get here, all remaining files were deleted successfully
      deletedUrls.push(...remainingUrls);
      remainingUrls = [];

      console.log('✅ Antrag files deleted successfully');
      return { success: true, deletedUrls };
    } catch (error) {
      console.error(`❌ File deletion attempt ${attempt + 1}/${maxRetries + 1} failed:`, error);

      // If we've reached max retries, return partial success
      if (attempt >= maxRetries) {
        console.error('Maximum retries exceeded for Antrag file deletion');
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