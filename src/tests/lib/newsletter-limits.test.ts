/**
 * Tests for newsletter content limits functionality
 */
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { fetchNewsletterAppointments, fetchNewsletterStatusReports, updateNewsletterSettings } from '@/lib/newsletter-service';
import { NewsletterSettings } from '@/types/newsletter-types';
import { NEWSLETTER_LIMITS } from '@/lib/newsletter-constants';
import prisma from '@/lib/prisma';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  appointment: {
    findMany: jest.fn()
  },
  group: {
    findMany: jest.fn()
  },
  newsletter: {
    findFirst: jest.fn(),
    update: jest.fn(),
    create: jest.fn()
  }
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('Newsletter Content Limits', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clear the newsletter settings cache
    jest.resetModules();
  });

  describe('fetchNewsletterAppointments', () => {
    const mockAppointments = [
      { id: 1, title: 'Featured Event 1', featured: true, status: 'accepted', startDateTime: new Date('2025-12-01') },
      { id: 2, title: 'Featured Event 2', featured: true, status: 'accepted', startDateTime: new Date('2025-12-02') },
      { id: 3, title: 'Featured Event 3', featured: true, status: 'accepted', startDateTime: new Date('2025-12-03') },
      { id: 4, title: 'Regular Event 1', featured: false, status: 'accepted', startDateTime: new Date('2025-12-01') },
      { id: 5, title: 'Regular Event 2', featured: false, status: 'accepted', startDateTime: new Date('2025-12-02') }
    ];

    it('should apply default limits when no settings provided', async () => {
      mockPrisma.appointment.findMany
        .mockResolvedValueOnce(mockAppointments.slice(0, 3)) // Featured (default limit 5)
        .mockResolvedValueOnce(mockAppointments.slice(3)); // Regular (default limit 20)

      const result = await fetchNewsletterAppointments();

      expect(mockPrisma.appointment.findMany).toHaveBeenCalledTimes(2);
      
      // Check featured appointments query
      expect(mockPrisma.appointment.findMany).toHaveBeenNthCalledWith(1, expect.objectContaining({
        take: NEWSLETTER_LIMITS.FEATURED_APPOINTMENTS.DEFAULT
      }));

      // Check upcoming appointments query  
      expect(mockPrisma.appointment.findMany).toHaveBeenNthCalledWith(2, expect.objectContaining({
        take: NEWSLETTER_LIMITS.UPCOMING_APPOINTMENTS.DEFAULT
      }));

      expect(result.featuredAppointments).toHaveLength(3);
      expect(result.upcomingAppointments).toHaveLength(2);
    });

    it('should apply custom limits from settings', async () => {
      const settings: Partial<NewsletterSettings> = {
        maxFeaturedAppointments: 2,
        maxUpcomingAppointments: 1
      };

      mockPrisma.appointment.findMany
        .mockResolvedValueOnce(mockAppointments.slice(0, 2)) // Featured (custom limit 2)
        .mockResolvedValueOnce([mockAppointments[3]]); // Regular (custom limit 1)

      const result = await fetchNewsletterAppointments(settings as NewsletterSettings);

      expect(mockPrisma.appointment.findMany).toHaveBeenCalledTimes(2);
      
      // Check featured appointments query with custom limit
      expect(mockPrisma.appointment.findMany).toHaveBeenNthCalledWith(1, expect.objectContaining({
        take: 2 // Custom limit
      }));

      // Check upcoming appointments query with custom limit
      expect(mockPrisma.appointment.findMany).toHaveBeenNthCalledWith(2, expect.objectContaining({
        take: 1 // Custom limit
      }));

      expect(result.featuredAppointments).toHaveLength(2);
      expect(result.upcomingAppointments).toHaveLength(1);
    });
  });

  describe('fetchNewsletterStatusReports', () => {
    const mockGroups = [
      {
        id: 'group1',
        name: 'Group 1',
        slug: 'group-1',
        description: 'Test Group 1',
        logoUrl: null,
        metadata: null,
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
        statusReports: [
          { id: 'report1', groupId: 'group1', title: 'Report 1', createdAt: new Date('2025-07-20') },
          { id: 'report2', groupId: 'group1', title: 'Report 2', createdAt: new Date('2025-07-19') },
          { id: 'report3', groupId: 'group1', title: 'Report 3', createdAt: new Date('2025-07-18') },
          { id: 'report4', groupId: 'group1', title: 'Report 4', createdAt: new Date('2025-07-17') }
        ]
      },
      {
        id: 'group2',
        name: 'Group 2',
        slug: 'group-2',
        description: 'Test Group 2',
        logoUrl: null,
        metadata: null,
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
        statusReports: [
          { id: 'report5', groupId: 'group2', title: 'Report 5', createdAt: new Date('2025-07-21') }
        ]
      }
    ];

    it('should apply default limits when no settings provided', async () => {
      const limitedGroups = mockGroups.map(group => ({
        ...group,
        statusReports: group.statusReports.slice(0, 3) // Default limit of 3 reports per group
      }));

      mockPrisma.group.findMany.mockResolvedValueOnce(limitedGroups);

      const result = await fetchNewsletterStatusReports();

      expect(mockPrisma.group.findMany).toHaveBeenCalledWith(expect.objectContaining({
        include: {
          statusReports: expect.objectContaining({
            take: NEWSLETTER_LIMITS.STATUS_REPORTS_PER_GROUP.DEFAULT
          })
        }
      }));

      expect(result.statusReportsByGroup).toHaveLength(2);
      expect(result.statusReportsByGroup[0].reports).toHaveLength(3); // Limited to 3
      expect(result.statusReportsByGroup[1].reports).toHaveLength(1);
    });

    it('should apply custom limits from settings', async () => {
      const settings: Partial<NewsletterSettings> = {
        maxStatusReportsPerGroup: 2,
        maxGroupsWithReports: 1
      };

      const limitedGroups = mockGroups.map(group => ({
        ...group,
        statusReports: group.statusReports.slice(0, 2) // Custom limit of 2 reports per group
      }));

      mockPrisma.group.findMany.mockResolvedValueOnce(limitedGroups);

      const result = await fetchNewsletterStatusReports(settings as NewsletterSettings);

      expect(mockPrisma.group.findMany).toHaveBeenCalledWith(expect.objectContaining({
        include: {
          statusReports: expect.objectContaining({
            take: 2 // Custom limit per group
          })
        }
      }));

      expect(result.statusReportsByGroup).toHaveLength(1); // Limited to 1 group
      expect(result.statusReportsByGroup[0].reports).toHaveLength(2); // Limited to 2 reports
    });
  });

  describe('updateNewsletterSettings - Validation', () => {
    it('should validate maxFeaturedAppointments range', async () => {
      await expect(updateNewsletterSettings({
        maxFeaturedAppointments: NEWSLETTER_LIMITS.FEATURED_APPOINTMENTS.MIN - 1
      })).rejects.toThrow(`maxFeaturedAppointments must be between ${NEWSLETTER_LIMITS.FEATURED_APPOINTMENTS.MIN} and ${NEWSLETTER_LIMITS.FEATURED_APPOINTMENTS.MAX}`);

      await expect(updateNewsletterSettings({
        maxFeaturedAppointments: NEWSLETTER_LIMITS.FEATURED_APPOINTMENTS.MAX + 1
      })).rejects.toThrow(`maxFeaturedAppointments must be between ${NEWSLETTER_LIMITS.FEATURED_APPOINTMENTS.MIN} and ${NEWSLETTER_LIMITS.FEATURED_APPOINTMENTS.MAX}`);
    });

    it('should validate maxUpcomingAppointments range', async () => {
      await expect(updateNewsletterSettings({
        maxUpcomingAppointments: NEWSLETTER_LIMITS.UPCOMING_APPOINTMENTS.MIN - 1
      })).rejects.toThrow(`maxUpcomingAppointments must be between ${NEWSLETTER_LIMITS.UPCOMING_APPOINTMENTS.MIN} and ${NEWSLETTER_LIMITS.UPCOMING_APPOINTMENTS.MAX}`);

      await expect(updateNewsletterSettings({
        maxUpcomingAppointments: NEWSLETTER_LIMITS.UPCOMING_APPOINTMENTS.MAX + 1
      })).rejects.toThrow(`maxUpcomingAppointments must be between ${NEWSLETTER_LIMITS.UPCOMING_APPOINTMENTS.MIN} and ${NEWSLETTER_LIMITS.UPCOMING_APPOINTMENTS.MAX}`);
    });

    it('should validate maxStatusReportsPerGroup range', async () => {
      await expect(updateNewsletterSettings({
        maxStatusReportsPerGroup: NEWSLETTER_LIMITS.STATUS_REPORTS_PER_GROUP.MIN - 1
      })).rejects.toThrow(`maxStatusReportsPerGroup must be between ${NEWSLETTER_LIMITS.STATUS_REPORTS_PER_GROUP.MIN} and ${NEWSLETTER_LIMITS.STATUS_REPORTS_PER_GROUP.MAX}`);

      await expect(updateNewsletterSettings({
        maxStatusReportsPerGroup: NEWSLETTER_LIMITS.STATUS_REPORTS_PER_GROUP.MAX + 1
      })).rejects.toThrow(`maxStatusReportsPerGroup must be between ${NEWSLETTER_LIMITS.STATUS_REPORTS_PER_GROUP.MIN} and ${NEWSLETTER_LIMITS.STATUS_REPORTS_PER_GROUP.MAX}`);
    });

    it('should validate maxGroupsWithReports range', async () => {
      await expect(updateNewsletterSettings({
        maxGroupsWithReports: NEWSLETTER_LIMITS.GROUPS_WITH_REPORTS.MIN - 1
      })).rejects.toThrow(`maxGroupsWithReports must be between ${NEWSLETTER_LIMITS.GROUPS_WITH_REPORTS.MIN} and ${NEWSLETTER_LIMITS.GROUPS_WITH_REPORTS.MAX}`);

      await expect(updateNewsletterSettings({
        maxGroupsWithReports: NEWSLETTER_LIMITS.GROUPS_WITH_REPORTS.MAX + 1
      })).rejects.toThrow(`maxGroupsWithReports must be between ${NEWSLETTER_LIMITS.GROUPS_WITH_REPORTS.MIN} and ${NEWSLETTER_LIMITS.GROUPS_WITH_REPORTS.MAX}`);
    });

    it('should accept valid limit values', async () => {
      const mockExistingSettings = { id: 1 };
      const mockUpdatedSettings = {
        id: 1,
        maxFeaturedAppointments: 3,
        maxUpcomingAppointments: 15,
        maxStatusReportsPerGroup: 2,
        maxGroupsWithReports: 8
      };

      mockPrisma.newsletter.findFirst.mockResolvedValueOnce(mockExistingSettings);
      mockPrisma.newsletter.update.mockResolvedValueOnce(mockUpdatedSettings);

      const result = await updateNewsletterSettings({
        maxFeaturedAppointments: 3,
        maxUpcomingAppointments: 15,
        maxStatusReportsPerGroup: 2,
        maxGroupsWithReports: 8
      });

      expect(result).toEqual(mockUpdatedSettings);
      expect(mockPrisma.newsletter.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          maxFeaturedAppointments: 3,
          maxUpcomingAppointments: 15,
          maxStatusReportsPerGroup: 2,
          maxGroupsWithReports: 8
        })
      }));
    });
  });
});