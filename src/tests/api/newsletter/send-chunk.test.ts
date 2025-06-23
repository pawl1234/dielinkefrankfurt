import { NextRequest } from 'next/server';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Import after mocking (mocks are in jest.setup.api.js)
import { POST } from '@/app/api/admin/newsletter/send-chunk/route';
import { processSendingChunk } from '@/lib/newsletter-sending';
import { getNewsletterSettings } from '@/lib/newsletter-service';
import prisma from '@/lib/prisma';

const mockProcessSendingChunk = processSendingChunk as jest.MockedFunction<typeof processSendingChunk>;
const mockGetNewsletterSettings = getNewsletterSettings as jest.MockedFunction<typeof getNewsletterSettings>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('/api/admin/newsletter/send-chunk', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
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

    it('should process email chunk successfully', async () => {
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
      mockGetNewsletterSettings.mockResolvedValue(mockSettings);
      mockProcessSendingChunk.mockResolvedValue(mockChunkResult);
      mockPrisma.newsletterItem.update.mockResolvedValue(mockNewsletter);

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
      expect(data.newsletterStatus).toBe('sent');
      expect(mockProcessSendingChunk).toHaveBeenCalledWith(
        ['user1@example.com', 'user2@example.com'],
        'newsletter-123',
        expect.objectContaining({
          html: '<html>Test newsletter</html>',
          subject: 'Test Subject',
          chunkIndex: 0,
          totalChunks: 1
        }),
        'initial'
      );
    });

    it('should handle newsletter not found', async () => {
      mockPrisma.newsletterItem.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/send-chunk', {
        method: 'POST',
        body: JSON.stringify({
          newsletterId: 'invalid-id',
          html: '<html>Test</html>',
          subject: 'Test',
          emails: ['user@example.com'],
          chunkIndex: 0,
          totalChunks: 1
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Newsletter not found');
      expect(mockProcessSendingChunk).not.toHaveBeenCalled();
    });

    it('should handle newsletter not in sendable state', async () => {
      const draftNewsletter = { ...mockNewsletter, status: 'sent' };
      mockPrisma.newsletterItem.findUnique.mockResolvedValue(draftNewsletter);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/send-chunk', {
        method: 'POST',
        body: JSON.stringify({
          newsletterId: 'newsletter-123',
          html: '<html>Test</html>',
          subject: 'Test',
          emails: ['user@example.com'],
          chunkIndex: 0,
          totalChunks: 1
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Newsletter is not in a sendable state');
      expect(mockProcessSendingChunk).not.toHaveBeenCalled();
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
      expect(mockProcessSendingChunk).not.toHaveBeenCalled();
    });

    it('should handle chunk with failures and initiate retry', async () => {
      const mockChunkResult = {
        sentCount: 1,
        failedCount: 1,
        completedAt: new Date().toISOString(),
        results: [
          { email: 'user1@example.com', success: true },
          { email: 'user2@example.com', success: false, error: 'SMTP error' }
        ]
      };

      const mockUpdatedNewsletter = {
        ...mockNewsletter,
        settings: JSON.stringify({
          retryInProgress: true,
          failedEmails: ['user2@example.com']
        })
      };

      mockPrisma.newsletterItem.findUnique.mockResolvedValueOnce(mockNewsletter);
      mockPrisma.newsletterItem.findUnique.mockResolvedValueOnce(mockUpdatedNewsletter);
      mockGetNewsletterSettings.mockResolvedValue({
        ...mockSettings,
        retryChunkSizes: '10,5,1'
      });
      mockProcessSendingChunk.mockResolvedValue(mockChunkResult);
      mockPrisma.newsletterItem.update.mockResolvedValue(mockUpdatedNewsletter);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/send-chunk', {
        method: 'POST',
        body: JSON.stringify({
          newsletterId: 'newsletter-123',
          html: '<html>Test newsletter</html>',
          subject: 'Test Subject',
          emails: ['user1@example.com', 'user2@example.com'],
          chunkIndex: 0,
          totalChunks: 1 // Last chunk
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.sentCount).toBe(1);
      expect(data.failedCount).toBe(1);
      expect(data.isComplete).toBe(true);
      expect(data.newsletterStatus).toBe('retrying');
    });

    it('should handle processing errors gracefully', async () => {
      mockPrisma.newsletterItem.findUnique.mockResolvedValue(mockNewsletter);
      mockGetNewsletterSettings.mockResolvedValue(mockSettings);
      mockProcessSendingChunk.mockRejectedValue(new Error('Processing failed'));

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/send-chunk', {
        method: 'POST',
        body: JSON.stringify({
          newsletterId: 'newsletter-123',
          html: '<html>Test</html>',
          subject: 'Test',
          emails: ['user@example.com'],
          chunkIndex: 0,
          totalChunks: 1
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Processing failed');
    });

    it('should track progress correctly for multiple chunks', async () => {
      const mockChunkResult = {
        sentCount: 5,
        failedCount: 0,
        completedAt: new Date().toISOString(),
        results: Array.from({ length: 5 }, (_, i) => ({
          email: `user${i}@example.com`,
          success: true
        }))
      };

      const chunkResults = [
        { sentCount: 5, failedCount: 0 }, // Previous chunk
        mockChunkResult // Current chunk
      ];

      const mockNewsletterWithProgress = {
        ...mockNewsletter,
        settings: JSON.stringify({
          chunkResults,
          totalSent: 5,
          totalFailed: 0,
          completedChunks: 1
        })
      };

      mockPrisma.newsletterItem.findUnique.mockResolvedValue(mockNewsletterWithProgress);
      mockGetNewsletterSettings.mockResolvedValue(mockSettings);
      mockProcessSendingChunk.mockResolvedValue(mockChunkResult);
      mockPrisma.newsletterItem.update.mockResolvedValue(mockNewsletterWithProgress);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/send-chunk', {
        method: 'POST',
        body: JSON.stringify({
          newsletterId: 'newsletter-123',
          html: '<html>Test newsletter</html>',
          subject: 'Test Subject',
          emails: Array.from({ length: 5 }, (_, i) => `user${i + 5}@example.com`),
          chunkIndex: 1,
          totalChunks: 3 // Not the last chunk
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.isComplete).toBe(false); // Not the last chunk
      expect(data.newsletterStatus).toBe('sending'); // Still sending
    });

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
      expect(mockProcessSendingChunk).not.toHaveBeenCalled();
    });
  });
});