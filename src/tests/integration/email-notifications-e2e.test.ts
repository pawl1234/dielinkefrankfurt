import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { sendEmail } from '@/lib/email';
import { sendGroupAcceptanceEmail, sendStatusReportAcceptanceEmail } from '@/lib/email-senders';

// Mock email module
jest.mock('@/lib/email', () => ({
  sendEmail: jest.fn(),
  createTransporter: jest.fn(),
  sendEmailWithTransporter: jest.fn(),
}));

// Mock logger to avoid console noise
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Email Notifications Integration', () => {
  const mockSendEmail = jest.mocked(sendEmail);

  beforeEach(() => {
    jest.clearAllMocks();
    mockSendEmail.mockResolvedValue({ 
      success: true, 
      messageId: 'mock-message-id' 
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Group Email Notifications', () => {
    it('should send single email to all responsible persons when group is accepted', async () => {
      const mockGroup = {
        id: 'group-1',
        name: 'Test Group',
        responsiblePersons: [
          { email: 'person1@example.com', firstName: 'John', lastName: 'Doe' },
          { email: 'person2@example.com', firstName: 'Jane', lastName: 'Smith' },
        ],
      };

      const result = await sendGroupAcceptanceEmail(mockGroup);

      expect(result.success).toBe(true);
      expect(mockSendEmail).toHaveBeenCalledTimes(1);
      
      // Check that email is sent to comma-separated recipients
      expect(mockSendEmail).toHaveBeenCalledWith(expect.objectContaining({
        to: 'person1@example.com,person2@example.com',
        subject: expect.stringContaining('freigeschaltet'),
        html: expect.stringContaining('Test Group'),
      }));
    });

    it('should return success when email is sent', async () => {
      const mockGroup = {
        id: 'group-1',
        name: 'Test Group',
        responsiblePersons: [
          { email: 'person1@example.com', firstName: 'John', lastName: 'Doe' },
        ],
      };

      const result = await sendGroupAcceptanceEmail(mockGroup);

      expect(result.success).toBe(true);
      expect(mockSendEmail).toHaveBeenCalledTimes(1);
      expect(mockSendEmail).toHaveBeenCalledWith(expect.objectContaining({
        to: 'person1@example.com',
        subject: expect.stringContaining('freigeschaltet'),
      }));
    });
  });

  describe('Status Report Email Notifications', () => {
    it('should send email to group responsible persons when status report is accepted', async () => {
      const mockStatusReport = {
        id: 'report-1',
        title: 'Monthly Update',
        group: {
          name: 'Test Group',
          responsiblePersons: [
            { email: 'person1@example.com', firstName: 'John', lastName: 'Doe' },
          ],
        },
      };

      const result = await sendStatusReportAcceptanceEmail(mockStatusReport);

      expect(result.success).toBe(true);
      expect(mockSendEmail).toHaveBeenCalledTimes(1);
      expect(mockSendEmail).toHaveBeenCalledWith(expect.objectContaining({
        to: 'person1@example.com',
        subject: expect.stringContaining('freigeschaltet'),
        html: expect.stringContaining('Monthly Update'),
      }));
    });
  });

  describe('Email Content Validation', () => {
    it('should include proper German content in group acceptance emails', async () => {
      const mockGroup = {
        id: 'group-1',
        name: 'Testgruppe Frankfurt',
        responsiblePersons: [
          { email: 'test@example.com', firstName: 'Max', lastName: 'Müller' },
        ],
      };

      await sendGroupAcceptanceEmail(mockGroup);

      const emailCall = mockSendEmail.mock.calls[0][0];
      expect(emailCall.html).toContain('Testgruppe Frankfurt');
      expect(emailCall.subject).toMatch(/freigeschaltet/i);
    });
  });
});