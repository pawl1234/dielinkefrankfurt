// e2e-email-notifications.test.ts - End-to-end tests for email notifications
import { sendGroupAcceptanceEmail, sendGroupRejectionEmail, sendGroupArchivingEmail, 
         sendStatusReportAcceptanceEmail, sendStatusReportRejectionEmail } from '../lib/email-senders';
import { sendEmail } from '../lib/email';
import { createMockGroup, createMockStatusReport } from './test-utils';
import { getNewsletterSettings } from '../lib/newsletter-service';

// Mock the email service
jest.mock('../lib/email', () => ({
  sendEmail: jest.fn().mockImplementation(() => Promise.resolve({ success: true, messageId: 'mock-message-id' }))
}));

// Mock email rendering
jest.mock('../lib/email-render', () => ({
  renderNotificationEmail: jest.fn().mockImplementation((templateName: string, props: any) => {
    const baseHtml = '<html><body>';
    let content = '';
    
    switch (templateName) {
      case 'GroupAcceptance':
        content = `
          <div style="padding: 20px; background-color: #ffffff;">
            <h2 style="color: #333; font-size: 18px;">Ihre Gruppe "${props.group.name}" wurde freigeschaltet</h2>
            <p style="color: #333; line-height: 1.5;">Liebe Verantwortliche der Gruppe "${props.group.name}",</p>
            <p style="color: #333; line-height: 1.5;">wir freuen uns, Ihnen mitteilen zu können, dass Ihre Gruppe nun freigeschaltet wurde.</p>
            <p style="text-align: center; margin: 20px 0;"><a href="${props.statusReportFormUrl}" style="color: #0066cc;">Statusbericht einreichen</a></p>
            <p style="color: #333; line-height: 1.5;">Mit freundlichen Grüßen,<br>Das Team von Die Linke Frankfurt</p>
          </div>
        `;
        break;
        
      case 'GroupRejection':
        content = `
          <div style="padding: 20px; background-color: #ffffff;">
            <h2 style="color: #333; font-size: 18px;">Ihre Gruppenanfrage "${props.group.name}" wurde abgelehnt</h2>
            <p style="color: #333; line-height: 1.5;">Liebe Verantwortliche der Gruppe "${props.group.name}",</p>
            <p style="color: #333; line-height: 1.5;">leider müssen wir Ihnen mitteilen, dass Ihre Gruppenanfrage wurde abgelehnt wurde.</p>
            <p style="color: #333; line-height: 1.5;">Bei Fragen wenden Sie sich bitte an: ${props.contactEmail}</p>
            <p style="color: #333; line-height: 1.5;">Mit freundlichen Grüßen,<br>Das Team von Die Linke Frankfurt</p>
          </div>
        `;
        break;
        
      case 'GroupArchiving':
        content = `
          <div style="padding: 20px; background-color: #ffffff;">
            <h2 style="color: #333; font-size: 18px;">Ihre Gruppe "${props.group.name}" wurde archiviert</h2>
            <p style="color: #333; line-height: 1.5;">Liebe Verantwortliche der Gruppe "${props.group.name}",</p>
            <p style="color: #333; line-height: 1.5;">wir informieren Sie darüber, dass Ihre Gruppe wurde archiviert wurde.</p>
            <p style="color: #333; line-height: 1.5;">Mit freundlichen Grüßen,<br>Das Team von Die Linke Frankfurt</p>
          </div>
        `;
        break;
        
      case 'StatusReportAcceptance':
        content = `
          <div style="padding: 20px; background-color: #ffffff;">
            <h2 style="color: #333; font-size: 18px;">Statusbericht "${props.statusReport.title}" wurde freigeschaltet</h2>
            <p style="color: #333; line-height: 1.5;">Lieber ${props.recipientName},</p>
            <p style="color: #333; line-height: 1.5;">Ihr Statusbericht "${props.statusReport.title}" wurde freigeschaltet wurde.</p>
            <p style="text-align: center; margin: 20px 0;"><a href="${props.reportUrl}" style="color: #0066cc;">Statusbericht ansehen</a></p>
            <p style="color: #333; line-height: 1.5;">Erstellt am: ${props.statusReport.createdAt.toLocaleDateString('de-DE')}</p>
            <p style="color: #333; line-height: 1.5;">Mit freundlichen Grüßen,<br>Das Team von Die Linke Frankfurt</p>
          </div>
        `;
        break;
        
      case 'StatusReportRejection':
        content = `
          <div style="padding: 20px; background-color: #ffffff;">
            <h2 style="color: #333; font-size: 18px;">Statusbericht "${props.statusReport.title}" wurde abgelehnt</h2>
            <p style="color: #333; line-height: 1.5;">Lieber ${props.recipientName},</p>
            <p style="color: #333; line-height: 1.5;">Ihr Statusbericht "${props.statusReport.title}" wurde abgelehnt wurde.</p>
            <p style="color: #333; line-height: 1.5;">Erstellt am: ${props.statusReport.createdAt.toLocaleDateString('de-DE')}</p>
            <p style="color: #333; line-height: 1.5;">Bei Fragen wenden Sie sich bitte an: ${props.contactEmail}</p>
            <p style="color: #333; line-height: 1.5;">Mit freundlichen Grüßen,<br>Das Team von Die Linke Frankfurt</p>
          </div>
        `;
        break;
        
      default:
        content = '<p>Mock email content</p>';
    }
    
    return Promise.resolve(baseHtml + content + '</body></html>');
  })
}));

