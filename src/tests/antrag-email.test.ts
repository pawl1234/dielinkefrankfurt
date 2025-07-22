import { sendAntragSubmissionEmail } from '../lib/email-senders';
import { sendEmail } from '../lib/email';
import { getRecipientEmails } from '../lib/db/antrag-config-operations';
import { prepareEmailAttachments } from '../lib/email-attachment-utils';
import { Antrag } from '@prisma/client';
import type { AntragPurposes } from '@/types/api-types';

// Mock the email module
jest.mock('../lib/email', () => ({
  sendEmail: jest.fn().mockImplementation(() => Promise.resolve({ success: true, messageId: 'mock-message-id' }))
}));

// Mock the config operations
jest.mock('../lib/db/antrag-config-operations', () => ({
  getRecipientEmails: jest.fn().mockResolvedValue(['admin@die-linke-frankfurt.de', 'kreisvorstand@die-linke-frankfurt.de'])
}));

// Mock the attachment utils
jest.mock('../lib/email-attachment-utils', () => ({
  prepareEmailAttachments: jest.fn().mockResolvedValue({
    attachments: [],
    totalSize: 0,
    skippedFiles: [],
    errors: []
  })
}));

// Mock the base URL function
jest.mock('../lib/base-url', () => ({
  getBaseUrl: jest.fn().mockReturnValue('https://test.example.com')
}));

// Mock environment variables
process.env.VERCEL_PROJECT_PRODUCTION_URL = 'https://test.example.com';

const sendEmailMock = sendEmail as jest.MockedFunction<typeof sendEmail>;
const getRecipientEmailsMock = getRecipientEmails as jest.MockedFunction<typeof getRecipientEmails>;
const prepareEmailAttachmentsMock = prepareEmailAttachments as jest.MockedFunction<typeof prepareEmailAttachments>;

