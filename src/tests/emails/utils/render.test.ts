import { renderNewsletter, renderNotificationEmail } from '../../../lib/email-render';
import { EmailTemplateParams } from '../../../types/newsletter-types';

// Simple mock data for testing render functions
const createMinimalEmailParams = (): EmailTemplateParams => ({
  newsletterSettings: {
    headerLogo: 'https://example.com/logo.png',
    headerBanner: 'https://example.com/banner.jpg',
    footerText: 'Die Linke Frankfurt',
    unsubscribeLink: 'https://example.com/unsubscribe'
  },
  introductionText: '<p>Test introduction</p>',
  featuredAppointments: [],
  upcomingAppointments: [],
  statusReportsByGroup: [],
  baseUrl: 'https://example.com'
});

describe('Email Render Utilities', () => {
  describe('renderNewsletter', () => {
    it('should render newsletter template successfully', async () => {
      const params = createMinimalEmailParams();
      
      const html = await renderNewsletter(params);
      
      expect(html).toBeTruthy();
      expect(typeof html).toBe('string');
      expect(html.length).toBeGreaterThan(0);
      expect(html).toContain('<!DOCTYPE html');
      expect(html).toContain('Test introduction');
      expect(html).toContain('Die Linke Frankfurt');
    });

    it('should handle errors gracefully', async () => {
      // Pass invalid parameters to trigger error
      const invalidParams = null as any;
      
      await expect(renderNewsletter(invalidParams)).rejects.toThrow('Newsletter rendering failed');
    });

    it('should render newsletter with all provided data', async () => {
      const params = createMinimalEmailParams();
      
      // Add some sample data
      params.featuredAppointments = [{
        id: 'test-1',
        title: 'Test Event',
        startDateTime: new Date('2025-01-20T19:00:00'),
        endDateTime: new Date('2025-01-20T21:00:00'),
        location: 'Test Location',
        mainText: 'Test event description',
        featured: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        fileUrls: null,
        metadata: null
      }];
      
      const html = await renderNewsletter(params);
      
      expect(html).toContain('Test Event');
      expect(html).toContain('Test event description');
    });
  });

  describe('renderNotificationEmail', () => {
    it('should render AntragSubmission template', async () => {
      const props = {
        antrag: {
          id: 'test-antrag',
          title: 'Test Antrag',
          firstName: 'Max',
          lastName: 'Mustermann',
          email: 'max@example.com',
          summary: 'Test summary',
          purposes: JSON.stringify({ zuschuss: { enabled: true, amount: 100 } }),
          status: 'NEU' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
          decisionComment: null,
          decidedAt: null
        },
        fileUrls: ['https://example.com/file.pdf'],
        adminUrl: 'https://example.com/admin'
      };
      
      const html = await renderNotificationEmail('AntragSubmission', props);
      
      expect(html).toBeTruthy();
      expect(html).toContain('Test Antrag');
      expect(html).toContain('Max Mustermann');
      expect(html).toContain('max@example.com');
    });

    it('should render GroupAcceptance template', async () => {
      const props = {
        group: {
          id: 'test-group',
          name: 'Test Group',
          slug: 'test-group',
          description: 'Test description',
          logoUrl: null,
          status: 'active' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
          responsiblePersons: [{
            id: 'person-1',
            firstName: 'Anna',
            lastName: 'Schmidt',
            email: 'anna@example.com',
            phone: '+49 123 456789',
            groupId: 'test-group',
            createdAt: new Date(),
            updatedAt: new Date()
          }]
        },
        statusReportFormUrl: 'https://example.com/form'
      };
      
      const html = await renderNotificationEmail('GroupAcceptance', props);
      
      expect(html).toBeTruthy();
      expect(html).toContain('Test Group');
      expect(html).toContain('wurde freigeschaltet');
    });

    it('should render StatusReportAcceptance template', async () => {
      const props = {
        statusReport: {
          id: 'test-report',
          title: 'Test Report',
          content: '<p>Test content</p>',
          status: 'approved' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
          groupId: 'test-group',
          reporterFirstName: 'John',
          reporterLastName: 'Doe',
          fileUrls: null,
          group: {
            id: 'test-group',
            name: 'Test Group',
            slug: 'test-group',
            description: 'Test description',
            logoUrl: null,
            status: 'active' as const,
            createdAt: new Date(),
            updatedAt: new Date(),
            responsiblePersons: []
          }
        },
        reportUrl: 'https://example.com/report',
        fileUrls: []
      };
      
      const html = await renderNotificationEmail('StatusReportAcceptance', props);
      
      expect(html).toBeTruthy();
      expect(html).toContain('Test Report');
      expect(html).toContain('wurde freigeschaltet');
    });

    it('should handle unknown template names', async () => {
      const unknownTemplate = 'UnknownTemplate' as any;
      
      await expect(
        renderNotificationEmail(unknownTemplate, {})
      ).rejects.toThrow('Unknown template');
    });

    it('should handle rendering errors gracefully', async () => {
      // Pass invalid props to trigger error
      const invalidProps = { invalidProp: 'test' };
      
      await expect(
        renderNotificationEmail('AntragSubmission', invalidProps)
      ).rejects.toThrow('Email rendering failed');
    });
  });
});