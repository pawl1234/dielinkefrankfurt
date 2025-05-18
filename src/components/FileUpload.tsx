'use client';

import { useState, useEffect, useRef } from 'react';
import Uppy from '@uppy/core';
import { Dashboard } from '@uppy/react';
import ThumbnailGenerator from '@uppy/thumbnail-generator';
import DragDrop from '@uppy/drag-drop';
import {
  Box,
  Typography,
  Paper,
  Button,
  FormHelperText,
  IconButton,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  styled,
  BoxProps,
  Grid,
  Chip
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloseIcon from '@mui/icons-material/Close';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DeleteIcon from '@mui/icons-material/Delete';

interface FileUploadProps {
  onFilesSelect?: (files: (File | Blob)[]) => void;
  onFilesAdded?: (files: File[]) => void;
  maxFiles?: number;
  maxFileSize?: number;
  allowedFileTypes?: string[];
  multiple?: boolean;
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
}

const FileUpload = ({ 
  onFilesSelect, 
  onFilesAdded,
  maxFiles = 5, 
  maxFileSize = 5 * 1024 * 1024, // Default 5MB
  allowedFileTypes = ['.jpg', '.jpeg', '.png', '.pdf'],
  multiple = true
}: FileUploadProps) => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file input change
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    // Check if adding these files would exceed the limit
    if (files.length + selectedFiles.length > maxFiles) {
      setError(`Du kannst maximal ${maxFiles} Dateien hochladen.`);
      return;
    }

    // Process each selected file
    const newFiles: FileItem[] = [];
    const validMimeTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    // Helper function to check if file extension matches allowed types
    const isValidFileType = (filename: string): boolean => {
      const ext = '.' + filename.split('.').pop()?.toLowerCase();
      return allowedFileTypes.some(type => type.toLowerCase() === ext);
    };

    const addedFiles: File[] = [];

    Array.from(selectedFiles).forEach(file => {
      // Validate file type
      if (!isValidFileType(file.name)) {
        setError(`Nicht unterstützter Dateityp. Erlaubte Typen: ${allowedFileTypes.join(', ')}`);
        return;
      }

      // Validate file size
      if (file.size > maxFileSize) {
        const maxSizeMB = maxFileSize / (1024 * 1024);
        setError(`Dateigröße überschreitet ${maxSizeMB}MB Limit. Bitte lade eine kleinere Datei hoch.`);
        return;
      }
      
      // Add to the list of added files for the callback
      addedFiles.push(file);

      // Create a new file item
      const fileItem: FileItem = {
        id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: file.name,
        type: file.type,
        file: file
      };

      // Generate preview for image files
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const updatedFiles = [...files, ...newFiles].map(f => {
            if (f.id === fileItem.id) {
              return { ...f, preview: e.target?.result as string };
            }
            return f;
          });
          setFiles(updatedFiles);
          onFilesSelect?.(updatedFiles.map(f => f.file));
        };
        reader.readAsDataURL(file);
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
    
    setError(null);
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
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <Box sx={{ mb: 3 }}>
      <Typography
        variant="subtitle1"
        component="label"
        sx={{ display: 'block', mb: 1, fontWeight: 600 }}
      >
        Dateien hochladen ({allowedFileTypes.join(', ')}, max. {maxFileSize / (1024 * 1024)}MB)
      </Typography>

      <Paper variant="outlined" sx={{ p: 2 }}>
        {files.length < maxFiles && (
          <Box>
            <UploadBox onClick={handleUploadClick}>
              <CloudUploadIcon color="primary" sx={{ fontSize: 48, mb: 2 }} />
              <Typography variant="subtitle1" gutterBottom>
                {files.length > 0 
                  ? `Weitere Dateien auswählen (${files.length}/${maxFiles})`
                  : 'Dateien auswählen oder hierher ziehen'}
              </Typography>
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
                  <Card variant="outlined">
                    {file.preview ? (
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
                        bgcolor: 'grey.100'
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
                        {file.type === 'application/pdf' ? 'PDF' : file.type.split('/')[1].toUpperCase()}
                      </Typography>
                    </CardContent>
                    <CardActions>
                      <Button 
                        size="small" 
                        color="error" 
                        onClick={() => handleRemoveFile(file.id)}
                        startIcon={<DeleteIcon />}
                      >
                        Entfernen
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
    </Box>
  );
};

export default FileUpload;