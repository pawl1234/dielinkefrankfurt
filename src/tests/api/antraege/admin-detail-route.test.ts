/**
 * Tests for Antraege Admin Detail API endpoint
 * 
 * Focus: Test the API's core behavior
 * - Valid requests return antrag details
 * - Invalid IDs return appropriate errors
 * - Database errors are handled gracefully
 * 
 * We mock only external dependencies (database)
 * Authentication testing is handled by withAdminAuth wrapper
 */
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/admin/antraege/[id]/route';
import prisma from '@/lib/prisma';

// Mock only external dependencies
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('/api/admin/antraege/[id] GET', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return antrag details when found', async () => {
    const mockAntrag = {
      id: '123',
      title: 'Test Antrag',
      summary: 'Test summary',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      status: 'NEU',
      purposes: JSON.stringify({
        zuschuss: { enabled: true, amount: 500 },
        raumbuchung: { enabled: true, location: 'Main Hall', numberOfPeople: 100, details: 'Conference' }
      }),
      fileUrls: JSON.stringify(['https://example.com/file1.pdf', 'https://example.com/file2.pdf']),
      createdAt: new Date('2024-01-01T10:00:00Z'),
      updatedAt: new Date('2024-01-01T10:00:00Z'),
      decisionComment: null,
      decidedBy: null,
      decidedAt: null,
    };

    mockPrisma.antrag.findUnique.mockResolvedValue(mockAntrag);

    const request = new NextRequest('http://localhost/api/admin/antraege/123');
    const response = await GET(request, { params: Promise.resolve({ id: '123' }) });

    expect(response.status).toBe(200);
    const data = await response.json();
    
    // Create expected response with serialized dates
    const expectedResponse = {
      ...mockAntrag,
      createdAt: mockAntrag.createdAt.toISOString(),
      updatedAt: mockAntrag.updatedAt.toISOString(),
      decidedAt: mockAntrag.decidedAt, // null stays null
    };
    
    expect(data).toEqual(expectedResponse);
    expect(mockPrisma.antrag.findUnique).toHaveBeenCalledWith({
      where: { id: '123' },
    });
  });

  it('should return 404 when antrag not found', async () => {
    mockPrisma.antrag.findUnique.mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/admin/antraege/999');
    const response = await GET(request, { params: Promise.resolve({ id: '999' }) });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Antrag not found');
  });

  it('should return 400 when ID is missing', async () => {
    const request = new NextRequest('http://localhost/api/admin/antraege/');
    const response = await GET(request, { params: Promise.resolve({ id: '' }) });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Antrag ID is required');
  });

  it('should handle database errors gracefully', async () => {
    mockPrisma.antrag.findUnique.mockRejectedValue(new Error('Database connection failed'));

    const request = new NextRequest('http://localhost/api/admin/antraege/123');
    const response = await GET(request, { params: Promise.resolve({ id: '123' }) });

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to fetch antrag details');
  });

  it('should return antrag with decision information', async () => {
    const mockAntragWithDecision = {
      id: '456',
      title: 'Approved Antrag',
      summary: 'This antrag was approved',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com',
      status: 'AKZEPTIERT',
      purposes: JSON.stringify({
        zuschuss: { enabled: true, amount: 1000 }
      }),
      fileUrls: null,
      createdAt: new Date('2024-01-01T10:00:00Z'),
      updatedAt: new Date('2024-01-02T14:00:00Z'),
      decisionComment: 'Approved for funding',
      decidedBy: 'admin@test.com',
      decidedAt: new Date('2024-01-02T14:00:00Z'),
    };

    mockPrisma.antrag.findUnique.mockResolvedValue(mockAntragWithDecision);

    const request = new NextRequest('http://localhost/api/admin/antraege/456');
    const response = await GET(request, { params: Promise.resolve({ id: '456' }) });

    expect(response.status).toBe(200);
    const data = await response.json();
    
    // Create expected response with serialized dates
    const expectedResponse = {
      ...mockAntragWithDecision,
      createdAt: mockAntragWithDecision.createdAt.toISOString(),
      updatedAt: mockAntragWithDecision.updatedAt.toISOString(),
      decidedAt: mockAntragWithDecision.decidedAt.toISOString(),
    };
    
    expect(data).toEqual(expectedResponse);
    expect(data.decisionComment).toBe('Approved for funding');
    expect(data.decidedBy).toBe('admin@test.com');
  });
});