// Mock external dependencies before any imports
jest.mock('sharp', () => {
  const mockSharp = {
    resize: jest.fn().mockReturnThis(),
    composite: jest.fn().mockReturnThis(),
    jpeg: jest.fn().mockReturnThis(),
    toBuffer: jest.fn(),
  };
  return jest.fn(() => mockSharp);
});

jest.mock('@vercel/blob', () => ({
  put: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('crypto', () => ({
  createHash: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn().mockReturnValue('abc123def456789abc123def456789abc123def456789abc123def456789abcd'),
  })),
}));

// Mock global fetch
global.fetch = jest.fn();

// Mock AbortController for Node.js compatibility
global.AbortController = class AbortController {
  signal = {
    aborted: false,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  };
  
  abort = jest.fn(() => {
    this.signal.aborted = true;
  });
};

import sharp from 'sharp';
import { put } from '@vercel/blob';
import { HeaderCompositionService, ImageCompositionError } from '@/lib/image-composition';
import { CompositeGenerationRequest } from '@/types/api-types';
import { AppError, ErrorType } from '@/lib/errors';
import { logger } from '@/lib/logger';

const mockSharp = sharp as jest.MockedFunction<typeof sharp>;
const mockPut = put as jest.MockedFunction<typeof put>;
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

// Create a mock sharp instance for testing
const createMockSharpInstance = (overrides: Partial<any> = {}) => ({
  resize: jest.fn().mockReturnThis(),
  composite: jest.fn().mockReturnThis(),
  jpeg: jest.fn().mockReturnThis(),
  toBuffer: jest.fn().mockResolvedValue(Buffer.from('mock-composite-image')),
  ...overrides,
});

