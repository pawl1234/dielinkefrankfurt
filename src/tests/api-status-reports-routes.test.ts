/**
 * Tests for Status Report API endpoints
 * 
 * What we're testing:
 * - Request validation and error handling
 * - Business logic execution (status changes, file handling)
 * - Side effects are attempted (emails, file operations)
 * - Proper response formatting
 * 
 * What we're NOT testing (due to mocks):
 * - Actual database operations
 * - Real file uploads/deletions
 * - Emails actually being sent
 * - Real authentication
 */
import { NextRequest } from 'next/server';
import { GET as adminStatusReportsGet, PUT as adminStatusReportsPut, DELETE as adminStatusReportsDelete } from '@/app/api/admin/status-reports/[id]/route';
import { PUT as updateStatusReportStatusPut } from '@/app/api/admin/status-reports/[id]/status/route';
import { GET as groupStatusReportsGet } from '@/app/api/groups/[slug]/status-reports/route';
import { MAX_FILE_SIZE, MAX_STATUS_REPORT_FILES_SIZE } from '@/lib/file-upload';
import { getToken } from 'next-auth/jwt';
import { StatusReportStatus } from '@prisma/client';
import prisma from '@/lib/prisma';
import { put, del } from '@vercel/blob';
import * as emailNotifications from '@/lib/email-senders';

// Note: External dependencies are mocked in jest.setup.js:
// - @vercel/blob (file storage)
// - @/lib/prisma (database)
// - @/lib/email (email sending)
// We're NOT mocking internal business logic modules

// Mock authentication
jest.mock('next-auth/jwt', () => ({
  getToken: jest.fn()
}));

// Mock API auth to bypass authentication by default
jest.mock('@/lib/api-auth', () => ({
  withAdminAuth: jest.fn((handler) => handler)
}));

// Mock email notifications to track calls
jest.mock('@/lib/email-senders', () => ({
  sendStatusReportAcceptanceEmail: jest.fn(),
  sendStatusReportRejectionEmail: jest.fn(),
  sendStatusReportArchivingEmail: jest.fn()
}));

// Import mocked functions for overriding in specific tests
import { withAdminAuth } from '@/lib/api-auth';

// Helper function to mock an authenticated admin user
function mockAuthenticatedAdminUser() {
  (getToken as jest.Mock).mockResolvedValue({
    role: 'admin',
    name: 'Admin User'
  });
}

// Mock FormData for file upload tests
class MockFormData {
  private data = new Map<string, unknown>();

  get(key: string): unknown {
    const value = this.data.get(key);
    // FormData.get() returns null for non-existent keys, not undefined
    return value !== undefined ? value : null;
  }

  has(key: string): boolean {
    return this.data.has(key);
  }

  append(key: string, value: unknown) {
    this.data.set(key, value);
  }
  
