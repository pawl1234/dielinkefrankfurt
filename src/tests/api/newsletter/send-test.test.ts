import { NextRequest } from 'next/server';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Import after mocking (mocks are in jest.setup.api.js)
import { POST } from '@/app/api/admin/newsletter/send-test/route';
import { sendNewsletterTestEmail } from '@/lib/newsletter-service';
import prisma from '@/lib/prisma';

const mockSendNewsletterTestEmail = sendNewsletterTestEmail as jest.MockedFunction<typeof sendNewsletterTestEmail>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('/api/admin/newsletter/send-test', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
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
        body: JSON.stringify({ html })
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
      expect(mockSendNewsletterTestEmail).toHaveBeenCalledWith(html);
    });

    it('should send test email with newsletter from database', async () => {
      const newsletterId = 123;
      const newsletterContent = '<h1>Saved Newsletter</h1>';
      const mockNewsletter = {
        id: newsletterId,
        content: newsletterContent
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
        body: JSON.stringify({ newsletterId })
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
      expect(mockSendNewsletterTestEmail).toHaveBeenCalledWith(newsletterContent);
    });

    it('should return error when newsletter not found', async () => {
      const newsletterId = 999;

      mockPrisma.newsletterItem.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/send-test', {
        method: 'POST',
        body: JSON.stringify({ newsletterId })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Newsletter not found');
      expect(mockSendNewsletterTestEmail).not.toHaveBeenCalled();
    });

    it('should return validation error when no HTML content provided', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/send-test', {
        method: 'POST',
        body: JSON.stringify({})
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Newsletter HTML content is required');
      expect(mockSendNewsletterTestEmail).not.toHaveBeenCalled();
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
        body: JSON.stringify({ html })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to send test email');
      expect(data.details).toBe('SMTP connection failed');
    });

    it('should handle unexpected errors gracefully', async () => {
      const html = '<h1>Test Newsletter</h1>';
      const error = new Error('Unexpected error');

      mockSendNewsletterTestEmail.mockRejectedValue(error);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/send-test', {
        method: 'POST',
        body: JSON.stringify({ html })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to send test email');
    });

    it('should handle malformed JSON gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/send-test', {
        method: 'POST',
        body: 'invalid json'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to send test email');
      expect(mockSendNewsletterTestEmail).not.toHaveBeenCalled();
    });
  });
});