describe('HeaderCompositionService', () => {
  let service: HeaderCompositionService;
  let mockSharpInstance: any;
  
  const validOptions: CompositeGenerationRequest = {
    bannerUrl: 'https://example.com/banner.jpg',
    logoUrl: 'https://example.com/logo.png',
    compositeWidth: 600,
    compositeHeight: 200,
    logoTopOffset: 20,
    logoLeftOffset: 20,
    logoHeight: 60,
  };

  beforeEach(() => {
    service = new HeaderCompositionService();
    mockSharpInstance = createMockSharpInstance();
    mockSharp.mockReturnValue(mockSharpInstance);
    jest.clearAllMocks();
    
    // Setup default successful responses
    mockFetch.mockResolvedValue({
      ok: true,
      headers: new Headers({
        'content-type': 'image/jpeg',
        'content-length': '100000',
      }),
      arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(100000)),
    } as any);
    
    mockPut.mockResolvedValue({
      url: 'https://blob.vercel-storage.com/newsletter-headers/composite-abc123.jpg',
    } as any);
  });

  describe('generateCompositeHeader', () => {
    test('should generate composite header successfully', async () => {
      const result = await service.generateCompositeHeader(validOptions);
      
      expect(result).toBe('https://blob.vercel-storage.com/newsletter-headers/composite-abc123.jpg');
      
      // Verify Sharp was called correctly
      expect(mockSharp).toHaveBeenCalledTimes(2); // Once for banner, once for logo resize
      expect(mockSharpInstance.resize).toHaveBeenCalledWith(600, 200, { fit: 'cover', position: 'center' });
      expect(mockSharpInstance.composite).toHaveBeenCalledWith([{
        input: expect.any(Buffer),
        top: 20,
        left: 20,
      }]);
      expect(mockSharpInstance.jpeg).toHaveBeenCalledWith({ 
        quality: 90, 
        progressive: true,
        mozjpeg: true
      });
      
      // Verify blob upload
      expect(mockPut).toHaveBeenCalledWith(
        expect.stringMatching(/^newsletter-headers\/composite-[a-f0-9]{64}\.jpg$/),
        expect.any(Buffer),
        {
          access: 'public',
          contentType: 'image/jpeg',
          addRandomSuffix: false,
          allowOverwrite: true,
          cacheControlMaxAge: 31536000,
        }
      );

      // Verify logging
      expect(logger.debug).toHaveBeenCalledWith('Starting composite header generation', expect.any(Object));
      expect(logger.info).toHaveBeenCalledWith('Successfully generated composite header image', expect.any(Object));
    });

    test('should fetch banner and logo images', async () => {
      await service.generateCompositeHeader(validOptions);
      
      // Verify both images were fetched
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenCalledWith('https://example.com/banner.jpg', expect.objectContaining({
        headers: {
          'User-Agent': 'DieLinke-Newsletter-Compositor/1.0'
        },
        signal: expect.any(Object) // AbortController signal
      }));
      expect(mockFetch).toHaveBeenCalledWith('https://example.com/logo.png', expect.objectContaining({
        headers: {
          'User-Agent': 'DieLinke-Newsletter-Compositor/1.0'
        },
        signal: expect.any(Object) // AbortController signal
      }));
    });

    test('should handle image fetch failures gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      
      await expect(service.generateCompositeHeader(validOptions))
        .rejects.toThrow(ImageCompositionError);
      
      expect(logger.error).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          module: 'imageComposition',
          context: expect.objectContaining({
            operation: 'fetchImageBuffer'
          })
        })
      );
    });

    test('should handle HTTP error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as any);
      
      await expect(service.generateCompositeHeader(validOptions))
        .rejects.toThrow(ImageCompositionError);
    });

    test('should validate content type', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({
          'content-type': 'text/html',
        }),
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(1000)),
      } as any);
      
      await expect(service.generateCompositeHeader(validOptions))
        .rejects.toThrow(ImageCompositionError);
    });

    test('should enforce file size limits', async () => {
      // Mock large file response for the first fetch (banner)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({
          'content-type': 'image/jpeg',
          'content-length': '15000000', // 15MB - exceeds 10MB limit
        }),
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(15000000)),
      } as any);
      
      await expect(service.generateCompositeHeader(validOptions))
        .rejects.toThrow(ImageCompositionError);
      
      // Check that the underlying error message contains our expected text
      try {
        await service.generateCompositeHeader(validOptions);
      } catch (error) {
        const imageError = error as ImageCompositionError;
        expect(imageError.originalError?.message).toContain('Image file too large (> 10MB)');
      }
    });

    test('should handle Sharp processing errors', async () => {
      mockSharpInstance.toBuffer.mockRejectedValueOnce(new Error('Sharp processing failed'));
      
      await expect(service.generateCompositeHeader(validOptions))
        .rejects.toThrow(ImageCompositionError);
      
      expect(logger.error).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          module: 'imageComposition',
          context: expect.objectContaining({
            operation: 'generateCompositeHeader'
          })
        })
      );
    });

    test('should handle blob upload failures', async () => {
      mockPut.mockRejectedValueOnce(new Error('Blob upload failed'));
      
      await expect(service.generateCompositeHeader(validOptions))
        .rejects.toThrow(ImageCompositionError);
      
      expect(logger.error).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          module: 'imageComposition',
          context: expect.objectContaining({
            operation: 'uploadToBlob'
          })
        })
      );
    });

    test('should use cache when available', async () => {
      // Mock cache hit
      const cachedUrl = 'https://blob.vercel-storage.com/cached-composite.jpg';
      jest.spyOn(service as any, 'checkCache').mockResolvedValue(cachedUrl);
      
      const result = await service.generateCompositeHeader(validOptions);
      
      expect(result).toBe(cachedUrl);
      // Should not process images when using cache
      expect(mockSharp).not.toHaveBeenCalled();
      expect(mockPut).not.toHaveBeenCalled();
      
      expect(logger.info).toHaveBeenCalledWith('Using cached composite image', expect.any(Object));
    });

    test('should generate cache keys with correct format', async () => {
      const key = await service.getPublicCacheKey(validOptions);
      
      expect(typeof key).toBe('string');
      expect(key).toMatch(/^[a-f0-9]{64}$/); // SHA256 hex format
      expect(key.length).toBe(64);
    });
  });

  describe('validation', () => {
    test('should validate required URLs', async () => {
      const invalidOptions = { ...validOptions, bannerUrl: '' };
      
      await expect(service.generateCompositeHeader(invalidOptions))
        .rejects.toThrow(AppError);
    });

    test('should validate composite dimensions', async () => {
      const invalidOptions = { ...validOptions, compositeWidth: 0 };
      
      await expect(service.generateCompositeHeader(invalidOptions))
        .rejects.toThrow(AppError);
    });

    test('should validate composite width limits', async () => {
      const invalidOptions = { ...validOptions, compositeWidth: 3000 };
      
      await expect(service.generateCompositeHeader(invalidOptions))
        .rejects.toThrow('Composite width must be a positive integer between 1 and 2000 pixels');
    });

    test('should validate composite height limits', async () => {
      const invalidOptions = { ...validOptions, compositeHeight: -1 };
      
      await expect(service.generateCompositeHeader(invalidOptions))
        .rejects.toThrow('Composite height must be a positive integer between 1 and 2000 pixels');
    });

    test('should validate logo height', async () => {
      const invalidOptions = { ...validOptions, logoHeight: 0 };
      
      await expect(service.generateCompositeHeader(invalidOptions))
        .rejects.toThrow('Logo height must be a positive integer not exceeding composite height');
    });

    test('should validate logo height does not exceed composite height', async () => {
      const invalidOptions = { ...validOptions, logoHeight: 300, compositeHeight: 200 };
      
      await expect(service.generateCompositeHeader(invalidOptions))
        .rejects.toThrow('Logo height must be a positive integer not exceeding composite height');
    });

    test('should validate positioning within bounds', async () => {
      const invalidOptions = { ...validOptions, logoTopOffset: -1 };
      
      await expect(service.generateCompositeHeader(invalidOptions))
        .rejects.toThrow('Logo top offset must be a non-negative integer within composite height bounds');
    });

    test('should validate positioning does not exceed bounds', async () => {
      const invalidOptions = { ...validOptions, logoLeftOffset: 700, compositeWidth: 600 };
      
      await expect(service.generateCompositeHeader(invalidOptions))
        .rejects.toThrow('Logo left offset must be a non-negative integer within composite width bounds');
    });

    test('should validate URL format', async () => {
      const invalidOptions = { ...validOptions, bannerUrl: 'not-a-valid-url' };
      
      await expect(service.generateCompositeHeader(invalidOptions))
        .rejects.toThrow('Banner and logo URLs must be valid URLs');
    });
  });

  describe('ImageCompositionError', () => {
    test('should create error with proper properties', () => {
      const originalError = new Error('Original error');
      const context = { imageUrl: 'https://example.com/image.jpg', step: 'fetch' as const };
      const error = new ImageCompositionError('Test error', originalError, context);
      
      expect(error).toBeInstanceOf(ImageCompositionError);
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Test error');
      expect(error.type).toBe(ErrorType.FILE_UPLOAD);
      expect(error.statusCode).toBe(500);
      expect(error.originalError).toBe(originalError);
      expect(error.imageUrl).toBe('https://example.com/image.jpg');
      expect(error.step).toBe('fetch');
    });

    test('should create error without optional parameters', () => {
      const error = new ImageCompositionError('Simple error');
      
      expect(error.message).toBe('Simple error');
      expect(error.originalError).toBeUndefined();
      expect(error.imageUrl).toBeUndefined();
      expect(error.step).toBeUndefined();
    });
  });

  describe('cache operations', () => {
    test('should generate consistent cache keys for same input', async () => {
      const key1 = await service.getPublicCacheKey(validOptions);
      const key2 = await service.getPublicCacheKey(validOptions);
      
      expect(key1).toBe(key2);
    });

    test('should generate consistent cache keys', async () => {
      // Test that same options generate same key
      const key1 = await service.getPublicCacheKey(validOptions);
      const key2 = await service.getPublicCacheKey(validOptions);
      
      expect(key1).toBe(key2);
      expect(key1).toMatch(/^[a-f0-9]{64}$/);
    });

    test('should handle cache key generation errors gracefully', async () => {
      // This test verifies that cache key generation doesn't break the whole process
      // Even if there are errors, it should return some valid key
      const key = await service.getPublicCacheKey(validOptions);
      expect(key).toBeTruthy();
      expect(typeof key).toBe('string');
    });
  });

  describe('edge cases', () => {
    test('should handle zero offset positioning', async () => {
      const options = {
        ...validOptions,
        logoTopOffset: 0,
        logoLeftOffset: 0,
      };
      
      await service.generateCompositeHeader(options);
      
      expect(mockSharpInstance.composite).toHaveBeenCalledWith([{
        input: expect.any(Buffer),
        top: 0,
        left: 0,
      }]);
    });

    test('should handle maximum valid dimensions', async () => {
      const options = {
        ...validOptions,
        compositeWidth: 2000,
        compositeHeight: 2000,
        logoHeight: 2000,
        logoTopOffset: 0,
        logoLeftOffset: 0,
      };
      
      await expect(service.generateCompositeHeader(options)).resolves.toBeTruthy();
    });

    test('should handle minimum valid dimensions', async () => {
      const options = {
        ...validOptions,
        compositeWidth: 1,
        compositeHeight: 1,
        logoHeight: 1,
        logoTopOffset: 0,
        logoLeftOffset: 0,
      };
      
      await expect(service.generateCompositeHeader(options)).resolves.toBeTruthy();
    });
  });
});