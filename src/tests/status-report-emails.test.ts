// Mock dependencies - must be done before imports
jest.mock('../lib/email', () => ({
  sendEmail: jest.fn().mockImplementation(() => Promise.resolve({ success: true, messageId: 'mock-message-id' }))
}));

jest.mock('../lib/prisma', () => ({
  statusReport: {
    update: jest.fn()
  },
  $disconnect: jest.fn(),
}));

jest.mock('../lib/base-url', () => ({
  getBaseUrl: jest.fn(() => 'https://test.example.com')
}));

// Mock environment variables
process.env.VERCEL_PROJECT_PRODUCTION_URL = 'https://test.example.com';
process.env.CONTACT_EMAIL = 'test@example.com';

import { sendEmail } from '../lib/email';
import { 
  updateStatusReportStatus, 
  sendStatusReportAcceptanceEmail, 
  sendStatusReportRejectionEmail, 
  sendStatusReportArchivingEmail 
} from '../lib/group-handlers';
import prisma from '../lib/prisma';
import { StatusReport, Group, ResponsiblePerson, StatusReportStatus } from '@prisma/client';

// Get mocked functions
const mockSendEmail = sendEmail as jest.MockedFunction<typeof sendEmail>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

// Type for status report with group and responsible persons
type StatusReportWithGroup = StatusReport & {
  group: Group & {
    responsiblePersons: ResponsiblePerson[];
  };
};

