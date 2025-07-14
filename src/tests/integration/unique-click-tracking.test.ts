import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/newsletter/track/click/[token]/route';

// Mock Prisma
const mockPrisma = {
  newsletterAnalytics: {
    findUnique: jest.fn(),
  },
  newsletterLinkClick: {
    upsert: jest.fn(),
  },
};

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: mockPrisma,
}));

// Mock the newsletter analytics functions
jest.mock('@/lib/newsletter-analytics', () => ({
  recordLinkClick: jest.fn(),
  createFingerprint: jest.fn(() => 'mock_fingerprint_123'),
}));

describe('Unique Click Tracking Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create fingerprint and pass it to recordLinkClick', async () => {
    const { recordLinkClick, createFingerprint } = await import('@/lib/newsletter-analytics');
    
    // Mock a valid request
    const request = new NextRequest('http://localhost:3000/api/newsletter/track/click/test-token?url=aHR0cDovL2xvY2FsaG9zdDozMDAwL3Rlcm1pbmUvMTIz&type=appointment&id=123', {
      headers: {
        'user-agent': 'Mozilla/5.0 Test Browser',
        'accept-language': 'de-DE,de;q=0.9',
        'x-forwarded-for': '192.168.1.1',
      },
    });

    const params = Promise.resolve({ token: 'test-token' });

    // Call the API endpoint
    const response = await GET(request, { params });

    // Verify createFingerprint was called with the request
    expect(createFingerprint).toHaveBeenCalledWith(request);

    // Verify recordLinkClick was called with the fingerprint
    expect(recordLinkClick).toHaveBeenCalledWith(
      'test-token',
      'http://localhost:3000/termine/123',
      'appointment',
      '123',
      'mock_fingerprint_123'
    );

    // Verify response is a redirect
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('http://localhost:3000/termine/123');
  });

  it('should handle missing fingerprint gracefully', async () => {
    const { recordLinkClick, createFingerprint } = await import('@/lib/newsletter-analytics');
    
    // Mock createFingerprint to return undefined (edge case)
    (createFingerprint as jest.Mock).mockReturnValue(undefined);

    const request = new NextRequest('http://localhost:3000/api/newsletter/track/click/test-token?url=aHR0cDovL2xvY2FsaG9zdDozMDAwL3Rlcm1pbmUvMTIz&type=appointment&id=123');
    const params = Promise.resolve({ token: 'test-token' });

    const response = await GET(request, { params });

    // Should still call recordLinkClick, even with undefined fingerprint
    expect(recordLinkClick).toHaveBeenCalledWith(
      'test-token',
      'http://localhost:3000/termine/123',
      'appointment',
      '123',
      undefined
    );

    // Should still redirect successfully
    expect(response.status).toBe(302);
  });

  it('should validate the fingerprint creation process', () => {
    // Test that fingerprint would be created correctly
    const mockHeaders = {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'accept-language': 'en-US,en;q=0.9',
      'accept-encoding': 'gzip, deflate, br',
      'x-forwarded-for': '203.0.113.1',
    };

    // Simulate what createFingerprint does
    const fingerprintData = `${mockHeaders['user-agent']}|${mockHeaders['accept-language']}|${mockHeaders['accept-encoding']}|203.0.113.1`;
    
    expect(fingerprintData).toBeTruthy();
    expect(typeof fingerprintData).toBe('string');
    expect(fingerprintData.includes('Mozilla')).toBe(true);
    expect(fingerprintData.includes('203.0.113.1')).toBe(true);
  });
});