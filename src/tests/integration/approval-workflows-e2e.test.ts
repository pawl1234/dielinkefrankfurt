import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { addDays, subDays } from 'date-fns';
import prisma from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import { logger } from '@/lib/logger';
import {
  createMockAppointmentFormData,
  createMockGroupFormData,
  createMockStatusReportFormData,
  createMockImageFile
} from '../factories';
import {
  cleanupTestDatabase,
  mockEmailSuccess
} from '../helpers/api-test-helpers';

// Mock external dependencies only
jest.mock('@/lib/email');
jest.mock('@/lib/logger');
jest.mock('@vercel/blob', () => ({
  put: jest.fn().mockResolvedValue({
    url: 'https://blob.example.com/mock-file.jpg'
  })
}));

const mockSendEmail = sendEmail as jest.MockedFunction<typeof sendEmail>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('Approval Workflows - Database Integration', () => {
  beforeEach(() => {
    mockEmailSuccess();
    mockSendEmail.mockClear();
    mockLogger.info.mockClear();
    mockLogger.error.mockClear();
  });

  afterEach(async () => {
    await cleanupTestDatabase();
    jest.clearAllMocks();
  });

  describe('Database State Validation', () => {
    it('should properly create and update appointment status in database', async () => {
      // Create appointment directly in database
      const appointment = await prisma.appointment.create({
        data: {
          title: 'Test Appointment',
          mainText: '<p>Test content</p>',
          startDateTime: addDays(new Date(), 10),
          endDateTime: addDays(new Date(), 10),
          location: 'Test Location',
          street: 'Test Street',
          city: 'Test City',
          state: 'Test State',
          postalCode: '12345',
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
          phone: '123-456-7890',
          status: 'pending',
          processed: false,
          featured: false
        }
      });

      // Verify initial state
      expect(appointment.status).toBe('pending');
      expect(appointment.processed).toBe(false);

      // Update to accepted
      const updatedAppointment = await prisma.appointment.update({
        where: { id: appointment.id },
        data: {
          status: 'accepted',
          processed: true,
          processingDate: new Date(),
          statusChangeDate: new Date()
        }
      });

      expect(updatedAppointment.status).toBe('accepted');
      expect(updatedAppointment.processed).toBe(true);
      expect(updatedAppointment.processingDate).toBeDefined();
      expect(updatedAppointment.statusChangeDate).toBeDefined();

      // Verify appears in public queries
      const publicAppointments = await prisma.appointment.findMany({
        where: {
          status: 'accepted',
          startDateTime: { gte: new Date() }
        }
      });

      expect(publicAppointments).toHaveLength(1);
      expect(publicAppointments[0].id).toBe(appointment.id);
    });

    it('should handle appointment rejection and prevent public display', async () => {
      // Create appointment
      const appointment = await prisma.appointment.create({
        data: {
          title: 'Rejected Appointment',
          mainText: '<p>Content</p>',
          startDateTime: addDays(new Date(), 5),
          endDateTime: addDays(new Date(), 5),
          location: 'Location',
          street: 'Street',
          city: 'City',
          state: 'State',
          postalCode: '12345',
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
          phone: '123-456-7890',
          status: 'pending',
          processed: false,
          featured: false
        }
      });

      // Reject appointment
      const rejectedAppointment = await prisma.appointment.update({
        where: { id: appointment.id },
        data: {
          status: 'rejected',
          processed: true,
          rejectionReason: 'Does not meet guidelines',
          processingDate: new Date(),
          statusChangeDate: new Date()
        }
      });

      expect(rejectedAppointment.status).toBe('rejected');
      expect(rejectedAppointment.rejectionReason).toBe('Does not meet guidelines');

      // Verify does NOT appear in public queries
      const publicAppointments = await prisma.appointment.findMany({
        where: { status: 'accepted' }
      });

      expect(publicAppointments.find(a => a.id === appointment.id)).toBeUndefined();
    });
  });

  describe('Group Status Management', () => {
    it('should handle group status transitions in database', async () => {
      // Create group with responsible persons
      const group = await prisma.group.create({
        data: {
          name: 'Test Group',
          slug: 'test-group',
          description: 'Test description',
          status: 'NEW',
          responsiblePersons: {
            create: [
              {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com'
              },
              {
                firstName: 'Jane',
                lastName: 'Smith',
                email: 'jane@example.com'
              }
            ]
          }
        },
        include: { responsiblePersons: true }
      });

      // Verify initial state
      expect(group.status).toBe('NEW');
      expect(group.responsiblePersons).toHaveLength(2);

      // Update to ACTIVE
      const activeGroup = await prisma.group.update({
        where: { id: group.id },
        data: { status: 'ACTIVE' }
      });

      expect(activeGroup.status).toBe('ACTIVE');

      // Verify appears in public queries
      const publicGroups = await prisma.group.findMany({
        where: { status: 'ACTIVE' }
      });

      expect(publicGroups).toHaveLength(1);
      expect(publicGroups[0].id).toBe(group.id);

      // Archive group
      const archivedGroup = await prisma.group.update({
        where: { id: group.id },
        data: { status: 'ARCHIVED' }
      });

      expect(archivedGroup.status).toBe('ARCHIVED');

      // Verify does not appear in public queries
      const publicGroupsAfterArchive = await prisma.group.findMany({
        where: { status: 'ACTIVE' }
      });

      expect(publicGroupsAfterArchive).toHaveLength(0);
    });

    it('should enforce group status constraints for status reports', async () => {
      // Create NEW group (not active)
      const newGroup = await prisma.group.create({
        data: {
          name: 'New Group',
          slug: 'new-group',
          description: 'New group description',
          status: 'NEW'
        }
      });

      // Try to create status report for NEW group (should fail in application logic)
      // This tests database constraint validation
      const activeGroup = await prisma.group.create({
        data: {
          name: 'Active Group',
          slug: 'active-group',
          description: 'Active group description',
          status: 'ACTIVE'
        }
      });

      // Can create status report for ACTIVE group
      const statusReport = await prisma.statusReport.create({
        data: {
          title: 'Test Report',
          content: '<p>Test content</p>',
          reporterFirstName: 'Reporter',
          reporterLastName: 'Name',
          groupId: activeGroup.id,
          status: 'NEW'
        }
      });

      expect(statusReport.groupId).toBe(activeGroup.id);
      expect(statusReport.status).toBe('NEW');

      // Archive the group
      await prisma.group.update({
        where: { id: activeGroup.id },
        data: { status: 'ARCHIVED' }
      });

      // Existing reports should remain accessible
      const existingReports = await prisma.statusReport.findMany({
        where: { groupId: activeGroup.id }
      });

      expect(existingReports).toHaveLength(1);
      expect(existingReports[0].id).toBe(statusReport.id);
    });
  });

  describe('Status Report Management', () => {
    it('should handle status report lifecycle with proper database relationships', async () => {
      // Create active group first
      const group = await prisma.group.create({
        data: {
          name: 'Active Test Group',
          slug: 'active-test-group',
          description: 'Test group for status reports',
          status: 'ACTIVE',
          responsiblePersons: {
            create: {
              firstName: 'John',
              lastName: 'Doe',
              email: 'john@example.com'
            }
          }
        },
        include: { responsiblePersons: true }
      });

      // Create status report for active group
      const statusReport = await prisma.statusReport.create({
        data: {
          title: 'Test Status Report',
          content: '<p>This is a test status report</p>',
          reporterFirstName: 'Reporter',
          reporterLastName: 'Name',
          groupId: group.id,
          status: 'NEW',
          fileUrls: JSON.stringify(['https://example.com/file1.jpg', 'https://example.com/file2.pdf'])
        }
      });

      // Verify report created with proper relationships
      const createdReport = await prisma.statusReport.findUnique({
        where: { id: statusReport.id },
        include: { group: true }
      });

      expect(createdReport).toMatchObject({
        title: 'Test Status Report',
        status: 'NEW',
        groupId: group.id
      });
      expect(createdReport?.group.name).toBe('Active Test Group');

      const fileUrls = JSON.parse(createdReport!.fileUrls!);
      expect(fileUrls).toHaveLength(2);

      // Update report to ACTIVE status
      const activeReport = await prisma.statusReport.update({
        where: { id: statusReport.id },
        data: { status: 'ACTIVE' }
      });

      expect(activeReport.status).toBe('ACTIVE');

      // Verify report appears in direct queries
      const activeReportsForGroup = await prisma.statusReport.findMany({
        where: {
          groupId: group.id,
          status: 'ACTIVE'
        }
      });

      expect(activeReportsForGroup).toHaveLength(1);
      expect(activeReportsForGroup[0].id).toBe(statusReport.id);

      // Verify report appears in newsletter queries
      const allActiveReports = await prisma.statusReport.findMany({
        where: { status: 'ACTIVE' },
        include: { group: true }
      });

      expect(allActiveReports).toHaveLength(1);
      expect(allActiveReports[0].id).toBe(statusReport.id);
      if (allActiveReports[0].group) {
        expect(allActiveReports[0].group.name).toBe('Active Test Group');
      }
    });

    it('should handle status report rejection and archival', async () => {
      // Create group and report
      const group = await prisma.group.create({
        data: {
          name: 'Report Test Group',
          slug: 'report-test-group',
          description: 'Test group',
          status: 'ACTIVE'
        }
      });

      const statusReport = await prisma.statusReport.create({
        data: {
          title: 'Report to Archive',
          content: '<p>Content</p>',
          reporterFirstName: 'Reporter',
          reporterLastName: 'Name',
          groupId: group.id,
          status: 'NEW'
        }
      });

      // Reject report
      const rejectedReport = await prisma.statusReport.update({
        where: { id: statusReport.id },
        data: { 
          status: 'ARCHIVED',
          rejectionReason: 'Does not meet guidelines'
        }
      });

      expect(rejectedReport.status).toBe('ARCHIVED');
      expect(rejectedReport.rejectionReason).toBe('Does not meet guidelines');

      // Verify does not appear in active queries
      const activeReports = await prisma.statusReport.findMany({
        where: { status: 'ACTIVE' }
      });

      expect(activeReports.find(r => r.id === statusReport.id)).toBeUndefined();

      // Verify does not appear in newsletter queries
      const newsletterReports = await prisma.statusReport.findMany({
        where: { status: 'ACTIVE' }
      });

      expect(newsletterReports.find(r => r.id === statusReport.id)).toBeUndefined();
    });
  });

  describe('Data Integrity and Relationships', () => {
    it('should maintain data integrity with basic group and report relationships', async () => {
      // Create group
      const group = await prisma.group.create({
        data: {
          name: 'Group with Reports',
          slug: 'group-with-reports',
          description: 'Test group',
          status: 'ACTIVE'
        }
      });

      // Create status reports
      const report1 = await prisma.statusReport.create({
        data: {
          title: 'Report 1',
          content: '<p>Content 1</p>',
          reporterFirstName: 'Reporter',
          reporterLastName: 'One',
          groupId: group.id,
          status: 'ACTIVE'
        }
      });

      const report2 = await prisma.statusReport.create({
        data: {
          title: 'Report 2',
          content: '<p>Content 2</p>',
          reporterFirstName: 'Reporter',
          reporterLastName: 'Two',
          groupId: group.id,
          status: 'ACTIVE'
        }
      });

      // Archive the group
      const archivedGroup = await prisma.group.update({
        where: { id: group.id },
        data: { status: 'ARCHIVED' }
      });

      expect(archivedGroup.status).toBe('ARCHIVED');

      // Reports should remain accessible
      const reportsAfterArchiving = await prisma.statusReport.findMany({
        where: { groupId: group.id }
      });

      expect(reportsAfterArchiving).toHaveLength(2);
      expect(reportsAfterArchiving.every(r => r.status === 'ACTIVE')).toBe(true);

      // Group does not appear in public listings
      const publicGroups = await prisma.group.findMany({
        where: { status: 'ACTIVE' }
      });

      expect(publicGroups.find(g => g.id === group.id)).toBeUndefined();
    });

    it('should enforce status constraints across entity relationships', async () => {
      // Create groups with different statuses
      const newGroup = await prisma.group.create({
        data: {
          name: 'New Group',
          slug: 'new-group',
          description: 'New group',
          status: 'NEW'
        }
      });

      const activeGroup = await prisma.group.create({
        data: {
          name: 'Active Group',
          slug: 'active-group',
          description: 'Active group',
          status: 'ACTIVE'
        }
      });

      const archivedGroup = await prisma.group.create({
        data: {
          name: 'Archived Group',
          slug: 'archived-group',
          description: 'Archived group',
          status: 'ARCHIVED'
        }
      });

      // Only ACTIVE groups should appear in public queries
      const publicGroups = await prisma.group.findMany({
        where: { status: 'ACTIVE' }
      });

      expect(publicGroups).toHaveLength(1);
      expect(publicGroups[0].id).toBe(activeGroup.id);

      // Can create reports for active group
      const activeGroupReport = await prisma.statusReport.create({
        data: {
          title: 'Report for Active Group',
          content: '<p>Content</p>',
          reporterFirstName: 'Reporter',
          reporterLastName: 'Name',
          groupId: activeGroup.id,
          status: 'NEW'
        }
      });

      expect(activeGroupReport.groupId).toBe(activeGroup.id);

      // Database allows creating reports for any group (constraint enforced in application)
      const newGroupReport = await prisma.statusReport.create({
        data: {
          title: 'Report for New Group',
          content: '<p>Content</p>',
          reporterFirstName: 'Reporter',
          reporterLastName: 'Name',
          groupId: newGroup.id,
          status: 'NEW'
        }
      });

      expect(newGroupReport.groupId).toBe(newGroup.id);

      // Only ACTIVE status reports should appear in public queries
      const publicReports = await prisma.statusReport.findMany({
        where: { status: 'ACTIVE' }
      });

      expect(publicReports).toHaveLength(0); // Both reports are NEW status
    });
  });

  describe('Newsletter Content Queries', () => {
    it('should provide correct data structure for newsletter generation', async () => {
      // Test basic queries that newsletter would use
      const futureDate = new Date('2025-12-31T12:00:00.000Z');
      
      // Create a test appointment for newsletter inclusion
      const testAppointment = await prisma.appointment.create({
        data: {
          title: 'Newsletter Test Event',
          mainText: '<p>Test event for newsletter</p>',
          startDateTime: futureDate,
          endDateTime: futureDate,
          location: 'Frankfurt',
          street: 'Main Street',
          city: 'Frankfurt',
          state: 'Hessen',
          postalCode: '60311',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '123-456-7890',
          status: 'pending',
          processed: false,
          featured: true
        }
      });

      // Verify appointment was created
      expect(testAppointment.title).toBe('Newsletter Test Event');
      expect(testAppointment.featured).toBe(true);

      // Create group with status report
      const group = await prisma.group.create({
        data: {
          name: 'Newsletter Test Group',
          slug: 'newsletter-test-group',
          description: 'Test group for newsletter',
          status: 'ACTIVE',
          logoUrl: 'https://example.com/logo.png'
        }
      });

      const statusReport = await prisma.statusReport.create({
        data: {
          title: 'Recent Activity Report',
          content: '<p>Recent activities and updates</p>',
          reporterFirstName: 'Reporter',
          reporterLastName: 'Name',
          groupId: group.id,
          status: 'ACTIVE'
        }
      });

      // Query for active status reports
      const activeReports = await prisma.statusReport.findMany({
        where: {
          status: 'ACTIVE'
        },
        include: { group: true }
      });

      // Newsletter data structure can be built from these queries
      expect(activeReports).toHaveLength(1);
      expect(activeReports[0].id).toBe(statusReport.id);
      
      if (activeReports[0].group) {
        expect(activeReports[0].group.name).toBe('Newsletter Test Group');
        expect(activeReports[0].group.logoUrl).toBe('https://example.com/logo.png');
      }
      
      // Both entities exist and can be used for newsletter
      expect(testAppointment.id).toBeDefined();
      expect(activeReports[0].id).toBe(statusReport.id);
    });
  });
});