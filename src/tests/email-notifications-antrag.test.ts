import { sendAntragAcceptanceEmail, sendAntragRejectionEmail } from '@/lib/email-senders';
import { sendEmail } from '@/lib/email';
import { getBaseUrl } from '@/lib/base-url';
import { getNewsletterSettings } from '@/lib/newsletter-service';
import { renderNotificationEmail } from '@/lib/email-render';

// Mock dependencies
jest.mock('@/lib/email', () => ({
  sendEmail: jest.fn(),
}));

jest.mock('@/lib/base-url', () => ({
  getBaseUrl: jest.fn(),
}));

jest.mock('@/lib/email-render', () => ({
  renderNotificationEmail: jest.fn(),
}));

const mockAntrag = {
  id: '123',
  title: 'Test Antrag for Community Event',
  summary: 'We need support for organizing a community event',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  status: 'AKZEPTIERT' as const,
  purposes: JSON.stringify({
    zuschuss: { enabled: true, amount: 500 },
    raumbuchung: { enabled: true, location: 'Community Center', numberOfPeople: 50, details: 'Evening event' }
  }),
  fileUrls: null,
  createdAt: new Date('2024-01-01T10:00:00Z'),
  updatedAt: new Date('2024-01-02T10:00:00Z'),
  decisionComment: null,
  decidedBy: null,
  decidedAt: new Date('2024-01-02T10:00:00Z'),
};

