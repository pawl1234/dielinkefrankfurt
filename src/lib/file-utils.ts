/**
 * File utility functions for handling file attachments, thumbnails, and file type detection
 */

import { FileAttachment } from '@/components/ui/FileThumbnail';

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
    console.error('Error parsing fileUrls:', error);
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
    console.error('Error parsing metadata:', error);
    return [];
  }
};

/**
 * Converts File/Blob array to FileAttachment array for uploads
 * 
 * @param files - Array of File or Blob objects
 * @param previews - Optional preview URLs keyed by file ID
 * @returns Array of FileAttachment objects
 */
export const parseUploadedFiles = (
  files: (File | Blob)[], 
  previews?: { [key: string]: string }
): FileAttachment[] => {
  return files.map((file, index) => {
    const id = `file-${Date.now()}-${index}`;
    const type = getFileType(file);
    
    return {
      id,
      file,
      name: file instanceof File ? file.name : `File-${index + 1}`,
      type: type as 'image' | 'pdf' | 'other',
      preview: previews?.[id]
    };
  });
};

/**
 * Converts FileItem array (from FileUpload component) to FileAttachment array
 * 
 * @param fileItems - Array of file items from upload component
 * @returns Array of FileAttachment objects
 */
export const parseFileItems = (
  fileItems: { 
    id: string; 
    name: string; 
    type: string; 
    preview?: string; 
    file: File | Blob 
  }[]
): FileAttachment[] => {
  return fileItems.map(item => {
    const type = getFileType(item.file);
    
    return {
      id: item.id,
      file: item.file,
      name: item.name,
      type: type as 'image' | 'pdf' | 'other',
      preview: item.preview
    };
  });
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