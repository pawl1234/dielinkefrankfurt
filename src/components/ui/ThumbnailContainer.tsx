'use client';

import React from 'react';
import { Box, BoxProps, useTheme } from '@mui/material';

interface ThumbnailContainerProps extends BoxProps {
  aspectRatio?: string;
  height?: number;
  clickable?: boolean;
  showHoverEffect?: boolean;
}

/**
 * Reusable container for file thumbnails with consistent styling
 * 
 * @param aspectRatio - CSS aspect ratio (e.g., "4/5")
 * @param height - Fixed height when aspect ratio not used
 * @param clickable - Whether the container should show pointer cursor
 * @param showHoverEffect - Whether to show hover shadow effect
 * @param children - Content to display inside the container
 */
export const ThumbnailContainer: React.FC<ThumbnailContainerProps> = ({
  aspectRatio,
  height = 140,
  clickable = false,
  showHoverEffect = false,
  children,
  sx,
  ...props
}) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        height: aspectRatio ? 'auto' : height,
        ...(aspectRatio && {
          aspectRatio: aspectRatio,
          width: '100%'
        }),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'grey.50',
        cursor: clickable ? 'pointer' : 'default',
        borderRadius: 1,
        boxShadow: theme.shadows[2],
        '&:hover': showHoverEffect ? {
          boxShadow: theme.shadows[4]
        } : {},
        ...sx
      }}
      {...props}
    >
      {children}
    </Box>
  );
};