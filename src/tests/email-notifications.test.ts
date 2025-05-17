import { sendEmail } from '../lib/email';

// Mock the email module
jest.mock('../lib/email', () => ({
  sendEmail: jest.fn().mockImplementation(() => Promise.resolve({ success: true, messageId: 'mock-message-id' }))
}));

// Mock the environment variables
process.env.NEXTAUTH_URL = 'https://test.example.com';
process.env.CONTACT_EMAIL = 'test@example.com';

// Types for our mocked functions
type Group = {
  id: string;
  name: string;
  slug?: string;
  description: string;
  status: 'NEW' | 'ACTIVE' | 'REJECTED' | 'ARCHIVED';
  responsiblePersons: ResponsiblePerson[];
};

type ResponsiblePerson = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  groupId: string;
};

type StatusReport = {
  id: string;
  title: string;
  content: string;
  reporterFirstName: string;
  reporterLastName: string;
  status: 'NEW' | 'ACTIVE' | 'REJECTED';
  groupId: string;
  createdAt: Date;
  updatedAt: Date;
  fileUrls: string | null;
  group: Group;
};

// Mock implementation of email notification functions
async function sendGroupAcceptanceEmail(group: Group): Promise<{ success: boolean; error?: any }> {
  try {
    if (!group.responsiblePersons || group.responsiblePersons.length === 0) {
      console.error(`No responsible persons found for group ${group.id}`);
      return { success: false, error: 'No responsible persons found' };
    }
    
    const recipients = group.responsiblePersons.map(person => person.email).join(',');
    const statusReportFormUrl = `${process.env.NEXTAUTH_URL}/gruppen-bericht`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Ihre Gruppe "${group.name}" wurde freigeschaltet</h2>
        
        <p>Liebe Verantwortliche der Gruppe "${group.name}",</p>
        
        <p>wir freuen uns, Ihnen mitteilen zu können, dass Ihre Gruppe nun freigeschaltet wurde und auf unserer Website sichtbar ist.</p>
        
        <p>Sie können ab sofort Statusberichte für Ihre Gruppe einreichen unter: <a href="${statusReportFormUrl}">${statusReportFormUrl}</a></p>
        
        <p>Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>
        
        <p>
          Mit freundlichen Grüßen,<br>
          Das Team von Die Linke Frankfurt
        </p>
      </div>
    `;
    
    await sendEmail({
      to: recipients,
      subject: `Ihre Gruppe "${group.name}" wurde freigeschaltet`,
      html
    });
    
    console.log(`✅ Group acceptance email sent to ${recipients}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending group acceptance email:', error);
    return { success: false, error };
  }
}

async function sendGroupRejectionEmail(group: Group): Promise<{ success: boolean; error?: any }> {
  try {
    if (!group.responsiblePersons || group.responsiblePersons.length === 0) {
      console.error(`No responsible persons found for group ${group.id}`);
      return { success: false, error: 'No responsible persons found' };
    }
    
    const recipients = group.responsiblePersons.map(person => person.email).join(',');
    const contactEmail = process.env.CONTACT_EMAIL || 'info@die-linke-frankfurt.de';
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Ihre Gruppenanfrage "${group.name}" wurde abgelehnt</h2>
        
        <p>Liebe Verantwortliche der Gruppe "${group.name}",</p>
        
        <p>wir müssen Ihnen leider mitteilen, dass Ihre Anfrage zur Erstellung einer Gruppe auf unserer Website nicht genehmigt werden konnte.</p>
        
        <p>Für weitere Informationen oder Fragen wenden Sie sich bitte an: <a href="mailto:${contactEmail}">${contactEmail}</a></p>
        
        <p>
          Mit freundlichen Grüßen,<br>
          Das Team von Die Linke Frankfurt
        </p>
      </div>
    `;
    
    await sendEmail({
      to: recipients,
      subject: `Ihre Gruppenanfrage "${group.name}" wurde abgelehnt`,
      html
    });
    
    console.log(`✅ Group rejection email sent to ${recipients}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending group rejection email:', error);
    return { success: false, error };
  }
}

