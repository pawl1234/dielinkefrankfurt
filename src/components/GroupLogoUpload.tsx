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

interface GroupLogoUploadProps {
  onImageSelect: (originalImage: File | Blob, croppedImage: File | Blob) => void;
  aspectRatio?: number;
  initialLogoUrl?: string;
  initialCroppedLogoUrl?: string;
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

const GroupLogoUpload = ({ 
  onImageSelect, 
  aspectRatio = 1, // Default to square logos
  initialLogoUrl,
  initialCroppedLogoUrl 
}: GroupLogoUploadProps) => {
  const [originalImage, setOriginalImage] = useState<File | Blob | null>(null);
  const [croppedImage, setCroppedImage] = useState<File | Blob | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialLogoUrl || null);
  const [croppedPreviewUrl, setCroppedPreviewUrl] = useState<string | null>(initialCroppedLogoUrl || null);
  const [error, setError] = useState<string | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [hasInitialImages, setHasInitialImages] = useState(!!initialCroppedLogoUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Handle initial URLs if provided
  useEffect(() => {
    if (initialLogoUrl && initialCroppedLogoUrl) {
      setHasInitialImages(true);
      setPreviewUrl(initialLogoUrl);
      setCroppedPreviewUrl(initialCroppedLogoUrl);
    }
  }, [initialLogoUrl, initialCroppedLogoUrl]);

  // Clean up URLs when component unmounts
  useEffect(() => {
    return () => {
      // Only revoke URLs that we created, not initial URLs from props
      if (previewUrl && previewUrl !== initialLogoUrl) URL.revokeObjectURL(previewUrl);
      if (croppedPreviewUrl && croppedPreviewUrl !== initialCroppedLogoUrl) URL.revokeObjectURL(croppedPreviewUrl);
    };
  }, [previewUrl, croppedPreviewUrl, initialLogoUrl, initialCroppedLogoUrl]);

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
      
      // Convert canvas to blob
      canvas.toBlob((blob) => {
        if (blob) {
          // Clean up any previous URL
          if (croppedPreviewUrl && croppedPreviewUrl !== initialCroppedLogoUrl) {
            URL.revokeObjectURL(croppedPreviewUrl);
          }
          
          // Create a new File from the blob
          const croppedFile = new File([blob], 'logo-cropped.jpg', {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          
          // Update state with new cropped image and URL
          setCroppedImage(croppedFile);
          const newUrl = URL.createObjectURL(croppedFile);
          setCroppedPreviewUrl(newUrl);
          
          // Notify parent if we have both original and cropped images
          if (originalImage) {
            onImageSelect(originalImage, croppedFile);
          }
        }
      }, 'image/jpeg', 0.95);
    }
  }, [completedCrop, originalImage, croppedPreviewUrl, onImageSelect, initialCroppedLogoUrl]);

  // Handle image load event to set initial crop
  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    
    // Create a centered crop with the desired aspect ratio
    setCrop(centerAspectCrop(width, height, aspectRatio));
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
    const maxSize = 2 * 1024 * 1024; // 2MB for logos

    // Validate file type
    if (!validTypes.includes(file.type)) {
      setError("Bitte lade nur JPEG, PNG oder GIF Bilder hoch.");
      return;
    }

    // Validate file size
    if (file.size > maxSize) {
      setError("Bilddatei überschreitet 2MB Limit. Bitte lade ein kleineres Bild hoch.");
      return;
    }

    // Clean up previous URLs
    if (previewUrl && previewUrl !== initialLogoUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    if (croppedPreviewUrl && croppedPreviewUrl !== initialCroppedLogoUrl) {
      URL.revokeObjectURL(croppedPreviewUrl);
      setCroppedPreviewUrl(null);
    }
    
    // Create a new URL for the file
    const imageUrl = URL.createObjectURL(file);
    setPreviewUrl(imageUrl);
    setOriginalImage(file);
    setCroppedImage(null);
    setError(null);
    
    // Enter cropping mode
    setIsCropping(true);
    
    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
    if (previewUrl && previewUrl !== initialLogoUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    
    if (croppedPreviewUrl && croppedPreviewUrl !== initialCroppedLogoUrl) {
      URL.revokeObjectURL(croppedPreviewUrl);
      setCroppedPreviewUrl(null);
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    // Notify parent that images were removed
    // Send empty blobs to signal removal
    onImageSelect(new Blob([''], { type: 'text/plain' }), new Blob([''], { type: 'text/plain' }));
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
        Gruppen-Logo hochladen (JPEG, PNG, GIF, max. 2MB)
      </Typography>

      <Paper variant="outlined" sx={{ p: 2 }}>
        {!originalImage && !hasInitialImages ? (
          <UploadBox onClick={handleUploadClick}>
            <CloudUploadIcon color="primary" sx={{ fontSize: 48, mb: 2 }} />
            <Typography variant="subtitle1" gutterBottom>
              Logo auswählen oder hierher ziehen
            </Typography>
            <Typography variant="body2" color="text.secondary">
              JPEG, PNG, GIF (max. 2MB)
            </Typography>
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              onChange={handleFileChange} 
              accept=".jpg,.jpeg,.png,.gif"
            />
          </UploadBox>
        ) : hasInitialImages && !originalImage ? (
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Aktuelles Gruppen-Logo
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
              {initialCroppedLogoUrl && (
                <img 
                  src={initialCroppedLogoUrl} 
                  alt="Aktuelles Logo"
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
                Logo austauschen
              </Button>
              <Button
                variant="outlined"
                color="error"
                onClick={handleRemoveImage}
              >
                Entfernen
              </Button>
            </Box>
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              onChange={handleFileChange} 
              accept=".jpg,.jpeg,.png,.gif"
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
                  Logo zuschneiden
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
                        alt="Logo zuschneiden"
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
                  Zugeschnittenes Logo
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
                      alt="Zugeschnittenes Logo"
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
      </Paper>
    </Box>
  );
};

export default GroupLogoUpload;