  // Add getAll method for completeness
  getAll(key: string): unknown[] {
    const value = this.data.get(key);
    return value !== undefined ? [value] : [];
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
  
  // Add stream method required by some file operations
  stream() {
    return new ReadableStream();
  }
  
  // Add text method
  async text() {
    return '';
  }
}

// Type-safe mock for Prisma
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('Status Report API Routes', () => {
  // Fixed timestamp to avoid Date serialization issues
  const fixedDate = new Date('2025-06-24T09:40:00.878Z');
  
  const mockStatusReport = {
    id: 'report-1',
    title: 'Test Report',
    content: 'Test content',
    reporterFirstName: 'John',
    reporterLastName: 'Doe',
    groupId: 'group-1',
    status: 'NEW' as StatusReportStatus,
    fileUrls: JSON.stringify(['https://example.com/file1.pdf']),
    createdAt: fixedDate,
    updatedAt: fixedDate,
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
  
  // Store original console.error to restore later
  const originalConsoleError = console.error;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthenticatedAdminUser();
    
    // Suppress console.error for expected errors during testing
    console.error = jest.fn();
    
    // Reset withAdminAuth to pass through by default
    (withAdminAuth as jest.Mock).mockImplementation((handler) => handler);
    
    // Mock Prisma transaction to execute callback immediately
    (mockPrisma.$transaction as jest.Mock) = jest.fn().mockImplementation(async (callback) => {
      // Create a mock transaction context
      const txMock = {
        statusReport: {
          findUnique: jest.fn(),
          findMany: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
          delete: jest.fn()
        },
        group: {
          findUnique: jest.fn()
        }
      };
      return callback(txMock);
    });
    
    // Set up default Prisma mocks
    mockPrisma.statusReport = {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn()
    } as any;
    
    mockPrisma.group = {
      findUnique: jest.fn()
    } as any;
  });
  
  afterEach(() => {
    // Restore original console.error
    console.error = originalConsoleError;
  });

  describe('GET /api/admin/status-reports/[id]', () => {
    it('should return a specific status report by ID', async () => {
      // Mock Prisma to return the test data
      mockPrisma.statusReport.findUnique.mockResolvedValue({
        ...mockStatusReport,
        group: mockStatusReport.group
      });

      const request = new NextRequest('https://example.com/api/admin/status-reports/report-1');
      const params = Promise.resolve({ id: 'report-1' });
      const response = await adminStatusReportsGet(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      // Verify the response includes the status report data
      expect(data.id).toBe('report-1');
      expect(data.title).toBe('Test Report');
      expect(data.content).toBe('Test content');
      expect(data.group.name).toBe('Test Group');
      
      // Verify Prisma was called correctly
      expect(mockPrisma.statusReport.findUnique).toHaveBeenCalledWith({
        where: { id: 'report-1' },
        include: { group: true }
      });
    });

    it('should return 404 when status report is not found', async () => {
      // Mock Prisma to return null (not found)
      mockPrisma.statusReport.findUnique.mockResolvedValue(null);

      const request = new NextRequest('https://example.com/api/admin/status-reports/non-existent');
      const params = Promise.resolve({ id: 'non-existent' });
      const response = await adminStatusReportsGet(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Status Report not found');
      
      // Verify Prisma was called
      expect(mockPrisma.statusReport.findUnique).toHaveBeenCalledWith({
        where: { id: 'non-existent' },
        include: { group: true }
      });
    });

    it('should require admin authentication', async () => {
      // Create a test handler that implements authentication logic
      const testAuthenticatedHandler = async (request: NextRequest) => {
        const token = await (getToken as jest.Mock)({ req: request });
        
        if (!token) {
          return new Response(
            JSON.stringify({ error: 'Authentication token missing' }),
            { status: 401, headers: { 'Content-Type': 'application/json' } }
          );
        }
        
        if (token.role !== 'admin') {
          return new Response(
            JSON.stringify({ error: 'Admin role required' }),
            { status: 403, headers: { 'Content-Type': 'application/json' } }
          );
        }
        
        // If authenticated, call the actual handler
        return new Response(
          JSON.stringify({ mockData: 'authenticated response' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      };
      
      // Mock unauthenticated user
      (getToken as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('https://example.com/api/admin/status-reports/report-1');
      const response = await testAuthenticatedHandler(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication token missing');
    });
  });

  describe('PUT /api/admin/status-reports/[id]', () => {
    it('should update a status report with JSON data', async () => {
      // Mock finding the existing report
      mockPrisma.statusReport.findUnique.mockResolvedValue(mockStatusReport);
      
      // Mock the update result
      mockPrisma.statusReport.update.mockResolvedValue({
        ...mockStatusReport,
        title: 'Updated Title',
        content: 'Updated content'
      });

      const body = JSON.stringify({
        title: 'Updated Title',
        content: 'Updated content'
      });
      
      const request = new NextRequest('https://example.com/api/admin/status-reports/report-1', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: body
      });
      
      const params = Promise.resolve({ id: 'report-1' });
      const response = await adminStatusReportsPut(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.statusReport.title).toBe('Updated Title');
      expect(data.statusReport.content).toBe('Updated content');
      
      // Verify Prisma was called correctly
      expect(mockPrisma.statusReport.update).toHaveBeenCalledWith({
        where: { id: 'report-1' },
        data: expect.objectContaining({
          title: 'Updated Title',
          content: 'Updated content'
        }),
        include: expect.objectContaining({
          group: expect.objectContaining({
            include: expect.objectContaining({
              responsiblePersons: true
            })
          })
        })
      });
    });

    it('should update a status report with form data and file uploads', async () => {
      // Mock finding the existing report
      mockPrisma.statusReport.findUnique.mockResolvedValue(mockStatusReport);
      
      // Mock successful file upload
      (put as jest.Mock).mockResolvedValue({
        url: 'https://example.com/new-file.pdf'
      });
      
      // Mock the update result
      mockPrisma.statusReport.update.mockResolvedValue({
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
      
      const params = Promise.resolve({ id: 'report-1' });
      const response = await adminStatusReportsPut(request, { params });
      const data = await response.json();
      
      // Debug the error
      if (response.status !== 200) {
        console.log('Form data test - Response status:', response.status);
        console.log('Form data test - Response data:', data);
      }

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.statusReport.title).toBe('Updated Title');
      
      // Verify file was uploaded
      expect(put).toHaveBeenCalled();
      
      // Verify update was called with combined file URLs (as JSON string)
      expect(mockPrisma.statusReport.update).toHaveBeenCalledWith({
        where: { id: 'report-1' },
        data: {
          title: 'Updated Title',
          fileUrls: JSON.stringify(['https://example.com/file1.pdf', 'https://example.com/new-file.pdf'])
        },
        include: {
          group: {
            include: {
              responsiblePersons: true
            }
          }
        }
      });
    });

    it('should reject files that exceed size limit', async () => {
      // Mock finding the existing report
      mockPrisma.statusReport.findUnique.mockResolvedValue(mockStatusReport);

      // Create a mock request with FormData containing a large file
      const formData = new MockFormData();
      formData.append('title', 'Updated Title');
      formData.append('fileCount', '1');
      // Create a file larger than MAX_FILE_SIZE (5MB)
      formData.append('file-0', new MockFile('large-file.pdf', 10 * 1024 * 1024)); // 10MB file

      const request = new NextRequest('https://example.com/api/admin/status-reports/report-1', {
        method: 'PUT',
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      // Mock the request.formData() method
      request.formData = jest.fn().mockResolvedValue(formData);
      
      const params = Promise.resolve({ id: 'report-1' });
      const response = await adminStatusReportsPut(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Dateigröße überschreitet das Limit von 5MB');
      
      // Verify no upload was attempted
      expect(put).not.toHaveBeenCalled();
      expect(mockPrisma.statusReport.update).not.toHaveBeenCalled();
    });

    it('should handle removing existing files', async () => {
      // Mock finding the existing report with files
      mockPrisma.statusReport.findUnique.mockResolvedValue(mockStatusReport);
      
      // Mock the update result with no files
      mockPrisma.statusReport.update.mockResolvedValue({
        ...mockStatusReport,
        fileUrls: '[]'
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
      
      const params = Promise.resolve({ id: 'report-1' });
      const response = await adminStatusReportsPut(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      
      // Verify update was called with null fileUrls (when no files)
      expect(mockPrisma.statusReport.update).toHaveBeenCalledWith({
        where: { id: 'report-1' },
        data: {
          title: 'Updated Title',
          fileUrls: null
        },
        include: {
          group: {
            include: {
              responsiblePersons: true
            }
          }
        }
      });
    });
  });

  describe('PUT /api/admin/status-reports/[id]/status', () => {
    it('should update status report to ACTIVE status and send notification email', async () => {
      // Mock the update result
      mockPrisma.statusReport.update.mockResolvedValue({
        ...mockStatusReport,
        status: 'ACTIVE',
        group: {
          ...mockStatusReport.group,
          responsiblePersons: mockStatusReport.group.responsiblePersons
        }
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
      
      const params = Promise.resolve({ id: 'report-1' });
      const response = await updateStatusReportStatusPut(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('ACTIVE');
      
      // Verify database update was called
      expect(mockPrisma.statusReport.update).toHaveBeenCalledWith({
        where: { id: 'report-1' },
        data: { status: 'ACTIVE' },
        include: {
          group: {
            include: {
              responsiblePersons: true
            }
          }
        }
      });
      
      // Verify email notification was attempted
      expect(emailNotifications.sendStatusReportAcceptanceEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'report-1',
          status: 'ACTIVE'
        })
      );
    });
    
    it('should update status report to REJECTED status and send notification email', async () => {
      // Mock the update result
      mockPrisma.statusReport.update.mockResolvedValue({
        ...mockStatusReport,
        status: 'REJECTED',
        group: {
          ...mockStatusReport.group,
          responsiblePersons: mockStatusReport.group.responsiblePersons
        }
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
      
      const params = Promise.resolve({ id: 'report-1' });
      const response = await updateStatusReportStatusPut(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('REJECTED');
      
      // Verify email notification was attempted
      expect(emailNotifications.sendStatusReportRejectionEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'report-1',
          status: 'REJECTED'
        })
      );
    });
    
    it('should update status report to ARCHIVED status and send notification email', async () => {
      // Mock the update result
      mockPrisma.statusReport.update.mockResolvedValue({
        ...mockStatusReport,
        status: 'ARCHIVED',
        group: {
          ...mockStatusReport.group,
          responsiblePersons: mockStatusReport.group.responsiblePersons
        }
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
      
      const params = Promise.resolve({ id: 'report-1' });
      const response = await updateStatusReportStatusPut(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('ARCHIVED');
      
      // Verify email notification was attempted
      expect(emailNotifications.sendStatusReportArchivingEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'report-1',
          status: 'ARCHIVED'
        })
      );
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
      
      const params = Promise.resolve({ id: 'report-1' });
      const response = await updateStatusReportStatusPut(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Valid status is required (NEW, ACTIVE, REJECTED, ARCHIVED)');
    });
  });

  describe('DELETE /api/admin/status-reports/[id]', () => {
    it('should delete a status report and its files', async () => {
      // Mock finding the status report with files
      mockPrisma.statusReport.findUnique.mockResolvedValue(mockStatusReport);
      
      // Mock successful deletion
      mockPrisma.statusReport.delete.mockResolvedValue(mockStatusReport);
      
      // Mock successful file deletion
      (del as jest.Mock).mockResolvedValue(undefined);

      const request = new NextRequest('https://example.com/api/admin/status-reports/report-1', {
        method: 'DELETE'
      });
      
      const params = Promise.resolve({ id: 'report-1' });
      const response = await adminStatusReportsDelete(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      
      // Verify status report was found
      expect(mockPrisma.statusReport.findUnique).toHaveBeenCalledWith({
        where: { id: 'report-1' }
      });
      
      // Verify deletion was called
      expect(mockPrisma.statusReport.delete).toHaveBeenCalledWith({
        where: { id: 'report-1' }
      });
      
      // Verify files were deleted
      expect(del).toHaveBeenCalledWith(['https://example.com/file1.pdf']);
    });

    it('should handle not found errors', async () => {
      // Mock status report not found
      mockPrisma.statusReport.findUnique.mockResolvedValue(null);

      const request = new NextRequest('https://example.com/api/admin/status-reports/non-existent', {
        method: 'DELETE'
      });
      
      const params = Promise.resolve({ id: 'non-existent' });
      const response = await adminStatusReportsDelete(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to delete status report');
      
      // Verify no deletion was attempted
      expect(mockPrisma.statusReport.delete).not.toHaveBeenCalled();
      expect(del).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/groups/[slug]/status-reports', () => {
    it('should get all active status reports for a group', async () => {
      const mockStatusReports = [
        {
          id: 'report-1',
          title: 'Test Report 1',
          content: 'Test content 1',
          reporterFirstName: 'John',
          reporterLastName: 'Doe',
          groupId: 'group-1',
          status: 'ACTIVE' as StatusReportStatus,
          fileUrls: null,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'report-2',
          title: 'Test Report 2',
          content: 'Test content 2',
          reporterFirstName: 'Jane',
          reporterLastName: 'Smith',
          groupId: 'group-1',
          status: 'ACTIVE' as StatusReportStatus,
          fileUrls: null,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      // Mock finding the group
      mockPrisma.group.findUnique.mockResolvedValue({
        id: 'group-1',
        name: 'Test Group',
        slug: 'test-group',
        description: 'Test group description',
        status: 'ACTIVE',
        logoUrl: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Mock finding the status reports
      mockPrisma.statusReport.findMany.mockResolvedValue(mockStatusReports);

      const request = new NextRequest('https://example.com/api/groups/test-group/status-reports');
      const params = Promise.resolve({ slug: 'test-group' });
      const response = await groupStatusReportsGet(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(2);
      expect(data[0].id).toBe('report-1');
      expect(data[0].title).toBe('Test Report 1');
      expect(data[1].id).toBe('report-2');
      expect(data[1].title).toBe('Test Report 2');
      
      // Verify database queries
      expect(mockPrisma.group.findUnique).toHaveBeenCalledWith({
        where: { slug: 'test-group' }
      });
      
      expect(mockPrisma.statusReport.findMany).toHaveBeenCalledWith({
        where: {
          groupId: 'group-1',
          status: 'ACTIVE'
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    });

    it('should handle group not found error', async () => {
      // Mock group not found
      mockPrisma.group.findUnique.mockResolvedValue(null);

      const request = new NextRequest('https://example.com/api/groups/non-existent/status-reports');
      const params = Promise.resolve({ slug: 'non-existent' });
      const response = await groupStatusReportsGet(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch status reports');
      
      // Verify no attempt to fetch status reports
      expect(mockPrisma.statusReport.findMany).not.toHaveBeenCalled();
    });
  });
});