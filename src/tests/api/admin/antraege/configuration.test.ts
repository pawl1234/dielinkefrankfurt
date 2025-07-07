import { NextRequest } from 'next/server';
import { GET, PUT } from '@/app/api/admin/antraege/configuration/route';
import prisma from '@/lib/prisma';

// Mock the admin auth
jest.mock('@/lib/api-auth', () => ({
  withAdminAuth: jest.fn((handler) => handler),
}));

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  antragConfiguration: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

// Helper function to create a NextRequest with JSON body
function createRequest(method: 'GET' | 'PUT', body?: any): NextRequest {
  const url = 'http://localhost:3000/api/admin/antraege/configuration';
  const init: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    init.body = JSON.stringify(body);
  }

  return new NextRequest(url, init);
}

describe('/api/admin/antraege/configuration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return existing configuration', async () => {
      const mockConfig = {
        id: 1,
        recipientEmails: 'admin@test.com,kreisvorstand@test.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const expectedData = {
        id: 1,
        recipientEmails: 'admin@test.com,kreisvorstand@test.com',
        createdAt: mockConfig.createdAt.toISOString(),
        updatedAt: mockConfig.updatedAt.toISOString(),
      };

      mockPrisma.antragConfiguration.findFirst.mockResolvedValue(mockConfig);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(expectedData);
      expect(mockPrisma.antragConfiguration.findFirst).toHaveBeenCalledTimes(1);
    });

    it('should create and return default configuration when none exists', async () => {
      const mockCreatedConfig = {
        id: 1,
        recipientEmails: 'admin@die-linke-frankfurt.de,kreisvorstand@die-linke-frankfurt.de',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.antragConfiguration.findFirst.mockResolvedValue(null);
      mockPrisma.antragConfiguration.create.mockResolvedValue(mockCreatedConfig);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe(1);
      expect(data.recipientEmails).toBe('admin@die-linke-frankfurt.de,kreisvorstand@die-linke-frankfurt.de');
      expect(data.createdAt).toBeDefined();
      expect(data.updatedAt).toBeDefined();
      expect(mockPrisma.antragConfiguration.findFirst).toHaveBeenCalledTimes(1);
      expect(mockPrisma.antragConfiguration.create).toHaveBeenCalledWith({
        data: {
          recipientEmails: 'admin@die-linke-frankfurt.de,kreisvorstand@die-linke-frankfurt.de'
        }
      });
    });

    it('should handle database errors', async () => {
      mockPrisma.antragConfiguration.findFirst.mockRejectedValue(new Error('Database error'));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });

  describe('PUT', () => {
    it('should update existing configuration', async () => {
      const existingConfig = {
        id: 1,
        recipientEmails: 'old@test.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedConfig = {
        ...existingConfig,
        recipientEmails: 'new@test.com,another@test.com',
        updatedAt: new Date(),
      };

      mockPrisma.antragConfiguration.findFirst.mockResolvedValue(existingConfig);
      mockPrisma.antragConfiguration.update.mockResolvedValue(updatedConfig);

      const request = createRequest('PUT', {
        recipientEmails: 'new@test.com, another@test.com',
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe(1);
      expect(data.recipientEmails).toBe('new@test.com,another@test.com');
      expect(data.createdAt).toBeDefined();
      expect(data.updatedAt).toBeDefined();
      expect(mockPrisma.antragConfiguration.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { recipientEmails: 'new@test.com, another@test.com' }
      });
    });

    it('should create new configuration when none exists', async () => {
      const newConfig = {
        id: 1,
        recipientEmails: 'new@test.com,another@test.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.antragConfiguration.findFirst.mockResolvedValue(null);
      mockPrisma.antragConfiguration.create.mockResolvedValue(newConfig);

      const request = createRequest('PUT', {
        recipientEmails: 'new@test.com, another@test.com',
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe(newConfig.id);
      expect(data.recipientEmails).toBe(newConfig.recipientEmails);
      expect(data.createdAt).toBeDefined();
      expect(data.updatedAt).toBeDefined();
      expect(mockPrisma.antragConfiguration.create).toHaveBeenCalledWith({
        data: { recipientEmails: 'new@test.com, another@test.com' }
      });
    });

    it('should validate email addresses', async () => {
      const request = createRequest('PUT', {
        recipientEmails: 'invalid-email, another-invalid',
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid email addresses');
      expect(data.details).toEqual([
        'Ungültige E-Mail-Adresse: invalid-email',
        'Ungültige E-Mail-Adresse: another-invalid'
      ]);
    });

    it('should require recipientEmails field', async () => {
      const request = createRequest('PUT', {});

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('recipientEmails field is required and must be a string');
    });

    it('should require at least one email address', async () => {
      const request = createRequest('PUT', {
        recipientEmails: '',
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid email addresses');
      expect(data.details).toEqual(['Mindestens eine E-Mail-Adresse ist erforderlich']);
    });

    it('should accept valid email addresses', async () => {
      const newConfig = {
        id: 1,
        recipientEmails: 'test@example.com,admin@test.org',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.antragConfiguration.findFirst.mockResolvedValue(null);
      mockPrisma.antragConfiguration.create.mockResolvedValue(newConfig);

      const request = createRequest('PUT', {
        recipientEmails: 'test@example.com, admin@test.org',
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe(newConfig.id);
      expect(data.recipientEmails).toBe(newConfig.recipientEmails);
      expect(data.createdAt).toBeDefined();
      expect(data.updatedAt).toBeDefined();
    });

    it('should handle database errors during update', async () => {
      mockPrisma.antragConfiguration.findFirst.mockRejectedValue(new Error('Database error'));

      const request = createRequest('PUT', {
        recipientEmails: 'test@example.com',
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });

    it('should trim whitespace from email addresses', async () => {
      const newConfig = {
        id: 1,
        recipientEmails: 'test@example.com, admin@test.org   ',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.antragConfiguration.findFirst.mockResolvedValue(null);
      mockPrisma.antragConfiguration.create.mockResolvedValue(newConfig);

      const request = createRequest('PUT', {
        recipientEmails: '   test@example.com, admin@test.org   ',
      });

      const response = await PUT(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.antragConfiguration.create).toHaveBeenCalledWith({
        data: { recipientEmails: 'test@example.com, admin@test.org' }
      });
    });
  });
});