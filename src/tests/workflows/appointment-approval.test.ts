import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { PATCH } from '@/app/api/admin/appointments/route';
import { 
  buildJsonRequest,
  assertSuccessResponse,
  assertAuthenticationError,
  assertValidationError,
  cleanupTestDatabase
} from '../helpers/api-test-helpers';
import { 
  loginAsAdmin, 
  logoutAdmin, 
  setCustomAuthUser,
  clearAllMocks 
} from '../helpers/workflow-helpers';
import prisma from '@/lib/prisma';

describe('Appointment Approval Workflow', () => {
  let testAppointment: any;

  beforeEach(async () => {
    clearAllMocks();
    loginAsAdmin();
    
    // Create a test appointment in the mock state
    testAppointment = await prisma.appointment.create({
      data: {
        title: 'Test Appointment',
        mainText: 'Test content',
        startDateTime: new Date(),
        endDateTime: new Date(),
        location: 'Test Location',
        street: 'Test Street',
        city: 'Test City',
        state: 'Test State',
        postalCode: '12345',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        phone: '+49 123 456789',
        status: 'pending',
        processed: false,
        featured: false
      }
    });
  });

  afterEach(async () => {
    await cleanupTestDatabase();
  });

  describe('Core Approval Flow', () => {
    it('should approve pending appointment', async () => {
      const request = buildJsonRequest(
        'http://localhost:3000/api/admin/appointments',
        'PATCH',
        {
          id: testAppointment.id,
          status: 'accepted',
          processed: true,
          processingDate: new Date().toISOString()
        }
      );

      const response = await PATCH(request);
      expect(response.status).toBe(200);
    });

    it('should reject pending appointment', async () => {
      const request = buildJsonRequest(
        'http://localhost:3000/api/admin/appointments',
        'PATCH',
        {
          id: testAppointment.id,
          status: 'rejected',
          processed: true,
          processingDate: new Date().toISOString()
        }
      );

      const response = await PATCH(request);
      expect(response.status).toBe(200);
    });

    it('should handle featured appointment approval', async () => {
      const request = buildJsonRequest(
        'http://localhost:3000/api/admin/appointments',
        'PATCH',
        {
          id: testAppointment.id,
          status: 'accepted',
          featured: true,
          processed: true,
          processingDate: new Date().toISOString()
        }
      );

      const response = await PATCH(request);
      expect(response.status).toBe(200);
    });

    it('should handle rejected appointment with featured flag', async () => {
      const request = buildJsonRequest(
        'http://localhost:3000/api/admin/appointments',
        'PATCH',
        {
          id: testAppointment.id,
          status: 'rejected',
          featured: true
        }
      );

      const response = await PATCH(request);
      expect(response.status).toBe(200);
    });
  });

  describe('Authorization', () => {
    it('should block unauthenticated requests', async () => {
      logoutAdmin();
      
      const request = buildJsonRequest(
        'http://localhost:3000/api/admin/appointments',
        'PATCH',
        { id: testAppointment.id, status: 'accepted' }
      );

      const response = await PATCH(request);
      await assertAuthenticationError(response);
    });

    it('should block non-admin users', async () => {
      setCustomAuthUser({
        role: 'user',
        name: 'Regular User',
        email: 'user@example.com'
      });

      const request = buildJsonRequest(
        'http://localhost:3000/api/admin/appointments',
        'PATCH',
        { id: testAppointment.id, status: 'accepted' }
      );

      const response = await PATCH(request);
      expect(response.status).toBe(403);
    });
  });

  describe('Validation', () => {
    it('should handle invalid appointment ID', async () => {
      const request = buildJsonRequest(
        'http://localhost:3000/api/admin/appointments',
        'PATCH',
        { id: 'invalid-id', status: 'accepted' }
      );

      const response = await PATCH(request);
      expect(response.status).toBe(500);
    });

    it('should validate status values', async () => {
      const request = buildJsonRequest(
        'http://localhost:3000/api/admin/appointments',
        'PATCH',
        { id: testAppointment.id, status: 'INVALID_STATUS' }
      );

      const response = await PATCH(request);
      await assertValidationError(response);
    });

    it('should handle missing appointment ID', async () => {
      const request = buildJsonRequest(
        'http://localhost:3000/api/admin/appointments',
        'PATCH',
        { status: 'accepted' }
      );

      const response = await PATCH(request);
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should handle non-existent appointment', async () => {
      const request = buildJsonRequest(
        'http://localhost:3000/api/admin/appointments',
        'PATCH',
        { id: 99999, status: 'accepted' }
      );

      const response = await PATCH(request);
      expect(response.status).toBe(500);
    });
  });

  describe('Partial Updates', () => {
    it('should handle feature flag only updates', async () => {
      const request = buildJsonRequest(
        'http://localhost:3000/api/admin/appointments',
        'PATCH',
        { id: testAppointment.id, featured: true }
      );

      const response = await PATCH(request);
      expect(response.status).toBe(200);
    });

    it('should handle processing date updates', async () => {
      const request = buildJsonRequest(
        'http://localhost:3000/api/admin/appointments',
        'PATCH',
        { 
          id: testAppointment.id,
          processed: true,
          processingDate: new Date().toISOString()
        }
      );

      const response = await PATCH(request);
      expect(response.status).toBe(200);
    });
  });
});