import { NextRequest } from 'next/server';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Import after mocking (mocks are in jest.setup.api.js)
import { GET } from '@/app/api/admin/newsletter/send-status/[id]/route';
import prisma from '@/lib/prisma';

// Get mocked functions from the global mocks set up in jest.setup.api.js
const mockPrisma = jest.mocked(prisma);


describe('/api/admin/newsletter/send-status/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET', () => {
    const mockContext = {
      params: { id: 'newsletter-123' }
    };

    it('should return sending status for newsletter in progress', async () => {
      const mockChunkResults = [
        { sentCount: 50, failedCount: 0, completedAt: '2024-01-01T10:00:00Z' },
        { sentCount: 45, failedCount: 5, completedAt: '2024-01-01T10:01:00Z' }
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

      mockPrisma.newsletterItem.findUnique.mockResolvedValue(mockNewsletter);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/send-status/newsletter-123');
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        newsletterId: 'newsletter-123',
        status: 'sending',
        recipientCount: 150,
        totalSent: 95,
        totalFailed: 5,
        completedChunks: 2,
        totalChunks: 15, // Math.ceil(150 / 10) = 15
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
        createdAt: '2024-01-01T09:00:00Z',
        updatedAt: '2024-01-01T10:02:00Z',
        sentAt: '2024-01-01T10:02:00Z',
        recipientCount: 100,
        settings: JSON.stringify({
          chunkResults: mockChunkResults,
          totalSent: 100,
          totalFailed: 0,
          completedChunks: 2,
          lastChunkCompletedAt: '2024-01-01T10:01:00Z'
        })
      };

      mockPrisma.newsletterItem.findUnique.mockResolvedValue(mockNewsletter);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/send-status/newsletter-123');
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        newsletterId: 'newsletter-123',
        status: 'sent',
        recipientCount: 100,
        totalSent: 100,
        totalFailed: 0,
        completedChunks: 2,
        totalChunks: 10, // Math.ceil(100 / 10) = 10
        isComplete: true,
        sentAt: '2024-01-01T10:02:00Z',
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

      mockPrisma.newsletterItem.findUnique.mockResolvedValue(mockNewsletter);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/send-status/newsletter-123');
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        newsletterId: 'newsletter-123',
        status: 'retrying',
        recipientCount: 100,
        totalSent: 93,
        totalFailed: 7,
        completedChunks: 2,
        totalChunks: 10, // Math.ceil(100 / 10) = 10
        isComplete: false, // Retrying status means not complete
        sentAt: null,
        lastChunkCompletedAt: '2024-01-01T10:01:00Z',
        chunkResults: mockChunkResults
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

      mockPrisma.newsletterItem.findUnique.mockResolvedValue(mockNewsletter);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/send-status/newsletter-123');
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        newsletterId: 'newsletter-123',
        status: 'draft',
        recipientCount: 0,
        totalSent: 0,
        totalFailed: 0,
        completedChunks: 0,
        totalChunks: 0,
        isComplete: true, // Draft newsletters are considered complete in their current state
        sentAt: null,
        lastChunkCompletedAt: undefined,
        chunkResults: []
      });
    });

    it('should handle newsletter not found', async () => {
      mockPrisma.newsletterItem.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/send-status/invalid-id');
      const response = await GET(request, {
        params: { id: 'invalid-id' }
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Newsletter not found');
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

      mockPrisma.newsletterItem.findUnique.mockResolvedValue(mockNewsletter);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/send-status/newsletter-123');
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        success: false,
        newsletterId: 'newsletter-123',
        status: 'error',
        recipientCount: 0,
        totalSent: 0,
        totalFailed: 0,
        completedChunks: 0,
        totalChunks: 0,
        isComplete: true,
        error: expect.any(String)
      });
    });

    it('should calculate progress correctly for partial sending', async () => {
      const mockChunkResults = [
        { sentCount: 25, failedCount: 0, completedAt: '2024-01-01T10:00:00Z' }
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

      mockPrisma.newsletterItem.findUnique.mockResolvedValue(mockNewsletter);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/send-status/newsletter-123');
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.totalChunks).toBe(10); // Math.ceil(100 / 10) = 10
      expect(data.completedChunks).toBe(1);
      expect(data.totalSent).toBe(25);
      expect(data.isComplete).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.newsletterItem.findUnique.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/send-status/newsletter-123');
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Database connection failed');
    });
  });
});