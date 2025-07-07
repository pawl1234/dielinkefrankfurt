import { NextRequest } from 'next/server';
import { DELETE } from '@/app/api/admin/antraege/[id]/route';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { del } from '@vercel/blob';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    antrag: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@vercel/blob', () => ({
  del: jest.fn(),
}));

const mockSession = {
  user: { email: 'admin@test.com' },
};

const mockExistingAntrag = {
  id: '123',
  title: 'Test Antrag',
  summary: 'Test Summary',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  status: 'NEU',
  purposes: JSON.stringify({
    zuschuss: { enabled: true, amount: 500 }
  }),
  fileUrls: JSON.stringify(['https://example.com/file1.pdf', 'https://example.com/file2.docx']),
  createdAt: new Date('2024-01-01T10:00:00Z'),
  updatedAt: new Date('2024-01-01T10:00:00Z'),
};

describe('/api/admin/antraege/[id] - DELETE', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (prisma.antrag.findUnique as jest.Mock).mockResolvedValue(mockExistingAntrag);
    (del as jest.Mock).mockResolvedValue(undefined);
  });

  it('should require authentication', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    
    const request = new NextRequest('http://localhost/api/admin/antraege/123', {
      method: 'DELETE',
    });
    const response = await DELETE(request, { params: { id: '123' } });
    
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 400 when ID is missing', async () => {
    const request = new NextRequest('http://localhost/api/admin/antraege/', {
      method: 'DELETE',
    });
    const response = await DELETE(request, { params: { id: '' } });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Antrag ID is required');
  });

  it('should return 404 when antrag not found', async () => {
    (prisma.antrag.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/admin/antraege/999', {
      method: 'DELETE',
    });
    const response = await DELETE(request, { params: { id: '999' } });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Antrag not found');
  });

  it('should successfully delete antrag with files', async () => {
    (prisma.antrag.delete as jest.Mock).mockResolvedValue(mockExistingAntrag);

    const request = new NextRequest('http://localhost/api/admin/antraege/123', {
      method: 'DELETE',
    });
    const response = await DELETE(request, { params: { id: '123' } });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.message).toBe('Antrag and associated files deleted successfully');
    expect(data.deletedFiles).toBe(2);

    // Verify files were deleted first
    expect(del).toHaveBeenCalledTimes(2);
    expect(del).toHaveBeenCalledWith('https://example.com/file1.pdf');
    expect(del).toHaveBeenCalledWith('https://example.com/file2.docx');

    // Verify database deletion happened after file deletion
    expect(prisma.antrag.delete).toHaveBeenCalledWith({
      where: { id: '123' }
    });
  });

  it('should successfully delete antrag without files', async () => {
    const antragWithoutFiles = {
      ...mockExistingAntrag,
      fileUrls: null,
    };
    (prisma.antrag.findUnique as jest.Mock).mockResolvedValue(antragWithoutFiles);
    (prisma.antrag.delete as jest.Mock).mockResolvedValue(antragWithoutFiles);

    const request = new NextRequest('http://localhost/api/admin/antraege/123', {
      method: 'DELETE',
    });
    const response = await DELETE(request, { params: { id: '123' } });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.deletedFiles).toBe(0);

    // No file deletion should be attempted
    expect(del).not.toHaveBeenCalled();

    // Database deletion should still happen
    expect(prisma.antrag.delete).toHaveBeenCalledWith({
      where: { id: '123' }
    });
  });

  it('should abort deletion if file deletion fails (atomic operation)', async () => {
    (del as jest.Mock)
      .mockResolvedValueOnce(undefined) // First file succeeds
      .mockRejectedValueOnce(new Error('File deletion failed')); // Second file fails

    const request = new NextRequest('http://localhost/api/admin/antraege/123', {
      method: 'DELETE',
    });
    const response = await DELETE(request, { params: { id: '123' } });

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to delete associated files. Antrag deletion aborted to maintain data integrity.');
    expect(data.details).toContain('Failed to delete file: https://example.com/file2.docx');

    // Database deletion should NOT happen
    expect(prisma.antrag.delete).not.toHaveBeenCalled();
  });

  it('should handle malformed file URLs gracefully', async () => {
    const antragWithBadJson = {
      ...mockExistingAntrag,
      fileUrls: 'invalid json',
    };
    (prisma.antrag.findUnique as jest.Mock).mockResolvedValue(antragWithBadJson);
    (prisma.antrag.delete as jest.Mock).mockResolvedValue(antragWithBadJson);

    const request = new NextRequest('http://localhost/api/admin/antraege/123', {
      method: 'DELETE',
    });
    const response = await DELETE(request, { params: { id: '123' } });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.deletedFiles).toBe(0);

    // No file deletion should be attempted due to parsing error
    expect(del).not.toHaveBeenCalled();

    // Database deletion should still happen
    expect(prisma.antrag.delete).toHaveBeenCalled();
  });

  it('should handle empty file URLs array', async () => {
    const antragWithEmptyFiles = {
      ...mockExistingAntrag,
      fileUrls: JSON.stringify([]),
    };
    (prisma.antrag.findUnique as jest.Mock).mockResolvedValue(antragWithEmptyFiles);
    (prisma.antrag.delete as jest.Mock).mockResolvedValue(antragWithEmptyFiles);

    const request = new NextRequest('http://localhost/api/admin/antraege/123', {
      method: 'DELETE',
    });
    const response = await DELETE(request, { params: { id: '123' } });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.deletedFiles).toBe(0);

    // No file deletion should be attempted
    expect(del).not.toHaveBeenCalled();

    // Database deletion should still happen
    expect(prisma.antrag.delete).toHaveBeenCalled();
  });

  it('should handle database errors gracefully', async () => {
    (prisma.antrag.delete as jest.Mock).mockRejectedValue(new Error('Database connection failed'));

    const request = new NextRequest('http://localhost/api/admin/antraege/123', {
      method: 'DELETE',
    });
    const response = await DELETE(request, { params: { id: '123' } });

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to delete antrag');
  });

  it('should handle Prisma record not found error', async () => {
    (del as jest.Mock).mockResolvedValue(undefined);
    (prisma.antrag.delete as jest.Mock).mockRejectedValue(
      new Error('Record to delete does not exist')
    );

    const request = new NextRequest('http://localhost/api/admin/antraege/123', {
      method: 'DELETE',
    });
    const response = await DELETE(request, { params: { id: '123' } });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Antrag not found');
  });

  it('should delete files in correct order before database', async () => {
    const deletionOrder: string[] = [];
    
    (del as jest.Mock).mockImplementation((url: string) => {
      deletionOrder.push(`file: ${url}`);
      return Promise.resolve();
    });

    (prisma.antrag.delete as jest.Mock).mockImplementation(() => {
      deletionOrder.push('database');
      return Promise.resolve(mockExistingAntrag);
    });

    const request = new NextRequest('http://localhost/api/admin/antraege/123', {
      method: 'DELETE',
    });
    const response = await DELETE(request, { params: { id: '123' } });

    expect(response.status).toBe(200);
    expect(deletionOrder).toEqual([
      'file: https://example.com/file1.pdf',
      'file: https://example.com/file2.docx',
      'database'
    ]);
  });

  it('should handle partial file deletion failure', async () => {
    (del as jest.Mock)
      .mockRejectedValueOnce(new Error('First file deletion failed'))
      .mockRejectedValueOnce(new Error('Second file deletion failed'));

    const request = new NextRequest('http://localhost/api/admin/antraege/123', {
      method: 'DELETE',
    });
    const response = await DELETE(request, { params: { id: '123' } });

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to delete associated files. Antrag deletion aborted to maintain data integrity.');
    expect(data.details).toHaveLength(2);
    expect(data.details).toContain('Failed to delete file: https://example.com/file1.pdf');
    expect(data.details).toContain('Failed to delete file: https://example.com/file2.docx');

    // Database deletion should not happen
    expect(prisma.antrag.delete).not.toHaveBeenCalled();
  });

  it('should handle non-array fileUrls gracefully', async () => {
    const antragWithStringFile = {
      ...mockExistingAntrag,
      fileUrls: JSON.stringify('not-an-array'),
    };
    (prisma.antrag.findUnique as jest.Mock).mockResolvedValue(antragWithStringFile);
    (prisma.antrag.delete as jest.Mock).mockResolvedValue(antragWithStringFile);

    const request = new NextRequest('http://localhost/api/admin/antraege/123', {
      method: 'DELETE',
    });
    const response = await DELETE(request, { params: { id: '123' } });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.deletedFiles).toBe(0);

    // No file deletion should be attempted
    expect(del).not.toHaveBeenCalled();

    // Database deletion should still happen
    expect(prisma.antrag.delete).toHaveBeenCalled();
  });
});