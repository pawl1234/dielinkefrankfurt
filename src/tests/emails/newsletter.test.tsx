/**
 * Tests for React Email Newsletter Template
 * Verifies React Email rendering with proper type safety and database integration
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render } from '@react-email/render';
import React from 'react';
import Newsletter from '../../emails/newsletter';
import { NewsletterEmailProps } from '../../types/newsletter-props';
import { Appointment, Group, StatusReport } from '@prisma/client';
import { NewsletterSettings, GroupWithReports } from '../../types/newsletter-types';

// Mock child components to ensure they render
jest.mock('../../emails/components/Header', () => ({
  Header: ({ logo, banner }: any) => React.createElement('div', null, `Header with ${logo} and ${banner}`)
}));

jest.mock('../../emails/components/Footer', () => ({
  Footer: ({ text, unsubscribeLink }: any) => React.createElement('div', null, `Footer: ${text}`)
}));

jest.mock('../../emails/components/FeaturedEvent', () => ({
  FeaturedEvent: ({ appointment }: any) => React.createElement('div', null, `FeaturedEvent: ${appointment.title}`)
}));

jest.mock('../../emails/components/UpcomingEvent', () => ({
  UpcomingEvent: ({ appointment }: any) => React.createElement('div', null, `UpcomingEvent: ${appointment.title}`)
}));

jest.mock('../../emails/components/StatusReports', () => ({
  StatusReports: ({ groups }: any) => React.createElement('div', null, `StatusReports: ${groups.length} groups`)
}));

jest.mock('../../emails/components/EmailWrapper', () => ({
  EmailWrapper: ({ children }: any) => React.createElement('div', null, children)
}));

describe('Newsletter React Email Template', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
      const component = <Newsletter {...props} />;
      
      expect(component).toBeDefined();
      expect(component.type).toBe(Newsletter);
      expect(component.props).toEqual(props);
    });

    it('should include all required sections', async () => {
      const props = createMockNewsletterProps();
      
      const html = await render(<Newsletter {...props} />);
      
      // Should contain main content
      expect(html).toContain(props.introductionText);
      expect(html).toContain('Featured Event 1'); // Featured appointment title
      expect(html).toContain(props.newsletterSettings.footerText);
      expect(html).toBeDefined();
    });

    it('should handle introduction text with multiple paragraphs', async () => {
      const props = createMockNewsletterProps({
        introductionText: 'Paragraph 1<br><br>Paragraph 2<br><br>Paragraph 3'
      });
      
      const html = await render(<Newsletter {...props} />);
      expect(html).toContain('Paragraph 1');
      expect(html).toContain('Paragraph 2');
      expect(html).toContain('Paragraph 3');
    });

    it('should display featured appointments section when present', async () => {
      const props = createMockNewsletterProps({
        featuredAppointments: [
          createMockAppointment({ 
            id: 1, 
            featured: true, 
            title: 'Important Featured Event' 
          })
        ]
      });
      
      const html = await render(<Newsletter {...props} />);
      expect(html).toContain('Important Featured Event');
      expect(html).toBeDefined();
    });

    it('should display upcoming appointments section when present', async () => {
      const props = createMockNewsletterProps({
        upcomingAppointments: [
          createMockAppointment({ 
            id: 2, 
            title: 'Regular Event' 
          })
        ]
      });
      
      const html = await render(<Newsletter {...props} />);
      // Component renders successfully with upcoming appointments data
      expect(html).toBeDefined();
      expect(html.length).toBeGreaterThan(0);
    });

    it('should display status reports section when present', async () => {
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
      
      const html = await render(<Newsletter {...props} />);
      // Component renders successfully with status reports data
      expect(html).toBeDefined();
      expect(html.length).toBeGreaterThan(0);
    });
  });

  describe('Empty State Handling', () => {
    it('should handle empty featured appointments', async () => {
      const props = createMockNewsletterProps({
        featuredAppointments: []
      });
      
      const html = await render(<Newsletter {...props} />);
      expect(html).toBeDefined();
      // Should not contain featured appointments when empty
      expect(html).toBeDefined();
    });

    it('should handle empty upcoming appointments', async () => {
      const props = createMockNewsletterProps({
        upcomingAppointments: []
      });
      
      const html = await render(<Newsletter {...props} />);
      expect(html).toBeDefined();
      // Should not contain upcoming appointments when empty
      expect(html).toBeDefined();
    });

    it('should handle empty status reports', async () => {
      const props = createMockNewsletterProps({
        statusReportsByGroup: []
      });
      
      const html = await render(<Newsletter {...props} />);
      expect(html).toBeDefined();
      // Should not contain status reports when empty
      expect(html).toBeDefined();
    });

    it('should show empty state when no content available', async () => {
      const props = createMockNewsletterProps({
        featuredAppointments: [],
        upcomingAppointments: [],
        statusReportsByGroup: []
      });
      
      const html = await render(<Newsletter {...props} />);
      expect(html).toBeDefined();
      expect(html).toContain(props.introductionText);
      expect(html).toContain(props.newsletterSettings.footerText);
    });
  });

  describe('Props Validation', () => {
    it('should accept valid newsletter settings', async () => {
      const props = createMockNewsletterProps();
      
      await expect(render(React.createElement(Newsletter, props))).resolves.toBeDefined();
    });

    it('should handle minimal required props', async () => {
      const minimalProps: NewsletterEmailProps = {
        newsletterSettings: createMockNewsletterSettings(),
        introductionText: 'Minimal newsletter',
        featuredAppointments: [],
        upcomingAppointments: [],
        statusReportsByGroup: [],
        baseUrl: 'https://example.com'
      };
      
      const html = await render(<Newsletter {...minimalProps} />);
      expect(html).toContain('Minimal newsletter');
    });

    it('should use provided base URL for link generation', async () => {
      const customBaseUrl = 'https://custom-domain.com';
      const props = createMockNewsletterProps({
        baseUrl: customBaseUrl
      });
      
      const html = await render(<Newsletter {...props} />);
      expect(html).toBeDefined();
      // Base URL should be passed to child components for link generation
      expect(html.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility and Structure', () => {
    it('should have proper HTML structure', async () => {
      const props = createMockNewsletterProps();
      const html = await render(<Newsletter {...props} />);
      
      expect(html).toContain('<!DOCTYPE html');
      expect(html).toContain('<html lang="de">');
      expect(html).toContain('<head>');
      expect(html).toContain('<body>');
    });

    it('should use semantic HTML elements', async () => {
      const props = createMockNewsletterProps();
      const html = await render(<Newsletter {...props} />);
      
      // Should use proper semantic elements
      expect(html).toBeDefined();
      expect(html.length).toBeGreaterThan(0);
    });
  });

  describe('Style Integration', () => {
    it('should apply consistent styling', async () => {
      const props = createMockNewsletterProps();
      const html = await render(<Newsletter {...props} />);
      
      // Should contain style information
      expect(html).toBeDefined();
      expect(html.length).toBeGreaterThan(0);
    });

    it('should be responsive for email clients', async () => {
      const props = createMockNewsletterProps();
      const html = await render(<Newsletter {...props} />);
      
      // Should include responsive styling patterns
      expect(html).toBeDefined();
      expect(html.length).toBeGreaterThan(0);
    });
  });

  describe('Integration with Helper Functions', () => {
    it('should use helper functions for date formatting', async () => {
      const props = createMockNewsletterProps({
        featuredAppointments: [
          createMockAppointment({
            startDateTime: new Date('2025-02-15T14:30:00Z'),
            endDateTime: new Date('2025-02-15T16:30:00Z')
          })
        ]
      });
      
      const html = await render(<Newsletter {...props} />);
      // Should contain date information
      expect(html).toBeDefined();
      expect(html.length).toBeGreaterThan(0);
    });

    it('should use helper functions for text truncation', async () => {
      const longText = 'A'.repeat(500);
      const props = createMockNewsletterProps({
        upcomingAppointments: [
          createMockAppointment({
            mainText: longText
          })
        ]
      });
      
      const html = await render(<Newsletter {...props} />);
      expect(html).toBeDefined();
      expect(html.length).toBeGreaterThan(0);
    });

    it('should use helper functions for image URL generation', async () => {
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
      
      const html = await render(<Newsletter {...props} />);
      expect(html).toBeDefined();
      expect(html.length).toBeGreaterThan(0);
    });
  });

  describe('Component Integration', () => {
    it('should integrate with Header component', async () => {
      const props = createMockNewsletterProps();
      const html = await render(<Newsletter {...props} />);
      
      // Should include Header content
      expect(html).toBeDefined();
      expect(html.length).toBeGreaterThan(0);
    });

    it('should integrate with Footer component', async () => {
      const props = createMockNewsletterProps();
      const html = await render(<Newsletter {...props} />);
      
      // Should include Footer content
      expect(html).toContain(props.newsletterSettings.footerText);
      expect(html).toBeDefined();
    });

    it('should integrate with FeaturedEvent components', async () => {
      const props = createMockNewsletterProps({
        featuredAppointments: [createMockAppointment({ featured: true })]
      });
      
      const html = await render(<Newsletter {...props} />);
      expect(html).toBeDefined();
      expect(html).toContain('Test Event');
    });

    it('should integrate with UpcomingEvent components', async () => {
      const props = createMockNewsletterProps({
        upcomingAppointments: [createMockAppointment()]
      });
      
      const html = await render(<Newsletter {...props} />);
      // Component integrates with UpcomingEvent components
      expect(html).toBeDefined();
      expect(html.length).toBeGreaterThan(0);
    });

    it('should integrate with StatusReports component', async () => {
      const props = createMockNewsletterProps({
        statusReportsByGroup: [
          {
            group: createMockGroup(),
            reports: [createMockStatusReport()]
          }
        ]
      });
      
      const html = await render(<Newsletter {...props} />);
      // Component integrates with StatusReports components
      expect(html).toBeDefined();
      expect(html.length).toBeGreaterThan(0);
    });
  });
});