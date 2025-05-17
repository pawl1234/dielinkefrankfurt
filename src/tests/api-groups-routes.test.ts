import { NextRequest } from 'next/server';
import { GET as adminGroupsGet } from '@/app/api/admin/groups/route';
import { GET as adminGroupDetailGet } from '@/app/api/admin/groups/[id]/route';
import { POST as groupsSubmitPost } from '@/app/api/groups/submit/route';
import * as groupHandlers from '@/lib/group-handlers';
import { getToken } from 'next-auth/jwt';

// Mock group handlers
jest.mock('@/lib/group-handlers');

// Mock next-auth
jest.mock('next-auth/jwt', () => ({
  getToken: jest.fn()
}));

// Mock helper function
function mockAuthenticatedAdminUser() {
  (getToken as jest.Mock).mockResolvedValue({
    role: 'admin',
    name: 'Admin User'
  });
}

describe('Groups API Routes', () => {
  const mockGroups = [
    {
      id: 'group-1',
      name: 'Test Group 1',
      slug: 'test-group-1',
      description: 'Test description 1',
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
      logoUrl: null,
      responsiblePersons: [
        {
          id: 'person-1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          groupId: 'group-1'
        }
      ]
    },
    {
      id: 'group-2',
      name: 'Test Group 2',
      slug: 'test-group-2',
      description: 'Test description 2',
      status: 'NEW',
      createdAt: new Date(),
      updatedAt: new Date(),
      logoUrl: null,
      responsiblePersons: []
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

    it('should use default values when query parameters are missing', async () => {
      (groupHandlers.getGroups as jest.Mock).mockResolvedValue(mockGroups);

      const request = new NextRequest('https://example.com/api/admin/groups');
      const response = await adminGroupsGet(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.groups).toEqual(mockGroups);
      expect(groupHandlers.getGroups).toHaveBeenCalledWith(
        'ALL',
        '',
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
      const mockGroup = mockGroups[0];
      (groupHandlers.getGroupById as jest.Mock).mockResolvedValue(mockGroup);

      const request = new NextRequest('https://example.com/api/admin/groups/group-1');
      const params = { id: 'group-1' };
      const response = await adminGroupDetailGet(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.group).toEqual(mockGroup);
      expect(groupHandlers.getGroupById).toHaveBeenCalledWith('group-1');
    });

    it('should return 404 when group is not found', async () => {
      (groupHandlers.getGroupById as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('https://example.com/api/admin/groups/non-existent');
      const params = { id: 'non-existent' };
      const response = await adminGroupDetailGet(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Group not found');
    });

    it('should handle errors properly', async () => {
      (groupHandlers.getGroupById as jest.Mock).mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('https://example.com/api/admin/groups/group-1');
      const params = { id: 'group-1' };
      const response = await adminGroupDetailGet(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch group');
    });
  });

  describe('POST /api/groups/submit', () => {
    it('should create a new group successfully', async () => {
      const newGroup = {
        id: 'new-group',
        name: 'New Group',
        slug: 'new-group',
        description: 'New description',
        status: 'NEW',
        createdAt: new Date(),
        updatedAt: new Date(),
        logoUrl: null
      };
      
      (groupHandlers.createGroup as jest.Mock).mockResolvedValue(newGroup);
      
      const requestBody = {
        name: 'New Group',
        description: 'New description',
        responsiblePersons: [
          {
            firstName: 'Jane',
            lastName: 'Doe',
            email: 'jane@example.com'
          }
        ]
      };
      
      const request = new NextRequest('https://example.com/api/groups/submit', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });
      
      const response = await groupsSubmitPost(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.group.id).toBe('new-group');
      expect(data.group.name).toBe('New Group');
      
      expect(groupHandlers.createGroup).toHaveBeenCalledWith({
        name: 'New Group',
        description: 'New description',
        responsiblePersons: [
          {
            firstName: 'Jane',
            lastName: 'Doe',
            email: 'jane@example.com'
          }
        ]
      });
    });
    
    it('should handle validation errors', async () => {
      (groupHandlers.createGroup as jest.Mock).mockRejectedValue(
        new Error('Group name must be between 3 and 100 characters')
      );
      
      const requestBody = {
        name: 'A', // Too short
        description: 'New description',
        responsiblePersons: [
          {
            firstName: 'Jane',
            lastName: 'Doe',
            email: 'jane@example.com'
          }
        ]
      };
      
      const request = new NextRequest('https://example.com/api/groups/submit', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });
      
      const response = await groupsSubmitPost(request);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Group name must be between 3 and 100 characters');
    });
    
    it('should handle unexpected errors', async () => {
      (groupHandlers.createGroup as jest.Mock).mockRejectedValue(
        new Error('Unexpected database error')
      );
      
      const requestBody = {
        name: 'New Group',
        description: 'New description',
        responsiblePersons: [
          {
            firstName: 'Jane',
            lastName: 'Doe',
            email: 'jane@example.com'
          }
        ]
      };
      
      const request = new NextRequest('https://example.com/api/groups/submit', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });
      
      const response = await groupsSubmitPost(request);
      const data = await response.json();
      
      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to submit group request');
    });
  });
});