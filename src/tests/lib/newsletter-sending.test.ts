import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { processSendingChunk, processRecipientList, getNewsletterStatus, getSentNewsletters } from '@/lib/newsletter-sending';
import { NewsletterSettings } from '@/lib/newsletter-template';

// Mock dependencies
jest.mock('@/lib/email-hashing', () => ({
  validateEmail: jest.fn((email: string) => {
    // Simple email validation for tests
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }),
  cleanEmail: jest.fn((email: string) => {
    // Simple cleaning for tests
    return email.trim().toLowerCase();
  }),
  validateAndHashEmails: jest.fn()
}));

jest.mock('@/lib/email', () => ({
  createTransporter: jest.fn(() => ({
    verify: jest.fn(),
    close: jest.fn(),
    sendMail: jest.fn()
  })),
  sendEmailWithTransporter: jest.fn()
}));

jest.mock('@/lib/newsletter-service', () => ({
  getNewsletterSettings: jest.fn()
}));

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

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

// Import after mocking
import { createTransporter, sendEmailWithTransporter } from '@/lib/email';
import { validateEmail, cleanEmail, validateAndHashEmails } from '@/lib/email-hashing';
import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';

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
    (createTransporter as jest.Mock).mockReturnValue(mockTransporter);
    mockTransporter.verify.mockResolvedValue(true);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('processSendingChunk', () => {
    it('should successfully send emails in BCC mode', async () => {
      const emails = ['user1@example.com', 'user2@example.com', 'user3@example.com'];
      
      (sendEmailWithTransporter as jest.Mock).mockResolvedValue({
        success: true,
        messageId: 'test-message-id'
      });

      const result = await processSendingChunk(
        emails,
        'newsletter-123',
        { ...mockSettings, chunkIndex: 0, totalChunks: 1 },
        'initial'
      );

      expect(result.sentCount).toBe(3);
      expect(result.failedCount).toBe(0);
      expect(result.results).toHaveLength(3);
      expect(result.results.every(r => r.success)).toBe(true);

      // Verify BCC sending was used
      expect(sendEmailWithTransporter).toHaveBeenCalledWith(
        mockTransporter,
        expect.objectContaining({
          to: 'Test Newsletter <newsletter@example.com>',
          bcc: 'user1@example.com,user2@example.com,user3@example.com',
          subject: expect.stringContaining('Test Newsletter -'),
          html: '<html>Test newsletter content</html>'
        })
      );

      // Verify logging
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Processing chunk 1/1'),
        expect.objectContaining({
          module: 'newsletter-sending',
          context: expect.objectContaining({
            newsletterId: 'newsletter-123',
            emailCount: 3,
            mode: 'initial'
          })
        })
      );
    });

    it('should handle SMTP connection failures with retry', async () => {
      const emails = ['user1@example.com'];
      
      // First verification fails with connection error
      mockTransporter.verify
        .mockRejectedValueOnce({ code: 'ECONNREFUSED', message: 'Connection refused' })
        .mockResolvedValueOnce(true);

      (sendEmailWithTransporter as jest.Mock).mockResolvedValue({
        success: true
      });

      const result = await processSendingChunk(
        emails,
        'newsletter-456',
        mockSettings,
        'initial'
      );

      expect(result.sentCount).toBe(1);
      expect(mockTransporter.verify).toHaveBeenCalledTimes(2);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('SMTP verification failed'),
        expect.objectContaining({
          module: 'newsletter-sending',
          context: expect.objectContaining({
            error: 'Connection refused'
          })
        })
      );
    });

    it('should handle email validation and cleaning', async () => {
      const emails = [
        'valid@example.com',
        '  UPPER@EXAMPLE.COM  ', // Should be cleaned
        'invalid-email',          // Should be filtered out
        'another@valid.com'
      ];

      (cleanEmail as jest.Mock).mockImplementation((email: string) => email.trim().toLowerCase());
      (validateEmail as jest.Mock).mockImplementation((email: string) => {
        return email.includes('@') && email.includes('.');
      });

      (sendEmailWithTransporter as jest.Mock).mockResolvedValue({
        success: true
      });

      const result = await processSendingChunk(
        emails,
        'newsletter-789',
        mockSettings,
        'retry'
      );

      expect(result.sentCount).toBe(3); // 3 valid emails
      expect(result.failedCount).toBe(1); // 1 invalid email
      expect(result.results).toHaveLength(4);

      // Check that invalid email was marked as failed
      const invalidResult = result.results.find(r => r.email === 'invalid-email');
      expect(invalidResult?.success).toBe(false);
      expect(invalidResult?.error).toBe('Invalid email address');

      // Verify cleaning was applied
      expect(cleanEmail).toHaveBeenCalledWith('  UPPER@EXAMPLE.COM  ');
      
      // Verify privacy-conscious logging
      expect(logger.warn).toHaveBeenCalledWith(
        'Cleaned email address',
        expect.objectContaining({
          module: 'newsletter-sending',
          context: expect.objectContaining({
            domain: 'example.com',
            originalLength: 21,
            cleanedLength: 17
          })
        })
      );
    });

    it('should handle BCC sending failure with transporter recreation', async () => {
      const emails = ['user1@example.com', 'user2@example.com'];

      // First send fails with connection error
      (sendEmailWithTransporter as jest.Mock)
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
      expect(sendEmailWithTransporter).toHaveBeenCalledTimes(2);
      expect(mockTransporter.close).toHaveBeenCalled();
      expect(createTransporter).toHaveBeenCalledTimes(2); // Initial + recreation
    });

    it('should send BCC emails for multiple recipients', async () => {
      const emails = ['user1@example.com', 'user2@example.com'];

      (sendEmailWithTransporter as jest.Mock).mockResolvedValue({
        success: true
      });

      const result = await processSendingChunk(
        emails,
        'newsletter-bcc',
        mockSettings,
        'initial'
      );

      expect(result.sentCount).toBe(2);
      expect(sendEmailWithTransporter).toHaveBeenCalledTimes(1); // Single BCC email
      
      // Verify BCC sending
      expect(sendEmailWithTransporter).toHaveBeenCalledWith(
        mockTransporter,
        expect.objectContaining({
          to: 'Test Newsletter <newsletter@example.com>',
          bcc: 'user1@example.com,user2@example.com'
        })
      );
    });

    it('should handle complete failure of all emails', async () => {
      const emails = ['fail1@example.com', 'fail2@example.com'];

      (sendEmailWithTransporter as jest.Mock).mockResolvedValue({
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
      expect(result.failedCount).toBe(2);
      expect(result.results.every(r => !r.success)).toBe(true);
      expect(result.results.every(r => r.error === 'SMTP error')).toBe(true);
    });

    it('should handle single email in individual mode', async () => {
      const emails = ['single@example.com'];

      (sendEmailWithTransporter as jest.Mock).mockResolvedValue({
        success: true
      });

      const result = await processSendingChunk(
        emails,
        'newsletter-single',
        mockSettings,
        'retry'
      );

      expect(result.sentCount).toBe(1);
      
      // Single email uses individual sending mode
      expect(sendEmailWithTransporter).toHaveBeenCalledWith(
        mockTransporter,
        expect.objectContaining({
          to: 'single@example.com',
          bcc: undefined
        })
      );
    });

    it('should not log full email addresses', async () => {
      const emails = ['sensitive@private.com'];

      (sendEmailWithTransporter as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Failed'
      });

      await processSendingChunk(
        emails,
        'newsletter-privacy',
        mockSettings,
        'initial'
      );

      // Check all log calls
      const allLogCalls = [
        ...(logger.info as jest.Mock).mock.calls,
        ...(logger.warn as jest.Mock).mock.calls,
        ...(logger.error as jest.Mock).mock.calls
      ];

      // Verify no log contains the full email address
      allLogCalls.forEach(call => {
        const logMessage = JSON.stringify(call);
        expect(logMessage).not.toContain('sensitive@private.com');
      });

      // Verify domain is logged instead
      expect(logger.warn).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          module: 'newsletter-sending',
          context: expect.objectContaining({
            domain: 'private.com'
          })
        })
      );
    });

    it('should handle transporter close errors gracefully', async () => {
      const emails = ['test@example.com'];

      (sendEmailWithTransporter as jest.Mock).mockResolvedValue({
        success: true
      });

      mockTransporter.close.mockImplementation(() => {
        throw new Error('Close failed');
      });

      const result = await processSendingChunk(
        emails,
        'newsletter-close-error',
        mockSettings,
        'initial'
      );

      expect(result.sentCount).toBe(1);
      expect(logger.warn).toHaveBeenCalledWith(
        'Error closing transporter',
        expect.objectContaining({
          module: 'newsletter-sending',
          context: expect.objectContaining({
            error: expect.any(Error)
          })
        })
      );
    });
  });

  describe('processRecipientList', () => {
    it('should process valid email list', async () => {
      const emailText = 'user1@example.com\nuser2@example.com\nuser3@example.com';
      const mockValidationResult = {
        validEmails: ['user1@example.com', 'user2@example.com', 'user3@example.com'],
        invalidEmails: [],
        totalProcessed: 3,
        validCount: 3,
        invalidCount: 0
      };

      (validateAndHashEmails as jest.Mock).mockResolvedValue(mockValidationResult);

      const result = await processRecipientList(emailText);

      expect(result).toEqual(mockValidationResult);
      expect(validateAndHashEmails).toHaveBeenCalledWith(emailText);
    });

    it('should throw error for empty email list', async () => {
      await expect(processRecipientList('')).rejects.toThrow('Email list cannot be empty');
      await expect(processRecipientList('   ')).rejects.toThrow('Email list cannot be empty');
    });

    it('should handle validation errors', async () => {
      (validateAndHashEmails as jest.Mock).mockRejectedValue(new Error('Validation failed'));

      await expect(processRecipientList('test@example.com')).rejects.toThrow('Failed to process recipient list');
      expect(logger.error).toHaveBeenCalled();
    });
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

      (prisma.newsletterItem.findUnique as jest.Mock).mockResolvedValue(mockNewsletter);

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
      (prisma.newsletterItem.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(getNewsletterStatus('non-existent')).rejects.toThrow('Newsletter not found');
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

      (prisma.newsletterItem.findMany as jest.Mock).mockResolvedValue(mockNewsletters);
      (prisma.newsletterItem.count as jest.Mock).mockResolvedValue(2);

      const result = await getSentNewsletters(1, 10);

      expect(result).toEqual({
        newsletters: mockNewsletters.map(n => ({
          id: n.id,
          sentAt: n.sentAt,
          subject: n.subject,
          recipientCount: n.recipientCount,
          status: n.status
        })),
        pagination: {
          total: 2,
          page: 1,
          pageSize: 10,
          totalPages: 1
        }
      });

      expect(prisma.newsletterItem.findMany).toHaveBeenCalledWith({
        where: { status: { not: 'draft' } },
        skip: 0,
        take: 10,
        orderBy: { sentAt: 'desc' }
      });
    });
  });
});