describe('Status Report Email Notifications', () => {
  // Define mock data
  const mockStatusReport: StatusReportWithGroup = {
    id: 'report-1',
    title: 'Monthly Update',
    content: 'This is a test report content',
    reporterFirstName: 'John',
    reporterLastName: 'Doe',
    status: 'NEW' as StatusReportStatus,
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
      logoUrl: null,
      metadata: null,
      createdAt: new Date('2025-05-15T12:00:00Z'),
      updatedAt: new Date('2025-05-15T12:00:00Z'),
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
    mockPrisma.statusReport.update.mockResolvedValue(mockStatusReport);
  });

  describe('updateStatusReportStatus', () => {
    it('should update status to ACTIVE and send acceptance email', async () => {
      // Arrange
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      // Act
      await updateStatusReportStatus('report-1', 'ACTIVE');
      
      // Assert
      expect(mockPrisma.statusReport.update).toHaveBeenCalledWith({
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
      
      expect(mockSendEmail).toHaveBeenCalledWith({
        to: 'jane@example.com,alex@example.com',
        subject: 'Statusbericht "Monthly Update" wurde freigeschaltet',
        html: expect.stringContaining('Monthly Update')
      });
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Status report acceptance email sent'));
      
      consoleSpy.mockRestore();
    });

    it('should update status to REJECTED and send rejection email', async () => {
      // Arrange
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      // Act
      await updateStatusReportStatus('report-1', 'REJECTED');
      
      // Assert
      expect(mockPrisma.statusReport.update).toHaveBeenCalledWith({
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
      
      expect(mockSendEmail).toHaveBeenCalledWith({
        to: 'jane@example.com,alex@example.com',
        subject: 'Ihr Statusbericht "Monthly Update" wurde abgelehnt',
        html: expect.stringContaining('Monthly Update')
      });
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Status report rejection email sent'));
      
      consoleSpy.mockRestore();
    });

    it('should update status to ARCHIVED and send archiving email', async () => {
      // Arrange
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      // Act
      await updateStatusReportStatus('report-1', 'ARCHIVED');
      
      // Assert
      expect(mockPrisma.statusReport.update).toHaveBeenCalledWith({
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
      
      expect(mockSendEmail).toHaveBeenCalledWith({
        to: 'jane@example.com,alex@example.com',
        subject: 'Ihr Statusbericht "Monthly Update" wurde archiviert',
        html: expect.stringContaining('Monthly Update')
      });
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Status report archiving email sent'));
      
      consoleSpy.mockRestore();
    });

    it('should continue if email sending fails', async () => {
      // Arrange
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockSendEmail.mockRejectedValueOnce(new Error('Email sending failed'));
      
      // Act
      const result = await updateStatusReportStatus('report-1', 'ACTIVE');
      
      // Assert
      expect(result).toEqual(mockStatusReport);
      // Should log the email error from the email function, not the wrapper function
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error sending status report acceptance email:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('sendStatusReportAcceptanceEmail', () => {
    it('should send an email with the correct content for ACTIVE status', async () => {
      // Act
      const result = await sendStatusReportAcceptanceEmail(mockStatusReport);
      
      // Assert
      expect(result.success).toBe(true);
      expect(mockSendEmail).toHaveBeenCalledWith({
        to: 'jane@example.com,alex@example.com',
        subject: 'Statusbericht "Monthly Update" wurde freigeschaltet',
        html: expect.stringContaining('Monthly Update')
      });
      
      expect(mockSendEmail).toHaveBeenCalledWith(expect.objectContaining({
        html: expect.stringContaining('https://test.example.com/gruppen/test-group#report-report-1')
      }));
      
      expect(mockSendEmail).toHaveBeenCalledWith(expect.objectContaining({
        html: expect.stringContaining('15.5.2025') // German date format without leading zero
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
      const result = await sendStatusReportAcceptanceEmail(reportWithNoResponsible);
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('No responsible persons found');
      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it('should handle email sending errors gracefully', async () => {
      // Arrange
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockSendEmail.mockRejectedValueOnce(new Error('SMTP error'));
      
      // Act
      const result = await sendStatusReportAcceptanceEmail(mockStatusReport);
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error sending status report acceptance email:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('sendStatusReportRejectionEmail', () => {
    it('should send an email with the correct content for REJECTED status', async () => {
      // Act
      const result = await sendStatusReportRejectionEmail(mockStatusReport);
      
      // Assert
      expect(result.success).toBe(true);
      expect(mockSendEmail).toHaveBeenCalledWith({
        to: 'jane@example.com,alex@example.com',
        subject: 'Ihr Statusbericht "Monthly Update" wurde abgelehnt',
        html: expect.stringContaining('Monthly Update')
      });
      
      expect(mockSendEmail).toHaveBeenCalledWith(expect.objectContaining({
        html: expect.stringContaining('test@example.com')
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
      const result = await sendStatusReportRejectionEmail(reportWithNoResponsible);
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('No responsible persons found');
      expect(mockSendEmail).not.toHaveBeenCalled();
    });
  });

  describe('sendStatusReportArchivingEmail', () => {
    it('should send an email with the correct content for ARCHIVED status', async () => {
      // Act
      const result = await sendStatusReportArchivingEmail(mockStatusReport);
      
      // Assert
      expect(result.success).toBe(true);
      expect(mockSendEmail).toHaveBeenCalledWith({
        to: 'jane@example.com,alex@example.com',
        subject: 'Ihr Statusbericht "Monthly Update" wurde archiviert',
        html: expect.stringContaining('Monthly Update')
      });
      
      expect(mockSendEmail).toHaveBeenCalledWith(expect.objectContaining({
        html: expect.stringContaining('file1.pdf')
      }));
      
      expect(mockSendEmail).toHaveBeenCalledWith(expect.objectContaining({
        html: expect.stringContaining('file2.jpg')
      }));
    });
    
    it('should handle invalid fileUrls JSON', async () => {
      // Arrange
      const reportWithInvalidFileUrls = {
        ...mockStatusReport,
        fileUrls: 'invalid-json'
      };
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Act
      const result = await sendStatusReportArchivingEmail(reportWithInvalidFileUrls);
      
      // Assert
      expect(result.success).toBe(true);
      expect(mockSendEmail).toHaveBeenCalled();
      // Should not have file list but still send the email
      expect(mockSendEmail).toHaveBeenCalledWith(expect.objectContaining({
        html: expect.not.stringContaining('Angehängte Dateien')
      }));
      
      consoleSpy.mockRestore();
    });

    it('should handle reports with no file attachments', async () => {
      // Arrange
      const reportWithNoFiles = {
        ...mockStatusReport,
        fileUrls: null
      };
      
      // Act
      const result = await sendStatusReportArchivingEmail(reportWithNoFiles);
      
      // Assert
      expect(result.success).toBe(true);
      expect(mockSendEmail).toHaveBeenCalledWith(expect.objectContaining({
        html: expect.not.stringContaining('Angehängte Dateien')
      }));
    });
  });
});