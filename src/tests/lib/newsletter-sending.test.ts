import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Mock external dependencies first, before imports
jest.mock('@/lib/email');
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    newsletterItem: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn()
    }
  }
}));

// Mock logger to avoid console output during tests
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

// email-hashing - uses real implementation for critical business logic
// Only external dependencies (email, database) are mocked

import { processSendingChunk, processRecipientList, getNewsletterStatus, getSentNewsletters } from '@/lib/newsletter-sending';
import { NewsletterSettings } from '@/lib/newsletter-template';
import { createTransporter, sendEmailWithTransporter } from '@/lib/email';
import prisma from '@/lib/prisma';

const mockCreateTransporter = jest.mocked(createTransporter);
const mockSendEmailWithTransporter = jest.mocked(sendEmailWithTransporter);
const mockPrisma = jest.mocked(prisma);

describe('Newsletter Sending Service', () => {
  const mockTransporter = {
    verify: jest.fn(),
    close: jest.fn(),
    sendMail: jest.fn()
  };

  const mockSettings: NewsletterSettings & { html: string; subject: string } = {
    headerLogo: '/logo.png',
    headerBanner: '/banner.png',
    footerText: 'Footer text',
    unsubscribeLink: 'https://example.com/unsubscribe',
    testEmailRecipients: ['test@example.com'],
    batchSize: 50,
    batchDelay: 1000,
    fromEmail: 'newsletter@example.com',
    fromName: 'Test Newsletter',
    replyToEmail: 'reply@example.com',
    subjectTemplate: 'Newsletter - {date}',
    emailSalt: 'test-salt',
    chunkSize: 10,
    chunkDelay: 100,
    emailTimeout: 30000,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 60000,
    maxConnections: 5,
    maxMessages: 100,
    maxRetries: 3,
    maxBackoffDelay: 10000,
    retryChunkSizes: '10,5,1',
    html: '<html>Test newsletter content</html>',
    subject: 'Test Newsletter - {date}'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockCreateTransporter.mockReturnValue(mockTransporter);
    mockTransporter.verify.mockResolvedValue(true);
    mockTransporter.close.mockImplementation(() => {});
    mockSendEmailWithTransporter.mockResolvedValue({
      success: true,
      messageId: 'test-message-id'
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('processSendingChunk', () => {
    it('should send emails in BCC mode for multiple recipients', async () => {
      const emails = ['user1@example.com', 'user2@example.com', 'user3@example.com'];
      
      const result = await processSendingChunk(
        emails,
        'newsletter-123',
        mockSettings,
        'initial'
      );

      expect(result.sentCount).toBe(3);
      expect(result.failedCount).toBe(0);
      expect(result.results).toHaveLength(3);
      expect(result.results.every(r => r.success)).toBe(true);

      // Verify BCC mode was used
      expect(mockSendEmailWithTransporter).toHaveBeenCalledWith(
        mockTransporter,
        expect.objectContaining({
          bcc: 'user1@example.com,user2@example.com,user3@example.com'
        })
      );
    });

    it('should handle SMTP connection failures with retry', async () => {
      const emails = ['user1@example.com'];
      
      mockTransporter.verify
        .mockRejectedValueOnce({ code: 'ECONNREFUSED', message: 'Connection refused' })
        .mockResolvedValueOnce(true);

      const result = await processSendingChunk(
        emails,
        'newsletter-456',
        mockSettings,
        'initial'
      );

      expect(result.sentCount).toBe(1);
      expect(mockTransporter.verify).toHaveBeenCalledTimes(2);
    });

    it('should filter out invalid emails', async () => {
      const emails = ['valid@example.com', 'invalid-email', 'another@valid.com'];

      const result = await processSendingChunk(
        emails,
        'newsletter-789',
        mockSettings,
        'retry'
      );

      expect(result.sentCount).toBe(2);
      expect(result.failedCount).toBe(1);
      expect(result.results).toHaveLength(3);

      const invalidResult = result.results.find(r => r.email === 'invalid-email');
      expect(invalidResult?.success).toBe(false);
      expect(invalidResult?.error).toBe('Invalid email address');
    });

    it('should handle email sending failures', async () => {
      const emails = ['fail@example.com'];

      mockSendEmailWithTransporter.mockResolvedValue({
        success: false,
        error: 'SMTP error'
      });

      const result = await processSendingChunk(
        emails,
        'newsletter-fail',
        mockSettings,
        'initial'
      );

      expect(result.sentCount).toBe(0);
      expect(result.failedCount).toBe(1);
      expect(result.results[0].success).toBe(false);
      expect(result.results[0].error).toBe('SMTP error');
    });

    it('should use individual mode for single email', async () => {
      const emails = ['single@example.com'];

      const result = await processSendingChunk(
        emails,
        'newsletter-single',
        mockSettings,
        'retry'
      );

      expect(result.sentCount).toBe(1);
      
      // Single email uses individual sending mode (no BCC)
      expect(mockSendEmailWithTransporter).toHaveBeenCalledWith(
        mockTransporter,
        expect.objectContaining({
          to: 'single@example.com'
        })
      );
    });

    it('should handle transporter recreation on connection errors', async () => {
      const emails = ['user1@example.com', 'user2@example.com'];

      // First send fails with connection error
      mockSendEmailWithTransporter
        .mockResolvedValueOnce({
          success: false,
          error: 'Connection lost',
          isConnectionError: true
        })
        .mockResolvedValueOnce({
          success: true
        });

      const result = await processSendingChunk(
        emails,
        'newsletter-conn',
        mockSettings,
        'initial'
      );

      expect(result.sentCount).toBe(2);
      expect(result.failedCount).toBe(0);
      expect(mockSendEmailWithTransporter).toHaveBeenCalledTimes(2);
      expect(mockTransporter.close).toHaveBeenCalled();
      expect(mockCreateTransporter).toHaveBeenCalledTimes(2); // Initial + recreation
    });
  });

  describe('processRecipientList', () => {
    it('should throw error for empty email list', async () => {
      await expect(processRecipientList('')).rejects.toThrow('Email list cannot be empty');
      await expect(processRecipientList('   ')).rejects.toThrow('Email list cannot be empty');
    });

    // Note: processRecipientList is a thin wrapper around validateAndHashEmails
    // The core validation logic is tested in email-hashing.test.ts
    // This test only verifies the error handling and interface
  });

  describe('getNewsletterStatus', () => {
    it('should return newsletter status', async () => {
      const mockNewsletter = {
        id: 'newsletter-123',
        sentAt: new Date('2024-01-01'),
        subject: 'Test Newsletter',
        recipientCount: 100,
        status: 'sent',
        settings: JSON.stringify({ test: true })
      };

      mockPrisma.newsletterItem.findUnique.mockResolvedValue(mockNewsletter);

      const result = await getNewsletterStatus('newsletter-123');

      expect(result).toEqual({
        id: 'newsletter-123',
        sentAt: mockNewsletter.sentAt,
        subject: 'Test Newsletter',
        recipientCount: 100,
        status: 'sent',
        settings: { test: true }
      });
    });

    it('should throw error for non-existent newsletter', async () => {
      mockPrisma.newsletterItem.findUnique.mockResolvedValue(null);

      await expect(getNewsletterStatus('non-existent')).rejects.toThrow('Failed to get newsletter status');
    });
  });

  describe('getSentNewsletters', () => {
    it('should return paginated sent newsletters', async () => {
      const mockNewsletters = [
        {
          id: '1',
          sentAt: new Date('2024-01-01'),
          subject: 'Newsletter 1',
          recipientCount: 50,
          status: 'sent'
        },
        {
          id: '2',
          sentAt: new Date('2024-01-02'),
          subject: 'Newsletter 2',
          recipientCount: 75,
          status: 'sent'
        }
      ];

      mockPrisma.newsletterItem.findMany.mockResolvedValue(mockNewsletters);
      mockPrisma.newsletterItem.count.mockResolvedValue(2);

      const result = await getSentNewsletters(1, 10);

      expect(result.newsletters).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.pageSize).toBe(10);
      expect(result.pagination.totalPages).toBe(1);

      expect(mockPrisma.newsletterItem.findMany).toHaveBeenCalledWith({
        where: { status: { not: 'draft' } },
        skip: 0,
        take: 10,
        orderBy: { sentAt: 'desc' }
      });
    });

    it('should handle database errors', async () => {
      mockPrisma.newsletterItem.findMany.mockRejectedValue(new Error('Database error'));
      
      await expect(getSentNewsletters(1, 10)).rejects.toThrow('Failed to get sent newsletters');
    });
  });
});