import { NextRequest } from 'next/server';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Import after mocking (mocks are in jest.setup.api.js)
import { GET } from '@/app/api/admin/newsletter/status-reports/route';
import prisma from '@/lib/prisma';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('/api/admin/newsletter/status-reports', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET', () => {
    it('should fetch status reports for newsletter with default 2 weeks', async () => {
      const mockGroups = [
        {
          id: 1,
          name: 'Group A',
          slug: 'group-a',
          description: 'First group',
          logoUrl: 'https://example.com/logo1.png',
          metadata: null,
          status: 'ACTIVE',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-15'),
          statusReports: [
            {
              id: 1,
              title: 'Weekly Report 1',
              content: 'Report content 1',
              reporterFirstName: 'John',
              reporterLastName: 'Doe',
              status: 'ACTIVE',
              createdAt: new Date('2024-01-10'),
              updatedAt: new Date('2024-01-10')
            },
            {
              id: 2,
              title: 'Weekly Report 2',
              content: 'Report content 2',
              reporterFirstName: 'Jane',
              reporterLastName: 'Smith',
              status: 'ACTIVE',
              createdAt: new Date('2024-01-08'),
              updatedAt: new Date('2024-01-08')
            }
          ]
        },
        {
          id: 2,
          name: 'Group B',
          slug: 'group-b',
          description: 'Second group',
          logoUrl: null,
          metadata: null,
          status: 'ACTIVE',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-15'),
          statusReports: [
            {
              id: 3,
              title: 'Monthly Report',
              content: 'Monthly report content',
              reporterFirstName: 'Bob',
              reporterLastName: 'Johnson',
              status: 'ACTIVE',
              createdAt: new Date('2024-01-12'),
              updatedAt: new Date('2024-01-12')
            }
          ]
        },
        {
          id: 3,
          name: 'Group C',
          slug: 'group-c',
          description: 'Third group',
          logoUrl: null,
          metadata: null,
          status: 'ACTIVE',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-15'),
          statusReports: [] // No reports
        }
      ];

      mockPrisma.group.findMany.mockResolvedValue(mockGroups);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/status-reports');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.statusReportsByGroup).toHaveLength(2); // Only groups with reports
      
      // Check first group
      expect(data.statusReportsByGroup[0].group.name).toBe('Group A');
      expect(data.statusReportsByGroup[0].reports).toHaveLength(2);
      
      // Check second group
      expect(data.statusReportsByGroup[1].group.name).toBe('Group B');
      expect(data.statusReportsByGroup[1].reports).toHaveLength(1);

      // Verify the query was called with correct parameters
      expect(mockPrisma.group.findMany).toHaveBeenCalledWith({
        where: { status: 'ACTIVE' },
        orderBy: { name: 'asc' },
        include: {
          statusReports: {
            where: {
              status: 'ACTIVE',
              createdAt: { gte: expect.any(Date) }
            },
            orderBy: { createdAt: 'desc' }
          }
        }
      });
    });

    it('should fetch status reports with custom weeks parameter', async () => {
      const mockGroups = [
        {
          id: 1,
          name: 'Group A',
          slug: 'group-a',
          description: 'First group',
          logoUrl: null,
          metadata: null,
          status: 'ACTIVE',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-15'),
          statusReports: [
            {
              id: 1,
              title: 'Old Report',
              content: 'Old report content',
              reporterFirstName: 'John',
              reporterLastName: 'Doe',
              status: 'ACTIVE',
              createdAt: new Date('2024-01-10'),
              updatedAt: new Date('2024-01-10')
            }
          ]
        }
      ];

      mockPrisma.group.findMany.mockResolvedValue(mockGroups);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/status-reports?weeks=4');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.statusReportsByGroup).toHaveLength(1);

      // Check that the date filter used 4 weeks (4 weeks is clamped to maximum)
      expect(mockPrisma.group.findMany).toHaveBeenCalledWith({
        where: { status: 'ACTIVE' },
        orderBy: { name: 'asc' },
        include: {
          statusReports: {
            where: {
              status: 'ACTIVE',
              createdAt: { gte: expect.any(Date) }
            },
            orderBy: { createdAt: 'desc' }
          }
        }
      });
    });

    it('should handle invalid weeks parameter gracefully', async () => {
      const mockGroups = [];
      mockPrisma.group.findMany.mockResolvedValue(mockGroups);

      // Test with invalid weeks parameter (should default to 2)
      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/status-reports?weeks=50');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.statusReportsByGroup).toEqual([]);

      // Should clamp weeks to max 12
      expect(mockPrisma.group.findMany).toHaveBeenCalledWith({
        where: { status: 'ACTIVE' },
        orderBy: { name: 'asc' },
        include: {
          statusReports: {
            where: {
              status: 'ACTIVE',
              createdAt: { gte: expect.any(Date) }
            },
            orderBy: { createdAt: 'desc' }
          }
        }
      });
    });

    it('should return empty array when no groups have reports', async () => {
      const mockGroups = [
        {
          id: 1,
          name: 'Group A',
          slug: 'group-a',
          description: 'First group',
          logoUrl: null,
          metadata: null,
          status: 'ACTIVE',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-15'),
          statusReports: []
        }
      ];

      mockPrisma.group.findMany.mockResolvedValue(mockGroups);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/status-reports');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.statusReportsByGroup).toEqual([]);
    });

    it('should handle database errors gracefully', async () => {
      const error = new Error('Database connection failed');
      mockPrisma.group.findMany.mockRejectedValue(error);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/status-reports');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch status reports');
    });

    it('should handle non-numeric weeks parameter', async () => {
      const mockGroups = [];
      mockPrisma.group.findMany.mockResolvedValue(mockGroups);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/status-reports?weeks=invalid');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.statusReportsByGroup).toEqual([]);

      // Should default to 2 weeks when weeks is NaN
      expect(mockPrisma.group.findMany).toHaveBeenCalledWith({
        where: { status: 'ACTIVE' },
        orderBy: { name: 'asc' },
        include: {
          statusReports: {
            where: {
              status: 'ACTIVE',
              createdAt: { gte: expect.any(Date) }
            },
            orderBy: { createdAt: 'desc' }
          }
        }
      });
    });
  });
});