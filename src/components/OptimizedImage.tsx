import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Box, Skeleton, Fade } from '@mui/material';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
  quality?: number;
  className?: string;
  style?: React.CSSProperties;
  objectFit?: 'fill' | 'contain' | 'cover' | 'none' | 'scale-down';
  objectPosition?: string;
  blur?: boolean;
}

/**
 * OptimizedImage component for improved image loading performance.
 * Features:
 * - Lazy loading by default
 * - Optional priority loading for above-the-fold images
 * - Blur-up effect for better UX during loading
 * - Built-in error handling
 * - Automatic handling of WebP/AVIF formats with fallbacks
 */
export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width = 200,
  height = 200,
  priority = false,
  quality = 75,
  className,
  style,
  objectFit = 'cover',
  objectPosition = 'center',
  blur = true,
}) => {
  const [isLoading, setIsLoading] = useState(!priority);
  const [error, setError] = useState(false);
  const [imageUrl, setImageUrl] = useState(src);

  // Prepare cache key for this image
  const cacheKey = `img_${src}_${width}x${height}`;

  useEffect(() => {
    // Check if this image has been cached in sessionStorage
    try {
      const cachedItem = sessionStorage.getItem(cacheKey);
      if (cachedItem) {
        // If we have a cached data URL, use it immediately to prevent flickering
        setImageUrl(cachedItem);
        setIsLoading(false);
      } else {
        setImageUrl(src);
        setIsLoading(!priority);
      }
      setError(false);
    } catch (e) {
      // If sessionStorage fails (e.g., in private browsing), just use src
      setImageUrl(src);
    }
  }, [src, cacheKey, priority]);

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    // Once loaded successfully, cache if possible
    try {
      if (e.currentTarget.src && e.currentTarget.src.startsWith('data:')) {
        // Only cache data URLs
        sessionStorage.setItem(cacheKey, e.currentTarget.src);
      }
    } catch (e) {
      // Silent fail if sessionStorage isn't available
    }
    setIsLoading(false);
  };

  const handleError = () => {
    setError(true);
    setIsLoading(false);
    // Remove from cache if it causes an error
    try {
      sessionStorage.removeItem(cacheKey);
    } catch (e) {
      // Silent fail
    }
  };

  if (error) {
    // Show fallback for error state
    return (
      <Box
        sx={{
          width,
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'grey.200',
          borderRadius: 1,
          color: 'grey.700',
          fontSize: '0.75rem',
          ...style,
        }}
        className={className}
      >
        {alt || 'Image failed to load'}
      </Box>
    );
  }

  return (
    <Box
      sx={{
        position: 'relative',
        width,
        height,
        overflow: 'hidden',
        ...style,
      }}
      className={className}
    >
      {isLoading && blur && (
        <Skeleton
          variant="rectangular"
          width="100%"
          height="100%"
          animation="wave"
          sx={{ position: 'absolute', top: 0, left: 0, zIndex: 1 }}
        />
      )}

      <Fade in={!isLoading} timeout={300}>
        <Box sx={{ width: '100%', height: '100%' }}>
          <Image
            src={imageUrl}
            alt={alt}
            width={width}
            height={height}
            quality={quality}
            priority={priority}
            onLoad={handleLoad}
            onError={handleError}
            style={{
              objectFit,
              objectPosition,
              width: '100%',
              height: '100%',
            }}
            loading={priority ? 'eager' : 'lazy'}
          />
        </Box>
      </Fade>
    </Box>
  );
};