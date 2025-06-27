import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { processSendingChunk, processRecipientList, getNewsletterStatus, getSentNewsletters } from '@/lib/newsletter-sending';
import { NewsletterSettings } from '@/lib/newsletter-template';
import { createTransporter, sendEmailWithTransporter } from '@/lib/email';
import { validateEmail, cleanEmail, validateAndHashEmails } from '@/lib/email-hashing';
import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';

// Get the mocked functions
const mockCreateTransporter = jest.mocked(createTransporter);
const mockSendEmailWithTransporter = jest.mocked(sendEmailWithTransporter);
const mockValidateEmail = jest.mocked(validateEmail);
const mockCleanEmail = jest.mocked(cleanEmail);
const mockValidateAndHashEmails = jest.mocked(validateAndHashEmails);
const mockLogger = jest.mocked(logger);
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
    
    // Reset all mock functions with working implementations
    mockCreateTransporter.mockReturnValue(mockTransporter);
    mockTransporter.verify.mockResolvedValue(true);
    mockTransporter.close.mockImplementation(() => {});
    
    // Set default implementations for email functions
    mockValidateEmail.mockImplementation((email: string) => {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    });
    
    mockCleanEmail.mockImplementation((email: string) => {
      return email.trim().toLowerCase();
    });
    
    mockSendEmailWithTransporter.mockResolvedValue({
      success: true,
      messageId: 'test-message-id'
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('processSendingChunk', () => {
    it('should successfully send emails in BCC mode', async () => {
      const emails = ['user1@example.com', 'user2@example.com', 'user3@example.com'];
      
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
      expect(mockSendEmailWithTransporter).toHaveBeenCalledWith(
        mockTransporter,
        expect.objectContaining({
          to: 'Test Newsletter <newsletter@example.com>',
          bcc: 'user1@example.com,user2@example.com,user3@example.com',
          subject: expect.stringContaining('Test Newsletter -'),
          html: '<html>Test newsletter content</html>',
          from: 'Test Newsletter <newsletter@example.com>',
          replyTo: 'reply@example.com',
          settings: expect.objectContaining({
            ...mockSettings,
            chunkIndex: 0,
            totalChunks: 1
          })
        })
      );

      // Verify logging
      expect(mockLogger.info).toHaveBeenCalledWith(
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
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('BCC email sent successfully'),
        expect.objectContaining({
          module: 'newsletter-sending',
          context: expect.objectContaining({
            newsletterId: 'newsletter-123',
            recipientCount: 3,
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

      const result = await processSendingChunk(
        emails,
        'newsletter-456',
        mockSettings,
        'initial'
      );

      expect(result.sentCount).toBe(1);
      expect(mockTransporter.verify).toHaveBeenCalledTimes(2);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('SMTP verification failed'),
        expect.objectContaining({
          module: 'newsletter-sending',
          context: expect.objectContaining({
            error: 'Connection refused',
            newsletterId: 'newsletter-456',
            mode: 'initial'
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

      // Mock email cleaning to return lowercase trimmed version
      mockCleanEmail.mockImplementation((email: string) => {
        const trimmed = email.trim().toLowerCase();
        return trimmed;
      });
      
      // Mock validation to reject the invalid email
      mockValidateEmail.mockImplementation((email: string) => {
        return email.includes('@') && email.includes('.') && !email.includes('invalid-email');
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

      // Verify cleaning was applied to the uppercase email
      expect(mockCleanEmail).toHaveBeenCalledWith('  UPPER@EXAMPLE.COM  ');
      
      // Verify privacy-conscious logging for cleaned email
      expect(mockLogger.warn).toHaveBeenCalledWith(
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
      
      // Verify invalid email logging
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Filtering out invalid email address',
        expect.objectContaining({
          module: 'newsletter-sending',
          context: expect.objectContaining({
            domain: 'invalid',
            newsletterId: 'newsletter-789'
          })
        })
      );
    });

    it('should handle BCC sending failure with transporter recreation', async () => {
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

    it('should send BCC emails for multiple recipients', async () => {
      const emails = ['user1@example.com', 'user2@example.com'];

      const result = await processSendingChunk(
        emails,
        'newsletter-bcc',
        mockSettings,
        'initial'
      );

      expect(result.sentCount).toBe(2);
      expect(mockSendEmailWithTransporter).toHaveBeenCalledTimes(1); // Single BCC email
      
      // Verify BCC sending
      expect(mockSendEmailWithTransporter).toHaveBeenCalledWith(
        mockTransporter,
        expect.objectContaining({
          to: 'Test Newsletter <newsletter@example.com>',
          bcc: 'user1@example.com,user2@example.com',
          subject: expect.stringContaining('Test Newsletter -'),
          html: '<html>Test newsletter content</html>',
          from: 'Test Newsletter <newsletter@example.com>',
          replyTo: 'reply@example.com',
          settings: mockSettings
        })
      );
    });

    it('should handle complete failure of all emails', async () => {
      const emails = ['fail1@example.com', 'fail2@example.com'];

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
      expect(result.failedCount).toBe(2);
      expect(result.results.every(r => !r.success)).toBe(true);
      expect(result.results.every(r => r.error === 'SMTP error')).toBe(true);
      
      // Verify BCC mode was used (2 emails)
      expect(mockSendEmailWithTransporter).toHaveBeenCalledTimes(1);
      expect(mockSendEmailWithTransporter).toHaveBeenCalledWith(
        mockTransporter,
        expect.objectContaining({
          bcc: 'fail1@example.com,fail2@example.com'
        })
      );
    });

    it('should handle single email in individual mode', async () => {
      const emails = ['single@example.com'];

      const result = await processSendingChunk(
        emails,
        'newsletter-single',
        mockSettings,
        'retry'
      );

      expect(result.sentCount).toBe(1);
      
      // Single email uses individual sending mode
      expect(mockSendEmailWithTransporter).toHaveBeenCalledWith(
        mockTransporter,
        expect.objectContaining({
          to: 'single@example.com',
          subject: expect.stringContaining('Test Newsletter -'),
          html: '<html>Test newsletter content</html>',
          from: 'Test Newsletter <newsletter@example.com>',
          replyTo: 'reply@example.com',
          settings: mockSettings
        })
      );
    });

    it('should not log full email addresses', async () => {
      const emails = ['sensitive@private.com'];

      mockSendEmailWithTransporter.mockResolvedValue({
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
        ...mockLogger.info.mock.calls,
        ...mockLogger.warn.mock.calls,
        ...mockLogger.error.mock.calls
      ];

      // Verify no log contains the full email address
      allLogCalls.forEach(call => {
        const logMessage = JSON.stringify(call);
        expect(logMessage).not.toContain('sensitive@private.com');
      });

      // Single email goes through individual sending mode
      // Verify the email failed logging uses domain instead of full email
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Email failed',
        expect.objectContaining({
          module: 'newsletter-sending',
          context: expect.objectContaining({
            domain: 'private.com',
            newsletterId: 'newsletter-privacy'
          })
        })
      );
    });

    it('should handle transporter close errors gracefully', async () => {
      const emails = ['test@example.com'];

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
      expect(mockLogger.warn).toHaveBeenCalledWith(
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

      mockValidateAndHashEmails.mockResolvedValue(mockValidationResult);

      const result = await processRecipientList(emailText);

      expect(result).toEqual(mockValidationResult);
      expect(mockValidateAndHashEmails).toHaveBeenCalledWith(emailText);
    });

    it('should throw error for empty email list', async () => {
      await expect(processRecipientList('')).rejects.toThrow('Email list cannot be empty');
      await expect(processRecipientList('   ')).rejects.toThrow('Email list cannot be empty');
    });

    it('should handle validation errors', async () => {
      mockValidateAndHashEmails.mockRejectedValue(new Error('Validation failed'));

      await expect(processRecipientList('test@example.com')).rejects.toThrow('Failed to process recipient list');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error processing recipient list:',
        expect.objectContaining({
          context: expect.objectContaining({
            error: expect.any(Error)
          })
        })
      );
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
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error getting sent newsletters:',
        expect.objectContaining({
          context: expect.objectContaining({
            error: expect.any(Error)
          })
        })
      );
    });
  });
});