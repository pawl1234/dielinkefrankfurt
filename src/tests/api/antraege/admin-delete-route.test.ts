import { NextRequest } from 'next/server';
import { DELETE } from '@/app/api/admin/antraege/[id]/route';
import prisma from '@/lib/prisma';

// Mock only external boundaries - auth and blob storage
jest.mock('@/lib/api-auth', () => ({
  withAdminAuth: jest.fn((handler) => handler),
}));

jest.mock('@vercel/blob', () => ({
  del: jest.fn(),
}));

// Mock Prisma for this test
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    antrag: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

const mockExistingAntrag = {
  id: 'test-id',
  title: 'Test Antrag',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  status: 'NEU',
  fileUrls: JSON.stringify(['https://example.com/file1.pdf', 'https://example.com/file2.docx']),
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Helper function to create request
function createRequest(): NextRequest {
  return new NextRequest('http://localhost/api/admin/antraege/test-id', {
    method: 'DELETE',
  });
}

describe('Admin Antrag Delete API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.antrag.findUnique as jest.Mock).mockResolvedValue(mockExistingAntrag);
    
    const { del } = require('@vercel/blob');
    (del as jest.Mock).mockResolvedValue(undefined);
  });

  describe('Input validation', () => {
    it('returns 400 when ID is missing', async () => {
      const request = createRequest();
      const response = await DELETE(request, { params: Promise.resolve({ id: '' }) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Antrag ID is required');
    });

    it('returns 404 when antrag not found', async () => {
      (prisma.antrag.findUnique as jest.Mock).mockResolvedValue(null);

      const request = createRequest();
      const response = await DELETE(request, { params: Promise.resolve({ id: 'nonexistent' }) });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Antrag not found');
    });
  });

  describe('Successful deletion', () => {
    it('deletes antrag with files', async () => {
      (prisma.antrag.delete as jest.Mock).mockResolvedValue(mockExistingAntrag);

      const request = createRequest();
      const response = await DELETE(request, { params: Promise.resolve({ id: 'test-id' }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message).toBe('Antrag and associated files deleted successfully');
      expect(data.deletedFiles).toBe(2);

      // Verify files were deleted
      const { del } = require('@vercel/blob');
      expect(del).toHaveBeenCalledTimes(2);
      expect(del).toHaveBeenCalledWith('https://example.com/file1.pdf');
      expect(del).toHaveBeenCalledWith('https://example.com/file2.docx');

      // Verify database deletion
      expect(prisma.antrag.delete).toHaveBeenCalledWith({
        where: { id: 'test-id' }
      });
    });

    it('deletes antrag without files', async () => {
      const antragWithoutFiles = {
        ...mockExistingAntrag,
        fileUrls: null,
      };
      (prisma.antrag.findUnique as jest.Mock).mockResolvedValue(antragWithoutFiles);
      (prisma.antrag.delete as jest.Mock).mockResolvedValue(antragWithoutFiles);

      const request = createRequest();
      const response = await DELETE(request, { params: Promise.resolve({ id: 'test-id' }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.deletedFiles).toBe(0);

      // No file deletion attempted
      const { del } = require('@vercel/blob');
      expect(del).not.toHaveBeenCalled();

      // Database deletion still happens
      expect(prisma.antrag.delete).toHaveBeenCalledWith({
        where: { id: 'test-id' }
      });
    });

    it('handles malformed file URLs gracefully', async () => {
      const antragWithBadJson = {
        ...mockExistingAntrag,
        fileUrls: 'invalid json',
      };
      (prisma.antrag.findUnique as jest.Mock).mockResolvedValue(antragWithBadJson);
      (prisma.antrag.delete as jest.Mock).mockResolvedValue(antragWithBadJson);

      const request = createRequest();
      const response = await DELETE(request, { params: Promise.resolve({ id: 'test-id' }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.deletedFiles).toBe(0);

      // Database deletion still happens despite JSON parsing error
      expect(prisma.antrag.delete).toHaveBeenCalled();
    });
  });

  describe('Atomic operation behavior', () => {
    it('aborts deletion if file deletion fails', async () => {
      const { del } = require('@vercel/blob');
      (del as jest.Mock)
        .mockResolvedValueOnce(undefined) // First file succeeds
        .mockRejectedValueOnce(new Error('File deletion failed')); // Second file fails

      const request = createRequest();
      const response = await DELETE(request, { params: Promise.resolve({ id: 'test-id' }) });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to delete associated files. Antrag deletion aborted to maintain data integrity.');
      expect(data.details).toContain('Failed to delete file: https://example.com/file2.docx');

      // Database deletion should NOT happen when file deletion fails
      expect(prisma.antrag.delete).not.toHaveBeenCalled();
    });

    it('aborts deletion if all file deletions fail', async () => {
      const { del } = require('@vercel/blob');
      (del as jest.Mock)
        .mockRejectedValueOnce(new Error('First file deletion failed'))
        .mockRejectedValueOnce(new Error('Second file deletion failed'));

      const request = createRequest();
      const response = await DELETE(request, { params: Promise.resolve({ id: 'test-id' }) });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to delete associated files. Antrag deletion aborted to maintain data integrity.');
      expect(data.details).toHaveLength(2);

      // Database deletion should not happen
      expect(prisma.antrag.delete).not.toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('handles database errors', async () => {
      (prisma.antrag.delete as jest.Mock).mockRejectedValue(new Error('Database connection failed'));

      const request = createRequest();
      const response = await DELETE(request, { params: Promise.resolve({ id: 'test-id' }) });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to delete antrag');
    });

    it('handles Prisma record not found error', async () => {
      (prisma.antrag.delete as jest.Mock).mockRejectedValue(
        new Error('Record to delete does not exist')
      );

      const request = createRequest();
      const response = await DELETE(request, { params: Promise.resolve({ id: 'test-id' }) });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Antrag not found');
    });
  });
});