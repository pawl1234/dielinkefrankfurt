import { NextRequest } from 'next/server';
import { GET, PATCH, DELETE } from '@/app/api/admin/antraege/route';
import prisma from '@/lib/prisma';
import { getToken } from 'next-auth/jwt';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    antrag: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock('next-auth/jwt', () => ({
  getToken: jest.fn(),
}));

jest.mock('@vercel/blob', () => ({
  del: jest.fn(),
}));

const mockToken = {
  role: 'admin',
  email: 'admin@test.com',
};

describe('/api/admin/antraege', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getToken as jest.Mock).mockResolvedValue(mockToken);
  });

  describe('GET', () => {
    it('should require authentication', async () => {
      (getToken as jest.Mock).mockResolvedValue(null);
      
      const request = new NextRequest('http://localhost/api/admin/antraege');
      const response = await GET(request);
      
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should return paginated anträge with default parameters', async () => {
      const mockAntraege = [
        {
          id: '1',
          title: 'Test Antrag 1',
          summary: 'Test summary 1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          status: 'NEU',
          purposes: JSON.stringify({ zuschuss: { enabled: true, amount: 100 } }),
          fileUrls: null,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
        {
          id: '2',
          title: 'Test Antrag 2',
          summary: 'Test summary 2',
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
          status: 'AKZEPTIERT',
          purposes: JSON.stringify({ raumbuchung: { enabled: true, location: 'Main Hall', numberOfPeople: 50 } }),
          fileUrls: JSON.stringify(['https://example.com/file1.pdf']),
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      ];

      (prisma.antrag.count as jest.Mock).mockResolvedValue(2);
      (prisma.antrag.findMany as jest.Mock).mockResolvedValue(mockAntraege);

      const request = new NextRequest('http://localhost/api/admin/antraege');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data).toEqual({
        items: mockAntraege,
        totalItems: 2,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      });

      expect(prisma.antrag.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
      });
    });

    it('should filter by status', async () => {
      (prisma.antrag.count as jest.Mock).mockResolvedValue(1);
      (prisma.antrag.findMany as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost/api/admin/antraege?status=NEU');
      await GET(request);

      expect(prisma.antrag.findMany).toHaveBeenCalledWith({
        where: { status: 'NEU' },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
      });
    });

    it('should handle search functionality', async () => {
      (prisma.antrag.count as jest.Mock).mockResolvedValue(0);
      (prisma.antrag.findMany as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost/api/admin/antraege?search=test');
      await GET(request);

      expect(prisma.antrag.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { title: { contains: 'test', mode: 'insensitive' } },
            { summary: { contains: 'test', mode: 'insensitive' } },
            { firstName: { contains: 'test', mode: 'insensitive' } },
            { lastName: { contains: 'test', mode: 'insensitive' } },
            { email: { contains: 'test', mode: 'insensitive' } },
          ],
        },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
      });
    });

    it('should handle combined status and search filters', async () => {
      (prisma.antrag.count as jest.Mock).mockResolvedValue(0);
      (prisma.antrag.findMany as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost/api/admin/antraege?status=AKZEPTIERT&search=John');
      await GET(request);

      expect(prisma.antrag.findMany).toHaveBeenCalledWith({
        where: {
          status: 'AKZEPTIERT',
          OR: [
            { title: { contains: 'John', mode: 'insensitive' } },
            { summary: { contains: 'John', mode: 'insensitive' } },
            { firstName: { contains: 'John', mode: 'insensitive' } },
            { lastName: { contains: 'John', mode: 'insensitive' } },
            { email: { contains: 'John', mode: 'insensitive' } },
          ],
        },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
      });
    });

    it('should handle pagination parameters', async () => {
      (prisma.antrag.count as jest.Mock).mockResolvedValue(100);
      (prisma.antrag.findMany as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost/api/admin/antraege?page=3&pageSize=20');
      const response = await GET(request);

      expect(prisma.antrag.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: 'desc' },
        skip: 40, // (page 3 - 1) * 20
        take: 20,
      });

      const data = await response.json();
      expect(data.page).toBe(3);
      expect(data.pageSize).toBe(20);
      expect(data.totalPages).toBe(5); // 100 items / 20 per page
    });

    it('should return a single antrag by ID', async () => {
      const mockAntrag = {
        id: '123',
        title: 'Single Antrag',
        status: 'NEU',
      };

      (prisma.antrag.findUnique as jest.Mock).mockResolvedValue(mockAntrag);

      const request = new NextRequest('http://localhost/api/admin/antraege?id=123');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual(mockAntrag);

      expect(prisma.antrag.findUnique).toHaveBeenCalledWith({
        where: { id: '123' },
      });
    });

    it('should return 404 for non-existent antrag ID', async () => {
      (prisma.antrag.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/admin/antraege?id=999');
      const response = await GET(request);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Antrag not found');
    });
  });

  describe('PATCH', () => {
    it('should require authentication', async () => {
      (getToken as jest.Mock).mockResolvedValue(null);
      
      const request = new NextRequest('http://localhost/api/admin/antraege', {
        method: 'PATCH',
        body: JSON.stringify({ id: '1', status: 'AKZEPTIERT' }),
      });
      const response = await PATCH(request);
      
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should update antrag status', async () => {
      const mockAntrag = {
        id: '1',
        status: 'NEU',
      };
      const updatedAntrag = {
        ...mockAntrag,
        status: 'AKZEPTIERT',
        updatedAt: new Date(),
      };

      (prisma.antrag.findUnique as jest.Mock).mockResolvedValue(mockAntrag);
      (prisma.antrag.update as jest.Mock).mockResolvedValue(updatedAntrag);

      const request = new NextRequest('http://localhost/api/admin/antraege', {
        method: 'PATCH',
        body: JSON.stringify({ id: '1', status: 'AKZEPTIERT' }),
      });
      const response = await PATCH(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe('AKZEPTIERT');

      expect(prisma.antrag.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: expect.objectContaining({
          status: 'AKZEPTIERT',
          updatedAt: expect.any(Date),
        }),
      });
    });

    it('should update multiple fields', async () => {
      (prisma.antrag.findUnique as jest.Mock).mockResolvedValue({ id: '1' });
      (prisma.antrag.update as jest.Mock).mockResolvedValue({ id: '1' });

      const updateData = {
        id: '1',
        status: 'ABGELEHNT',
        decisionComment: 'Not approved due to insufficient funds',
        decidedBy: 'admin@test.com',
        decidedAt: '2025-07-07T07:57:34.585Z',
      };

      const request = new NextRequest('http://localhost/api/admin/antraege', {
        method: 'PATCH',
        body: JSON.stringify(updateData),
      });
      await PATCH(request);

      expect(prisma.antrag.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: expect.objectContaining({
          status: 'ABGELEHNT',
          decisionComment: 'Not approved due to insufficient funds',
          decidedBy: 'admin@test.com',
          decidedAt: updateData.decidedAt,
        }),
      });
    });

    it('should return error if ID is missing', async () => {
      const request = new NextRequest('http://localhost/api/admin/antraege', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'AKZEPTIERT' }),
      });
      const response = await PATCH(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Antrag ID is required');
    });
  });

  describe('DELETE', () => {
    it('should require authentication', async () => {
      (getToken as jest.Mock).mockResolvedValue(null);
      
      const request = new NextRequest('http://localhost/api/admin/antraege', {
        method: 'DELETE',
        body: JSON.stringify({ id: '1' }),
      });
      const response = await DELETE(request);
      
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should delete an antrag', async () => {
      const mockAntrag = {
        id: '1',
        fileUrls: JSON.stringify(['https://example.com/file1.pdf', 'https://example.com/file2.pdf']),
      };

      (prisma.antrag.findUnique as jest.Mock).mockResolvedValue(mockAntrag);
      (prisma.antrag.delete as jest.Mock).mockResolvedValue(mockAntrag);

      const request = new NextRequest('http://localhost/api/admin/antraege', {
        method: 'DELETE',
        body: JSON.stringify({ id: '1' }),
      });
      const response = await DELETE(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);

      expect(prisma.antrag.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('should return error if antrag not found', async () => {
      (prisma.antrag.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/admin/antraege', {
        method: 'DELETE',
        body: JSON.stringify({ id: '999' }),
      });
      const response = await DELETE(request);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Antrag not found');
    });
  });
});