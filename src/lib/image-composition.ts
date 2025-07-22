import sharp from 'sharp';
import { put } from '@vercel/blob';
import crypto from 'crypto';
import { CompositeGenerationRequest } from '@/types/api-types';
import { AppError, ErrorType } from './errors';
import { logger } from './logger';

/**
 * Image composition error class for specific image processing errors
 */
export class ImageCompositionError extends AppError {
  public readonly imageUrl?: string;
  public readonly step?: 'fetch' | 'process' | 'upload';

  constructor(
    message: string,
    originalError?: Error,
    context?: { imageUrl?: string; step?: 'fetch' | 'process' | 'upload'; [key: string]: unknown }
  ) {
    super(message, ErrorType.FILE_UPLOAD, 500, originalError, context);
    this.name = 'ImageCompositionError';
    this.imageUrl = context?.imageUrl;
    this.step = context?.step;
  }
}

/**
 * Header composition service for generating composite newsletter header images
 * Combines banner and logo images into a single image for better email client compatibility
 */
export class HeaderCompositionService {
  /**
   * Generates composite header image by overlaying logo on banner.
   * 
   * @param options - Composition configuration
   * @returns URL of generated composite image
   */
  async generateCompositeHeader(options: CompositeGenerationRequest): Promise<string> {
    logger.debug('Starting composite header generation', {
      module: 'imageComposition',
      context: {
        bannerUrl: options.bannerUrl,
        logoUrl: options.logoUrl,
        dimensions: `${options.compositeWidth}x${options.compositeHeight}`,
        logoPosition: `${options.logoLeftOffset},${options.logoTopOffset}`,
        logoHeight: options.logoHeight
      }
    });

    // Validate the composition request
    this.validateCompositionRequest(options);
    
    // Generate cache key based on all composition parameters
    const cacheKey = await this.getCacheKey(options);
    logger.debug('Generated cache key', {
      module: 'imageComposition',
      context: { cacheKey: cacheKey.slice(0, 16) + '...' }
    });
    
    // Check if we have a cached version
    const existingUrl = await this.checkCache(cacheKey);
    if (existingUrl) {
      logger.info('Using cached composite image', {
        module: 'imageComposition',
        context: { cacheKey: cacheKey.slice(0, 16) + '...', url: existingUrl }
      });
      return existingUrl;
    }
    
    try {
      // Fetch both images as buffers for Sharp processing
      logger.debug('Fetching source images', {
        module: 'imageComposition',
        context: { bannerUrl: options.bannerUrl, logoUrl: options.logoUrl }
      });

      const [bannerBuffer, logoBuffer] = await Promise.all([
        this.fetchImageBuffer(options.bannerUrl),
        this.fetchImageBuffer(options.logoUrl)
      ]);
      
      logger.debug('Successfully fetched source images', {
        module: 'imageComposition',
        context: {
          bannerSize: bannerBuffer.length,
          logoSize: logoBuffer.length
        }
      });
      
      // Process the logo to the desired height while maintaining aspect ratio
      const resizedLogoBuffer = await sharp(logoBuffer)
        .resize({ height: options.logoHeight, withoutEnlargement: true })
        .toBuffer();
      
      // Create composite image using Sharp
      const compositeBuffer = await sharp(bannerBuffer)
        .resize(options.compositeWidth, options.compositeHeight, { 
          fit: 'cover',
          position: 'center'
        })
        .composite([{
          input: resizedLogoBuffer,
          top: options.logoTopOffset,
          left: options.logoLeftOffset
        }])
        .jpeg({ 
          quality: 90, 
          progressive: true,
          mozjpeg: true
        })
        .toBuffer();
        
      logger.debug('Successfully created composite image', {
        module: 'imageComposition',
        context: {
          compositeSize: compositeBuffer.length,
          dimensions: `${options.compositeWidth}x${options.compositeHeight}`
        }
      });
      
      // Upload to blob storage with full cache key to ensure uniqueness
      const filename = `newsletter-headers/composite-${cacheKey}.jpg`;
      const compositeUrl = await this.uploadToBlob(compositeBuffer, filename);
      
      // Update cache with the new URL
      await this.updateCache(cacheKey, compositeUrl);
      
      logger.info('Successfully generated composite header image', {
        module: 'imageComposition',
        context: {
          cacheKey: cacheKey.slice(0, 16) + '...',
          url: compositeUrl,
          fileSize: compositeBuffer.length
        }
      });
      
      return compositeUrl;
    } catch (error) {
      logger.error(error as Error, {
        module: 'imageComposition',
        context: {
          operation: 'generateCompositeHeader',
          options,
          cacheKey: cacheKey.slice(0, 16) + '...'
        }
      });

      throw new ImageCompositionError(
        'Failed to generate composite header image',
        error as Error,
        { options, cacheKey }
      );
    }
  }
  
