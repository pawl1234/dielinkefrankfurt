import { NextRequest } from 'next/server';
import { GET as adminStatusReportsGet, PUT as adminStatusReportsPut, DELETE as adminStatusReportsDelete } from '@/app/api/admin/status-reports/[id]/route';
import { PUT as updateStatusReportStatusPut } from '@/app/api/admin/status-reports/[id]/status/route';
import { GET as groupStatusReportsGet } from '@/app/api/groups/[slug]/status-reports/route';
import * as groupHandlers from '@/lib/group-handlers';
import * as fileUpload from '@/lib/file-upload';
import { getToken } from 'next-auth/jwt';
import { StatusReportStatus } from '@prisma/client';

// Mock dependencies
jest.mock('@/lib/group-handlers');
jest.mock('@/lib/file-upload');
jest.mock('next-auth/jwt', () => ({
  getToken: jest.fn()
}));

// Helper function to mock an authenticated admin user
function mockAuthenticatedAdminUser() {
  (getToken as jest.Mock).mockResolvedValue({
    role: 'admin',
    name: 'Admin User'
  });
}

// Mock FormData for file upload tests
class MockFormData {
  private data = new Map<string, any>();

  get(key: string): any {
    return this.data.get(key);
  }

  has(key: string): boolean {
    return this.data.has(key);
  }

  append(key: string, value: any) {
    this.data.set(key, value);
  }
}

// Mock File for file upload tests
class MockFile {
  constructor(
    public name: string,
    public size: number = 1024,
    public type: string = 'application/pdf',
    public arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(1024))
  ) {}
}

