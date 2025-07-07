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

jest.mock('@/lib/email', () => ({
  sendEmail: jest.fn()
}));

// Import after mocking
import { POST } from '@/app/api/admin/newsletter/retry-chunk/route';

describe('POST /api/admin/newsletter/retry-chunk', () => {
  const mockSettings = {
    fromEmail: 'newsletter@example.com',
    fromName: 'Test Newsletter',
    replyToEmail: 'reply@example.com',
    chunkSize: 50,
    chunkDelay: 100,
    emailTimeout: 30000
  };

  const mockRetryingNewsletter = {
    id: 'newsletter-123',
    status: 'retrying',
    settings: JSON.stringify({
      retryInProgress: true,
      failedEmails: ['user1@example.com', 'user2@example.com'],
      chunkResults: []
    })
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockGetNewsletterSettings.mockResolvedValue(mockSettings);
    mockPrismaFindUnique.mockResolvedValue(mockRetryingNewsletter);
    mockPrismaUpdate.mockResolvedValue(mockRetryingNewsletter);
    
    mockProcessSendingChunk.mockResolvedValue({
      sentCount: 1,
      failedCount: 0,
      completedAt: new Date().toISOString(),
      results: [
        { email: 'user@example.com', success: true }
      ]
    });
  });

  describe('Input Validation', () => {
    it('should require newsletterId, html, and subject', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/retry-chunk', {
        method: 'POST',
        body: JSON.stringify({
          newsletterId: 'newsletter-123'
          // Missing html and subject
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required fields');
      expect(data.type).toBe('VALIDATION');
    });

    it('should handle malformed JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/retry-chunk', {
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