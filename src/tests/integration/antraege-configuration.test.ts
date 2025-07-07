import { NextRequest } from 'next/server';
import { GET, PUT } from '@/app/api/admin/antraege/configuration/route';
import prisma from '@/lib/prisma';

// Mock the admin auth - only mock external boundaries
jest.mock('@/lib/api-auth', () => ({
  withAdminAuth: jest.fn((handler) => handler),
}));

// Mock Prisma for this test with proper antragConfiguration implementation
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    antragConfiguration: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn().mockResolvedValue({}),
      findMany: jest.fn(),
    },
    $disconnect: jest.fn().mockResolvedValue({}),
  }
}));

// Helper function to create a NextRequest with JSON body
function createRequest(method: 'PUT', body: any): NextRequest {
  const url = 'http://localhost:3000/api/admin/antraege/configuration';
  return new NextRequest(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('Antrag Configuration API', () => {
  let mockConfigurationState = new Map();

  beforeEach(async () => {
    mockConfigurationState.clear();
    
    // Set up mock implementations
    (prisma.antragConfiguration.findFirst as jest.Mock).mockImplementation(() => {
      const configs = Array.from(mockConfigurationState.values());
      return Promise.resolve(configs[0] || null);
    });

    (prisma.antragConfiguration.create as jest.Mock).mockImplementation(({ data }) => {
      const newConfig = {
        id: Math.floor(Math.random() * 10000),
        recipientEmails: data.recipientEmails.trim(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockConfigurationState.set(newConfig.id, newConfig);
      return Promise.resolve(newConfig);
    });

    (prisma.antragConfiguration.update as jest.Mock).mockImplementation(({ where, data }) => {
      const existing = mockConfigurationState.get(where.id);
      if (existing) {
        const updated = {
          ...existing,
          ...data,
          updatedAt: new Date(),
        };
        mockConfigurationState.set(where.id, updated);
        return Promise.resolve(updated);
      }
      return Promise.resolve(null);
    });

    (prisma.antragConfiguration.findMany as jest.Mock).mockImplementation(() => {
      return Promise.resolve(Array.from(mockConfigurationState.values()));
    });

    await prisma.antragConfiguration.deleteMany({});
  });

  afterAll(async () => {
    await prisma.antragConfiguration.deleteMany({});
    await prisma.$disconnect();
  });

  describe('GET /api/admin/antraege/configuration', () => {
    it('creates default configuration when none exists', async () => {
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.recipientEmails).toBe('admin@die-linke-frankfurt.de,kreisvorstand@die-linke-frankfurt.de');
      expect(data.id).toBeDefined();
    });

    it('returns existing configuration', async () => {
      // Create a configuration first
      await PUT(createRequest('PUT', { recipientEmails: 'test@example.com' }));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.recipientEmails).toBe('test@example.com');
    });
  });

  describe('PUT /api/admin/antraege/configuration', () => {
    it('creates new configuration', async () => {
      const request = createRequest('PUT', { recipientEmails: 'new@test.com' });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.recipientEmails).toBe('new@test.com');

      // Verify database state
      const dbConfig = await prisma.antragConfiguration.findFirst();
      expect(dbConfig?.recipientEmails).toBe('new@test.com');
    });

    it('updates existing configuration', async () => {
      // Create initial configuration
      await PUT(createRequest('PUT', { recipientEmails: 'initial@test.com' }));

      // Update it
      const request = createRequest('PUT', { recipientEmails: 'updated@test.com' });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.recipientEmails).toBe('updated@test.com');

      // Verify only one configuration exists
      const allConfigs = await prisma.antragConfiguration.findMany();
      expect(allConfigs).toHaveLength(1);
    });

    it('trims whitespace from email input', async () => {
      const request = createRequest('PUT', { recipientEmails: '  test@example.com  ' });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.recipientEmails).toBe('test@example.com');
    });

    it('validates email format', async () => {
      const invalidEmails = ['not-an-email', 'missing@domain', '@domain.com', ''];
      
      for (const email of invalidEmails) {
        const request = createRequest('PUT', { recipientEmails: email });
        const response = await PUT(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBeDefined();
      }
    });

    it('accepts valid email formats', async () => {
      const validEmails = [
        'user@domain.com',
        'user.name@domain.com, admin+tag@sub.domain.org',
        'test@localhost.local, another@example.co.uk'
      ];

      for (const emails of validEmails) {
        const request = createRequest('PUT', { recipientEmails: emails });
        const response = await PUT(request);

        expect(response.status).toBe(200);
      }
    });

    it('rejects missing recipientEmails field', async () => {
      const request = createRequest('PUT', {});
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('recipientEmails field is required');
    });
  });
});