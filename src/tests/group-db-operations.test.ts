import {
  createGroup,
  getGroups,
  getGroupById,
  updateGroupStatus,
  createStatusReport,
  getStatusReports,
  updateStatusReportStatus
} from '../lib/group-handlers';
import prisma from '../lib/prisma';

// Mock the prisma client
jest.mock('../lib/prisma', () => ({
  $transaction: jest.fn((callback) => callback({
    group: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    },
    responsiblePerson: {
      create: jest.fn(),
      deleteMany: jest.fn()
    },
    statusReport: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    }
  })),
  group: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  },
  responsiblePerson: {
    create: jest.fn(),
    deleteMany: jest.fn()
  },
  statusReport: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  }
}));

// Mock the email sending function
jest.mock('../lib/email', () => ({
  sendEmail: jest.fn().mockResolvedValue({ success: true })
}));

// Mock the Vercel blob functions
jest.mock('@vercel/blob', () => ({
  put: jest.fn().mockResolvedValue({ url: 'https://example.com/test.jpg' }),
  del: jest.fn().mockResolvedValue({ success: true })
}));

describe('Group Database Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('createGroup', () => {
    it('should create a group with responsible persons', async () => {
      // Mock implementation for this test
      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        const tx = {
          group: {
            create: jest.fn().mockResolvedValue({
              id: 'group-123',
              name: 'Test Group',
              slug: 'test-group-1234',
              description: 'Test description',
              logoUrl: null,
              status: 'NEW',
              createdAt: new Date(),
              updatedAt: new Date()
            })
          },
          responsiblePerson: {
            create: jest.fn().mockResolvedValue({
              id: 'person-123',
              firstName: 'John',
              lastName: 'Doe',
              email: 'john.doe@example.com',
              groupId: 'group-123'
            })
          }
        };
        
        return callback(tx);
      });
      
      const groupData = {
        name: 'Test Group',
        description: 'Test description that is long enough to meet the minimum requirement of 50 characters for validation.',
        responsiblePersons: [
          {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com'
          }
        ]
      };
      
      const result = await createGroup(groupData);
      
      // Verify the result
      expect(result).toEqual(expect.objectContaining({
        id: 'group-123',
        name: 'Test Group',
        status: 'NEW'
      }));
      
      // Verify transaction was used
      expect(prisma.$transaction).toHaveBeenCalled();
    });
    
    it('should throw an error for invalid group data', async () => {
      const invalidData = {
        name: 'Test Group',
        description: 'Too short',
        responsiblePersons: [
          {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com'
          }
        ]
      };
      
      await expect(createGroup(invalidData)).rejects.toThrow('Group description must be between 50 and 5000 characters');
    });
  });
  
  describe('getGroups', () => {
    it('should fetch groups with filters', async () => {
      // Mock implementation
      (prisma.group.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'group-123',
          name: 'Test Group',
          slug: 'test-group-1234',
          description: 'Test description',
          logoUrl: null,
          status: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date(),
          responsiblePersons: [
            {
              id: 'person-123',
              firstName: 'John',
              lastName: 'Doe',
              email: 'john.doe@example.com',
              groupId: 'group-123'
            }
          ]
        }
      ]);
      
      const result = await getGroups('ACTIVE');
      
      // Verify the result
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Test Group');
      
      // Verify prisma was called with correct parameters
      expect(prisma.group.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'ACTIVE' },
          orderBy: { name: 'asc' }
        })
      );
    });
  });
  
  describe('getGroupById', () => {
    it('should fetch a group by ID with related data', async () => {
      // Mock implementation
      (prisma.group.findUnique as jest.Mock).mockResolvedValue({
        id: 'group-123',
        name: 'Test Group',
        slug: 'test-group-1234',
        description: 'Test description',
        logoUrl: null,
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
        responsiblePersons: [
          {
            id: 'person-123',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            groupId: 'group-123'
          }
        ],
        statusReports: []
      });
      
      const result = await getGroupById('group-123');
      
      // Verify the result
      expect(result).toEqual(expect.objectContaining({
        id: 'group-123',
        name: 'Test Group'
      }));
      
      // Verify prisma was called with correct parameters
      expect(prisma.group.findUnique).toHaveBeenCalledWith({
        where: { id: 'group-123' },
        include: expect.objectContaining({
          responsiblePersons: true,
          statusReports: expect.any(Object)
        })
      });
    });
  });
  
  describe('updateGroupStatus', () => {
    it('should update a group status and send email on activation', async () => {
      // Mock implementation
      (prisma.group.update as jest.Mock).mockResolvedValue({
        id: 'group-123',
        name: 'Test Group',
        slug: 'test-group-1234',
        description: 'Test description',
        logoUrl: null,
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
        responsiblePersons: [
          {
            id: 'person-123',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            groupId: 'group-123'
          }
        ]
      });
      
      const result = await updateGroupStatus('group-123', 'ACTIVE');
      
      // Verify the result
      expect(result).toEqual(expect.objectContaining({
        id: 'group-123',
        status: 'ACTIVE'
      }));
      
      // Verify prisma was called with correct parameters
      expect(prisma.group.update).toHaveBeenCalledWith({
        where: { id: 'group-123' },
        data: { status: 'ACTIVE' },
        include: { responsiblePersons: true }
      });
    });
  });
  
  describe('createStatusReport', () => {
    it('should create a status report for an active group', async () => {
      // Mock implementation
      (prisma.group.findUnique as jest.Mock).mockResolvedValue({
        id: 'group-123',
        name: 'Test Group',
        slug: 'test-group-1234',
        description: 'Test description',
        logoUrl: null,
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      (prisma.statusReport.create as jest.Mock).mockResolvedValue({
        id: 'report-123',
        title: 'Test Report',
        content: 'Test content',
        reporterFirstName: 'John',
        reporterLastName: 'Doe',
        fileUrls: null,
        status: 'NEW',
        createdAt: new Date(),
        updatedAt: new Date(),
        groupId: 'group-123'
      });
      
      const reportData = {
        groupId: 'group-123',
        title: 'Test Report',
        content: 'Test content',
        reporterFirstName: 'John',
        reporterLastName: 'Doe'
      };
      
      const result = await createStatusReport(reportData);
      
      // Verify the result
      expect(result).toEqual(expect.objectContaining({
        id: 'report-123',
        title: 'Test Report',
        status: 'NEW'
      }));
      
      // Verify prisma calls
      expect(prisma.group.findUnique).toHaveBeenCalledWith({
        where: { id: 'group-123', status: 'ACTIVE' }
      });
      
      expect(prisma.statusReport.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'Test Report',
          content: 'Test content',
          status: 'NEW',
          groupId: 'group-123'
        })
      });
    });
    
    it('should throw an error if the group does not exist or is not active', async () => {
      // Mock implementation
      (prisma.group.findUnique as jest.Mock).mockResolvedValue(null);
      
      const reportData = {
        groupId: 'invalid-group',
        title: 'Test Report',
        content: 'Test content',
        reporterFirstName: 'John',
        reporterLastName: 'Doe'
      };
      
      await expect(createStatusReport(reportData)).rejects.toThrow('Group not found or not active');
    });
  });
  
  describe('updateStatusReportStatus', () => {
    it('should update a status report status and send email on activation', async () => {
      // Mock implementation
      (prisma.statusReport.update as jest.Mock).mockResolvedValue({
        id: 'report-123',
        title: 'Test Report',
        content: 'Test content',
        reporterFirstName: 'John',
        reporterLastName: 'Doe',
        fileUrls: null,
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
        groupId: 'group-123',
        group: {
          id: 'group-123',
          name: 'Test Group',
          slug: 'test-group-1234',
          description: 'Test description',
          logoUrl: null,
          status: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date(),
          responsiblePersons: [
            {
              id: 'person-123',
              firstName: 'John',
              lastName: 'Doe',
              email: 'john.doe@example.com',
              groupId: 'group-123'
            }
          ]
        }
      });
      
      const result = await updateStatusReportStatus('report-123', 'ACTIVE');
      
      // Verify the result
      expect(result).toEqual(expect.objectContaining({
        id: 'report-123',
        status: 'ACTIVE'
      }));
      
      // Verify prisma was called with correct parameters
      expect(prisma.statusReport.update).toHaveBeenCalledWith({
        where: { id: 'report-123' },
        data: { status: 'ACTIVE' },
        include: expect.objectContaining({
          group: expect.objectContaining({
            include: { responsiblePersons: true }
          })
        })
      });
    });
  });
});