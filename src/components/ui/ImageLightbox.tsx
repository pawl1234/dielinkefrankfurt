'use client';

import React, { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  IconButton,
  Box,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

interface ImageLightboxProps {
  open: boolean;
  imageUrl: string;
  imageAlt?: string;
  onClose: () => void;
}

/**
 * Image lightbox component for viewing images in full size
 * 
 * @param open - Whether the lightbox is open
 * @param imageUrl - URL of the image to display
 * @param imageAlt - Alt text for the image
 * @param onClose - Callback when lightbox is closed
 */
export const ImageLightbox: React.FC<ImageLightboxProps> = ({
  open,
  imageUrl,
  imageAlt = 'Image',
  onClose
}) => {
  // Handle escape key press
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) {
        onClose();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [open, onClose]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      aria-labelledby="lightbox-image"
      PaperProps={{
        sx: {
          bgcolor: 'transparent',
          boxShadow: 'none',
          borderRadius: 1,
          margin: 3,
          maxWidth: '90vw',
          maxHeight: '90vh',
          overflow: 'hidden',
        }
      }}
      sx={{
        '& .MuiBackdrop-root': {
          bgcolor: 'rgba(0, 0, 0, 0.8)',
        }
      }}
    >
      <DialogContent
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 2,
          position: 'relative',
          bgcolor: 'rgba(0, 0, 0, 0.9)',
          borderRadius: 1,
          overflow: 'hidden',
        }}
      >
        {/* Close button */}
        <IconButton
          onClick={onClose}
          aria-label="Bild schließen"
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            color: 'white',
            bgcolor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1,
            '&:hover': {
              bgcolor: 'rgba(0, 0, 0, 0.7)',
            }
          }}
          size="large"
        >
          <CloseIcon />
        </IconButton>

        {/* Image */}
        <Box
          component="img"
          src={imageUrl}
          alt={imageAlt}
          role="img"
          aria-label={imageAlt}
          sx={{
            maxWidth: '100%',
            maxHeight: '80vh',
            objectFit: 'contain',
            cursor: 'pointer',
            borderRadius: 1,
          }}
          onClick={onClose}
        />
      </DialogContent>
    </Dialog>
  );
};