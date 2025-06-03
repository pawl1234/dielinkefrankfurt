'use client';

import React from 'react';
import {
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Button,
  Typography,
  Box,
  Grid
} from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';

export interface FileAttachment {
  url?: string;  // For existing files (URLs)
  file?: File | Blob;  // For new uploads
  name?: string;
  type?: 'image' | 'pdf' | 'other';
  description?: string;
  id?: string;  // For tracking uploads
  preview?: string;  // For upload previews
}

interface FileThumbnailProps {
  file: FileAttachment;
  height?: number;
  variant?: 'outlined' | 'elevation';
  showFileName?: boolean;
  buttonText?: string;
  showRemoveButton?: boolean;
  onFileClick?: (file: FileAttachment) => void;
  onRemove?: (file: FileAttachment) => void;
  disabled?: boolean;
}

/**
 * Reusable thumbnail component for file attachments
 * Supports images, PDFs, and other file types with appropriate icons
 */
export const FileThumbnail: React.FC<FileThumbnailProps> = ({
  file,
  height = 140,
  variant = 'outlined',
  showFileName = true,
  buttonText = 'Öffnen',
  showRemoveButton = false,
  onFileClick,
  onRemove,
  disabled = false
}) => {
  // Auto-detect file type if not provided
  const getFileType = (source: string | File | Blob, type?: 'image' | 'pdf' | 'other'): 'image' | 'pdf' | 'other' => {
    if (type) return type;
    
    let name = '';
    if (typeof source === 'string') {
      name = source.toLowerCase();
    } else if (source instanceof File) {
      name = source.name.toLowerCase();
    } else if (source instanceof Blob && source.type) {
      return source.type.startsWith('image/') ? 'image' : 
             source.type === 'application/pdf' ? 'pdf' : 'other';
    }
    
    if (name.endsWith('.jpg') || name.endsWith('.jpeg') || 
        name.endsWith('.png') || name.endsWith('.gif') || name.endsWith('.webp')) {
      return 'image';
    }
    if (name.endsWith('.pdf')) {
      return 'pdf';
    }
    return 'other';
  };

  // Get the display source (URL or preview)
  const getDisplaySource = (): string | undefined => {
    if (file.preview) return file.preview; // Upload preview
    if (file.url) return file.url; // Existing file URL
    if (file.file && file.file instanceof File) {
      // For File objects without preview, we'll handle this in renderThumbnail
      return undefined;
    }
    return undefined;
  };

  const displaySource = getDisplaySource();
  const fileType = getFileType(file.url || file.file || '', file.type);
  const fileName = file.name || 
                  (file.file instanceof File ? file.file.name : '') ||
                  (file.url ? file.url.split('/').pop() : '') || 
                  'Datei';

  const handleClick = () => {
    if (disabled) return;
    
    if (onFileClick) {
      onFileClick(file);
    } else if (file.url) {
      // Default behavior - open existing files in new tab
      window.open(file.url, '_blank');
    } else if (file.file && file.file instanceof File) {
      // For File objects, create a temporary URL and open
      const url = URL.createObjectURL(file.file);
      window.open(url, '_blank');
      // Clean up the URL after a delay
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  };

  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRemove && !disabled) {
      onRemove(file);
    }
  };

  const renderThumbnail = () => {
    switch (fileType) {
      case 'image':
        if (displaySource) {
          return (
            <CardMedia
              component="img"
              height={height}
              image={displaySource}
              alt={file.description || fileName}
              sx={{ objectFit: 'cover' }}
            />
          );
        }
        // Fallback for File objects without preview
        return (
          <Box 
            sx={{ 
              height, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              bgcolor: 'grey.100'
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Bildvorschau
            </Typography>
          </Box>
        );
      case 'pdf':
        return (
          <Box 
            sx={{ 
              height, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              bgcolor: 'grey.100'
            }}
          >
            <PictureAsPdfIcon sx={{ fontSize: 60, color: 'error.main' }} />
          </Box>
        );
      default:
        return (
          <Box 
            sx={{ 
              height, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              bgcolor: 'grey.100'
            }}
          >
            <InsertDriveFileIcon sx={{ fontSize: 60, color: 'text.secondary' }} />
          </Box>
        );
    }
  };

  return (
    <Card variant={variant} sx={{ height: 'fit-content', opacity: disabled ? 0.6 : 1 }}>
      {renderThumbnail()}
      {(showFileName || file.description) && (
        <CardContent sx={{ py: 1 }}>
          {showFileName && (
            <Typography variant="caption" noWrap title={fileName}>
              {fileName}
            </Typography>
          )}
          {file.description && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              {file.description}
            </Typography>
          )}
        </CardContent>
      )}
      <CardActions sx={{ p: 1, gap: 1, flexDirection: showRemoveButton ? 'column' : 'row' }}>
        <Button
          variant="outlined"
          size="small"
          onClick={handleClick}
          disabled={disabled}
          fullWidth
        >
          {buttonText}
        </Button>
        {showRemoveButton && (
          <Button
            variant="outlined"
            size="small"
            color="error"
            onClick={handleRemoveClick}
            disabled={disabled}
            fullWidth
          >
            Entfernen
          </Button>
        )}
      </CardActions>
    </Card>
  );
};

