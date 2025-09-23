'use client';

import { useState, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  FormHelperText,
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
  onFilesSelect?: (files: (File | Blob)[]) => void;
  onFilesAdded?: (files: File[]) => void;
  onError?: (error: string | null) => void;
  maxFiles?: number;
  maxFileSize?: number;
  allowedFileTypes?: string[];
  multiple?: boolean;
  isUploading?: boolean;
  uploadProgress?: number;
  disabled?: boolean;
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
  onFilesSelect,
  onFilesAdded,
  onError,
  maxFiles = 5,
  maxFileSize = 5 * 1024 * 1024, // Default 5MB
  allowedFileTypes = ['.jpg', '.jpeg', '.png', '.pdf'],
  multiple = true,
  isUploading = false,
  uploadProgress = 0,
  disabled = false
}: FileUploadProps) => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [processingFiles, setProcessingFiles] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file input change
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    // Check if adding these files would exceed the limit
    if (files.length + selectedFiles.length > maxFiles) {
      const errorMessage = `Du kannst maximal ${maxFiles} Dateien hochladen.`;
      setError(errorMessage);
      onError?.(errorMessage);
      return;
    }

    // Helper function to check if file extension matches allowed types
    const isValidFileType = (filename: string): boolean => {
      const ext = '.' + filename.split('.').pop()?.toLowerCase();
      return allowedFileTypes.some(type => type.toLowerCase() === ext);
    };

    // Validate all files first before processing any
    const filesArray = Array.from(selectedFiles);
    for (let i = 0; i < filesArray.length; i++) {
      const file = filesArray[i];

      // Validate file type
      if (!isValidFileType(file.name)) {
        const errorMessage = `Nicht unterstützter Dateityp. Erlaubte Typen: ${allowedFileTypes.join(', ')}`;
        setError(errorMessage);
        onError?.(errorMessage);
        return;
      }

      // Validate file size
      if (file.size > maxFileSize) {
        const maxSizeMB = maxFileSize / (1024 * 1024);
        const errorMessage = `Dateigröße überschreitet ${maxSizeMB}MB Limit. Bitte lade eine kleinere Datei hoch.`;
        setError(errorMessage);
        onError?.(errorMessage);
        return;
      }
    }

    // All files are valid, proceed with processing
    const newFiles: FileItem[] = [];
    const addedFiles: File[] = [];

    filesArray.forEach(file => {
      // Add to the list of added files for the callback
      addedFiles.push(file);

      // Create a new file item
      const fileItem: FileItem = {
        id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: file.name,
        type: file.type,
        file: file,
        isProcessing: true
      };

      // Mark this file as being processed
      setProcessingFiles(prev => [...prev, fileItem.id]);

      // Generate preview for image files
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const updatedFiles = [...files, ...newFiles].map(f => {
            if (f.id === fileItem.id) {
              return { ...f, preview: e.target?.result as string, isProcessing: false };
            }
            return f;
          });
          setFiles(updatedFiles);
          setProcessingFiles(prev => prev.filter(id => id !== fileItem.id));
          onFilesSelect?.(updatedFiles.map(f => f.file));
        };
        reader.readAsDataURL(file);
      } else {
        // For non-image files, mark as processed immediately
        setTimeout(() => {
          setFiles(prev => prev.map(f =>
            f.id === fileItem.id ? { ...f, isProcessing: false } : f
          ));
          setProcessingFiles(prev => prev.filter(id => id !== fileItem.id));
        }, 500); // Small delay to show processing state
      }

      newFiles.push(fileItem);
    });

    // Add new files to state
    setFiles(prev => [...prev, ...newFiles]);

    // Call appropriate callbacks
    if (onFilesSelect) {
      onFilesSelect?.([...files, ...newFiles].map(f => f.file));
    }

    if (onFilesAdded && addedFiles.length > 0) {
      onFilesAdded(addedFiles);
    }

    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // Clear any previous errors only when files are successfully processed
    setError(null);
    onError?.(null);
  };

  // Remove a file
  const handleRemoveFile = (id: string) => {
    const updatedFiles = files.filter(file => file.id !== id);
    setFiles(updatedFiles);
    
    if (onFilesSelect) {
      onFilesSelect?.(updatedFiles.map(f => f.file));
    }
    
    // For onFilesAdded we don't need to call it here as it's only for adding files
  };

  // Handle click on upload box
  const handleUploadClick = () => {
    if (!disabled && !isUploading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <Box sx={{ mb: 3 }} data-testid="file-upload">
      <Typography
        variant="subtitle1"
        component="label"
        sx={{ display: 'block', mb: 1, fontWeight: 600 }}
      >
        Dateien hochladen ({allowedFileTypes.join(', ')}, max. {maxFileSize / (1024 * 1024)}MB)
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

        {files.length < maxFiles && !isUploading && (
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
                    {files.length > 0 
                      ? `Weitere Dateien auswählen (${files.length}/${maxFiles})`
                      : 'Dateien auswählen oder hierher ziehen'}
                  </Typography>
                </>
              )}
              <Typography variant="body2" color="text.secondary">
                {allowedFileTypes.join(', ')} (max. {maxFileSize / (1024 * 1024)}MB)
              </Typography>
              <input 
                type="file" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                onChange={handleFileChange} 
                accept={allowedFileTypes.join(',')}
                multiple={multiple && files.length < maxFiles - 1}
                disabled={disabled || isUploading}
              />
            </UploadBox>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
              Für Bilder (JPEG/PNG) wird ein Seitenverhältnis von 4:3 empfohlen.
            </Typography>
          </Box>
        )}

        {files.length > 0 && (
          <Box sx={{ mt: files.length < maxFiles ? 3 : 0 }}>
            <Typography variant="subtitle2" gutterBottom>
              Hochgeladene Dateien ({files.length}/{maxFiles})
            </Typography>
            <Grid container spacing={2}>
              {files.map((file) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={file.id}>
                  <Card variant="outlined" sx={{ opacity: file.isProcessing ? 0.7 : 1 }}>
                    {file.isProcessing ? (
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
                    ) : file.preview ? (
                      <CardMedia
                        component="img"
                        image={file.preview}
                        alt={file.name}
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
                        {file.type === 'application/pdf' ? (
                          <PictureAsPdfIcon sx={{ fontSize: 48, color: 'error.main' }} />
                        ) : (
                          <InsertDriveFileIcon sx={{ fontSize: 48, color: 'primary.main' }} />
                        )}
                      </Box>
                    )}
                    <CardContent sx={{ py: 1 }}>
                      <Typography variant="body2" noWrap title={file.name}>
                        {file.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {file.isProcessing 
                          ? 'Wird verarbeitet...'
                          : file.type === 'application/pdf' ? 'PDF' : file.type.split('/')[1].toUpperCase()
                        }
                      </Typography>
                    </CardContent>
                    <CardActions>
                      <Button 
                        size="small" 
                        color="error" 
                        onClick={() => handleRemoveFile(file.id)}
                        startIcon={file.isProcessing ? <CircularProgress size={16} /> : <DeleteIcon />}
                        disabled={file.isProcessing || disabled || isUploading}
                      >
                        {file.isProcessing ? 'Verarbeitung...' : 'Entfernen'}
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {error && (
          <FormHelperText error sx={{ mt: 1 }}>
            {error}
          </FormHelperText>
        )}
      </Paper>
      
      {/* Hidden elements for testing configuration */}
      <Box sx={{ display: 'none' }}>
        <span data-testid="max-files">{maxFiles}</span>
        <span data-testid="max-file-size">{maxFileSize}</span>
        <span data-testid="allowed-file-types">{allowedFileTypes.join(',')}</span>
        <span data-testid="multiple">{multiple.toString()}</span>
      </Box>
    </Box>
  );
};

export default FileUpload;