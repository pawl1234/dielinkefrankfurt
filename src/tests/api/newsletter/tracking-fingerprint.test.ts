import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/newsletter/track/pixel/[token]/route';

// Mock dependencies
jest.mock('@/lib/prisma');
jest.mock('@/lib/newsletter-analytics', () => ({
  ...jest.requireActual('@/lib/newsletter-analytics'),
  recordOpenEvent: jest.fn(),
}));

jest.mock('@/lib/fingerprinting', () => ({
  createFingerprint: jest.fn(() => 'test-fingerprint-hash'),
}));

import prisma from '@/lib/prisma';
import { recordOpenEvent, TRANSPARENT_GIF_BUFFER } from '@/lib/newsletter-analytics';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockRecordOpenEvent = recordOpenEvent as jest.MockedFunction<typeof recordOpenEvent>;

describe('Enhanced Tracking Pixel with Fingerprinting - Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

    it('should call recordOpenEvent with token and fingerprint', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/newsletter/track/pixel/test-token');
      mockRequest.headers.set('user-agent', 'Mozilla/5.0 Chrome/120.0');
      mockRequest.headers.set('accept-language', 'en-US,en;q=0.9');
      mockRequest.headers.set('accept-encoding', 'gzip, deflate');
      mockRequest.headers.set('x-forwarded-for', '192.168.1.1');
      
      const params = Promise.resolve({ token: 'test-token' });
      await GET(mockRequest, { params });

      expect(mockRecordOpenEvent).toHaveBeenCalledWith(
        'test-token',
        expect.stringMatching(/^[a-f0-9]{64}$/) // SHA256 hex pattern
      );
    });

    it('should generate consistent fingerprints for same client', async () => {
      const createRequest = () => {
        const req = new NextRequest('http://localhost:3000/api/newsletter/track/pixel/test-token');
        req.headers.set('user-agent', 'Mozilla/5.0 Chrome/120.0');
        req.headers.set('accept-language', 'en-US,en;q=0.9');
        req.headers.set('x-forwarded-for', '192.168.1.1');
        return req;
      };

      const params = Promise.resolve({ token: 'test-token' });
      
      await GET(createRequest(), { params });
      const firstFingerprint = mockRecordOpenEvent.mock.calls[0][1];
      
      await GET(createRequest(), { params });
      const secondFingerprint = mockRecordOpenEvent.mock.calls[1][1];

      expect(firstFingerprint).toBe(secondFingerprint);
    });

    it('should generate different fingerprints for different clients', async () => {
      const createRequest1 = () => {
        const req = new NextRequest('http://localhost:3000/api/newsletter/track/pixel/test-token');
        req.headers.set('user-agent', 'Mozilla/5.0 Chrome/120.0');
        req.headers.set('x-forwarded-for', '192.168.1.1');
        return req;
      };

      const createRequest2 = () => {
        const req = new NextRequest('http://localhost:3000/api/newsletter/track/pixel/test-token');
        req.headers.set('user-agent', 'Mozilla/5.0 Safari/17.0');
        req.headers.set('x-forwarded-for', '192.168.1.1');
        return req;
      };

      const params = Promise.resolve({ token: 'test-token' });
      
      await GET(createRequest1(), { params });
      const firstFingerprint = mockRecordOpenEvent.mock.calls[0][1];
      
      await GET(createRequest2(), { params });
      const secondFingerprint = mockRecordOpenEvent.mock.calls[1][1];

      expect(firstFingerprint).not.toBe(secondFingerprint);
    });

    it('should handle missing headers gracefully', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/newsletter/track/pixel/test-token');
      // No headers set
      
      const params = Promise.resolve({ token: 'test-token' });
      const response = await GET(mockRequest, { params });

      expect(response.status).toBe(200);
      expect(mockRecordOpenEvent).toHaveBeenCalledWith(
        'test-token',
        expect.stringMatching(/^[a-f0-9]{64}$/)
      );
    });

    it('should not await recordOpenEvent to keep response fast', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/newsletter/track/pixel/test-token');
      mockRequest.headers.set('user-agent', 'Mozilla/5.0 Chrome/120.0');
      
      const params = Promise.resolve({ token: 'test-token' });
      const startTime = Date.now();
      
      await GET(mockRequest, { params });
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // Response should be fast (under 50ms for this test)
      expect(responseTime).toBeLessThan(50);
      expect(mockRecordOpenEvent).toHaveBeenCalled();
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
      // Reset mocks and restore actual implementation for integration testing
      jest.clearAllMocks();
      mockRecordOpenEvent.mockRestore?.();
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

      const mockRequest = new NextRequest('http://localhost:3000/api/newsletter/track/pixel/test-token');
      mockRequest.headers.set('user-agent', 'Mozilla/5.0 Chrome/120.0');
      mockRequest.headers.set('x-forwarded-for', '192.168.1.1');
      
      const params = Promise.resolve({ token: 'test-token' });
      const response = await GET(mockRequest, { params });

      expect(response.status).toBe(200);
      
      // Allow some time for async operations
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockPrisma.newsletterAnalytics.findUnique).toHaveBeenCalledWith({
        where: { pixelToken: 'test-token' },
        include: { newsletter: true },
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

      const mockRequest = new NextRequest('http://localhost:3000/api/newsletter/track/pixel/test-token');
      mockRequest.headers.set('user-agent', 'Mozilla/5.0 Chrome/120.0');
      mockRequest.headers.set('x-forwarded-for', '192.168.1.1');
      
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