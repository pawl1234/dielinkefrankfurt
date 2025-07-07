import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/status-reports/submit/route';

// Mock only external dependencies
jest.mock('@vercel/blob');
jest.mock('@/lib/prisma');
jest.mock('@/lib/email');
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

// Import after mocks are set up
import prisma from '@/lib/prisma';

const mockPrisma = jest.mocked(prisma);

describe('Status Report Submission Workflow', () => {
  const activeGroup = {
    id: 'active-group-id',
    name: 'Active Test Group',
    slug: 'active-test-group',
    status: 'ACTIVE',
    responsiblePersons: [
      {
        id: 'person-1',
        firstName: 'Anna',
        lastName: 'Schmidt',
        email: 'anna.schmidt@example.com',
        groupId: 'active-group-id'
      }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful database operations
    mockPrisma.group.findUnique.mockResolvedValue(activeGroup);
    mockPrisma.statusReport.create.mockImplementation(({ data }) => 
      Promise.resolve({
        id: 'new-report-id',
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      })
    );
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  async function submitStatusReport(data: any) {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      formData.append(key, String(value));
    });

    const request = new NextRequest('http://localhost:3000/api/status-reports/submit', {
      method: 'POST',
      body: formData
    });

    return await POST(request);
  }

  describe('Critical Business Logic', () => {
    it('should create status report for active group', async () => {
      const response = await submitStatusReport({
        groupId: activeGroup.id,
        title: 'Monthly Report',
        content: '<p>Our activities this month</p>',
        reporterFirstName: 'Maria',
        reporterLastName: 'Weber',
        fileCount: '0'
      });

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.statusReport.id).toBeDefined();

      // Verify database call
      expect(mockPrisma.statusReport.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'Monthly Report',
          content: '<p>Our activities this month</p>',
          groupId: activeGroup.id,
          reporterFirstName: 'Maria',
          reporterLastName: 'Weber',
          status: 'NEW'
        })
      });
    });

    it('should reject submissions for non-active groups', async () => {
      mockPrisma.group.findUnique.mockResolvedValue(null);

      const response = await submitStatusReport({
        groupId: 'non-existent-group',
        title: 'Test Report',
        content: '<p>Content</p>',
        reporterFirstName: 'Test',
        reporterLastName: 'User',
        fileCount: '0'
      });

      expect(response.status).toBe(404);
      
      const error = await response.json();
      expect(error.error).toContain('Group not found or not active');
      
      // Verify no report created
      expect(mockPrisma.statusReport.create).not.toHaveBeenCalled();
    });

    it('should validate required fields', async () => {
      const response = await submitStatusReport({
        groupId: activeGroup.id,
        title: '', // Missing title
        content: '<p>Content</p>',
        reporterFirstName: 'Test',
        reporterLastName: 'User',
        fileCount: '0'
      });

      expect(response.status).toBe(400);
      
      const error = await response.json();
      expect(error.error).toContain('required');
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.statusReport.create.mockRejectedValue(new Error('Database error'));

      const response = await submitStatusReport({
        groupId: activeGroup.id,
        title: 'Test Report',
        content: '<p>Content</p>',
        reporterFirstName: 'Test',
        reporterLastName: 'User',
        fileCount: '0'
      });

      expect(response.status).toBe(500);
    });

    it('should handle multiple content types', async () => {
      const richContent = `
        <h2>Aktivitätsbericht</h2>
        <p>In diesem Monat haben wir <strong>wichtige Meilensteine</strong> erreicht:</p>
        <ol>
          <li>Demonstration mit <em>über 500 Teilnehmern</em></li>
          <li>Pressemitteilung in lokalen Medien</li>
        </ol>
      `;

      const response = await submitStatusReport({
        groupId: activeGroup.id,
        title: 'Rich Content Report',
        content: richContent,
        reporterFirstName: 'Test',
        reporterLastName: 'User',
        fileCount: '0'
      });

      expect(response.status).toBe(200);
      
      // Verify content is preserved
      expect(mockPrisma.statusReport.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          content: expect.stringContaining('<h2>Aktivitätsbericht</h2>')
        })
      });
    });
  });

  describe('Database Integration', () => {
    it('should check group exists and is active', async () => {
      await submitStatusReport({
        groupId: 'test-group-id',
        title: 'Test Report',
        content: '<p>Content</p>',
        reporterFirstName: 'Test',
        reporterLastName: 'User',
        fileCount: '0'
      });

      expect(mockPrisma.group.findUnique).toHaveBeenCalledWith({
        where: {
          id: 'test-group-id'
        }
      });
    });

    it('should store report with correct initial status', async () => {
      await submitStatusReport({
        groupId: activeGroup.id,
        title: 'Test Report',
        content: '<p>Content</p>',
        reporterFirstName: 'Test',
        reporterLastName: 'User',
        fileCount: '0'
      });

      expect(mockPrisma.statusReport.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'NEW',
          groupId: activeGroup.id
        })
      });
    });

    it('should handle archived group status correctly', async () => {
      const archivedGroup = { ...activeGroup, status: 'ARCHIVED' };
      mockPrisma.group.findUnique.mockResolvedValue(archivedGroup);

      const response = await submitStatusReport({
        groupId: activeGroup.id,
        title: 'Test Report',
        content: '<p>Content</p>',
        reporterFirstName: 'Test',
        reporterLastName: 'User',
        fileCount: '0'
      });

      // Should reject non-active groups
      expect(response.status).toBe(404);
      expect(mockPrisma.statusReport.create).not.toHaveBeenCalled();
    });
  });
});