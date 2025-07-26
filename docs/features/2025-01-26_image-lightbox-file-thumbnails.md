# Image Lightbox and File Thumbnails Feature

## Overview

This feature enhances the display of images and file attachments in appointment details pages with:
- Compact thumbnail previews with 4:5 aspect ratio
- Click-to-view lightbox for images
- Consistent styling for all file types (images, PDFs, other files)
- Improved user experience with clean, modern design

## Features

### 1. Image Lightbox
- **Full-size image viewing** in an overlay modal
- **Click outside or ESC key** to close
- **Smooth transitions** and professional appearance
- **Accessibility support** with ARIA labels and keyboard navigation

### 2. File Thumbnails
- **Uniform 4:5 aspect ratio** for all thumbnails
- **Smart file type detection** (images, PDFs, other files)
- **Click behavior by type**:
  - Images: Open in lightbox
  - PDFs/Other files: Download/open in new tab
- **Clean design** without overlay buttons for featured content

### 3. Cover Images (Featured Appointments)
- Display only the full cover image (not cropped version)
- Click to open in lightbox
- No overlay text or buttons for cleaner appearance

## Technical Implementation

### Components

#### ImageLightbox (`/src/components/ui/ImageLightbox.tsx`)
```typescript
interface ImageLightboxProps {
  open: boolean;
  imageUrl: string;
  imageAlt?: string;
  onClose: () => void;
}
```
- Material-UI Dialog-based implementation
- Responsive sizing with max 90% viewport
- Keyboard navigation (ESC to close)
- ARIA labels for accessibility

#### FileThumbnail (`/src/components/ui/FileThumbnail.tsx`)
```typescript
interface FileThumbnailProps {
  file: FileAttachment;
  height?: number;
  aspectRatio?: string;
  showFileName?: boolean;
  showDescription?: boolean;
  showButtons?: boolean;
  // ... other props
}
```
- Flexible display options
- Theme-aware styling
- Reusable across different contexts

#### ThumbnailContainer (`/src/components/ui/ThumbnailContainer.tsx`)
- Reusable container with consistent styling
- Hover effects and click behavior
- Theme shadow integration

### Utilities

#### File Utils (`/src/lib/file-utils.ts`)
- `getFileType()`: Detect file type from extension or MIME type
- `parseFileUrls()`: Convert URL arrays to FileAttachment objects
- `parseCoverImages()`: Extract cover images from metadata
- `handleFileOpen()`: Unified file opening logic

#### Date Utils (`/src/lib/date-utils.ts`)
- `formatLongDate()`: German long date format
- `formatShortDate()`: German short date format
- `formatTime()`: 24-hour time format
- `formatTimeRange()`: Time range formatting

## Usage Examples

### Display Cover Images with Lightbox
```tsx
<FileThumbnailGrid
  files={parseCoverImages(appointment.metadata)}
  gridSize={{ xs: 12, sm: 6, md: 6, lg: 6 }}
  aspectRatio="4/5"
  showFileName={false}
  showDescription={false}
  showButtons={false}
  onFileClick={handleImageClick}
/>
```

### Display File Attachments
```tsx
<FileThumbnailGrid
  files={parseFileUrls(appointment.fileUrls)}
  gridSize={{ xs: 12, sm: 6, md: 4, lg: 3 }}
  aspectRatio="4/5"
  showFileName={false}
  showDescription={false}
  showButtons={false}
  onFileClick={handleImageClick}
/>
```

### Handle Image Clicks
```tsx
const handleImageClick = (file: FileAttachment) => {
  if (file.url) {
    if (file.type === 'image') {
      // Open in lightbox
      setLightboxImage({ url: file.url, alt: file.name || 'Image' });
      setLightboxOpen(true);
    } else {
      // Open in new tab
      window.open(file.url, '_blank');
    }
  }
};
```

## Design Decisions

### Why 4:5 Aspect Ratio?
- More vertical, compact thumbnails
- Better use of screen space
- Consistent appearance regardless of original image dimensions
- Works well for both portrait and landscape images

### Why Remove Buttons for Images?
- Cleaner, more modern appearance
- Click-to-view is intuitive for images
- Reduces visual clutter
- Maintains buttons for PDFs where download is expected

### Accessibility Considerations
- All interactive elements have proper ARIA labels
- Keyboard navigation fully supported
- Focus management in lightbox
- Screen reader friendly

## Best Practices

### Code Organization
- Utilities extracted to `/src/lib/` following project conventions
- Reusable components prevent code duplication
- Theme values used instead of hardcoded styles
- TypeScript interfaces for type safety

### Performance
- Lazy loading considerations for images
- Efficient file type detection
- Minimal re-renders with proper React patterns

### Maintainability
- Components under 500 lines (FileThumbnail reduced from 477 to 303 lines)
- Clear separation of concerns
- Well-documented utility functions
- Consistent API patterns

## Migration Guide

### For Existing File Display
Replace:
```tsx
<FileThumbnailGrid
  files={parseFileUrls(appointment.fileUrls)}
  height={160}
/>
```

With:
```tsx
<FileThumbnailGrid
  files={parseFileUrls(appointment.fileUrls)}
  aspectRatio="4/5"
  showButtons={false}
  onFileClick={handleImageClick}
/>
```

### For Cover Images
The `parseCoverImages()` function now only returns the full cover image, not the cropped version.

## Future Enhancements

- Image gallery navigation (previous/next in lightbox)
- Zoom functionality for detailed viewing
- Image preloading for better performance
- Support for more file types with custom icons
- Batch download functionality for multiple files

## Related Documentation

- [Material-UI Dialog](https://mui.com/material-ui/react-dialog/)
- [CSS Aspect Ratio](https://developer.mozilla.org/en-US/docs/Web/CSS/aspect-ratio)
- [ARIA Best Practices](https://www.w3.org/WAI/ARIA/apg/)