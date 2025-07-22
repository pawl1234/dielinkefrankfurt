import { render } from '@react-email/render';
import { Newsletter } from '../../../emails/templates/Newsletter';
import { EmailTemplateParams } from '../../../types/newsletter-types';

// Mock data factory for newsletter testing
const createMockEmailTemplateParams = (): EmailTemplateParams => {
  return {
    newsletterSettings: {
      headerLogo: 'https://example.com/logo.png',
      headerBanner: 'https://example.com/banner.jpg',
      footerText: 'Die Linke Frankfurt am Main',
      unsubscribeLink: 'https://example.com/unsubscribe'
    },
    introductionText: '<p>Liebe Genossinnen und Genossen, willkommen zum Newsletter!</p>',
    featuredAppointments: [
      {
        id: 'featured-1',
        title: 'Vollversammlung',
        startDateTime: new Date('2025-01-20T19:00:00'),
        endDateTime: new Date('2025-01-20T21:00:00'),
        location: 'Gewerkschaftshaus',
        mainText: 'Unsere monatliche Vollversammlung mit wichtigen Beschlüssen zur Stadtpolitik.',
        featured: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        fileUrls: null,
        metadata: JSON.stringify({
          coverImageUrl: 'https://example.com/featured-image.jpg'
        })
      }
    ],
    upcomingAppointments: [
      {
        id: 'upcoming-1',
        title: 'Infoveranstaltung Mietenpolitik',
        startDateTime: new Date('2025-01-25T18:00:00'),
        endDateTime: new Date('2025-01-25T20:00:00'),
        location: 'Bürgerhaus',
        mainText: 'Diskussion über bezahlbaren Wohnraum in Frankfurt.',
        featured: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        fileUrls: null,
        metadata: null
      }
    ],
    statusReportsByGroup: [
      {
        group: {
          id: 'group-1',
          name: 'Arbeitskreis Stadtentwicklung',
          slug: 'ak-stadtentwicklung',
          description: 'Arbeitskreis zu Stadtentwicklung und Wohnungspolitik',
          logoUrl: 'https://example.com/group-logo.png',
          status: 'active' as const,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        reports: [
          {
            id: 'report-1',
            title: 'Aktivitäten im Dezember',
            content: '<p>Wir haben eine Kundgebung gegen Mieterhöhungen organisiert.</p>',
            status: 'approved' as const,
            createdAt: new Date(),
            updatedAt: new Date(),
            groupId: 'group-1',
            reporterFirstName: 'Maria',
            reporterLastName: 'Müller',
            fileUrls: null
          }
        ]
      }
    ],
    baseUrl: 'https://example.com'
  };
};

describe('Newsletter React Email Template', () => {
  it('should render newsletter with all sections', async () => {
    const params = createMockEmailTemplateParams();
    
    const html = await render(Newsletter({ params }));
    
    // Verify core sections are present
    expect(html).toContain(params.introductionText);
    expect(html).toContain('Featured');
    expect(html).toContain('Termine');
    expect(html).toContain('Aktuelle Gruppenberichte');
    expect(html).toContain(params.newsletterSettings.footerText);
    
    // Verify appointments are rendered
    expect(html).toContain('Vollversammlung');
    expect(html).toContain('Infoveranstaltung Mietenpolitik');
    
    // Verify status reports are rendered
    expect(html).toContain('Arbeitskreis Stadtentwicklung');
    expect(html).toContain('Aktivitäten im Dezember');
    
    // Verify footer elements
    expect(html).toContain('Vom Newsletter abmelden');
  });

  it('should maintain responsive styling', async () => {
    const params = createMockEmailTemplateParams();
    const html = await render(Newsletter({ params }));
    
    // Check for mobile responsive meta tags and styles
    expect(html).toContain('width=device-width');
    expect(html).toContain('initial-scale=1.0');
    
    // Verify email client compatibility
    expect(html).toContain('cellPadding="0"');
    expect(html).toContain('cellSpacing="0"');
  });

  it('should handle missing optional data gracefully', async () => {
    const params = createMockEmailTemplateParams();
    // Remove optional sections
    params.featuredAppointments = [];
    params.statusReportsByGroup = [];
    
    const html = await render(Newsletter({ params }));
    
    // Should still render without errors
    expect(html).toContain(params.introductionText);
    expect(html).toContain(params.newsletterSettings.footerText);
    expect(html).toBeTruthy();
    expect(html.length).toBeGreaterThan(0);
  });

  it('should include proper email headers and structure', async () => {
    const params = createMockEmailTemplateParams();
    const html = await render(Newsletter({ params }));
    
    // Verify HTML document structure
    expect(html).toContain('<!DOCTYPE html');
    expect(html).toContain('<html lang="de">');
    expect(html).toContain('<meta charset="UTF-8"');
    expect(html).toContain('Die Linke Frankfurt Newsletter');
    
    // Verify brand colors are present
    expect(html).toContain('#FF0000'); // Brand red
    expect(html).toContain('#222222'); // Footer dark
  });

  it('should render featured events with images when available', async () => {
    const params = createMockEmailTemplateParams();
    const html = await render(Newsletter({ params }));
    
    // Should include featured image from metadata
    expect(html).toContain('featured-image.jpg');
    expect(html).toContain('alt="Vollversammlung"');
  });

  it('should format dates correctly in German locale', async () => {
    const params = createMockEmailTemplateParams();
    const html = await render(Newsletter({ params }));
    
    // Should contain German date formatting
    // Note: Exact format depends on the formatAppointmentDateRange function
    expect(html).toContain('2025'); // Year should be present
    expect(html).toContain('19:00'); // Time should be present
  });
});