  /**
   * Validates the composition request parameters.
   * 
   * @param options - Composition configuration to validate
   */
  private validateCompositionRequest(options: CompositeGenerationRequest): void {
    if (!options.bannerUrl || typeof options.bannerUrl !== 'string') {
      throw AppError.validation('Banner URL is required and must be a valid string');
    }
    
    if (!options.logoUrl || typeof options.logoUrl !== 'string') {
      throw AppError.validation('Logo URL is required and must be a valid string');
    }
    
    // Validate dimensions
    if (!Number.isInteger(options.compositeWidth) || options.compositeWidth <= 0 || options.compositeWidth > 2000) {
      throw AppError.validation('Composite width must be a positive integer between 1 and 2000 pixels');
    }
    
    if (!Number.isInteger(options.compositeHeight) || options.compositeHeight <= 0 || options.compositeHeight > 2000) {
      throw AppError.validation('Composite height must be a positive integer between 1 and 2000 pixels');
    }
    
    if (!Number.isInteger(options.logoHeight) || options.logoHeight <= 0 || options.logoHeight > options.compositeHeight) {
      throw AppError.validation('Logo height must be a positive integer not exceeding composite height');
    }
    
    // Validate positioning (can be 0 or positive, within bounds)
    if (!Number.isInteger(options.logoTopOffset) || options.logoTopOffset < 0 || options.logoTopOffset >= options.compositeHeight) {
      throw AppError.validation('Logo top offset must be a non-negative integer within composite height bounds');
    }
    
    if (!Number.isInteger(options.logoLeftOffset) || options.logoLeftOffset < 0 || options.logoLeftOffset >= options.compositeWidth) {
      throw AppError.validation('Logo left offset must be a non-negative integer within composite width bounds');
    }
    
    // Validate URLs format
    try {
      new URL(options.bannerUrl);
      new URL(options.logoUrl);
    } catch {
      throw AppError.validation('Banner and logo URLs must be valid URLs');
    }
  }
  
