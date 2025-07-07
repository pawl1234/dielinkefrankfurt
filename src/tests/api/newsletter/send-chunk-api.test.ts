import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { NextRequest } from 'next/server';

// Mock dependencies
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

// Import after mocking
import { POST } from '@/app/api/admin/newsletter/send-chunk/route';

describe('POST /api/admin/newsletter/send-chunk', () => {
  const mockSettings = {
    fromEmail: 'newsletter@example.com',
    fromName: 'Test Newsletter',
    replyToEmail: 'reply@example.com',
    chunkSize: 50,
    chunkDelay: 100,
    emailTimeout: 30000
  };

  const mockNewsletter = {
    id: 'newsletter-123',
    subject: 'Test Newsletter',
    status: 'sending',
    settings: JSON.stringify({
      chunkResults: [],
      totalSent: 0,
      totalFailed: 0
    }),
    content: '<html>Test content</html>'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockGetNewsletterSettings.mockResolvedValue(mockSettings);
    mockPrismaFindUnique.mockResolvedValue(mockNewsletter);
    mockPrismaUpdate.mockResolvedValue(mockNewsletter);
    
    mockProcessSendingChunk.mockResolvedValue({
      sentCount: 2,
      failedCount: 0,
      completedAt: new Date().toISOString(),
      results: [
        { email: 'user1@example.com', success: true },
        { email: 'user2@example.com', success: true }
      ]
    });
  });

  describe('Request Validation', () => {
    it('should require all mandatory fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/send-chunk', {
        method: 'POST',
        body: JSON.stringify({
          newsletterId: 'newsletter-123'
          // Missing html, subject, emails
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required fields');
    });

    it('should require non-empty emails array', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/send-chunk', {
        method: 'POST',
        body: JSON.stringify({
          newsletterId: 'newsletter-123',
          html: '<html>Test</html>',
          subject: 'Test Subject',
          emails: [],
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


  describe('Successful Processing', () => {
    it('should process chunk and return success response', async () => {
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
      expect(data).toMatchObject({
        success: true,
        chunkIndex: 0,
        totalChunks: 1,
        sentCount: 2,
        failedCount: 0,
        isComplete: true
      });
    });

  });

  describe('Error Handling', () => {
    it('should handle malformed JSON gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/send-chunk', {
        method: 'POST',
        body: 'invalid json'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });
  });
});