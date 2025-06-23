import { NextRequest } from 'next/server';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Import after mocking (mocks are in jest.setup.api.js)
import { POST } from '@/app/api/admin/newsletter/send/route';
import { processRecipientList } from '@/lib/newsletter-sending';
import { getNewsletterSettings } from '@/lib/newsletter-service';
import prisma from '@/lib/prisma';

const mockProcessRecipientList = processRecipientList as jest.MockedFunction<typeof processRecipientList>;
const mockGetNewsletterSettings = getNewsletterSettings as jest.MockedFunction<typeof getNewsletterSettings>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('/api/admin/newsletter/send', () => {
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
      introductionText: 'Test intro',
      content: '<html>Test content</html>',
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
      sentAt: null,
      recipientCount: null,
      settings: null
    };

    it('should initiate newsletter sending successfully', async () => {
      const emailText = 'user1@example.com\nuser2@example.com';
      const mockValidationResult = {
        valid: 2,
        invalid: 0,
        new: 1,
        existing: 1,
        validEmails: ['user1@example.com', 'user2@example.com'],
        invalidEmails: [],
        hashedEmails: [
          { id: 'hash1', hashedEmail: 'hash1' },
          { id: 'hash2', hashedEmail: 'hash2' }
        ]
      };

      const mockSettings = {
        chunkSize: 50,
        id: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.newsletterItem.findUnique.mockResolvedValue(mockNewsletter);
      mockPrisma.newsletterItem.update.mockResolvedValue(mockNewsletter);
      mockProcessRecipientList.mockResolvedValue(mockValidationResult);
      mockGetNewsletterSettings.mockResolvedValue(mockSettings);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/send', {
        method: 'POST',
        body: JSON.stringify({ 
          newsletterId: 'newsletter-123',
          html: '<html>Newsletter content</html>',
          subject: 'Test Newsletter',
          emailText,
          settings: { chunkSize: 50 }
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.emailChunks).toBeDefined();
      expect(data.validRecipients).toBe(2);
      expect(data.newsletterId).toBe('newsletter-123');
      expect(mockProcessRecipientList).toHaveBeenCalledWith(emailText);
    });

    it('should return error when newsletter not found', async () => {
      mockPrisma.newsletterItem.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/send', {
        method: 'POST',
        body: JSON.stringify({ 
          newsletterId: 'invalid-id',
          html: '<html>Content</html>',
          subject: 'Test',
          emailText: 'user@example.com'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Newsletter not found');
    });

    it('should return validation error when newsletterId is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/send', {
        method: 'POST',
        body: JSON.stringify({ 
          html: '<html>Content</html>',
          subject: 'Test',
          emailText: 'user@example.com'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Newsletter ID is required');
    });

    it('should return validation error when html is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/send', {
        method: 'POST',
        body: JSON.stringify({ 
          newsletterId: 'newsletter-123',
          subject: 'Test',
          emailText: 'user@example.com'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Newsletter HTML content is required');
    });

    it('should return validation error when emailText is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/send', {
        method: 'POST',
        body: JSON.stringify({ 
          newsletterId: 'newsletter-123',
          html: '<html>Content</html>',
          subject: 'Test'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Email recipient list is required');
    });

    it('should allow re-sending already sent newsletter', async () => {
      const sentNewsletter = {
        ...mockNewsletter,
        status: 'sent',
        sentAt: new Date()
      };

      const mockValidationResult = {
        valid: 1,
        invalid: 0,
        new: 1,
        existing: 0,
        validEmails: ['user@example.com'],
        invalidEmails: [],
        hashedEmails: [{ id: 'hash1', hashedEmail: 'hash1' }]
      };

      const mockSettings = { chunkSize: 50, id: 1, createdAt: new Date(), updatedAt: new Date() };

      mockPrisma.newsletterItem.findUnique.mockResolvedValue(sentNewsletter);
      mockPrisma.newsletterItem.update.mockResolvedValue(sentNewsletter);
      mockProcessRecipientList.mockResolvedValue(mockValidationResult);
      mockGetNewsletterSettings.mockResolvedValue(mockSettings);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/send', {
        method: 'POST',
        body: JSON.stringify({ 
          newsletterId: 'newsletter-123',
          html: '<html>Content</html>',
          subject: 'Test',
          emailText: 'user@example.com'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockProcessRecipientList).toHaveBeenCalled();
    });

    it('should handle empty recipient list after validation', async () => {
      const mockValidationResult = {
        valid: 0,
        invalid: 2,
        new: 0,
        existing: 0,
        validEmails: [],
        invalidEmails: ['invalid1', 'invalid2'],
        hashedEmails: []
      };

      mockPrisma.newsletterItem.findUnique.mockResolvedValue(mockNewsletter);
      mockProcessRecipientList.mockResolvedValue(mockValidationResult);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/send', {
        method: 'POST',
        body: JSON.stringify({ 
          newsletterId: 'newsletter-123',
          html: '<html>Content</html>',
          subject: 'Test',
          emailText: 'invalid1\ninvalid2'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('No valid email recipients found');
    });

    it('should create appropriate chunks based on chunkSize', async () => {
      const emails = Array.from({ length: 125 }, (_, i) => `user${i}@example.com`);
      const emailText = emails.join('\n');
      
      const mockValidationResult = {
        valid: 125,
        invalid: 0,
        new: 100,
        existing: 25,
        validEmails: emails,
        invalidEmails: [],
        hashedEmails: emails.map((_, i) => ({ id: `hash${i}`, hashedEmail: `hash${i}` }))
      };

      const mockSettings = { chunkSize: 50, id: 1, createdAt: new Date(), updatedAt: new Date() };

      mockPrisma.newsletterItem.findUnique.mockResolvedValue(mockNewsletter);
      mockPrisma.newsletterItem.update.mockResolvedValue(mockNewsletter);
      mockProcessRecipientList.mockResolvedValue(mockValidationResult);
      mockGetNewsletterSettings.mockResolvedValue(mockSettings);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/send', {
        method: 'POST',
        body: JSON.stringify({ 
          newsletterId: 'newsletter-123',
          html: '<html>Content</html>',
          subject: 'Test',
          emailText,
          settings: { chunkSize: 50 }
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.emailChunks).toHaveLength(3); // 125 emails / 50 chunk size = 3 chunks
      expect(data.emailChunks[0]).toHaveLength(50);
      expect(data.emailChunks[1]).toHaveLength(50);
      expect(data.emailChunks[2]).toHaveLength(25);
      expect(data.validRecipients).toBe(125);
    });

    it('should handle malformed JSON gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/send', {
        method: 'POST',
        body: 'invalid json'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to process and send newsletter');
    });
  });
});