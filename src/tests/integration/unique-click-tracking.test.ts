import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { NextRequest } from 'next/server';

// Mock external dependencies only (following project guidelines)
jest.mock('@/lib/prisma');

// Import everything after mocking
import prisma from '@/lib/prisma';
import { GET } from '@/app/api/newsletter/track/click/[token]/route';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('Unique Click Tracking Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up basic Prisma mocks for analytics operations
    mockPrisma.newsletterAnalytics.findUnique.mockResolvedValue({
      id: 'test-analytics-id',
      newsletterId: 'test-newsletter-id'
    } as any);
    mockPrisma.newsletterLinkClick.upsert.mockResolvedValue({
      id: 'test-link-click-id',
      analyticsId: 'test-analytics-id',
      url: 'http://localhost:3000/termine/123',
      linkType: 'appointment',
      linkId: '123',
      totalClicks: 1,
      uniqueClicks: 1,
      createdAt: new Date(),
      updatedAt: new Date()
    } as any);
    mockPrisma.newsletterLinkClickFingerprint.upsert.mockResolvedValue({} as any);
  });

  it('should track link clicks and redirect to target URL', async () => {
    // Create a valid request with proper headers for fingerprinting
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

    // Give async tracking operations time to execute
    await new Promise(resolve => setTimeout(resolve, 10));

    // Verify response is a redirect to the correct URL
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('http://localhost:3000/termine/123');
    expect(response.headers.get('cache-control')).toBe('no-store, no-cache, must-revalidate');

    // Verify that analytics operations were called
    expect(mockPrisma.newsletterAnalytics.findUnique).toHaveBeenCalledWith({
      where: { pixelToken: 'test-token' },
      select: { id: true, newsletterId: true },
    });

    // Verify link click was recorded
    expect(mockPrisma.newsletterLinkClick.upsert).toHaveBeenCalledWith({
      where: {
        analyticsId_url: {
          analyticsId: 'test-analytics-id',
          url: 'http://localhost:3000/termine/123',
        },
      },
      create: {
        analyticsId: 'test-analytics-id',
        url: 'http://localhost:3000/termine/123',
        linkType: 'appointment',
        linkId: '123',
        clickCount: 1,
        firstClick: expect.any(Date),
        lastClick: expect.any(Date),
      },
      update: {
        clickCount: { increment: 1 },
        lastClick: expect.any(Date),
      },
    });
  });

  it('should handle requests without headers gracefully', async () => {
    // Create request without headers (simulating edge case)
    const request = new NextRequest('http://localhost:3000/api/newsletter/track/click/test-token?url=aHR0cDovL2xvY2FsaG9zdDozMDAwL3Rlcm1pbmUvMTIz&type=appointment&id=123');
    const params = Promise.resolve({ token: 'test-token' });

    const response = await GET(request, { params });

    // Give async tracking operations time to execute
    await new Promise(resolve => setTimeout(resolve, 10));

    // Should still redirect successfully
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('http://localhost:3000/termine/123');

    // Should still attempt to record analytics
    expect(mockPrisma.newsletterAnalytics.findUnique).toHaveBeenCalled();
    expect(mockPrisma.newsletterLinkClick.upsert).toHaveBeenCalled();
  });

  it('should reject invalid URLs to prevent open redirects', async () => {
    // Test with an external URL that should be rejected
    const maliciousUrl = Buffer.from('https://evil.com/phishing', 'utf8').toString('base64url');
    const request = new NextRequest(`http://localhost:3000/api/newsletter/track/click/test-token?url=${maliciousUrl}&type=appointment&id=123`);
    const params = Promise.resolve({ token: 'test-token' });

    const response = await GET(request, { params });

    // Should reject the request
    expect(response.status).toBe(400);
    const responseData = await response.json();
    expect(responseData.error).toBe('Invalid redirect URL');

    // Should not record any analytics for rejected URLs
    expect(mockPrisma.newsletterAnalytics.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.newsletterLinkClick.upsert).not.toHaveBeenCalled();
  });

  it('should handle missing required parameters', async () => {
    // Test with missing 'type' parameter
    const request = new NextRequest('http://localhost:3000/api/newsletter/track/click/test-token?url=aHR0cDovL2xvY2FsaG9zdDozMDAwL3Rlcm1pbmUvMTIz');
    const params = Promise.resolve({ token: 'test-token' });

    const response = await GET(request, { params });

    expect(response.status).toBe(400);
    const responseData = await response.json();
    expect(responseData.error).toBe('Missing required parameters');

    // Should not record any analytics for invalid requests
    expect(mockPrisma.newsletterAnalytics.findUnique).not.toHaveBeenCalled();
  });

  it('should handle invalid base64 URL encoding', async () => {
    // Test with a string that looks like base64 but is invalid
    const invalidBase64 = 'invalid_base64_string!!!'; // Contains invalid base64 characters
    const request = new NextRequest(`http://localhost:3000/api/newsletter/track/click/test-token?url=${invalidBase64}&type=appointment&id=123`);
    const params = Promise.resolve({ token: 'test-token' });

    const response = await GET(request, { params });

    expect(response.status).toBe(400);
    const responseData = await response.json();
    // The actual error could be either Invalid URL encoding or Invalid URL format depending on how the base64 decoding fails
    expect(['Invalid URL encoding', 'Invalid URL format']).toContain(responseData.error);
  });
});