import { NextRequest } from 'next/server';
import { PUT } from '@/app/api/admin/antraege/[id]/route';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { put, del } from '@vercel/blob';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    antrag: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@vercel/blob', () => ({
  put: jest.fn(),
  del: jest.fn(),
}));

const mockSession = {
  user: { email: 'admin@test.com' },
};

const mockExistingAntrag = {
  id: '123',
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
  createdAt: new Date('2024-01-01T10:00:00Z'),
  updatedAt: new Date('2024-01-01T10:00:00Z'),
};

describe('/api/admin/antraege/[id] - PUT', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (prisma.antrag.findUnique as jest.Mock).mockResolvedValue(mockExistingAntrag);
    (put as jest.Mock).mockResolvedValue({ url: 'https://example.com/new-file.pdf' });
  });

  it('should require authentication', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    
    const request = new NextRequest('http://localhost/api/admin/antraege/123', {
      method: 'PUT',
      body: JSON.stringify({ title: 'Updated Title' }),
    });
    const response = await PUT(request, { params: { id: '123' } });
    
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 400 when ID is missing', async () => {
    const request = new NextRequest('http://localhost/api/admin/antraege/', {
      method: 'PUT',
      body: JSON.stringify({ title: 'Updated Title' }),
    });
    const response = await PUT(request, { params: { id: '' } });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Antrag ID is required');
  });

  it('should return 404 when antrag not found', async () => {
    (prisma.antrag.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/admin/antraege/999', {
      method: 'PUT',
      body: JSON.stringify({ title: 'Updated Title' }),
    });
    const response = await PUT(request, { params: { id: '999' } });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Antrag not found');
  });

  it('should return 403 when trying to edit non-NEU antrag', async () => {
    (prisma.antrag.findUnique as jest.Mock).mockResolvedValue({
      ...mockExistingAntrag,
      status: 'AKZEPTIERT',
    });

    const request = new NextRequest('http://localhost/api/admin/antraege/123', {
      method: 'PUT',
      body: JSON.stringify({ title: 'Updated Title' }),
    });
    const response = await PUT(request, { params: { id: '123' } });

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe('Only anträge with status NEU can be edited');
  });

  it('should update basic fields successfully', async () => {
    const updatedAntrag = {
      ...mockExistingAntrag,
      title: 'Updated Title',
      summary: 'Updated Summary',
      updatedAt: new Date('2024-01-02T10:00:00Z'),
    };

    (prisma.antrag.update as jest.Mock).mockResolvedValue(updatedAntrag);

    const updateData = {
      title: 'Updated Title',
      summary: 'Updated Summary',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com',
    };

    const request = new NextRequest('http://localhost/api/admin/antraege/123', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(updateData),
    });
    const response = await PUT(request, { params: { id: '123' } });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.title).toBe('Updated Title');

    expect(prisma.antrag.update).toHaveBeenCalledWith({
      where: { id: '123' },
      data: expect.objectContaining({
        title: 'Updated Title',
        summary: 'Updated Summary',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        updatedAt: expect.any(Date),
      }),
    });
  });

  it('should update purposes successfully', async () => {
    const newPurposes = {
      zuschuss: { enabled: true, amount: 1000 },
      raumbuchung: { enabled: true, location: 'Conference Room', numberOfPeople: 50, details: 'Meeting' },
    };

    (prisma.antrag.update as jest.Mock).mockResolvedValue({
      ...mockExistingAntrag,
      purposes: JSON.stringify(newPurposes),
    });

    const request = new NextRequest('http://localhost/api/admin/antraege/123', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ purposes: newPurposes }),
    });
    const response = await PUT(request, { params: { id: '123' } });

    expect(response.status).toBe(200);
    expect(prisma.antrag.update).toHaveBeenCalledWith({
      where: { id: '123' },
      data: expect.objectContaining({
        purposes: JSON.stringify(newPurposes),
        updatedAt: expect.any(Date),
      }),
    });
  });

  it('should handle FormData with file uploads', async () => {
    const formData = new FormData();
    formData.append('title', 'Updated via FormData');
    formData.append('summary', 'Updated summary');
    formData.append('purposes', JSON.stringify({
      zuschuss: { enabled: true, amount: 750 }
    }));
    
    const mockFile = new File(['file content'], 'test.pdf', { type: 'application/pdf' });
    formData.append('file-0', mockFile);

    (prisma.antrag.update as jest.Mock).mockResolvedValue({
      ...mockExistingAntrag,
      fileUrls: JSON.stringify(['https://example.com/old-file.pdf', 'https://example.com/new-file.pdf']),
    });

    const request = new NextRequest('http://localhost/api/admin/antraege/123', {
      method: 'PUT',
      body: formData,
    });
    const response = await PUT(request, { params: { id: '123' } });

    expect(response.status).toBe(200);
    expect(put).toHaveBeenCalledWith(
      expect.stringContaining('antraege/123/'),
      mockFile,
      expect.objectContaining({ access: 'public' })
    );
    expect(prisma.antrag.update).toHaveBeenCalledWith({
      where: { id: '123' },
      data: expect.objectContaining({
        title: 'Updated via FormData',
        summary: 'Updated summary',
        fileUrls: JSON.stringify(['https://example.com/old-file.pdf', 'https://example.com/new-file.pdf']),
        updatedAt: expect.any(Date),
      }),
    });
  });

  it('should handle file deletion', async () => {
    const formData = new FormData();
    formData.append('title', 'Updated Title');
    formData.append('filesToDelete', JSON.stringify(['https://example.com/old-file.pdf']));
    formData.append('existingFileUrls', JSON.stringify([]));

    (prisma.antrag.update as jest.Mock).mockResolvedValue({
      ...mockExistingAntrag,
      fileUrls: null,
    });

    const request = new NextRequest('http://localhost/api/admin/antraege/123', {
      method: 'PUT',
      body: formData,
    });
    const response = await PUT(request, { params: { id: '123' } });

    expect(response.status).toBe(200);
    expect(del).toHaveBeenCalledWith('https://example.com/old-file.pdf');
    expect(prisma.antrag.update).toHaveBeenCalledWith({
      where: { id: '123' },
      data: expect.objectContaining({
        title: 'Updated Title',
        fileUrls: null,
        updatedAt: expect.any(Date),
      }),
    });
  });

  it('should handle validation errors', async () => {
    const invalidData = {
      firstName: '', // Invalid: empty string
      email: 'invalid-email', // Invalid: not a valid email
      title: 'a'.repeat(201), // Invalid: too long
    };

    const request = new NextRequest('http://localhost/api/admin/antraege/123', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(invalidData),
    });
    const response = await PUT(request, { params: { id: '123' } });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Validation failed');
    expect(data.details).toBeDefined();
  });

  it('should only update provided fields', async () => {
    (prisma.antrag.update as jest.Mock).mockResolvedValue({
      ...mockExistingAntrag,
      title: 'Only Title Updated',
    });

    const request = new NextRequest('http://localhost/api/admin/antraege/123', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Only Title Updated' }),
    });
    const response = await PUT(request, { params: { id: '123' } });

    expect(response.status).toBe(200);
    expect(prisma.antrag.update).toHaveBeenCalledWith({
      where: { id: '123' },
      data: {
        title: 'Only Title Updated',
        updatedAt: expect.any(Date),
      },
    });
  });

  it('should handle database errors gracefully', async () => {
    (prisma.antrag.update as jest.Mock).mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost/api/admin/antraege/123', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Updated Title' }),
    });
    const response = await PUT(request, { params: { id: '123' } });

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to update antrag');
  });

  it('should handle file upload errors gracefully', async () => {
    (put as jest.Mock).mockRejectedValue(new Error('Upload failed'));

    const formData = new FormData();
    formData.append('title', 'Updated Title');
    const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    formData.append('file-0', mockFile);

    const request = new NextRequest('http://localhost/api/admin/antraege/123', {
      method: 'PUT',
      body: formData,
    });
    const response = await PUT(request, { params: { id: '123' } });

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to update antrag');
  });
});