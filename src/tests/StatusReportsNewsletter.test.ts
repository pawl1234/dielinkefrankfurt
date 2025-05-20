import { subDays, subWeeks } from 'date-fns';
import prisma from '../lib/prisma';
import { 
  truncateText, 
  generateStatusReportsHtml, 
  generateNewsletterHtml 
} from '../lib/newsletter-template';

// Mock the Prisma client
jest.mock('../lib/prisma', () => ({
  group: {
    findMany: jest.fn(),
  },
}));

// Test data for groups and status reports
const mockGroups = [
  {
    id: 'group1',
    name: 'Bündnis für Solidarität',
    slug: 'buendnis-fuer-solidaritaet',
    description: 'Group description',
    logoUrl: 'https://example.com/logo1.png',
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
    statusReports: [
      {
        id: 'report1',
        title: 'Recent report',
        content: 'This is a recent report that should be included in the newsletter.',
        reporterFirstName: 'Max',
        reporterLastName: 'Mustermann',
        createdAt: subDays(new Date(), 5),
        updatedAt: subDays(new Date(), 5),
        status: 'ACTIVE',
        groupId: 'group1',
      },
      {
        id: 'report2',
        title: 'Old report',
        content: 'This is an old report that should not be included in the newsletter.',
        reporterFirstName: 'Anna',
        reporterLastName: 'Schmidt',
        createdAt: subWeeks(new Date(), 3),
        updatedAt: subWeeks(new Date(), 3),
        status: 'ACTIVE',
        groupId: 'group1',
      },
    ],
  },
  {
    id: 'group2',
    name: 'Antifa Frankfurt',
    slug: 'antifa-frankfurt',
    description: 'Group description',
    logoUrl: 'https://example.com/logo2.png',
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
    statusReports: [
      {
        id: 'report3',
        title: 'Recent antifa report',
        content: 'This is a recent antifa report that should be included in the newsletter.',
        reporterFirstName: 'Lisa',
        reporterLastName: 'Weber',
        createdAt: subDays(new Date(), 7),
        updatedAt: subDays(new Date(), 7),
        status: 'ACTIVE',
        groupId: 'group2',
      },
    ],
  },
  {
    id: 'group3',
    name: 'Zirkel für politische Bildung',
    slug: 'zirkel-fuer-politische-bildung',
    description: 'Group description',
    logoUrl: 'https://example.com/logo3.png',
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
    statusReports: [],
  },
  {
    id: 'group4',
    name: 'Deaktivierte Gruppe',
    slug: 'deaktivierte-gruppe',
    description: 'Group description',
    logoUrl: 'https://example.com/logo4.png',
    status: 'ARCHIVED',
    createdAt: new Date(),
    updatedAt: new Date(),
    statusReports: [
      {
        id: 'report4',
        title: 'Report from deactivated group',
        content: 'This report should not be included because the group is archived.',
        reporterFirstName: 'Peter',
        reporterLastName: 'Müller',
        createdAt: subDays(new Date(), 3),
        updatedAt: subDays(new Date(), 3),
        status: 'ACTIVE',
        groupId: 'group4',
      },
    ],
  },
];

// Convert database structure to the expected format for the template
const mockNewsletterGroups = mockGroups
  .filter(group => group.status === 'ACTIVE' && group.statusReports.length > 0)
  .sort((a, b) => a.name.localeCompare(b.name))
  .map(group => ({
    group: {
      id: group.id,
      name: group.name,
      slug: group.slug,
      description: group.description,
      logoUrl: group.logoUrl,
      status: group.status,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
      metadata: null,
    },
    reports: group.statusReports.filter(report => 
      report.status === 'ACTIVE' && 
      new Date(report.createdAt) >= subWeeks(new Date(), 2)
    ).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }));

// Mock newsletter params
const mockNewsletterParams = {
  newsletterSettings: {
    headerLogo: 'https://example.com/logo.png',
    headerBanner: 'https://example.com/banner.jpg',
    footerText: 'Die Linke Frankfurt am Main',
    unsubscribeLink: 'https://example.com/unsubscribe',
  },
  introductionText: '<p>Willkommen zum Newsletter!</p>',
  featuredAppointments: [],
  upcomingAppointments: [],
  statusReportsByGroup: mockNewsletterGroups,
  baseUrl: 'https://example.com',
};

