import { NextRequest } from 'next/server';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock the modules before importing anything else
const mockProcessSendingChunk = jest.fn();
const mockGetNewsletterSettings = jest.fn();
const mockPrismaFindUnique = jest.fn();
const mockPrismaUpdate = jest.fn();

jest.mock('@/lib/newsletter-sending', () => ({
  processSendingChunk: mockProcessSendingChunk
}));

jest.mock('@/lib/newsletter-service', () => ({
  getNewsletterSettings: mockGetNewsletterSettings
}));

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    newsletterItem: {
      findUnique: mockPrismaFindUnique,
      update: mockPrismaUpdate
    }
  }
}));

jest.mock('@/lib/api-auth', () => ({
  withAdminAuth: jest.fn((handler) => handler)
}));

jest.mock('@/lib/errors', () => {
  const { NextResponse } = require('next/server');
  return {
    AppError: {
      validation: jest.fn((message) => ({
        message,
        statusCode: 400,
        type: 'VALIDATION',
        toResponse: () => NextResponse.json({ error: message, type: 'VALIDATION' }, { status: 400 })
      }))
    }
  };
});



// Now import the route handler
import { POST } from '@/app/api/admin/newsletter/send-chunk/route';

describe('/api/admin/newsletter/send-chunk', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset all mocks to defined values to avoid undefined errors
    mockPrismaFindUnique.mockReset();
    mockPrismaUpdate.mockReset();
    mockGetNewsletterSettings.mockReset();
    mockProcessSendingChunk.mockReset();
  });

  describe('POST', () => {
    const mockNewsletter = {
      id: 'newsletter-123',
      subject: 'Test Newsletter',
      status: 'sending',
      settings: JSON.stringify({}),
      createdAt: new Date(),
      updatedAt: new Date(),
      sentAt: null,
      recipientCount: null,
      introductionText: 'Test intro',
      content: '<html>Test content</html>'
    };

    const mockSettings = {
      id: 1,
      headerLogo: '/logo.png',
      headerBanner: '/banner.png',
      footerText: 'Footer text',
      unsubscribeLink: 'https://example.com/unsubscribe',
      fromEmail: 'newsletter@example.com',
      fromName: 'Test Newsletter',
      replyToEmail: 'reply@example.com',
      chunkSize: 50,
      chunkDelay: 500,
      emailTimeout: 30000,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('should process chunk successfully when newsletter exists', async () => {
      const mockChunkResult = {
        sentCount: 2,
        failedCount: 0,
        completedAt: new Date().toISOString(),
        results: [
          { email: 'user1@example.com', success: true },
          { email: 'user2@example.com', success: true }
        ]
      };

      const validNewsletter = {
        ...mockNewsletter,
        status: 'sending',
        settings: JSON.stringify({
          chunkResults: [],
          totalSent: 0,
          totalFailed: 0
        })
      };

      mockPrismaFindUnique.mockResolvedValue(validNewsletter);
      mockGetNewsletterSettings.mockResolvedValue(mockSettings);
      mockProcessSendingChunk.mockResolvedValue(mockChunkResult);
      mockPrismaUpdate.mockResolvedValue(validNewsletter);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/send-chunk', {
        method: 'POST',
        body: JSON.stringify({
          newsletterId: 'newsletter-123',
          html: '<html>Test newsletter</html>',
          subject: 'Test Subject',
          emails: ['user1@example.com', 'user2@example.com'],
          chunkIndex: 0,
          totalChunks: 1
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.sentCount).toBe(2);
      expect(data.failedCount).toBe(0);
      expect(data.isComplete).toBe(true);
    });


    it('should validate required fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/send-chunk', {
        method: 'POST',
        body: JSON.stringify({
          newsletterId: 'newsletter-123',
          // Missing html, subject, emails
          chunkIndex: 0,
          totalChunks: 1
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required fields');
    });

  });
});