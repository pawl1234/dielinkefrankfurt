// Mock dependencies - must be done before imports
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    newsletter: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    newsletterItem: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/lib/newsletter-template', () => ({
  getDefaultNewsletterSettings: jest.fn(() => ({
    headerLogo: '/images/logo.png',
    headerBanner: '/images/banner.png',
    footerText: '',
    testEmailRecipients: [],
    recipientLists: [],
    unsubscribeLink: '',
    chunkSize: 50,
    chunkDelayMs: 1000,
    batchSize: 10,
    batchDelay: 60000,
    fromEmail: 'noreply@example.com',
    fromName: 'Newsletter',
    replyToEmail: 'contact@example.com',
    subjectTemplate: 'Newsletter - {{date}}',
    emailSalt: undefined,
    chunkDelay: 5000,
    emailTimeout: 30000,
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 30000,
    maxConnections: 5,
    maxMessages: 100,
    maxRetries: 3,
    maxBackoffDelay: 60000,
    retryChunkSizes: [10, 5, 1],
  })),
}));

import {
  getNewsletterSettings,
  updateNewsletterSettings,
  getNewsletterById,
  listNewsletters,
} from '@/lib/newsletter-service';
import { 
  NewsletterNotFoundError,
} from '@/lib/errors';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { getDefaultNewsletterSettings } from '@/lib/newsletter-template';
import { createMockNewsletter } from '../../factories/newsletter.factory';