describe('Antrag Email Notifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getBaseUrl as jest.Mock).mockReturnValue('https://example.com');
    (sendEmail as jest.Mock).mockResolvedValue(undefined);
    (getNewsletterSettings as jest.Mock).mockResolvedValue({
      headerLogo: 'https://example.com/logo.png',
      contactEmail: 'info@die-linke-frankfurt.de'
    });
    (renderNotificationEmail as jest.Mock).mockResolvedValue('<html>Mock email content</html>');
    
    // Mock environment variable
    process.env.CONTACT_EMAIL = 'info@die-linke-frankfurt.de';
  });

  describe('sendAntragAcceptanceEmail', () => {
    it('should send acceptance email without comment', async () => {
      const result = await sendAntragAcceptanceEmail(mockAntrag);

      expect(result.success).toBe(true);
      expect(sendEmail).toHaveBeenCalledWith({
        to: 'john@example.com',
        subject: '✅ Ihr Antrag "Test Antrag for Community Event" wurde angenommen',
        html: expect.any(String),
      });

      // Verify that renderNotificationEmail was called with correct template and data
      expect(renderNotificationEmail).toHaveBeenCalledWith('AntragAcceptance', 
        expect.objectContaining({
          antrag: mockAntrag,
          recipientEmail: 'john@example.com',
          recipientName: 'John Doe',
          baseUrl: 'https://example.com',
          headerLogo: 'https://example.com/logo.png',
          contactEmail: 'info@die-linke-frankfurt.de'
        })
      );
    });

    it('should send acceptance email with comment', async () => {
      const comment = 'Great proposal! We are excited to support this community initiative.';
      const result = await sendAntragAcceptanceEmail(mockAntrag, comment);

      expect(result.success).toBe(true);
      expect(sendEmail).toHaveBeenCalledWith({
        to: 'john@example.com',
        subject: '✅ Ihr Antrag "Test Antrag for Community Event" wurde angenommen',
        html: expect.any(String),
      });

      // Verify that renderNotificationEmail was called with the comment
      expect(renderNotificationEmail).toHaveBeenCalledWith('AntragAcceptance', 
        expect.objectContaining({
          antrag: mockAntrag,
          recipientEmail: 'john@example.com',
          recipientName: 'John Doe',
          decisionComment: comment,
          baseUrl: 'https://example.com',
          headerLogo: 'https://example.com/logo.png',
          contactEmail: 'info@die-linke-frankfurt.de'
        })
      );
    });

    it('should handle missing email address', async () => {
      const antragWithoutEmail = { ...mockAntrag, email: '' };
      const result = await sendAntragAcceptanceEmail(antragWithoutEmail);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No email address found for applicant');
      expect(sendEmail).not.toHaveBeenCalled();
    });

    it('should handle email sending error', async () => {
      (sendEmail as jest.Mock).mockRejectedValue(new Error('SMTP connection failed'));
      
      const result = await sendAntragAcceptanceEmail(mockAntrag);

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
    });
  });

  describe('sendAntragRejectionEmail', () => {
    it('should send rejection email without comment', async () => {
      const rejectedAntrag = { ...mockAntrag, status: 'ABGELEHNT' as const };
      const result = await sendAntragRejectionEmail(rejectedAntrag);

      expect(result.success).toBe(true);
      expect(sendEmail).toHaveBeenCalledWith({
        to: 'john@example.com',
        subject: '❌ Ihr Antrag "Test Antrag for Community Event" wurde abgelehnt',
        html: expect.any(String),
      });

      // Verify that renderNotificationEmail was called with correct template and data
      expect(renderNotificationEmail).toHaveBeenCalledWith('AntragRejection', 
        expect.objectContaining({
          antrag: rejectedAntrag,
          recipientEmail: 'john@example.com',
          recipientName: 'John Doe',
          baseUrl: 'https://example.com',
          headerLogo: 'https://example.com/logo.png',
          contactEmail: 'info@die-linke-frankfurt.de'
        })
      );
    });

    it('should send rejection email with reason', async () => {
      const rejectedAntrag = { ...mockAntrag, status: 'ABGELEHNT' as const };
      const reason = 'Unfortunately, the budget request exceeds our available funds for this quarter.';
      const result = await sendAntragRejectionEmail(rejectedAntrag, reason);

      expect(result.success).toBe(true);
      expect(sendEmail).toHaveBeenCalledWith({
        to: 'john@example.com',
        subject: '❌ Ihr Antrag "Test Antrag for Community Event" wurde abgelehnt',
        html: expect.any(String),
      });

      // Verify that renderNotificationEmail was called with the reason
      expect(renderNotificationEmail).toHaveBeenCalledWith('AntragRejection', 
        expect.objectContaining({
          antrag: rejectedAntrag,
          recipientEmail: 'john@example.com',
          recipientName: 'John Doe',
          decisionComment: reason,
          baseUrl: 'https://example.com',
          headerLogo: 'https://example.com/logo.png',
          contactEmail: 'info@die-linke-frankfurt.de'
        })
      );
    });

    it('should handle missing email address', async () => {
      const antragWithoutEmail = { ...mockAntrag, email: '', status: 'ABGELEHNT' as const };
      const result = await sendAntragRejectionEmail(antragWithoutEmail);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No email address found for applicant');
      expect(sendEmail).not.toHaveBeenCalled();
    });

    it('should handle email sending error', async () => {
      (sendEmail as jest.Mock).mockRejectedValue(new Error('SMTP connection failed'));
      
      const rejectedAntrag = { ...mockAntrag, status: 'ABGELEHNT' as const };
      const result = await sendAntragRejectionEmail(rejectedAntrag);

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
    });
  });

  describe('Integration tests', () => {
    it('should call getNewsletterSettings to get header logo', async () => {
      await sendAntragAcceptanceEmail(mockAntrag);

      expect(getNewsletterSettings).toHaveBeenCalled();
      expect(renderNotificationEmail).toHaveBeenCalledWith('AntragAcceptance', 
        expect.objectContaining({
          headerLogo: 'https://example.com/logo.png'
        })
      );
    });

    it('should use base URL from getBaseUrl', async () => {
      await sendAntragAcceptanceEmail(mockAntrag);

      expect(getBaseUrl).toHaveBeenCalled();
      expect(renderNotificationEmail).toHaveBeenCalledWith('AntragAcceptance', 
        expect.objectContaining({
          baseUrl: 'https://example.com'
        })
      );
    });
  });
});