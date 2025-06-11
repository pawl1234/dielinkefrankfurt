'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  FormHelperText,
  styled,
  BoxProps,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CropIcon from '@mui/icons-material/Crop';
import DeleteIcon from '@mui/icons-material/Delete';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface CoverImageUploadProps {
  onImageSelect: (originalImage: File | Blob, croppedImage: File | Blob) => void;
  aspectRatio?: number;
  initialCoverImageUrl?: string;
  initialCroppedCoverImageUrl?: string;
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

const CropContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  marginTop: theme.spacing(2),
  marginBottom: theme.spacing(2),
}));

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number,
) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight,
    ),
    mediaWidth,
    mediaHeight,
  )
}

const CoverImageUpload = ({ 
  onImageSelect, 
  aspectRatio = 5/4,
  initialCoverImageUrl,
  initialCroppedCoverImageUrl 
}: CoverImageUploadProps) => {
  const [originalImage, setOriginalImage] = useState<File | Blob | null>(null);
  const [croppedImage, setCroppedImage] = useState<File | Blob | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialCoverImageUrl || null);
  const [croppedPreviewUrl, setCroppedPreviewUrl] = useState<string | null>(initialCroppedCoverImageUrl || null);
  const [error, setError] = useState<string | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [hasInitialImages, setHasInitialImages] = useState(!!initialCroppedCoverImageUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Handle initial URLs if provided
  useEffect(() => {
    if (initialCoverImageUrl && initialCroppedCoverImageUrl) {
      console.log("Initial URLs provided:", initialCoverImageUrl, initialCroppedCoverImageUrl);
      setHasInitialImages(true);
      setPreviewUrl(initialCoverImageUrl);
      setCroppedPreviewUrl(initialCroppedCoverImageUrl);
    }
  }, [initialCoverImageUrl, initialCroppedCoverImageUrl]);

  // Clean up URLs when component unmounts
  useEffect(() => {
    return () => {
      // Only revoke URLs that we created, not initial URLs from props
      if (previewUrl && previewUrl !== initialCoverImageUrl) URL.revokeObjectURL(previewUrl);
      if (croppedPreviewUrl && croppedPreviewUrl !== initialCroppedCoverImageUrl) URL.revokeObjectURL(croppedPreviewUrl);
    };
  }, [previewUrl, croppedPreviewUrl, initialCoverImageUrl, initialCroppedCoverImageUrl]);

  // Create a cropped version of the image when crop changes 
  useEffect(() => {
    if (
      completedCrop?.width &&
      completedCrop?.height &&
      imgRef.current &&
      canvasRef.current
    ) {
      // Draw the crop to the canvas
      const img = imgRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        console.error('No canvas context available');
        return;
      }

      // Get the actual image dimensions
      const scaleX = img.naturalWidth / img.width;
      const scaleY = img.naturalHeight / img.height;

      // Calculate the scaled crop dimensions in the original image
      const scaledCropX = completedCrop.x * scaleX;
      const scaledCropY = completedCrop.y * scaleY;
      const scaledCropWidth = completedCrop.width * scaleX;
      const scaledCropHeight = completedCrop.height * scaleY;
      
      // Set canvas dimensions to match the crop size
      canvas.width = scaledCropWidth;
      canvas.height = scaledCropHeight;

      // Clear the canvas and set proper quality
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw the cropped image
      ctx.drawImage(
        img,
        scaledCropX, scaledCropY, scaledCropWidth, scaledCropHeight,
        0, 0, canvas.width, canvas.height
      );
      
      // Convert canvas to blob with better compression
      canvas.toBlob((blob) => {
        if (blob) {
          // Clean up any previous URL
          if (croppedPreviewUrl) {
            URL.revokeObjectURL(croppedPreviewUrl);
          }
          
          // Create a new File from the blob
          const croppedFile = new File([blob], 'cover-cropped.jpg', {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          
          console.log(`✂️ Cropped image size: ${(croppedFile.size / 1024 / 1024).toFixed(2)}MB`);
          
          // Update state with new cropped image and URL
          setCroppedImage(croppedFile);
          const newUrl = URL.createObjectURL(croppedFile);
          setCroppedPreviewUrl(newUrl);
          
          // Notify parent if we have both original and cropped images
          if (originalImage) {
            onImageSelect(originalImage, croppedFile);
          }
        }
      }, 'image/jpeg', 0.85); // Reduced quality for smaller file size
    }
  }, [completedCrop, originalImage, croppedPreviewUrl, onImageSelect]);

  // Handle image load event to set initial crop
  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    
    // Create a centered crop with the desired aspect ratio
    setCrop(centerAspectCrop(width, height, aspectRatio));
  };

  // Smart compression utility function - only compresses when beneficial
  const smartCompressImage = (file: File, maxWidth = 1920, quality = 0.85): Promise<File> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        const { width, height } = img;
        
        // Check if compression is needed based on file size and dimensions
        const fileSizeMB = file.size / 1024 / 1024;
        const needsCompression = fileSizeMB > 1.5 || width > maxWidth;
        
        if (!needsCompression) {
          console.log(`✅ Image already optimized: ${fileSizeMB.toFixed(2)}MB, ${width}x${height}px - skipping compression`);
          resolve(file);
          return;
        }
        
        // Calculate new dimensions while maintaining aspect ratio
        let newWidth = width;
        let newHeight = height;
        
        if (width > maxWidth) {
          newHeight = (height * maxWidth) / width;
          newWidth = maxWidth;
        }
        
        // Set canvas dimensions
        canvas.width = newWidth;
        canvas.height = newHeight;
        
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }
        
        // Enable high-quality image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Draw compressed image to canvas
        ctx.drawImage(img, 0, 0, newWidth, newHeight);
        
        // Convert to blob with compression
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              
              const originalSizeMB = file.size / 1024 / 1024;
              const compressedSizeMB = compressedFile.size / 1024 / 1024;
              
              // Only use compressed version if it's significantly smaller
              if (compressedSizeMB < originalSizeMB * 0.8) {
                console.log(`🗜️ Image compressed: ${originalSizeMB.toFixed(2)}MB → ${compressedSizeMB.toFixed(2)}MB (${width}x${height} → ${newWidth}x${newHeight})`);
                resolve(compressedFile);
              } else {
                console.log(`↩️ Compression not beneficial: ${originalSizeMB.toFixed(2)}MB → ${compressedSizeMB.toFixed(2)}MB - using original`);
                resolve(file);
              }
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          'image/jpeg',
          quality
        );
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const validTypes = ['image/jpeg', 'image/png'];
    const maxSize = 10 * 1024 * 1024; // 10MB (original file size limit before compression)

    // Validate file type
    if (!validTypes.includes(file.type)) {
      setError("Bitte lade nur JPEG oder PNG Bilder hoch.");
      return;
    }

    // Validate file size (before compression)
    if (file.size > maxSize) {
      setError("Bilddatei überschreitet 10MB Limit. Bitte lade ein kleineres Bild hoch.");
      return;
    }

    try {
      setError("Bild wird verarbeitet...");
      
      // Smart compress the image (only if needed)
      const processedFile = await smartCompressImage(file, 1920, 0.85);
      
      // Clean up previous URLs
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      if (croppedPreviewUrl) {
        URL.revokeObjectURL(croppedPreviewUrl);
        setCroppedPreviewUrl(null);
      }
      
      // Create a new URL for the processed file
      const imageUrl = URL.createObjectURL(processedFile);
      setPreviewUrl(imageUrl);
      setOriginalImage(processedFile);
      setCroppedImage(null);
      setError(null);
      
      // Enter cropping mode
      setIsCropping(true);
      
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (compressionError) {
      console.error('Image compression failed:', compressionError);
      setError("Bildkomprimierung fehlgeschlagen. Bitte versuchen Sie es erneut.");
    }
  };

  const handleCropComplete = (crop: PixelCrop) => {
    setCompletedCrop(crop);
  };

  const handleFinishCropping = () => {
    // Only finish if we have a completed crop
    if (completedCrop && croppedImage) {
      setIsCropping(false);
    } else {
      setError("Bitte wählen Sie einen Bildausschnitt aus");
    }
  };

  const handleResetCrop = () => {
    // Re-enter cropping mode
    setIsCropping(true);
    
    // Reset the crop to center if we have an image
    if (imgRef.current) {
      const { width, height } = imgRef.current;
      setCrop(centerAspectCrop(width, height, aspectRatio));
    }
  };

  const handleRemoveImage = () => {
    setOriginalImage(null);
    setCroppedImage(null);
    setIsCropping(false);
    setCrop(undefined);
    setCompletedCrop(undefined);
    
    // Clean up URLs
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    
    if (croppedPreviewUrl) {
      URL.revokeObjectURL(croppedPreviewUrl);
      setCroppedPreviewUrl(null);
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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
        Cover-Bild hochladen (JPEG, PNG, max. 10MB)
      </Typography>

      <Paper variant="outlined" sx={{ p: 2 }}>
        {!originalImage && !hasInitialImages ? (
          <UploadBox onClick={handleUploadClick}>
            <CloudUploadIcon color="primary" sx={{ fontSize: 48, mb: 2 }} />
            <Typography variant="subtitle1" gutterBottom>
              Cover-Bild auswählen oder hierher ziehen
            </Typography>
            <Typography variant="body2" color="text.secondary">
              JPEG, PNG (max. 10MB) - wird bei Bedarf optimiert
            </Typography>
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              onChange={handleFileChange} 
              accept=".jpg,.jpeg,.png"
            />
          </UploadBox>
        ) : hasInitialImages && !originalImage ? (
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Aktuelles Cover-Bild (14:5)
            </Typography>
            <Box 
              sx={{ 
                mt: 2, 
                mb: 2, 
                maxWidth: '100%', 
                border: '1px solid #ddd',
                borderRadius: 1
              }}
            >
              {initialCroppedCoverImageUrl && (
                <img 
                  src={initialCroppedCoverImageUrl} 
                  alt="Aktuelles Cover-Bild"
                  style={{ 
                    width: '100%', 
                    maxHeight: '250px', 
                    objectFit: 'contain',
                    display: 'block'
                  }}
                />
              )}
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
              <Button
                variant="outlined"
                onClick={handleUploadClick}
                color="primary"
              >
                Bild austauschen
              </Button>
              <Button
                variant="outlined"
                color="error"
                onClick={() => {
                  setHasInitialImages(false);
                  setPreviewUrl(null);
                  setCroppedPreviewUrl(null);
                  setOriginalImage(null);
                  setCroppedImage(null);
                  // Notify parent that images were removed
                  if (onImageSelect) {
                    // Send nulls back to parent to indicate removal
                    onImageSelect(new Blob([''], { type: 'text/plain' }), new Blob([''], { type: 'text/plain' }));
                  }
                }}
              >
                Entfernen
              </Button>
            </Box>
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              onChange={handleFileChange} 
              accept=".jpg,.jpeg,.png"
            />
          </Box>
        ) : (
          <Box>
            {/* Hidden canvas for cropping */}
            <canvas
              ref={canvasRef}
              style={{ display: 'none' }}
            />
            
            {isCropping ? (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Bild auf 14:5 Seitenverhältnis zuschneiden
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={2}>
                  Wählen Sie den gewünschten Bildausschnitt durch Ziehen und Größenänderung des Rahmens.
                </Typography>
                
                <CropContainer>
                  {previewUrl && (
                    <ReactCrop
                      crop={crop}
                      onChange={(c) => setCrop(c)}
                      onComplete={handleCropComplete}
                      aspect={aspectRatio}
                      minWidth={100}
                    >
                      <img
                        ref={imgRef}
                        src={previewUrl}
                        alt="Bild zuschneiden"
                        style={{ 
                          maxWidth: '100%', 
                          maxHeight: '400px',
                          display: 'block' 
                        }}
                        onLoad={onImageLoad}
                      />
                    </ReactCrop>
                  )}
                </CropContainer>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                  <Button
                    color="error"
                    onClick={handleRemoveImage}
                    startIcon={<DeleteIcon />}
                  >
                    Entfernen
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleFinishCropping}
                    startIcon={<CropIcon />}
                    disabled={!completedCrop}
                  >
                    Zuschneiden abschließen
                  </Button>
                </Box>
                
                {error && (
                  <FormHelperText error sx={{ mt: 1 }}>
                    {error}
                  </FormHelperText>
                )}
              </Box>
            ) : (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Zugeschnittenes Cover-Bild (14:5)
                </Typography>
                <Box 
                  sx={{ 
                    mt: 2, 
                    mb: 2, 
                    maxWidth: '100%', 
                    border: '1px solid #ddd',
                    borderRadius: 1
                  }}
                >
                  {croppedPreviewUrl && (
                    <img 
                      src={croppedPreviewUrl} 
                      alt="Zugeschnittenes Bild"
                      style={{ 
                        width: '100%', 
                        maxHeight: '250px', 
                        objectFit: 'contain',
                        display: 'block'
                      }}
                    />
                  )}
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Button
                    color="error"
                    onClick={handleRemoveImage}
                    startIcon={<DeleteIcon />}
                  >
                    Entfernen
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={handleResetCrop}
                    startIcon={<RestartAltIcon />}
                  >
                    Neu zuschneiden
                  </Button>
                </Box>
              </Box>
            )}
          </Box>
        )}

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
          Optimales Seitenverhältnis für den Newsletter ist 14:5
        </Typography>
      </Paper>
    </Box>
  );
};

export default CoverImageUpload;