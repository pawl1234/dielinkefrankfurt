import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { NextRequest } from 'next/server';
import { getClientIP, createFingerprint } from '@/lib/fingerprinting';
import { recordFingerprintOpen } from '@/lib/newsletter-analytics';

// Mock Prisma with extended model
const mockPrisma = {
  newsletterFingerprint: {
    upsert: jest.fn(),
    findUnique: jest.fn(),
  },
  newsletterAnalytics: {
    update: jest.fn(),
  },
};

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: mockPrisma,
}));

describe('Newsletter Fingerprinting Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getClientIP', () => {
    it('should extract IP from x-forwarded-for header', () => {
      const mockRequest = new NextRequest('http://test.com', {
        headers: { 'x-forwarded-for': '192.168.1.1, 10.0.0.1' }
      });
      
      const ip = getClientIP(mockRequest);
      
      expect(ip).toBe('192.168.1.1');
    });

    it('should extract IP from x-real-ip header when x-forwarded-for is not present', () => {
      const mockRequest = new NextRequest('http://test.com', {
        headers: { 'x-real-ip': '192.168.1.2' }
      });
      
      const ip = getClientIP(mockRequest);
      
      expect(ip).toBe('192.168.1.2');
    });

    it('should extract IP from cf-connecting-ip header when other headers are not present', () => {
      const mockRequest = new NextRequest('http://test.com', {
        headers: { 'cf-connecting-ip': '192.168.1.3' }
      });
      
      const ip = getClientIP(mockRequest);
      
      expect(ip).toBe('192.168.1.3');
    });

    it('should fallback to unknown when no IP headers are present', () => {
      const mockRequest = new NextRequest('http://test.com');
      
      const ip = getClientIP(mockRequest);
      
      expect(ip).toBe('unknown');
    });

    it('should trim whitespace from extracted IP', () => {
      const mockRequest = new NextRequest('http://test.com', {
        headers: { 'x-forwarded-for': '  192.168.1.1  , 10.0.0.1' }
      });
      
      const ip = getClientIP(mockRequest);
      
      expect(ip).toBe('192.168.1.1');
    });
  });

  describe('createFingerprint', () => {
    it('should return a string for any request', async () => {
      // Import createFingerprint dynamically to avoid mocking issues
      const { createFingerprint } = await import('@/lib/fingerprinting');
      
      const mockRequest = new NextRequest('http://test.com', {
        headers: {
          'user-agent': 'Mozilla/5.0 Chrome/120.0',
          'accept-language': 'en-US,en;q=0.9'
        }
      });
      
      const fingerprint = createFingerprint(mockRequest);
      
      expect(typeof fingerprint).toBe('string');
      expect(fingerprint).toBeTruthy();
    });

    it('should return consistent results for same input', async () => {
      const { createFingerprint } = await import('@/lib/fingerprinting');
      
      const mockRequest = new NextRequest('http://test.com', {
        headers: {
          'user-agent': 'Mozilla/5.0 Chrome/120.0'
        }
      });
      
      const fingerprint1 = createFingerprint(mockRequest);
      const fingerprint2 = createFingerprint(mockRequest);
      
      expect(fingerprint1).toBe(fingerprint2);
    });

    it('should handle missing headers gracefully', async () => {
      const { createFingerprint } = await import('@/lib/fingerprinting');
      
      const mockRequest = new NextRequest('http://test.com');
      
      const fingerprint = createFingerprint(mockRequest);
      
      expect(typeof fingerprint).toBe('string');
      expect(fingerprint).toBeTruthy();
    });
  });

  describe('recordFingerprintOpen', () => {
    const mockAnalyticsId = 'test-analytics-id';
    const mockFingerprint = 'test-fingerprint-hash';

    it('should call prisma methods for fingerprint tracking', async () => {
      const { recordFingerprintOpen } = await import('@/lib/newsletter-analytics');
      
      const mockFingerprintRecord = {
        id: 'fingerprint-id',
        analyticsId: mockAnalyticsId,
        fingerprint: mockFingerprint,
        openCount: 1,
        firstOpenAt: new Date(),
        lastOpenAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.newsletterFingerprint.upsert.mockResolvedValue(mockFingerprintRecord);
      mockPrisma.newsletterAnalytics.update.mockResolvedValue({} as any);

      await recordFingerprintOpen(mockAnalyticsId, mockFingerprint);

      expect(mockPrisma.newsletterFingerprint.upsert).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      const { recordFingerprintOpen } = await import('@/lib/newsletter-analytics');
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      mockPrisma.newsletterFingerprint.upsert.mockRejectedValue(new Error('Database error'));

      // Should not throw
      await expect(recordFingerprintOpen(mockAnalyticsId, mockFingerprint)).resolves.toBeUndefined();
      
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});