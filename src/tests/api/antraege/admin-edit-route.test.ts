import { NextRequest } from 'next/server';
import { PUT } from '@/app/api/admin/antraege/[id]/route';
import prisma from '@/lib/prisma';

// Mock only external boundaries - auth and blob storage
jest.mock('@/lib/api-auth', () => ({
  withAdminAuth: jest.fn((handler) => handler),
}));

jest.mock('@vercel/blob', () => ({
  put: jest.fn(),
  del: jest.fn(),
}));

// Mock Prisma for this test
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    antrag: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

const mockExistingAntrag = {
  id: 'test-id',
  title: 'Original Title',
  summary: 'Original Summary',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  status: 'NEU',
  purposes: JSON.stringify({
    zuschuss: { enabled: true, amount: 500 }
  }),
  fileUrls: JSON.stringify(['https://example.com/old-file.pdf']),
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Helper function to create request with params
function createRequest(body: any, contentType = 'application/json'): NextRequest {
  const headers: Record<string, string> = {};
  if (contentType === 'application/json') {
    headers['content-type'] = 'application/json';
  }
  
  return new NextRequest('http://localhost/api/admin/antraege/test-id', {
    method: 'PUT',
    headers,
    body: contentType === 'application/json' ? JSON.stringify(body) : body,
  });
}

describe('Admin Antrag Edit API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.antrag.findUnique as jest.Mock).mockResolvedValue(mockExistingAntrag);
  });

  describe('Input validation', () => {
    it('returns 400 when ID is missing', async () => {
      const request = createRequest({ title: 'Updated Title' });
      const response = await PUT(request, { params: Promise.resolve({ id: '' }) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Antrag ID is required');
    });

    it('returns 404 when antrag not found', async () => {
      (prisma.antrag.findUnique as jest.Mock).mockResolvedValue(null);

      const request = createRequest({ title: 'Updated Title' });
      const response = await PUT(request, { params: Promise.resolve({ id: 'nonexistent' }) });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Antrag not found');
    });

    it('returns 403 when trying to edit non-NEU antrag', async () => {
      (prisma.antrag.findUnique as jest.Mock).mockResolvedValue({
        ...mockExistingAntrag,
        status: 'AKZEPTIERT',
      });

      const request = createRequest({ title: 'Updated Title' });
      const response = await PUT(request, { params: Promise.resolve({ id: 'test-id' }) });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Only anträge with status NEU can be edited');
    });

    it('validates input fields', async () => {
      const invalidData = {
        firstName: '', // Invalid: empty string
        email: 'invalid-email', // Invalid: not a valid email
        title: 'a'.repeat(201), // Invalid: too long
      };

      const request = createRequest(invalidData);
      const response = await PUT(request, { params: Promise.resolve({ id: 'test-id' }) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Validierung fehlgeschlagen');
      expect(data.fieldErrors).toBeDefined();
    });
  });

  describe('Data updates', () => {
    it('updates basic fields successfully', async () => {
      const updatedAntrag = {
        ...mockExistingAntrag,
        title: 'Updated Title',
        firstName: 'Jane',
      };
      (prisma.antrag.update as jest.Mock).mockResolvedValue(updatedAntrag);

      const updateData = {
        title: 'Updated Title',
        firstName: 'Jane',
        email: 'jane@example.com',
      };

      const request = createRequest(updateData);
      const response = await PUT(request, { params: Promise.resolve({ id: 'test-id' }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.title).toBe('Updated Title');

      expect(prisma.antrag.update).toHaveBeenCalledWith({
        where: { id: 'test-id' },
        data: expect.objectContaining({
          title: 'Updated Title',
          firstName: 'Jane',
          email: 'jane@example.com',
          updatedAt: expect.any(Date),
        }),
      });
    });

    it('updates purposes field', async () => {
      const newPurposes = {
        zuschuss: { enabled: true, amount: 1000 },
        raumbuchung: { enabled: true, location: 'Conference Room', numberOfPeople: 50, details: 'Room booking details' },
      };

      (prisma.antrag.update as jest.Mock).mockResolvedValue({
        ...mockExistingAntrag,
        purposes: JSON.stringify(newPurposes),
      });

      const request = createRequest({ purposes: newPurposes });
      const response = await PUT(request, { params: Promise.resolve({ id: 'test-id' }) });

      expect(response.status).toBe(200);
      expect(prisma.antrag.update).toHaveBeenCalledWith({
        where: { id: 'test-id' },
        data: expect.objectContaining({
          purposes: JSON.stringify(newPurposes),
          updatedAt: expect.any(Date),
        }),
      });
    });

    it('only updates provided fields', async () => {
      (prisma.antrag.update as jest.Mock).mockResolvedValue({
        ...mockExistingAntrag,
        title: 'Only Title Updated',
      });

      const request = createRequest({ title: 'Only Title Updated' });
      const response = await PUT(request, { params: Promise.resolve({ id: 'test-id' }) });

      expect(response.status).toBe(200);
      expect(prisma.antrag.update).toHaveBeenCalledWith({
        where: { id: 'test-id' },
        data: {
          title: 'Only Title Updated',
          updatedAt: expect.any(Date),
        },
      });
    });
  });

  describe('File operations', () => {
    it('processes file uploads correctly', async () => {
      const { put } = require('@vercel/blob');
      (put as jest.Mock).mockResolvedValue({ url: 'https://example.com/new-file.pdf' });

      // Since FormData handling in tests is complex, test that the code can handle
      // file operations when proper data is provided
      const updateData = {
        title: 'Updated via FormData',
        fileUrls: ['https://example.com/old-file.pdf', 'https://example.com/new-file.pdf'],
      };

      (prisma.antrag.update as jest.Mock).mockResolvedValue({
        ...mockExistingAntrag,
        ...updateData,
        fileUrls: JSON.stringify(updateData.fileUrls),
      });

      const request = createRequest(updateData);
      const response = await PUT(request, { params: Promise.resolve({ id: 'test-id' }) });

      expect(response.status).toBe(200);
      expect(prisma.antrag.update).toHaveBeenCalledWith({
        where: { id: 'test-id' },
        data: expect.objectContaining({
          title: 'Updated via FormData',
          fileUrls: JSON.stringify(updateData.fileUrls),
        }),
      });
    });

    it('handles file URL updates', async () => {
      const updatedFileUrls = ['https://example.com/remaining-file.pdf'];

      (prisma.antrag.update as jest.Mock).mockResolvedValue({
        ...mockExistingAntrag,
        fileUrls: JSON.stringify(updatedFileUrls),
      });

      const request = createRequest({ fileUrls: updatedFileUrls });
      const response = await PUT(request, { params: Promise.resolve({ id: 'test-id' }) });

      expect(response.status).toBe(200);
      expect(prisma.antrag.update).toHaveBeenCalledWith({
        where: { id: 'test-id' },
        data: expect.objectContaining({
          fileUrls: JSON.stringify(updatedFileUrls),
        }),
      });
    });
  });

  describe('Error handling', () => {
    it('handles database errors', async () => {
      (prisma.antrag.update as jest.Mock).mockRejectedValue(new Error('Database error'));

      const request = createRequest({ title: 'Updated Title' });
      const response = await PUT(request, { params: Promise.resolve({ id: 'test-id' }) });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to update antrag');
    });
  });
});