// Mock dependencies before imports
jest.mock('@/lib/api-auth', () => ({
  withAdminAuth: jest.fn((handler) => handler),
}));

jest.mock('@/lib/newsletter-service', () => ({
  getNewsletterSettings: jest.fn(),
  updateNewsletterSettings: jest.fn(),
  clearNewsletterSettingsCache: jest.fn(),
}));

jest.mock('@/lib/image-composition', () => ({
  HeaderCompositionService: jest.fn().mockImplementation(() => ({
    generateCompositeHeader: jest.fn(),
    getPublicCacheKey: jest.fn(),
  })),
  ImageCompositionError: jest.fn().mockImplementation((message, originalError, context) => {
    const error = new Error(message);
    error.name = 'ImageCompositionError';
    error.originalError = originalError;
    error.context = context;
    return error;
  }),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import { NextRequest } from 'next/server';
import { GET, PUT } from '@/app/api/admin/newsletter/settings/route';
import { updateNewsletterSettings } from '@/lib/newsletter-service';
import { HeaderCompositionService, ImageCompositionError } from '@/lib/image-composition';
import { logger } from '@/lib/logger';

const mockUpdateNewsletterSettings = updateNewsletterSettings as jest.MockedFunction<typeof updateNewsletterSettings>;
const mockHeaderCompositionService = HeaderCompositionService as jest.MockedClass<typeof HeaderCompositionService>;

describe('/api/admin/newsletter/settings - Composition Integration', () => {
  let mockServiceInstance: jest.Mocked<HeaderCompositionService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock service instance
    mockServiceInstance = {
      generateCompositeHeader: jest.fn(),
      getPublicCacheKey: jest.fn(),
    } as any;
    
    mockHeaderCompositionService.mockImplementation(() => mockServiceInstance);
    
    // Default successful responses
    mockUpdateNewsletterSettings.mockResolvedValue({
      id: 1,
      headerLogo: 'https://example.com/logo.png',
      headerBanner: 'https://example.com/banner.jpg',
      footerText: 'Footer text',
      unsubscribeLink: 'https://example.com/unsubscribe',
      compositeImageUrl: null,
      compositeImageHash: null,
    } as any);
  });

  describe('PUT endpoint - Composite Generation', () => {
    const validCompositeData = {
      headerBanner: 'https://example.com/banner.jpg',
      headerLogo: 'https://example.com/logo.png',
      compositeWidth: 600,
      compositeHeight: 200,
      logoTopOffset: 20,
      logoLeftOffset: 20,
      logoHeight: 60,
      footerText: 'Updated footer',
    };

    test('should generate composite image when both banner and logo are provided', async () => {
      const mockCompositeUrl = 'https://blob.vercel-storage.com/newsletter-headers/composite-abc123.jpg';
      const mockCacheKey = 'abc123def456ghi789';
      
      mockServiceInstance.generateCompositeHeader.mockResolvedValue(mockCompositeUrl);
      mockServiceInstance.getPublicCacheKey.mockResolvedValue(mockCacheKey);
      
      mockUpdateNewsletterSettings.mockResolvedValue({
        ...validCompositeData,
        id: 1,
        compositeImageUrl: mockCompositeUrl,
        compositeImageHash: mockCacheKey,
      } as any);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/settings', {
        method: 'PUT',
        body: JSON.stringify(validCompositeData),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.compositeImageUrl).toBe(mockCompositeUrl);
      expect(data.compositeImageHash).toBe(mockCacheKey);

      // Verify composition service was called correctly
      expect(mockServiceInstance.generateCompositeHeader).toHaveBeenCalledWith({
        bannerUrl: 'https://example.com/banner.jpg',
        logoUrl: 'https://example.com/logo.png',
        compositeWidth: 600,
        compositeHeight: 200,
        logoTopOffset: 20,
        logoLeftOffset: 20,
        logoHeight: 60,
      });

      expect(mockServiceInstance.getPublicCacheKey).toHaveBeenCalledWith({
        bannerUrl: 'https://example.com/banner.jpg',
        logoUrl: 'https://example.com/logo.png',
        compositeWidth: 600,
        compositeHeight: 200,
        logoTopOffset: 20,
        logoLeftOffset: 20,
        logoHeight: 60,
      });

      // Verify database update included composite data
      expect(mockUpdateNewsletterSettings).toHaveBeenCalledWith({
        ...validCompositeData,
        compositeImageUrl: mockCompositeUrl,
        compositeImageHash: mockCacheKey,
      });

      expect(logger.info).toHaveBeenCalledWith(
        'Successfully generated composite header image',
        expect.objectContaining({
          context: expect.objectContaining({
            compositeUrl: mockCompositeUrl,
          })
        })
      );
    });

    test('should use default values when composition settings are not provided', async () => {
      const mockCompositeUrl = 'https://blob.vercel-storage.com/newsletter-headers/composite-def456.jpg';
      const mockCacheKey = 'def456ghi789abc123';
      
      mockServiceInstance.generateCompositeHeader.mockResolvedValue(mockCompositeUrl);
      mockServiceInstance.getPublicCacheKey.mockResolvedValue(mockCacheKey);

      const minimalData = {
        headerBanner: 'https://example.com/banner.jpg',
        headerLogo: 'https://example.com/logo.png',
        footerText: 'Updated footer',
      };

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/settings', {
        method: 'PUT',
        body: JSON.stringify(minimalData),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      await PUT(request);

      // Verify default values were used
      expect(mockServiceInstance.generateCompositeHeader).toHaveBeenCalledWith({
        bannerUrl: 'https://example.com/banner.jpg',
        logoUrl: 'https://example.com/logo.png',
        compositeWidth: 600, // default
        compositeHeight: 200, // default
        logoTopOffset: 20, // default
        logoLeftOffset: 20, // default
        logoHeight: 60, // default
      });
    });

    test('should handle composite generation failures gracefully', async () => {
      const compositionError = new Error('Failed to fetch banner image');
      mockServiceInstance.generateCompositeHeader.mockRejectedValue(compositionError);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/settings', {
        method: 'PUT',
        body: JSON.stringify(validCompositeData),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200); // Should still succeed with fallback
      expect(data.compositeImageUrl).toBeNull();
      expect(data.compositeImageHash).toBeNull();

      // Verify error was logged but operation continued
      expect(logger.error).toHaveBeenCalledWith(
        compositionError,
        expect.objectContaining({
          context: expect.objectContaining({
            operation: 'generateCompositeHeader',
            fallbackApplied: true,
          })
        })
      );

      expect(logger.warn).toHaveBeenCalledWith(
        'Composite generation failed, using CSS overlay fallback',
        expect.any(Object)
      );

      // Verify database was updated with cleared composite data
      expect(mockUpdateNewsletterSettings).toHaveBeenCalledWith({
        ...validCompositeData,
        compositeImageUrl: null,
        compositeImageHash: null,
      });
    });

    test('should clear composite data when only banner is provided', async () => {
      const partialData = {
        headerBanner: 'https://example.com/new-banner.jpg',
        footerText: 'Updated footer',
      };

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/settings', {
        method: 'PUT',
        body: JSON.stringify(partialData),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      await PUT(request);

      // Should not attempt to generate composite
      expect(mockServiceInstance.generateCompositeHeader).not.toHaveBeenCalled();

      // Should clear composite data
      expect(mockUpdateNewsletterSettings).toHaveBeenCalledWith({
        ...partialData,
        compositeImageUrl: null,
        compositeImageHash: null,
      });

      expect(logger.debug).toHaveBeenCalledWith(
        'Clearing composite data due to incomplete image set',
        expect.any(Object)
      );
    });

    test('should clear composite data when only logo is provided', async () => {
      const partialData = {
        headerLogo: 'https://example.com/new-logo.png',
        footerText: 'Updated footer',
      };

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/settings', {
        method: 'PUT',
        body: JSON.stringify(partialData),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      await PUT(request);

      // Should not attempt to generate composite
      expect(mockServiceInstance.generateCompositeHeader).not.toHaveBeenCalled();

      // Should clear composite data
      expect(mockUpdateNewsletterSettings).toHaveBeenCalledWith({
        ...partialData,
        compositeImageUrl: null,
        compositeImageHash: null,
      });
    });

    test('should not interfere with updates that do not include header images', async () => {
      const nonImageData = {
        footerText: 'Just updating footer',
        batchSize: 50,
      };

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/settings', {
        method: 'PUT',
        body: JSON.stringify(nonImageData),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      await PUT(request);

      // Should not attempt to generate composite
      expect(mockServiceInstance.generateCompositeHeader).not.toHaveBeenCalled();
      expect(mockServiceInstance.getPublicCacheKey).not.toHaveBeenCalled();

      // Should pass data unchanged
      expect(mockUpdateNewsletterSettings).toHaveBeenCalledWith(nonImageData);
    });

    test('should handle ImageCompositionError specifically', async () => {
      const imageError = new ImageCompositionError(
        'Failed to process logo image',
        new Error('Invalid image format'),
        { imageUrl: 'https://example.com/logo.png', step: 'process' }
      );
      
      mockServiceInstance.generateCompositeHeader.mockRejectedValue(imageError);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/settings', {
        method: 'PUT',
        body: JSON.stringify(validCompositeData),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await PUT(request);
      
      expect(response.status).toBe(200);
      
      // Verify specific error logging
      expect(logger.error).toHaveBeenCalledWith(
        imageError,
        expect.objectContaining({
          context: expect.objectContaining({
            operation: 'generateCompositeHeader'
          })
        })
      );
    });

    test('should log appropriate debug information during composition attempt', async () => {
      mockServiceInstance.generateCompositeHeader.mockResolvedValue('https://example.com/composite.jpg');
      mockServiceInstance.getPublicCacheKey.mockResolvedValue('cache123');

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/settings', {
        method: 'PUT',
        body: JSON.stringify(validCompositeData),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      await PUT(request);

      expect(logger.debug).toHaveBeenCalledWith(
        'Attempting to generate composite header image',
        expect.objectContaining({
          context: expect.objectContaining({
            bannerUrl: validCompositeData.headerBanner,
            logoUrl: validCompositeData.headerLogo,
            hasCompositionSettings: true,
          })
        })
      );
    });

    test('should include composition status in final success log', async () => {
      const mockCompositeUrl = 'https://blob.vercel-storage.com/newsletter-headers/composite-xyz789.jpg';
      
      mockServiceInstance.generateCompositeHeader.mockResolvedValue(mockCompositeUrl);
      mockServiceInstance.getPublicCacheKey.mockResolvedValue('xyz789');
      
      mockUpdateNewsletterSettings.mockResolvedValue({
        ...validCompositeData,
        id: 1,
        compositeImageUrl: mockCompositeUrl,
        compositeImageHash: 'xyz789',
      } as any);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/settings', {
        method: 'PUT',
        body: JSON.stringify(validCompositeData),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      await PUT(request);

      expect(logger.info).toHaveBeenCalledWith(
        'Newsletter settings updated successfully',
        expect.objectContaining({
          context: expect.objectContaining({
            hasCompositeImage: true,
          })
        })
      );
    });
  });

  describe('error scenarios', () => {
    test('should handle database update failures after successful composite generation', async () => {
      const testCompositeData = {
        headerBanner: 'https://example.com/banner.jpg',
        headerLogo: 'https://example.com/logo.png',
        compositeWidth: 600,
        compositeHeight: 200,
        logoTopOffset: 20,
        logoLeftOffset: 20,
        logoHeight: 60,
        footerText: 'Updated footer',
      };

      const mockCompositeUrl = 'https://blob.vercel-storage.com/newsletter-headers/composite-abc123.jpg';
      const mockCacheKey = 'abc123def456ghi789';
      
      mockServiceInstance.generateCompositeHeader.mockResolvedValue(mockCompositeUrl);
      mockServiceInstance.getPublicCacheKey.mockResolvedValue(mockCacheKey);
      
      // Mock database failure
      mockUpdateNewsletterSettings.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/settings', {
        method: 'PUT',
        body: JSON.stringify(testCompositeData),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await PUT(request);
      
      expect(response.status).toBe(500);
      
      // Composite should have been generated successfully
      expect(mockServiceInstance.generateCompositeHeader).toHaveBeenCalled();
      
      // But database update failed
      expect(logger.error).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          context: expect.objectContaining({
            operation: 'updateNewsletterSettings'
          })
        })
      );
    });
  });
});