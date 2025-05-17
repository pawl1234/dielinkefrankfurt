import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { GET as adminGroupsGet } from '@/app/api/admin/groups/route';
import { GET as groupDetailGet, PUT as groupDetailPut, DELETE as groupDetailDelete } from '@/app/api/admin/groups/[id]/route';
import { PUT as groupStatusPut } from '@/app/api/admin/groups/[id]/status/route';
import { GET as publicGroupsGet } from '@/app/api/groups/route';
import { GET as publicGroupDetailGet } from '@/app/api/groups/[slug]/route';
import * as groupHandlers from '@/lib/group-handlers';
import * as fileUpload from '@/lib/file-upload';

// Mock the nextauth
jest.mock('next-auth/jwt', () => ({
  getToken: jest.fn()
}));

// Mock the group handlers
jest.mock('@/lib/group-handlers', () => ({
  getGroups: jest.fn(),
  getGroupById: jest.fn(),
  getGroupBySlug: jest.fn(),
  updateGroup: jest.fn(),
  updateGroupStatus: jest.fn(),
  deleteGroup: jest.fn(),
  getPublicGroups: jest.fn()
}));

// Mock file upload functionality
jest.mock('@/lib/file-upload', () => ({
  validateFile: jest.fn(),
  uploadCroppedImagePair: jest.fn(),
  deleteFiles: jest.fn(),
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif'],
  MAX_LOGO_SIZE: 2 * 1024 * 1024,
  FileUploadError: class FileUploadError extends Error {
    constructor(message: string, public status: number = 500) {
      super(message);
      this.name = 'FileUploadError';
    }
  }
}));

// Helper function to mock admin authentication
function mockAuthenticatedAdminUser() {
  (getToken as jest.Mock).mockResolvedValue({
    role: 'admin',
    name: 'Admin User'
  });
}

