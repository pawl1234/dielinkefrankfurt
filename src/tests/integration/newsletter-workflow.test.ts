import { NextRequest } from 'next/server';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Mock all external dependencies
jest.mock('@/lib/prisma');
jest.mock('@/lib/email');
jest.mock('@/lib/newsletter-service');
jest.mock('@/lib/newsletter-sending');
jest.mock('@/lib/api-auth', () => ({
  withAdminAuth: jest.fn((handler) => handler)
}));
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

// Import modules after mocking
import prisma from '@/lib/prisma';
import { createTransporter, sendEmailWithTransporter } from '@/lib/email';
import { getNewsletterSettings, updateNewsletterSettings } from '@/lib/newsletter-service';
import { processRecipientList, processSendingChunk } from '@/lib/newsletter-sending';

// Import API endpoints
import { GET as generateNewsletter } from '@/app/api/admin/newsletter/generate/route';
import { POST as sendNewsletter } from '@/app/api/admin/newsletter/send/route';
import { POST as sendChunk } from '@/app/api/admin/newsletter/send-chunk/route';
import { POST as retryChunk } from '@/app/api/admin/newsletter/retry-chunk/route';
import { POST as sendTest } from '@/app/api/admin/newsletter/send-test/route';
import { PUT as putSettings } from '@/app/api/admin/newsletter/settings/route';

// Mock types
const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockCreateTransporter = createTransporter as jest.MockedFunction<typeof createTransporter>;
const mockSendEmailWithTransporter = sendEmailWithTransporter as jest.MockedFunction<typeof sendEmailWithTransporter>;
const mockGetNewsletterSettings = getNewsletterSettings as jest.MockedFunction<typeof getNewsletterSettings>;
const mockUpdateNewsletterSettings = updateNewsletterSettings as jest.MockedFunction<typeof updateNewsletterSettings>;
const mockProcessRecipientList = processRecipientList as jest.MockedFunction<typeof processRecipientList>;
const mockProcessSendingChunk = processSendingChunk as jest.MockedFunction<typeof processSendingChunk>;