// Get mocked modules
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('Newsletter Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Note: The settings cache in newsletter-service.ts will persist between tests
    // This is a limitation of the module-level cache approach
  });

  describe('getNewsletterSettings', () => {
    // Note: These tests may be affected by cache persistence between tests
    // The first test that runs will populate the cache
    
    test('should fetch settings from database and cache them', async () => {
      const mockSettings = {
        id: '1',
        headerLogo: '/custom-logo.png',
        footerText: 'Custom footer',
        chunkSize: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      mockPrisma.newsletter.findFirst.mockResolvedValue(mockSettings);
      
      const settings = await getNewsletterSettings();
      
      expect(mockPrisma.newsletter.findFirst).toHaveBeenCalledTimes(1);
      expect(logger.info).toHaveBeenCalledWith('Newsletter settings loaded and cached from database');
      expect(settings.headerLogo).toBe('/custom-logo.png');
      expect(settings.footerText).toBe('Custom footer');
      expect(settings.chunkSize).toBe(100);
    });

    test('should create default settings if none exist', async () => {
      mockPrisma.newsletter.findFirst.mockResolvedValue(null);
      
      const defaultSettings = getDefaultNewsletterSettings();
      const createdSettings = { ...defaultSettings, id: 'new-1', createdAt: new Date(), updatedAt: new Date() };
      mockPrisma.newsletter.create.mockResolvedValue(createdSettings);
      
      const settings = await getNewsletterSettings();
      
      expect(mockPrisma.newsletter.create).toHaveBeenCalledWith({
        data: defaultSettings
      });
      expect(logger.info).toHaveBeenCalledWith('Newsletter settings created and cached');
      expect(settings).toEqual(createdSettings);
    });

    test('should return defaults if creation fails', async () => {
      mockPrisma.newsletter.findFirst.mockResolvedValue(null);
      mockPrisma.newsletter.create.mockRejectedValue(new Error('Database error'));
      
      const settings = await getNewsletterSettings();
      
      expect(logger.warn).toHaveBeenCalled();
      expect(settings).toEqual(getDefaultNewsletterSettings());
    });

    test('should cache and return defaults on database error', async () => {
      mockPrisma.newsletter.findFirst.mockRejectedValue(new Error('Connection failed'));
      
      const settings = await getNewsletterSettings();
      
      expect(logger.error).toHaveBeenCalledWith(expect.any(Error), {
        module: 'newsletter-service',
        context: { operation: 'getNewsletterSettings' }
      });
      expect(settings).toEqual(getDefaultNewsletterSettings());
    });
  });

  describe('updateNewsletterSettings', () => {
    test('should update existing settings and invalidate cache', async () => {
      const existingSettings = {
        id: '1',
        headerLogo: '/old-logo.png',
        footerText: 'Old footer',
      };
      
      const updatedData = {
        headerLogo: '/new-logo.png',
        footerText: 'New footer',
      };
      
      const updatedSettings = {
        ...existingSettings,
        ...updatedData,
        updatedAt: new Date(),
      };
      
      mockPrisma.newsletter.findFirst.mockResolvedValue(existingSettings);
      mockPrisma.newsletter.update.mockResolvedValue(updatedSettings);
      
      const result = await updateNewsletterSettings(updatedData);
      
      expect(mockPrisma.newsletter.update).toHaveBeenCalledWith({
        where: { id: existingSettings.id },
        data: expect.objectContaining({
          headerLogo: '/new-logo.png',
          footerText: 'New footer',
        })
      });
      expect(logger.info).toHaveBeenCalledWith('Newsletter settings updated, cache invalidated');
      expect(result).toEqual(updatedSettings);
    });

    test('should create new settings if none exist', async () => {
      mockPrisma.newsletter.findFirst.mockResolvedValue(null);
      
      const newData = {
        footerText: 'New footer',
      };
      
      const defaultSettings = getDefaultNewsletterSettings();
      const createdSettings = {
        ...defaultSettings,
        ...newData,
        id: 'new-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      mockPrisma.newsletter.create.mockResolvedValue(createdSettings);
      
      const result = await updateNewsletterSettings(newData);
      
      expect(mockPrisma.newsletter.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          footerText: 'New footer',
          headerLogo: defaultSettings.headerLogo,
        })
      });
      expect(result).toEqual(createdSettings);
    });

    test('should throw error if update data is missing', async () => {
      await expect(updateNewsletterSettings(null as unknown as Partial<Record<string, unknown>>)).rejects.toThrow();
    });
  });

  describe('getNewsletterById', () => {
    test('should retrieve newsletter by ID successfully', async () => {
      const mockNewsletter = createMockNewsletter({
        id: 'newsletter-123',
        subject: 'Test Newsletter',
        status: 'draft',
      });
      
      mockPrisma.newsletterItem.findUnique.mockResolvedValue(mockNewsletter);
      
      const result = await getNewsletterById('newsletter-123');
      
      expect(mockPrisma.newsletterItem.findUnique).toHaveBeenCalledWith({
        where: { id: 'newsletter-123' }
      });
      expect(logger.debug).toHaveBeenCalledWith('Newsletter retrieved by ID', {
        context: {
          id: 'newsletter-123',
          subject: 'Test Newsletter',
          status: 'draft',
        }
      });
      expect(result).toEqual(mockNewsletter);
    });

    test('should throw NewsletterNotFoundError if newsletter does not exist', async () => {
      mockPrisma.newsletterItem.findUnique.mockResolvedValue(null);
      
      await expect(getNewsletterById('non-existent-id')).rejects.toThrow(NewsletterNotFoundError);
      await expect(getNewsletterById('non-existent-id')).rejects.toThrow('Newsletter with ID non-existent-id not found');
    });

    test('should handle database errors properly', async () => {
      const dbError = new Error('Database connection failed');
      mockPrisma.newsletterItem.findUnique.mockRejectedValue(dbError);
      
      await expect(getNewsletterById('newsletter-123')).rejects.toThrow();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('listNewsletters', () => {
    test('should list newsletters with default pagination', async () => {
      const mockNewsletters = [
        createMockNewsletter({ id: '1', subject: 'Newsletter 1' }),
        createMockNewsletter({ id: '2', subject: 'Newsletter 2' }),
      ];
      
      mockPrisma.newsletterItem.count.mockResolvedValue(2);
      mockPrisma.newsletterItem.findMany.mockResolvedValue(mockNewsletters);
      
      const result = await listNewsletters();
      
      expect(mockPrisma.newsletterItem.count).toHaveBeenCalledWith({
        where: {}
      });
      expect(mockPrisma.newsletterItem.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 10,
        orderBy: [{ createdAt: 'desc' }]
      });
      expect(result).toEqual({
        items: mockNewsletters,
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    test('should filter newsletters by status', async () => {
      const mockNewsletters = [
        createMockNewsletter({ id: '1', status: 'sent' }),
      ];
      
      mockPrisma.newsletterItem.count.mockResolvedValue(1);
      mockPrisma.newsletterItem.findMany.mockResolvedValue(mockNewsletters);
      
      const result = await listNewsletters({ status: 'sent' });
      
      expect(mockPrisma.newsletterItem.count).toHaveBeenCalledWith({
        where: { status: 'sent' }
      });
      expect(mockPrisma.newsletterItem.findMany).toHaveBeenCalledWith({
        where: { status: 'sent' },
        skip: 0,
        take: 10,
        orderBy: [{ createdAt: 'desc' }]
      });
      expect(result.items).toHaveLength(1);
      expect(result.items[0].status).toBe('sent');
    });

    test('should handle pagination correctly', async () => {
      const mockNewsletters = Array.from({ length: 5 }, (_, i) => 
        createMockNewsletter({ id: `${i + 1}`, subject: `Newsletter ${i + 1}` })
      );
      
      mockPrisma.newsletterItem.count.mockResolvedValue(25);
      mockPrisma.newsletterItem.findMany.mockResolvedValue(mockNewsletters);
      
      const result = await listNewsletters({ page: 3, limit: 5 });
      
      expect(mockPrisma.newsletterItem.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 10, // (page 3 - 1) * limit 5
        take: 5,
        orderBy: [{ createdAt: 'desc' }]
      });
      expect(result).toEqual({
        items: mockNewsletters,
        total: 25,
        page: 3,
        limit: 5,
        totalPages: 5,
      });
    });

    test('should validate and limit pagination parameters', async () => {
      mockPrisma.newsletterItem.count.mockResolvedValue(0);
      mockPrisma.newsletterItem.findMany.mockResolvedValue([]);
      
      // Test invalid page (negative)
      await listNewsletters({ page: -1, limit: 10 });
      expect(mockPrisma.newsletterItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0 }) // Should use page 1
      );
      
      // Test limit exceeding maximum
      await listNewsletters({ page: 1, limit: 100 });
      expect(mockPrisma.newsletterItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 50 }) // Should cap at 50
      );
    });

    test('should handle database errors properly', async () => {
      const dbError = new Error('Database query failed');
      mockPrisma.newsletterItem.count.mockRejectedValue(dbError);
      
      await expect(listNewsletters()).rejects.toThrow();
      expect(logger.error).toHaveBeenCalled();
    });

    test('should log successful listing', async () => {
      mockPrisma.newsletterItem.count.mockResolvedValue(15);
      mockPrisma.newsletterItem.findMany.mockResolvedValue([]);
      
      await listNewsletters({ page: 2, limit: 10, status: 'draft' });
      
      expect(logger.debug).toHaveBeenCalledWith('Newsletters listed successfully', {
        context: {
          page: 2,
          limit: 10,
          total: 15,
          totalPages: 2,
          status: 'draft',
        }
      });
    });
  });
});