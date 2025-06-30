import { NextRequest } from 'next/server';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Use global mocks and import the modules
import prisma from '@/lib/prisma';
import { processSendingChunk } from '@/lib/newsletter-sending';
import { POST } from '@/app/api/admin/newsletter/retry-chunk/route';

// Get typed references to the mocked functions
const mockProcessSendingChunk = jest.mocked(processSendingChunk);
const mockPrismaFindUnique = jest.mocked(prisma.newsletterItem.findUnique);
const mockPrismaUpdate = jest.mocked(prisma.newsletterItem.update);

describe('/api/admin/newsletter/retry-chunk', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set default mock behaviors to ensure clean slate
    mockPrismaUpdate.mockResolvedValue({} as any);
    mockProcessSendingChunk.mockResolvedValue({
      sentCount: 0,
      failedCount: 0,
      completedAt: new Date().toISOString(),
      results: []
    });
  });

  describe('POST', () => {
    it('should handle newsletter not in retry state', async () => {
      // The global mock returns a newsletter with status 'draft', which should trigger this error
      mockPrismaFindUnique.mockResolvedValue({
        id: 'test-newsletter-id',
        status: 'draft', // Not in 'retrying' state
        settings: JSON.stringify({
          chunkResults: [],
          retryInProgress: false
        })
      });

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/retry-chunk', {
        method: 'POST',
        body: JSON.stringify({
          newsletterId: 'test-newsletter-id',
          html: '<html>Test</html>',
          subject: 'Test',
          chunkEmails: ['user@example.com']
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Newsletter is not in retry state');
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

    it('should handle newsletter not found', async () => {
      // Use a mock implementation that returns null specifically for this test
      mockPrismaFindUnique.mockImplementationOnce(async ({ where }) => {
        if (where.id === 'non-existent-id') {
          return null;
        }
        // Fallback to default behavior for other IDs
        return {
          id: where.id,
          status: 'draft',
          settings: '{}'
        } as any;
      });

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/retry-chunk', {
        method: 'POST',
        body: JSON.stringify({
          newsletterId: 'non-existent-id',
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

    it('should process frontend chunk successfully', async () => {
      // Clear and reset mock for this specific test
      mockPrismaFindUnique.mockReset();
      mockPrismaFindUnique.mockResolvedValue({
        id: 'retry-newsletter-id',
        status: 'retrying',
        settings: JSON.stringify({
          retryInProgress: true,
          failedEmails: ['user1@example.com', 'user2@example.com'],
          chunkResults: []
        })
      });

      // Mock successful email sending
      mockProcessSendingChunk.mockResolvedValue({
        sentCount: 1,
        failedCount: 0,
        completedAt: new Date().toISOString(),
        results: [
          { email: 'user@example.com', success: true }
        ]
      });

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/retry-chunk', {
        method: 'POST',
        body: JSON.stringify({
          newsletterId: 'retry-newsletter-id',
          html: '<html>Test newsletter</html>',
          subject: 'Test Subject',
          chunkEmails: ['user@example.com'],
          chunkIndex: 0
        })
      });

      const response = await POST(request);
      const data = await response.json();
      
      // Debug: Log response to understand the error
      if (response.status !== 200) {
        console.log('Response status:', response.status);
        console.log('Response data:', data);
      }

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.chunkIndex).toBe(0);
      expect(data.processedCount).toBe(1);
      expect(data.successfulEmails).toEqual(['user@example.com']);
      expect(data.failedEmails).toEqual([]);
      expect(mockProcessSendingChunk).toHaveBeenCalledWith(
        ['user@example.com'],
        'retry-newsletter-id',
        expect.objectContaining({
          html: '<html>Test newsletter</html>',
          subject: 'Test Subject',
          chunkIndex: 0,
          totalChunks: 1
        }),
        'retry'
      );
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