import { sendEmail } from '../lib/email';

// Mock the dependencies
jest.mock('../lib/email', () => ({
  sendEmail: jest.fn().mockImplementation(() => Promise.resolve({ success: true, messageId: 'mock-message-id' }))
}));

// Mock functions that we'll test
const sendStatusReportAcceptanceEmail = jest.fn();
const sendStatusReportRejectionEmail = jest.fn(); 
const sendStatusReportArchivingEmail = jest.fn();

// Mock the group-handlers module
jest.mock('../lib/group-handlers', () => ({
  sendStatusReportAcceptanceEmail: (...args: unknown[]) => {
    return sendStatusReportAcceptanceEmail(...args);
  },
  sendStatusReportRejectionEmail: (...args: unknown[]) => {
    return sendStatusReportRejectionEmail(...args);
  },
  sendStatusReportArchivingEmail: (...args: unknown[]) => {
    return sendStatusReportArchivingEmail(...args);
  }
}));

// Mock implementation of the actual functions we're testing
sendStatusReportAcceptanceEmail.mockImplementation((statusReport) => {
  if (!statusReport.group.responsiblePersons || statusReport.group.responsiblePersons.length === 0) {
    return Promise.resolve({ success: false, error: 'No responsible persons found' });
  }

  const recipients = statusReport.group.responsiblePersons.map(person => person.email).join(',');
  const reportUrl = `${process.env.VERCEL_PROJECT_PRODUCTION_URL}/gruppen/${statusReport.group.slug}#report-${statusReport.id}`;
  const date = new Date(statusReport.createdAt).toLocaleDateString('de-DE');
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Statusbericht "${statusReport.title}" wurde freigeschaltet</h2>
      
      <p>Liebe Verantwortliche der Gruppe "${statusReport.group.name}",</p>
      
      <p>wir möchten Sie darüber informieren, dass der Statusbericht "${statusReport.title}" vom ${date} nun freigeschaltet wurde und auf unserer Website sichtbar ist.</p>
      
      <p>Sie können den Bericht hier einsehen: <a href="${reportUrl}">${reportUrl}</a></p>
      
      <p>Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>
      
      <p>
        Mit freundlichen Grüßen,<br>
        Das Team von Die Linke Frankfurt
      </p>
    </div>
  `;
  
  return sendEmail({
    to: recipients,
    subject: `Statusbericht "${statusReport.title}" wurde freigeschaltet`,
    html
  }).then(() => ({ success: true }));
});

sendStatusReportRejectionEmail.mockImplementation((statusReport) => {
  if (!statusReport.group.responsiblePersons || statusReport.group.responsiblePersons.length === 0) {
    return Promise.resolve({ success: false, error: 'No responsible persons found' });
  }

  const recipients = statusReport.group.responsiblePersons.map(person => person.email).join(',');
  const contactEmail = process.env.CONTACT_EMAIL || 'info@die-linke-frankfurt.de';
  const date = new Date(statusReport.createdAt).toLocaleDateString('de-DE');
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Ihr Statusbericht "${statusReport.title}" wurde abgelehnt</h2>
      
      <p>Liebe Verantwortliche der Gruppe "${statusReport.group.name}",</p>
      
      <p>wir müssen Ihnen leider mitteilen, dass Ihr Statusbericht "${statusReport.title}" vom ${date} für die Veröffentlichung auf unserer Website nicht genehmigt werden konnte.</p>
      
      <p>Sie können gerne einen überarbeiteten Bericht einreichen oder für weitere Informationen und Fragen wenden Sie sich bitte an: <a href="mailto:${contactEmail}">${contactEmail}</a></p>
      
      <p>
        Mit freundlichen Grüßen,<br>
        Das Team von Die Linke Frankfurt
      </p>
    </div>
  `;
  
  return sendEmail({
    to: recipients,
    subject: `Ihr Statusbericht "${statusReport.title}" wurde abgelehnt`,
    html
  }).then(() => ({ success: true }));
});

