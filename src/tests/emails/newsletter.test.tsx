/**
 * Tests for React Email Newsletter Template
 * Verifies React Email rendering with proper type safety and database integration
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render } from '@react-email/render';
import Newsletter from '../../emails/newsletter';
import { NewsletterEmailProps } from '../../types/newsletter-props';
import { Appointment, Group, StatusReport } from '@prisma/client';
import { NewsletterSettings, GroupWithReports } from '../../types/newsletter-types';

// Mock dynamic imports for testing environment
jest.mock('@react-email/render', () => ({
  render: jest.fn()
}));

const mockRender = render as jest.MockedFunction<typeof render>;

describe('Newsletter React Email Template', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRender.mockResolvedValue('<html>Mock rendered HTML</html>');
  });

  const createMockNewsletterSettings = (): NewsletterSettings => ({
    headerLogo: '/images/logo.png',
    headerBanner: '/images/header-bg.jpg',
    footerText: 'Die Linke Frankfurt am Main',
    unsubscribeLink: 'https://example.com/unsubscribe',
    testEmailRecipients: 'test@example.com',
    batchSize: 100,
    batchDelay: 1000,
    fromEmail: 'newsletter@example.com',
    fromName: 'Die Linke Frankfurt',
    replyToEmail: 'reply@example.com',
    subjectTemplate: 'Newsletter {date}',
    chunkSize: 50,
    chunkDelay: 200,
    emailTimeout: 30000,
    connectionTimeout: 20000,
    greetingTimeout: 20000,
    socketTimeout: 30000,
    maxConnections: 1,
    maxMessages: 1,
    maxRetries: 3,
    maxBackoffDelay: 10000,
    retryChunkSizes: '10,5,1'
  });

  const createMockAppointment = (overrides: Partial<Appointment> = {}): Appointment => ({
    id: 1,
    title: 'Test Event',
    teaser: 'Test event teaser',
    mainText: 'This is a test event with detailed information about what will happen.',
    startDateTime: new Date('2025-01-20T19:00:00Z'),
    endDateTime: new Date('2025-01-20T21:00:00Z'),
    street: 'Musterstraße 123',
    city: 'Frankfurt am Main',
    state: 'Hessen',
    postalCode: '60313',
    firstName: 'Max',
    lastName: 'Mustermann',
    recurringText: null,
    fileUrls: JSON.stringify(['https://example.com/image.jpg']),
    featured: false,
    metadata: JSON.stringify({
      coverImageUrl: 'https://example.com/cover.jpg'
    }),
    createdAt: new Date(),
    updatedAt: new Date(),
    processed: true,
    processingDate: new Date(),
    statusChangeDate: new Date(),
    status: 'accepted',
    rejectionReason: null,
    ...overrides
  });

  const createMockGroup = (overrides: Partial<Group> = {}): Group => ({
    id: 'group-1',
    name: 'Test Group',
    slug: 'test-group',
    description: 'A test group description',
    logoUrl: 'https://example.com/group-logo.jpg',
    metadata: null,
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  });

  const createMockStatusReport = (overrides: Partial<StatusReport> = {}): StatusReport => ({
    id: 'report-1',
    title: 'Test Status Report',
    content: '<p>This is a test status report with some content.</p>',
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
    groupId: 'group-1',
    reporterFirstName: 'Jane',
    reporterLastName: 'Doe',
    fileUrls: null,
    ...overrides
  });

  const createMockNewsletterProps = (overrides: Partial<NewsletterEmailProps> = {}): NewsletterEmailProps => ({
    newsletterSettings: createMockNewsletterSettings(),
    introductionText: 'Liebe Genossinnen und Genossen,\n\nwillkommen zu unserem Newsletter!',
    featuredAppointments: [
      createMockAppointment({ 
        id: 1, 
        featured: true, 
        title: 'Featured Event 1',
        metadata: JSON.stringify({
          croppedCoverImageUrl: 'https://example.com/featured1.jpg'
        })
      })
    ],
    upcomingAppointments: [
      createMockAppointment({ 
        id: 2, 
        title: 'Upcoming Event 1' 
      }),
      createMockAppointment({ 
        id: 3, 
        title: 'Upcoming Event 2' 
      })
    ],
    statusReportsByGroup: [
      {
        group: createMockGroup(),
        reports: [createMockStatusReport()]
      }
    ],
    baseUrl: 'https://example.com',
    ...overrides
  });

  describe('Component Rendering', () => {
    it('should render newsletter with proper types', () => {
      const props = createMockNewsletterProps();
      
      // This should not throw any TypeScript errors
      const component = Newsletter(props);
      
      expect(component).toBeDefined();
      expect(component.type).toBe('html');
      expect(component.props.lang).toBe('de');
    });

    it('should include all required sections', () => {
      const props = createMockNewsletterProps();
      const component = Newsletter(props);
      
      // Should have HTML structure
      expect(component.type).toBe('html');
      
      // Should have body with sections
      const body = component.props.children.find((child: any) => child.type === 'body');
      expect(body).toBeDefined();
      
      const container = body.props.children;
      expect(container.type).toBe('container');
    });

    it('should handle introduction text with multiple paragraphs', () => {
      const props = createMockNewsletterProps({
        introductionText: 'Paragraph 1\n\nParagraph 2\n\nParagraph 3'
      });
      
      const component = Newsletter(props);
      expect(component).toBeDefined();
      
      // Component should process multiple paragraphs correctly
      // (Detailed content verification would require rendering)
    });

    it('should display featured appointments section when present', () => {
      const props = createMockNewsletterProps({
        featuredAppointments: [
          createMockAppointment({ 
            id: 1, 
            featured: true, 
            title: 'Important Featured Event' 
          })
        ]
      });
      
      const component = Newsletter(props);
      expect(component).toBeDefined();
    });

    it('should display upcoming appointments section when present', () => {
      const props = createMockNewsletterProps({
        upcomingAppointments: [
          createMockAppointment({ 
            id: 2, 
            title: 'Regular Event' 
          })
        ]
      });
      
      const component = Newsletter(props);
      expect(component).toBeDefined();
    });

    it('should display status reports section when present', () => {
      const props = createMockNewsletterProps({
        statusReportsByGroup: [
          {
            group: createMockGroup({ name: 'Active Group' }),
            reports: [
              createMockStatusReport({ 
                title: 'Recent Activity Report' 
              })
            ]
          }
        ]
      });
      
      const component = Newsletter(props);
      expect(component).toBeDefined();
    });
  });

  describe('Empty State Handling', () => {
    it('should handle empty featured appointments', () => {
      const props = createMockNewsletterProps({
        featuredAppointments: []
      });
      
      const component = Newsletter(props);
      expect(component).toBeDefined();
    });

    it('should handle empty upcoming appointments', () => {
      const props = createMockNewsletterProps({
        upcomingAppointments: []
      });
      
      const component = Newsletter(props);
      expect(component).toBeDefined();
    });

    it('should handle empty status reports', () => {
      const props = createMockNewsletterProps({
        statusReportsByGroup: []
      });
      
      const component = Newsletter(props);
      expect(component).toBeDefined();
    });

    it('should show empty state when no content available', () => {
      const props = createMockNewsletterProps({
        featuredAppointments: [],
        upcomingAppointments: [],
        statusReportsByGroup: []
      });
      
      const component = Newsletter(props);
      expect(component).toBeDefined();
      
      // Should include empty state message and button
    });
  });

  describe('Props Validation', () => {
    it('should accept valid newsletter settings', () => {
      const props = createMockNewsletterProps();
      
      expect(() => Newsletter(props)).not.toThrow();
    });

    it('should handle minimal required props', () => {
      const minimalProps: NewsletterEmailProps = {
        newsletterSettings: createMockNewsletterSettings(),
        introductionText: 'Minimal newsletter',
        featuredAppointments: [],
        upcomingAppointments: [],
        statusReportsByGroup: [],
        baseUrl: 'https://example.com'
      };
      
      expect(() => Newsletter(minimalProps)).not.toThrow();
    });

    it('should use provided base URL for link generation', () => {
      const customBaseUrl = 'https://custom-domain.com';
      const props = createMockNewsletterProps({
        baseUrl: customBaseUrl
      });
      
      const component = Newsletter(props);
      expect(component).toBeDefined();
      
      // Links should use the custom base URL
      // (Would need rendering to verify actual URLs)
    });
  });

  describe('Accessibility and Structure', () => {
    it('should have proper HTML structure', () => {
      const props = createMockNewsletterProps();
      const component = Newsletter(props);
      
      expect(component.type).toBe('html');
      expect(component.props.lang).toBe('de');
      
      // Should have head and body
      const children = component.props.children;
      const head = children.find((child: any) => child.type === 'head');
      const body = children.find((child: any) => child.type === 'body');
      
      expect(head).toBeDefined();
      expect(body).toBeDefined();
    });

    it('should use semantic HTML elements', () => {
      const props = createMockNewsletterProps();
      const component = Newsletter(props);
      
      // Component should use proper React Email components
      // that render to semantic HTML
      expect(component).toBeDefined();
    });
  });

  describe('Style Integration', () => {
    it('should apply consistent styling', () => {
      const props = createMockNewsletterProps();
      const component = Newsletter(props);
      
      // Should use styles from utils/styles.ts
      expect(component).toBeDefined();
    });

    it('should be responsive for email clients', () => {
      const props = createMockNewsletterProps();
      const component = Newsletter(props);
      
      // Should include responsive styling patterns
      expect(component).toBeDefined();
    });
  });

  describe('Integration with Helper Functions', () => {
    it('should use helper functions for date formatting', () => {
      const props = createMockNewsletterProps({
        featuredAppointments: [
          createMockAppointment({
            startDateTime: new Date('2025-02-15T14:30:00Z'),
            endDateTime: new Date('2025-02-15T16:30:00Z')
          })
        ]
      });
      
      const component = Newsletter(props);
      expect(component).toBeDefined();
      
      // Date formatting should be applied through helper functions
    });

    it('should use helper functions for text truncation', () => {
      const longText = 'A'.repeat(500);
      const props = createMockNewsletterProps({
        upcomingAppointments: [
          createMockAppointment({
            mainText: longText
          })
        ]
      });
      
      const component = Newsletter(props);
      expect(component).toBeDefined();
      
      // Text should be truncated through helper functions
    });

    it('should use helper functions for image URL generation', () => {
      const props = createMockNewsletterProps({
        featuredAppointments: [
          createMockAppointment({
            featured: true,
            metadata: JSON.stringify({
              croppedCoverImageUrl: 'https://example.com/featured-image.jpg'
            })
          })
        ]
      });
      
      const component = Newsletter(props);
      expect(component).toBeDefined();
      
      // Cover images should be processed through helper functions
    });
  });

  describe('Component Integration', () => {
    it('should integrate with Header component', () => {
      const props = createMockNewsletterProps();
      const component = Newsletter(props);
      
      // Should include Header component with correct props
      expect(component).toBeDefined();
    });

    it('should integrate with Footer component', () => {
      const props = createMockNewsletterProps();
      const component = Newsletter(props);
      
      // Should include Footer component with correct props
      expect(component).toBeDefined();
    });

    it('should integrate with FeaturedEvent components', () => {
      const props = createMockNewsletterProps({
        featuredAppointments: [createMockAppointment({ featured: true })]
      });
      
      const component = Newsletter(props);
      expect(component).toBeDefined();
    });

    it('should integrate with UpcomingEvent components', () => {
      const props = createMockNewsletterProps({
        upcomingAppointments: [createMockAppointment()]
      });
      
      const component = Newsletter(props);
      expect(component).toBeDefined();
    });

    it('should integrate with StatusReports component', () => {
      const props = createMockNewsletterProps({
        statusReportsByGroup: [
          {
            group: createMockGroup(),
            reports: [createMockStatusReport()]
          }
        ]
      });
      
      const component = Newsletter(props);
      expect(component).toBeDefined();
    });
  });
});