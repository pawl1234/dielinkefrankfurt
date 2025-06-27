import { NextRequest } from 'next/server';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock the modules before importing anything else
const mockProcessSendingChunk = jest.fn();
const mockPrismaFindUnique = jest.fn();

jest.mock('@/lib/newsletter-sending', () => ({
  processSendingChunk: mockProcessSendingChunk
}));

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    newsletterItem: {
      findUnique: mockPrismaFindUnique,
      update: jest.fn()
    }
  }
}));

jest.mock('@/lib/api-auth', () => ({
  withAdminAuth: jest.fn((handler) => handler)
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

jest.mock('@/lib/errors', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const NextResponse = require('next/server').NextResponse;
  
  return {
    AppError: {
      validation: jest.fn((message) => ({
        message,
        statusCode: 400,
        type: 'VALIDATION',
        toResponse: jest.fn(() => NextResponse.json({ error: message, type: 'VALIDATION' }, { status: 400 }))
      })),
      notFound: jest.fn((message) => ({
        message,
        statusCode: 404,
        type: 'NOT_FOUND',
        toResponse: jest.fn(() => NextResponse.json({ error: message, type: 'NOT_FOUND' }, { status: 404 }))
      }))
    }
  };
});

// Now import the route handler
import { POST } from '@/app/api/admin/newsletter/retry-chunk/route';

describe('/api/admin/newsletter/retry-chunk', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST', () => {
    it('should handle newsletter not found', async () => {
      mockPrismaFindUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/retry-chunk', {
        method: 'POST',
        body: JSON.stringify({
          newsletterId: 'invalid-id',
          html: '<html>Test</html>',
          subject: 'Test',
          chunkEmails: ['user@example.com']
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Newsletter not found');
      expect(data.type).toBe('VALIDATION');
      expect(mockProcessSendingChunk).not.toHaveBeenCalled();
    });

    it('should validate required fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/retry-chunk', {
        method: 'POST',
        body: JSON.stringify({
          newsletterId: 'newsletter-123'
          // Missing html, subject
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required fields');
      expect(data.type).toBe('VALIDATION');
      expect(mockProcessSendingChunk).not.toHaveBeenCalled();
    });

    it('should handle malformed JSON gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/retry-chunk', {
        method: 'POST',
        body: 'invalid json'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
      expect(mockProcessSendingChunk).not.toHaveBeenCalled();
    });
  });
});