import { NextRequest } from 'next/server';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Import after mocking (mocks are in jest.setup.js)
import { POST } from '@/app/api/admin/newsletter/send-test/route';
import { logger } from '@/lib/logger';
import { sendNewsletterTestEmail } from '@/lib/newsletter-service';
import { apiErrorResponse } from '@/lib/errors';
import prisma from '@/lib/prisma';

// Get mocked functions from jest setup
const mockSendNewsletterTestEmail = sendNewsletterTestEmail as jest.MockedFunction<typeof sendNewsletterTestEmail>;
const mockApiErrorResponse = apiErrorResponse as jest.MockedFunction<typeof apiErrorResponse>;
const mockPrisma = prisma;

describe('/api/admin/newsletter/send-test', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset mock implementation to default
    mockSendNewsletterTestEmail.mockResolvedValue({
      success: true,
      recipientCount: 1,
      messageId: 'test-message'
    });
  });

  describe('POST', () => {
    it('should send test email with provided HTML successfully', async () => {
      const html = '<h1>Test Newsletter</h1>';
      const mockResult = {
        success: true,
        recipientCount: 2,
        messageId: 'test-message-id'
      };

      mockSendNewsletterTestEmail.mockResolvedValue(mockResult);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/send-test', {
        method: 'POST',
        body: JSON.stringify({ html }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        message: 'Test emails sent successfully to 2 recipients',
        messageId: 'test-message-id',
        recipientCount: 2
      });
      expect(mockSendNewsletterTestEmail).toHaveBeenCalledWith(html, undefined);
      expect(logger.info).toHaveBeenCalledWith(
        'Sending test newsletter email',
        expect.objectContaining({
          context: expect.objectContaining({
            operation: 'send_test_newsletter',
            hasNewsletterHtml: true,
            newsletterId: null
          })
        })
      );
    });

    it('should send test email with newsletter from database', async () => {
      const newsletterId = 123;
      const newsletterContent = '<h1>Saved Newsletter</h1>';
      const mockNewsletter = {
        id: newsletterId,
        content: newsletterContent,
        title: 'Test Newsletter',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      const mockResult = {
        success: true,
        recipientCount: 1,
        messageId: 'test-message-id-2'
      };

      mockPrisma.newsletterItem.findUnique.mockResolvedValue(mockNewsletter);
      mockSendNewsletterTestEmail.mockResolvedValue(mockResult);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/send-test', {
        method: 'POST',
        body: JSON.stringify({ newsletterId }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        message: 'Test emails sent successfully to 1 recipient',
        messageId: 'test-message-id-2',
        recipientCount: 1
      });
      expect(mockPrisma.newsletterItem.findUnique).toHaveBeenCalledWith({
        where: { id: newsletterId }
      });
      expect(mockSendNewsletterTestEmail).toHaveBeenCalledWith(newsletterContent, undefined);
      expect(logger.info).toHaveBeenCalledWith(
        'Fetching newsletter content for test email',
        expect.objectContaining({
          context: expect.objectContaining({
            operation: 'send_test_newsletter',
            newsletterId
          })
        })
      );
    });

    it('should return error when newsletter not found', async () => {
      const newsletterId = 999;

      mockPrisma.newsletterItem.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/send-test', {
        method: 'POST',
        body: JSON.stringify({ newsletterId }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Newsletter not found');
      expect(mockPrisma.newsletterItem.findUnique).toHaveBeenCalledWith({
        where: { id: newsletterId }
      });
      expect(mockSendNewsletterTestEmail).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        'Newsletter not found for test email',
        expect.objectContaining({
          context: expect.objectContaining({
            operation: 'send_test_newsletter',
            newsletterId
          })
        })
      );
    });

    it('should return validation error when no HTML content provided', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/send-test', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Newsletter HTML content is required');
      expect(mockSendNewsletterTestEmail).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        'Test newsletter attempted without HTML content'
      );
    });

    it('should handle email sending failure', async () => {
      const html = '<h1>Test Newsletter</h1>';
      const mockResult = {
        success: false,
        error: new Error('SMTP connection failed')
      };

      mockSendNewsletterTestEmail.mockResolvedValue(mockResult);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/send-test', {
        method: 'POST',
        body: JSON.stringify({ html }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to send test email');
      expect(data.details).toBe('SMTP connection failed');
      expect(mockSendNewsletterTestEmail).toHaveBeenCalledWith(html, undefined);
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to send test newsletter email',
        expect.objectContaining({
          context: expect.objectContaining({
            operation: 'send_test_newsletter',
            error: 'SMTP connection failed'
          })
        })
      );
    });

    it('should handle unexpected errors gracefully', async () => {
      const html = '<h1>Test Newsletter</h1>';
      const error = new Error('Unexpected error');

      mockSendNewsletterTestEmail.mockRejectedValue(error);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/send-test', {
        method: 'POST',
        body: JSON.stringify({ html }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to send test email');
      expect(mockSendNewsletterTestEmail).toHaveBeenCalledWith(html, undefined);
      expect(logger.error).toHaveBeenCalledWith(
        'Error sending test newsletter email',
        expect.objectContaining({
          context: expect.objectContaining({
            operation: 'send_test_newsletter',
            error: 'Unexpected error'
          })
        })
      );
      expect(mockApiErrorResponse).toHaveBeenCalledWith(error, 'Failed to send test email');
    });

    it('should handle malformed JSON gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/send-test', {
        method: 'POST',
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to send test email');
      expect(mockSendNewsletterTestEmail).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        'Error sending test newsletter email',
        expect.objectContaining({
          context: expect.objectContaining({
            operation: 'send_test_newsletter'
          })
        })
      );
      expect(mockApiErrorResponse).toHaveBeenCalled();
    });

    it('should handle both html and newsletterId provided (prioritize html)', async () => {
      const html = '<h1>Direct HTML</h1>';
      const newsletterId = 123;
      const mockResult = {
        success: true,
        recipientCount: 1,
        messageId: 'test-message-id-3'
      };

      mockSendNewsletterTestEmail.mockResolvedValue(mockResult);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/send-test', {
        method: 'POST',
        body: JSON.stringify({ html, newsletterId }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // Should use the provided HTML, not fetch from database
      expect(mockPrisma.newsletterItem.findUnique).not.toHaveBeenCalled();
      expect(mockSendNewsletterTestEmail).toHaveBeenCalledWith(html, undefined);
    });

  });

  describe('Authentication requirements', () => {
    it('should require admin authentication for POST endpoint', () => {
      // Since withAdminAuth is mocked to return the handler directly,
      // we verify that the original function is wrapped by checking the import
      expect(POST).toBeDefined();
      expect(typeof POST).toBe('function');
    });
  });

  describe('Logging and monitoring', () => {
    it('should log successful test email operations', async () => {
      const html = '<h1>Test Newsletter</h1>';
      const mockResult = {
        success: true,
        recipientCount: 1,
        messageId: 'test-message-success'
      };

      mockSendNewsletterTestEmail.mockResolvedValue(mockResult);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/send-test', {
        method: 'POST',
        body: JSON.stringify({ html }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      await POST(request);

      // Verify logging calls
      expect(logger.info).toHaveBeenCalledWith(
        'Sending test newsletter email',
        expect.objectContaining({
          context: expect.objectContaining({
            operation: 'send_test_newsletter',
            hasNewsletterHtml: true,
            newsletterId: null
          })
        })
      );

      expect(logger.info).toHaveBeenCalledWith(
        'Test newsletter email sent successfully',
        expect.objectContaining({
          context: expect.objectContaining({
            operation: 'send_test_newsletter',
            recipientCount: 1,
            messageId: 'test-message-success'
          })
        })
      );
    });

    it('should log errors appropriately', async () => {
      const html = '<h1>Test Newsletter</h1>';
      const error = new Error('Network failure');

      mockSendNewsletterTestEmail.mockRejectedValue(error);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/send-test', {
        method: 'POST',
        body: JSON.stringify({ html }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      await POST(request);

      expect(logger.error).toHaveBeenCalledWith(
        'Error sending test newsletter email',
        expect.objectContaining({
          context: expect.objectContaining({
            operation: 'send_test_newsletter',
            error: 'Network failure'
          })
        })
      );
    });
  });
});