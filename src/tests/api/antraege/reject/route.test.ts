import { NextRequest } from 'next/server';
import { POST } from '@/app/api/admin/antraege/[id]/reject/route';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { sendAntragRejectionEmail } from '@/lib/email-notifications';

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

jest.mock('@/lib/email-notifications', () => ({
  sendAntragRejectionEmail: jest.fn(),
}));

jest.mock('@/lib/api-auth', () => ({
  withAdminAuth: jest.fn((handler) => handler),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const mockSession = {
  user: { email: 'admin@test.com' },
};

const mockAntrag = {
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
  fileUrls: null,
  createdAt: new Date('2024-01-01T10:00:00Z'),
  updatedAt: new Date('2024-01-01T10:00:00Z'),
  decisionComment: null,
  decidedBy: null,
  decidedAt: null,
};

describe('/api/admin/antraege/[id]/reject - POST', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (prisma.antrag.findUnique as jest.Mock).mockResolvedValue(mockAntrag);
    (sendAntragRejectionEmail as jest.Mock).mockResolvedValue({ success: true });
  });

  // Note: Authentication is handled by withAdminAuth wrapper

  it('should return 400 when ID is missing', async () => {
    const request = new NextRequest('http://localhost/api/admin/antraege//reject', {
      method: 'POST',
    });
    const response = await POST(request, { params: { id: '' } });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Antrag ID is required');
  });

  it('should return 404 when antrag not found', async () => {
    (prisma.antrag.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/admin/antraege/999/reject', {
      method: 'POST',
    });
    const response = await POST(request, { params: { id: '999' } });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Antrag not found');
  });

  it('should return 400 when antrag is already processed', async () => {
    const processedAntrag = { ...mockAntrag, status: 'ABGELEHNT' };
    (prisma.antrag.findUnique as jest.Mock).mockResolvedValue(processedAntrag);

    const request = new NextRequest('http://localhost/api/admin/antraege/123/reject', {
      method: 'POST',
    });
    const response = await POST(request, { params: { id: '123' } });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Antrag has already been abgelehnt');
  });

  it('should successfully reject antrag without comment', async () => {
    const rejectedAntrag = {
      ...mockAntrag,
      status: 'ABGELEHNT',
      decidedAt: new Date('2024-01-02T10:00:00Z'),
    };
    (prisma.antrag.update as jest.Mock).mockResolvedValue(rejectedAntrag);

    const request = new NextRequest('http://localhost/api/admin/antraege/123/reject', {
      method: 'POST',
    });
    const response = await POST(request, { params: { id: '123' } });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.message).toBe('Antrag wurde erfolgreich abgelehnt');
    expect(data.antrag.status).toBe('ABGELEHNT');
    expect(data.emailSent).toBe(true);

    // Verify database update
    expect(prisma.antrag.update).toHaveBeenCalledWith({
      where: { id: '123' },
      data: {
        status: 'ABGELEHNT',
        decisionComment: null,
        decidedAt: expect.any(Date),
      }
    });

    // Verify email was sent
    expect(sendAntragRejectionEmail).toHaveBeenCalledWith(rejectedAntrag, undefined);
  });

  it('should successfully reject antrag with comment', async () => {
    const decisionComment = 'Unfortunately, the proposal does not meet our criteria.';
    const rejectedAntrag = {
      ...mockAntrag,
      status: 'ABGELEHNT',
      decisionComment,
      decidedAt: new Date('2024-01-02T10:00:00Z'),
    };
    (prisma.antrag.update as jest.Mock).mockResolvedValue(rejectedAntrag);

    const request = new NextRequest('http://localhost/api/admin/antraege/123/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decisionComment }),
    });
    const response = await POST(request, { params: { id: '123' } });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.antrag.decisionComment).toBe(decisionComment);

    // Verify database update with comment
    expect(prisma.antrag.update).toHaveBeenCalledWith({
      where: { id: '123' },
      data: {
        status: 'ABGELEHNT',
        decisionComment,
        decidedAt: expect.any(Date),
      }
    });

    // Verify email was sent with comment
    expect(sendAntragRejectionEmail).toHaveBeenCalledWith(rejectedAntrag, decisionComment);
  });

  it('should handle malformed JSON body gracefully', async () => {
    const rejectedAntrag = {
      ...mockAntrag,
      status: 'ABGELEHNT',
      decidedAt: new Date('2024-01-02T10:00:00Z'),
    };
    (prisma.antrag.update as jest.Mock).mockResolvedValue(rejectedAntrag);

    const request = new NextRequest('http://localhost/api/admin/antraege/123/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid json',
    });
    const response = await POST(request, { params: { id: '123' } });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);

    // Should proceed without comment
    expect(prisma.antrag.update).toHaveBeenCalledWith({
      where: { id: '123' },
      data: {
        status: 'ABGELEHNT',
        decisionComment: null,
        decidedAt: expect.any(Date),
      }
    });
  });

  it('should continue processing even if email fails', async () => {
    const rejectedAntrag = {
      ...mockAntrag,
      status: 'ABGELEHNT',
      decidedAt: new Date('2024-01-02T10:00:00Z'),
    };
    (prisma.antrag.update as jest.Mock).mockResolvedValue(rejectedAntrag);
    (sendAntragRejectionEmail as jest.Mock).mockResolvedValue({ 
      success: false, 
      error: 'Email service unavailable' 
    });

    const request = new NextRequest('http://localhost/api/admin/antraege/123/reject', {
      method: 'POST',
    });
    const response = await POST(request, { params: { id: '123' } });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.emailSent).toBe(false);

    // Antrag should still be updated
    expect(prisma.antrag.update).toHaveBeenCalled();
  });

  it('should handle database errors', async () => {
    (prisma.antrag.update as jest.Mock).mockRejectedValue(new Error('Database connection failed'));

    const request = new NextRequest('http://localhost/api/admin/antraege/123/reject', {
      method: 'POST',
    });
    const response = await POST(request, { params: { id: '123' } });

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to reject antrag');
  });

  it('should handle various antrag statuses correctly', async () => {
    const acceptedAntrag = { ...mockAntrag, status: 'AKZEPTIERT' };
    (prisma.antrag.findUnique as jest.Mock).mockResolvedValue(acceptedAntrag);

    const request = new NextRequest('http://localhost/api/admin/antraege/123/reject', {
      method: 'POST',
    });
    const response = await POST(request, { params: { id: '123' } });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Antrag has already been akzeptiert');
  });

  it('should handle empty request body', async () => {
    const rejectedAntrag = {
      ...mockAntrag,
      status: 'ABGELEHNT',
      decidedAt: new Date('2024-01-02T10:00:00Z'),
    };
    (prisma.antrag.update as jest.Mock).mockResolvedValue(rejectedAntrag);

    const request = new NextRequest('http://localhost/api/admin/antraege/123/reject', {
      method: 'POST',
      // No body
    });
    const response = await POST(request, { params: { id: '123' } });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);

    // Should proceed without comment
    expect(prisma.antrag.update).toHaveBeenCalledWith({
      where: { id: '123' },
      data: {
        status: 'ABGELEHNT',
        decisionComment: null,
        decidedAt: expect.any(Date),
      }
    });
  });

  it('should handle long decision comments', async () => {
    const longComment = 'B'.repeat(1000); // Very long comment
    const rejectedAntrag = {
      ...mockAntrag,
      status: 'ABGELEHNT',
      decisionComment: longComment,
      decidedAt: new Date('2024-01-02T10:00:00Z'),
    };
    (prisma.antrag.update as jest.Mock).mockResolvedValue(rejectedAntrag);

    const request = new NextRequest('http://localhost/api/admin/antraege/123/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decisionComment: longComment }),
    });
    const response = await POST(request, { params: { id: '123' } });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.antrag.decisionComment).toBe(longComment);
  });

  it('should provide specific rejection message', async () => {
    const rejectedAntrag = {
      ...mockAntrag,
      status: 'ABGELEHNT',
      decidedAt: new Date('2024-01-02T10:00:00Z'),
    };
    (prisma.antrag.update as jest.Mock).mockResolvedValue(rejectedAntrag);

    const request = new NextRequest('http://localhost/api/admin/antraege/123/reject', {
      method: 'POST',
    });
    const response = await POST(request, { params: { id: '123' } });

    const data = await response.json();
    expect(data.message).toBe('Antrag wurde erfolgreich abgelehnt');
    expect(data.message).not.toBe('Antrag wurde erfolgreich angenommen'); // Different from accept
  });
});