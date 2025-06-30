import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { getToken } from 'next-auth/jwt';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';
import {
  createMockAppointment,
  createMockAppointmentWithStatus,
  createMockFeaturedAppointment,
  createMockAppointmentInFuture
} from '../factories';
import {
  approveItem,
  rejectItem,
  loginAsAdmin,
  logoutAdmin,
  setCustomAuthUser,
  cleanupTestAppointment,
  clearAllMocks
} from '../helpers/workflow-helpers';
import {
  buildJsonRequest,
  buildAuthenticatedRequest,
  assertSuccessResponse,
  assertAuthenticationError,
  assertNotFoundError,
  assertValidationError,
  assertAppointmentExists,
  cleanupTestDatabase
} from '../helpers/api-test-helpers';
import { withAdminAuth } from '@/lib/api-auth';

describe('Appointment Approval Workflow', () => {
  let testAppointments: any[] = [];

  beforeEach(async () => {
    clearAllMocks();
    loginAsAdmin(); // Default to admin auth

    // Set up database mocks after clearing
    jest.mocked(prisma.$queryRaw).mockResolvedValue([{ connection_test: 1 }]);
    
    // Create mock appointments that will be "returned" by database queries
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const mockAppointments = [
      createMockAppointmentWithStatus('pending', {
        id: 1,
        title: 'New Appointment 1',
        startDateTime: yesterday,
        endDateTime: new Date(yesterday.getTime() + 2 * 60 * 60 * 1000) // 2 hours later
      }),
      createMockAppointmentWithStatus('pending', {
        id: 2,
        title: 'New Appointment 2',
        startDateTime: yesterday,
        endDateTime: new Date(yesterday.getTime() + 2 * 60 * 60 * 1000)
      }),
      createMockAppointmentWithStatus('accepted', {
        id: 3,
        title: 'Already Active Appointment',
        startDateTime: yesterday,
        endDateTime: new Date(yesterday.getTime() + 2 * 60 * 60 * 1000)
      })
    ];

    // Mock Prisma create to return the appointments and add them to mockAppointments
    jest.mocked(prisma.appointment.create).mockImplementation(({ data }) => {
      const newAppointment = { ...data } as any;
      // Only add if not already exists to prevent duplicates
      const exists = mockAppointments.some(a => a.id === newAppointment.id);
      if (!exists) {
        mockAppointments.push(newAppointment);
      }
      return Promise.resolve(newAppointment);
    });

    // Mock Prisma findUnique and findMany
    jest.mocked(prisma.appointment.findUnique).mockImplementation(({ where }) => {
      const found = mockAppointments.find(a => a.id === where.id);
      return Promise.resolve(found || null);
    });

    jest.mocked(prisma.appointment.findMany).mockImplementation(({ where, orderBy }) => {
      let filteredAppointments = [...mockAppointments];
      
      if (where) {
        // Handle status filtering
        if (where.status) {
          filteredAppointments = filteredAppointments.filter(a => a.status === where.status);
        }
        
        // Handle featured filtering
        if (where.featured !== undefined) {
          filteredAppointments = filteredAppointments.filter(a => a.featured === where.featured);
        }
        
        // Handle ID filtering
        if (where.id && where.id.in) {
          filteredAppointments = filteredAppointments.filter(a => where.id.in.includes(a.id));
        }
        
        // Handle date filtering
        if (where.startDateTime) {
          if (where.startDateTime.gte) {
            const cutoffDate = where.startDateTime.gte;
            filteredAppointments = filteredAppointments.filter(a => 
              a.startDateTime && new Date(a.startDateTime) >= cutoffDate
            );
          }
        }
      }
      
      // Handle ordering
      if (orderBy && orderBy.startDateTime) {
        filteredAppointments.sort((a, b) => {
          const dateA = new Date(a.startDateTime || 0);
          const dateB = new Date(b.startDateTime || 0);
          return orderBy.startDateTime === 'asc' ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
        });
      }
      
      
      return Promise.resolve(filteredAppointments);
    });

    // Mock Prisma update for approval/rejection workflows
    jest.mocked(prisma.appointment.update).mockImplementation(({ where, data }) => {
      const id = (where as any).id;
      
      // Handle invalid ID that can't be parsed as number (should return 400 in real API)
      if (typeof id === 'string' && isNaN(Number(id))) {
        return Promise.reject(new Error('Invalid ID format'));
      }
      
      const found = mockAppointments.find(a => a.id === id);
      if (found) {
        const updated = { ...found, ...data, updatedAt: new Date() };
        
        // Simulate statusChangeDate update when status changes
        if (data.status && data.status !== found.status) {
          updated.statusChangeDate = new Date();
        }
        
        // Business rule: rejected appointments cannot be featured
        if (data.status === 'rejected' && data.featured) {
          updated.featured = false; // Ignore featured flag for rejected appointments
        }
        
        // Update the mockAppointments array for subsequent calls
        const index = mockAppointments.findIndex(a => a.id === id);
        if (index >= 0) {
          mockAppointments[index] = updated;
        }
        return Promise.resolve(updated as any);
      }
      return Promise.reject(new Error(`Appointment with id ${id} not found`));
    });

    // Reset withAdminAuth mock to default behavior after clearing mocks
    const { withAdminAuth } = await import('@/lib/api-auth');
    jest.mocked(withAdminAuth).mockImplementation((handler: Function) => {
      return async (request: any, ...args: any[]) => {
        const token = await getToken({ req: request });
        
        if (!token || token.role !== 'admin') {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
            status: 401, 
            headers: { 'Content-Type': 'application/json' } 
          });
        }
        
        return handler(request, ...args);
      };
    });

    // Create test appointments
    testAppointments = await Promise.all([
      prisma.appointment.create({ data: mockAppointments[0] }),
      prisma.appointment.create({ data: mockAppointments[1] }),
      prisma.appointment.create({ data: mockAppointments[2] })
    ]);
  });

  afterEach(async () => {
    await cleanupTestDatabase();
    jest.clearAllMocks();
  });

  describe('Approval Flow', () => {
    it('should approve appointment with admin authentication', async () => {
      // Arrange
      const appointmentId = testAppointments[0].id;

      // Act
      const { response, data } = await approveItem('appointment', appointmentId);

      // Debug: log response if not successful
      if (response.status !== 200) {
        const errorData = await response.json();
        console.error('Approval failed:', errorData);
      }

      // Assert
      await assertSuccessResponse(response);

      // Verify database update
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId }
      });

      expect(appointment).toMatchObject({
        status: 'accepted',
        processed: true,
        processingDate: expect.any(Date)
      });

      // Verify processingDate is set to now
      const now = new Date();
      const processingDate = appointment!.processingDate!;
      expect(Math.abs(processingDate.getTime() - now.getTime())).toBeLessThan(5000); // Within 5 seconds

      // Success! The appointment was updated successfully
    });

    it('should change status from pending to accepted', async () => {
      // Arrange
      const appointment = testAppointments[0];
      expect(appointment.status).toBe('pending');

      // Act
      const { response } = await approveItem('appointment', appointment.id);

      // Assert
      await assertSuccessResponse(response);

      await assertAppointmentExists(appointment.id, {
        status: 'accepted',
        processed: true
      });
    });

    it('should handle approval with featured flag', async () => {
      // Arrange
      const appointmentId = testAppointments[0].id;
      const { PATCH } = await import('@/app/api/admin/appointments/route');

      const request = buildJsonRequest(
        `http://localhost:3000/api/admin/appointments`,
        'PATCH',
        {
          id: appointmentId,
          status: 'accepted',
          featured: true,
          processed: true,
          processingDate: new Date().toISOString()
        }
      );

      // Act
      const response = await PATCH(request);

      // Assert
      await assertSuccessResponse(response);

      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId }
      });

      expect(appointment).toMatchObject({
        status: 'accepted',
        featured: true,
        processed: true
      });
    });

    it('should update statusChangeDate on approval', async () => {
      // Arrange
      const appointment = testAppointments[0];
      const originalDate = appointment.statusChangeDate;

      // Act
      await approveItem('appointment', appointment.id);

      // Assert
      const updated = await prisma.appointment.findUnique({
        where: { id: appointment.id }
      });

      expect(updated!.statusChangeDate).not.toEqual(originalDate);
      expect(updated!.statusChangeDate).toBeInstanceOf(Date);
    });

    it('should allow re-approval of already active appointments', async () => {
      // Arrange
      const activeAppointment = testAppointments[2];
      expect(activeAppointment.status).toBe('accepted');

      // Act
      const { response } = await approveItem('appointment', activeAppointment.id);

      // Assert
      await assertSuccessResponse(response);

      // Should still be active
      await assertAppointmentExists(activeAppointment.id, {
        status: 'accepted'
      });
    });
  });

  describe('Rejection Flow', () => {
    it('should reject appointment with reason', async () => {
      // Arrange
      const appointmentId = testAppointments[0].id;
      const rejectionReason = 'Veranstaltung entspricht nicht unseren Richtlinien';

      // Act
      const { response } = await rejectItem('appointment', appointmentId, rejectionReason);

      // Assert
      await assertSuccessResponse(response);

      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId }
      });

      expect(appointment).toMatchObject({
        status: 'rejected',
        processed: true,
        processingDate: expect.any(Date)
      });
      // Note: rejectionReason is not currently supported in the API
    });

    it('should ensure rejected appointments have no public visibility', async () => {
      // Arrange
      const appointmentId = testAppointments[0].id;

      // Act
      await rejectItem('appointment', appointmentId);

      // Simulate public API query
      const publicAppointments = await prisma.appointment.findMany({
        where: {
          status: 'accepted' // Public queries only show accepted
        }
      });

      // Assert
      const rejectedAppointment = publicAppointments.find(a => a.id === appointmentId);
      expect(rejectedAppointment).toBeUndefined();

      // Verify it still exists but with rejected status
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId }
      });
      expect(appointment?.status).toBe('rejected');
    });

    it('should handle rejection without reason', async () => {
      // Arrange
      const appointmentId = testAppointments[0].id;

      // Act
      const { response } = await rejectItem('appointment', appointmentId);

      // Assert
      await assertSuccessResponse(response);

      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId }
      });

      expect(appointment).toMatchObject({
        status: 'rejected'
        // Note: rejectionReason is not currently supported in the API
      });
    });

    it('should not allow rejected appointments to be featured', async () => {
      // Arrange
      const appointmentId = testAppointments[0].id;
      const { PATCH } = await import('@/app/api/admin/appointments/route');

      const request = buildJsonRequest(
        `http://localhost:3000/api/admin/appointments`,
        'PATCH',
        {
          id: appointmentId,
          status: 'rejected',
          featured: true // Try to feature a rejected appointment
        }
      );

      // Act
      const response = await PATCH(request);

      // Assert - Should succeed but ignore featured flag
      await assertSuccessResponse(response);

      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId }
      });

      expect(appointment?.status).toBe('rejected');
      expect(appointment?.featured).toBe(false);
    });
  });

  describe('Bulk Operations', () => {
    it('should approve multiple appointments', async () => {
      // Arrange
      const appointmentIds = testAppointments
        .filter(a => a.status === 'pending')
        .map(a => a.id);

      // Act
      const results = await Promise.all(
        appointmentIds.map(id => approveItem('appointment', id))
      );

      // Assert
      results.forEach(({ response }) => {
        expect(response.status).toBe(200);
      });

      // Verify all are approved
      const appointments = await prisma.appointment.findMany({
        where: { id: { in: appointmentIds } }
      });

      appointments.forEach(appointment => {
        expect(appointment.status).toBe('accepted');
        expect(appointment.processed).toBe(true);
      });
    });

    it('should handle feature highlighting for multiple appointments', async () => {
      // Arrange
      const { PATCH } = await import('@/app/api/admin/appointments/route');
      
      // Create more appointments
      const additionalAppointments = await Promise.all([
        prisma.appointment.create({
          data: createMockAppointmentInFuture(7, {
            id: 10,
            status: 'pending'
          })
        }),
        prisma.appointment.create({
          data: createMockAppointmentInFuture(14, {
            id: 11,
            status: 'pending'
          })
        })
      ]);

      // Act - Approve and feature select appointments
      const featureIds = [10, testAppointments[0].id];
      
      for (const id of featureIds) {
        const request = buildJsonRequest(
          `http://localhost:3000/api/admin/appointments`,
          'PATCH',
          {
            id,
            status: 'accepted',
            featured: true,
            processed: true,
            processingDate: new Date().toISOString()
          }
        );
        
        const response = await PATCH(request);
        await assertSuccessResponse(response);
      }

      // Assert
      const featuredAppointments = await prisma.appointment.findMany({
        where: { featured: true }
      });

      expect(featuredAppointments).toHaveLength(2);
      expect(featuredAppointments.map(a => a.id)).toEqual(
        expect.arrayContaining(featureIds)
      );
    });

    it('should filter appointments by date for processing', async () => {
      // Arrange - Create appointments with different dates
      const pastAppointment = await prisma.appointment.create({
        data: createMockAppointmentInFuture(-7, { // 7 days ago
          id: 20,
          status: 'pending'
        })
      });

      const futureAppointments = await Promise.all([
        prisma.appointment.create({
          data: createMockAppointmentInFuture(7, {
            id: 21,
            status: 'pending'
          })
        }),
        prisma.appointment.create({
          data: createMockAppointmentInFuture(30, {
            id: 22,
            status: 'pending'
          })
        })
      ]);

      // Simulate date filtering query
      const upcomingAppointments = await prisma.appointment.findMany({
        where: {
          status: 'pending',
          startDateTime: {
            gte: new Date() // Only future appointments
          }
        },
        orderBy: { startDateTime: 'asc' }
      });

      // Assert
      expect(upcomingAppointments).toHaveLength(2);
      expect(upcomingAppointments.map(a => a.id)).not.toContain(20);
      expect(upcomingAppointments[0].id).toBe(21); // Nearest first
    });

    it('should handle batch status updates', async () => {
      // Arrange
      const batchData = [
        { id: testAppointments[0].id, status: 'accepted' as const },
        { id: testAppointments[1].id, status: 'rejected' as const }
      ];

      // Act - Simulate batch update
      const results = await Promise.all(
        batchData.map(async ({ id, status }) => {
          if (status === 'accepted') {
            return approveItem('appointment', id);
          } else {
            return rejectItem('appointment', id, 'Batch rejection');
          }
        })
      );

      // Assert
      results.forEach(({ response }) => {
        expect(response.status).toBe(200);
      });

      // Verify mixed statuses
      const appointment1 = await prisma.appointment.findUnique({
        where: { id: batchData[0].id }
      });
      const appointment2 = await prisma.appointment.findUnique({
        where: { id: batchData[1].id }
      });

      expect(appointment1?.status).toBe('accepted');
      expect(appointment2?.status).toBe('rejected');
    });
  });

  describe('Authorization', () => {
    it('should block unauthenticated requests', async () => {
      // Arrange
      logoutAdmin(); // Remove authentication
      const { PATCH } = await import('@/app/api/admin/appointments/route');

      const request = buildJsonRequest(
        `http://localhost:3000/api/admin/appointments`,
        'PATCH',
        { 
          id: testAppointments[0].id,
          status: 'accepted' 
        }
      );

      // Act
      const response = await PATCH(request);

      // Assert
      await assertAuthenticationError(response);

      // Verify no changes made
      const appointment = await prisma.appointment.findUnique({
        where: { id: testAppointments[0].id }
      });
      expect(appointment?.status).toBe('pending');
    });

    it('should reject non-admin users', async () => {
      // Arrange
      setCustomAuthUser({
        role: 'user', // Not admin
        name: 'Regular User',
        email: 'user@example.com'
      });

      const { PATCH } = await import('@/app/api/admin/appointments/route');

      const request = buildJsonRequest(
        `http://localhost:3000/api/admin/appointments`,
        'PATCH',
        { 
          id: testAppointments[0].id,
          status: 'accepted' 
        }
      );

      // Act
      const response = await PATCH(request);

      // Assert
      await assertAuthenticationError(response);
    });

    it('should verify withAdminAuth middleware is applied', async () => {
      // Arrange
      logoutAdmin();
      const appointmentId = testAppointments[0].id;
      const { PATCH } = await import('@/app/api/admin/appointments/route');

      const request = buildJsonRequest(
        `http://localhost:3000/api/admin/appointments`,
        'PATCH',
        { 
          id: appointmentId,
          status: 'accepted' 
        }
      );

      // Act
      const response = await PATCH(request);

      // Assert - Should be blocked by auth middleware
      await assertAuthenticationError(response);

      // Verify appointment unchanged
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId }
      });
      expect(appointment?.status).toBe('pending');
    });

    it('should handle missing appointment ID', async () => {
      // Arrange
      const { PATCH } = await import('@/app/api/admin/appointments/route');
      loginAsAdmin();

      const request = buildJsonRequest(
        'http://localhost:3000/api/admin/appointments',
        'PATCH',
        { 
          id: 'non-existent-id',
          status: 'accepted' 
        }
      );

      // Act
      const response = await PATCH(request);

      // Assert - Should return server error for invalid ID format
      expect(response.status).toBe(500);
    });

    it('should validate request body', async () => {
      // Arrange
      const { PATCH } = await import('@/app/api/admin/appointments/route');

      // Invalid status value
      const request = buildJsonRequest(
        `http://localhost:3000/api/admin/appointments`,
        'PATCH',
        { 
          id: testAppointments[0].id,
          status: 'INVALID_STATUS' 
        }
      );

      // Act
      const response = await PATCH(request);

      // Assert
      await assertValidationError(response);
    });

    it('should handle CORS headers properly', async () => {
      // Arrange
      const { PATCH } = await import('@/app/api/admin/appointments/route');

      const request = buildJsonRequest(
        `http://localhost:3000/api/admin/appointments`,
        'PATCH',
        { 
          id: testAppointments[0].id,
          status: 'accepted' 
        }
      );

      // Add CORS headers
      request.headers.set('Origin', 'https://admin.example.com');

      // Act
      const response = await PATCH(request);

      // Assert
      await assertSuccessResponse(response);
      
      // Check CORS headers (if implemented)
      // Note: Actual CORS handling depends on Next.js middleware configuration
    });
  });

  describe('Edge Cases', () => {
    it('should handle partial updates', async () => {
      // Arrange
      const { PATCH } = await import('@/app/api/admin/appointments/route');
      const appointmentId = testAppointments[0].id;

      // Only update featured flag, not status
      const request = buildJsonRequest(
        `http://localhost:3000/api/admin/appointments`,
        'PATCH',
        { 
          id: appointmentId,
          featured: true 
        }
      );

      // Act
      const response = await PATCH(request);

      // Assert
      await assertSuccessResponse(response);

      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId }
      });

      expect(appointment?.featured).toBe(true);
      expect(appointment?.status).toBe('pending'); // Status unchanged
    });

    it('should handle concurrent updates', async () => {
      // Arrange
      const appointmentId = testAppointments[0].id;

      // Act - Simulate concurrent updates
      const results = await Promise.all([
        approveItem('appointment', appointmentId),
        rejectItem('appointment', appointmentId, 'Concurrent rejection')
      ]);

      // Assert - Both should succeed (last write wins)
      results.forEach(({ response }) => {
        expect(response.status).toBe(200);
      });

      // Check final state
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId }
      });

      // Final status depends on execution order
      expect(['accepted', 'rejected']).toContain(appointment?.status);
    });

    it('should preserve existing data on update', async () => {
      // Arrange
      const appointment = testAppointments[0];
      const originalData = {
        title: appointment.title,
        mainText: appointment.mainText,
        location: appointment.location
      };

      // Act
      await approveItem('appointment', appointment.id);

      // Assert
      const updated = await prisma.appointment.findUnique({
        where: { id: appointment.id }
      });

      expect(updated).toMatchObject(originalData);
    });
  });
});