  /**
   * Fetches an image from URL and returns it as a Buffer for Sharp processing.
   * 
   * @param imageUrl - URL of the image to fetch
   * @returns Buffer containing the image data
   */
  private async fetchImageBuffer(imageUrl: string): Promise<Buffer> {
    try {
      logger.debug('Fetching image', {
        module: 'imageComposition',
        context: { imageUrl }
      });

      // Create timeout signal for older Node.js versions compatibility
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const response = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'DieLinke-Newsletter-Compositor/1.0'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      // Validate content type
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.startsWith('image/')) {
        throw new Error(`Invalid content type: ${contentType}. Expected image/*`);
      }
      
      // Check content length if available
      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) { // 10MB limit
        throw new Error('Image file too large (> 10MB)');
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Additional size check after download
      if (buffer.length > 10 * 1024 * 1024) {
        throw new Error('Image file too large (> 10MB)');
      }
      
      logger.debug('Successfully fetched image', {
        module: 'imageComposition',
        context: {
          imageUrl,
          size: buffer.length,
          contentType
        }
      });
      
      return buffer;
    } catch (error) {
      logger.error(error as Error, {
        module: 'imageComposition',
        context: {
          operation: 'fetchImageBuffer',
          imageUrl
        }
      });

      throw new ImageCompositionError(
        `Failed to fetch image from ${imageUrl}`,
        error as Error,
        { imageUrl, step: 'fetch' }
      );
    }
  }
  
  /**
   * Uploads a buffer to Vercel Blob Storage.
   * 
   * @param buffer - Image buffer to upload
   * @param filename - Filename for the blob
   * @returns URL of the uploaded image
   */
  private async uploadToBlob(buffer: Buffer, filename: string): Promise<string> {
    try {
      logger.debug('Uploading composite to blob storage', {
        module: 'imageComposition',
        context: {
          filename,
          size: buffer.length
        }
      });

      const { url } = await put(filename, buffer, {
        access: 'public',
        contentType: 'image/jpeg',
        addRandomSuffix: false,
        cacheControlMaxAge: 31536000, // Cache for 1 year
      });
      
      logger.debug('Successfully uploaded to blob storage', {
        module: 'imageComposition',
        context: { 
          filename, 
          url
        }
      });
      
      return url;
    } catch (error) {
      logger.error(error as Error, {
        module: 'imageComposition',
        context: {
          operation: 'uploadToBlob',
          filename,
          bufferSize: buffer.length
        }
      });

      throw new ImageCompositionError(
        'Failed to upload composite image to storage',
        error as Error,
        { filename, step: 'upload' }
      );
    }
  }
  
  /**
   * Generates a stable cache key from composition options.
   * Includes hashes of the source images to detect changes.
   * 
   * @param options - Composition configuration
   * @returns Cache key string
   */
  private async getCacheKey(options: CompositeGenerationRequest): Promise<string> {
    try {
      // Get hashes of source images for cache invalidation
      const [bannerHash, logoHash] = await Promise.all([
        this.getImageHash(options.bannerUrl),
        this.getImageHash(options.logoUrl)
      ]);
      
      // Create a stable hash of all composition parameters
      const configHash = crypto.createHash('sha256')
        .update(JSON.stringify({
          bannerHash,
          logoHash,
          width: options.compositeWidth,
          height: options.compositeHeight,
          logoTop: options.logoTopOffset,
          logoLeft: options.logoLeftOffset,
          logoHeight: options.logoHeight
        }, null, 0))
        .digest('hex');
        
      return configHash;
    } catch (error) {
      logger.error(error as Error, {
        module: 'imageComposition',
        context: {
          operation: 'getCacheKey',
          bannerUrl: options.bannerUrl,
          logoUrl: options.logoUrl
        }
      });

      // If we can't generate cache key, return a simple hash of the options
      // This ensures the function doesn't fail completely
      return crypto.createHash('sha256')
        .update(JSON.stringify(options, null, 0))
        .digest('hex');
    }
  }
  
  /**
   * Gets a hash of an image at the given URL for cache invalidation.
   * 
   * @param imageUrl - URL of the image
   * @returns Hash string representing the image content
   */
  private async getImageHash(imageUrl: string): Promise<string> {
    try {
      // For now, we'll use the URL as the hash since fetching images just for hashing
      // would be expensive. In a production system, we might want to use ETags or
      // Last-Modified headers from a HEAD request.
      const hash = crypto.createHash('sha256')
        .update(imageUrl)
        .digest('hex');
        
      return hash;
    } catch (error) {
      logger.warn('Failed to generate image hash, using URL as fallback', {
        module: 'imageComposition',
        context: { imageUrl, error: (error as Error).message }
      });

      // Fallback to URL-based hash
      return crypto.createHash('sha256')
        .update(imageUrl)
        .digest('hex');
    }
  }
  
  /**
   * Checks if a cached composite exists for the given cache key.
   * For now, this is a simple implementation that always returns null,
   * meaning we'll regenerate composites each time. In a production system,
   * this could be enhanced with Redis or database caching.
   * 
   * @param cacheKey - Cache key to check
   * @returns URL of cached composite or null if not found
   */
  private async checkCache(cacheKey: string): Promise<string | null> {
    // TODO: Implement actual caching mechanism (Redis, database, or file system)
    // For now, we'll regenerate each time to ensure freshness
    logger.debug('Cache check (not implemented)', {
      module: 'imageComposition',
      context: { cacheKey: cacheKey.slice(0, 16) + '...' }
    });
    
    return null;
  }
  
  /**
   * Updates the cache with a generated composite URL.
   * For now, this is a no-op. In a production system,
   * this would store the mapping in Redis or database.
   * 
   * @param cacheKey - Cache key
   * @param compositeUrl - URL of the generated composite
   */
  private async updateCache(cacheKey: string, compositeUrl: string): Promise<void> {
    // TODO: Implement actual caching mechanism
    logger.debug('Cache update (not implemented)', {
      module: 'imageComposition',
      context: {
        cacheKey: cacheKey.slice(0, 16) + '...',
        compositeUrl
      }
    });
  }

  /**
   * Public method to get cache key for external use (e.g., API responses)
   * 
   * @param options - Composition configuration
   * @returns Cache key string
   */
  async getPublicCacheKey(options: CompositeGenerationRequest): Promise<string> {
    return this.getCacheKey(options);
  }
}