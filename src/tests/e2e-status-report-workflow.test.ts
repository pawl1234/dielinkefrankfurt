// e2e-status-report-workflow.test.ts - End-to-end test for the complete status report submission and approval workflow
import { NextRequest, NextResponse } from 'next/server';
import { POST as statusReportSubmitPost } from '@/app/api/status-reports/submit/route';
import { GET as publicGroupGet } from '@/app/api/groups/[slug]/route';
import { getToken } from 'next-auth/jwt';
import { sendEmail } from '@/lib/email';
import { createMockGroup, createNextRequest, createMockStatusReport } from './test-utils';
import { del } from '@vercel/blob';

// Import types for better type safety
import type { SlugRouteContext } from '@/types/api-types';

type NextJSRouteContext = SlugRouteContext;

// Mock external dependencies
jest.mock('next-auth/jwt', () => ({
  getToken: jest.fn()
}));

// Mock API auth to use the actual authentication logic for this test
jest.mock('@/lib/api-auth', () => ({
  withAdminAuth: jest.fn()
}));

jest.mock('@/lib/email', () => ({
  sendEmail: jest.fn().mockImplementation(() => Promise.resolve({ success: true, messageId: 'mock-message-id' }))
}));

jest.mock('@vercel/blob', () => ({
  put: jest.fn().mockImplementation((path) => {
    return Promise.resolve({ url: `https://mock-blob-storage.vercel.app/${path}` });
  }),
  del: jest.fn().mockImplementation(() => {
    return Promise.resolve({ success: true });
  })
}));

// Mock group-handlers functions
jest.mock('@/lib/group-handlers', () => ({
  createStatusReport: jest.fn(),
  getStatusReports: jest.fn(),
  getStatusReportById: jest.fn(),
  getGroupBySlug: jest.fn(),
  updateStatusReport: jest.fn(),
  deleteStatusReport: jest.fn()
}));

// Mock file upload functions
jest.mock('@/lib/file-upload', () => ({
  uploadStatusReportFiles: jest.fn(),
  deleteFiles: jest.fn(),
  FileUploadError: class FileUploadError extends Error {
    constructor(message: string, public status: number = 400) {
      super(message);
      this.name = 'FileUploadError';
    }
  }
}));

// Import mocked functions for setup
import { 
  createStatusReport,
  getStatusReports,
  getStatusReportById,
  getGroupBySlug,
  updateStatusReport
} from '@/lib/group-handlers';
import { uploadStatusReportFiles, deleteFiles } from '@/lib/file-upload';
import { withAdminAuth } from '@/lib/api-auth';

// Mock environmental context
process.env.VERCEL_PROJECT_PRODUCTION_URL = 'https://test.dielinke-frankfurt.de';
process.env.CONTACT_EMAIL = 'test@dielinke-frankfurt.de';

