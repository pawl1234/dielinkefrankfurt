// e2e-group-workflow.test.ts - End-to-end test for the complete group creation and approval workflow
import { NextRequest } from 'next/server';
import { POST as groupSubmitPost } from '@/app/api/groups/submit/route';
import { GET as adminGroupsGet } from '@/app/api/admin/groups/route';
import { GET as adminGroupGet, PATCH as adminGroupPatch } from '@/app/api/admin/groups/[id]/route';
import { getToken } from 'next-auth/jwt';
import { sendEmail } from '@/lib/email';
import { setupMockBlobStorage, setupMockEmailService, resetMockBlobStorage, resetMockEmailService } from './mock-services';
import { createMockGroup, createMockFile, createMockImageFile, createNextRequest } from './test-utils';
import { put } from '@vercel/blob';

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

// Comprehensive end-to-end group workflow test
describe('End-to-End Group Creation and Approval Workflow', () => {
  let groupId: string;
  
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
  
  describe('Step 1: Public group submission by user', () => {
    it('should allow submission of a new group request with logo', async () => {
      // Mock data for the new group
      const logoFile = createMockImageFile('group-logo.jpg');
      const newGroupData = {
        name: 'New Political Action Group',
        description: '<p>This is a new group focused on local community action.</p>',
        responsiblePersons: [
          {
            firstName: 'Maria',
            lastName: 'Schmidt',
            email: 'maria.schmidt@example.com'
          }
        ],
        logoUrl: `https://mock-blob-storage.vercel.app/groups/123-logo-group-logo.jpg` // This will be set by the API
      };
      
      // Create request with the new group data
      const request = createNextRequest(
        'https://test.dielinke-frankfurt.de/api/groups/submit',
        'POST',
        newGroupData
      );
      
      // Submit the group request
      const response = await groupSubmitPost(request);
      const responseData = await response.json();
      
      // Store the generated group ID for subsequent tests
      groupId = responseData.group.id;
      
      // Verify response status and content
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.group).toBeDefined();
      expect(responseData.group.name).toBe('New Political Action Group');
      expect(responseData.group.status).toBe('NEW'); // Initial status should be NEW
    });
    
    it('should reject invalid group data', async () => {
      // Group with missing name (required field)
      const invalidGroupData = {
        description: '<p>This group has no name.</p>',
        responsiblePersons: [
          {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com'
          }
        ]
      };
      
      // Create request with invalid data
      const request = createNextRequest(
        'https://test.dielinke-frankfurt.de/api/groups/submit',
        'POST',
        invalidGroupData
      );
      
      // Submit the invalid group request
      const response = await groupSubmitPost(request);
      const responseData = await response.json();
      
      // Verify rejection
      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBeDefined();
    });
  });
  
  describe('Step 2: Admin group review and listing', () => {
    beforeEach(() => {
      // Mock authenticated admin user for these tests
      (getToken as jest.Mock).mockResolvedValue({
        role: 'admin',
        name: 'Admin User'
      });
    });
    
    it('should allow admins to view all group requests including the new one', async () => {
      // Create request to get all groups
      const request = createNextRequest(
        'https://test.dielinke-frankfurt.de/api/admin/groups'
      );
      
      // Get the groups list
      const response = await adminGroupsGet(request);
      const responseData = await response.json();
      
      // Verify response
      expect(response.status).toBe(200);
      expect(Array.isArray(responseData.groups)).toBe(true);
      
      // Verify our new group is in the list
      const newGroup = responseData.groups.find((g: any) => g.id === groupId);
      expect(newGroup).toBeDefined();
      expect(newGroup.name).toBe('New Political Action Group');
      expect(newGroup.status).toBe('NEW');
    });
    
    it('should allow admins to filter groups by status', async () => {
      // Create request to get only NEW groups
      const request = createNextRequest(
        'https://test.dielinke-frankfurt.de/api/admin/groups?status=NEW'
      );
      
      // Get the filtered groups list
      const response = await adminGroupsGet(request);
      const responseData = await response.json();
      
      // Verify all returned groups have NEW status
      expect(response.status).toBe(200);
      responseData.groups.forEach((group: any) => {
        expect(group.status).toBe('NEW');
      });
      
      // Verify our new group is in the list
      const newGroup = responseData.groups.find((g: any) => g.id === groupId);
      expect(newGroup).toBeDefined();
    });
    
    it('should allow admins to view details of a specific group', async () => {
      // Create request to get specific group details
      const request = createNextRequest(
        `https://test.dielinke-frankfurt.de/api/admin/groups/${groupId}`
      );
      
      // Get the group details
      const response = await adminGroupGet(request, { params: { id: groupId } });
      const responseData = await response.json();
      
      // Verify detailed response
      expect(response.status).toBe(200);
      expect(responseData.group).toBeDefined();
      expect(responseData.group.id).toBe(groupId);
      expect(responseData.group.name).toBe('New Political Action Group');
      expect(responseData.group.description).toContain('local community action');
      
      // Verify responsible persons are included
      expect(responseData.group.responsiblePersons).toBeDefined();
      expect(responseData.group.responsiblePersons.length).toBeGreaterThan(0);
      expect(responseData.group.responsiblePersons[0].firstName).toBe('Maria');
      expect(responseData.group.responsiblePersons[0].email).toBe('maria.schmidt@example.com');
    });
  });
  
  describe('Step 3: Admin approves the group', () => {
    beforeEach(() => {
      // Mock authenticated admin user for these tests
      (getToken as jest.Mock).mockResolvedValue({
        role: 'admin',
        name: 'Admin User'
      });
    });
    
    it('should allow admins to update group status to ACTIVE and notify responsible persons', async () => {
      // Update data to approve the group
      const updateData = {
        id: groupId,
        status: 'ACTIVE',
        name: 'New Political Action Group', // Maintain the same name
        description: '<p>This is a new group focused on local community action.</p>' // Maintain description
      };
      
      // Create request to update the group
      const request = createNextRequest(
        `https://test.dielinke-frankfurt.de/api/admin/groups/${groupId}`,
        'PATCH',
        updateData
      );
      
      // Update the group (approve it)
      const response = await adminGroupPatch(request, { params: { id: groupId } });
      const responseData = await response.json();
      
      // Verify response
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.group.status).toBe('ACTIVE');
      
      // Verify email notification was sent
      expect(sendEmail).toHaveBeenCalledTimes(1);
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('wurde freigeschaltet'),
          html: expect.stringContaining('New Political Action Group')
        })
      );
    });
    
    it('should generate a slug for the activated group', async () => {
      // Create request to get the updated group details
      const request = createNextRequest(
        `https://test.dielinke-frankfurt.de/api/admin/groups/${groupId}`
      );
      
      // Get the group details after approval
      const response = await adminGroupGet(request, { params: { id: groupId } });
      const responseData = await response.json();
      
      // Verify slug has been generated
      expect(responseData.group.slug).toBeDefined();
      expect(responseData.group.slug).toContain('new-political-action-group');
    });
  });
  
  describe('Step 4: Rejecting a group request', () => {
    // For this test, we'll simulate rejecting a different group
    let rejectGroupId: string;
    
    beforeEach(async () => {
      // Mock authenticated admin user for these tests
      (getToken as jest.Mock).mockResolvedValue({
        role: 'admin',
        name: 'Admin User'
      });
      
      // Create another group that will be rejected
      const newGroupData = {
        name: 'Rejected Test Group',
        description: '<p>This group will be rejected.</p>',
        responsiblePersons: [
          {
            firstName: 'Hans',
            lastName: 'Müller',
            email: 'hans.mueller@example.com'
          }
        ]
      };
      
      // Submit the group to be rejected
      const submitRequest = createNextRequest(
        'https://test.dielinke-frankfurt.de/api/groups/submit',
        'POST',
        newGroupData
      );
      
      const submitResponse = await groupSubmitPost(submitRequest);
      const submitData = await submitResponse.json();
      rejectGroupId = submitData.group.id;
      
      // Clear mocks after setup
      jest.clearAllMocks();
    });
    
    it('should allow admins to reject a group request with notification', async () => {
      // Update data to reject the group
      const updateData = {
        id: rejectGroupId,
        status: 'REJECTED'
      };
      
      // Create request to update the group
      const request = createNextRequest(
        `https://test.dielinke-frankfurt.de/api/admin/groups/${rejectGroupId}`,
        'PATCH',
        updateData
      );
      
      // Update the group (reject it)
      const response = await adminGroupPatch(request, { params: { id: rejectGroupId } });
      const responseData = await response.json();
      
      // Verify response
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.group.status).toBe('REJECTED');
      
      // Verify rejection email notification was sent
      expect(sendEmail).toHaveBeenCalledTimes(1);
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('wurde abgelehnt'),
          html: expect.stringContaining('Rejected Test Group')
        })
      );
    });
  });
  
  describe('Step 5: Group archiving', () => {
    it('should allow admins to archive an active group', async () => {
      // Mock authenticated admin user
      (getToken as jest.Mock).mockResolvedValue({
        role: 'admin',
        name: 'Admin User'
      });
      
      // Update data to archive the group
      const updateData = {
        id: groupId,
        status: 'ARCHIVED'
      };
      
      // Create request to update the group
      const request = createNextRequest(
        `https://test.dielinke-frankfurt.de/api/admin/groups/${groupId}`,
        'PATCH',
        updateData
      );
      
      // Update the group (archive it)
      const response = await adminGroupPatch(request, { params: { id: groupId } });
      const responseData = await response.json();
      
      // Verify response
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.group.status).toBe('ARCHIVED');
      
      // Verify archiving email notification was sent
      expect(sendEmail).toHaveBeenCalledTimes(1);
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('wurde archiviert'),
          html: expect.stringContaining('New Political Action Group')
        })
      );
    });
  });
  
  describe('Security and Access Control', () => {
    it('should prevent unauthorized users from accessing admin group endpoints', async () => {
      // Mock unauthenticated user
      (getToken as jest.Mock).mockResolvedValue(null);
      
      // Try to access admin groups list
      const listRequest = createNextRequest(
        'https://test.dielinke-frankfurt.de/api/admin/groups'
      );
      
      const listResponse = await adminGroupsGet(listRequest);
      
      // Verify unauthorized response
      expect(listResponse.status).toBe(401);
      
      // Try to access specific group details
      const detailRequest = createNextRequest(
        `https://test.dielinke-frankfurt.de/api/admin/groups/${groupId}`
      );
      
      const detailResponse = await adminGroupGet(detailRequest, { params: { id: groupId } });
      
      // Verify unauthorized response
      expect(detailResponse.status).toBe(401);
      
      // Try to update group status
      const updateRequest = createNextRequest(
        `https://test.dielinke-frankfurt.de/api/admin/groups/${groupId}`,
        'PATCH',
        { status: 'ACTIVE' }
      );
      
      const updateResponse = await adminGroupPatch(updateRequest, { params: { id: groupId } });
      
      // Verify unauthorized response
      expect(updateResponse.status).toBe(401);
    });
  });
});