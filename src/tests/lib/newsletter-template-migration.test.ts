import { generateNewsletterHtml } from '../../lib/newsletter-template';
import { EmailTemplateParams } from '../../types/newsletter-types';

// Test data factory for migration testing
const createTestEmailParams = (): EmailTemplateParams => {
  return {
    newsletterSettings: {
      headerLogo: 'https://example.com/logo.png',
      headerBanner: 'https://example.com/banner.jpg',
      footerText: 'Die Linke Frankfurt am Main',
      unsubscribeLink: 'https://example.com/unsubscribe'
    },
    introductionText: '<p>Willkommen zum Newsletter der Linken Frankfurt!</p>',
    featuredAppointments: [
      {
        id: 'featured-1',
        title: 'Vollversammlung Januar 2025',
        startDateTime: new Date('2025-01-20T19:00:00'),
        endDateTime: new Date('2025-01-20T21:00:00'),
        location: 'Gewerkschaftshaus Frankfurt',
        mainText: 'Unsere erste Vollversammlung im neuen Jahr. Wir besprechen wichtige Anträge zur Stadtpolitik und planen unsere Aktivitäten für 2025. Alle Mitglieder und Interessierte sind herzlich eingeladen.',
        featured: true,
        createdAt: new Date('2025-01-10'),
        updatedAt: new Date('2025-01-10'),
        fileUrls: null,
        metadata: JSON.stringify({
          coverImageUrl: 'https://example.com/vollversammlung.jpg'
        })
      }
    ],
    upcomingAppointments: [
      {
        id: 'upcoming-1',
        title: 'Infoveranstaltung Mietenpolitik',
        startDateTime: new Date('2025-01-25T18:00:00'),
        endDateTime: new Date('2025-01-25T20:00:00'),
        location: 'Bürgerhaus Bockenheim',
        mainText: 'Diskussionsveranstaltung über bezahlbaren Wohnraum in Frankfurt. Wir sprechen über aktuelle Entwicklungen und Herausforderungen auf dem Frankfurter Wohnungsmarkt.',
        featured: false,
        createdAt: new Date('2025-01-10'),
        updatedAt: new Date('2025-01-10'),
        fileUrls: null,
        metadata: null
      },
      {
        id: 'upcoming-2',
        title: 'Klimastreik-Vorbereitung',
        startDateTime: new Date('2025-01-30T16:00:00'),
        endDateTime: new Date('2025-01-30T18:00:00'),
        location: 'Parteibüro',
        mainText: 'Vorbereitung für den großen Klimastreik im Februar. Wir planen Transparente, Flyer und koordinieren unsere Teilnahme.',
        featured: false,
        createdAt: new Date('2025-01-10'),
        updatedAt: new Date('2025-01-10'),
        fileUrls: null,
        metadata: null
      }
    ],
    statusReportsByGroup: [
      {
        group: {
          id: 'ak-umwelt',
          name: 'Arbeitskreis Umwelt und Klima',
          slug: 'ak-umwelt',
          description: 'Arbeitskreis zu Umwelt- und Klimapolitik in Frankfurt',
          logoUrl: 'https://example.com/ak-umwelt-logo.png',
          status: 'active' as const,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2025-01-01')
        },
        reports: [
          {
            id: 'report-umwelt-1',
            title: 'Aktivitäten Dezember 2024',
            content: '<p>Im Dezember haben wir eine erfolgreiche Kundgebung für mehr Klimaschutz in Frankfurt organisiert. Über 200 Menschen haben teilgenommen. Außerdem haben wir einen Antrag zur Verkehrswende im Stadtparlament eingereicht.</p>',
            status: 'approved' as const,
            createdAt: new Date('2025-01-05'),
            updatedAt: new Date('2025-01-05'),
            groupId: 'ak-umwelt',
            reporterFirstName: 'Sandra',
            reporterLastName: 'Wagner',
            fileUrls: '["https://example.com/umwelt-bericht-dez.pdf"]'
          }
        ]
      },
      {
        group: {
          id: 'ak-soziales',
          name: 'Arbeitskreis Soziales',
          slug: 'ak-soziales',
          description: 'Arbeitskreis zu sozialer Gerechtigkeit und Arbeitspolitik',
          logoUrl: null,
          status: 'active' as const,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2025-01-01')
        },
        reports: [
          {
            id: 'report-soziales-1',
            title: 'Beratungsstelle Bilanz',
            content: '<p>Unsere Beratungsstelle für Arbeitslose konnte im Dezember 45 Menschen helfen. Besonders häufig ging es um Probleme mit dem Jobcenter und Fragen zu Hartz IV-Bescheiden.</p>',
            status: 'approved' as const,
            createdAt: new Date('2025-01-03'),
            updatedAt: new Date('2025-01-03'),
            groupId: 'ak-soziales',
            reporterFirstName: 'Michael',
            reporterLastName: 'Klein',
            fileUrls: null
          }
        ]
      }
    ],
    baseUrl: 'https://linke-frankfurt.de'
  };
};

