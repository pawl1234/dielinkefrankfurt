/**
 * Status Report Integration Tests
 * 
 * Focus: Test only the most critical status report functionality with minimal mocking
 * This replaces the overly complex "E2E" test that was actually mocking business logic
 * 
 * We mock only external dependencies (database, email, file storage)
 */
import { NextRequest } from 'next/server';
import { POST as statusReportSubmitPost } from '@/app/api/status-reports/submit/route';
import prisma from '@/lib/prisma';

// Mock only external dependencies
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('Status Report Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Status Report Submission', () => {
    it('should successfully submit a status report', async () => {
      const mockGroup = {
        id: 'test-group-123',
        name: 'Test Community Group',
        slug: 'test-community-group',
        status: 'ACTIVE',
        description: 'Test group',
        logoUrl: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockStatusReport = {
        id: 'test-report-123',
        title: 'Test Report',
        content: '<p>Test content</p>',
        reporterFirstName: 'John',
        reporterLastName: 'Doe',
        groupId: mockGroup.id,
        status: 'NEW',
        fileUrls: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Mock group lookup
      mockPrisma.group.findUnique.mockResolvedValue(mockGroup);
      
      // Mock status report creation
      mockPrisma.statusReport.create.mockResolvedValue(mockStatusReport);

      const formData = new FormData();
      formData.append('title', 'Test Report');
      formData.append('content', '<p>Test content</p>');
      formData.append('reporterFirstName', 'John');
      formData.append('reporterLastName', 'Doe');
      formData.append('groupId', mockGroup.id);

      const request = new NextRequest('http://localhost:3000/api/status-reports/submit', {
        method: 'POST',
        body: formData
      });

      const response = await statusReportSubmitPost(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.statusReport.title).toBe('Test Report');
    });

    it('should reject status reports for non-existent groups', async () => {
      // Mock group not found
      mockPrisma.group.findUnique.mockResolvedValue(null);

      const formData = new FormData();
      formData.append('title', 'Test Report');
      formData.append('content', '<p>Test content</p>');
      formData.append('reporterFirstName', 'John');
      formData.append('reporterLastName', 'Doe');
      formData.append('groupId', 'non-existent-group');

      const request = new NextRequest('http://localhost:3000/api/status-reports/submit', {
        method: 'POST',
        body: formData
      });

      const response = await statusReportSubmitPost(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('Group not found');
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.group.findUnique.mockRejectedValue(new Error('Database connection failed'));

      const formData = new FormData();
      formData.append('title', 'Test Report');
      formData.append('content', '<p>Test content</p>');
      formData.append('reporterFirstName', 'John');
      formData.append('reporterLastName', 'Doe');
      formData.append('groupId', 'test-group-123');

      const request = new NextRequest('http://localhost:3000/api/status-reports/submit', {
        method: 'POST',
        body: formData
      });

      const response = await statusReportSubmitPost(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to submit status report');
    });
  });
});