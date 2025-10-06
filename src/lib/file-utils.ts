/**
 * File utility functions for handling file attachments, thumbnails, and file type detection
 */

import { FileAttachment } from '@/components/ui/FileThumbnail';
import { logger } from './logger';

/**
 * File type enumeration for better type safety
 */
export enum FileType {
  IMAGE = 'image',
  PDF = 'pdf',
  OTHER = 'other'
}

/**
 * Detects file type based on file extension or MIME type
 *
 * @param source - File path, File object, or Blob
 * @param providedType - Optional pre-determined type
 * @returns Detected file type
 */
export const getFileType = (
  source: string | File | Blob,
  providedType?: 'image' | 'pdf' | 'other'
): FileType => {
  if (providedType) return providedType as FileType;

  let name = '';
  if (typeof source === 'string') {
    name = source.toLowerCase();
  } else if (source instanceof File) {
    name = source.name.toLowerCase();
  } else if (source instanceof Blob && source.type) {
    return source.type.startsWith('image/') ? FileType.IMAGE :
           source.type === 'application/pdf' ? FileType.PDF : FileType.OTHER;
  }

  if (name.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
    return FileType.IMAGE;
  }
  if (name.endsWith('.pdf')) {
    return FileType.PDF;
  }
  return FileType.OTHER;
};

/**
 * Converts fileUrls JSON string to FileAttachment array
 * 
 * @param fileUrls - JSON string containing array of file URLs
 * @returns Array of FileAttachment objects with detected file types
 */
export const parseFileUrls = (fileUrls: string | null): FileAttachment[] => {
  if (!fileUrls) return [];
  
  try {
    const urls = JSON.parse(fileUrls) as string[];
    return urls.map(url => {
      const fileName = url.split('/').pop() || '';
      const type = getFileType(url);

      return {
        url,
        name: fileName,
        type: type as 'image' | 'pdf' | 'other'
      };
    });
  } catch (error) {
    logger.error('Error parsing fileUrls', {
      module: 'file-utils',
      context: {
        fileUrls,
        errorMessage: error instanceof Error ? error.message : String(error)
      }
    });
    return [];
  }
};

/**
 * Converts appointment metadata to cover image FileAttachment array
 *
 * @param metadata - JSON string containing appointment metadata
 * @returns Array of FileAttachment objects for cover images
 */
export const parseCoverImages = (metadata: string | null): FileAttachment[] => {
  if (!metadata) return [];

  try {
    const meta = JSON.parse(metadata);
    const coverImages: FileAttachment[] = [];

    if (meta.coverImageUrl) {
      coverImages.push({
        url: meta.coverImageUrl,
        type: 'image',
        description: 'Cover-Bild'
      });
    }

    return coverImages;
  } catch (error) {
    logger.error('Error parsing metadata', {
      module: 'file-utils',
      context: {
        metadata,
        errorMessage: error instanceof Error ? error.message : String(error)
      }
    });
    return [];
  }
};

/**
 * Opens a file in the appropriate way based on its type
 * Used when clicking on file thumbnails without buttons
 *
 * @param file - FileAttachment to open
 * @param onImageClick - Optional callback for image files (e.g., lightbox)
 */
export const handleFileOpen = (
  file: FileAttachment,
  onImageClick?: (file: FileAttachment) => void
): void => {
  if (file.url) {
    if (file.type === 'image' && onImageClick) {
      onImageClick(file);
    } else {
      window.open(file.url, '_blank');
    }
  } else if (file.file && file.file instanceof File) {
    const url = URL.createObjectURL(file.file);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
};