describe('Group API Routes', () => {
  // Mock group data
  const mockGroups = [
    {
      id: 'group-1',
      name: 'Test Group 1',
      slug: 'test-group-1',
      description: 'Test description 1',
      status: 'ACTIVE',
      logoUrl: 'https://example.com/logo1.jpg',
      metadata: JSON.stringify({
        originalUrl: 'https://example.com/original1.jpg',
        croppedUrl: 'https://example.com/logo1.jpg'
      }),
      createdAt: new Date(),
      updatedAt: new Date(),
      responsiblePersons: [
        {
          id: 'person-1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          groupId: 'group-1'
        }
      ],
      statusReports: []
    },
    {
      id: 'group-2',
      name: 'Test Group 2',
      slug: 'test-group-2',
      description: 'Test description 2',
      status: 'NEW',
      logoUrl: null,
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      responsiblePersons: [],
      statusReports: []
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthenticatedAdminUser();
  });

  describe('GET /api/admin/groups', () => {
    it('should return groups with proper filtering', async () => {
      (groupHandlers.getGroups as jest.Mock).mockResolvedValue(mockGroups);

      const request = new NextRequest('https://example.com/api/admin/groups?status=ACTIVE&search=test&orderBy=name&orderDirection=asc');
      const response = await adminGroupsGet(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.groups).toEqual(mockGroups);
      expect(groupHandlers.getGroups).toHaveBeenCalledWith(
        'ACTIVE',
        'test',
        'name',
        'asc'
      );
    });

    it('should handle errors properly', async () => {
      (groupHandlers.getGroups as jest.Mock).mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('https://example.com/api/admin/groups');
      const response = await adminGroupsGet(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch groups');
      expect(data.groups).toEqual([]);
    });
  });

  describe('GET /api/admin/groups/[id]', () => {
    it('should return a specific group by ID', async () => {
      (groupHandlers.getGroupById as jest.Mock).mockResolvedValue(mockGroups[0]);

      const request = new NextRequest('https://example.com/api/admin/groups/group-1');
      const params = { id: 'group-1' };
      const response = await groupDetailGet(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.group).toEqual(mockGroups[0]);
      expect(groupHandlers.getGroupById).toHaveBeenCalledWith('group-1');
    });

    it('should return 404 for non-existent group', async () => {
      (groupHandlers.getGroupById as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('https://example.com/api/admin/groups/nonexistent');
      const params = { id: 'nonexistent' };
      const response = await groupDetailGet(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Group not found');
    });
  });

  describe('PUT /api/admin/groups/[id]', () => {
    it('should update a group with JSON data', async () => {
      (groupHandlers.getGroupById as jest.Mock).mockResolvedValue(mockGroups[0]);
      (groupHandlers.updateGroup as jest.Mock).mockResolvedValue({
        ...mockGroups[0],
        name: 'Updated Group Name'
      });

      const request = new NextRequest('https://example.com/api/admin/groups/group-1', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'Updated Group Name',
          description: 'Updated description'
        })
      });

      const params = { id: 'group-1' };
      const response = await groupDetailPut(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.group.name).toBe('Updated Group Name');
      expect(groupHandlers.updateGroup).toHaveBeenCalledWith({
        id: 'group-1',
        name: 'Updated Group Name',
        description: 'Updated description'
      });
    });

    it('should handle form data with file uploads', async () => {
      (groupHandlers.getGroupById as jest.Mock).mockResolvedValue(mockGroups[0]);
      (fileUpload.uploadCroppedImagePair as jest.Mock).mockResolvedValue({
        originalUrl: 'https://example.com/new-original.jpg',
        croppedUrl: 'https://example.com/new-logo.jpg'
      });
      (groupHandlers.updateGroup as jest.Mock).mockResolvedValue({
        ...mockGroups[0],
        name: 'Updated Group Name',
        logoUrl: 'https://example.com/new-logo.jpg'
      });

      // Create mock files
      const originalLogo = new File(['original image content'], 'logo.jpg', { type: 'image/jpeg' });
      const croppedLogo = new File(['cropped image content'], 'cropped-logo.jpg', { type: 'image/jpeg' });
      
      // Create form data
      const formData = new FormData();
      formData.append('name', 'Updated Group Name');
      formData.append('description', 'Updated description');
      formData.append('logo', originalLogo);
      formData.append('croppedLogo', croppedLogo);
      formData.append('responsiblePersonsCount', '1');
      formData.append('responsiblePerson[0].firstName', 'Jane');
      formData.append('responsiblePerson[0].lastName', 'Doe');
      formData.append('responsiblePerson[0].email', 'jane@example.com');

      const request = new NextRequest('https://example.com/api/admin/groups/group-1', {
        method: 'PUT',
        body: formData
      });

      // Override Content-Type detection
      Object.defineProperty(request.headers, 'get', {
        value: jest.fn().mockImplementation((name) => {
          if (name.toLowerCase() === 'content-type') {
            return 'multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW';
          }
          return null;
        })
      });

      const params = { id: 'group-1' };
      const response = await groupDetailPut(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      
      // Validate that file upload was called
      expect(fileUpload.validateFile).toHaveBeenCalled();
      expect(fileUpload.uploadCroppedImagePair).toHaveBeenCalled();
      
      // Validate that update was called with correct data
      expect(groupHandlers.updateGroup).toHaveBeenCalledWith(expect.objectContaining({
        id: 'group-1',
        name: 'Updated Group Name',
        description: 'Updated description',
        logoMetadata: {
          originalUrl: 'https://example.com/new-original.jpg',
          croppedUrl: 'https://example.com/new-logo.jpg'
        }
      }));
    });

    it('should handle logo removal', async () => {
      (groupHandlers.getGroupById as jest.Mock).mockResolvedValue(mockGroups[0]);
      (groupHandlers.updateGroup as jest.Mock).mockResolvedValue({
        ...mockGroups[0],
        logoUrl: null,
        metadata: null
      });

      // Create form data with removeLogo flag
      const formData = new FormData();
      formData.append('name', 'Updated Group Name');
      formData.append('removeLogo', 'true');

      const request = new NextRequest('https://example.com/api/admin/groups/group-1', {
        method: 'PUT',
        body: formData
      });

      // Override Content-Type detection
      Object.defineProperty(request.headers, 'get', {
        value: jest.fn().mockImplementation((name) => {
          if (name.toLowerCase() === 'content-type') {
            return 'multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW';
          }
          return null;
        })
      });

      const params = { id: 'group-1' };
      const response = await groupDetailPut(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      
      // Validate that update was called with correct data
      expect(groupHandlers.updateGroup).toHaveBeenCalledWith(expect.objectContaining({
        id: 'group-1',
        name: 'Updated Group Name',
        logoMetadata: null
      }));
    });

    it('should return 404 for non-existent group', async () => {
      (groupHandlers.getGroupById as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('https://example.com/api/admin/groups/nonexistent', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'Updated Group Name'
        })
      });

      const params = { id: 'nonexistent' };
      const response = await groupDetailPut(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Group not found');
    });

    it('should handle validation errors', async () => {
      (groupHandlers.getGroupById as jest.Mock).mockResolvedValue(mockGroups[0]);
      (groupHandlers.updateGroup as jest.Mock).mockRejectedValue(
        new Error('Group name must be between 3 and 100 characters')
      );

      const request = new NextRequest('https://example.com/api/admin/groups/group-1', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'A', // Too short
          description: 'Updated description'
        })
      });

      const params = { id: 'group-1' };
      const response = await groupDetailPut(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Group name must be between 3 and 100 characters');
    });
  });

  describe('PUT /api/admin/groups/[id]/status', () => {
    it('should update a group status', async () => {
      (groupHandlers.getGroupById as jest.Mock).mockResolvedValue(mockGroups[0]);
      (groupHandlers.updateGroupStatus as jest.Mock).mockResolvedValue({
        ...mockGroups[0],
        status: 'ARCHIVED'
      });

      const request = new NextRequest('https://example.com/api/admin/groups/group-1/status', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'ARCHIVED'
        })
      });

      const params = { id: 'group-1' };
      const response = await groupStatusPut(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.group.status).toBe('ARCHIVED');
      expect(groupHandlers.updateGroupStatus).toHaveBeenCalledWith('group-1', 'ARCHIVED');
    });

    it('should return 400 for invalid status', async () => {
      (groupHandlers.getGroupById as jest.Mock).mockResolvedValue(mockGroups[0]);

      const request = new NextRequest('https://example.com/api/admin/groups/group-1/status', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'INVALID_STATUS'
        })
      });

      const params = { id: 'group-1' };
      const response = await groupStatusPut(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Valid status is required (NEW, ACTIVE, ARCHIVED)');
    });

    it('should return 404 for non-existent group', async () => {
      (groupHandlers.getGroupById as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('https://example.com/api/admin/groups/nonexistent/status', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'ACTIVE'
        })
      });

      const params = { id: 'nonexistent' };
      const response = await groupStatusPut(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Group not found');
    });
  });

  describe('DELETE /api/admin/groups/[id]', () => {
    it('should delete a group', async () => {
      (groupHandlers.getGroupById as jest.Mock).mockResolvedValue(mockGroups[0]);
      (groupHandlers.deleteGroup as jest.Mock).mockResolvedValue(true);

      const request = new NextRequest('https://example.com/api/admin/groups/group-1', {
        method: 'DELETE'
      });

      const params = { id: 'group-1' };
      const response = await groupDetailDelete(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(groupHandlers.deleteGroup).toHaveBeenCalledWith('group-1');
    });

    it('should return 404 for non-existent group', async () => {
      (groupHandlers.getGroupById as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('https://example.com/api/admin/groups/nonexistent', {
        method: 'DELETE'
      });

      const params = { id: 'nonexistent' };
      const response = await groupDetailDelete(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Group not found');
    });
  });

  describe('GET /api/groups (Public)', () => {
    it('should return active groups for public access', async () => {
      const publicGroups = [
        {
          id: 'group-1',
          name: 'Test Group 1',
          slug: 'test-group-1',
          description: 'Test description 1',
          logoUrl: 'https://example.com/logo1.jpg',
          createdAt: new Date()
        }
      ];
      
      (groupHandlers.getPublicGroups as jest.Mock).mockResolvedValue(publicGroups);

      const request = new NextRequest('https://example.com/api/groups');
      const response = await publicGroupsGet(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.groups).toEqual(publicGroups);
    });

    it('should handle errors properly', async () => {
      (groupHandlers.getPublicGroups as jest.Mock).mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('https://example.com/api/groups');
      const response = await publicGroupsGet(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to fetch groups');
    });
  });

  describe('GET /api/groups/[slug] (Public)', () => {
    it('should return an active group by slug', async () => {
      const activeGroup = {
        ...mockGroups[0],
        statusReports: []
      };
      activeGroup.status = 'ACTIVE';
      
      (groupHandlers.getGroupBySlug as jest.Mock).mockResolvedValue(activeGroup);

      const request = new NextRequest('https://example.com/api/groups/test-group-1');
      const params = { slug: 'test-group-1' };
      const response = await publicGroupDetailGet(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.group).toEqual(activeGroup);
    });

    it('should return 404 for non-active groups', async () => {
      const inactiveGroup = {
        ...mockGroups[1],
        statusReports: []
      };
      inactiveGroup.status = 'NEW';
      
      (groupHandlers.getGroupBySlug as jest.Mock).mockResolvedValue(inactiveGroup);

      const request = new NextRequest('https://example.com/api/groups/test-group-2');
      const params = { slug: 'test-group-2' };
      const response = await publicGroupDetailGet(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Group not found');
    });

    it('should return 404 for non-existent group', async () => {
      (groupHandlers.getGroupBySlug as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('https://example.com/api/groups/nonexistent');
      const params = { slug: 'nonexistent' };
      const response = await publicGroupDetailGet(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Group not found');
    });
  });
});