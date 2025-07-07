import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import {
  createAntrag,
  getAntragById,
  updateAntrag,
  deleteAntrag,
  listAntraege,
  validateAntragData,
  updateAntragDecision
} from '@/lib/db/antrag-operations';
import {
  getAntragConfiguration,
  updateAntragConfiguration,
  validateEmailList,
  getRecipientEmails
} from '@/lib/db/antrag-config-operations';
import prisma from '@/lib/prisma';
import { AntragStatus } from '@prisma/client';
import type { AntragPurposes } from '@/types/api-types';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('Antrag Database Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('validateAntragData', () => {
    const validData = {
      firstName: 'Max',
      lastName: 'Mustermann',
      email: 'max@example.com',
      title: 'Test Antrag',
      summary: 'This is a test summary for the Antrag',
      purposes: {
        zuschuss: {
          enabled: true,
          amount: 1000
        }
      } as AntragPurposes
    };

    it('should validate correct data', () => {
      const result = validateAntragData(validData);
      expect(result).toBeNull();
    });

    it('should validate first name', () => {
      expect(validateAntragData({ ...validData, firstName: 'A' }))
        .toBe('Vorname muss zwischen 2 und 50 Zeichen lang sein');
      expect(validateAntragData({ ...validData, firstName: 'A'.repeat(51) }))
        .toBe('Vorname muss zwischen 2 und 50 Zeichen lang sein');
    });

    it('should validate last name', () => {
      expect(validateAntragData({ ...validData, lastName: 'B' }))
        .toBe('Nachname muss zwischen 2 und 50 Zeichen lang sein');
      expect(validateAntragData({ ...validData, lastName: 'B'.repeat(51) }))
        .toBe('Nachname muss zwischen 2 und 50 Zeichen lang sein');
    });

    it('should validate email', () => {
      expect(validateAntragData({ ...validData, email: 'invalid' }))
        .toBe('Gültige E-Mail-Adresse erforderlich');
      expect(validateAntragData({ ...validData, email: 'test@' }))
        .toBe('Gültige E-Mail-Adresse erforderlich');
    });

    it('should validate title', () => {
      expect(validateAntragData({ ...validData, title: 'Hi' }))
        .toBe('Titel muss zwischen 3 und 200 Zeichen lang sein');
      expect(validateAntragData({ ...validData, title: 'T'.repeat(201) }))
        .toBe('Titel muss zwischen 3 und 200 Zeichen lang sein');
    });

    it('should validate summary', () => {
      expect(validateAntragData({ ...validData, summary: 'Too short' }))
        .toBe('Zusammenfassung muss zwischen 10 und 300 Zeichen lang sein');
      expect(validateAntragData({ ...validData, summary: 'S'.repeat(301) }))
        .toBe('Zusammenfassung muss zwischen 10 und 300 Zeichen lang sein');
    });

    it('should require at least one purpose', () => {
      expect(validateAntragData({ ...validData, purposes: {} as AntragPurposes }))
        .toBe('Mindestens ein Zweck muss ausgewählt werden');
    });

    it('should validate zuschuss amount', () => {
      const data = {
        ...validData,
        purposes: {
          zuschuss: { enabled: true, amount: 0 }
        } as AntragPurposes
      };
      expect(validateAntragData(data))
        .toBe('Betrag muss zwischen 1 und 999.999 Euro liegen');
    });

    it('should validate personnel support details', () => {
      const data = {
        ...validData,
        purposes: {
          personelleUnterstuetzung: { enabled: true, details: '' }
        } as AntragPurposes
      };
      expect(validateAntragData(data))
        .toBe('Details zur personellen Unterstützung sind erforderlich');
    });

    it('should validate room booking fields', () => {
      const data = {
        ...validData,
        purposes: {
          raumbuchung: { 
            enabled: true, 
            location: '',
            numberOfPeople: 10,
            details: 'Details'
          }
        } as AntragPurposes
      };
      expect(validateAntragData(data))
        .toBe('Ort für Raumbuchung ist erforderlich');
    });
  });

  describe('createAntrag', () => {
    it('should create an Antrag with valid data', async () => {
      const antragData = {
        firstName: 'Max',
        lastName: 'Mustermann',
        email: 'max@example.com',
        title: 'Test Antrag',
        summary: 'This is a test summary',
        purposes: {
          zuschuss: { enabled: true, amount: 1000 }
        } as AntragPurposes,
        fileUrls: ['https://example.com/file1.pdf']
      };

      const mockCreatedAntrag = {
        id: 'test-id',
        ...antragData,
        purposes: JSON.stringify(antragData.purposes),
        fileUrls: JSON.stringify(antragData.fileUrls),
        status: 'NEU' as AntragStatus,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.antrag.create.mockResolvedValue(mockCreatedAntrag);

      const result = await createAntrag(antragData);

      expect(mockPrisma.antrag.create).toHaveBeenCalledWith({
        data: {
          firstName: 'Max',
          lastName: 'Mustermann',
          email: 'max@example.com',
          title: 'Test Antrag',
          summary: 'This is a test summary',
          purposes: JSON.stringify(antragData.purposes),
          fileUrls: JSON.stringify(antragData.fileUrls),
          status: 'NEU'
        }
      });

      expect(result).toEqual(mockCreatedAntrag);
    });

    it('should throw error for invalid data', async () => {
      const invalidData = {
        firstName: 'M', // Too short
        lastName: 'Mustermann',
        email: 'max@example.com',
        title: 'Test',
        summary: 'Summary text',
        purposes: { zuschuss: { enabled: true, amount: 100 } } as AntragPurposes
      };

      await expect(createAntrag(invalidData)).rejects.toThrow(
        'Vorname muss zwischen 2 und 50 Zeichen lang sein'
      );
      expect(mockPrisma.antrag.create).not.toHaveBeenCalled();
    });
  });

  describe('getAntragById', () => {
    it('should fetch an Antrag by ID', async () => {
      const mockAntrag = {
        id: 'test-id',
        firstName: 'Max',
        lastName: 'Mustermann',
        email: 'max@example.com',
        title: 'Test Antrag',
        summary: 'Summary',
        purposes: JSON.stringify({ zuschuss: { enabled: true, amount: 1000 } }),
        status: 'NEU' as AntragStatus,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.antrag.findUnique.mockResolvedValue(mockAntrag);

      const result = await getAntragById('test-id');

      expect(mockPrisma.antrag.findUnique).toHaveBeenCalledWith({
        where: { id: 'test-id' }
      });
      expect(result).toEqual(mockAntrag);
    });

    it('should return null for non-existent ID', async () => {
      mockPrisma.antrag.findUnique.mockResolvedValue(null);

      const result = await getAntragById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('updateAntrag', () => {
    it('should update an Antrag', async () => {
      const existingAntrag = {
        id: 'test-id',
        firstName: 'Max',
        lastName: 'Mustermann',
        status: 'NEU' as AntragStatus
      };

      const updateData = {
        title: 'Updated Title',
        status: 'AKZEPTIERT' as AntragStatus,
        decisionComment: 'Approved',
        decidedBy: 'admin',
        decidedAt: new Date()
      };

      (mockPrisma.antrag.findUnique).mockResolvedValue(existingAntrag);
      (mockPrisma.antrag.update).mockResolvedValue({
        ...existingAntrag,
        ...updateData
      });

      const result = await updateAntrag('test-id', updateData);

      expect(mockPrisma.antrag.update).toHaveBeenCalledWith({
        where: { id: 'test-id' },
        data: {
          title: 'Updated Title',
          status: 'AKZEPTIERT',
          decisionComment: 'Approved',
          decidedBy: 'admin',
          decidedAt: updateData.decidedAt
        }
      });

      expect(result.title).toBe('Updated Title');
      expect(result.status).toBe('AKZEPTIERT');
    });

    it('should throw error for non-existent Antrag', async () => {
      (mockPrisma.antrag.findUnique).mockResolvedValue(null);

      await expect(updateAntrag('non-existent', { title: 'New' }))
        .rejects.toThrow('Antrag mit ID non-existent nicht gefunden');
    });
  });

  describe('deleteAntrag', () => {
    it('should delete an Antrag and return file URLs', async () => {
      const mockAntrag = {
        id: 'test-id',
        fileUrls: JSON.stringify(['https://example.com/file1.pdf', 'https://example.com/file2.pdf'])
      };

      (mockPrisma.antrag.findUnique).mockResolvedValue(mockAntrag);
      (mockPrisma.antrag.delete).mockResolvedValue(mockAntrag);

      const result = await deleteAntrag('test-id');

      expect(mockPrisma.antrag.delete).toHaveBeenCalledWith({
        where: { id: 'test-id' }
      });
      expect(result.success).toBe(true);
      expect(result.fileUrls).toEqual(['https://example.com/file1.pdf', 'https://example.com/file2.pdf']);
    });

    it('should handle Antrag without files', async () => {
      const mockAntrag = {
        id: 'test-id',
        fileUrls: null
      };

      (mockPrisma.antrag.findUnique).mockResolvedValue(mockAntrag);
      (mockPrisma.antrag.delete).mockResolvedValue(mockAntrag);

      const result = await deleteAntrag('test-id');

      expect(result.success).toBe(true);
      expect(result.fileUrls).toEqual([]);
    });
  });

  describe('listAntraege', () => {
    it('should list Anträge with pagination', async () => {
      const mockAntraege = [
        { id: '1', title: 'Antrag 1', status: 'NEU' },
        { id: '2', title: 'Antrag 2', status: 'AKZEPTIERT' }
      ];

      (mockPrisma.antrag.count).mockResolvedValue(25);
      (mockPrisma.antrag.findMany).mockResolvedValue(mockAntraege);

      const result = await listAntraege({
        page: 2,
        pageSize: 10
      });

      expect(mockPrisma.antrag.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: 'desc' },
        skip: 10,
        take: 10
      });

      expect(result).toEqual({
        items: mockAntraege,
        totalItems: 25,
        page: 2,
        pageSize: 10,
        totalPages: 3
      });
    });

    it('should filter by status', async () => {
      (mockPrisma.antrag.count).mockResolvedValue(5);
      (mockPrisma.antrag.findMany).mockResolvedValue([]);

      await listAntraege({ status: 'NEU' as AntragStatus });

      expect(mockPrisma.antrag.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'NEU' }
        })
      );
    });

    it('should search by multiple fields', async () => {
      (mockPrisma.antrag.count).mockResolvedValue(3);
      (mockPrisma.antrag.findMany).mockResolvedValue([]);

      await listAntraege({ searchTerm: 'test' });

      expect(mockPrisma.antrag.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { title: { contains: 'test', mode: 'insensitive' } },
              { summary: { contains: 'test', mode: 'insensitive' } },
              { firstName: { contains: 'test', mode: 'insensitive' } },
              { lastName: { contains: 'test', mode: 'insensitive' } }
            ]
          }
        })
      );
    });
  });

  describe('updateAntragDecision', () => {
    it('should update decision with all fields', async () => {
      const mockUpdatedAntrag = {
        id: 'test-id',
        status: 'AKZEPTIERT',
        decisionComment: 'Approved for funding',
        decidedBy: 'admin',
        decidedAt: new Date()
      };

      (mockPrisma.antrag.update).mockResolvedValue(mockUpdatedAntrag);

      const result = await updateAntragDecision(
        'test-id',
        'AKZEPTIERT' as AntragStatus,
        'Approved for funding',
        'admin'
      );

      expect(mockPrisma.antrag.update).toHaveBeenCalledWith({
        where: { id: 'test-id' },
        data: {
          status: 'AKZEPTIERT',
          decisionComment: 'Approved for funding',
          decidedBy: 'admin',
          decidedAt: expect.any(Date)
        }
      });

      expect(result).toEqual(mockUpdatedAntrag);
    });
  });
});