describe('Newsletter Template Migration', () => {
  it('should generate newsletter HTML with React Email successfully', async () => {
    const params = createTestEmailParams();
    
    const html = await generateNewsletterHtml(params);
    
    // Basic structure checks
    expect(html).toBeTruthy();
    expect(typeof html).toBe('string');
    expect(html.length).toBeGreaterThan(1000); // Should be substantial content
    
    // HTML document structure
    expect(html).toContain('<!DOCTYPE html');
    expect(html).toContain('<html lang="de">');
    expect(html).toContain('</html>');
  });

  it('should include all newsletter sections', async () => {
    const params = createTestEmailParams();
    
    const html = await generateNewsletterHtml(params);
    
    // Header elements
    expect(html).toContain('logo.png');
    expect(html).toContain('banner.jpg');
    
    // Introduction
    expect(html).toContain('Willkommen zum Newsletter');
    
    // Featured events section
    expect(html).toContain('Featured');
    expect(html).toContain('Vollversammlung Januar 2025');
    expect(html).toContain('Gewerkschaftshaus Frankfurt');
    
    // Upcoming events section
    expect(html).toContain('Termine');
    expect(html).toContain('Infoveranstaltung Mietenpolitik');
    expect(html).toContain('Klimastreik-Vorbereitung');
    
    // Status reports section
    expect(html).toContain('Aktuelle Gruppenberichte');
    expect(html).toContain('Arbeitskreis Umwelt und Klima');
    expect(html).toContain('Arbeitskreis Soziales');
    expect(html).toContain('Aktivitäten Dezember 2024');
    expect(html).toContain('Beratungsstelle Bilanz');
    
    // Footer
    expect(html).toContain('Die Linke Frankfurt am Main');
    expect(html).toContain('Vom Newsletter abmelden');
  });

  it('should preserve brand styling and colors', async () => {
    const params = createTestEmailParams();
    
    const html = await generateNewsletterHtml(params);
    
    // Brand colors should be present
    expect(html).toContain('#FF0000'); // Primary red
    expect(html).toContain('#222222'); // Footer dark
    expect(html).toContain('#E5E5E5'); // Border gray
    
    // Font family
    expect(html).toContain('Open Sans');
    
    // Layout structure (table-based for email compatibility)
    expect(html).toContain('cellPadding="0"');
    expect(html).toContain('cellSpacing="0"');
  });

  it('should include responsive email styling', async () => {
    const params = createTestEmailParams();
    
    const html = await generateNewsletterHtml(params);
    
    // Mobile responsive meta tags
    expect(html).toContain('width=device-width');
    expect(html).toContain('initial-scale=1.0');
    
    // Email client compatibility
    expect(html).toContain('-webkit-text-size-adjust');
    expect(html).toContain('-ms-text-size-adjust');
    
    // Container max-width for desktop
    expect(html).toContain('max-width');
  });

  it('should handle buttons and links correctly', async () => {
    const params = createTestEmailParams();
    
    const html = await generateNewsletterHtml(params);
    
    // Event detail links
    expect(html).toContain('Mehr Informationen');
    expect(html).toContain('https://linke-frankfurt.de/termine/');
    
    // Status report links
    expect(html).toContain('Mehr Infos');
    expect(html).toContain('/gruppen/ak-umwelt#report-');
    
    // Unsubscribe link
    expect(html).toContain('https://example.com/unsubscribe');
    
    // Button styling
    expect(html).toContain('background-color: #FF0000');
    expect(html).toContain('color: #FFFFFF');
  });

  it('should format dates correctly in German locale', async () => {
    const params = createTestEmailParams();
    
    const html = await generateNewsletterHtml(params);
    
    // Should contain date information (exact format depends on formatAppointmentDateRange)
    expect(html).toContain('2025');
    expect(html).toContain('19:00'); // Featured event time
    expect(html).toContain('18:00'); // Upcoming event time
  });

  it('should handle empty sections gracefully', async () => {
    const params = createTestEmailParams();
    
    // Remove all appointments and reports
    params.featuredAppointments = [];
    params.upcomingAppointments = [];
    params.statusReportsByGroup = [];
    
    const html = await generateNewsletterHtml(params);
    
    // Should still render basic structure
    expect(html).toBeTruthy();
    expect(html).toContain('Willkommen zum Newsletter');
    expect(html).toContain('Die Linke Frankfurt am Main');
    
    // Optional sections should not break the layout
    expect(html.length).toBeGreaterThan(500);
  });

  it('should handle errors gracefully', async () => {
    // Test with invalid parameters
    const invalidParams = null as any;
    
    await expect(generateNewsletterHtml(invalidParams)).rejects.toThrow(
      'Newsletter generation failed'
    );
  });

  it('should preserve file attachments and metadata', async () => {
    const params = createTestEmailParams();
    
    const html = await generateNewsletterHtml(params);
    
    // Featured image from metadata should be included
    expect(html).toContain('vollversammlung.jpg');
    
    // Group logos should be included
    expect(html).toContain('ak-umwelt-logo.png');
    
    // Status report file attachments are not directly in newsletter,
    // but the content should reference them if needed
    expect(html).toContain('Sandra Wagner'); // Reporter name
    expect(html).toContain('Michael Klein'); // Reporter name
  });
});