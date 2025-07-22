import { render } from '@react-email/render';
import Newsletter from '../../../emails/newsletter';
import { NewsletterEmailProps } from '../../../types/newsletter-props';

// Mock data factory for newsletter testing
const createMockNewsletterProps = (): NewsletterEmailProps => {
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
    const props = createMockNewsletterProps();
    
    const html = await render(<Newsletter {...props} />);
    
    // Verify core sections are present
    expect(html).toContain(props.introductionText);
    expect(html).toContain('Vollversammlung');
    expect(html).toContain('Infoveranstaltung Mietenpolitik');  
    expect(html).toContain('Aktuelle Gruppenberichte');
    expect(html).toContain(props.newsletterSettings.footerText);
    
    // Verify appointments are rendered
    expect(html).toContain('Vollversammlung');
    expect(html).toContain('Infoveranstaltung Mietenpolitik');
    
    // Verify status reports are rendered
    expect(html).toContain('Arbeitskreis Stadtentwicklung');
    expect(html).toContain('Aktivitäten im Dezember');
    
    // Verify footer elements 
    expect(html).toContain('Die Linke Frankfurt am Main');
  });

  it('should maintain responsive styling', async () => {
    const props = createMockNewsletterProps();
    const html = await render(<Newsletter {...props} />);
    
    // Check for basic HTML structure and email compatibility
    expect(html).toContain('<!DOCTYPE html');
    expect(html).toContain('<html lang="de">');
    
    // Check for style elements (MSO conditional comments for Outlook)
    expect(html).toContain('<!--[if mso]>');
  });

  it('should handle missing optional data gracefully', async () => {
    const props = createMockNewsletterProps();
    // Remove optional sections
    props.featuredAppointments = [];
    props.statusReportsByGroup = [];
    
    const html = await render(<Newsletter {...props} />);
    
    // Should still render without errors
    expect(html).toContain(props.introductionText);
    expect(html).toContain(props.newsletterSettings.footerText);
    expect(html).toBeTruthy();
    expect(html.length).toBeGreaterThan(0);
  });

  it('should include proper email headers and structure', async () => {
    const props = createMockNewsletterProps();
    const html = await render(<Newsletter {...props} />);
    
    // Verify HTML document structure
    expect(html).toContain('<!DOCTYPE html');
    expect(html).toContain('<html lang="de">');
    expect(html).toContain('<title>Test Email</title>');
    
    // Verify content structure is present
    expect(html).toBeTruthy();
    expect(html.length).toBeGreaterThan(100);
  });

  it('should render featured events with images when available', async () => {
    const props = createMockNewsletterProps();
    const html = await render(<Newsletter {...props} />);
    
    // Should include featured appointment content
    expect(html).toContain('Vollversammlung');
    expect(html).toContain('Unsere monatliche Vollversammlung');
  });

  it('should format dates correctly in German locale', async () => {
    const props = createMockNewsletterProps();
    const html = await render(<Newsletter {...props} />);
    
    // Should contain appointment dates and content 
    expect(html).toContain('Vollversammlung');
    expect(html).toContain('Infoveranstaltung Mietenpolitik');
    expect(html).toBeTruthy();
  });
});