import { NextRequest } from 'next/server';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Import after mocking (mocks are in jest.setup.api.js)
import { POST } from '@/app/api/admin/newsletter/retry-chunk/route';
import { processSendingChunk } from '@/lib/newsletter-sending';
import { getNewsletterSettings } from '@/lib/newsletter-service';
import prisma from '@/lib/prisma';

const mockProcessSendingChunk = processSendingChunk as jest.MockedFunction<typeof processSendingChunk>;
const mockGetNewsletterSettings = getNewsletterSettings as jest.MockedFunction<typeof getNewsletterSettings>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('/api/admin/newsletter/retry-chunk', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('POST', () => {
    const mockRetrySettings = {
      retryInProgress: true,
      failedEmails: ['user1@example.com', 'user2@example.com', 'user3@example.com'],
      retryChunkSizes: [10, 5, 1],
      currentRetryStage: 0,
      retryResults: []
    };

    const mockNewsletter = {
      id: 'newsletter-123',
      subject: 'Test Newsletter',
      status: 'retrying',
      settings: JSON.stringify(mockRetrySettings),
      createdAt: new Date(),
      updatedAt: new Date(),
      sentAt: null,
      recipientCount: null,
      introductionText: 'Test intro',
      content: '<html>Test content</html>'
    };

    const mockNewsletterSettings = {
      id: 1,
      headerLogo: '/logo.png',
      fromEmail: 'newsletter@example.com',
      fromName: 'Test Newsletter',
      replyToEmail: 'reply@example.com',
      chunkSize: 50,
      retryChunkSizes: '10,5,1',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('should process retry chunk successfully', async () => {
      const mockChunkResult = {
        sentCount: 2,
        failedCount: 0,
        completedAt: new Date().toISOString(),
        results: [
          { email: 'user1@example.com', success: true },
          { email: 'user2@example.com', success: true }
        ]
      };

      mockPrisma.newsletterItem.findUnique.mockResolvedValue(mockNewsletter);
      mockGetNewsletterSettings.mockResolvedValue(mockNewsletterSettings);
      mockProcessSendingChunk.mockResolvedValue(mockChunkResult);
      mockPrisma.newsletterItem.update.mockResolvedValue(mockNewsletter);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/retry-chunk', {
        method: 'POST',
        body: JSON.stringify({
          newsletterId: 'newsletter-123',
          html: '<html>Test newsletter</html>',
          subject: 'Test Subject',
          chunkEmails: ['user1@example.com', 'user2@example.com'],
          chunkIndex: 0
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.stage).toBe(0);
      expect(data.processedEmails).toBe(2);
      expect(data.remainingFailedEmails).toEqual(['user3@example.com']);
      expect(mockProcessSendingChunk).toHaveBeenCalledWith(
        ['user1@example.com', 'user2@example.com'],
        'newsletter-123',
        expect.objectContaining({
          html: '<html>Test newsletter</html>',
          subject: 'Test Subject'
        }),
        'retry'
      );
    });

    it('should handle newsletter not found', async () => {
      mockPrisma.newsletterItem.findUnique.mockResolvedValue(null);

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

      expect(response.status).toBe(404);
      expect(data.error).toBe('Newsletter not found');
      expect(mockProcessSendingChunk).not.toHaveBeenCalled();
    });

    it('should handle newsletter not in retry state', async () => {
      const nonRetryNewsletter = {
        ...mockNewsletter,
        status: 'sent',
        settings: JSON.stringify({})
      };

      mockPrisma.newsletterItem.findUnique.mockResolvedValue(nonRetryNewsletter);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/retry-chunk', {
        method: 'POST',
        body: JSON.stringify({
          newsletterId: 'newsletter-123',
          html: '<html>Test</html>',
          subject: 'Test',
          chunkEmails: ['user@example.com']
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Newsletter is not in retry state');
      expect(mockProcessSendingChunk).not.toHaveBeenCalled();
    });

    it('should validate required fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/retry-chunk', {
        method: 'POST',
        body: JSON.stringify({
          newsletterId: 'newsletter-123'
          // Missing html, subject, chunkEmails
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required fields');
      expect(mockProcessSendingChunk).not.toHaveBeenCalled();
    });

    it('should handle partial retry success with smaller chunks', async () => {
      const mockChunkResult = {
        sentCount: 1,
        failedCount: 1,
        completedAt: new Date().toISOString(),
        results: [
          { email: 'user1@example.com', success: true },
          { email: 'user2@example.com', success: false, error: 'SMTP error' }
        ]
      };

      mockPrisma.newsletterItem.findUnique.mockResolvedValue(mockNewsletter);
      mockGetNewsletterSettings.mockResolvedValue(mockNewsletterSettings);
      mockProcessSendingChunk.mockResolvedValue(mockChunkResult);
      mockPrisma.newsletterItem.update.mockResolvedValue(mockNewsletter);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/retry-chunk', {
        method: 'POST',
        body: JSON.stringify({
          newsletterId: 'newsletter-123',
          html: '<html>Test newsletter</html>',
          subject: 'Test Subject',
          chunkEmails: ['user1@example.com', 'user2@example.com'],
          chunkIndex: 0
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.remainingFailedEmails).toEqual(['user2@example.com', 'user3@example.com']);
      expect(data.isComplete).toBe(false);
    });

    it('should complete retry when all emails succeed', async () => {
      const allSuccessNewsletter = {
        ...mockNewsletter,
        settings: JSON.stringify({
          ...mockRetrySettings,
          failedEmails: ['user1@example.com'] // Only one email left
        })
      };

      const mockChunkResult = {
        sentCount: 1,
        failedCount: 0,
        completedAt: new Date().toISOString(),
        results: [
          { email: 'user1@example.com', success: true }
        ]
      };

      mockPrisma.newsletterItem.findUnique.mockResolvedValue(allSuccessNewsletter);
      mockGetNewsletterSettings.mockResolvedValue(mockNewsletterSettings);
      mockProcessSendingChunk.mockResolvedValue(mockChunkResult);
      mockPrisma.newsletterItem.update.mockResolvedValue({
        ...allSuccessNewsletter,
        status: 'sent'
      });

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/retry-chunk', {
        method: 'POST',
        body: JSON.stringify({
          newsletterId: 'newsletter-123',
          html: '<html>Test newsletter</html>',
          subject: 'Test Subject',
          chunkEmails: ['user1@example.com'],
          chunkIndex: 0
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.isComplete).toBe(true);
      expect(data.remainingFailedEmails).toEqual([]);
      expect(data.newsletterStatus).toBe('sent');
    });

    it('should advance to next retry stage on complete failure', async () => {
      const stage0Settings = {
        ...mockRetrySettings,
        currentRetryStage: 0,
        failedEmails: ['user1@example.com', 'user2@example.com']
      };

      const stage0Newsletter = {
        ...mockNewsletter,
        settings: JSON.stringify(stage0Settings)
      };

      const mockChunkResult = {
        sentCount: 0,
        failedCount: 2,
        completedAt: new Date().toISOString(),
        results: [
          { email: 'user1@example.com', success: false, error: 'SMTP error' },
          { email: 'user2@example.com', success: false, error: 'SMTP error' }
        ]
      };

      mockPrisma.newsletterItem.findUnique.mockResolvedValue(stage0Newsletter);
      mockGetNewsletterSettings.mockResolvedValue(mockNewsletterSettings);
      mockProcessSendingChunk.mockResolvedValue(mockChunkResult);
      mockPrisma.newsletterItem.update.mockResolvedValue(stage0Newsletter);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/retry-chunk', {
        method: 'POST',
        body: JSON.stringify({
          newsletterId: 'newsletter-123',
          html: '<html>Test newsletter</html>',
          subject: 'Test Subject',
          chunkEmails: ['user1@example.com', 'user2@example.com'],
          chunkIndex: 0
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.stage).toBe(1); // Advanced to next stage
      expect(data.remainingFailedEmails).toEqual(['user1@example.com', 'user2@example.com']);
    });

    it('should handle processing errors gracefully', async () => {
      mockPrisma.newsletterItem.findUnique.mockResolvedValue(mockNewsletter);
      mockGetNewsletterSettings.mockResolvedValue(mockNewsletterSettings);
      mockProcessSendingChunk.mockRejectedValue(new Error('Processing failed'));

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/retry-chunk', {
        method: 'POST',
        body: JSON.stringify({
          newsletterId: 'newsletter-123',
          html: '<html>Test</html>',
          subject: 'Test',
          chunkEmails: ['user@example.com']
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to process retry chunk');
    });

    it('should handle malformed JSON gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/retry-chunk', {
        method: 'POST',
        body: 'invalid json'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to process retry chunk');
      expect(mockProcessSendingChunk).not.toHaveBeenCalled();
    });
  });
});