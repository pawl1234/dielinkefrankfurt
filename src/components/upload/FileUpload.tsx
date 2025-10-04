'use client';

import React, { useState, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  styled,
  BoxProps,
  Grid,
  CircularProgress,
  LinearProgress
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DeleteIcon from '@mui/icons-material/Delete';

interface FileUploadProps {
  /** Current files value (controlled component) */
  files?: File[];
  /** Callback when files change */
  onChange?: (files: File[]) => void;
  /** Error message to display */
  error?: string;

  /** Maximum number of files allowed (from constants) */
  maxFiles: number;
  /** Maximum file size in bytes (from constants) */
  maxFileSize: number;
  /** Allowed MIME types (from constants) */
  allowedMimeTypes: string[];

  /** Whether component is disabled */
  disabled?: boolean;
  /** Upload progress indicator */
  isUploading?: boolean;
  uploadProgress?: number;
}

// Styled component for the upload box
const UploadBox = styled(Box)<BoxProps>(({ theme }) => ({
  border: `2px dashed ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(3),
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: theme.palette.background.default,
  transition: 'border-color 0.2s, background-color 0.2s',
  cursor: 'pointer',
  '&:hover': {
    borderColor: theme.palette.primary.main,
    backgroundColor: theme.palette.action.hover
  }
}));

interface FileItem {
  id: string;
  name: string;
  type: string;
  preview?: string;
  file: File | Blob;
  isProcessing?: boolean;
}

const FileUpload = ({
  files = [],
  onChange,
  maxFiles,
  maxFileSize,
  allowedMimeTypes,
  disabled = false,
  isUploading = false,
  uploadProgress = 0
}: FileUploadProps) => {
  const [fileItems, setFileItems] = useState<FileItem[]>([]);
  const [processingFiles, _setProcessingFiles] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper function to convert MIME types to file extensions for display
  const getFileExtensions = (mimeTypes: string[]): string[] => {
    const extensionMap: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/gif': '.gif',
      'application/pdf': '.pdf',
      'application/msword': '.doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
      'application/vnd.ms-excel': '.xls',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx'
    };
    return mimeTypes.map(mime => extensionMap[mime] || mime).filter(Boolean);
  };

  // Sync external files with internal file items for UI
  React.useEffect(() => {
    const newFileItems = files.map((file, index) => ({
      id: `file-${index}-${file.name}`,
      name: file.name,
      type: file.type,
      file: file,
      preview: undefined,
      isProcessing: false
    }));

    setFileItems(newFileItems);

    // Generate previews for new image files
    newFileItems.forEach(item => {
      if (item.file instanceof File && item.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setFileItems(prev => prev.map(f =>
            f.id === item.id ? { ...f, preview: e.target?.result as string } : f
          ));
        };
        reader.readAsDataURL(item.file);
      }
    });
  }, [files]);

  // Handle file input change - no validation, just pass files to parent
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    // Convert FileList to Array and combine with existing files
    const newFiles = Array.from(selectedFiles);
    const updatedFiles = [...files, ...newFiles];

    // Call onChange callback to let parent handle validation
    onChange?.(updatedFiles);

    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Remove a file by finding it in the files array
  const handleRemoveFile = (fileToRemove: File) => {
    const updatedFiles = files.filter(file => file !== fileToRemove);
    onChange?.(updatedFiles);
  };

  // Handle click on upload box
  const handleUploadClick = () => {
    if (!disabled && !isUploading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const fileExtensions = getFileExtensions(allowedMimeTypes);
  const maxFileSizeMB = Math.round(maxFileSize / (1024 * 1024));

  return (
    <Box sx={{ mb: 3 }} data-testid="file-upload">
      <Typography
        variant="subtitle1"
        component="label"
        sx={{ display: 'block', mb: 1, fontWeight: 600 }}
      >
        Dateien hochladen ({fileExtensions.join(', ')}, max. {maxFileSizeMB}MB)
      </Typography>

      <Paper variant="outlined" sx={{ p: 2, opacity: disabled ? 0.6 : 1 }}>
        {/* Upload Progress Indicator */}
        {isUploading && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="primary">
                Upload läuft...
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {uploadProgress}%
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={uploadProgress} 
              sx={{ height: 6, borderRadius: 3 }}
            />
          </Box>
        )}

        {fileItems.length < maxFiles && !isUploading && (
          <Box>
            <UploadBox 
              onClick={handleUploadClick}
              sx={{
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.6 : 1,
                '&:hover': disabled ? {} : undefined
              }}
            >
              {processingFiles.length > 0 ? (
                <>
                  <CircularProgress size={48} sx={{ mb: 2 }} />
                  <Typography variant="subtitle1" gutterBottom>
                    Dateien werden verarbeitet...
                  </Typography>
                </>
              ) : (
                <>
                  <CloudUploadIcon color="primary" sx={{ fontSize: 48, mb: 2 }} />
                  <Typography variant="subtitle1" gutterBottom>
                    {fileItems.length > 0
                      ? `Weitere Dateien auswählen (${fileItems.length}/${maxFiles})`
                      : 'Dateien auswählen oder hierher ziehen'}
                  </Typography>
                </>
              )}
              <Typography variant="body2" color="text.secondary">
                {fileExtensions.join(', ')} (max. {maxFileSizeMB}MB)
              </Typography>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleFileChange}
                accept={allowedMimeTypes.join(',')}
                multiple={fileItems.length < maxFiles - 1}
                disabled={disabled || isUploading}
              />
            </UploadBox>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
              Für Bilder (JPEG/PNG) wird ein Seitenverhältnis von 4:3 empfohlen.
            </Typography>
          </Box>
        )}

        {fileItems.length > 0 && (
          <Box sx={{ mt: fileItems.length < maxFiles ? 3 : 0 }}>
            <Typography variant="subtitle2" gutterBottom>
              Hochgeladene Dateien ({fileItems.length}/{maxFiles})
            </Typography>
            <Grid container spacing={2}>
              {fileItems.map((fileItem) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={fileItem.id}>
                  <Card variant="outlined" sx={{ opacity: fileItem.isProcessing ? 0.7 : 1 }}>
                    {fileItem.isProcessing ? (
                      <Box sx={{ 
                        p: 3, 
                        display: 'flex', 
                        flexDirection: 'column',
                        justifyContent: 'center', 
                        alignItems: 'center',
                        bgcolor: 'grey.50',
                        aspectRatio: '4/3'
                      }}>
                        <CircularProgress size={32} sx={{ mb: 1 }} />
                        <Typography variant="caption" color="text.secondary">
                          Wird verarbeitet...
                        </Typography>
                      </Box>
                    ) : fileItem.preview ? (
                      <CardMedia
                        component="img"
                        image={fileItem.preview}
                        alt={fileItem.name}
                        sx={{
                          aspectRatio: '4/3',
                          objectFit: 'cover'
                        }}
                      />
                    ) : (
                      <Box sx={{
                        p: 3,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        bgcolor: 'grey.100',
                        aspectRatio: '4/3'
                      }}>
                        {fileItem.type === 'application/pdf' ? (
                          <PictureAsPdfIcon sx={{ fontSize: 48, color: 'error.main' }} />
                        ) : (
                          <InsertDriveFileIcon sx={{ fontSize: 48, color: 'primary.main' }} />
                        )}
                      </Box>
                    )}
                    <CardContent sx={{ py: 1 }}>
                      <Typography variant="body2" noWrap title={fileItem.name}>
                        {fileItem.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {fileItem.isProcessing
                          ? 'Wird verarbeitet...'
                          : fileItem.type === 'application/pdf' ? 'PDF' : fileItem.type.split('/')[1].toUpperCase()
                        }
                      </Typography>
                    </CardContent>
                    <CardActions>
                      <Button
                        size="small"
                        color="error"
                        onClick={() => handleRemoveFile(fileItem.file as File)}
                        startIcon={fileItem.isProcessing ? <CircularProgress size={16} /> : <DeleteIcon />}
                        disabled={fileItem.isProcessing || disabled || isUploading}
                      >
                        {fileItem.isProcessing ? 'Verarbeitung...' : 'Entfernen'}
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default FileUpload;