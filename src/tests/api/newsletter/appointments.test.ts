import { NextRequest } from 'next/server';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Import after mocking (mocks are in jest.setup.api.js)
import { GET, PATCH } from '@/app/api/admin/newsletter/appointments/route';
import prisma from '@/lib/prisma';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('/api/admin/newsletter/appointments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET', () => {
    it('should fetch newsletter appointments with default pagination', async () => {
      const mockAppointments = [
        {
          id: 1,
          title: 'Test Event 1',
          teaser: 'Test teaser 1',
          startDateTime: '2024-12-25T10:00:00.000Z',
          featured: false
        },
        {
          id: 2,
          title: 'Test Event 2',
          teaser: 'Test teaser 2',
          startDateTime: '2024-12-26T14:00:00.000Z',
          featured: true
        }
      ];

      mockPrisma.appointment.count.mockResolvedValue(2);
      mockPrisma.appointment.findMany.mockResolvedValue(mockAppointments);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/appointments');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        items: mockAppointments,
        totalItems: 2,
        page: 1,
        pageSize: 10,
        totalPages: 1
      });

      expect(mockPrisma.appointment.count).toHaveBeenCalledWith({
        where: {
          status: 'accepted',
          startDateTime: { gte: expect.any(Date) }
        }
      });

      expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith({
        where: {
          status: 'accepted',
          startDateTime: { gte: expect.any(Date) }
        },
        orderBy: { startDateTime: 'asc' },
        skip: 0,
        take: 10,
        select: {
          id: true,
          title: true,
          teaser: true,
          startDateTime: true,
          featured: true
        }
      });
    });

    it('should fetch newsletter appointments with custom pagination', async () => {
      const mockAppointments = [
        {
          id: 3,
          title: 'Test Event 3',
          teaser: 'Test teaser 3',
          startDateTime: '2024-12-27T10:00:00.000Z',
          featured: false
        }
      ];

      mockPrisma.appointment.count.mockResolvedValue(25);
      mockPrisma.appointment.findMany.mockResolvedValue(mockAppointments);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/appointments?page=3&pageSize=5');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        items: mockAppointments,
        totalItems: 25,
        page: 3,
        pageSize: 5,
        totalPages: 5
      });

      expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith({
        where: {
          status: 'accepted',
          startDateTime: { gte: expect.any(Date) }
        },
        orderBy: { startDateTime: 'asc' },
        skip: 10, // (page 3 - 1) * pageSize 5
        take: 5,
        select: {
          id: true,
          title: true,
          teaser: true,
          startDateTime: true,
          featured: true
        }
      });
    });

    it('should return validation error for invalid pagination parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/appointments?page=0&pageSize=150');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid pagination parameters');
      expect(mockPrisma.appointment.count).not.toHaveBeenCalled();
      expect(mockPrisma.appointment.findMany).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      const error = new Error('Database connection failed');
      mockPrisma.appointment.count.mockRejectedValue(error);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/appointments');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch appointments');
    });
  });

  describe('PATCH', () => {
    it('should update appointment featured status successfully', async () => {
      const appointmentId = 123;
      const featured = true;
      const updatedAppointment = {
        id: appointmentId,
        title: 'Updated Event',
        featured: true
      };

      mockPrisma.appointment.update.mockResolvedValue(updatedAppointment);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/appointments', {
        method: 'PATCH',
        body: JSON.stringify({ id: appointmentId, featured })
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(updatedAppointment);
      expect(mockPrisma.appointment.update).toHaveBeenCalledWith({
        where: { id: appointmentId },
        data: { featured }
      });
    });

    it('should return validation error when appointment ID is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/appointments', {
        method: 'PATCH',
        body: JSON.stringify({ featured: true })
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Appointment ID is required');
      expect(mockPrisma.appointment.update).not.toHaveBeenCalled();
    });

    it('should return validation error when featured status is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/appointments', {
        method: 'PATCH',
        body: JSON.stringify({ id: 123 })
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Featured status is required');
      expect(mockPrisma.appointment.update).not.toHaveBeenCalled();
    });

    it('should return not found error when appointment does not exist', async () => {
      const appointmentId = 999;
      const error = new Error('Record to update not found');

      mockPrisma.appointment.update.mockRejectedValue(error);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/appointments', {
        method: 'PATCH',
        body: JSON.stringify({ id: appointmentId, featured: true })
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Appointment not found');
    });

    it('should handle other database errors gracefully', async () => {
      const appointmentId = 123;
      const error = new Error('Database connection failed');

      mockPrisma.appointment.update.mockRejectedValue(error);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/appointments', {
        method: 'PATCH',
        body: JSON.stringify({ id: appointmentId, featured: true })
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to update featured status');
    });

    it('should handle malformed JSON gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/appointments', {
        method: 'PATCH',
        body: 'invalid json'
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to update featured status');
      expect(mockPrisma.appointment.update).not.toHaveBeenCalled();
    });
  });
});