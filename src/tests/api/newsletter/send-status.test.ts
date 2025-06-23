import { NextRequest } from 'next/server';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Import after mocking (mocks are in jest.setup.api.js)
import { GET } from '@/app/api/admin/newsletter/send-status/[id]/route';
import { getNewsletterById } from '@/lib/newsletter-service';
import { IdRouteContext } from '@/types/api-types';

const mockGetNewsletterById = getNewsletterById as jest.MockedFunction<typeof getNewsletterById>;

describe('/api/admin/newsletter/send-status/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET', () => {
    const mockContext: IdRouteContext = {
      params: Promise.resolve({ id: 'newsletter-123' })
    };

    it('should return sending status for newsletter in progress', async () => {
      const mockChunkResults = [
        { sentCount: 50, failedCount: 0, completedAt: '2024-01-01T10:00:00Z' },
        { sentCount: 45, failedCount: 5, completedAt: '2024-01-01T10:01:00Z' },
        null // Third chunk not completed yet
      ];

      const mockNewsletter = {
        id: 'newsletter-123',
        subject: 'Test Newsletter',
        introductionText: 'Test intro',
        content: '<html>Content</html>',
        status: 'sending',
        createdAt: new Date('2024-01-01T09:00:00Z'),
        updatedAt: new Date('2024-01-01T10:01:00Z'),
        sentAt: null,
        recipientCount: 150,
        settings: JSON.stringify({
          chunkResults: mockChunkResults,
          totalSent: 95,
          totalFailed: 5,
          completedChunks: 2,
          lastChunkCompletedAt: '2024-01-01T10:01:00Z'
        })
      };

      mockGetNewsletterById.mockResolvedValue(mockNewsletter);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/send-status/newsletter-123');
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        id: 'newsletter-123',
        subject: 'Test Newsletter',
        status: 'sending',
        recipientCount: 150,
        totalSent: 95,
        totalFailed: 5,
        completedChunks: 2,
        totalChunks: 3,
        completionPercentage: 66.67, // 2/3 chunks completed
        isComplete: false,
        sentAt: null,
        lastChunkCompletedAt: '2024-01-01T10:01:00Z',
        chunkResults: mockChunkResults
      });
    });

    it('should return status for completed newsletter', async () => {
      const mockChunkResults = [
        { sentCount: 50, failedCount: 0, completedAt: '2024-01-01T10:00:00Z' },
        { sentCount: 50, failedCount: 0, completedAt: '2024-01-01T10:01:00Z' }
      ];

      const mockNewsletter = {
        id: 'newsletter-123',
        subject: 'Completed Newsletter',
        introductionText: 'Test intro',
        content: '<html>Content</html>',
        status: 'sent',
        createdAt: new Date('2024-01-01T09:00:00Z'),
        updatedAt: new Date('2024-01-01T10:02:00Z'),
        sentAt: new Date('2024-01-01T10:02:00Z'),
        recipientCount: 100,
        settings: JSON.stringify({
          chunkResults: mockChunkResults,
          totalSent: 100,
          totalFailed: 0,
          completedChunks: 2,
          lastChunkCompletedAt: '2024-01-01T10:01:00Z'
        })
      };

      mockGetNewsletterById.mockResolvedValue(mockNewsletter);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/send-status/newsletter-123');
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        id: 'newsletter-123',
        subject: 'Completed Newsletter',
        status: 'sent',
        recipientCount: 100,
        totalSent: 100,
        totalFailed: 0,
        completedChunks: 2,
        totalChunks: 2,
        completionPercentage: 100,
        isComplete: true,
        sentAt: new Date('2024-01-01T10:02:00Z').toISOString(),
        lastChunkCompletedAt: '2024-01-01T10:01:00Z',
        chunkResults: mockChunkResults
      });
    });

    it('should return status for newsletter with retry in progress', async () => {
      const mockChunkResults = [
        { sentCount: 45, failedCount: 5, completedAt: '2024-01-01T10:00:00Z' },
        { sentCount: 48, failedCount: 2, completedAt: '2024-01-01T10:01:00Z' }
      ];

      const mockNewsletter = {
        id: 'newsletter-123',
        subject: 'Newsletter with Retries',
        introductionText: 'Test intro',
        content: '<html>Content</html>',
        status: 'retrying',
        createdAt: new Date('2024-01-01T09:00:00Z'),
        updatedAt: new Date('2024-01-01T10:02:00Z'),
        sentAt: null,
        recipientCount: 100,
        settings: JSON.stringify({
          chunkResults: mockChunkResults,
          totalSent: 93,
          totalFailed: 7,
          completedChunks: 2,
          lastChunkCompletedAt: '2024-01-01T10:01:00Z',
          retryInProgress: true,
          retryStartedAt: '2024-01-01T10:02:00Z',
          failedEmails: ['user1@example.com', 'user2@example.com'],
          currentRetryStage: 0,
          retryChunkSizes: [10, 5, 1]
        })
      };

      mockGetNewsletterById.mockResolvedValue(mockNewsletter);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/send-status/newsletter-123');
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        id: 'newsletter-123',
        subject: 'Newsletter with Retries',
        status: 'retrying',
        recipientCount: 100,
        totalSent: 93,
        totalFailed: 7,
        completedChunks: 2,
        totalChunks: 2,
        completionPercentage: 100, // Main chunks completed
        isComplete: false, // But retries in progress
        sentAt: null,
        lastChunkCompletedAt: '2024-01-01T10:01:00Z',
        chunkResults: mockChunkResults,
        retryInProgress: true,
        retryStartedAt: '2024-01-01T10:02:00Z',
        failedEmailsCount: 2,
        currentRetryStage: 0,
        retryChunkSizes: [10, 5, 1]
      });
    });

    it('should return status for draft newsletter', async () => {
      const mockNewsletter = {
        id: 'newsletter-123',
        subject: 'Draft Newsletter',
        introductionText: 'Test intro',
        content: null,
        status: 'draft',
        createdAt: new Date('2024-01-01T09:00:00Z'),
        updatedAt: new Date('2024-01-01T09:00:00Z'),
        sentAt: null,
        recipientCount: null,
        settings: null
      };

      mockGetNewsletterById.mockResolvedValue(mockNewsletter);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/send-status/newsletter-123');
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        id: 'newsletter-123',
        subject: 'Draft Newsletter',
        status: 'draft',
        recipientCount: null,
        totalSent: 0,
        totalFailed: 0,
        completedChunks: 0,
        totalChunks: 0,
        completionPercentage: 0,
        isComplete: false,
        sentAt: null,
        lastChunkCompletedAt: null,
        chunkResults: []
      });
    });

    it('should handle newsletter not found', async () => {
      const notFoundError = {
        name: 'NewsletterNotFoundError',
        message: 'Newsletter not found',
        toResponse: jest.fn().mockReturnValue({
          json: () => Promise.resolve({ error: 'Newsletter not found', type: 'NEWSLETTER' }),
          status: 404
        })
      };

      mockGetNewsletterById.mockRejectedValue(notFoundError);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/send-status/invalid-id');
      const response = await GET(request, {
        params: Promise.resolve({ id: 'invalid-id' })
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to get newsletter status');
    });

    it('should handle malformed settings JSON gracefully', async () => {
      const mockNewsletter = {
        id: 'newsletter-123',
        subject: 'Newsletter with Bad JSON',
        introductionText: 'Test intro',
        content: '<html>Content</html>',
        status: 'sending',
        createdAt: new Date('2024-01-01T09:00:00Z'),
        updatedAt: new Date('2024-01-01T10:01:00Z'),
        sentAt: null,
        recipientCount: 100,
        settings: 'invalid json{'
      };

      mockGetNewsletterById.mockResolvedValue(mockNewsletter);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/send-status/newsletter-123');
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        id: 'newsletter-123',
        subject: 'Newsletter with Bad JSON',
        status: 'sending',
        recipientCount: 100,
        totalSent: 0,
        totalFailed: 0,
        completedChunks: 0,
        totalChunks: 0,
        completionPercentage: 0,
        isComplete: false,
        sentAt: null,
        lastChunkCompletedAt: null,
        chunkResults: []
      });
    });

    it('should calculate completion percentage correctly for partial progress', async () => {
      const mockChunkResults = [
        { sentCount: 25, failedCount: 0, completedAt: '2024-01-01T10:00:00Z' },
        null,
        null,
        null
      ];

      const mockNewsletter = {
        id: 'newsletter-123',
        subject: 'Partial Progress Newsletter',
        introductionText: 'Test intro',
        content: '<html>Content</html>',
        status: 'sending',
        createdAt: new Date('2024-01-01T09:00:00Z'),
        updatedAt: new Date('2024-01-01T10:00:00Z'),
        sentAt: null,
        recipientCount: 100,
        settings: JSON.stringify({
          chunkResults: mockChunkResults,
          totalSent: 25,
          totalFailed: 0,
          completedChunks: 1
        })
      };

      mockGetNewsletterById.mockResolvedValue(mockNewsletter);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/send-status/newsletter-123');
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.completionPercentage).toBe(25); // 1/4 chunks completed
      expect(data.totalChunks).toBe(4);
      expect(data.completedChunks).toBe(1);
    });

    it('should handle database errors gracefully', async () => {
      mockGetNewsletterById.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/send-status/newsletter-123');
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to get newsletter status');
    });
  });
});