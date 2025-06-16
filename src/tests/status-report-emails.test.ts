import { sendEmail } from '../lib/email';
import { updateStatusReportStatus, sendStatusReportAcceptanceEmail, sendStatusReportRejectionEmail, sendStatusReportArchivingEmail } from '../lib/group-handlers';
import prisma from '../lib/prisma';

// Mock the dependencies
jest.mock('../lib/email', () => ({
  sendEmail: jest.fn().mockImplementation(() => Promise.resolve({ success: true, messageId: 'mock-message-id' }))
}));

jest.mock('../lib/prisma', () => ({
  statusReport: {
    update: jest.fn()
  },
  $disconnect: jest.fn(),
}));

// Mock environment variables
process.env.VERCEL_PROJECT_PRODUCTION_URL = 'https://test.example.com';
process.env.CONTACT_EMAIL = 'test@example.com';

describe('Status Report Email Notifications', () => {
  // Define mock data
  const mockStatusReport = {
    id: 'report-1',
    title: 'Monthly Update',
    content: 'This is a test report content',
    reporterFirstName: 'John',
    reporterLastName: 'Doe',
    status: 'NEW',
    fileUrls: JSON.stringify(['https://example.com/file1.pdf', 'https://example.com/file2.jpg']),
    groupId: 'group-1',
    createdAt: new Date('2025-05-15T12:00:00Z'),
    updatedAt: new Date('2025-05-15T12:00:00Z'),
    group: {
      id: 'group-1',
      name: 'Test Group',
      slug: 'test-group',
      description: 'A test group',
      status: 'ACTIVE',
      responsiblePersons: [
        {
          id: 'person-1',
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
          groupId: 'group-1'
        },
        {
          id: 'person-2',
          firstName: 'Alex',
          lastName: 'Johnson',
          email: 'alex@example.com',
          groupId: 'group-1'
        }
      ]
    }
  };

  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.statusReport.update as jest.Mock).mockResolvedValue(mockStatusReport);
  });

  describe('updateStatusReportStatus', () => {
    it('should call sendStatusReportAcceptanceEmail when status is ACTIVE', async () => {
      // Arrange
      const spy = jest.spyOn(global.console, 'log').mockImplementation();
      const statusSpy = jest.spyOn(global as unknown as { sendStatusReportAcceptanceEmail: () => Promise<{ success: boolean }> }, 'sendStatusReportAcceptanceEmail').mockResolvedValue({ success: true });
      
      // Act
      await updateStatusReportStatus('report-1', 'ACTIVE');
      
      // Assert
      expect(prisma.statusReport.update).toHaveBeenCalledWith({
        where: { id: 'report-1' },
        data: { status: 'ACTIVE' },
        include: {
          group: {
            include: {
              responsiblePersons: true
            }
          }
        }
      });
      expect(sendEmail).toHaveBeenCalled();
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('Status report acceptance email sent'));
      
      spy.mockRestore();
      statusSpy.mockRestore();
    });

    it('should call sendStatusReportRejectionEmail when status is REJECTED', async () => {
      // Arrange
      const spy = jest.spyOn(global.console, 'log').mockImplementation();
      const statusSpy = jest.spyOn(global as unknown as { sendStatusReportRejectionEmail: () => Promise<{ success: boolean }> }, 'sendStatusReportRejectionEmail').mockResolvedValue({ success: true });
      
      // Act
      await updateStatusReportStatus('report-1', 'REJECTED');
      
      // Assert
      expect(prisma.statusReport.update).toHaveBeenCalledWith({
        where: { id: 'report-1' },
        data: { status: 'REJECTED' },
        include: {
          group: {
            include: {
              responsiblePersons: true
            }
          }
        }
      });
      expect(sendEmail).toHaveBeenCalled();
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('Status report rejection email sent'));
      
      spy.mockRestore();
      statusSpy.mockRestore();
    });

    it('should call sendStatusReportArchivingEmail when status is ARCHIVED', async () => {
      // Arrange
      const spy = jest.spyOn(global.console, 'log').mockImplementation();
      const statusSpy = jest.spyOn(global as unknown as { sendStatusReportArchivingEmail: () => Promise<{ success: boolean }> }, 'sendStatusReportArchivingEmail').mockResolvedValue({ success: true });
      
      // Act
      await updateStatusReportStatus('report-1', 'ARCHIVED');
      
      // Assert
      expect(prisma.statusReport.update).toHaveBeenCalledWith({
        where: { id: 'report-1' },
        data: { status: 'ARCHIVED' },
        include: {
          group: {
            include: {
              responsiblePersons: true
            }
          }
        }
      });
      expect(sendEmail).toHaveBeenCalled();
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('Status report archiving email sent'));
      
      spy.mockRestore();
      statusSpy.mockRestore();
    });
  });

  describe('sendStatusReportAcceptanceEmail', () => {
    it('should send an email with the correct content for ACTIVE status', async () => {
      // Act
      await sendStatusReportAcceptanceEmail(mockStatusReport as Parameters<typeof sendStatusReportAcceptanceEmail>[0]);
      
      // Assert
      expect(sendEmail).toHaveBeenCalledWith({
        to: 'jane@example.com,alex@example.com',
        subject: 'Statusbericht "Monthly Update" wurde freigeschaltet',
        html: expect.stringContaining('Monthly Update')
      });
      
      expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({
        html: expect.stringContaining('https://test.example.com/gruppen/test-group#report-report-1')
      }));
      
      expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({
        html: expect.stringContaining('15.05.2025') // German date format
      }));
    });
    
    it('should handle groups with no responsible persons', async () => {
      // Arrange
      const reportWithNoResponsible = {
        ...mockStatusReport,
        group: {
          ...mockStatusReport.group,
          responsiblePersons: []
        }
      };
      
      // Act
      const result = await sendStatusReportAcceptanceEmail(reportWithNoResponsible as Parameters<typeof sendStatusReportAcceptanceEmail>[0]);
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('No responsible persons found');
      expect(sendEmail).not.toHaveBeenCalled();
    });
  });

  describe('sendStatusReportRejectionEmail', () => {
    it('should send an email with the correct content for REJECTED status', async () => {
      // Act
      await sendStatusReportRejectionEmail(mockStatusReport as Parameters<typeof sendStatusReportRejectionEmail>[0]);
      
      // Assert
      expect(sendEmail).toHaveBeenCalledWith({
        to: 'jane@example.com,alex@example.com',
        subject: 'Ihr Statusbericht "Monthly Update" wurde abgelehnt',
        html: expect.stringContaining('Monthly Update')
      });
      
      expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({
        html: expect.stringContaining('test@example.com')
      }));
    });
  });

  describe('sendStatusReportArchivingEmail', () => {
    it('should send an email with the correct content for ARCHIVED status', async () => {
      // Act
      await sendStatusReportArchivingEmail(mockStatusReport as Parameters<typeof sendStatusReportArchivingEmail>[0]);
      
      // Assert
      expect(sendEmail).toHaveBeenCalledWith({
        to: 'jane@example.com,alex@example.com',
        subject: 'Ihr Statusbericht "Monthly Update" wurde archiviert',
        html: expect.stringContaining('Monthly Update')
      });
      
      expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({
        html: expect.stringContaining('file1.pdf')
      }));
      
      expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({
        html: expect.stringContaining('file2.jpg')
      }));
    });
    
    it('should handle invalid fileUrls JSON', async () => {
      // Arrange
      const reportWithInvalidFileUrls = {
        ...mockStatusReport,
        fileUrls: 'invalid-json'
      };
      
      // Act
      await sendStatusReportArchivingEmail(reportWithInvalidFileUrls as Parameters<typeof sendStatusReportArchivingEmail>[0]);
      
      // Assert
      expect(sendEmail).toHaveBeenCalled();
      // Should not have file list but still send the email
      expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({
        html: expect.not.stringContaining('Angehängte Dateien')
      }));
    });
  });
});