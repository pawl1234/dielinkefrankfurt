'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import {
  Box,
  Button,
  Typography,
  Paper,
  FormHelperText,
  styled,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CropIcon from '@mui/icons-material/Crop';
import DeleteIcon from '@mui/icons-material/Delete';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { compressImage } from '@/lib/image-compression';
import { UploadBox } from '@/components/ui/UploadBox';

/**
 * JPEG compression quality constant
 * 0.75 provides excellent quality while significantly reducing file size
 * You can adjust this value between 0.0 (worst) and 1.0 (best)
 */
const JPEG_COMPRESSION_QUALITY = 0.75;

interface ImageCropUploadProps {
  /** Callback when images are selected/cropped */
  onImageSelect: (originalImage: File | Blob | null, croppedImage: File | Blob | null) => void;
  /** Maximum file size in bytes for input file (before cropping) */
  maxInputFileSize: number;
  /** Maximum file size in bytes for cropped output file */
  maxOutputFileSize: number;
  /** Allowed file types for upload (MIME types array) */
  allowedFileTypes: string[];
  /** Aspect ratio for cropping (width/height), e.g., 1 for square, 16/9 for landscape */
  aspectRatio?: number;
  /** Initial URL for the original image (edit mode) */
  initialImageUrl?: string | null;
  /** Initial URL for the cropped image (edit mode) */
  initialCroppedImageUrl?: string | null;
  /** Label for the upload section */
  uploadLabel?: string;
  /** Description text shown during upload */
  uploadDescription?: string;
  /** Label for the cropped image preview */
  croppedImageLabel?: string;
  /** Text describing the aspect ratio */
  aspectRatioText?: string;
}

const CropContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  marginTop: theme.spacing(2),
  marginBottom: theme.spacing(2),
}));

/**
 * Helper function to create centered aspect crop
 */
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
  );
}

/**
 * Shared image crop upload component
 *
 * Provides a consistent interface for uploading and cropping images across the application.
 * Based on the working GroupLogoUpload component with improvements and configurability.
 *
 * @example
 * ```tsx
 * <ImageCropUpload
 *   aspectRatio={14/5}
 *   maxInputFileSize={FILE_SIZE_LIMITS.COVER_IMAGE}
 *   onImageSelect={(original, cropped) => {
 *     // Handle image selection
 *   }}
 * />
 * ```
 */
