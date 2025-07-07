/**
 * Tests for Newsletter Send Test API endpoint
 * 
 * Focus: Test the API's behavior, not implementation details
 * - Valid requests succeed
 * - Invalid requests fail with proper errors
 * - Newsletter content is fetched when ID provided
 * 
 * We mock only external dependencies (email, database)
 */
import { NextRequest } from 'next/server';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { POST } from '@/app/api/admin/newsletter/send-test/route';
import { sendNewsletterTestEmail } from '@/lib/newsletter-service';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

// Mock external dependencies
const mockSendNewsletterTestEmail = sendNewsletterTestEmail as jest.MockedFunction<typeof sendNewsletterTestEmail>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('/api/admin/newsletter/send-test', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default successful email sending
    mockSendNewsletterTestEmail.mockResolvedValue({
      success: true,
      recipientCount: 1,
      messageId: 'test-123'
    });
  });

  describe('POST', () => {
    it('should send test email with provided HTML', async () => {
      const html = '<h1>Test Newsletter</h1>';

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/send-test', {
        method: 'POST',
        body: JSON.stringify({ html }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('Test emails sent successfully');
      expect(mockSendNewsletterTestEmail).toHaveBeenCalled();
    });

    it('should send test email with newsletter from database', async () => {
      const newsletterId = 123;
      const mockNewsletter = {
        id: newsletterId,
        content: '<h1>Saved Newsletter</h1>',
        title: 'Test Newsletter',
        settings: JSON.stringify({ testEmailRecipients: 'test@example.com' }),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.newsletterItem.findUnique.mockResolvedValue(mockNewsletter);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/send-test', {
        method: 'POST',
        body: JSON.stringify({ newsletterId }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockPrisma.newsletterItem.findUnique).toHaveBeenCalledWith({
        where: { id: newsletterId }
      });
      expect(mockSendNewsletterTestEmail).toHaveBeenCalled();
    });

    it('should return 404 when newsletter not found', async () => {
      mockPrisma.newsletterItem.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/send-test', {
        method: 'POST',
        body: JSON.stringify({ newsletterId: 999 }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Newsletter not found');
      expect(mockSendNewsletterTestEmail).not.toHaveBeenCalled();
    });

    it('should return 400 when no content provided', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/send-test', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Newsletter HTML content is required');
      expect(mockSendNewsletterTestEmail).not.toHaveBeenCalled();
    });

    it('should handle email sending failure', async () => {
      mockSendNewsletterTestEmail.mockResolvedValue({
        success: false,
        error: new Error('SMTP failed')
      });

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/send-test', {
        method: 'POST',
        body: JSON.stringify({ html: '<h1>Test</h1>' }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to send test email');
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
      
      // Just verify we get an error response - don't test implementation details
      expect(response.status).toBe(500);
      expect(mockSendNewsletterTestEmail).toHaveBeenCalledWith(html, undefined);
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

});