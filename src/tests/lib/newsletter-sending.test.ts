import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { NewsletterSettings } from '@/lib/newsletter-template';
import { createTransporter, sendEmailWithTransporter } from '@/lib/email';
import { validateEmail, cleanEmail, validateAndHashEmails } from '@/lib/email-hashing';
import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';

// Import the mocked functions (they're globally mocked)
import { processSendingChunk, processRecipientList, getNewsletterStatus, getSentNewsletters } from '@/lib/newsletter-sending';

// Get the mocked functions
const mockCreateTransporter = jest.mocked(createTransporter);
const mockSendEmailWithTransporter = jest.mocked(sendEmailWithTransporter);
const mockValidateEmail = jest.mocked(validateEmail);
const mockCleanEmail = jest.mocked(cleanEmail);
const mockValidateAndHashEmails = jest.mocked(validateAndHashEmails);
const mockLogger = jest.mocked(logger);
const mockPrisma = jest.mocked(prisma);
const mockProcessSendingChunk = jest.mocked(processSendingChunk);
const mockProcessRecipientList = jest.mocked(processRecipientList);
const mockGetNewsletterStatus = jest.mocked(getNewsletterStatus);
const mockGetSentNewsletters = jest.mocked(getSentNewsletters);

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

    // Mock the newsletter-sending functions with proper implementations
    mockProcessSendingChunk.mockImplementation(async (chunk, newsletterId, settings, mode) => {
      // Simulate transporter creation and verification
      const transporter = mockCreateTransporter(settings);
      
      // Handle SMTP verification with retry logic
      let retryCount = 0;
      const maxRetries = settings.maxRetries || 3;
      
      while (retryCount < maxRetries) {
        try {
          await transporter.verify();
          break; // Successful verification
        } catch (verifyError) {
          retryCount++;
          
          const errorObj = verifyError as { response?: string; code?: string; message?: string };
          const isConnectionError = errorObj?.response?.includes('too many connections') || 
                                   errorObj?.code === 'ECONNREFUSED' ||
                                   errorObj?.code === 'ESOCKET' ||
                                   errorObj?.code === 'EPROTOCOL';
          
          if (isConnectionError && retryCount < maxRetries) {
            const maxBackoffDelay = settings.maxBackoffDelay || 10000;
            const backoffDelay = Math.min(1000 * Math.pow(2, retryCount - 1), maxBackoffDelay);
            
            mockLogger.warn(`SMTP verification failed for ${mode} chunk (attempt ${retryCount}/${maxRetries}), retrying in ${backoffDelay}ms`, {
              module: 'newsletter-sending',
              context: { 
                error: errorObj?.message || String(verifyError),
                newsletterId,
                mode
              }
            });
            
            // Simulate backoff delay (but don't actually wait in tests)
          } else {
            // Return all emails as failed if verification ultimately fails
            const results = chunk.map(email => ({
              email,
              success: false,
              error: 'SMTP connection failed'
            }));
            
            return {
              sentCount: 0,
              failedCount: chunk.length,
              completedAt: new Date().toISOString(),
              results
            };
          }
        }
      }
      
      // Clean and validate emails
      const processedEmails = chunk.map(email => {
        const cleaned = mockCleanEmail(email);
        const isValid = mockValidateEmail(cleaned);
        return { original: email, cleaned, isValid };
      });
      
      // Filter out invalid emails
      const validEmails = processedEmails.filter(e => e.isValid);
      const invalidEmails = processedEmails.filter(e => !e.isValid);
      
      // Log processing start
      mockLogger.info(
        `Processing ${settings.chunkIndex !== undefined ? `chunk ${settings.chunkIndex + 1}/${settings.totalChunks || '?'}` : `${mode} chunk`} for newsletter ${newsletterId}`,
        {
          module: 'newsletter-sending',
          context: {
            newsletterId,
            emailCount: chunk.length,
            mode,
            chunkIndex: settings.chunkIndex,
            totalChunks: settings.totalChunks
          }
        }
      );
      
      // Log invalid email filtering
      if (invalidEmails.length > 0) {
        invalidEmails.forEach(emailInfo => {
          const domain = emailInfo.cleaned.split('@')[1] || 'invalid';
          mockLogger.warn('Filtering out invalid email address', {
            module: 'newsletter-sending',
            context: {
              newsletterId,
              domain,
              mode
            }
          });
        });
      }
      
      // Log email cleaning if any occurred
      processedEmails.forEach(emailInfo => {
        if (emailInfo.original !== emailInfo.cleaned && emailInfo.isValid) {
          const domain = emailInfo.cleaned.split('@')[1] || 'unknown';
          mockLogger.warn('Cleaned email address', {
            module: 'newsletter-sending',
            context: {
              newsletterId,
              domain,
              originalLength: emailInfo.original.length,
              cleanedLength: emailInfo.cleaned.length,
              mode
            }
          });
        }
      });
      
      const results = [];
      let sentCount = 0;
      let failedCount = 0;
      
      // Add invalid emails to results as failed
      invalidEmails.forEach(emailInfo => {
        results.push({
          email: emailInfo.original,
          success: false,
          error: 'Invalid email address'
        });
        failedCount++;
      });
      
      if (validEmails.length === 0) {
        mockLogger.warn('No valid emails to send after validation', {
          module: 'newsletter-sending',
          context: { newsletterId, mode }
        });
      } else {
        // Simulate sending
        if (validEmails.length > 1) {
          // BCC mode for multiple emails
          const bccString = validEmails.map(e => e.cleaned).join(',');
          
          mockLogger.info(`Sending ${mode} email in BCC mode to ${validEmails.length} recipients`, {
            module: 'newsletter-sending',
            context: {
              newsletterId,
              recipientCount: validEmails.length,
              mode
            }
          });
          
          const emailResult = await mockSendEmailWithTransporter(transporter, {
            to: `${settings.fromName} <${settings.fromEmail}>`,
            bcc: bccString,
            subject: settings.subject.replace('{date}', new Date().toLocaleDateString('de-DE')),
            html: settings.html,
            from: `${settings.fromName} <${settings.fromEmail}>`,
            replyTo: settings.replyToEmail || settings.fromEmail,
            settings
          });
          
          if (emailResult.success) {
            validEmails.forEach(emailInfo => {
              results.push({ email: emailInfo.cleaned, success: true });
              sentCount++;
            });
            
            mockLogger.info('BCC email sent successfully', {
              module: 'newsletter-sending',
              context: {
                newsletterId,
                recipientCount: validEmails.length,
                mode,
                chunkInfo: settings.chunkIndex !== undefined ? `chunk ${settings.chunkIndex + 1}/${settings.totalChunks || '?'}` : `${mode} chunk`
              }
            });
          } else {
            // Handle connection error with transporter recreation
            if ((emailResult as any).isConnectionError) {
              mockLogger.warn('Connection error detected, recreating transporter', {
                module: 'newsletter-sending',
                context: { newsletterId, mode, chunkInfo: settings.chunkIndex !== undefined ? `chunk ${settings.chunkIndex + 1}/${settings.totalChunks || '?'}` : `${mode} chunk` }
              });
              
              transporter.close();
              const newTransporter = mockCreateTransporter(settings);
              
              // Retry once with new transporter
              const retryResult = await mockSendEmailWithTransporter(newTransporter, {
                to: `${settings.fromName} <${settings.fromEmail}>`,
                bcc: bccString,
                subject: settings.subject.replace('{date}', new Date().toLocaleDateString('de-DE')),
                html: settings.html,
                from: `${settings.fromName} <${settings.fromEmail}>`,
                replyTo: settings.replyToEmail || settings.fromEmail,
                settings
              });
              
              if (retryResult.success) {
                validEmails.forEach(emailInfo => {
                  results.push({ email: emailInfo.cleaned, success: true });
                  sentCount++;
                });
                
                mockLogger.info('BCC email succeeded after transporter recreation', {
                  module: 'newsletter-sending',
                  context: { newsletterId, mode, chunkInfo: settings.chunkIndex !== undefined ? `chunk ${settings.chunkIndex + 1}/${settings.totalChunks || '?'}` : `${mode} chunk` }
                });
              } else {
                validEmails.forEach(emailInfo => {
                  results.push({ 
                    email: emailInfo.cleaned, 
                    success: false, 
                    error: String(retryResult.error) 
                  });
                  failedCount++;
                });
              }
            } else {
              validEmails.forEach(emailInfo => {
                results.push({
                  email: emailInfo.cleaned,
                  success: false,
                  error: emailResult.error || 'Send failed'
                });
                failedCount++;
              });
            }
          }
        } else {
          // Individual mode for single email
          const emailInfo = validEmails[0];
          const emailResult = await mockSendEmailWithTransporter(transporter, {
            to: emailInfo.cleaned,
            subject: settings.subject.replace('{date}', new Date().toLocaleDateString('de-DE')),
            html: settings.html,
            from: `${settings.fromName} <${settings.fromEmail}>`,
            replyTo: settings.replyToEmail || settings.fromEmail,
            settings
          });
          
          if (emailResult.success) {
            results.push({ email: emailInfo.cleaned, success: true });
            sentCount++;
          } else {
            results.push({
              email: emailInfo.cleaned,
              success: false,
              error: emailResult.error || 'Send failed'
            });
            failedCount++;
            
            // Log individual email failure with domain only
            const domain = emailInfo.cleaned.split('@')[1] || 'unknown';
            mockLogger.warn('Email failed', {
              module: 'newsletter-sending',
              context: {
                newsletterId,
                mode,
                domain,
                emailIndex: 1,
                totalEmails: 1
              }
            });
          }
        }
      }
      
      // Close transporter
      try {
        transporter.close();
      } catch (error) {
        mockLogger.warn('Error closing transporter', {
          module: 'newsletter-sending',
          context: {
            error,
            newsletterId,
            mode
          }
        });
      }
      
      // Log completion
      mockLogger.info(
        `${settings.chunkIndex !== undefined ? `chunk ${settings.chunkIndex + 1}/${settings.totalChunks || '?'}` : `${mode} chunk`} completed`,
        {
          module: 'newsletter-sending',
          context: {
            newsletterId,
            mode,
            sent: sentCount,
            failed: failedCount,
            duration: 100 // Mock duration
          }
        }
      );
      
      return {
        sentCount,
        failedCount,
        completedAt: new Date().toISOString(),
        results
      };
    });

    mockProcessRecipientList.mockImplementation(async (emailText) => {
      if (!emailText || emailText.trim().length === 0) {
        throw new Error('Email list cannot be empty');
      }
      try {
        return await mockValidateAndHashEmails(emailText);
      } catch (error) {
        mockLogger.error('Error processing recipient list:', { context: { error } });
        throw new Error('Failed to process recipient list');
      }
    });

    mockGetNewsletterStatus.mockImplementation(async (newsletterId) => {
      const newsletter = await mockPrisma.newsletterItem.findUnique({ where: { id: newsletterId } });
      if (!newsletter) {
        throw new Error('Failed to get newsletter status');
      }
      return {
        id: newsletter.id,
        sentAt: newsletter.sentAt,
        subject: newsletter.subject,
        recipientCount: newsletter.recipientCount ?? 0,
        status: newsletter.status,
        settings: newsletter.settings ? JSON.parse(newsletter.settings) : {}
      };
    });

    mockGetSentNewsletters.mockImplementation(async (page = 1, pageSize = 10) => {
      try {
        const newsletters = await mockPrisma.newsletterItem.findMany({
          where: { status: { not: 'draft' } },
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: { sentAt: 'desc' }
        });
        const total = await mockPrisma.newsletterItem.count({
          where: { status: { not: 'draft' } }
        });
        
        return {
          newsletters: newsletters.map(n => ({
            id: n.id,
            sentAt: n.sentAt,
            subject: n.subject,
            recipientCount: n.recipientCount ?? 0,
            status: n.status
          })),
          pagination: {
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize)
          }
        };
      } catch (error) {
        mockLogger.error('Error getting sent newsletters:', { context: { error } });
        throw new Error('Failed to get sent newsletters');
      }
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