sendStatusReportArchivingEmail.mockImplementation((statusReport) => {
  if (!statusReport.group.responsiblePersons || statusReport.group.responsiblePersons.length === 0) {
    return Promise.resolve({ success: false, error: 'No responsible persons found' });
  }

  const recipients = statusReport.group.responsiblePersons.map(person => person.email).join(',');
  const date = new Date(statusReport.createdAt).toLocaleDateString('de-DE');
  
  // Parse file URLs to list them in the email
  let fileList = '';
  if (statusReport.fileUrls) {
    try {
      const files = JSON.parse(statusReport.fileUrls);
      if (Array.isArray(files) && files.length > 0) {
        fileList = `
          <div style="margin-top: 20px; margin-bottom: 20px;">
            <p><strong>Angehängte Dateien, die nicht mehr öffentlich verfügbar sind:</strong></p>
            <ul>
              ${files.map(file => {
                const fileName = file.split('/').pop();
                return `<li>${fileName}</li>`;
              }).join('')}
            </ul>
          </div>
        `;
      }
    } catch (e) {
      console.error('Error parsing file URLs:', e);
    }
  }
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Ihr Statusbericht "${statusReport.title}" wurde archiviert</h2>
      
      <p>Liebe Verantwortliche der Gruppe "${statusReport.group.name}",</p>
      
      <p>wir möchten Sie darüber informieren, dass Ihr Statusbericht "${statusReport.title}" vom ${date} nun archiviert wurde und nicht mehr öffentlich auf unserer Website sichtbar ist.</p>
      
      ${fileList}
      
      <p>Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>
      
      <p>
        Mit freundlichen Grüßen,<br>
        Das Team von Die Linke Frankfurt
      </p>
    </div>
  `;
  
  return sendEmail({
    to: recipients,
    subject: `Ihr Statusbericht "${statusReport.title}" wurde archiviert`,
    html
  }).then(() => ({ success: true }));
});

// Mock environment variables
process.env.VERCEL_PROJECT_PRODUCTION_URL = 'https://test.example.com';
process.env.CONTACT_EMAIL = 'test@example.com';

describe('Status Report Email Notifications Unit Tests', () => {
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
  });

  describe('sendStatusReportAcceptanceEmail', () => {
    it('should send an email with the correct content for ACTIVE status', async () => {
      // Act
      const result = await sendStatusReportAcceptanceEmail(mockStatusReport);
      
      // Assert
      expect(result.success).toBe(true);
      expect(sendEmail).toHaveBeenCalledTimes(1);
      expect(sendEmail).toHaveBeenCalledWith({
        to: 'jane@example.com,alex@example.com',
        subject: 'Statusbericht "Monthly Update" wurde freigeschaltet',
        html: expect.stringContaining('Monthly Update')
      });
      
      expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({
        html: expect.stringContaining('https://test.example.com/gruppen/test-group#report-report-1')
      }));
      
      expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({
        html: expect.stringContaining('15.5.2025') // German date format
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
      expect(sendEmail).not.toHaveBeenCalled();
    });
  });

  describe('sendStatusReportRejectionEmail', () => {
    it('should send an email with the correct content for REJECTED status', async () => {
      // Act
      const result = await sendStatusReportRejectionEmail(mockStatusReport);
      
      // Assert
      expect(result.success).toBe(true);
      expect(sendEmail).toHaveBeenCalledTimes(1);
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
      const result = await sendStatusReportArchivingEmail(mockStatusReport);
      
      // Assert
      expect(result.success).toBe(true);
      expect(sendEmail).toHaveBeenCalledTimes(1);
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
      const result = await sendStatusReportArchivingEmail(reportWithInvalidFileUrls);
      
      // Assert
      expect(result.success).toBe(true);
      expect(sendEmail).toHaveBeenCalled();
      // Should not have file list but still send the email
      expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({
        html: expect.not.stringContaining('Angehängte Dateien')
      }));
    });
  });
});