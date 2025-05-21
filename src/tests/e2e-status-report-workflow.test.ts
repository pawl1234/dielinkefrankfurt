// e2e-status-report-workflow.test.ts - End-to-end test for the complete status report submission and approval workflow
import { NextRequest } from 'next/server';
import { POST as statusReportSubmitPost } from '@/app/api/status-reports/submit/route';
import { GET as adminStatusReportsGet } from '@/app/api/admin/status-reports/route';
import { GET as adminStatusReportGet, PATCH as adminStatusReportPatch } from '@/app/api/admin/status-reports/[id]/route';
import { GET as publicGroupGet } from '@/app/api/groups/[slug]/route';
import { getToken } from 'next-auth/jwt';
import { sendEmail } from '@/lib/email';
import { setupMockBlobStorage, setupMockEmailService, resetMockBlobStorage, resetMockEmailService } from './mock-services';
import { createMockGroup, createMockStatusReport, createMockPdfFile, createMockImageFile, createNextRequest } from './test-utils';
import { put, del } from '@vercel/blob';

// Mock external dependencies
jest.mock('next-auth/jwt', () => ({
  getToken: jest.fn()
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

// Mock environmental context
process.env.VERCEL_PROJECT_PRODUCTION_URL = 'https://test.dielinke-frankfurt.de';
process.env.CONTACT_EMAIL = 'test@dielinke-frankfurt.de';

// Comprehensive end-to-end status report workflow test
describe('End-to-End Status Report Submission and Approval Workflow', () => {
  // Test data
  let reportId: string;
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
  
  beforeAll(() => {
    setupMockBlobStorage();
    setupMockEmailService();
  });
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Simulate unauthenticated user by default
    (getToken as jest.Mock).mockResolvedValue(null);
  });
  
  afterEach(() => {
    resetMockBlobStorage();
    resetMockEmailService();
  });
  
  describe('Step 1: Public status report submission', () => {
    it('should allow submission of a new status report with files', async () => {
      // Mock file uploads
      const pdfFile = createMockPdfFile('meeting-notes.pdf');
      const imageFile = createMockImageFile('event-photo.jpg');
      
      // Mock data for the new status report
      const newReportData = {
        title: 'Quarterly Activity Report',
        content: '<p>This quarter our group organized several community events.</p><ul><li>Community cleanup</li><li>Information booth at local market</li></ul>',
        reporterFirstName: 'Thomas',
        reporterLastName: 'Becker',
        groupId: mockGroup.id,
        fileUrls: JSON.stringify([
          `https://mock-blob-storage.vercel.app/status-reports/123-meeting-notes.pdf`,
          `https://mock-blob-storage.vercel.app/status-reports/123-event-photo.jpg`
        ])
      };
      
      // Create request with the new report data
      const request = createNextRequest(
        'https://test.dielinke-frankfurt.de/api/status-reports/submit',
        'POST',
        newReportData
      );
      
      // Submit the status report
      const response = await statusReportSubmitPost(request);
      const responseData = await response.json();
      
      // Store the generated report ID for subsequent tests
      reportId = responseData.statusReport.id;
      
      // Verify response status and content
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.statusReport).toBeDefined();
      expect(responseData.statusReport.title).toBe('Quarterly Activity Report');
      expect(responseData.statusReport.status).toBe('NEW'); // Initial status should be NEW
      
      // Verify file URLs were saved
      const fileUrls = JSON.parse(responseData.statusReport.fileUrls);
      expect(fileUrls.length).toBe(2);
      expect(fileUrls[0]).toContain('meeting-notes.pdf');
      expect(fileUrls[1]).toContain('event-photo.jpg');
    });
    
    it('should reject status reports for non-existent or inactive groups', async () => {
      // Mock data with invalid group ID
      const invalidReportData = {
        title: 'Invalid Report',
        content: '<p>This report has an invalid group ID.</p>',
        reporterFirstName: 'Thomas',
        reporterLastName: 'Becker',
        groupId: 'non-existent-group-id'
      };
      
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
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBeDefined();
      expect(responseData.error).toContain('invalid group');
    });
    
    it('should reject status reports with missing required fields', async () => {
      // Status report missing title (required field)
      const invalidReportData = {
        content: '<p>This report has no title.</p>',
        reporterFirstName: 'Thomas',
        reporterLastName: 'Becker',
        groupId: mockGroup.id
      };
      
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
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBeDefined();
      expect(responseData.error).toContain('title');
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
      // Create request to get all reports
      const request = createNextRequest(
        'https://test.dielinke-frankfurt.de/api/admin/status-reports'
      );
      
      // Get the reports list
      const response = await adminStatusReportsGet(request);
      const responseData = await response.json();
      
      // Verify response
      expect(response.status).toBe(200);
      expect(Array.isArray(responseData.statusReports)).toBe(true);
      
      // Verify our new report is in the list
      const newReport = responseData.statusReports.find((r: any) => r.id === reportId);
      expect(newReport).toBeDefined();
      expect(newReport.title).toBe('Quarterly Activity Report');
      expect(newReport.status).toBe('NEW');
    });
    
    it('should allow admins to filter status reports by status', async () => {
      // Create request to get only NEW reports
      const request = createNextRequest(
        'https://test.dielinke-frankfurt.de/api/admin/status-reports?status=NEW'
      );
      
      // Get the filtered reports list
      const response = await adminStatusReportsGet(request);
      const responseData = await response.json();
      
      // Verify all returned reports have NEW status
      expect(response.status).toBe(200);
      responseData.statusReports.forEach((report: any) => {
        expect(report.status).toBe('NEW');
      });
      
      // Verify our new report is in the list
      const newReport = responseData.statusReports.find((r: any) => r.id === reportId);
      expect(newReport).toBeDefined();
    });
    
    it('should allow admins to filter status reports by group', async () => {
      // Create request to get reports for our test group
      const request = createNextRequest(
        `https://test.dielinke-frankfurt.de/api/admin/status-reports?groupId=${mockGroup.id}`
      );
      
      // Get the filtered reports list
      const response = await adminStatusReportsGet(request);
      const responseData = await response.json();
      
      // Verify all returned reports belong to our group
      expect(response.status).toBe(200);
      responseData.statusReports.forEach((report: any) => {
        expect(report.groupId).toBe(mockGroup.id);
      });
      
      // Verify our new report is in the list
      const newReport = responseData.statusReports.find((r: any) => r.id === reportId);
      expect(newReport).toBeDefined();
    });
    
    it('should allow admins to view details of a specific status report', async () => {
      // Create request to get specific report details
      const request = createNextRequest(
        `https://test.dielinke-frankfurt.de/api/admin/status-reports/${reportId}`
      );
      
      // Get the report details
      const response = await adminStatusReportGet(request, { params: { id: reportId } });
      const responseData = await response.json();
      
      // Verify detailed response
      expect(response.status).toBe(200);
      expect(responseData.statusReport).toBeDefined();
      expect(responseData.statusReport.id).toBe(reportId);
      expect(responseData.statusReport.title).toBe('Quarterly Activity Report');
      expect(responseData.statusReport.content).toContain('community events');
      
      // Verify reporter info is included
      expect(responseData.statusReport.reporterFirstName).toBe('Thomas');
      expect(responseData.statusReport.reporterLastName).toBe('Becker');
      
      // Verify group info is included
      expect(responseData.statusReport.group).toBeDefined();
      expect(responseData.statusReport.group.id).toBe(mockGroup.id);
      expect(responseData.statusReport.group.name).toBe('Test Community Group');
      
      // Verify file URLs are included
      const fileUrls = JSON.parse(responseData.statusReport.fileUrls);
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
      // Update data to approve the report
      const updateData = {
        id: reportId,
        status: 'ACTIVE',
        title: 'Quarterly Activity Report', // Maintain the same title
        content: '<p>This quarter our group organized several community events.</p><ul><li>Community cleanup</li><li>Information booth at local market</li></ul>' // Maintain content
      };
      
      // Create request to update the report
      const request = createNextRequest(
        `https://test.dielinke-frankfurt.de/api/admin/status-reports/${reportId}`,
        'PATCH',
        updateData
      );
      
      // Update the report (approve it)
      const response = await adminStatusReportPatch(request, { params: { id: reportId } });
      const responseData = await response.json();
      
      // Verify response
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.statusReport.status).toBe('ACTIVE');
      
      // Verify email notification was sent to responsible persons
      expect(sendEmail).toHaveBeenCalledTimes(1);
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'julia.weber@example.com', // The responsible person's email
          subject: expect.stringContaining('wurde freigeschaltet'),
          html: expect.stringContaining('Quarterly Activity Report')
        })
      );
    });
  });
  
  describe('Step 4: Public visibility of approved status reports', () => {
    it('should include approved status reports on the public group page', async () => {
      // Create request to get public group details (which should include approved reports)
      const request = createNextRequest(
        `https://test.dielinke-frankfurt.de/api/groups/${mockGroup.slug}`
      );
      
      // Get the public group page with its reports
      const response = await publicGroupGet(request, { params: { slug: mockGroup.slug } });
      const responseData = await response.json();
      
      // Verify response includes the group
      expect(response.status).toBe(200);
      expect(responseData.group).toBeDefined();
      expect(responseData.group.id).toBe(mockGroup.id);
      
      // Verify approved status reports are included
      expect(responseData.statusReports).toBeDefined();
      expect(Array.isArray(responseData.statusReports)).toBe(true);
      
      // Find our approved report
      const approvedReport = responseData.statusReports.find((r: any) => r.id === reportId);
      expect(approvedReport).toBeDefined();
      expect(approvedReport.title).toBe('Quarterly Activity Report');
      expect(approvedReport.status).toBe('ACTIVE');
    });
    
    it('should not include non-approved status reports on the public group page', async () => {
      // Create another test report that will remain in NEW status
      const newReportData = {
        title: 'Pending Report',
        content: '<p>This report will not be approved yet.</p>',
        reporterFirstName: 'Anna',
        reporterLastName: 'Schmidt',
        groupId: mockGroup.id
      };
      
      // Submit the report that will remain pending
      const submitRequest = createNextRequest(
        'https://test.dielinke-frankfurt.de/api/status-reports/submit',
        'POST',
        newReportData
      );
      
      const submitResponse = await statusReportSubmitPost(submitRequest);
      const submitData = await submitResponse.json();
      const pendingReportId = submitData.statusReport.id;
      
      // Create request to get public group details
      const request = createNextRequest(
        `https://test.dielinke-frankfurt.de/api/groups/${mockGroup.slug}`
      );
      
      // Get the public group page with its reports
      const response = await publicGroupGet(request, { params: { slug: mockGroup.slug } });
      const responseData = await response.json();
      
      // Verify approved status reports are included
      expect(responseData.statusReports).toBeDefined();
      
      // Ensure the pending report is NOT included
      const pendingReport = responseData.statusReports.find((r: any) => r.id === pendingReportId);
      expect(pendingReport).toBeUndefined();
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
      
      // Create another report that will be rejected
      const newReportData = {
        title: 'Report To Reject',
        content: '<p>This report will be rejected.</p>',
        reporterFirstName: 'Felix',
        reporterLastName: 'Baumann',
        groupId: mockGroup.id
      };
      
      // Submit the report to be rejected
      const submitRequest = createNextRequest(
        'https://test.dielinke-frankfurt.de/api/status-reports/submit',
        'POST',
        newReportData
      );
      
      const submitResponse = await statusReportSubmitPost(submitRequest);
      const submitData = await submitResponse.json();
      rejectReportId = submitData.statusReport.id;
      
      // Clear mocks after setup
      jest.clearAllMocks();
    });
    
    it('should allow admins to reject a status report with notification', async () => {
      // Update data to reject the report
      const updateData = {
        id: rejectReportId,
        status: 'REJECTED'
      };
      
      // Create request to update the report
      const request = createNextRequest(
        `https://test.dielinke-frankfurt.de/api/admin/status-reports/${rejectReportId}`,
        'PATCH',
        updateData
      );
      
      // Update the report (reject it)
      const response = await adminStatusReportPatch(request, { params: { id: rejectReportId } });
      const responseData = await response.json();
      
      // Verify response
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.statusReport.status).toBe('REJECTED');
      
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
      
      // Mock new file URLs
      const existingFileUrls = JSON.stringify([
        'https://mock-blob-storage.vercel.app/status-reports/123-meeting-notes.pdf',
        'https://mock-blob-storage.vercel.app/status-reports/123-event-photo.jpg'
      ]);
      
      const newFileUrls = JSON.stringify([
        'https://mock-blob-storage.vercel.app/status-reports/123-meeting-notes.pdf',
        'https://mock-blob-storage.vercel.app/status-reports/123-event-photo.jpg',
        'https://mock-blob-storage.vercel.app/status-reports/456-additional-document.pdf'
      ]);
      
      // Update data with additional file
      const updateData = {
        id: reportId,
        fileUrls: newFileUrls
      };
      
      // Create request to update the report
      const request = createNextRequest(
        `https://test.dielinke-frankfurt.de/api/admin/status-reports/${reportId}`,
        'PATCH',
        updateData
      );
      
      // Update the report (add new file)
      const response = await adminStatusReportPatch(request, { params: { id: reportId } });
      const responseData = await response.json();
      
      // Verify response
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      
      // Verify file URLs were updated
      const updatedFileUrls = JSON.parse(responseData.statusReport.fileUrls);
      expect(updatedFileUrls.length).toBe(3);
      expect(updatedFileUrls[2]).toContain('additional-document.pdf');
    });
    
    it('should handle removing files from an existing status report', async () => {
      // Mock authenticated admin user
      (getToken as jest.Mock).mockResolvedValue({
        role: 'admin',
        name: 'Admin User'
      });
      
      // Mock updated file URLs (one file removed)
      const reducedFileUrls = JSON.stringify([
        'https://mock-blob-storage.vercel.app/status-reports/123-meeting-notes.pdf'
      ]);
      
      // Update data with reduced files
      const updateData = {
        id: reportId,
        fileUrls: reducedFileUrls
      };
      
      // Create request to update the report
      const request = createNextRequest(
        `https://test.dielinke-frankfurt.de/api/admin/status-reports/${reportId}`,
        'PATCH',
        updateData
      );
      
      // Update the report (remove a file)
      const response = await adminStatusReportPatch(request, { params: { id: reportId } });
      const responseData = await response.json();
      
      // Verify response
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      
      // Verify file URLs were updated
      const updatedFileUrls = JSON.parse(responseData.statusReport.fileUrls);
      expect(updatedFileUrls.length).toBe(1);
      expect(updatedFileUrls[0]).toContain('meeting-notes.pdf');
      
      // Verify blob delete was called to remove the file
      expect(del).toHaveBeenCalled();
    });
  });
  
  describe('Security and Access Control', () => {
    it('should prevent unauthorized users from accessing admin status report endpoints', async () => {
      // Mock unauthenticated user
      (getToken as jest.Mock).mockResolvedValue(null);
      
      // Try to access admin status reports list
      const listRequest = createNextRequest(
        'https://test.dielinke-frankfurt.de/api/admin/status-reports'
      );
      
      const listResponse = await adminStatusReportsGet(listRequest);
      
      // Verify unauthorized response
      expect(listResponse.status).toBe(401);
      
      // Try to access specific status report details
      const detailRequest = createNextRequest(
        `https://test.dielinke-frankfurt.de/api/admin/status-reports/${reportId}`
      );
      
      const detailResponse = await adminStatusReportGet(detailRequest, { params: { id: reportId } });
      
      // Verify unauthorized response
      expect(detailResponse.status).toBe(401);
      
      // Try to update status report status
      const updateRequest = createNextRequest(
        `https://test.dielinke-frankfurt.de/api/admin/status-reports/${reportId}`,
        'PATCH',
        { status: 'ACTIVE' }
      );
      
      const updateResponse = await adminStatusReportPatch(updateRequest, { params: { id: reportId } });
      
      // Verify unauthorized response
      expect(updateResponse.status).toBe(401);
    });
    
    it('should allow public access to approved status reports via group pages', async () => {
      // Mock unauthenticated user
      (getToken as jest.Mock).mockResolvedValue(null);
      
      // Create request to get public group details
      const request = createNextRequest(
        `https://test.dielinke-frankfurt.de/api/groups/${mockGroup.slug}`
      );
      
      // Get the public group page with its reports
      const response = await publicGroupGet(request, { params: { slug: mockGroup.slug } });
      
      // Verify authorized response for public endpoint
      expect(response.status).toBe(200);
    });
  });
});