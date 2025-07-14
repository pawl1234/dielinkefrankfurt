import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { NextRequest } from 'next/server';

// Mock external dependencies only
jest.mock('@/lib/prisma');

// Import everything
import prisma from '@/lib/prisma';
import { TRANSPARENT_GIF_BUFFER } from '@/lib/newsletter-analytics';
import { GET } from '@/app/api/newsletter/track/pixel/[token]/route';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('Enhanced Tracking Pixel with Fingerprinting - Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up basic mocks that tests expect
    mockPrisma.newsletterAnalytics.findUnique.mockResolvedValue({
      id: 'test-analytics-id',
      newsletterId: 'test-newsletter-id'
    } as any);
    mockPrisma.newsletterAnalytics.update.mockResolvedValue({} as any);
    mockPrisma.newsletterFingerprint.upsert.mockResolvedValue({} as any);
    mockPrisma.newsletterOpenEvent.upsert.mockResolvedValue({} as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/newsletter/track/pixel/[token]', () => {
    it('should respond with 1x1 GIF and correct headers', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/newsletter/track/pixel/test-token', {
        headers: {
          'user-agent': 'Mozilla/5.0 Chrome/120.0',
          'accept-language': 'en-US,en;q=0.9'
        }
      });
      
      const params = Promise.resolve({ token: 'test-token' });
      const response = await GET(mockRequest, { params });

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('image/gif');
      expect(response.headers.get('Cache-Control')).toBe('no-store, no-cache, must-revalidate, proxy-revalidate');
      expect(response.headers.get('Pragma')).toBe('no-cache');
      expect(response.headers.get('Expires')).toBe('0');
    });

    it('should track opens and call database methods', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/newsletter/track/pixel/test-token', {
        headers: {
          'user-agent': 'Mozilla/5.0 Chrome/120.0',
          'accept-language': 'en-US,en;q=0.9',
          'accept-encoding': 'gzip, deflate',
          'x-forwarded-for': '192.168.1.1'
        }
      });
      
      const params = Promise.resolve({ token: 'test-token' });
      const response = await GET(mockRequest, { params });
      
      // Give async function time to execute
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(response.status).toBe(200);
      expect(mockPrisma.newsletterAnalytics.findUnique).toHaveBeenCalledWith({
        where: { pixelToken: 'test-token' },
        select: { id: true, newsletterId: true },
      });
      expect(mockPrisma.newsletterAnalytics.update).toHaveBeenCalledWith({
        where: { pixelToken: 'test-token' },
        data: { totalOpens: { increment: 1 } },
      });
    });

    it('should handle multiple tracking calls', async () => {
      const createRequest = () => {
        return new NextRequest('http://localhost:3000/api/newsletter/track/pixel/test-token', {
          headers: {
            'user-agent': 'Mozilla/5.0 Chrome/120.0',
            'accept-language': 'en-US,en;q=0.9',
            'x-forwarded-for': '192.168.1.1'
          }
        });
      };

      const params = Promise.resolve({ token: 'test-token' });
      
      const response1 = await GET(createRequest(), { params });
      const response2 = await GET(createRequest(), { params });
      
      // Give async functions time to execute
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      
      // Both calls should trigger analytics lookup and update
      expect(mockPrisma.newsletterAnalytics.findUnique).toHaveBeenCalledTimes(2);
      expect(mockPrisma.newsletterAnalytics.update).toHaveBeenCalledTimes(2);
    });

    it('should track different clients properly', async () => {
      const createRequest1 = () => {
        return new NextRequest('http://localhost:3000/api/newsletter/track/pixel/test-token', {
          headers: {
            'user-agent': 'Mozilla/5.0 Chrome/120.0',
            'x-forwarded-for': '192.168.1.1'
          }
        });
      };

      const createRequest2 = () => {
        return new NextRequest('http://localhost:3000/api/newsletter/track/pixel/test-token', {
          headers: {
            'user-agent': 'Mozilla/5.0 Safari/17.0',
            'x-forwarded-for': '192.168.1.2'
          }
        });
      };

      const params = Promise.resolve({ token: 'test-token' });
      
      const response1 = await GET(createRequest1(), { params });
      const response2 = await GET(createRequest2(), { params });
      
      // Give async functions time to execute
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      
      // Both calls should trigger analytics operations
      expect(mockPrisma.newsletterAnalytics.findUnique).toHaveBeenCalledTimes(2);
      expect(mockPrisma.newsletterAnalytics.update).toHaveBeenCalledTimes(2);
    });

    it('should handle missing headers gracefully', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/newsletter/track/pixel/test-token');
      // No headers set
      
      const params = Promise.resolve({ token: 'test-token' });
      const response = await GET(mockRequest, { params });

      // Give async function time to execute
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(response.status).toBe(200);
      expect(mockPrisma.newsletterAnalytics.findUnique).toHaveBeenCalledWith({
        where: { pixelToken: 'test-token' },
        select: { id: true, newsletterId: true },
      });
    });

    it('should respond quickly without awaiting tracking operations', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/newsletter/track/pixel/test-token', {
        headers: {
          'user-agent': 'Mozilla/5.0 Chrome/120.0'
        }
      });
      
      const params = Promise.resolve({ token: 'test-token' });
      const startTime = Date.now();
      
      const response = await GET(mockRequest, { params });
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // Response should be fast (under 50ms for this test)
      expect(responseTime).toBeLessThan(50);
      expect(response.status).toBe(200);
      
      // Analytics operations will happen asynchronously after response
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(mockPrisma.newsletterAnalytics.findUnique).toHaveBeenCalled();
    });

    it('should include content-length header with correct buffer size', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/newsletter/track/pixel/test-token');
      
      const params = Promise.resolve({ token: 'test-token' });
      const response = await GET(mockRequest, { params });

      expect(response.headers.get('Content-Length')).toBe(TRANSPARENT_GIF_BUFFER.length.toString());
    });
  });

  describe('Fingerprint-based Open Tracking Integration', () => {
    beforeEach(() => {
      // Reset mocks for integration testing
      jest.clearAllMocks();
    });

    it('should record fingerprint open events properly', async () => {
      const mockAnalyticsRecord = {
        id: 'analytics-id',
        newsletterId: 'newsletter-id',
        totalRecipients: 100,
        totalOpens: 0,
        uniqueOpens: 0,
        pixelToken: 'test-token',
        createdAt: new Date(),
        newsletter: {
          sentAt: new Date(),
        },
      };

      const mockFingerprintRecord = {
        id: 'fingerprint-id',
        analyticsId: 'analytics-id',
        fingerprint: 'test-fingerprint',
        openCount: 1,
        firstOpenAt: new Date(),
        lastOpenAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.newsletterAnalytics.findUnique.mockResolvedValue(mockAnalyticsRecord as any);
      mockPrisma.newsletterAnalytics.update.mockResolvedValue({} as any);
      mockPrisma.newsletterFingerprint.upsert.mockResolvedValue(mockFingerprintRecord);
      mockPrisma.newsletterOpenEvent.upsert.mockResolvedValue({} as any);

      const mockRequest = new NextRequest('http://localhost:3000/api/newsletter/track/pixel/test-token', {
        headers: {
          'user-agent': 'Mozilla/5.0 Chrome/120.0',
          'x-forwarded-for': '192.168.1.1'
        }
      });
      
      const params = Promise.resolve({ token: 'test-token' });
      const response = await GET(mockRequest, { params });

      expect(response.status).toBe(200);
      
      // Allow some time for async operations
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockPrisma.newsletterAnalytics.findUnique).toHaveBeenCalledWith({
        where: { pixelToken: 'test-token' },
        select: { id: true, newsletterId: true },
      });
    });

    it('should increment totalOpens but not uniqueOpens for repeat opens', async () => {
      const mockAnalyticsRecord = {
        id: 'analytics-id',
        newsletterId: 'newsletter-id',
        totalRecipients: 100,
        totalOpens: 5,
        uniqueOpens: 2,
        pixelToken: 'test-token',
        createdAt: new Date(),
        newsletter: {
          sentAt: new Date(),
        },
      };

      // Simulate existing fingerprint (repeat open)
      const mockFingerprintRecord = {
        id: 'fingerprint-id',
        analyticsId: 'analytics-id',
        fingerprint: 'existing-fingerprint',
        openCount: 2, // Already opened before
        firstOpenAt: new Date('2023-01-01'),
        lastOpenAt: new Date(),
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date(),
      };

      mockPrisma.newsletterAnalytics.findUnique.mockResolvedValue(mockAnalyticsRecord as any);
      mockPrisma.newsletterAnalytics.update.mockResolvedValue({} as any);
      mockPrisma.newsletterFingerprint.upsert.mockResolvedValue(mockFingerprintRecord);
      mockPrisma.newsletterOpenEvent.upsert.mockResolvedValue({} as any);

      const mockRequest = new NextRequest('http://localhost:3000/api/newsletter/track/pixel/test-token', {
        headers: {
          'user-agent': 'Mozilla/5.0 Chrome/120.0',
          'x-forwarded-for': '192.168.1.1'
        }
      });
      
      const params = Promise.resolve({ token: 'test-token' });
      await GET(mockRequest, { params });

      // Allow some time for async operations
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockPrisma.newsletterAnalytics.update).toHaveBeenCalledWith({
        where: { pixelToken: 'test-token' },
        data: { totalOpens: { increment: 1 } },
      });

      // For repeat opens, uniqueOpens should not be incremented
      const uniqueOpensUpdateCall = mockPrisma.newsletterAnalytics.update.mock.calls.find(
        call => call[0].data && 'uniqueOpens' in call[0].data
      );
      expect(uniqueOpensUpdateCall).toBeUndefined();
    });
  });
});