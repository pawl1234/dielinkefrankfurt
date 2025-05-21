// e2e-email-notifications.test.ts - End-to-end tests for email notifications
import { sendGroupAcceptanceEmail, sendGroupRejectionEmail, sendGroupArchivingEmail, 
         sendStatusReportAcceptanceEmail, sendStatusReportRejectionEmail } from '../lib/email-notifications';
import { sendEmail } from '../lib/email';
import { createMockGroup, createMockStatusReport } from './test-utils';

// Mock the email service
jest.mock('../lib/email', () => ({
  sendEmail: jest.fn().mockImplementation(() => Promise.resolve({ success: true, messageId: 'mock-message-id' }))
}));

// Set up test environment variables
process.env.VERCEL_PROJECT_PRODUCTION_URL = 'https://test.dielinke-frankfurt.de';
process.env.CONTACT_EMAIL = 'test@dielinke-frankfurt.de';

describe('Email Notification System', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Group Email Notifications', () => {
    it('should send acceptance email with correct content when a group is activated', async () => {
      // Create a mock group
      const mockGroup = createMockGroup({
        id: 'group-123',
        name: 'Test Political Group',
        slug: 'test-political-group',
        status: 'ACTIVE',
        responsiblePersons: [
          {
            id: 'person-1',
            firstName: 'Max',
            lastName: 'Mustermann',
            email: 'max@example.com',
            groupId: 'group-123'
          },
          {
            id: 'person-2',
            firstName: 'Erika',
            lastName: 'Musterfrau',
            email: 'erika@example.com',
            groupId: 'group-123'
          }
        ]
      });

      // Send acceptance email
      const result = await sendGroupAcceptanceEmail(mockGroup);

      // Verify email was sent successfully
      expect(result.success).toBe(true);
      expect(sendEmail).toHaveBeenCalledTimes(1);

      // Verify email recipients are all responsible persons
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'max@example.com,erika@example.com',
          subject: expect.stringContaining('Test Political Group')
        })
      );

      // Verify email content contains key information
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('Test Political Group')
        })
      );
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('wurde freigeschaltet')
        })
      );
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('https://test.dielinke-frankfurt.de/gruppen-bericht')
        })
      );
    });

    it('should send rejection email with correct content when a group is rejected', async () => {
      // Create a mock group
      const mockGroup = createMockGroup({
        id: 'group-123',
        name: 'Test Political Group',
        status: 'REJECTED',
        responsiblePersons: [
          {
            id: 'person-1',
            firstName: 'Max',
            lastName: 'Mustermann',
            email: 'max@example.com',
            groupId: 'group-123'
          }
        ]
      });

      // Send rejection email
      const result = await sendGroupRejectionEmail(mockGroup);

      // Verify email was sent successfully
      expect(result.success).toBe(true);
      expect(sendEmail).toHaveBeenCalledTimes(1);

      // Verify email recipients
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'max@example.com',
          subject: expect.stringContaining('Test Political Group')
        })
      );

      // Verify email content contains key information
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('wurde abgelehnt')
        })
      );
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('test@dielinke-frankfurt.de')
        })
      );
    });

    it('should send archiving email with correct content when a group is archived', async () => {
      // Create a mock group
      const mockGroup = createMockGroup({
        id: 'group-123',
        name: 'Test Political Group',
        status: 'ARCHIVED',
        responsiblePersons: [
          {
            id: 'person-1',
            firstName: 'Max',
            lastName: 'Mustermann',
            email: 'max@example.com',
            groupId: 'group-123'
          }
        ]
      });

      // Send archiving email
      const result = await sendGroupArchivingEmail(mockGroup);

      // Verify email was sent successfully
      expect(result.success).toBe(true);
      expect(sendEmail).toHaveBeenCalledTimes(1);

      // Verify email recipients
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'max@example.com',
          subject: expect.stringContaining('Test Political Group')
        })
      );

      // Verify email content contains key information
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('wurde archiviert')
        })
      );
    });

    it('should handle errors when there are no responsible persons', async () => {
      // Create a mock group with no responsible persons
      const mockGroup = createMockGroup({
        id: 'group-123',
        name: 'Test Political Group',
        status: 'ACTIVE',
        responsiblePersons: []
      });

      // Send acceptance email
      const result = await sendGroupAcceptanceEmail(mockGroup);

      // Verify error was handled properly
      expect(result.success).toBe(false);
      expect(result.error).toBe('No responsible persons found');
      expect(sendEmail).not.toHaveBeenCalled();
    });

    it('should handle email service errors gracefully', async () => {
      // Create a mock group
      const mockGroup = createMockGroup({
        id: 'group-123',
        name: 'Test Political Group',
        status: 'ACTIVE',
        responsiblePersons: [
          {
            id: 'person-1',
            firstName: 'Max',
            lastName: 'Mustermann',
            email: 'max@example.com',
            groupId: 'group-123'
          }
        ]
      });

      // Mock email service error
      (sendEmail as jest.Mock).mockRejectedValueOnce(new Error('SMTP connection error'));

      // Attempt to send email
      const result = await sendGroupAcceptanceEmail(mockGroup);

      // Verify error was handled properly
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(sendEmail).toHaveBeenCalledTimes(1);
    });
  });

  describe('Status Report Email Notifications', () => {
    it('should send acceptance email with correct content when a status report is activated', async () => {
      // Create mock group and status report
      const mockGroup = createMockGroup({
        id: 'group-123',
        name: 'Test Political Group',
        slug: 'test-political-group',
        status: 'ACTIVE',
        responsiblePersons: [
          {
            id: 'person-1',
            firstName: 'Max',
            lastName: 'Mustermann',
            email: 'max@example.com',
            groupId: 'group-123'
          }
        ]
      });

      const mockReport = createMockStatusReport({
        id: 'report-123',
        title: 'Monthly Activity Update',
        status: 'ACTIVE',
        groupId: 'group-123',
        group: mockGroup,
        createdAt: new Date('2025-05-15T12:00:00Z')
      });

      // Send acceptance email
      const result = await sendStatusReportAcceptanceEmail(mockReport);

      // Verify email was sent successfully
      expect(result.success).toBe(true);
      expect(sendEmail).toHaveBeenCalledTimes(1);

      // Verify email recipients
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'max@example.com',
          subject: expect.stringContaining('Monthly Activity Update')
        })
      );

      // Verify email content contains key information
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('Monthly Activity Update')
        })
      );
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('wurde freigeschaltet')
        })
      );
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('https://test.dielinke-frankfurt.de/gruppen/test-political-group#report-report-123')
        })
      );
    });

    it('should send rejection email with correct content when a status report is rejected', async () => {
      // Create mock group and status report
      const mockGroup = createMockGroup({
        id: 'group-123',
        name: 'Test Political Group',
        slug: 'test-political-group',
        status: 'ACTIVE',
        responsiblePersons: [
          {
            id: 'person-1',
            firstName: 'Max',
            lastName: 'Mustermann',
            email: 'max@example.com',
            groupId: 'group-123'
          }
        ]
      });

      const mockReport = createMockStatusReport({
        id: 'report-123',
        title: 'Monthly Activity Update',
        status: 'REJECTED',
        groupId: 'group-123',
        group: mockGroup,
        createdAt: new Date('2025-05-15T12:00:00Z')
      });

      // Send rejection email
      const result = await sendStatusReportRejectionEmail(mockReport);

      // Verify email was sent successfully
      expect(result.success).toBe(true);
      expect(sendEmail).toHaveBeenCalledTimes(1);

      // Verify email recipients
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'max@example.com',
          subject: expect.stringContaining('Monthly Activity Update')
        })
      );

      // Verify email content contains key information
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('wurde abgelehnt')
        })
      );
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('test@dielinke-frankfurt.de')
        })
      );
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('15.5.2025') // German date format
        })
      );
    });

    it('should correctly format date in the email content', async () => {
      // Create mock group and status report with a specific date
      const mockGroup = createMockGroup({
        id: 'group-123',
        name: 'Test Political Group',
        slug: 'test-political-group',
        status: 'ACTIVE',
        responsiblePersons: [
          {
            id: 'person-1',
            firstName: 'Max',
            lastName: 'Mustermann',
            email: 'max@example.com',
            groupId: 'group-123'
          }
        ]
      });

      const mockReport = createMockStatusReport({
        id: 'report-123',
        title: 'Monthly Activity Update',
        status: 'ACTIVE',
        groupId: 'group-123',
        group: mockGroup,
        createdAt: new Date('2025-12-31T23:59:59Z') // New Year's Eve
      });

      // Send acceptance email
      await sendStatusReportAcceptanceEmail(mockReport);

      // Verify date format in email (should be in German format)
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('31.12.2025')
        })
      );
    });

    it('should handle errors when there are no responsible persons for the group', async () => {
      // Create mock group with no responsible persons
      const mockGroup = createMockGroup({
        id: 'group-123',
        name: 'Test Political Group',
        status: 'ACTIVE',
        responsiblePersons: []
      });

      const mockReport = createMockStatusReport({
        id: 'report-123',
        title: 'Monthly Activity Update',
        status: 'ACTIVE',
        groupId: 'group-123',
        group: mockGroup
      });

      // Send acceptance email
      const result = await sendStatusReportAcceptanceEmail(mockReport);

      // Verify error was handled properly
      expect(result.success).toBe(false);
      expect(result.error).toBe('No responsible persons found');
      expect(sendEmail).not.toHaveBeenCalled();
    });

    it('should handle email service errors for status report notifications gracefully', async () => {
      // Create mock group and status report
      const mockGroup = createMockGroup({
        id: 'group-123',
        name: 'Test Political Group',
        slug: 'test-political-group',
        status: 'ACTIVE',
        responsiblePersons: [
          {
            id: 'person-1',
            firstName: 'Max',
            lastName: 'Mustermann',
            email: 'max@example.com',
            groupId: 'group-123'
          }
        ]
      });

      const mockReport = createMockStatusReport({
        id: 'report-123',
        title: 'Monthly Activity Update',
        status: 'ACTIVE',
        groupId: 'group-123',
        group: mockGroup
      });

      // Mock email service error
      (sendEmail as jest.Mock).mockRejectedValueOnce(new Error('SMTP connection error'));

      // Attempt to send email
      const result = await sendStatusReportAcceptanceEmail(mockReport);

      // Verify error was handled properly
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(sendEmail).toHaveBeenCalledTimes(1);
    });
  });

  describe('Email Templates and Formatting', () => {
    it('should include proper HTML formatting in all email templates', async () => {
      // Create mock data
      const mockGroup = createMockGroup({
        id: 'group-123',
        name: 'Test Political Group',
        status: 'ACTIVE',
        responsiblePersons: [
          {
            id: 'person-1',
            firstName: 'Max',
            lastName: 'Mustermann',
            email: 'max@example.com',
            groupId: 'group-123'
          }
        ]
      });

      // Send emails for different notifications
      await sendGroupAcceptanceEmail(mockGroup);
      await sendGroupRejectionEmail(mockGroup);
      await sendGroupArchivingEmail(mockGroup);

      // Verify HTML structure in all emails
      const emailCalls = (sendEmail as jest.Mock).mock.calls;
      
      // Each email should have proper HTML structure
      for (const call of emailCalls) {
        const emailContent = call[0].html;
        
        // Should contain opening and closing div tags
        expect(emailContent).toMatch(/<div[^>]*>/);
        expect(emailContent).toMatch(/<\/div>/);
        
        // Should contain headings
        expect(emailContent).toMatch(/<h2>/);
        
        // Should contain paragraphs
        expect(emailContent).toMatch(/<p>/);
        
        // Should use inline styling
        expect(emailContent).toMatch(/style=/);
      }
    });

    it('should include appropriate contact information in all emails', async () => {
      // Create mock data
      const mockGroup = createMockGroup({
        id: 'group-123',
        name: 'Test Political Group',
        status: 'ACTIVE',
        responsiblePersons: [
          {
            id: 'person-1',
            firstName: 'Max',
            lastName: 'Mustermann',
            email: 'max@example.com',
            groupId: 'group-123'
          }
        ]
      });

      // Send emails for different notifications
      await sendGroupAcceptanceEmail(mockGroup);
      await sendGroupRejectionEmail(mockGroup);
      await sendGroupArchivingEmail(mockGroup);

      // Verify signature/footer in all emails
      const emailCalls = (sendEmail as jest.Mock).mock.calls;
      
      // Each email should have proper signature
      for (const call of emailCalls) {
        const emailContent = call[0].html;
        
        // Should contain signature
        expect(emailContent).toContain('Mit freundlichen Grüßen');
        expect(emailContent).toContain('Das Team von Die Linke Frankfurt');
      }
    });
  });
});