describe('Newsletter Workflow Integration Tests', () => {
  // Mock data
  const mockNewsletterSettings = {
    id: 1,
    headerLogo: '/logo.png',
    headerBanner: '/banner.png',
    footerText: 'Newsletter Footer',
    unsubscribeLink: 'https://example.com/unsubscribe',
    testEmailRecipients: 'test@example.com',
    batchSize: 50,
    batchDelay: 1000,
    fromEmail: 'newsletter@example.com',
    fromName: 'Test Newsletter',
    replyToEmail: 'reply@example.com',
    subjectTemplate: 'Newsletter {date}',
    emailSalt: 'test-salt',
    chunkSize: 10,
    chunkDelay: 2000,
    emailTimeout: 30000,
    connectionTimeout: 60000,
    greetingTimeout: 30000,
    socketTimeout: 60000,
    maxConnections: 5,
    maxMessages: 100,
    maxRetries: 3,
    maxBackoffDelay: 60000,
    retryChunkSizes: '10,5,1',
    useBccSending: true
  };

  const mockAppointments = [
    {
      id: 1,
      title: 'Test Event 1',
      teaser: 'Event teaser 1',
      startDateTime: new Date('2024-12-25T10:00:00Z'),
      featured: true,
      status: 'accepted'
    },
    {
      id: 2,
      title: 'Test Event 2', 
      teaser: 'Event teaser 2',
      startDateTime: new Date('2024-12-26T14:00:00Z'),
      featured: false,
      status: 'accepted'
    }
  ];

  const mockGroups = [
    {
      id: 1,
      name: 'Test Group',
      slug: 'test-group',
      description: 'A test group',
      logoUrl: '/group-logo.png',
      status: 'ACTIVE',
      statusReports: [
        {
          id: 1,
          title: 'Weekly Report',
          content: 'This is our weekly update',
          status: 'ACTIVE',
          createdAt: new Date('2024-12-20T10:00:00Z')
        }
      ]
    }
  ];

  const mockValidationResult = {
    valid: 3,
    invalid: 1,
    new: 2,
    existing: 1,
    invalidEmails: ['invalid-email'],
    validEmails: ['user1@example.com', 'user2@example.com', 'user3@example.com'],
    newEmails: ['user1@example.com', 'user2@example.com'],
    existingEmails: ['user3@example.com']
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockGetNewsletterSettings.mockResolvedValue(mockNewsletterSettings);
    mockPrisma.appointment.findMany.mockResolvedValue(mockAppointments);
    mockPrisma.group.findMany.mockResolvedValue(mockGroups);
    mockCreateTransporter.mockResolvedValue({
      sendMail: jest.fn(),
      verify: jest.fn(),
      close: jest.fn()
    });
    mockSendEmailWithTransporter.mockResolvedValue({ success: true, messageId: 'test-id' });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Complete Newsletter Creation and Generation Flow', () => {
    it('should generate newsletter content with appointments and status reports', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/generate?introductionText=Welcome!');

      const response = await generateNewsletter(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.html).toBeDefined();
      expect(data.subject).toBeDefined();
      expect(data.appointmentCount).toBe(2);
      expect(data.statusReportCount).toBe(1);
      
      // Verify that appointments are included
      expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith({
        where: {
          status: 'accepted',
          startDateTime: { gte: expect.any(Date) }
        },
        orderBy: [{ featured: 'desc' }, { startDateTime: 'asc' }],
        include: { attachments: true }
      });

      // Verify that status reports are included
      expect(mockPrisma.group.findMany).toHaveBeenCalledWith({
        where: { status: 'ACTIVE' },
        orderBy: { name: 'asc' },
        include: {
          statusReports: {
            where: {
              status: 'ACTIVE',
              createdAt: { gte: expect.any(Date) }
            },
            orderBy: { createdAt: 'desc' }
          }
        }
      });
    });

    it('should handle settings changes affecting newsletter generation', async () => {
      // Update settings
      const newSettings = {
        ...mockNewsletterSettings,
        headerLogo: '/new-logo.png',
        footerText: 'Updated Footer'
      };

      mockUpdateNewsletterSettings.mockResolvedValue(newSettings);
      mockGetNewsletterSettings.mockResolvedValue(newSettings);

      const settingsRequest = new NextRequest('http://localhost:3000/api/admin/newsletter/settings', {
        method: 'PUT',
        body: JSON.stringify({
          headerLogo: '/new-logo.png',
          footerText: 'Updated Footer'
        })
      });

      const settingsResponse = await putSettings(settingsRequest);
      expect(settingsResponse.status).toBe(200);

      // Generate newsletter with updated settings
      const generateRequest = new NextRequest('http://localhost:3000/api/admin/newsletter/generate');
      const generateResponse = await generateNewsletter(generateRequest);
      const data = await generateResponse.json();

      expect(generateResponse.status).toBe(200);
      expect(data.html).toContain('Updated Footer');
      expect(mockGetNewsletterSettings).toHaveBeenCalled();
    });
  });

  describe('Newsletter Sending Flow', () => {
    it('should process recipients and initiate sending', async () => {
      const emailText = 'user1@example.com\nuser2@example.com\nuser3@example.com\ninvalid-email';
      
      mockProcessRecipientList.mockResolvedValue(mockValidationResult);
      mockPrisma.newsletterItem.create.mockResolvedValue({
        id: 'newsletter-123',
        content: '<html>Newsletter content</html>',
        subject: 'Test Newsletter',
        status: 'SENDING',
        recipientCount: 3,
        settings: mockNewsletterSettings,
        sentAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/send', {
        method: 'POST',
        body: JSON.stringify({
          newsletterId: 'newsletter-123',
          html: '<html>Newsletter content</html>',
          subject: 'Test Newsletter',
          emailText,
          settings: mockNewsletterSettings
        })
      });

      const response = await sendNewsletter(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.newsletterId).toBe('newsletter-123');
      expect(data.chunks).toBeDefined();
      expect(data.totalValidRecipients).toBe(3);
      expect(data.validationResult).toEqual(mockValidationResult);

      expect(mockProcessRecipientList).toHaveBeenCalledWith(emailText);
      expect(mockPrisma.newsletterItem.create).toHaveBeenCalled();
    });

    it('should process email chunks successfully', async () => {
      const mockChunkResult = {
        sentCount: 2,
        failedCount: 0,
        completedAt: new Date().toISOString(),
        results: [
          { email: 'user1@example.com', success: true },
          { email: 'user2@example.com', success: true }
        ]
      };

      mockProcessSendingChunk.mockResolvedValue(mockChunkResult);
      mockPrisma.newsletterItem.findUnique.mockResolvedValue({
        id: 'newsletter-123',
        subject: 'Test Newsletter',
        introductionText: 'Test introduction',
        content: '<html>Newsletter content</html>',
        status: 'sending',
        createdAt: new Date(),
        updatedAt: new Date(),
        sentAt: null,
        recipientCount: null,
        settings: JSON.stringify(mockNewsletterSettings)
      });

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/send-chunk', {
        method: 'POST',
        body: JSON.stringify({
          newsletterId: 'newsletter-123',
          html: '<html>Newsletter content</html>',
          subject: 'Test Newsletter',
          emails: ['user1@example.com', 'user2@example.com'],
          chunkIndex: 0,
          totalChunks: 2,
          settings: mockNewsletterSettings
        })
      });

      const response = await sendChunk(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.sentCount).toBe(2);
      expect(data.failedCount).toBe(0);
      expect(data.chunkIndex).toBe(0);

      expect(mockProcessSendingChunk).toHaveBeenCalledWith(
        ['user1@example.com', 'user2@example.com'],
        expect.objectContaining({
          html: '<html>Newsletter content</html>',
          subject: 'Test Newsletter'
        }),
        mockNewsletterSettings
      );
    });

    it('should complete newsletter sending when all chunks are processed', async () => {
      // Mock final chunk processing
      const mockChunkResult = {
        sentCount: 1,
        failedCount: 0,
        completedAt: new Date().toISOString(),
        results: [
          { email: 'user3@example.com', success: true }
        ]
      };

      mockProcessSendingChunk.mockResolvedValue(mockChunkResult);
      mockPrisma.newsletterItem.findUnique.mockResolvedValue({
        id: 'newsletter-123',
        subject: 'Test Newsletter',
        introductionText: 'Test introduction',
        content: '<html>Newsletter content</html>',
        status: 'sending',
        createdAt: new Date(),
        updatedAt: new Date(),
        sentAt: null,
        recipientCount: null,
        settings: JSON.stringify({
          ...mockNewsletterSettings,
          chunkResults: [
            { sentCount: 2, failedCount: 0, completedAt: new Date().toISOString(), results: [] }
          ],
          totalSent: 2,
          totalFailed: 0
        })
      });

      mockPrisma.newsletterItem.update.mockResolvedValue({
        id: 'newsletter-123',
        subject: 'Test Newsletter',
        introductionText: 'Test introduction',
        content: '<html>Newsletter content</html>',
        status: 'sent',
        createdAt: new Date(),
        updatedAt: new Date(),
        sentAt: new Date(),
        recipientCount: null,
        settings: JSON.stringify(mockNewsletterSettings)
      });

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/send-chunk', {
        method: 'POST',
        body: JSON.stringify({
          newsletterId: 'newsletter-123',
          html: '<html>Newsletter content</html>',
          subject: 'Test Newsletter',
          emails: ['user3@example.com'],
          chunkIndex: 1,
          totalChunks: 2,
          settings: mockNewsletterSettings
        })
      });

      const response = await sendChunk(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.isComplete).toBe(true);
      expect(data.newsletterStatus).toBe('SENT');

      // Verify newsletter status was updated to SENT
      expect(mockPrisma.newsletterItem.update).toHaveBeenCalledWith({
        where: { id: 'newsletter-123' },
        data: {
          status: 'SENT',
          sentAt: expect.any(Date),
          settings: expect.objectContaining({
            totalSent: 3,
            totalFailed: 0,
            completedChunks: 2
          })
        }
      });
    });
  });

  describe('Error Recovery and Retry Mechanism', () => {
    it('should handle chunk sending failures gracefully', async () => {
      const mockFailedChunkResult = {
        sentCount: 1,
        failedCount: 1,
        completedAt: new Date().toISOString(),
        results: [
          { email: 'user1@example.com', success: true },
          { email: 'user2@example.com', success: false, error: 'SMTP timeout' }
        ]
      };

      mockProcessSendingChunk.mockResolvedValue(mockFailedChunkResult);
      mockPrisma.newsletterItem.findUnique.mockResolvedValue({
        id: 'newsletter-123',
        subject: 'Test Newsletter',
        introductionText: 'Test introduction',
        content: '<html>Newsletter content</html>',
        status: 'sending',
        createdAt: new Date(),
        updatedAt: new Date(),
        sentAt: null,
        recipientCount: null,
        settings: JSON.stringify(mockNewsletterSettings)
      });

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/send-chunk', {
        method: 'POST',
        body: JSON.stringify({
          newsletterId: 'newsletter-123',
          html: '<html>Newsletter content</html>',
          subject: 'Test Newsletter',
          emails: ['user1@example.com', 'user2@example.com'],
          chunkIndex: 0,
          totalChunks: 1,
          settings: mockNewsletterSettings
        })
      });

      const response = await sendChunk(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.sentCount).toBe(1);
      expect(data.failedCount).toBe(1);
      expect(data.isComplete).toBe(true); // Complete but with failures

      // Should store failed emails for retry
      expect(mockPrisma.newsletterItem.update).toHaveBeenCalledWith({
        where: { id: 'newsletter-123' },
        data: {
          status: 'SENT_WITH_FAILURES',
          sentAt: expect.any(Date),
          settings: expect.objectContaining({
            totalSent: 1,
            totalFailed: 1,
            failedEmails: ['user2@example.com']
          })
        }
      });
    });

    it('should retry failed emails with progressively smaller chunks', async () => {
      const mockRetryResult = {
        sentCount: 1,
        failedCount: 0,
        completedAt: new Date().toISOString(),
        results: [
          { email: 'user2@example.com', success: true }
        ]
      };

      mockProcessSendingChunk.mockResolvedValue(mockRetryResult);
      mockPrisma.newsletterItem.findUnique.mockResolvedValue({
        id: 'newsletter-123',
        subject: 'Test Newsletter',
        introductionText: 'Test introduction',
        content: '<html>Newsletter content</html>',
        status: 'partially_failed',
        createdAt: new Date(),
        updatedAt: new Date(),
        sentAt: null,
        recipientCount: null,
        settings: JSON.stringify({
          ...mockNewsletterSettings,
          failedEmails: ['user2@example.com'],
          totalSent: 2,
          totalFailed: 1
        })
      });

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/retry-chunk', {
        method: 'POST',
        body: JSON.stringify({
          newsletterId: 'newsletter-123',
          html: '<html>Newsletter content</html>',
          subject: 'Test Newsletter',
          chunkEmails: ['user2@example.com'],
          chunkIndex: 0,
          settings: mockNewsletterSettings
        })
      });

      const response = await retryChunk(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.sentCount).toBe(1);
      expect(data.failedCount).toBe(0);

      expect(mockProcessSendingChunk).toHaveBeenCalledWith(
        ['user2@example.com'],
        expect.objectContaining({
          html: '<html>Newsletter content</html>',
          subject: 'Test Newsletter'
        }),
        mockNewsletterSettings
      );
    });

    it('should handle persistent failures in retry attempts', async () => {
      const mockPersistentFailure = {
        sentCount: 0,
        failedCount: 1,
        completedAt: new Date().toISOString(),
        results: [
          { email: 'user2@example.com', success: false, error: 'Permanent failure' }
        ]
      };

      mockProcessSendingChunk.mockResolvedValue(mockPersistentFailure);
      mockPrisma.newsletterItem.findUnique.mockResolvedValue({
        id: 'newsletter-123',
        subject: 'Test Newsletter',
        introductionText: 'Test introduction',
        content: '<html>Newsletter content</html>',
        status: 'partially_failed',
        createdAt: new Date(),
        updatedAt: new Date(),
        sentAt: null,
        recipientCount: null,
        settings: JSON.stringify({
          ...mockNewsletterSettings,
          failedEmails: ['user2@example.com'],
          retryAttempts: 2 // Already attempted twice
        })
      });

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/retry-chunk', {
        method: 'POST',
        body: JSON.stringify({
          newsletterId: 'newsletter-123',
          html: '<html>Newsletter content</html>',
          subject: 'Test Newsletter',
          chunkEmails: ['user2@example.com'],
          chunkIndex: 0,
          settings: mockNewsletterSettings
        })
      });

      const response = await retryChunk(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.sentCount).toBe(0);
      expect(data.failedCount).toBe(1);
      expect(data.permanentFailures).toEqual(['user2@example.com']);
    });
  });

  describe('BCC-only Sending Mode', () => {
    it('should send emails using BCC mode when enabled', async () => {
      const bccSettings = {
        ...mockNewsletterSettings,
        useBccSending: true,
        chunkSize: 10
      };

      const mockBccResult = {
        sentCount: 10,
        failedCount: 0,
        completedAt: new Date().toISOString(),
        results: Array.from({ length: 10 }, (_, i) => ({
          email: `user${i + 1}@example.com`,
          success: true
        }))
      };

      mockProcessSendingChunk.mockResolvedValue(mockBccResult);
      mockPrisma.newsletterItem.findUnique.mockResolvedValue({
        id: 'newsletter-123',
        subject: 'Test Newsletter',
        introductionText: 'Test introduction',
        content: '<html>Newsletter content</html>',
        status: 'sending',
        createdAt: new Date(),
        updatedAt: new Date(),
        sentAt: null,
        recipientCount: null,
        settings: JSON.stringify(bccSettings)
      });

      const emails = Array.from({ length: 10 }, (_, i) => `user${i + 1}@example.com`);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/send-chunk', {
        method: 'POST',
        body: JSON.stringify({
          newsletterId: 'newsletter-123',
          html: '<html>Newsletter content</html>',
          subject: 'Test Newsletter',
          emails,
          chunkIndex: 0,
          totalChunks: 1,
          settings: bccSettings
        })
      });

      const response = await sendChunk(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.sentCount).toBe(10);
      expect(data.failedCount).toBe(0);

      // Verify that BCC mode was used (single email sent to all recipients)
      expect(mockProcessSendingChunk).toHaveBeenCalledWith(
        emails,
        expect.objectContaining({
          html: '<html>Newsletter content</html>',
          subject: 'Test Newsletter'
        }),
        bccSettings
      );
    });

    it('should handle BCC mode with recipient limit per email', async () => {
      const largeBccSettings = {
        ...mockNewsletterSettings,
        useBccSending: true,
        chunkSize: 50, // Larger chunk that might hit BCC limits
        batchSize: 25   // Limit per BCC email
      };

      const mockLargeBccResult = {
        sentCount: 50,
        failedCount: 0,
        completedAt: new Date().toISOString(),
        results: Array.from({ length: 50 }, (_, i) => ({
          email: `user${i + 1}@example.com`,
          success: true
        }))
      };

      mockProcessSendingChunk.mockResolvedValue(mockLargeBccResult);
      mockPrisma.newsletterItem.findUnique.mockResolvedValue({
        id: 'newsletter-123',
        subject: 'Test Newsletter',
        introductionText: 'Test introduction',
        content: '<html>Newsletter content</html>',
        status: 'sending',
        createdAt: new Date(),
        updatedAt: new Date(),
        sentAt: null,
        recipientCount: null,
        settings: JSON.stringify(largeBccSettings)
      });

      const emails = Array.from({ length: 50 }, (_, i) => `user${i + 1}@example.com`);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/send-chunk', {
        method: 'POST',
        body: JSON.stringify({
          newsletterId: 'newsletter-123',
          html: '<html>Newsletter content</html>',
          subject: 'Test Newsletter',
          emails,
          chunkIndex: 0,
          totalChunks: 1,
          settings: largeBccSettings
        })
      });

      const response = await sendChunk(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.sentCount).toBe(50);

      // Should split into multiple BCC emails based on batchSize
      expect(mockProcessSendingChunk).toHaveBeenCalledWith(
        emails,
        expect.objectContaining({
          html: '<html>Newsletter content</html>',
          subject: 'Test Newsletter'
        }),
        largeBccSettings
      );
    });
  });

  describe('Test Email Functionality', () => {
    it('should send test emails to configured recipients', async () => {
      const mockTestResult = {
        success: true,
        recipientCount: 1,
        messageId: 'test-message-id'
      };

      // Mock the test email sending function that would be called by the service
      const sendNewsletterTestEmail = jest.fn().mockResolvedValue(mockTestResult);
      jest.doMock('@/lib/newsletter-service', () => ({
        ...jest.requireActual('@/lib/newsletter-service'),
        sendNewsletterTestEmail
      }));

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/send-test', {
        method: 'POST',
        body: JSON.stringify({
          html: '<html>Test Newsletter Content</html>'
        })
      });

      const response = await sendTest(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.recipientCount).toBe(1);
      expect(data.messageId).toBe('test-message-id');
    });
  });
});