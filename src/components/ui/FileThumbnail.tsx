'use client';

import React from 'react';
import {
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Button,
  Typography,
  Grid,
  useTheme
} from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import { getFileType, handleFileOpen } from '@/lib/file-utils';
import { ThumbnailContainer } from './ThumbnailContainer';

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
  aspectRatio?: string;
  variant?: 'outlined' | 'elevation';
  showFileName?: boolean;
  showDescription?: boolean;
  showButtons?: boolean;
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
  aspectRatio,
  variant = 'outlined',
  showFileName = true,
  showDescription = true,
  showButtons = true,
  buttonText = 'Öffnen',
  showRemoveButton = false,
  onFileClick,
  onRemove,
  disabled = false
}) => {
  const theme = useTheme();

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
    handleFileOpen(file, onFileClick);
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
              height={aspectRatio ? undefined : height}
              image={displaySource}
              alt={file.description || fileName}
              sx={{ 
                objectFit: 'cover',
                cursor: !showButtons ? 'pointer' : 'default',
                ...(aspectRatio && {
                  aspectRatio: aspectRatio,
                  height: 'auto',
                  width: '100%'
                })
              }}
              onClick={!showButtons ? handleClick : undefined}
            />
          );
        }
        // Fallback for File objects without preview
        return (
          <ThumbnailContainer
            aspectRatio={aspectRatio}
            height={height}
            clickable={!showButtons}
            showHoverEffect={!showButtons}
            onClick={!showButtons ? handleClick : undefined}
          >
            <Typography variant="body2" color="text.secondary">
              Bildvorschau
            </Typography>
          </ThumbnailContainer>
        );
      case 'pdf':
        return (
          <ThumbnailContainer
            aspectRatio={aspectRatio}
            height={height}
            clickable={!showButtons}
            showHoverEffect={!showButtons}
            onClick={!showButtons ? handleClick : undefined}
          >
            <PictureAsPdfIcon sx={{ 
              fontSize: theme.spacing(7.5), 
              color: 'error.main',
              filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))'
            }} />
          </ThumbnailContainer>
        );
      default:
        return (
          <ThumbnailContainer
            aspectRatio={aspectRatio}
            height={height}
            clickable={!showButtons}
            showHoverEffect={!showButtons}
            onClick={!showButtons ? handleClick : undefined}
          >
            <InsertDriveFileIcon sx={{ 
              fontSize: theme.spacing(7.5), 
              color: 'text.secondary',
              filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))'
            }} />
          </ThumbnailContainer>
        );
    }
  };

  return (
    <Card variant={showButtons ? variant : 'outlined'} sx={{ 
      height: 'fit-content', 
      opacity: disabled ? 0.6 : 1,
      ...(aspectRatio && {
        maxWidth: theme.spacing(22.5), // 180px
        width: 'fit-content'
      }),
      ...(!showButtons && {
        border: 'none',
        boxShadow: 'none',
        bgcolor: 'transparent'
      })
    }}>
      {renderThumbnail()}
      {(showFileName || (showDescription && file.description)) && (
        <CardContent sx={{ py: 1 }}>
          {showFileName && (
            <Typography variant="caption" noWrap title={fileName}>
              {fileName}
            </Typography>
          )}
          {showDescription && file.description && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              {file.description}
            </Typography>
          )}
        </CardContent>
      )}
      {showButtons && (
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
      )}
    </Card>
  );
};

interface FileThumbnailGridProps {
  files: FileAttachment[];
  gridSize?: { xs?: number; sm?: number; md?: number; lg?: number };
  height?: number;
  aspectRatio?: string;
  variant?: 'outlined' | 'elevation';
  showFileName?: boolean;
  showDescription?: boolean;
  showButtons?: boolean;
  showButtonsForImages?: boolean;
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
  aspectRatio,
  variant = 'outlined',
  showFileName = true,
  showDescription = true,
  showButtons = true,
  showButtonsForImages,
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
        // Determine if this specific file should show buttons
        const shouldShowButtons = file.type === 'image' 
          ? (showButtonsForImages !== undefined ? showButtonsForImages : showButtons)
          : showButtons;
        
        return (
          <Grid size={gridSize} key={key}>
            <FileThumbnail
              file={file}
              height={height}
              aspectRatio={aspectRatio}
              variant={variant}
              showFileName={showFileName}
              showDescription={showDescription}
              showButtons={shouldShowButtons}
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

// Re-export helper functions from file-utils
export { parseFileUrls, parseCoverImages, parseUploadedFiles, parseFileItems } from '@/lib/file-utils';