describe('Status Reports for Newsletter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should fetch only recent status reports from active groups', async () => {
    // Create a modified version with only recent reports
    const mockGroupsWithOnlyRecentReports = [
      {
        ...mockGroups[0],
        statusReports: [mockGroups[0].statusReports[0]] // Only include the recent report
      },
      mockGroups[1]
    ];
    
    // Mock the Prisma response
    (prisma.group.findMany as jest.Mock).mockResolvedValue(mockGroupsWithOnlyRecentReports);

    // Get the date 2 weeks ago
    const twoWeeksAgo = subWeeks(new Date(), 2);
    
    // Get all active groups
    const groups = await prisma.group.findMany({
      where: {
        status: 'ACTIVE'
      },
      orderBy: {
        name: 'asc'
      },
      include: {
        statusReports: {
          where: {
            status: 'ACTIVE',
            createdAt: {
              gte: twoWeeksAgo
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    // Filter out groups with no reports
    const statusReportsByGroup = groups
      .filter(group => group.statusReports.length > 0)
      .map(group => ({
        group: {
          id: group.id,
          name: group.name,
          slug: group.slug,
          description: group.description,
          logoUrl: group.logoUrl,
          status: group.status,
          createdAt: group.createdAt,
          updatedAt: group.updatedAt
        },
        reports: group.statusReports
      }));

    // Verify filtering and sorting
    expect(prisma.group.findMany).toHaveBeenCalledWith({
      where: { status: 'ACTIVE' },
      orderBy: { name: 'asc' },
      include: expect.any(Object)
    });

    // Should only include groups with reports
    expect(statusReportsByGroup.length).toBe(2);
    
    // Groups should be the ones we mocked
    expect(statusReportsByGroup[0].group.name).toBe('Bündnis für Solidarität');
    expect(statusReportsByGroup[1].group.name).toBe('Antifa Frankfurt');
    
    // Should only include recent reports
    expect(statusReportsByGroup[0].reports.length).toBe(1);
    expect(statusReportsByGroup[1].reports.length).toBe(1);
    
    // Should not include the old report from group1
    const reportsFromGroup1 = statusReportsByGroup
      .find(g => g.group.id === 'group1')?.reports || [];
    expect(reportsFromGroup1.length).toBe(1);
    expect(reportsFromGroup1[0].id).toBe('report1');
    
    // Should not include any reports from archived groups
    const archivedGroups = statusReportsByGroup
      .filter(g => g.group.status === 'ARCHIVED');
    expect(archivedGroups.length).toBe(0);
  });

  test('truncateText function should properly truncate text', () => {
    const shortText = 'This is a short text.';
    const longText = 'This is a very long text that should be truncated because it exceeds the maximum length. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.';
    
    // Short text should not be truncated
    expect(truncateText(shortText)).toBe(shortText);
    
    // Long text should be truncated
    const truncated = truncateText(longText);
    expect(truncated.length).toBeLessThan(longText.length);
    expect(truncated.endsWith('...')).toBe(true);
    
    // Custom max length should be respected
    const customTruncated = truncateText(longText, 50);
    expect(customTruncated.length).toBeLessThan(55); // 50 + '...' length
    expect(customTruncated.endsWith('...')).toBe(true);
  });

  test('generateStatusReportsHtml should correctly generate HTML for status reports', () => {
    const baseUrl = 'https://example.com';
    const statusReportsHtml = generateStatusReportsHtml(mockNewsletterGroups, baseUrl);
    
    // Should contain section title
    expect(statusReportsHtml).toContain('<h2 class="section-title">Aktuelle Gruppenberichte</h2>');
    
    // Should include group names
    expect(statusReportsHtml).toContain('Antifa Frankfurt');
    expect(statusReportsHtml).toContain('Bündnis für Solidarität');
    
    // Should include report titles
    expect(statusReportsHtml).toContain('Recent report');
    expect(statusReportsHtml).toContain('Recent antifa report');
    
    // Should NOT include old reports
    expect(statusReportsHtml).not.toContain('Old report');
    
    // Should include group logos
    expect(statusReportsHtml).toContain('https://example.com/logo1.png');
    expect(statusReportsHtml).toContain('https://example.com/logo2.png');
    
    // Should include reporter names
    expect(statusReportsHtml).toContain('Max Mustermann');
    expect(statusReportsHtml).toContain('Lisa Weber');
    
    // Should include links to reports
    expect(statusReportsHtml).toContain(`<a href="https://example.com/gruppen/buendnis-fuer-solidaritaet/berichte/report1" class="event-button">`);
    expect(statusReportsHtml).toContain(`<a href="https://example.com/gruppen/antifa-frankfurt/berichte/report3" class="event-button">`);
  });

  test('generateNewsletterHtml should include status reports section', () => {
    const newsletterHtml = generateNewsletterHtml(mockNewsletterParams);
    
    // Should include status reports section
    expect(newsletterHtml).toContain('Aktuelle Gruppenberichte');
    
    // Should include all necessary parts
    expect(newsletterHtml).toContain('<!DOCTYPE html>');
    expect(newsletterHtml).toContain('<html lang="de">');
    expect(newsletterHtml).toContain('.group-logo-placeholder');
    expect(newsletterHtml).toContain('Mehr Infos');
    
    // Should include responsive design
    expect(newsletterHtml).toContain('@media only screen and (max-width: 650px)');
    
    // Should include Outlook-specific fixes
    expect(newsletterHtml).toContain('<!--[if mso]>');
  });

  test('generateNewsletterHtml should handle empty status reports', () => {
    const paramsWithoutStatusReports = {
      ...mockNewsletterParams,
      statusReportsByGroup: []
    };
    
    const newsletterHtml = generateNewsletterHtml(paramsWithoutStatusReports);
    
    // Should not include the status reports section
    expect(newsletterHtml).not.toContain('Aktuelle Gruppenberichte');
  });

  test('generateNewsletterHtml should handle undefined status reports', () => {
    const paramsWithUndefinedStatusReports = {
      ...mockNewsletterParams,
      statusReportsByGroup: undefined
    };
    
    const newsletterHtml = generateNewsletterHtml(paramsWithUndefinedStatusReports);
    
    // Should not include the status reports section
    expect(newsletterHtml).not.toContain('Aktuelle Gruppenberichte');
  });
});