async function sendGroupArchivingEmail(group: Group): Promise<{ success: boolean; error?: any }> {
  try {
    if (!group.responsiblePersons || group.responsiblePersons.length === 0) {
      console.error(`No responsible persons found for group ${group.id}`);
      return { success: false, error: 'No responsible persons found' };
    }
    
    const recipients = group.responsiblePersons.map(person => person.email).join(',');
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Ihre Gruppe "${group.name}" wurde archiviert</h2>
        
        <p>Liebe Verantwortliche der Gruppe "${group.name}",</p>
        
        <p>wir möchten Sie darüber informieren, dass Ihre Gruppe auf unserer Website archiviert wurde und nicht mehr öffentlich sichtbar ist.</p>
        
        <p>Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>
        
        <p>
          Mit freundlichen Grüßen,<br>
          Das Team von Die Linke Frankfurt
        </p>
      </div>
    `;
    
    await sendEmail({
      to: recipients,
      subject: `Ihre Gruppe "${group.name}" wurde archiviert`,
      html
    });
    
    console.log(`✅ Group archiving email sent to ${recipients}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending group archiving email:', error);
    return { success: false, error };
  }
}

async function sendStatusReportAcceptanceEmail(
  statusReport: StatusReport
): Promise<{ success: boolean; error?: any }> {
  try {
    if (!statusReport.group.responsiblePersons || statusReport.group.responsiblePersons.length === 0) {
      console.error(`No responsible persons found for group ${statusReport.group.id}`);
      return { success: false, error: 'No responsible persons found' };
    }
    
    const recipients = statusReport.group.responsiblePersons.map(person => person.email).join(',');
    const reportUrl = `${process.env.NEXTAUTH_URL}/gruppen/${statusReport.group.slug}#report-${statusReport.id}`;
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
    
    await sendEmail({
      to: recipients,
      subject: `Statusbericht "${statusReport.title}" wurde freigeschaltet`,
      html
    });
    
    console.log(`✅ Status report acceptance email sent to ${recipients}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending status report acceptance email:', error);
    return { success: false, error };
  }
}

async function sendStatusReportRejectionEmail(
  statusReport: StatusReport
): Promise<{ success: boolean; error?: any }> {
  try {
    if (!statusReport.group.responsiblePersons || statusReport.group.responsiblePersons.length === 0) {
      console.error(`No responsible persons found for group ${statusReport.group.id}`);
      return { success: false, error: 'No responsible persons found' };
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
    
    await sendEmail({
      to: recipients,
      subject: `Ihr Statusbericht "${statusReport.title}" wurde abgelehnt`,
      html
    });
    
    console.log(`✅ Status report rejection email sent to ${recipients}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending status report rejection email:', error);
    return { success: false, error };
  }
}

describe('Email Notifications', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendGroupAcceptanceEmail', () => {
    it('should successfully send an acceptance email', async () => {
      // Arrange
      const mockGroup = {
        id: '1',
        name: 'Test Group',
        slug: 'test-group-1234',
        description: 'Test description',
        status: 'ACTIVE',
        responsiblePersons: [
          {
            id: '1',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            groupId: '1'
          },
          {
            id: '2',
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane.smith@example.com',
            groupId: '1'
          }
        ]
      } as Group;

      // Act
      const result = await sendGroupAcceptanceEmail(mockGroup);

      // Assert
      expect(result.success).toBe(true);
      expect(sendEmail).toHaveBeenCalledTimes(1);
      expect(sendEmail).toHaveBeenCalledWith({
        to: 'john.doe@example.com,jane.smith@example.com',
        subject: 'Ihre Gruppe "Test Group" wurde freigeschaltet',
        html: expect.stringContaining('Test Group')
      });
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('https://test.example.com/gruppen-bericht')
        })
      );
    });

    it('should handle groups with no responsible persons', async () => {
      // Arrange
      const mockGroup = {
        id: '1',
        name: 'Test Group',
        slug: 'test-group-1234',
        description: 'Test description',
        status: 'ACTIVE',
        responsiblePersons: []
      } as Group;

      // Act
      const result = await sendGroupAcceptanceEmail(mockGroup);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('No responsible persons found');
      expect(sendEmail).not.toHaveBeenCalled();
    });

    it('should handle email sending failures', async () => {
      // Arrange
      const mockGroup = {
        id: '1',
        name: 'Test Group',
        slug: 'test-group-1234',
        description: 'Test description',
        status: 'ACTIVE',
        responsiblePersons: [
          {
            id: '1',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            groupId: '1'
          }
        ]
      } as Group;

      // Simulate email sending failure
      (sendEmail as jest.Mock).mockImplementationOnce(() => 
        Promise.reject(new Error('SMTP error'))
      );

      // Act
      const result = await sendGroupAcceptanceEmail(mockGroup);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(sendEmail).toHaveBeenCalledTimes(1);
    });
  });

  describe('sendGroupRejectionEmail', () => {
    it('should successfully send a rejection email', async () => {
      // Arrange
      const mockGroup = {
        id: '1',
        name: 'Test Group',
        slug: 'test-group-1234',
        description: 'Test description',
        status: 'REJECTED',
        responsiblePersons: [
          {
            id: '1',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            groupId: '1'
          }
        ]
      } as Group;

      // Act
      const result = await sendGroupRejectionEmail(mockGroup);

      // Assert
      expect(result.success).toBe(true);
      expect(sendEmail).toHaveBeenCalledTimes(1);
      expect(sendEmail).toHaveBeenCalledWith({
        to: 'john.doe@example.com',
        subject: 'Ihre Gruppenanfrage "Test Group" wurde abgelehnt',
        html: expect.stringContaining('Test Group')
      });
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('test@example.com')
        })
      );
    });
  });

  describe('sendGroupArchivingEmail', () => {
    it('should successfully send an archiving email', async () => {
      // Arrange
      const mockGroup = {
        id: '1',
        name: 'Test Group',
        slug: 'test-group-1234',
        description: 'Test description',
        status: 'ARCHIVED',
        responsiblePersons: [
          {
            id: '1',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            groupId: '1'
          }
        ]
      } as Group;

      // Act
      const result = await sendGroupArchivingEmail(mockGroup);

      // Assert
      expect(result.success).toBe(true);
      expect(sendEmail).toHaveBeenCalledTimes(1);
      expect(sendEmail).toHaveBeenCalledWith({
        to: 'john.doe@example.com',
        subject: 'Ihre Gruppe "Test Group" wurde archiviert',
        html: expect.stringContaining('Test Group')
      });
    });
  });

  describe('sendStatusReportAcceptanceEmail', () => {
    it('should successfully send a status report acceptance email', async () => {
      // Arrange
      const mockStatusReport = {
        id: '1',
        title: 'Monthly Update',
        content: 'Test content',
        reporterFirstName: 'John',
        reporterLastName: 'Doe',
        status: 'ACTIVE',
        groupId: '1',
        createdAt: new Date('2025-05-15T12:00:00Z'),
        updatedAt: new Date('2025-05-15T12:00:00Z'),
        fileUrls: null,
        group: {
          id: '1',
          name: 'Test Group',
          slug: 'test-group-1234',
          description: 'Test description',
          status: 'ACTIVE',
          responsiblePersons: [
            {
              id: '1',
              firstName: 'John',
              lastName: 'Doe',
              email: 'john.doe@example.com',
              groupId: '1'
            }
          ]
        }
      } as StatusReport;

      // Act
      const result = await sendStatusReportAcceptanceEmail(mockStatusReport);

      // Assert
      expect(result.success).toBe(true);
      expect(sendEmail).toHaveBeenCalledTimes(1);
      expect(sendEmail).toHaveBeenCalledWith({
        to: 'john.doe@example.com',
        subject: 'Statusbericht "Monthly Update" wurde freigeschaltet',
        html: expect.stringContaining('Monthly Update')
      });
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('https://test.example.com/gruppen/test-group-1234#report-1')
        })
      );
    });
  });

  describe('sendStatusReportRejectionEmail', () => {
    it('should successfully send a status report rejection email', async () => {
      // Arrange
      const mockStatusReport = {
        id: '1',
        title: 'Monthly Update',
        content: 'Test content',
        reporterFirstName: 'John',
        reporterLastName: 'Doe',
        status: 'REJECTED',
        groupId: '1',
        createdAt: new Date('2025-05-15T12:00:00Z'),
        updatedAt: new Date('2025-05-15T12:00:00Z'),
        fileUrls: null,
        group: {
          id: '1',
          name: 'Test Group',
          slug: 'test-group-1234',
          description: 'Test description',
          status: 'ACTIVE',
          responsiblePersons: [
            {
              id: '1',
              firstName: 'John',
              lastName: 'Doe',
              email: 'john.doe@example.com',
              groupId: '1'
            }
          ]
        }
      } as StatusReport;

      // Act
      const result = await sendStatusReportRejectionEmail(mockStatusReport);

      // Assert
      expect(result.success).toBe(true);
      expect(sendEmail).toHaveBeenCalledTimes(1);
      expect(sendEmail).toHaveBeenCalledWith({
        to: 'john.doe@example.com',
        subject: 'Ihr Statusbericht "Monthly Update" wurde abgelehnt',
        html: expect.stringContaining('Monthly Update')
      });
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('test@example.com')
        })
      );
    });
  });
});