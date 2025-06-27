import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import {
  createGroup,
  getGroups,
  getGroupById,
  updateGroupStatus,
  createStatusReport,
  updateStatusReportStatus
} from '../lib/group-handlers';
import prisma from '../lib/prisma';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('Group Database Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
  });
  
  describe('createGroup', () => {
    it('should create a group with responsible persons', async () => {
      const mockGroup = {
        id: 'group-123',
        name: 'Test Group',
        slug: 'test-group-1234',
        description: 'Test description that is long enough for validation.',
        logoUrl: null,
        status: 'NEW',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const mockResponsiblePerson = {
        id: 'person-123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        groupId: 'group-123'
      };
      
      // Mock transaction implementation
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          group: {
            create: jest.fn().mockResolvedValue(mockGroup)
          },
          responsiblePerson: {
            create: jest.fn().mockResolvedValue(mockResponsiblePerson)
          }
        };
        return callback(tx as unknown as typeof prisma);
      });
      
      const groupData = {
        name: 'Test Group',
        description: 'Test description that is long enough for validation.',
        responsiblePersons: [
          {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com'
          }
        ]
      };
      
      const result = await createGroup(groupData);
      
      expect(result).toEqual(expect.objectContaining({
        id: 'group-123',
        name: 'Test Group',
        status: 'NEW'
      }));
      
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
    
    it('should throw an error for invalid group data', async () => {
      const invalidData = {
        name: 'Test Group',
        description: '', // Empty description should fail validation
        responsiblePersons: [
          {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com'
          }
        ]
      };
      
      await expect(createGroup(invalidData)).rejects.toThrow('Group description is required');
    });
  });
  
  describe('getGroups', () => {
    it('should fetch groups with filters', async () => {
      const mockGroups = [
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
      ];
      
      mockPrisma.group.count.mockResolvedValue(1);
      mockPrisma.group.findMany.mockResolvedValue(mockGroups);
      
      const result = await getGroups('ACTIVE');
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toBe('Test Group');
      expect(result.totalItems).toBe(1);
      
      expect(mockPrisma.group.count).toHaveBeenCalledWith({
        where: { status: 'ACTIVE' }
      });
      
      expect(mockPrisma.group.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'ACTIVE' },
          orderBy: { name: 'asc' }
        })
      );
    });
  });
  
  describe('getGroupById', () => {
    it('should fetch a group by ID with related data', async () => {
      const mockGroup = {
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
      };
      
      mockPrisma.group.findUnique.mockResolvedValue(mockGroup);
      
      const result = await getGroupById('group-123');
      
      expect(result).toEqual(expect.objectContaining({
        id: 'group-123',
        name: 'Test Group'
      }));
      
      expect(mockPrisma.group.findUnique).toHaveBeenCalledWith({
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
      const mockUpdatedGroup = {
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
      };
      
      mockPrisma.group.update.mockResolvedValue(mockUpdatedGroup);
      
      const result = await updateGroupStatus('group-123', 'ACTIVE');
      
      expect(result).toEqual(expect.objectContaining({
        id: 'group-123',
        status: 'ACTIVE'
      }));
      
      expect(mockPrisma.group.update).toHaveBeenCalledWith({
        where: { id: 'group-123' },
        data: { status: 'ACTIVE' },
        include: { responsiblePersons: true }
      });
    });
  });
  
  describe('createStatusReport', () => {
    it('should create a status report for an active group', async () => {
      const mockGroup = {
        id: 'group-123',
        name: 'Test Group',
        slug: 'test-group-1234',
        description: 'Test description',
        logoUrl: null,
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const mockStatusReport = {
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
      };
      
      mockPrisma.group.findUnique.mockResolvedValue(mockGroup);
      mockPrisma.statusReport.create.mockResolvedValue(mockStatusReport);
      
      const reportData = {
        groupId: 'group-123',
        title: 'Test Report',
        content: 'Test content',
        reporterFirstName: 'John',
        reporterLastName: 'Doe'
      };
      
      const result = await createStatusReport(reportData);
      
      expect(result).toEqual(expect.objectContaining({
        id: 'report-123',
        title: 'Test Report',
        status: 'NEW'
      }));
      
      expect(mockPrisma.group.findUnique).toHaveBeenCalledWith({
        where: { id: 'group-123', status: 'ACTIVE' }
      });
      
      expect(mockPrisma.statusReport.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'Test Report',
          content: 'Test content',
          status: 'NEW',
          groupId: 'group-123'
        })
      });
    });
    
    it('should throw an error if the group does not exist or is not active', async () => {
      mockPrisma.group.findUnique.mockResolvedValue(null);
      
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
      const mockUpdatedReport = {
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
      };
      
      mockPrisma.statusReport.update.mockResolvedValue(mockUpdatedReport);
      
      const result = await updateStatusReportStatus('report-123', 'ACTIVE');
      
      expect(result).toEqual(expect.objectContaining({
        id: 'report-123',
        status: 'ACTIVE'
      }));
      
      expect(mockPrisma.statusReport.update).toHaveBeenCalledWith({
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