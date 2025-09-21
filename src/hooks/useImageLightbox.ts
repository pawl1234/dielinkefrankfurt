'use client';

import { useState, useCallback } from 'react';
import { FileAttachment } from '@/components/ui/FileThumbnail';

interface LightboxImage {
  url: string;
  alt: string;
}

interface LightboxProps {
  open: boolean;
  imageUrl: string;
  imageAlt: string;
  onClose: () => void;
}

interface UseImageLightboxReturn {
  lightboxProps: LightboxProps;
  handleFileClick: (file: FileAttachment) => void;
}

/**
 * Custom hook for managing image lightbox state and interactions.
 * Provides consistent lightbox behavior across components.
 *
 * @returns Object containing lightbox props and file click handler
 */
export const useImageLightbox = (): UseImageLightboxReturn => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<LightboxImage>({
    url: '',
    alt: ''
  });

  /**
   * Handles file click events - opens images in lightbox, other files in new tab
   */
  const handleFileClick = useCallback((file: FileAttachment) => {
    if (file.url) {
      if (file.type === 'image') {
        // Open images in lightbox
        setLightboxImage({
          url: file.url,
          alt: file.description || file.name || 'Image'
        });
        setLightboxOpen(true);
      } else {
        // Open PDFs and other files in new tab
        window.open(file.url, '_blank');
      }
    }
  }, []);

  /**
   * Closes the lightbox
   */
  const handleLightboxClose = useCallback(() => {
    setLightboxOpen(false);
  }, []);

  return {
    lightboxProps: {
      open: lightboxOpen,
      imageUrl: lightboxImage.url,
      imageAlt: lightboxImage.alt,
      onClose: handleLightboxClose
    },
    handleFileClick
  };
};