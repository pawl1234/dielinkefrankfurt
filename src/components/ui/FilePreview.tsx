/**
 * Reusable file preview component for thumbnails
 * Shows image preview or file type icon
 */

import React from 'react';
import {
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Button,
  Typography,
  Box,
  CircularProgress
} from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import DeleteIcon from '@mui/icons-material/Delete';

interface FilePreviewProps {
  /** File name */
  name: string;
  /** File MIME type */
  type: string;
  /** Preview URL for images */
  preview?: string;
  /** Whether file is being processed */
  isProcessing?: boolean;
  /** Callback when remove button clicked */
  onRemove?: () => void;
  /** Whether controls are disabled */
  disabled?: boolean;
}

export const FilePreview: React.FC<FilePreviewProps> = ({
  name,
  type,
  preview,
  isProcessing = false,
  onRemove,
  disabled = false
}) => {
  return (
    <Card variant="outlined" sx={{ opacity: isProcessing ? 0.7 : 1 }}>
      {isProcessing ? (
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
      ) : preview ? (
        <CardMedia
          component="img"
          image={preview}
          alt={name}
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
          {type === 'application/pdf' ? (
            <PictureAsPdfIcon sx={{ fontSize: 48, color: 'error.main' }} />
          ) : (
            <InsertDriveFileIcon sx={{ fontSize: 48, color: 'primary.main' }} />
          )}
        </Box>
      )}
      <CardContent sx={{ py: 1 }}>
        <Typography variant="body2" noWrap title={name}>
          {name}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {isProcessing
            ? 'Wird verarbeitet...'
            : type === 'application/pdf' ? 'PDF' : type.split('/')[1].toUpperCase()
          }
        </Typography>
      </CardContent>
      {onRemove && (
        <CardActions>
          <Button
            size="small"
            color="error"
            onClick={onRemove}
            startIcon={isProcessing ? <CircularProgress size={16} /> : <DeleteIcon />}
            disabled={isProcessing || disabled}
          >
            {isProcessing ? 'Verarbeitung...' : 'Entfernen'}
          </Button>
        </CardActions>
      )}
    </Card>
  );
};
