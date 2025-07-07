import { sendAntragAcceptanceEmail, sendAntragRejectionEmail } from '@/lib/email-notifications';
import { sendEmail } from '@/lib/email';
import { getBaseUrl } from '@/lib/base-url';

// Mock dependencies
jest.mock('@/lib/email', () => ({
  sendEmail: jest.fn(),
}));

jest.mock('@/lib/base-url', () => ({
  getBaseUrl: jest.fn(),
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
        html: expect.stringContaining('Ihr Antrag wurde angenommen'),
      });

      const emailCall = (sendEmail as jest.Mock).mock.calls[0][0];
      expect(emailCall.html).toContain('Test Antrag for Community Event');
      expect(emailCall.html).toContain('John Doe');
      expect(emailCall.html).toContain('1.1.2024'); // German date format
      expect(emailCall.html).toContain('<strong>Finanzieller Zuschuss:</strong> 500 €');
      expect(emailCall.html).toContain('Raumbuchung');
      expect(emailCall.html).toContain('Community Center');
    });

    it('should send acceptance email with comment', async () => {
      const comment = 'Great proposal! We are excited to support this community initiative.';
      const result = await sendAntragAcceptanceEmail(mockAntrag, comment);

      expect(result.success).toBe(true);
      expect(sendEmail).toHaveBeenCalledWith({
        to: 'john@example.com',
        subject: '✅ Ihr Antrag "Test Antrag for Community Event" wurde angenommen',
        html: expect.stringContaining(comment),
      });

      const emailCall = (sendEmail as jest.Mock).mock.calls[0][0];
      expect(emailCall.html).toContain('Kommentar der Entscheidung');
      expect(emailCall.html).toContain(comment);
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

    it('should format purposes correctly in email', async () => {
      const antragWithComplexPurposes = {
        ...mockAntrag,
        purposes: JSON.stringify({
          zuschuss: { enabled: true, amount: 1000 },
          personelleUnterstuetzung: { enabled: true, details: 'Need volunteers for setup' },
          raumbuchung: { enabled: true, location: 'Main Hall', numberOfPeople: 100, details: 'Full day event' },
          weiteres: { enabled: true, details: 'Additional equipment needed' }
        })
      };

      await sendAntragAcceptanceEmail(antragWithComplexPurposes);

      const emailCall = (sendEmail as jest.Mock).mock.calls[0][0];
      expect(emailCall.html).toContain('<strong>Finanzieller Zuschuss:</strong> 1000 €');
      expect(emailCall.html).toContain('Personelle Unterstützung');
      expect(emailCall.html).toContain('Need volunteers for setup');
      expect(emailCall.html).toContain('Main Hall');
      expect(emailCall.html).toContain('Weiteres');
      expect(emailCall.html).toContain('Additional equipment needed');
    });

    it('should use default contact email when not set', async () => {
      delete process.env.CONTACT_EMAIL;
      
      await sendAntragAcceptanceEmail(mockAntrag);

      const emailCall = (sendEmail as jest.Mock).mock.calls[0][0];
      expect(emailCall.html).toContain('info@die-linke-frankfurt.de');
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
        html: expect.stringContaining('Ihr Antrag wurde abgelehnt'),
      });

      const emailCall = (sendEmail as jest.Mock).mock.calls[0][0];
      expect(emailCall.html).toContain('Test Antrag for Community Event');
      expect(emailCall.html).toContain('John Doe');
      expect(emailCall.html).toContain('1.1.2024'); // German date format
      expect(emailCall.html).toContain('Weitere Möglichkeiten');
    });

    it('should send rejection email with reason', async () => {
      const rejectedAntrag = { ...mockAntrag, status: 'ABGELEHNT' as const };
      const reason = 'Unfortunately, the budget request exceeds our available funds for this quarter.';
      const result = await sendAntragRejectionEmail(rejectedAntrag, reason);

      expect(result.success).toBe(true);
      expect(sendEmail).toHaveBeenCalledWith({
        to: 'john@example.com',
        subject: '❌ Ihr Antrag "Test Antrag for Community Event" wurde abgelehnt',
        html: expect.stringContaining(reason),
      });

      const emailCall = (sendEmail as jest.Mock).mock.calls[0][0];
      expect(emailCall.html).toContain('Begründung der Entscheidung');
      expect(emailCall.html).toContain(reason);
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

    it('should include contact information for further questions', async () => {
      const rejectedAntrag = { ...mockAntrag, status: 'ABGELEHNT' as const };
      await sendAntragRejectionEmail(rejectedAntrag);

      const emailCall = (sendEmail as jest.Mock).mock.calls[0][0];
      expect(emailCall.html).toContain('Bei Fragen zur Entscheidung');
      expect(emailCall.html).toContain('info@die-linke-frankfurt.de');
      expect(emailCall.html).toContain('mailto:info@die-linke-frankfurt.de');
    });

    it('should handle malformed purposes JSON gracefully', async () => {
      const antragWithBadPurposes = {
        ...mockAntrag,
        status: 'ABGELEHNT' as const,
        purposes: 'invalid json'
      };

      const result = await sendAntragRejectionEmail(antragWithBadPurposes);

      expect(result.success).toBe(true);
      const emailCall = (sendEmail as jest.Mock).mock.calls[0][0];
      expect(emailCall.html).toContain('Fehler beim Anzeigen der Zwecke');
    });
  });

  describe('Email HTML structure', () => {
    it('should include proper HTML structure for acceptance email', async () => {
      await sendAntragAcceptanceEmail(mockAntrag);

      const emailCall = (sendEmail as jest.Mock).mock.calls[0][0];
      const html = emailCall.html;
      
      // Check for proper HTML structure
      expect(html).toContain('<div style="font-family: Arial, sans-serif');
      expect(html).toContain('✅ Ihr Antrag wurde angenommen');
      expect(html).toContain('Antragsdetails');
      expect(html).toContain('Nächste Schritte');
      expect(html).toContain('© 2025 Die Linke Frankfurt');
    });

    it('should include proper HTML structure for rejection email', async () => {
      const rejectedAntrag = { ...mockAntrag, status: 'ABGELEHNT' as const };
      await sendAntragRejectionEmail(rejectedAntrag);

      const emailCall = (sendEmail as jest.Mock).mock.calls[0][0];
      const html = emailCall.html;
      
      // Check for proper HTML structure
      expect(html).toContain('<div style="font-family: Arial, sans-serif');
      expect(html).toContain('❌ Ihr Antrag wurde abgelehnt');
      expect(html).toContain('Antragsdetails');
      expect(html).toContain('Weitere Möglichkeiten');
      expect(html).toContain('© 2025 Die Linke Frankfurt');
    });

    it('should include user content in email (note: HTML escaping should be implemented)', async () => {
      const antragWithHtml = {
        ...mockAntrag,
        title: 'Test <script>alert("xss")</script> Antrag',
        summary: 'Summary with <b>HTML</b> tags'
      };

      await sendAntragAcceptanceEmail(antragWithHtml);

      const emailCall = (sendEmail as jest.Mock).mock.calls[0][0];
      // Currently includes content as-is (HTML escaping should be added for security)
      expect(emailCall.html).toContain('Test <script>alert("xss")</script> Antrag');
      expect(emailCall.html).toContain('Summary with <b>HTML</b> tags');
    });
  });
});