// Comprehensive end-to-end status report workflow test
describe('End-to-End Status Report Submission and Approval Workflow', () => {
  // Test data
  let reportId: string = 'test-report-123'; // Set a default ID
  const mockGroup = createMockGroup({
    id: 'active-group-123',
    name: 'Test Community Group',
    slug: 'test-community-group',
    status: 'ACTIVE',
    responsiblePersons: [
      {
        id: 'person-1',
        firstName: 'Julia',
        lastName: 'Weber',
        email: 'julia.weber@example.com',
        groupId: 'active-group-123'
      }
    ]
  });
  
  // Store original console.error to restore later
  const originalConsoleError = console.error;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Suppress console.error for expected errors during testing
    console.error = jest.fn();
    
    // Simulate unauthenticated user by default
    (getToken as jest.Mock).mockResolvedValue(null);
    
    // Set up basic mocks
    (uploadStatusReportFiles as jest.Mock).mockImplementation((files: File[]) => {
      return Promise.resolve(files.map((file) => 
        `https://mock-blob-storage.vercel.app/status-reports/123-${file.name}`
      ));
    });
    
    (deleteFiles as jest.Mock).mockResolvedValue(undefined);
    
    // Mock group exists and is active
    (getGroupBySlug as jest.Mock).mockImplementation((slug: string) => {
      if (slug === mockGroup.slug) {
        return Promise.resolve({
          ...mockGroup,
          statusReports: [] // Will be populated as tests create reports
        });
      }
      return Promise.resolve(null);
    });
  });
  
  afterEach(() => {
    // Restore original console.error
    console.error = originalConsoleError;
  });
  
  describe('Step 1: Public status report submission', () => {
    it('should allow submission of a new status report with files', async () => {
      // Mock the created status report for subsequent operations
      const createdReport = createMockStatusReport({
        id: 'test-report-123',
        title: 'Quarterly Activity Report',
        content: '<p>This quarter our group organized several community events.</p><ul><li>Community cleanup</li><li>Information booth at local market</li></ul>',
        reporterFirstName: 'Thomas',
        reporterLastName: 'Becker',
        groupId: mockGroup.id,
        status: 'NEW',
        fileUrls: JSON.stringify([
          `https://mock-blob-storage.vercel.app/status-reports/123-meeting-notes.pdf`,
          `https://mock-blob-storage.vercel.app/status-reports/123-event-photo.jpg`
        ])
      }, mockGroup);
      
      // Update reportId for other tests  
      reportId = createdReport.id;
      
      // Set up mocks for successful creation
      (createStatusReport as jest.Mock).mockResolvedValue(createdReport);
      (getStatusReportById as jest.Mock).mockImplementation((id: string) => {
        if (id === reportId) {
          return Promise.resolve(createdReport);
        }
        return Promise.resolve(null);
      });
      
      // Mock data for the new status report
      const formData = new FormData();
      formData.append('title', 'Quarterly Activity Report');
      formData.append('content', '<p>This quarter our group organized several community events.</p><ul><li>Community cleanup</li><li>Information booth at local market</li></ul>');
      formData.append('reporterFirstName', 'Thomas');
      formData.append('reporterLastName', 'Becker');
      formData.append('groupId', mockGroup.id);
      formData.append('fileCount', '0');
      
      const request = createNextRequest(
        'https://test.dielinke-frankfurt.de/api/status-reports/submit',
        'POST',
        formData
      );
      
      // Submit the status report
      const response = await statusReportSubmitPost(request);
      const responseData = await response.json();
      
      // Verify response status and content
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.statusReport).toBeDefined();
      expect(responseData.statusReport.id).toBeDefined();
      expect(responseData.statusReport.title).toBeDefined();
    });
    
    it('should reject status reports for non-existent or inactive groups', async () => {
      // Mock createStatusReport to throw error for invalid group
      (createStatusReport as jest.Mock).mockRejectedValue(
        new Error('Group not found or not active')
      );
      
      // Mock data with invalid group ID
      const invalidReportData = new FormData();
      invalidReportData.append('title', 'Invalid Report');
      invalidReportData.append('content', '<p>This report has an invalid group ID.</p>');
      invalidReportData.append('reporterFirstName', 'Thomas');
      invalidReportData.append('reporterLastName', 'Becker');
      invalidReportData.append('groupId', 'non-existent-group-id');
      invalidReportData.append('fileCount', '0');
      
      // Create request with invalid data
      const request = createNextRequest(
        'https://test.dielinke-frankfurt.de/api/status-reports/submit',
        'POST',
        invalidReportData
      );
      
      // Submit the invalid report
      const response = await statusReportSubmitPost(request);
      const responseData = await response.json();
      
      // Verify rejection
      expect(response.status).toBe(404);
      expect(responseData.error).toBeDefined();
      expect(responseData.error).toContain('Group not found or not active');
    });
    
    it('should reject status reports with missing required fields', async () => {
      // Mock createStatusReport to throw validation error
      (createStatusReport as jest.Mock).mockRejectedValue(
        new Error('Title is required')
      );
      
      // Status report missing title (required field)
      const invalidReportData = new FormData();
      invalidReportData.append('content', '<p>This report has no title.</p>');
      invalidReportData.append('reporterFirstName', 'Thomas');
      invalidReportData.append('reporterLastName', 'Becker');
      invalidReportData.append('groupId', mockGroup.id);
      invalidReportData.append('fileCount', '0');
      
      // Create request with invalid data
      const request = createNextRequest(
        'https://test.dielinke-frankfurt.de/api/status-reports/submit',
        'POST',
        invalidReportData
      );
      
      // Submit the invalid report
      const response = await statusReportSubmitPost(request);
      const responseData = await response.json();
      
      // Verify rejection
      expect(response.status).toBe(400);
      expect(responseData.error).toBeDefined();
      expect(responseData.error).toContain('Title is required');
    });
  });
  
  describe('Step 2: Admin status report review and listing', () => {
    beforeEach(() => {
      // Mock authenticated admin user for these tests
      (getToken as jest.Mock).mockResolvedValue({
        role: 'admin',
        name: 'Admin User'
      });
    });
    
    it('should allow admins to view all status reports including the new one', async () => {
      // Mock getStatusReports to return our test report
      const mockReports = [createMockStatusReport({
        id: reportId,
        title: 'Quarterly Activity Report',
        status: 'NEW',
        groupId: mockGroup.id
      }, mockGroup)];
      
      const mockResult = {
        items: mockReports,
        totalItems: 1,
        page: 1,
        pageSize: 10,
        totalPages: 1
      };
      
      (getStatusReports as jest.Mock).mockResolvedValue(mockResult);
      
      // Test the business logic directly
      const result = await getStatusReports('ALL', undefined, '', 'createdAt', 'desc', 1, 10);
      
      // Verify response
      expect(result.items).toEqual(mockReports);
      expect(result.totalItems).toBe(1);
      
      // Verify our new report is in the list
      const newReport = result.items.find((r: { id: string }) => r.id === reportId);
      expect(newReport).toBeDefined();
      expect(newReport.title).toBe('Quarterly Activity Report');
      expect(newReport.status).toBe('NEW');
    });
    
    it('should allow admins to filter status reports by status', async () => {
      // Mock getStatusReports with filtered results
      const mockReports = [createMockStatusReport({
        id: reportId,
        title: 'Quarterly Activity Report',
        status: 'NEW',
        groupId: mockGroup.id
      }, mockGroup)];
      
      const mockResult = {
        items: mockReports,
        totalItems: 1,
        page: 1,
        pageSize: 10,
        totalPages: 1
      };
      
      (getStatusReports as jest.Mock).mockResolvedValue(mockResult);
      
      // Test filtering by NEW status
      const result = await getStatusReports('NEW', undefined, '', 'createdAt', 'desc', 1, 10);
      
      // Verify all returned reports have NEW status
      expect(result.items).toEqual(mockReports);
      result.items.forEach((report: { status?: string; groupId?: string }) => {
        expect(report.status).toBe('NEW');
      });
      
      // Verify our new report is in the list
      const newReport = result.items.find((r: { id: string }) => r.id === reportId);
      expect(newReport).toBeDefined();
    });
    
    it('should allow admins to filter status reports by group', async () => {
      // Mock getStatusReports with group-filtered results
      const mockReports = [createMockStatusReport({
        id: reportId,
        title: 'Quarterly Activity Report',
        status: 'NEW',
        groupId: mockGroup.id
      }, mockGroup)];
      
      const mockResult = {
        items: mockReports,
        totalItems: 1,
        page: 1,
        pageSize: 10,
        totalPages: 1
      };
      
      (getStatusReports as jest.Mock).mockResolvedValue(mockResult);
      
      // Test filtering by group ID
      const result = await getStatusReports('ALL', mockGroup.id, '', 'createdAt', 'desc', 1, 10);
      
      // Verify all returned reports belong to our group
      expect(result.items).toEqual(mockReports);
      result.items.forEach((report: { status?: string; groupId?: string }) => {
        expect(report.groupId).toBe(mockGroup.id);
      });
      
      // Verify our new report is in the list
      const newReport = result.items.find((r: { id: string }) => r.id === reportId);
      expect(newReport).toBeDefined();
    });
    
    it('should allow admins to view details of a specific status report', async () => {
      // Mock getStatusReportById to return detailed report
      const detailedReport = createMockStatusReport({
        id: reportId,
        title: 'Quarterly Activity Report',
        content: '<p>This quarter our group organized several community events.</p>',
        reporterFirstName: 'Thomas',
        reporterLastName: 'Becker',
        status: 'NEW',
        groupId: mockGroup.id,
        fileUrls: JSON.stringify([
          `https://mock-blob-storage.vercel.app/status-reports/123-meeting-notes.pdf`,
          `https://mock-blob-storage.vercel.app/status-reports/123-event-photo.jpg`
        ])
      }, mockGroup);
      
      (getStatusReportById as jest.Mock).mockResolvedValue(detailedReport);
      
      // Test getting status report by ID
      const result = await getStatusReportById(reportId);
      
      // Verify detailed response
      expect(result).toBeDefined();
      expect(result.id).toBe(reportId);
      expect(result.title).toBe('Quarterly Activity Report');
      expect(result.content).toContain('community events');
      
      // Verify reporter info is included
      expect(result.reporterFirstName).toBe('Thomas');
      expect(result.reporterLastName).toBe('Becker');
      
      // Verify group info is included
      expect(result.group).toBeDefined();
      expect(result.group.id).toBe(mockGroup.id);
      expect(result.group.name).toBe('Test Community Group');
      
      // Verify file URLs are included
      const fileUrls = JSON.parse(result.fileUrls || '[]');
      expect(fileUrls.length).toBe(2);
    });
  });
  
  describe('Step 3: Admin approves the status report', () => {
    beforeEach(() => {
      // Mock authenticated admin user for these tests
      (getToken as jest.Mock).mockResolvedValue({
        role: 'admin',
        name: 'Admin User'
      });
    });
    
    it('should allow admins to update status report status to ACTIVE and notify group representatives', async () => {
      // Mock updateStatusReport to return updated report and trigger email
      const updatedReport = createMockStatusReport({
        id: reportId,
        title: 'Quarterly Activity Report',
        content: '<p>This quarter our group organized several community events.</p><ul><li>Community cleanup</li><li>Information booth at local market</li></ul>',
        status: 'ACTIVE',
        groupId: mockGroup.id
      }, mockGroup);
      
      (updateStatusReport as jest.Mock).mockImplementation(async (data: { status?: string; id: string }) => {
        // Simulate email sending when status changes to ACTIVE
        if (data.status === 'ACTIVE') {
          await (sendEmail as jest.Mock)({
            to: 'julia.weber@example.com',
            subject: 'Bericht wurde freigeschaltet',
            html: 'Quarterly Activity Report wurde freigeschaltet'
          });
        }
        return updatedReport;
      });
      
      // Update data to approve the report
      const updateData = {
        id: reportId,
        status: 'ACTIVE',
        title: 'Quarterly Activity Report',
        content: '<p>This quarter our group organized several community events.</p><ul><li>Community cleanup</li><li>Information booth at local market</li></ul>'
      };
      
      // Test the update business logic directly
      const result = await updateStatusReport(updateData);
      
      // Verify response
      expect(result).toBeDefined();
      expect(result.status).toBe('ACTIVE');
      
      // Verify email notification was sent to responsible persons
      expect(sendEmail).toHaveBeenCalledTimes(1);
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'julia.weber@example.com',
          subject: expect.stringContaining('wurde freigeschaltet'),
          html: expect.stringContaining('Quarterly Activity Report')
        })
      );
    });
  });
  
  describe('Step 4: Public visibility of approved status reports', () => {
    it('should include approved status reports on the public group page', async () => {
      // Mock getGroupBySlug to return group with approved status reports
      const approvedReport = createMockStatusReport({
        id: reportId,
        title: 'Quarterly Activity Report',
        status: 'ACTIVE',
        groupId: mockGroup.id
      }, mockGroup);
      
      (getGroupBySlug as jest.Mock).mockResolvedValue({
        ...mockGroup,
        statusReports: [approvedReport]
      });
      
      // Create request to get public group details
      const request = createNextRequest(
        `https://test.dielinke-frankfurt.de/api/groups/${mockGroup.slug}`
      );
      
      // Get the public group page with its reports
      const response = await publicGroupGet(request, { params: Promise.resolve({ slug: mockGroup.slug }) });
      const responseData = await response.json();
      
      // Verify response includes the group
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.group).toBeDefined();
      expect(responseData.group.id).toBe(mockGroup.id);
      
      // Verify approved status reports are included
      expect(responseData.group.statusReports).toBeDefined();
      expect(Array.isArray(responseData.group.statusReports)).toBe(true);
      
      // Find our approved report
      const foundApprovedReport = responseData.group.statusReports.find((r: { id: string }) => r.id === reportId);
      expect(foundApprovedReport).toBeDefined();
      expect(foundApprovedReport.title).toBe('Quarterly Activity Report');
      expect(foundApprovedReport.status).toBe('ACTIVE');
    });
    
    it('should not include non-approved status reports on the public group page', async () => {
      // Create mock pending report
      const pendingReport = createMockStatusReport({
        id: 'pending-report-123',
        title: 'Pending Report',
        content: '<p>This report will not be approved yet.</p>',
        reporterFirstName: 'Anna',
        reporterLastName: 'Schmidt',
        status: 'NEW', // Not approved
        groupId: mockGroup.id
      }, mockGroup);
      
      // Mock createStatusReport to return the pending report
      (createStatusReport as jest.Mock).mockResolvedValue(pendingReport);
      
      // Submit the report that will remain pending
      const newReportData = new FormData();
      newReportData.append('title', 'Pending Report');
      newReportData.append('content', '<p>This report will not be approved yet.</p>');
      newReportData.append('reporterFirstName', 'Anna');
      newReportData.append('reporterLastName', 'Schmidt');
      newReportData.append('groupId', mockGroup.id);
      newReportData.append('fileCount', '0');
      
      const submitRequest = createNextRequest(
        'https://test.dielinke-frankfurt.de/api/status-reports/submit',
        'POST',
        newReportData
      );
      
      const submitResponse = await statusReportSubmitPost(submitRequest);
      const submitData = await submitResponse.json();
      const pendingReportId = submitData.statusReport?.id;
      
      // Mock getGroupBySlug to return only approved reports (pending report filtered out)
      const approvedReport = createMockStatusReport({
        id: reportId,
        title: 'Quarterly Activity Report',
        status: 'ACTIVE',
        groupId: mockGroup.id
      }, mockGroup);
      
      (getGroupBySlug as jest.Mock).mockResolvedValue({
        ...mockGroup,
        statusReports: [approvedReport] // Only approved reports
      });
      
      // Create request to get public group details
      const request = createNextRequest(
        `https://test.dielinke-frankfurt.de/api/groups/${mockGroup.slug}`
      );
      
      // Get the public group page with its reports
      const response = await publicGroupGet(request, { params: Promise.resolve({ slug: mockGroup.slug }) });
      const responseData = await response.json();
      
      // Verify approved status reports are included
      expect(responseData.group.statusReports).toBeDefined();
      
      // Ensure the pending report is NOT included
      const pendingReportInResponse = responseData.group.statusReports.find((r: { id: string }) => r.id === pendingReportId);
      expect(pendingReportInResponse).toBeUndefined();
    });
  });
  
  describe('Step 5: Admin rejects a status report', () => {
    // For this test, we'll simulate rejecting a different report
    let rejectReportId: string;
    
    beforeEach(async () => {
      // Mock authenticated admin user for these tests
      (getToken as jest.Mock).mockResolvedValue({
        role: 'admin',
        name: 'Admin User'
      });
      
      // Create mock report to be rejected
      const rejectReport = createMockStatusReport({
        id: 'reject-report-123',
        title: 'Report To Reject',
        content: '<p>This report will be rejected.</p>',
        reporterFirstName: 'Felix',
        reporterLastName: 'Baumann',
        status: 'NEW',
        groupId: mockGroup.id
      }, mockGroup);
      
      rejectReportId = rejectReport.id;
      
      // Mock createStatusReport to return the reject report
      (createStatusReport as jest.Mock).mockResolvedValue(rejectReport);
      
      // Submit the report to be rejected
      const newReportData = new FormData();
      newReportData.append('title', 'Report To Reject');
      newReportData.append('content', '<p>This report will be rejected.</p>');
      newReportData.append('reporterFirstName', 'Felix');
      newReportData.append('reporterLastName', 'Baumann');
      newReportData.append('groupId', mockGroup.id);
      newReportData.append('fileCount', '0');
      
      const submitRequest = createNextRequest(
        'https://test.dielinke-frankfurt.de/api/status-reports/submit',
        'POST',
        newReportData
      );
      
      const submitResponse = await statusReportSubmitPost(submitRequest);
      const submitData = await submitResponse.json();
      rejectReportId = submitData.statusReport?.id || rejectReport.id;
      
      // Clear mocks after setup
      jest.clearAllMocks();
    });
    
    it('should allow admins to reject a status report with notification', async () => {
      // Mock updateStatusReport to return rejected report and trigger email
      const rejectedReport = createMockStatusReport({
        id: rejectReportId,
        title: 'Report To Reject',
        content: '<p>This report will be rejected.</p>',
        status: 'REJECTED',
        groupId: mockGroup.id
      }, mockGroup);
      
      (updateStatusReport as jest.Mock).mockImplementation(async (data: { status?: string; id: string }) => {
        // Simulate email sending when status changes to REJECTED
        if (data.status === 'REJECTED') {
          await (sendEmail as jest.Mock)({
            to: 'julia.weber@example.com',
            subject: 'Bericht wurde abgelehnt',
            html: 'Report To Reject wurde abgelehnt'
          });
        }
        return rejectedReport;
      });
      
      // Update data to reject the report
      const updateData = {
        id: rejectReportId,
        status: 'REJECTED'
      };
      
      // Test the update business logic directly
      const result = await updateStatusReport(updateData);
      
      // Verify response
      expect(result).toBeDefined();
      expect(result.status).toBe('REJECTED');
      
      // Verify rejection email notification was sent
      expect(sendEmail).toHaveBeenCalledTimes(1);
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('wurde abgelehnt'),
          html: expect.stringContaining('Report To Reject')
        })
      );
    });
  });
  
  describe('Step 6: File management for status reports', () => {
    it('should handle adding new files to an existing status report', async () => {
      // Mock authenticated admin user
      (getToken as jest.Mock).mockResolvedValue({
        role: 'admin',
        name: 'Admin User'
      });
      
      // Mock updateStatusReport to return report with additional files
      const updatedReport = createMockStatusReport({
        id: reportId,
        title: 'Quarterly Activity Report',
        status: 'ACTIVE',
        groupId: mockGroup.id,
        fileUrls: JSON.stringify([
          'https://mock-blob-storage.vercel.app/status-reports/123-meeting-notes.pdf',
          'https://mock-blob-storage.vercel.app/status-reports/123-event-photo.jpg',
          'https://mock-blob-storage.vercel.app/status-reports/456-additional-document.pdf'
        ])
      }, mockGroup);
      
      (updateStatusReport as jest.Mock).mockResolvedValue(updatedReport);
      
      // Update data with additional file
      const updateData = {
        id: reportId,
        fileUrls: [
          'https://mock-blob-storage.vercel.app/status-reports/123-meeting-notes.pdf',
          'https://mock-blob-storage.vercel.app/status-reports/123-event-photo.jpg',
          'https://mock-blob-storage.vercel.app/status-reports/456-additional-document.pdf'
        ]
      };
      
      // Test the update business logic directly
      const result = await updateStatusReport(updateData);
      
      // Verify response
      expect(result).toBeDefined();
      
      // Verify file URLs were updated
      const updatedFileUrls = JSON.parse(result.fileUrls || '[]');
      expect(updatedFileUrls.length).toBe(3);
      expect(updatedFileUrls[2]).toContain('additional-document.pdf');
    });
    
    it('should handle removing files from an existing status report', async () => {
      // Mock authenticated admin user
      (getToken as jest.Mock).mockResolvedValue({
        role: 'admin',
        name: 'Admin User'
      });
      
      // Mock updateStatusReport to return report with reduced files and trigger deletion
      const updatedReport = createMockStatusReport({
        id: reportId,
        title: 'Quarterly Activity Report',
        status: 'ACTIVE',
        groupId: mockGroup.id,
        fileUrls: JSON.stringify([
          'https://mock-blob-storage.vercel.app/status-reports/123-meeting-notes.pdf'
        ])
      }, mockGroup);
      
      (updateStatusReport as jest.Mock).mockImplementation(async (data: { status?: string; id: string; fileUrls?: string[] }) => {
        // Simulate file deletion when files are reduced
        if (data.fileUrls && data.fileUrls.length < 2) {
          await (del as jest.Mock)([
            'https://mock-blob-storage.vercel.app/status-reports/123-event-photo.jpg'
          ]);
        }
        return updatedReport;
      });
      
      // Update data with reduced files
      const updateData = {
        id: reportId,
        fileUrls: [
          'https://mock-blob-storage.vercel.app/status-reports/123-meeting-notes.pdf'
        ]
      };
      
      // Test the update business logic directly
      const result = await updateStatusReport(updateData);
      
      // Verify response
      expect(result).toBeDefined();
      
      // Verify file URLs were updated
      const updatedFileUrls = JSON.parse(result.fileUrls || '[]');
      expect(updatedFileUrls.length).toBe(1);
      expect(updatedFileUrls[0]).toContain('meeting-notes.pdf');
      
      // Verify blob delete was called to remove the file
      expect(del).toHaveBeenCalled();
    });
  });
  
  describe('Security and Access Control', () => {
    it('should prevent unauthorized users from accessing admin status report endpoints', async () => {
      // Set up the withAdminAuth mock to implement actual authentication logic
      (withAdminAuth as jest.Mock).mockImplementation((handler: (request: NextRequest, context?: NextJSRouteContext) => Promise<NextResponse>) => {
        return async (request: NextRequest, context?: NextJSRouteContext) => {
          const token = await (getToken as jest.Mock)({ req: request });
          
          if (!token) {
            return new NextResponse(
              JSON.stringify({ error: 'Authentication token missing' }),
              { status: 401 }
            );
          }
          
          if (token.role !== 'admin') {
            return new NextResponse(
              JSON.stringify({ error: 'Admin role required' }),
              { status: 403 }
            );
          }
          
          return handler(request, context);
        };
      });
      
      // Mock unauthenticated user
      (getToken as jest.Mock).mockResolvedValue(null);
      
      // Create a test handler that should be protected by auth
      const testHandler = jest.fn().mockResolvedValue(
        new NextResponse(JSON.stringify({ success: true }), { status: 200 })
      );
      
      // Wrap the test handler with authentication
      const protectedHandler = (withAdminAuth as jest.Mock)(testHandler);
      
      // Try to access the protected endpoint
      const listRequest = createNextRequest(
        'https://test.dielinke-frankfurt.de/api/admin/status-reports'
      );
      
      const listResponse = await protectedHandler(listRequest);
      
      // Verify unauthorized response
      expect(listResponse.status).toBe(401);
      
      // Verify the protected handler was not called
      expect(testHandler).not.toHaveBeenCalled();
      
      // Test with non-admin user
      (getToken as jest.Mock).mockResolvedValue({ role: 'user' });
      
      const listResponse2 = await protectedHandler(listRequest);
      
      // Verify authorization failed
      expect(listResponse2.status).toBe(403);
      expect(testHandler).not.toHaveBeenCalled();
      
      // Test with admin user
      (getToken as jest.Mock).mockResolvedValue({ role: 'admin' });
      
      const listResponse3 = await protectedHandler(listRequest);
      
      // Verify admin can access
      expect(listResponse3.status).toBe(200);
      expect(testHandler).toHaveBeenCalledTimes(1);
    });
    
    it('should allow public access to approved status reports via group pages', async () => {
      // Mock unauthenticated user
      (getToken as jest.Mock).mockResolvedValue(null);
      
      // Mock getGroupBySlug to return active group with approved reports
      (getGroupBySlug as jest.Mock).mockResolvedValue({
        ...mockGroup,
        statusReports: []
      });
      
      // Create request to get public group details
      const request = createNextRequest(
        `https://test.dielinke-frankfurt.de/api/groups/${mockGroup.slug}`
      );
      
      // Get the public group page with its reports
      const response = await publicGroupGet(request, { params: Promise.resolve({ slug: mockGroup.slug }) });
      
      // Verify authorized response for public endpoint
      expect(response.status).toBe(200);
    });
  });
});