// Mock newsletter service
jest.mock('../lib/newsletter-service', () => ({
  getNewsletterSettings: jest.fn()
}));

// Set up test environment variables
process.env.VERCEL_PROJECT_PRODUCTION_URL = 'https://test.dielinke-frankfurt.de';
process.env.CONTACT_EMAIL = 'test@dielinke-frankfurt.de';

describe('Email Notification System', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock getNewsletterSettings to return test data
    (getNewsletterSettings as jest.Mock).mockResolvedValue({
      headerLogo: 'https://test.dielinke-frankfurt.de/logo.png',
      contactEmail: 'test@dielinke-frankfurt.de'
    });
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
        name: 'Test Group',
        slug: 'test-group-group-123',
        status: 'ACTIVE',
        responsiblePersons: [
          {
            id: 'person-1',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            groupId: 'group-123'
          }
        ]
      });

      const mockReport = createMockStatusReport({
        id: 'report-123',
        title: 'Monthly Activity Update',
        status: 'ACTIVE',
        groupId: 'group-123',
        createdAt: new Date('2025-05-15T12:00:00Z')
      }, mockGroup);

      // Send acceptance email
      const result = await sendStatusReportAcceptanceEmail(mockReport);

      // Verify email was sent successfully
      expect(result.success).toBe(true);
      expect(sendEmail).toHaveBeenCalledTimes(1);

      // Verify email recipients
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'john.doe@example.com',
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
          html: expect.stringContaining('https://test.dielinke-frankfurt.de/gruppen/test-group-group-123#report-report-123')
        })
      );
    });

    it('should send rejection email with correct content when a status report is rejected', async () => {
      // Create mock group and status report
      const mockGroup = createMockGroup({
        id: 'group-123',
        name: 'Test Group',
        slug: 'test-group-group-123',
        status: 'ACTIVE',
        responsiblePersons: [
          {
            id: 'person-1',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            groupId: 'group-123'
          }
        ]
      });

      const mockReport = createMockStatusReport({
        id: 'report-123',
        title: 'Monthly Activity Update',
        status: 'REJECTED',
        groupId: 'group-123',
        createdAt: new Date('2025-05-15T12:00:00Z')
      }, mockGroup);

      // Send rejection email
      const result = await sendStatusReportRejectionEmail(mockReport);

      // Verify email was sent successfully
      expect(result.success).toBe(true);
      expect(sendEmail).toHaveBeenCalledTimes(1);

      // Verify email recipients
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'john.doe@example.com',
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
        name: 'Test Group',
        slug: 'test-group-group-123',
        status: 'ACTIVE',
        responsiblePersons: [
          {
            id: 'person-1',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            groupId: 'group-123'
          }
        ]
      });

      const mockReport = createMockStatusReport({
        id: 'report-123',
        title: 'Monthly Activity Update',
        status: 'ACTIVE',
        groupId: 'group-123',
        createdAt: new Date('2025-12-31T12:00:00Z') // New Year's Eve at noon UTC
      }, mockGroup);

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
        name: 'Test Group',
        status: 'ACTIVE',
        responsiblePersons: []
      });

      const mockReport = createMockStatusReport({
        id: 'report-123',
        title: 'Monthly Activity Update',
        status: 'ACTIVE',
        groupId: 'group-123'
      }, mockGroup);

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