describe('Status Report API Routes', () => {
  const mockStatusReport = {
    id: 'report-1',
    title: 'Test Report',
    content: 'Test content',
    reporterFirstName: 'John',
    reporterLastName: 'Doe',
    groupId: 'group-1',
    status: 'NEW' as StatusReportStatus,
    fileUrls: JSON.stringify(['https://example.com/file1.pdf']),
    createdAt: new Date(),
    updatedAt: new Date(),
    group: {
      id: 'group-1',
      name: 'Test Group',
      slug: 'test-group',
      responsiblePersons: [
        {
          id: 'person-1',
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
          groupId: 'group-1'
        }
      ]
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthenticatedAdminUser();
  });

  describe('GET /api/admin/status-reports/[id]', () => {
    it('should return a specific status report by ID', async () => {
      (groupHandlers.getStatusReportById as jest.Mock).mockResolvedValue(mockStatusReport);

      const request = new NextRequest('https://example.com/api/admin/status-reports/report-1');
      const params = { id: 'report-1' };
      const response = await adminStatusReportsGet(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockStatusReport);
      expect(groupHandlers.getStatusReportById).toHaveBeenCalledWith('report-1');
    });

    it('should return 404 when status report is not found', async () => {
      (groupHandlers.getStatusReportById as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('https://example.com/api/admin/status-reports/non-existent');
      const params = { id: 'non-existent' };
      const response = await adminStatusReportsGet(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Status Report not found');
    });

    it('should require admin authentication', async () => {
      // Mock unauthenticated user
      (getToken as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('https://example.com/api/admin/status-reports/report-1');
      const params = { id: 'report-1' };
      const response = await adminStatusReportsGet(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('PUT /api/admin/status-reports/[id]', () => {
    it('should update a status report with JSON data', async () => {
      (groupHandlers.getStatusReportById as jest.Mock).mockResolvedValue(mockStatusReport);
      (groupHandlers.updateStatusReport as jest.Mock).mockResolvedValue({
        ...mockStatusReport,
        title: 'Updated Title',
        content: 'Updated content'
      });

      const request = new NextRequest('https://example.com/api/admin/status-reports/report-1', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: 'Updated Title',
          content: 'Updated content'
        })
      });
      
      const params = { id: 'report-1' };
      const response = await adminStatusReportsPut(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.statusReport.title).toBe('Updated Title');
      expect(data.statusReport.content).toBe('Updated content');
      expect(groupHandlers.updateStatusReport).toHaveBeenCalledWith({
        id: 'report-1',
        title: 'Updated Title',
        content: 'Updated content'
      });
    });

    it('should update a status report with form data and file uploads', async () => {
      (groupHandlers.getStatusReportById as jest.Mock).mockResolvedValue(mockStatusReport);
      (fileUpload.uploadStatusReportFiles as jest.Mock).mockResolvedValue([
        'https://example.com/new-file.pdf'
      ]);
      (groupHandlers.updateStatusReport as jest.Mock).mockResolvedValue({
        ...mockStatusReport,
        title: 'Updated Title',
        fileUrls: JSON.stringify([
          'https://example.com/file1.pdf',
          'https://example.com/new-file.pdf'
        ])
      });

      // Create a mock request with FormData
      const formData = new MockFormData();
      formData.append('title', 'Updated Title');
      formData.append('fileCount', '1');
      formData.append('file-0', new MockFile('new-file.pdf'));
      formData.append('retainExistingFiles', 'true');

      const request = new NextRequest('https://example.com/api/admin/status-reports/report-1', {
        method: 'PUT',
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      // Mock the request.formData() method
      request.formData = jest.fn().mockResolvedValue(formData);
      
      const params = { id: 'report-1' };
      const response = await adminStatusReportsPut(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(fileUpload.uploadStatusReportFiles).toHaveBeenCalled();
      expect(groupHandlers.updateStatusReport).toHaveBeenCalled();
      expect(groupHandlers.updateStatusReport).toHaveBeenCalledWith(expect.objectContaining({
        id: 'report-1',
        title: 'Updated Title',
        fileUrls: expect.arrayContaining([
          'https://example.com/file1.pdf',
          'https://example.com/new-file.pdf'
        ])
      }));
    });

    it('should handle file upload errors', async () => {
      (groupHandlers.getStatusReportById as jest.Mock).mockResolvedValue(mockStatusReport);
      (fileUpload.uploadStatusReportFiles as jest.Mock).mockRejectedValue(
        new fileUpload.FileUploadError('File too large', 400)
      );

      // Create a mock request with FormData
      const formData = new MockFormData();
      formData.append('title', 'Updated Title');
      formData.append('fileCount', '1');
      formData.append('file-0', new MockFile('large-file.pdf', 10 * 1024 * 1024)); // 10MB file

      const request = new NextRequest('https://example.com/api/admin/status-reports/report-1', {
        method: 'PUT',
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      // Mock the request.formData() method
      request.formData = jest.fn().mockResolvedValue(formData);
      
      const params = { id: 'report-1' };
      const response = await adminStatusReportsPut(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('File too large');
    });

    it('should handle removing existing files', async () => {
      (groupHandlers.getStatusReportById as jest.Mock).mockResolvedValue(mockStatusReport);
      (fileUpload.deleteFiles as jest.Mock).mockResolvedValue({ success: true });
      (groupHandlers.updateStatusReport as jest.Mock).mockResolvedValue({
        ...mockStatusReport,
        fileUrls: null
      });

      // Create a mock request with FormData
      const formData = new MockFormData();
      formData.append('title', 'Updated Title');
      formData.append('fileCount', '0');
      formData.append('retainExistingFiles', 'false');

      const request = new NextRequest('https://example.com/api/admin/status-reports/report-1', {
        method: 'PUT',
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      // Mock the request.formData() method
      request.formData = jest.fn().mockResolvedValue(formData);
      
      const params = { id: 'report-1' };
      const response = await adminStatusReportsPut(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(groupHandlers.updateStatusReport).toHaveBeenCalledWith(expect.objectContaining({
        id: 'report-1',
        title: 'Updated Title',
        fileUrls: []
      }));
    });
  });

  describe('PUT /api/admin/status-reports/[id]/status', () => {
    it('should update status report to ACTIVE status', async () => {
      (groupHandlers.updateStatusReportStatus as jest.Mock).mockResolvedValue({
        ...mockStatusReport,
        status: 'ACTIVE'
      });

      const request = new NextRequest('https://example.com/api/admin/status-reports/report-1/status', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'ACTIVE'
        })
      });
      
      const params = { id: 'report-1' };
      const response = await updateStatusReportStatusPut(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('ACTIVE');
      expect(groupHandlers.updateStatusReportStatus).toHaveBeenCalledWith('report-1', 'ACTIVE');
    });
    
    it('should update status report to REJECTED status', async () => {
      (groupHandlers.updateStatusReportStatus as jest.Mock).mockResolvedValue({
        ...mockStatusReport,
        status: 'REJECTED'
      });

      const request = new NextRequest('https://example.com/api/admin/status-reports/report-1/status', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'REJECTED'
        })
      });
      
      const params = { id: 'report-1' };
      const response = await updateStatusReportStatusPut(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('REJECTED');
      expect(groupHandlers.updateStatusReportStatus).toHaveBeenCalledWith('report-1', 'REJECTED');
    });
    
    it('should update status report to ARCHIVED status', async () => {
      (groupHandlers.updateStatusReportStatus as jest.Mock).mockResolvedValue({
        ...mockStatusReport,
        status: 'ARCHIVED'
      });

      const request = new NextRequest('https://example.com/api/admin/status-reports/report-1/status', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'ARCHIVED'
        })
      });
      
      const params = { id: 'report-1' };
      const response = await updateStatusReportStatusPut(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('ARCHIVED');
      expect(groupHandlers.updateStatusReportStatus).toHaveBeenCalledWith('report-1', 'ARCHIVED');
    });

    it('should validate status value', async () => {
      const request = new NextRequest('https://example.com/api/admin/status-reports/report-1/status', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'INVALID_STATUS'
        })
      });
      
      const params = { id: 'report-1' };
      const response = await updateStatusReportStatusPut(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Valid status is required (NEW, ACTIVE, REJECTED, ARCHIVED)');
    });
  });

  describe('DELETE /api/admin/status-reports/[id]', () => {
    it('should delete a status report', async () => {
      (groupHandlers.deleteStatusReport as jest.Mock).mockResolvedValue(true);

      const request = new NextRequest('https://example.com/api/admin/status-reports/report-1', {
        method: 'DELETE'
      });
      
      const params = { id: 'report-1' };
      const response = await adminStatusReportsDelete(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(groupHandlers.deleteStatusReport).toHaveBeenCalledWith('report-1');
    });

    it('should handle not found errors', async () => {
      (groupHandlers.deleteStatusReport as jest.Mock).mockRejectedValue(
        new Error('Status report with ID non-existent not found')
      );

      const request = new NextRequest('https://example.com/api/admin/status-reports/non-existent', {
        method: 'DELETE'
      });
      
      const params = { id: 'non-existent' };
      const response = await adminStatusReportsDelete(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Status Report not found');
    });
  });

  describe('GET /api/groups/[slug]/status-reports', () => {
    it('should get all active status reports for a group', async () => {
      const mockStatusReports = [
        {
          id: 'report-1',
          title: 'Test Report 1',
          content: 'Test content 1',
          createdAt: new Date(),
          status: 'ACTIVE'
        },
        {
          id: 'report-2',
          title: 'Test Report 2',
          content: 'Test content 2',
          createdAt: new Date(),
          status: 'ACTIVE'
        }
      ];

      (groupHandlers.getStatusReportsByGroupSlug as jest.Mock).mockResolvedValue(mockStatusReports);

      const request = new NextRequest('https://example.com/api/groups/test-group/status-reports');
      const params = { slug: 'test-group' };
      const response = await groupStatusReportsGet(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockStatusReports);
      expect(groupHandlers.getStatusReportsByGroupSlug).toHaveBeenCalledWith('test-group');
    });

    it('should handle group not found error', async () => {
      (groupHandlers.getStatusReportsByGroupSlug as jest.Mock).mockRejectedValue(
        new Error('Group with slug non-existent not found')
      );

      const request = new NextRequest('https://example.com/api/groups/non-existent/status-reports');
      const params = { slug: 'non-existent' };
      const response = await groupStatusReportsGet(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch status reports');
    });
  });
});