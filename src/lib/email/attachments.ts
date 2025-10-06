import { logger } from '../logger';
import type { EmailAttachment } from './mailer';

/**
 * Configuration for attachment handling
 */
const ATTACHMENT_CONFIG = {
  // Maximum total size for all attachments (10MB)
  MAX_TOTAL_SIZE: 10 * 1024 * 1024,
  // Maximum individual file size (5MB)
  MAX_FILE_SIZE: 5 * 1024 * 1024,
  // Maximum number of attachments
  MAX_ATTACHMENT_COUNT: 5,
  // Request timeout for fetching files (30 seconds)
  FETCH_TIMEOUT: 30000,
};

/**
 * Result type for attachment preparation
 */
interface AttachmentResult {
  attachments: EmailAttachment[];
  totalSize: number;
  skippedFiles: Array<{
    url: string;
    filename: string;
    reason: string;
  }>;
  errors: string[];
}

/**
 * Extract filename from Blob Storage URL
 * @param url The blob storage URL
 * @returns The extracted filename
 */
function extractFilenameFromUrl(url: string): string {
  try {
    // Parse the URL to get the pathname
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;

    // Extract filename from the path (after the last slash)
    const filename = pathname.split('/').pop() || 'attachment';

    // If filename contains timestamp prefix, try to extract original name
    // Format: timestamp-originalname.ext
    const timestampMatch = filename.match(/^\d+-(.+)$/);
    if (timestampMatch && timestampMatch[1]) {
      return timestampMatch[1];
    }

    return filename;
  } catch (error) {
    logger.warn('Failed to extract filename from URL', {
      context: { url, error: error instanceof Error ? error.message : String(error) }
    });
    return 'attachment';
  }
}

/**
 * Determine content type from filename
 * @param filename The filename to analyze
 * @returns The MIME type
 */
function getContentTypeFromFilename(filename: string): string {
  const extension = filename.toLowerCase().split('.').pop();

  const mimeTypes: Record<string, string> = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    txt: 'text/plain',
    rtf: 'application/rtf',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    zip: 'application/zip',
    rar: 'application/x-rar-compressed',
  };

  return extension ? mimeTypes[extension] || 'application/octet-stream' : 'application/octet-stream';
}

/**
 * Fetch file content from Blob Storage URL
 * @param url The blob storage URL
 * @returns Promise resolving to file buffer
 */
async function fetchFileFromBlobStorage(url: string): Promise<Buffer> {
  try {
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ATTACHMENT_CONFIG.FETCH_TIMEOUT);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'DieLinke-Frankfurt-EmailService/1.0'
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Check content length if available
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > ATTACHMENT_CONFIG.MAX_FILE_SIZE) {
      throw new Error(`File too large: ${contentLength} bytes (max: ${ATTACHMENT_CONFIG.MAX_FILE_SIZE})`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Double-check actual size
    if (buffer.length > ATTACHMENT_CONFIG.MAX_FILE_SIZE) {
      throw new Error(`File too large: ${buffer.length} bytes (max: ${ATTACHMENT_CONFIG.MAX_FILE_SIZE})`);
    }

    return buffer;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`File fetch timeout after ${ATTACHMENT_CONFIG.FETCH_TIMEOUT}ms`);
    }
    throw error;
  }
}

/**
 * Prepare email attachments from file URLs
 * @param fileUrls Array of blob storage URLs
 * @returns Promise resolving to attachment result
 */
export async function prepareEmailAttachments(fileUrls: string[]): Promise<AttachmentResult> {
  const result: AttachmentResult = {
    attachments: [],
    totalSize: 0,
    skippedFiles: [],
    errors: []
  };

  // Validate input
  if (!fileUrls || fileUrls.length === 0) {
    return result;
  }

  // Limit number of attachments
  const urlsToProcess = fileUrls.slice(0, ATTACHMENT_CONFIG.MAX_ATTACHMENT_COUNT);
  if (fileUrls.length > ATTACHMENT_CONFIG.MAX_ATTACHMENT_COUNT) {
    const skipped = fileUrls.slice(ATTACHMENT_CONFIG.MAX_ATTACHMENT_COUNT);
    skipped.forEach(url => {
      result.skippedFiles.push({
        url,
        filename: extractFilenameFromUrl(url),
        reason: `Exceeded maximum attachment count (${ATTACHMENT_CONFIG.MAX_ATTACHMENT_COUNT})`
      });
    });
  }

  // Process each file
  for (const url of urlsToProcess) {
    try {
      const filename = extractFilenameFromUrl(url);

      // Skip if URL doesn't look like a blob storage URL
      if (!url.includes('blob.vercel-storage.com') && !url.includes('localhost')) {
        result.skippedFiles.push({
          url,
          filename,
          reason: 'Invalid or external URL'
        });
        continue;
      }

      // Fetch file content
      const content = await fetchFileFromBlobStorage(url);

      // Check if adding this file would exceed total size limit
      if (result.totalSize + content.length > ATTACHMENT_CONFIG.MAX_TOTAL_SIZE) {
        result.skippedFiles.push({
          url,
          filename,
          reason: `Would exceed total size limit (${ATTACHMENT_CONFIG.MAX_TOTAL_SIZE} bytes)`
        });
        continue;
      }

      // Create attachment
      const attachment: EmailAttachment = {
        filename,
        content,
        contentType: getContentTypeFromFilename(filename)
      };

      result.attachments.push(attachment);
      result.totalSize += content.length;

      logger.info('File attachment prepared successfully', {
        context: {
          filename,
          size: content.length,
          contentType: attachment.contentType,
          url: url.substring(0, 50) + '...' // Log partial URL for debugging
        }
      });

    } catch (error) {
      const filename = extractFilenameFromUrl(url);
      const errorMessage = error instanceof Error ? error.message : String(error);

      result.skippedFiles.push({
        url,
        filename,
        reason: `Failed to fetch: ${errorMessage}`
      });

      result.errors.push(`Failed to attach ${filename}: ${errorMessage}`);

      logger.error('Failed to prepare file attachment', {
        context: {
          url: url.substring(0, 50) + '...',
          filename,
          error: errorMessage
        }
      });
    }
  }

  return result;
}
