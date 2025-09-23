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
        id: 'c123456789012345678901234',
        name: 'Test Group',
        slug: 'test-group-1234',
        description: 'Test description that is long enough for validation. This meets the 50 character minimum requirement.',
        logoUrl: null,
        status: 'NEW',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockResponsiblePerson = {
        id: 'c123456789012345678901235',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        groupId: 'c123456789012345678901234'
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
        id: 'c123456789012345678901234',
        name: 'Test Group',
        status: 'NEW'
      }));
      
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
    
    it('should throw an error for invalid group data', async () => {
      const invalidData = {
        name: 'Test Group',
        description: 'Too short', // Description shorter than 50 characters should fail validation
        responsiblePersons: [
          {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com'
          }
        ]
      };

      await expect(createGroup(invalidData)).rejects.toThrow('Beschreibung muss mindestens 50 Zeichen lang sein');
    });
  });
  
  describe('getGroups', () => {
    it('should fetch groups with filters', async () => {
      const mockGroups = [
        {
          id: 'c123456789012345678901234',
          name: 'Test Group',
          slug: 'test-group-1234',
          description: 'Test description that meets the minimum character requirements for validation.',
          logoUrl: null,
          status: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date(),
          responsiblePersons: [
            {
              id: 'c123456789012345678901235',
              firstName: 'John',
              lastName: 'Doe',
              email: 'john.doe@example.com',
              groupId: 'c123456789012345678901234'
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
        id: 'c123456789012345678901234',
        name: 'Test Group',
        slug: 'test-group-1234',
        description: 'Test description that meets the minimum character requirements for validation.',
        logoUrl: null,
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
        responsiblePersons: [
          {
            id: 'c123456789012345678901235',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            groupId: 'c123456789012345678901234'
          }
        ],
        statusReports: []
      };
      
      mockPrisma.group.findUnique.mockResolvedValue(mockGroup);

      const result = await getGroupById('c123456789012345678901234');

      expect(result).toEqual(expect.objectContaining({
        id: 'c123456789012345678901234',
        name: 'Test Group'
      }));

      expect(mockPrisma.group.findUnique).toHaveBeenCalledWith({
        where: { id: 'c123456789012345678901234' },
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
        id: 'c123456789012345678901234',
        name: 'Test Group',
        slug: 'test-group-1234',
        description: 'Test description that meets the minimum character requirements for validation.',
        logoUrl: null,
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
        responsiblePersons: [
          {
            id: 'c123456789012345678901235',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            groupId: 'c123456789012345678901234'
          }
        ]
      };
      
      mockPrisma.group.update.mockResolvedValue(mockUpdatedGroup);

      const result = await updateGroupStatus('c123456789012345678901234', 'ACTIVE');

      expect(result).toEqual(expect.objectContaining({
        id: 'c123456789012345678901234',
        status: 'ACTIVE'
      }));

      expect(mockPrisma.group.update).toHaveBeenCalledWith({
        where: { id: 'c123456789012345678901234' },
        data: { status: 'ACTIVE' },
        include: { responsiblePersons: true }
      });
    });
  });
  
  describe('createStatusReport', () => {
    it('should create a status report for an active group', async () => {
      const mockGroup = {
        id: 'c123456789012345678901234',
        name: 'Test Group',
        slug: 'test-group-1234',
        description: 'Test description that meets the minimum character requirements for validation.',
        logoUrl: null,
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockStatusReport = {
        id: 'c123456789012345678901236',
        title: 'Test Report',
        content: 'Test content for the status report',
        reporterFirstName: 'John',
        reporterLastName: 'Doe',
        fileUrls: null,
        status: 'NEW',
        createdAt: new Date(),
        updatedAt: new Date(),
        groupId: 'c123456789012345678901234'
      };
      
      mockPrisma.group.findUnique.mockResolvedValue(mockGroup);
      mockPrisma.statusReport.create.mockResolvedValue(mockStatusReport);
      
      const reportData = {
        groupId: 'c123456789012345678901234',
        title: 'Test Report',
        content: 'Test content for the status report',
        reporterFirstName: 'John',
        reporterLastName: 'Doe'
      };
      
      const result = await createStatusReport(reportData);
      
      expect(result).toEqual(expect.objectContaining({
        id: 'c123456789012345678901236',
        title: 'Test Report',
        status: 'NEW'
      }));

      expect(mockPrisma.group.findUnique).toHaveBeenCalledWith({
        where: { id: 'c123456789012345678901234' }
      });

      expect(mockPrisma.statusReport.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'Test Report',
          content: 'Test content for the status report',
          status: 'NEW',
          groupId: 'c123456789012345678901234'
        })
      });
    });
    
    it('should throw an error if the group does not exist or is not active', async () => {
      mockPrisma.group.findUnique.mockResolvedValue(null);

      const reportData = {
        groupId: 'c123456789012345678901234',
        title: 'Test Report',
        content: 'Test content for the status report',
        reporterFirstName: 'John',
        reporterLastName: 'Doe'
      };

      await expect(createStatusReport(reportData)).rejects.toThrow('Group not found or not active');
    });
  });
  
  describe('updateStatusReportStatus', () => {
    it('should update a status report status and send email on activation', async () => {
      const mockUpdatedReport = {
        id: 'c123456789012345678901236',
        title: 'Test Report',
        content: 'Test content for the status report',
        reporterFirstName: 'John',
        reporterLastName: 'Doe',
        fileUrls: null,
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
        groupId: 'c123456789012345678901234',
        group: {
          id: 'c123456789012345678901234',
          name: 'Test Group',
          slug: 'test-group-1234',
          description: 'Test description that meets the minimum character requirements for validation.',
          logoUrl: null,
          status: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date(),
          responsiblePersons: [
            {
              id: 'c123456789012345678901235',
              firstName: 'John',
              lastName: 'Doe',
              email: 'john.doe@example.com',
              groupId: 'c123456789012345678901234'
            }
          ]
        }
      };
      
      mockPrisma.statusReport.update.mockResolvedValue(mockUpdatedReport);

      const result = await updateStatusReportStatus('c123456789012345678901236', 'ACTIVE');

      expect(result).toEqual(expect.objectContaining({
        id: 'c123456789012345678901236',
        status: 'ACTIVE'
      }));

      expect(mockPrisma.statusReport.update).toHaveBeenCalledWith({
        where: { id: 'c123456789012345678901236' },
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