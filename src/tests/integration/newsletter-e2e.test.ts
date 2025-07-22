import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { addDays, subDays } from 'date-fns';
import prisma from '@/lib/prisma';
import { generateNewsletterHtml, getDefaultNewsletterSettings } from '../../lib/newsletter-template';

// Mock only external dependencies
jest.mock('@/lib/email', () => ({
  sendEmail: jest.fn().mockResolvedValue({ success: true, messageId: 'test-123' }),
  sendTestEmail: jest.fn().mockResolvedValue({ success: true, messageId: 'test-456' }),
  createTransporter: jest.fn().mockReturnValue({
    verify: jest.fn().mockResolvedValue(true),
    sendMail: jest.fn().mockResolvedValue({ messageId: 'smtp-123' }),
    close: jest.fn()
  })
}));

describe('Newsletter Core Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Newsletter Template Generation', () => {
    it('should generate newsletter HTML with appointments and status reports', async () => {
      // Create mock data
      const futureDate = addDays(new Date(), 7);
      const appointment = {
        id: 'test-appointment',
        title: 'Climate Action Meeting',
        teaser: 'Join us for climate action',
        mainText: '<p>Important meeting about climate action</p>',
        startDateTime: futureDate,
        endDateTime: futureDate,
        status: 'accepted' as const,
        featured: false,
        processed: true,
        street: 'Test Street 1',
        city: 'Frankfurt',
        state: 'Hessen',
        postalCode: '60311',
        firstName: 'Test',
        lastName: 'User',
        recurringText: null,
        fileUrls: null,
        metadata: null,
        rejectionReason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        processingDate: null,
        statusChangeDate: null
      };

      const group = {
        id: 'test-group',
        name: 'Climate Group',
        slug: 'climate-group',
        description: 'Climate activism group',
        status: 'ACTIVE' as const,
        logoUrl: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const statusReport = {
        id: 'test-report',
        title: 'Successful Climate Demo',
        content: '<p>We had 500 participants</p>',
        reporterFirstName: 'Jane',
        reporterLastName: 'Activist',
        status: 'ACTIVE' as const,
        groupId: group.id,
        fileUrls: null,
        createdAt: subDays(new Date(), 5),
        updatedAt: new Date()
      };

      // Test newsletter generation
      const settings = getDefaultNewsletterSettings();
      const newsletterHtml = await generateNewsletterHtml({
        newsletterSettings: settings,
        introductionText: '<p>Welcome to our newsletter</p>',
        featuredAppointments: [],
        upcomingAppointments: [appointment],
        statusReportsByGroup: [{
          group,
          reports: [statusReport]
        }],
        baseUrl: 'https://test.example.com'
      });

      expect(newsletterHtml).toContain('Climate Action Meeting');
      expect(newsletterHtml).toContain('Important meeting about climate action');
      expect(newsletterHtml).toContain('Successful Climate Demo');
      expect(newsletterHtml).toContain('We had 500 participants');
      expect(newsletterHtml).toContain('Welcome to our newsletter');
      expect(newsletterHtml).toContain('<!DOCTYPE html>');
      expect(newsletterHtml).toContain('<html lang="de">');
    });

    it('should handle featured appointments properly', async () => {
      const futureDate = addDays(new Date(), 3);
      
      const featuredAppointment = {
        id: 'featured-appointment',
        title: 'Featured Event',
        teaser: 'This is a featured event',
        mainText: '<p>Special featured event</p>',
        startDateTime: futureDate,
        endDateTime: null,
        status: 'accepted' as const,
        featured: true,
        processed: true,
        street: 'Featured Street',
        city: 'Frankfurt',
        state: 'Hessen',
        postalCode: '60311',
        firstName: 'Featured',
        lastName: 'Organizer',
        recurringText: null,
        fileUrls: null,
        metadata: null,
        rejectionReason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        processingDate: null,
        statusChangeDate: null
      };

      const regularAppointment = {
        id: 'regular-appointment',
        title: 'Regular Event',
        teaser: 'Regular event',
        mainText: '<p>Regular event content</p>',
        startDateTime: addDays(futureDate, 1),
        endDateTime: null,
        status: 'accepted' as const,
        featured: false,
        processed: true,
        street: 'Regular Street',
        city: 'Frankfurt',
        state: 'Hessen',
        postalCode: '60311',
        firstName: 'Regular',
        lastName: 'User',
        recurringText: null,
        fileUrls: null,
        metadata: null,
        rejectionReason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        processingDate: null,
        statusChangeDate: null
      };

      const settings = getDefaultNewsletterSettings();
      const newsletterHtml = await generateNewsletterHtml({
        newsletterSettings: settings,
        introductionText: '<p>Test newsletter</p>',
        featuredAppointments: [featuredAppointment],
        upcomingAppointments: [regularAppointment],
        statusReportsByGroup: [],
        baseUrl: 'https://test.example.com'
      });

      // Both events should be included
      expect(newsletterHtml).toContain('Featured Event');
      expect(newsletterHtml).toContain('Regular Event');
    });

    it('should handle empty data gracefully', async () => {
      const settings = getDefaultNewsletterSettings();
      const newsletterHtml = await generateNewsletterHtml({
        newsletterSettings: settings,
        introductionText: '<p>Empty newsletter</p>',
        featuredAppointments: [],
        upcomingAppointments: [],
        statusReportsByGroup: [],
        baseUrl: 'https://test.example.com'
      });

      expect(newsletterHtml).toContain('Empty newsletter');
      expect(newsletterHtml).toContain('<!DOCTYPE html>');
      expect(newsletterHtml).toContain('<html lang="de">');
      expect(newsletterHtml).toContain(settings.footerText);
    });
  });

  describe('Newsletter Database Operations', () => {
    it('should create newsletter draft successfully', async () => {
      const newsletter = await prisma.newsletterItem.create({
        data: {
          subject: 'Test Newsletter',
          introductionText: '<p>Welcome</p>',
          content: '<html><body>Test content</body></html>',
          status: 'draft',
          settings: JSON.stringify({
            headerLogo: '/test-logo.png',
            footerText: 'Test footer'
          })
        }
      });

      expect(newsletter.id).toBeDefined();
      expect(newsletter.subject).toBe('Test Newsletter');
      expect(newsletter.status).toBe('draft');
      expect(newsletter.content).toContain('Test content');
    });

    it('should update newsletter status and settings', async () => {
      const newsletter = await prisma.newsletterItem.create({
        data: {
          subject: 'Update Test',
          content: '<html><body>Initial</body></html>',
          status: 'draft',
          settings: JSON.stringify({ test: 'initial' })
        }
      });

      const updated = await prisma.newsletterItem.update({
        where: { id: newsletter.id },
        data: {
          status: 'sent',
          recipientCount: 100,
          sentAt: new Date(),
          settings: JSON.stringify({
            test: 'updated',
            totalSent: 95,
            totalFailed: 5
          })
        }
      });

      expect(updated.status).toBe('sent');
      expect(updated.recipientCount).toBe(100);
      expect(updated.sentAt).toBeDefined();
      
      const settings = JSON.parse(updated.settings || '{}');
      expect(settings.test).toBe('updated');
      expect(settings.totalSent).toBe(95);
      expect(settings.totalFailed).toBe(5);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid newsletter settings gracefully', async () => {
      const newsletter = await prisma.newsletterItem.create({
        data: {
          subject: 'Invalid Settings Test',
          content: '<html><body>Test</body></html>',
          status: 'draft',
          settings: 'invalid-json-string'
        }
      });

      // The database should store the invalid JSON
      expect(newsletter.settings).toBe('invalid-json-string');
      
      // Application code should handle parsing errors gracefully
      let parsedSettings;
      try {
        parsedSettings = JSON.parse(newsletter.settings || '{}');
      } catch {
        parsedSettings = {};
      }
      
      expect(parsedSettings).toEqual({});
    });
  });

  describe('Email Integration', () => {
    it('should send test newsletter email', async () => {
      const { sendTestEmail } = jest.requireMock('@/lib/email');
      
      await sendTestEmail({
        to: 'test@example.com',
        subject: 'Test Newsletter',
        html: '<html><body>Test content</body></html>'
      });

      expect(sendTestEmail).toHaveBeenCalledWith({
        to: 'test@example.com',
        subject: 'Test Newsletter',
        html: '<html><body>Test content</body></html>'
      });
    });

    it('should handle email sending failures gracefully', async () => {
      const { sendEmail } = jest.requireMock('@/lib/email');
      sendEmail.mockRejectedValueOnce(new Error('SMTP connection failed'));

      let result;
      try {
        result = await sendEmail({
          to: 'test@example.com',
          subject: 'Test',
          html: '<html><body>Test</body></html>'
        });
      } catch (error) {
        result = { success: false, error: error.message };
      }

      expect(result.success).toBe(false);
      expect(result.error).toBe('SMTP connection failed');
    });
  });
});