describe('Antrag Email Notifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockAntrag = (purposes: AntragPurposes, overrides?: Partial<Antrag>): Antrag => ({
    id: 'antrag-123',
    firstName: 'Max',
    lastName: 'Mustermann',
    email: 'max.mustermann@example.com',
    title: 'Förderung für Jugendevent',
    summary: 'Wir möchten einen Workshop für Jugendliche organisieren und benötigen finanzielle Unterstützung.',
    purposes: JSON.stringify(purposes),
    status: 'NEU',
    fileUrls: '[]',
    createdAt: new Date('2025-01-15T10:30:00Z'),
    updatedAt: new Date('2025-01-15T10:30:00Z'),
    decisionComment: null,
    decidedBy: null,
    decidedAt: null,
    ...overrides
  });

  describe('sendAntragSubmissionEmail', () => {
    it('should successfully send email with financial support purpose', async () => {
      const purposes: AntragPurposes = {
        zuschuss: { enabled: true, amount: 500 }
      };
      const mockAntrag = createMockAntrag(purposes);
      const recipientEmails = ['admin@die-linke-frankfurt.de'];

      const result = await sendAntragSubmissionEmail(mockAntrag, [], recipientEmails);

      expect(result.success).toBe(true);
      expect(sendEmail).toHaveBeenCalledTimes(1);
      expect(sendEmail).toHaveBeenCalledWith({
        to: 'admin@die-linke-frankfurt.de',
        subject: 'Neuer Antrag: Förderung für Jugendevent',
        html: expect.stringContaining('Max Mustermann')
      });

      const callArgs = sendEmailMock.mock.calls[0][0];
      expect(callArgs.html).toContain('Finanzieller Zuschuss');
      expect(callArgs.html).toContain('500 €');
      expect(callArgs.html).toContain('https://test.example.com/admin/antraege/antrag-123');
    });

    it('should successfully send email with personnel support purpose', async () => {
      const purposes: AntragPurposes = {
        personelleUnterstuetzung: { 
          enabled: true, 
          details: 'Wir benötigen Unterstützung bei der Veranstaltungsorganisation' 
        }
      };
      const mockAntrag = createMockAntrag(purposes);
      const recipientEmails = ['admin@die-linke-frankfurt.de'];

      const result = await sendAntragSubmissionEmail(mockAntrag, [], recipientEmails);

      expect(result.success).toBe(true);
      const callArgs = sendEmailMock.mock.calls[0][0];
      expect(callArgs.html).toContain('Personelle Unterstützung');
      expect(callArgs.html).toContain('Veranstaltungsorganisation');
    });

    it('should successfully send email with room booking purpose', async () => {
      const purposes: AntragPurposes = {
        raumbuchung: { 
          enabled: true, 
          location: 'Gemeindesaal Frankfurt',
          numberOfPeople: 25,
          details: 'Workshop am Samstag von 10-16 Uhr'
        }
      };
      const mockAntrag = createMockAntrag(purposes);
      const recipientEmails = ['admin@die-linke-frankfurt.de'];

      const result = await sendAntragSubmissionEmail(mockAntrag, [], recipientEmails);

      expect(result.success).toBe(true);
      const callArgs = sendEmailMock.mock.calls[0][0];
      expect(callArgs.html).toContain('Raumbuchung');
      expect(callArgs.html).toContain('Gemeindesaal Frankfurt');
      expect(callArgs.html).toContain('25');
      expect(callArgs.html).toContain('Workshop am Samstag');
    });

    it('should successfully send email with other purpose', async () => {
      const purposes: AntragPurposes = {
        weiteres: { 
          enabled: true, 
          details: 'Unterstützung bei der Pressearbeit und Social Media'
        }
      };
      const mockAntrag = createMockAntrag(purposes);
      const recipientEmails = ['admin@die-linke-frankfurt.de'];

      const result = await sendAntragSubmissionEmail(mockAntrag, [], recipientEmails);

      expect(result.success).toBe(true);
      const callArgs = sendEmailMock.mock.calls[0][0];
      expect(callArgs.html).toContain('Weiteres');
      expect(callArgs.html).toContain('Pressearbeit');
    });

    it('should successfully send email with multiple purposes', async () => {
      const purposes: AntragPurposes = {
        zuschuss: { enabled: true, amount: 300 },
        personelleUnterstuetzung: { 
          enabled: true, 
          details: 'Hilfe bei der Moderation' 
        },
        raumbuchung: { 
          enabled: true, 
          location: 'Kulturzentrum',
          numberOfPeople: 50,
          details: 'Podiumsdiskussion'
        }
      };
      const mockAntrag = createMockAntrag(purposes);
      const recipientEmails = ['admin@die-linke-frankfurt.de'];

      const result = await sendAntragSubmissionEmail(mockAntrag, [], recipientEmails);

      expect(result.success).toBe(true);
      expect(sendEmail).toHaveBeenCalledTimes(1);
      const callArgs = sendEmailMock.mock.calls[0][0];
      expect(callArgs.html).toContain('Finanzieller Zuschuss');
      expect(callArgs.html).toContain('300 €');
      expect(callArgs.html).toContain('Personelle Unterstützung');
      expect(callArgs.html).toContain('Moderation');
      expect(callArgs.html).toContain('Raumbuchung');
      expect(callArgs.html).toContain('Kulturzentrum');
    });

    it('should include file attachments in email', async () => {
      const purposes: AntragPurposes = {
        zuschuss: { enabled: true, amount: 200 }
      };
      const mockAntrag = createMockAntrag(purposes);
      const fileUrls = [
        'https://blob.vercel-storage.com/antrag-konzept-abc123.pdf',
        'https://blob.vercel-storage.com/budget-plan-def456.xlsx'
      ];
      const recipientEmails = ['admin@die-linke-frankfurt.de'];

      // Mock successful attachment preparation
      const mockAttachments = [
        {
          filename: 'antrag-konzept-abc123.pdf',
          content: Buffer.from('PDF content'),
          contentType: 'application/pdf'
        },
        {
          filename: 'budget-plan-def456.xlsx',
          content: Buffer.from('Excel content'),
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }
      ];

      prepareEmailAttachmentsMock.mockResolvedValueOnce({
        attachments: mockAttachments,
        totalSize: mockAttachments[0].content.length + mockAttachments[1].content.length,
        skippedFiles: [],
        errors: []
      });

      const result = await sendAntragSubmissionEmail(mockAntrag, fileUrls, recipientEmails);

      expect(result.success).toBe(true);
      expect(prepareEmailAttachments).toHaveBeenCalledWith(fileUrls);
      
      const callArgs = sendEmailMock.mock.calls[0][0];
      expect(callArgs.html).toContain('Dateien:');
      expect(callArgs.html).toContain('📎 antrag-konzept-abc123.pdf');
      expect(callArgs.html).toContain('📎 budget-plan-def456.xlsx');
      expect(callArgs.html).toContain('Als Anhang beigefügt');
      expect(callArgs.attachments).toEqual(mockAttachments);
    });

    it('should send to multiple recipients', async () => {
      const purposes: AntragPurposes = {
        zuschuss: { enabled: true, amount: 150 }
      };
      const mockAntrag = createMockAntrag(purposes);
      const recipientEmails = [
        'admin@die-linke-frankfurt.de',
        'kreisvorstand@die-linke-frankfurt.de',
        'finanzen@die-linke-frankfurt.de'
      ];

      const result = await sendAntragSubmissionEmail(mockAntrag, [], recipientEmails);

      expect(result.success).toBe(true);
      expect(sendEmail).toHaveBeenCalledWith({
        to: 'admin@die-linke-frankfurt.de,kreisvorstand@die-linke-frankfurt.de,finanzen@die-linke-frankfurt.de',
        subject: 'Neuer Antrag: Förderung für Jugendevent',
        html: expect.any(String)
      });
    });

    it('should format German date correctly', async () => {
      const purposes: AntragPurposes = {
        zuschuss: { enabled: true, amount: 100 }
      };
      const mockAntrag = createMockAntrag(purposes, {
        createdAt: new Date('2025-03-20T14:45:30Z')
      });
      const recipientEmails = ['admin@die-linke-frankfurt.de'];

      const result = await sendAntragSubmissionEmail(mockAntrag, [], recipientEmails);

      expect(result.success).toBe(true);
      const callArgs = sendEmailMock.mock.calls[0][0];
      // Check for German date format (DD.MM.YYYY, HH:MM)
      expect(callArgs.html).toMatch(/\d{2}\.\d{2}\.\d{4}, \d{2}:\d{2}/);
    });

    it('should handle empty recipient list', async () => {
      const purposes: AntragPurposes = {
        zuschuss: { enabled: true, amount: 100 }
      };
      const mockAntrag = createMockAntrag(purposes);

      const result = await sendAntragSubmissionEmail(mockAntrag, [], []);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No recipient emails provided');
      expect(sendEmail).not.toHaveBeenCalled();
    });

    it('should handle email sending failure', async () => {
      const purposes: AntragPurposes = {
        zuschuss: { enabled: true, amount: 100 }
      };
      const mockAntrag = createMockAntrag(purposes);
      const recipientEmails = ['admin@die-linke-frankfurt.de'];

      sendEmailMock.mockRejectedValueOnce(new Error('SMTP connection failed'));

      const result = await sendAntragSubmissionEmail(mockAntrag, [], recipientEmails);

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect((result.error as Error).message).toBe('SMTP connection failed');
    });

    it('should handle invalid purposes JSON gracefully', async () => {
      const mockAntrag = createMockAntrag({}, {
        purposes: 'invalid-json'
      });
      const recipientEmails = ['admin@die-linke-frankfurt.de'];

      const result = await sendAntragSubmissionEmail(mockAntrag, [], recipientEmails);

      expect(result.success).toBe(true);
      const callArgs = sendEmailMock.mock.calls[0][0];
      expect(callArgs.html).toContain('Fehler beim Anzeigen der Zwecke');
    });

    it('should include proper email styling and structure', async () => {
      const purposes: AntragPurposes = {
        zuschuss: { enabled: true, amount: 250 }
      };
      const mockAntrag = createMockAntrag(purposes);
      const recipientEmails = ['admin@die-linke-frankfurt.de'];

      const result = await sendAntragSubmissionEmail(mockAntrag, [], recipientEmails);

      expect(result.success).toBe(true);
      const callArgs = sendEmailMock.mock.calls[0][0];
      
      // Check for proper HTML structure
      expect(callArgs.html).toContain('font-family: Arial, sans-serif');
      expect(callArgs.html).toContain('max-width: 700px');
      expect(callArgs.html).toContain('Neuer Antrag an Kreisvorstand');
      expect(callArgs.html).toContain('Antragsteller');
      expect(callArgs.html).toContain('Anliegen/Zwecke');
      expect(callArgs.html).toContain('Diese E-Mail wurde automatisch generiert');
      expect(callArgs.html).toContain('© 2025 Die Linke Frankfurt');
      
      // Check for responsive design elements
      expect(callArgs.html).toContain('margin: 0 auto');
      expect(callArgs.html).toContain('padding:');
      expect(callArgs.html).toContain('border-radius:');
    });

    it('should include clickable admin link with correct URL', async () => {
      const purposes: AntragPurposes = {
        zuschuss: { enabled: true, amount: 400 }
      };
      const mockAntrag = createMockAntrag(purposes, { id: 'test-antrag-456' });
      const recipientEmails = ['admin@die-linke-frankfurt.de'];

      const result = await sendAntragSubmissionEmail(mockAntrag, [], recipientEmails);

      expect(result.success).toBe(true);
      const callArgs = sendEmailMock.mock.calls[0][0];
      expect(callArgs.html).toContain('href="https://test.example.com/admin/antraege/test-antrag-456"');
      expect(callArgs.html).toContain('Antrag ansehen');
    });

    it('should handle mixed successful and skipped attachments', async () => {
      const purposes: AntragPurposes = {
        zuschuss: { enabled: true, amount: 300 }
      };
      const mockAntrag = createMockAntrag(purposes);
      const fileUrls = [
        'https://blob.vercel-storage.com/good-file.pdf',
        'https://external-site.com/bad-file.pdf',
        'https://blob.vercel-storage.com/too-large.pdf'
      ];
      const recipientEmails = ['admin@die-linke-frankfurt.de'];

      // Mock mixed result with some attachments and some skipped
      prepareEmailAttachmentsMock.mockResolvedValueOnce({
        attachments: [{
          filename: 'good-file.pdf',
          content: Buffer.from('PDF content'),
          contentType: 'application/pdf'
        }],
        totalSize: 11,
        skippedFiles: [
          {
            url: 'https://external-site.com/bad-file.pdf',
            filename: 'bad-file.pdf',
            reason: 'Invalid or external URL'
          },
          {
            url: 'https://blob.vercel-storage.com/too-large.pdf',
            filename: 'too-large.pdf',
            reason: 'File too large'
          }
        ],
        errors: []
      });

      const result = await sendAntragSubmissionEmail(mockAntrag, fileUrls, recipientEmails);

      expect(result.success).toBe(true);
      const callArgs = sendEmailMock.mock.calls[0][0];
      
      // Should show attached file
      expect(callArgs.html).toContain('📎 good-file.pdf');
      expect(callArgs.html).toContain('Als Anhang beigefügt');
      
      // Should show skipped files with reasons
      expect(callArgs.html).toContain('⚠️ bad-file.pdf - Nicht angehängt: Invalid or external URL');
      expect(callArgs.html).toContain('⚠️ too-large.pdf - Nicht angehängt: File too large');
      
      // Should have one attachment
      expect(callArgs.attachments).toHaveLength(1);
    });

    it('should fall back to file links when attachment preparation fails', async () => {
      const purposes: AntragPurposes = {
        zuschuss: { enabled: true, amount: 250 }
      };
      const mockAntrag = createMockAntrag(purposes);
      const fileUrls = [
        'https://blob.vercel-storage.com/document.pdf'
      ];
      const recipientEmails = ['admin@die-linke-frankfurt.de'];

      // Mock attachment preparation failure
      prepareEmailAttachmentsMock.mockRejectedValueOnce(new Error('Network failure'));

      const result = await sendAntragSubmissionEmail(mockAntrag, fileUrls, recipientEmails);

      expect(result.success).toBe(true);
      const callArgs = sendEmailMock.mock.calls[0][0];
      
      // Should fall back to file links
      expect(callArgs.html).toContain('Angehängte Dateien (Links):');
      expect(callArgs.html).toContain('href="https://blob.vercel-storage.com/document.pdf"');
      expect(callArgs.html).toContain('document.pdf');
      expect(callArgs.html).toContain('Hinweis: Dateien konnten nicht als Anhang beigefügt werden');
      
      // Should not have attachments
      expect(callArgs.attachments).toBeUndefined();
    });

    it('should handle large file attachments with size display', async () => {
      const purposes: AntragPurposes = {
        zuschuss: { enabled: true, amount: 100 }
      };
      const mockAntrag = createMockAntrag(purposes);
      const fileUrls = ['https://blob.vercel-storage.com/large-doc.pdf'];
      const recipientEmails = ['admin@die-linke-frankfurt.de'];

      // Mock large file attachment (2MB)
      const largeContent = Buffer.alloc(2 * 1024 * 1024); // 2MB
      prepareEmailAttachmentsMock.mockResolvedValueOnce({
        attachments: [{
          filename: 'large-doc.pdf',
          content: largeContent,
          contentType: 'application/pdf'
        }],
        totalSize: largeContent.length,
        skippedFiles: [],
        errors: []
      });

      const result = await sendAntragSubmissionEmail(mockAntrag, fileUrls, recipientEmails);

      expect(result.success).toBe(true);
      const callArgs = sendEmailMock.mock.calls[0][0];
      
      // Should show file size in KB
      expect(callArgs.html).toContain('📎 large-doc.pdf (2048 KB)');
      expect(callArgs.html).toContain('Als Anhang beigefügt');
    });

    it('should not include attachments parameter when no files', async () => {
      const purposes: AntragPurposes = {
        zuschuss: { enabled: true, amount: 100 }
      };
      const mockAntrag = createMockAntrag(purposes);
      const recipientEmails = ['admin@die-linke-frankfurt.de'];

      const result = await sendAntragSubmissionEmail(mockAntrag, [], recipientEmails);

      expect(result.success).toBe(true);
      const callArgs = sendEmailMock.mock.calls[0][0];
      expect(callArgs.attachments).toBeUndefined();
    });
  });

  describe('formatPurposesForEmail helper function', () => {
    it('should handle no purposes selected', async () => {
      const purposes: AntragPurposes = {};
      const mockAntrag = createMockAntrag(purposes);
      const recipientEmails = ['admin@die-linke-frankfurt.de'];

      const result = await sendAntragSubmissionEmail(mockAntrag, [], recipientEmails);

      expect(result.success).toBe(true);
      const callArgs = sendEmailMock.mock.calls[0][0];
      expect(callArgs.html).toContain('Keine Zwecke ausgewählt');
    });

    it('should handle purposes with disabled flags', async () => {
      const purposes: AntragPurposes = {
        zuschuss: { enabled: false, amount: 100 },
        personelleUnterstuetzung: { enabled: false, details: 'Test' }
      };
      const mockAntrag = createMockAntrag(purposes);
      const recipientEmails = ['admin@die-linke-frankfurt.de'];

      const result = await sendAntragSubmissionEmail(mockAntrag, [], recipientEmails);

      expect(result.success).toBe(true);
      const callArgs = sendEmailMock.mock.calls[0][0];
      expect(callArgs.html).toContain('Keine Zwecke ausgewählt');
    });
  });
});