interface FileThumbnailGridProps {
  files: FileAttachment[];
  gridSize?: { xs?: number; sm?: number; md?: number; lg?: number };
  height?: number;
  variant?: 'outlined' | 'elevation';
  showFileName?: boolean;
  buttonText?: string;
  showRemoveButton?: boolean;
  emptyMessage?: string;
  disabled?: boolean;
  onFileClick?: (file: FileAttachment) => void;
  onRemove?: (file: FileAttachment) => void;
}

/**
 * Grid container for multiple file thumbnails
 */
export const FileThumbnailGrid: React.FC<FileThumbnailGridProps> = ({
  files,
  gridSize = { xs: 12, sm: 6, md: 4, lg: 3 },
  height = 140,
  variant = 'outlined',
  showFileName = true,
  buttonText = 'Öffnen',
  showRemoveButton = false,
  emptyMessage = 'Keine Dateien vorhanden.',
  disabled = false,
  onFileClick,
  onRemove
}) => {
  if (!files || files.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        {emptyMessage}
      </Typography>
    );
  }

  return (
    <Grid container spacing={2}>
      {files.map((file, index) => {
        const key = file.id || file.url || `file-${index}`;
        return (
          <Grid size={gridSize} key={key}>
            <FileThumbnail
              file={file}
              height={height}
              variant={variant}
              showFileName={showFileName}
              buttonText={buttonText}
              showRemoveButton={showRemoveButton}
              disabled={disabled}
              onFileClick={onFileClick}
              onRemove={onRemove}
            />
          </Grid>
        );
      })}
    </Grid>
  );
};

/**
 * Helper function to convert fileUrls JSON string to FileAttachment array
 */
export const parseFileUrls = (fileUrls: string | null): FileAttachment[] => {
  if (!fileUrls) return [];
  
  try {
    const urls = JSON.parse(fileUrls) as string[];
    return urls.map(url => ({
      url,
      name: url.split('/').pop(),
    }));
  } catch (error) {
    console.error('Error parsing fileUrls:', error);
    return [];
  }
};

/**
 * Helper function to convert appointment metadata to cover image FileAttachment array
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
        description: 'Original Cover-Bild'
      });
    }
    
    if (meta.croppedCoverImageUrl) {
      coverImages.push({
        url: meta.croppedCoverImageUrl,
        type: 'image',
        description: 'Zugeschnittenes Cover-Bild (14:5)'
      });
    }
    
    return coverImages;
  } catch (error) {
    console.error('Error parsing metadata:', error);
    return [];
  }
};

/**
 * Helper function to convert File/Blob array to FileAttachment array
 */
export const parseUploadedFiles = (files: (File | Blob)[], previews?: { [key: string]: string }): FileAttachment[] => {
  return files.map((file, index) => {
    const id = `file-${Date.now()}-${index}`;
    return {
      id,
      file,
      name: file instanceof File ? file.name : `File-${index + 1}`,
      type: file.type?.startsWith('image/') ? 'image' as const : 
            file.type === 'application/pdf' ? 'pdf' as const : 'other' as const,
      preview: previews?.[id]
    };
  });
};

/**
 * Helper function to convert FileItem array (from FileUpload component) to FileAttachment array
 */
export const parseFileItems = (fileItems: { id: string; name: string; type: string; preview?: string; file: File | Blob }[]): FileAttachment[] => {
  return fileItems.map(item => ({
    id: item.id,
    file: item.file,
    name: item.name,
    type: item.type.startsWith('image/') ? 'image' as const : 
          item.type === 'application/pdf' ? 'pdf' as const : 'other' as const,
    preview: item.preview
  }));
};