const ImageCropUpload = ({
  onImageSelect,
  maxInputFileSize,
  maxOutputFileSize: _maxOutputFileSize,
  allowedFileTypes,
  aspectRatio = 1,
  initialImageUrl = null,
  initialCroppedImageUrl = null,
  uploadLabel = 'Bild hochladen',
  uploadDescription = 'JPEG, PNG, GIF',
  croppedImageLabel = 'Zugeschnittenes Bild',
  aspectRatioText = ''
}: ImageCropUploadProps) => {
  const [originalImage, setOriginalImage] = useState<File | Blob | null>(null);
  const [croppedImage, setCroppedImage] = useState<File | Blob | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialImageUrl);
  const [croppedPreviewUrl, setCroppedPreviewUrl] = useState<string | null>(initialCroppedImageUrl);
  const [error, setError] = useState<string | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [hasInitialImages, setHasInitialImages] = useState(!!initialCroppedImageUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Handle initial URLs if provided
  useEffect(() => {
    if (initialImageUrl && initialCroppedImageUrl) {
      setHasInitialImages(true);
      setPreviewUrl(initialImageUrl);
      setCroppedPreviewUrl(initialCroppedImageUrl);
    }
  }, [initialImageUrl, initialCroppedImageUrl]);

  // Clean up URLs when component unmounts
  useEffect(() => {
    return () => {
      // Only revoke URLs that we created, not initial URLs from props
      if (previewUrl && previewUrl !== initialImageUrl) URL.revokeObjectURL(previewUrl);
      if (croppedPreviewUrl && croppedPreviewUrl !== initialCroppedImageUrl) URL.revokeObjectURL(croppedPreviewUrl);
    };
  }, [previewUrl, croppedPreviewUrl, initialImageUrl, initialCroppedImageUrl]);

  /**
   * Create a cropped version of the image when crop changes
   * This effect is triggered whenever the user completes a crop operation
   */
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

      // Convert canvas to blob with configured compression quality
      // No client-side size validation - relies on Zod + RHF
      canvas.toBlob((blob) => {
        if (blob) {
          // Clean up previous cropped preview URL
          if (croppedPreviewUrl && croppedPreviewUrl !== initialCroppedImageUrl) {
            URL.revokeObjectURL(croppedPreviewUrl);
          }

          // Create a new File from the blob
          const croppedFile = new File([blob], 'image-cropped.jpg', {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });

          console.log(`✂️ Image cropped successfully: ${(croppedFile.size / 1024).toFixed(1)}KB`);

          // Update state with new cropped image and URL
          setCroppedImage(croppedFile);
          const newUrl = URL.createObjectURL(croppedFile);
          setCroppedPreviewUrl(newUrl);
          setError(null);

          // Notify parent with both original and cropped images
          if (originalImage) {
            onImageSelect(originalImage, croppedFile);
          }
        }
      }, 'image/jpeg', JPEG_COMPRESSION_QUALITY);
    }
  }, [completedCrop, originalImage, croppedPreviewUrl, onImageSelect, initialCroppedImageUrl]);

  /**
   * Handle image load event to set initial crop
   */
  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;

    // Create a centered crop with the desired aspect ratio
    setCrop(centerAspectCrop(width, height, aspectRatio));
  };

  /**
   * Handle file selection from input
   * No client-side validation - relies on Zod + RHF for all validation
   */
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    // Clean up previous URLs
    if (previewUrl && previewUrl !== initialImageUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    if (croppedPreviewUrl && croppedPreviewUrl !== initialCroppedImageUrl) {
      URL.revokeObjectURL(croppedPreviewUrl);
      setCroppedPreviewUrl(null);
    }

    // Compress original image before setting preview
    const compressedOriginal = await compressImage(file, 2000, 0.75);

    // Create a new URL for the compressed file
    const imageUrl = URL.createObjectURL(compressedOriginal);
    setPreviewUrl(imageUrl);
    setOriginalImage(compressedOriginal);
    setCroppedImage(null);
    setError(null);

    // Update form immediately so RHF can validate
    onImageSelect(compressedOriginal, null);

    // Enter cropping mode
    setIsCropping(true);

    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /**
   * Handle crop completion
   */
  const handleCropComplete = (crop: PixelCrop) => {
    setCompletedCrop(crop);
  };

  /**
   * Finish cropping and show preview
   */
  const handleFinishCropping = () => {
    // Only finish if we have a completed crop
    if (completedCrop && croppedImage) {
      setIsCropping(false);
    } else {
      setError("Bitte wählen Sie einen Bildausschnitt aus");
    }
  };

  /**
   * Re-enter cropping mode to adjust the crop
   */
  const handleResetCrop = () => {
    // Re-enter cropping mode
    setIsCropping(true);

    // Reset the crop to center if we have an image
    if (imgRef.current) {
      const { width, height } = imgRef.current;
      setCrop(centerAspectCrop(width, height, aspectRatio));
    }
  };

  /**
   * Remove the image and reset state
   */
  const handleRemoveImage = () => {
    setOriginalImage(null);
    setCroppedImage(null);
    setIsCropping(false);
    setCrop(undefined);
    setCompletedCrop(undefined);

    // Clean up URLs
    if (previewUrl && previewUrl !== initialImageUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }

    if (croppedPreviewUrl && croppedPreviewUrl !== initialCroppedImageUrl) {
      URL.revokeObjectURL(croppedPreviewUrl);
      setCroppedPreviewUrl(null);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // Notify parent that images were removed
    // Send empty blobs to signal removal
    onImageSelect(null, null);
  };

  /**
   * Trigger file input click
   */
  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Generate accept string for file input
  const acceptString = allowedFileTypes.map(type => {
    const ext = type.split('/')[1];
    return `.${ext}`;
  }).join(',');

  // Calculate max size in MB for display
  const maxInputSizeMB = (maxInputFileSize / (1024 * 1024)).toFixed(0);

  return (
    <Box sx={{ mb: 3 }}>
      <Typography
        variant="subtitle1"
        component="label"
        sx={{ display: 'block', mb: 1, fontWeight: 600 }}
      >
        {uploadLabel}
      </Typography>

      <Paper variant="outlined" sx={{ p: 2 }}>
        {!originalImage && !hasInitialImages ? (
          // Upload state - no image selected yet
          <UploadBox onClick={handleUploadClick}>
            <CloudUploadIcon color="primary" sx={{ fontSize: 48, mb: 2 }} />
            <Typography variant="subtitle1" gutterBottom>
              Bild auswählen oder hierher ziehen
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {uploadDescription} (max. {maxInputSizeMB}MB)
            </Typography>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleFileChange}
              accept={acceptString}
            />
          </UploadBox>
        ) : hasInitialImages && !originalImage ? (
          // Edit state - showing initial images
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              {croppedImageLabel}
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
              {initialCroppedImageUrl && (
                <Image
                  src={initialCroppedImageUrl}
                  alt={croppedImageLabel}
                  width={400}
                  height={250}
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
              accept={acceptString}
            />
          </Box>
        ) : (
          // Crop/preview state - image has been selected
          <Box>
            {/* Hidden canvas for cropping */}
            <canvas
              ref={canvasRef}
              style={{ display: 'none' }}
            />

            {isCropping ? (
              // Cropping mode
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Bild zuschneiden {aspectRatioText && `(${aspectRatioText})`}
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
                      {/* eslint-disable-next-line @next/next/no-img-element */}
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
              // Preview mode - crop completed
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  {croppedImageLabel}
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
                    <Image
                      src={croppedPreviewUrl}
                      alt={croppedImageLabel}
                      width={400}
                      height={250}
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

        {aspectRatioText && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
            {aspectRatioText}
          </Typography>
        )}
      </Paper>
    </Box>
  );
};

export default ImageCropUpload;