describe('Antrag Configuration Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateEmailList', () => {
    it('should validate correct email list', () => {
      expect(validateEmailList('test@example.com')).toBeNull();
      expect(validateEmailList('test1@example.com,test2@example.com')).toBeNull();
      expect(validateEmailList('test1@example.com, test2@example.com, test3@example.com')).toBeNull();
    });

    it('should reject empty email list', () => {
      expect(validateEmailList('')).toBe('Mindestens eine E-Mail-Adresse ist erforderlich');
      expect(validateEmailList('   ')).toBe('Mindestens eine E-Mail-Adresse ist erforderlich');
      expect(validateEmailList(',')).toBe('Mindestens eine E-Mail-Adresse ist erforderlich');
    });

    it('should reject invalid emails', () => {
      expect(validateEmailList('invalid')).toContain('Ungültige E-Mail-Adresse: invalid');
      expect(validateEmailList('test@example.com,invalid@')).toContain('Ungültige E-Mail-Adresse: invalid@');
    });
  });

  describe('getAntragConfiguration', () => {
    it('should return existing configuration', async () => {
      const mockConfig = {
        id: 1,
        recipientEmails: 'test@example.com',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      (mockPrisma.antragConfiguration.findFirst).mockResolvedValue(mockConfig);

      const result = await getAntragConfiguration();

      expect(mockPrisma.antragConfiguration.findFirst).toHaveBeenCalled();
      expect(result).toEqual(mockConfig);
    });

    it('should create default configuration if none exists', async () => {
      const mockNewConfig = {
        id: 1,
        recipientEmails: 'kreisvorstand@die-linke-frankfurt.de',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      (mockPrisma.antragConfiguration.findFirst).mockResolvedValue(null);
      (mockPrisma.antragConfiguration.create).mockResolvedValue(mockNewConfig);

      const result = await getAntragConfiguration();

      expect(mockPrisma.antragConfiguration.create).toHaveBeenCalledWith({
        data: {
          recipientEmails: 'kreisvorstand@die-linke-frankfurt.de'
        }
      });
      expect(result).toEqual(mockNewConfig);
    });
  });

  describe('updateAntragConfiguration', () => {
    it('should update configuration with valid emails', async () => {
      const existingConfig = {
        id: 1,
        recipientEmails: 'old@example.com'
      };

      const updatedConfig = {
        id: 1,
        recipientEmails: 'new1@example.com,new2@example.com'
      };

      (mockPrisma.antragConfiguration.findFirst).mockResolvedValue(existingConfig);
      (mockPrisma.antragConfiguration.update).mockResolvedValue(updatedConfig);

      const result = await updateAntragConfiguration('new1@example.com, new2@example.com');

      expect(mockPrisma.antragConfiguration.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          recipientEmails: 'new1@example.com,new2@example.com'
        }
      });
      expect(result).toEqual(updatedConfig);
    });

    it('should throw error for invalid emails', async () => {
      await expect(updateAntragConfiguration('invalid-email'))
        .rejects.toThrow('Ungültige E-Mail-Adresse: invalid-email');
    });
  });

  describe('getRecipientEmails', () => {
    it('should return emails as array', async () => {
      const mockConfig = {
        id: 1,
        recipientEmails: 'test1@example.com,test2@example.com, test3@example.com'
      };

      (mockPrisma.antragConfiguration.findFirst).mockResolvedValue(mockConfig);

      const result = await getRecipientEmails();

      expect(result).toEqual(['test1@example.com', 'test2@example.com', 'test3@example.com']);
    });
  });
});