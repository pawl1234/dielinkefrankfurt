import { NextRequest, NextResponse } from 'next/server';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { subWeeks } from 'date-fns';

// Mock dependencies before importing the route
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    appointment: {
      findMany: jest.fn()
    },
    statusReport: {
      findMany: jest.fn()
    },
    newsletterItem: {
      create: jest.fn()
    }
  }
}));

jest.mock('@/lib/newsletter-service', () => ({
  getNewsletterSettings: jest.fn(),
  generateNewsletter: jest.fn()
}));

jest.mock('@/lib/newsletter-template', () => ({
  generateNewsletterHtml: jest.fn(),
  getDefaultNewsletterSettings: jest.fn(() => ({
    headerLogo: '/default-logo.png',
    footerText: 'Default footer',
    unsubscribeLink: 'https://example.com/unsubscribe'
  }))
}));

jest.mock('@/lib/base-url', () => ({
  getBaseUrl: jest.fn(() => 'https://example.com')
}));

jest.mock('@/lib/api-auth', () => ({
  withAdminAuth: jest.fn((handler) => handler)
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

jest.mock('@/lib/errors', () => ({
  apiErrorResponse: jest.fn((error, message) => {
    return NextResponse.json(
      { error: message || 'An error occurred' },
      { status: 500 }
    );
  }),
  handleDatabaseError: jest.fn((error, operation) => {
    return new Error(`Database error in ${operation}`);
  })
}));

// Import after mocking
import { GET, POST } from '@/app/api/admin/newsletter/generate/route';
import prisma from '@/lib/prisma';
import { getNewsletterSettings, generateNewsletter } from '@/lib/newsletter-service';
import { generateNewsletterHtml } from '@/lib/newsletter-template';
import { withAdminAuth } from '@/lib/api-auth';
import { logger } from '@/lib/logger';
import { handleDatabaseError } from '@/lib/errors';

// Type assertions for mocked functions
const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockGetNewsletterSettings = getNewsletterSettings as jest.MockedFunction<typeof getNewsletterSettings>;
const mockGenerateNewsletterHtml = generateNewsletterHtml as jest.MockedFunction<typeof generateNewsletterHtml>;
const mockWithAdminAuth = withAdminAuth as jest.MockedFunction<typeof withAdminAuth>;

describe('/api/admin/newsletter/generate', () => {
  const mockAppointments = [
    {
      id: 'apt-1',
      title: 'Featured Event',
      mainText: 'Featured event description',
      startDateTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      endDateTime: new Date(Date.now() + 25 * 60 * 60 * 1000),
      featured: true,
      status: 'accepted'
    },
    {
      id: 'apt-2',
      title: 'Regular Event',
      mainText: 'Regular event description',
      startDateTime: new Date(Date.now() + 48 * 60 * 60 * 1000), // 2 days from now
      endDateTime: new Date(Date.now() + 49 * 60 * 60 * 1000),
      featured: false,
      status: 'accepted'
    }
  ];

  const mockStatusReports = [
    {
      id: 'report-1',
      title: 'Status Update 1',
      content: 'Report content 1',
      status: 'ACTIVE',
      groupId: 'group-1',
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
      group: {
        id: 'group-1',
        name: 'Test Group',
        slug: 'test-group',
        logoUrl: '/group-logo.png'
      }
    },
    {
      id: 'report-2',
      title: 'Status Update 2',
      content: 'Report content 2',
      status: 'ACTIVE',
      groupId: 'group-1',
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      group: {
        id: 'group-1',
        name: 'Test Group',
        slug: 'test-group',
        logoUrl: '/group-logo.png'
      }
    }
  ];

  const mockNewsletterSettings = {
    id: 'settings-1',
    headerLogo: '/logo.png',
    headerBanner: '/banner.png',
    footerText: 'Test footer',
    unsubscribeLink: 'https://example.com/unsubscribe',
    testEmailRecipients: ['test@example.com']
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset withAdminAuth to pass through by default
    mockWithAdminAuth.mockImplementation((handler) => handler);
    // Set up default mocks
    mockPrisma.appointment.findMany.mockResolvedValue(mockAppointments);
    mockPrisma.statusReport.findMany.mockResolvedValue(mockStatusReports);
    mockGetNewsletterSettings.mockResolvedValue(mockNewsletterSettings as Awaited<ReturnType<typeof getNewsletterSettings>>);
    mockGenerateNewsletterHtml.mockReturnValue('<html>Generated Newsletter</html>');
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Successful newsletter generation', () => {
    it('should generate newsletter with appointments and status reports', async () => {
      const mockNewsletter = {
        id: 'newsletter-123',
        subject: 'Test Newsletter',
        introductionText: '<p>Test introduction</p>',
        content: '<html>Generated Newsletter</html>',
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.newsletterItem.create.mockResolvedValue(mockNewsletter);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/generate', {
        method: 'POST',
        body: JSON.stringify({
          subject: 'Test Newsletter',
          introductionText: '<p>Test introduction</p>'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        id: 'newsletter-123',
        subject: 'Test Newsletter',
        introductionText: '<p>Test introduction</p>',
        status: 'draft',
        createdAt: mockNewsletter.createdAt,
        updatedAt: mockNewsletter.updatedAt
      });

      // Verify data fetching
      expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith({
        where: {
          status: 'accepted',
          startDateTime: {
            gte: expect.any(Date)
          }
        },
        orderBy: [
          { featured: 'desc' },
          { startDateTime: 'asc' }
        ]
      });

      expect(mockPrisma.statusReport.findMany).toHaveBeenCalledWith({
        where: {
          status: 'ACTIVE',
          createdAt: {
            gte: expect.any(Date)
          }
        },
        include: {
          group: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      expect(mockGetNewsletterSettings).toHaveBeenCalled();

      // Verify HTML generation
      expect(mockGenerateNewsletterHtml).toHaveBeenCalledWith({
        newsletterSettings: mockNewsletterSettings,
        introductionText: '<p>Test introduction</p>',
        featuredAppointments: [mockAppointments[0]],
        upcomingAppointments: [mockAppointments[1]],
        statusReportsByGroup: [{
          group: mockStatusReports[0].group,
          reports: [mockStatusReports[0], mockStatusReports[1]]
        }],
        baseUrl: 'https://example.com'
      });

      // Verify newsletter creation
      expect(mockPrisma.newsletterItem.create).toHaveBeenCalledWith({
        data: {
          subject: 'Test Newsletter',
          introductionText: '<p>Test introduction</p>',
          content: '<html>Generated Newsletter</html>',
          status: 'draft'
        }
      });

      // Verify logging
      expect(logger.debug).toHaveBeenCalledWith(
        'Generating new newsletter',
        expect.objectContaining({
          module: 'api',
          context: expect.objectContaining({
            endpoint: '/api/admin/newsletter/generate',
            method: 'POST'
          })
        })
      );

      expect(logger.info).toHaveBeenCalledWith(
        'Newsletter generated successfully',
        expect.objectContaining({
          module: 'api',
          context: expect.objectContaining({
            newsletterId: 'newsletter-123',
            subject: 'Test Newsletter'
          })
        })
      );
    });

    it('should generate newsletter with missing introduction text', async () => {
      const mockNewsletter = {
        id: 'newsletter-456',
        subject: 'Newsletter Without Intro',
        introductionText: '',
        content: '<html>Generated Newsletter</html>',
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.newsletterItem.create.mockResolvedValue(mockNewsletter);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/generate', {
        method: 'POST',
        body: JSON.stringify({
          subject: 'Newsletter Without Intro'
          // No introductionText provided
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.introductionText).toBe('');

      // Verify generateNewsletterHtml was called with empty introduction
      expect(mockGenerateNewsletterHtml).toHaveBeenCalledWith(
        expect.objectContaining({
          introductionText: ''
        })
      );
    });

    it('should handle empty appointments and status reports', async () => {
      mockPrisma.appointment.findMany.mockResolvedValue([]);
      mockPrisma.statusReport.findMany.mockResolvedValue([]);

      const mockNewsletter = {
        id: 'newsletter-789',
        subject: 'Empty Newsletter',
        introductionText: '<p>No events this week</p>',
        content: '<html>Empty Newsletter</html>',
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.newsletterItem.create.mockResolvedValue(mockNewsletter);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/generate', {
        method: 'POST',
        body: JSON.stringify({
          subject: 'Empty Newsletter',
          introductionText: '<p>No events this week</p>'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);

      expect(response.status).toBe(200);

      // Verify HTML generation with empty data
      expect(mockGenerateNewsletterHtml).toHaveBeenCalledWith(
        expect.objectContaining({
          featuredAppointments: [],
          upcomingAppointments: [],
          statusReportsByGroup: []
        })
      );
    });
  });

  describe('Validation', () => {
    it('should reject request without subject', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/generate', {
        method: 'POST',
        body: JSON.stringify({
          introductionText: '<p>Test</p>'
          // No subject
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: 'Subject is required' });
      expect(mockPrisma.newsletterItem.create).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        'Newsletter generation failed - missing subject',
        expect.any(Object)
      );
    });

    it('should reject request with empty subject', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/generate', {
        method: 'POST',
        body: JSON.stringify({
          subject: '   ',
          introductionText: '<p>Test</p>'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: 'Subject is required' });
    });

    it('should reject request with subject too long', async () => {
      const longSubject = 'a'.repeat(201);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/generate', {
        method: 'POST',
        body: JSON.stringify({
          subject: longSubject,
          introductionText: '<p>Test</p>'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: 'Subject must be 200 characters or less' });
      expect(logger.warn).toHaveBeenCalledWith(
        'Newsletter generation failed - subject too long',
        expect.objectContaining({
          context: expect.objectContaining({
            subjectLength: 201
          })
        })
      );
    });

    it('should trim whitespace from subject', async () => {
      const mockNewsletter = {
        id: 'newsletter-trim',
        subject: 'Trimmed Subject',
        introductionText: '',
        content: '<html>Newsletter</html>',
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.newsletterItem.create.mockResolvedValue(mockNewsletter);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/generate', {
        method: 'POST',
        body: JSON.stringify({
          subject: '  Trimmed Subject  '
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      await POST(request);

      expect(mockPrisma.newsletterItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          subject: 'Trimmed Subject'
        })
      });
    });
  });

  describe('Authentication requirements', () => {
    it('should require authentication', async () => {
      // Mock authentication failure
      mockWithAdminAuth.mockImplementationOnce(() => {
        return async () => {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        };
      });

      const handler = withAdminAuth(async () => {
        return NextResponse.json({ data: 'should not reach here' });
      });

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/generate', {
        method: 'POST',
        body: JSON.stringify({
          subject: 'Test',
          introductionText: 'Test'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await handler(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: 'Unauthorized' });
      expect(mockPrisma.newsletterItem.create).not.toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should handle database errors when fetching appointments', async () => {
      const dbError = new Error('Database connection failed');
      mockPrisma.appointment.findMany.mockRejectedValue(dbError);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/generate', {
        method: 'POST',
        body: JSON.stringify({
          subject: 'Test Newsletter',
          introductionText: '<p>Test</p>'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Failed to generate newsletter' });
      expect(logger.error).toHaveBeenCalledWith(
        dbError,
        expect.objectContaining({
          module: 'api',
          context: expect.objectContaining({
            operation: 'generateNewsletter'
          })
        })
      );
    });

    it('should handle database errors when creating newsletter', async () => {
      const dbError = new Error('Insert failed');
      dbError.code = 'P2002'; // Prisma unique constraint error
      mockPrisma.newsletterItem.create.mockRejectedValue(dbError);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/generate', {
        method: 'POST',
        body: JSON.stringify({
          subject: 'Test Newsletter',
          introductionText: '<p>Test</p>'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Failed to generate newsletter' });
      expect(handleDatabaseError).toHaveBeenCalledWith(dbError, 'generateNewsletter');
    });

    it('should handle malformed JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/generate', {
        method: 'POST',
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Failed to generate newsletter' });
      expect(mockPrisma.newsletterItem.create).not.toHaveBeenCalled();
    });
  });

  describe('Date filtering', () => {
    it('should only fetch future appointments', async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/generate', {
        method: 'POST',
        body: JSON.stringify({
          subject: 'Test Newsletter'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      mockPrisma.newsletterItem.create.mockResolvedValue({
        id: 'newsletter-date',
        subject: 'Test Newsletter',
        introductionText: '',
        content: '<html>Newsletter</html>',
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await POST(request);

      // Verify appointment query filters by date
      const appointmentCall = mockPrisma.appointment.findMany.mock.calls[0][0];
      expect(appointmentCall.where.startDateTime.gte).toEqual(today);
    });

    it('should fetch status reports from last 2 weeks', async () => {
      const twoWeeksAgo = subWeeks(new Date(), 2);
      twoWeeksAgo.setHours(0, 0, 0, 0);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/generate', {
        method: 'POST',
        body: JSON.stringify({
          subject: 'Test Newsletter'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      mockPrisma.newsletterItem.create.mockResolvedValue({
        id: 'newsletter-date2',
        subject: 'Test Newsletter',
        introductionText: '',
        content: '<html>Newsletter</html>',
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await POST(request);

      // Verify status report query filters by date
      const statusReportCall = mockPrisma.statusReport.findMany.mock.calls[0][0];
      const queryDate = statusReportCall.where.createdAt.gte;
      
      // Check that the date is approximately 2 weeks ago (within 1 day tolerance)
      const diffInMs = Math.abs(queryDate.getTime() - twoWeeksAgo.getTime());
      const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
      expect(diffInDays).toBeLessThan(1);
    });
  });

  describe('GET endpoint (preview)', () => {
    const mockGenerateNewsletter = generateNewsletter as jest.MockedFunction<typeof generateNewsletter>;

    beforeEach(() => {
      mockGenerateNewsletter.mockResolvedValue('<html>Preview Newsletter HTML</html>');
    });

    it('should generate newsletter preview HTML', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/generate?introductionText=<p>Custom intro</p>');

      const response = await GET(request);
      const html = await response.text();

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('text/html');
      expect(html).toBe('<html>Preview Newsletter HTML</html>');
      expect(mockGenerateNewsletter).toHaveBeenCalledWith('<p>Custom intro</p>');

      // Verify logging
      expect(logger.debug).toHaveBeenCalledWith(
        'Generating newsletter preview',
        expect.objectContaining({
          module: 'api',
          context: expect.objectContaining({
            endpoint: '/api/admin/newsletter/generate',
            method: 'GET'
          })
        })
      );
    });

    it('should use default introduction text when not provided', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/generate');

      await GET(request);

      expect(mockGenerateNewsletter).toHaveBeenCalledWith(
        '<p>Herzlich willkommen zum Newsletter der Linken Frankfurt!</p>'
      );
    });

    it('should handle errors during preview generation', async () => {
      const error = new Error('Preview generation failed');
      mockGenerateNewsletter.mockRejectedValue(error);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/generate');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Failed to generate newsletter preview' });
      expect(logger.error).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          module: 'api',
          context: expect.objectContaining({
            operation: 'generateNewsletterPreview'
          })
        })
      );
    });

    it('should require authentication for preview', async () => {
      // Mock authentication failure
      mockWithAdminAuth.mockImplementationOnce(() => {
        return async () => {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        };
      });

      const handler = withAdminAuth(async () => {
        return NextResponse.json({ data: 'should not reach here' });
      });

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/generate');

      const response = await handler(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: 'Unauthorized' });
      expect(mockGenerateNewsletter).not.toHaveBeenCalled();
    });
  });
});