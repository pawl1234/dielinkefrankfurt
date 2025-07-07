import { NextRequest } from 'next/server';
import { GET, PUT } from '@/app/api/admin/antraege/configuration/route';
import prisma from '@/lib/prisma';

// Mock the admin auth
jest.mock('@/lib/api-auth', () => ({
  withAdminAuth: jest.fn((handler) => handler),
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

describe('Antrag Configuration Integration Tests', () => {
  beforeEach(async () => {
    // Clean up any existing configuration
    await prisma.antragConfiguration.deleteMany({});
  });

  afterAll(async () => {
    // Clean up after tests
    await prisma.antragConfiguration.deleteMany({});
    await prisma.$disconnect();
  });

  describe('Complete Configuration Workflow', () => {
    it('should create default configuration on first GET request', async () => {
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.recipientEmails).toBe('admin@die-linke-frankfurt.de,kreisvorstand@die-linke-frankfurt.de');
      expect(data.id).toBeDefined();
      expect(data.createdAt).toBeDefined();
      expect(data.updatedAt).toBeDefined();

      // Verify it was actually saved to database
      const dbConfig = await prisma.antragConfiguration.findFirst();
      expect(dbConfig).not.toBeNull();
      expect(dbConfig!.recipientEmails).toBe('admin@die-linke-frankfurt.de,kreisvorstand@die-linke-frankfurt.de');
    });

    it('should update existing configuration via PUT request', async () => {
      // First create a configuration
      await GET();

      // Now update it
      const request = createRequest('PUT', {
        recipientEmails: 'new@test.com, updated@test.com, third@test.com',
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.recipientEmails).toBe('new@test.com, updated@test.com, third@test.com');

      // Verify it was actually updated in database
      const dbConfig = await prisma.antragConfiguration.findFirst();
      expect(dbConfig).not.toBeNull();
      expect(dbConfig!.recipientEmails).toBe('new@test.com, updated@test.com, third@test.com');
    });

    it('should return the same configuration on subsequent GET requests', async () => {
      // Create initial configuration
      const request = createRequest('PUT', {
        recipientEmails: 'test@example.com, admin@example.com',
      });
      await PUT(request);

      // Get configuration multiple times
      const response1 = await GET();
      const data1 = await response1.json();

      const response2 = await GET();
      const data2 = await response2.json();

      expect(data1.recipientEmails).toBe('test@example.com, admin@example.com');
      expect(data2.recipientEmails).toBe('test@example.com, admin@example.com');
      expect(data1.id).toBe(data2.id);
    });

    it('should maintain data integrity across multiple operations', async () => {
      const testEmails = [
        'first@test.com',
        'second@test.com, third@test.com',
        'admin@die-linke-frankfurt.de, kreisvorstand@die-linke-frankfurt.de, finanzen@die-linke-frankfurt.de',
        'single@test.com',
      ];

      let configId: number | undefined;

      for (const emails of testEmails) {
        // Update configuration
        const request = createRequest('PUT', {
          recipientEmails: emails,
        });

        const putResponse = await PUT(request);
        const putData = await putResponse.json();

        expect(putResponse.status).toBe(200);
        expect(putData.recipientEmails).toBe(emails);

        // Store the ID from first operation
        if (!configId) {
          configId = putData.id;
        } else {
          // Ensure the same record is being updated
          expect(putData.id).toBe(configId);
        }

        // Verify with GET request
        const getResponse = await GET();
        const getData = await getResponse.json();

        expect(getResponse.status).toBe(200);
        expect(getData.recipientEmails).toBe(emails);
        expect(getData.id).toBe(configId);

        // Verify database state
        const dbConfig = await prisma.antragConfiguration.findFirst();
        expect(dbConfig).not.toBeNull();
        expect(dbConfig!.recipientEmails).toBe(emails);
        expect(dbConfig!.id).toBe(configId);
      }

      // Ensure only one configuration record exists
      const allConfigs = await prisma.antragConfiguration.findMany();
      expect(allConfigs).toHaveLength(1);
    });

    it('should handle edge cases and validation properly', async () => {
      // Test with various valid email formats
      const validEmailCombinations = [
        'user@domain.com',
        'user.name@domain.com, admin+tag@sub.domain.org',
        'test@localhost.local, another@example.co.uk',
        'name@domain-with-hyphens.com, user123@123domain.org',
      ];

      for (const emails of validEmailCombinations) {
        const request = createRequest('PUT', {
          recipientEmails: emails,
        });

        const response = await PUT(request);
        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.recipientEmails).toBe(emails);
      }

      // Test with invalid email formats
      const invalidEmailCombinations = [
        'not-an-email',
        'missing@domain',
        '@domain.com',
        'user@',
        'spaces in email@domain.com',
        '',
      ];

      for (const emails of invalidEmailCombinations) {
        const request = createRequest('PUT', {
          recipientEmails: emails,
        });

        const response = await PUT(request);
        expect(response.status).toBe(400);

        const data = await response.json();
        expect(data.error).toBeDefined();
      }
    });

    it('should handle whitespace and formatting correctly', async () => {
      const testCases = [
        {
          input: '  test@example.com  ,  admin@test.org  ',
          expected: 'test@example.com  ,  admin@test.org',
        },
        {
          input: 'test@example.com,admin@test.org',
          expected: 'test@example.com,admin@test.org',
        },
        {
          input: '   single@test.com   ',
          expected: 'single@test.com',
        },
      ];

      for (const testCase of testCases) {
        const request = createRequest('PUT', {
          recipientEmails: testCase.input,
        });

        const response = await PUT(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.recipientEmails).toBe(testCase.expected);

        // Verify in database
        const dbConfig = await prisma.antragConfiguration.findFirst();
        expect(dbConfig!.recipientEmails).toBe(testCase.expected);
      }
    });

    it('should handle concurrent updates correctly', async () => {
      // Create initial configuration
      const initialRequest = createRequest('PUT', {
        recipientEmails: 'initial@test.com',
      });
      await PUT(initialRequest);

      // Simulate concurrent updates
      const updatePromises = [
        'first@test.com',
        'second@test.com',
        'third@test.com',
      ].map((email, index) => {
        const request = createRequest('PUT', {
          recipientEmails: email,
        });
        return PUT(request);
      });

      const responses = await Promise.all(updatePromises);

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Only one configuration should exist
      const allConfigs = await prisma.antragConfiguration.findMany();
      expect(allConfigs).toHaveLength(1);

      // The final state should be one of the concurrent updates
      const finalConfig = allConfigs[0];
      expect(['first@test.com', 'second@test.com', 'third@test.com']).toContain(finalConfig.recipientEmails);
    });
  });

  describe('Database Persistence', () => {
    it('should persist configuration across application restarts', async () => {
      const testEmails = 'persistent@test.com, another@persistent.com';

      // Create configuration
      const request = createRequest('PUT', {
        recipientEmails: testEmails,
      });

      const putResponse = await PUT(request);
      expect(putResponse.status).toBe(200);

      // Simulate application restart by disconnecting and reconnecting
      await prisma.$disconnect();

      // Retrieve configuration after "restart"
      const getResponse = await GET();
      const getData = await getResponse.json();

      expect(getResponse.status).toBe(200);
      expect(getData.recipientEmails).toBe(testEmails);
    });

    it('should maintain timestamp information correctly', async () => {
      // Create initial configuration
      const request1 = createRequest('PUT', {
        recipientEmails: 'first@test.com',
      });

      const response1 = await PUT(request1);
      const data1 = await response1.json();
      const initialCreatedAt = new Date(data1.createdAt);
      const initialUpdatedAt = new Date(data1.updatedAt);

      // Wait a bit and update
      await new Promise(resolve => setTimeout(resolve, 100));

      const request2 = createRequest('PUT', {
        recipientEmails: 'updated@test.com',
      });

      const response2 = await PUT(request2);
      const data2 = await response2.json();
      const finalCreatedAt = new Date(data2.createdAt);
      const finalUpdatedAt = new Date(data2.updatedAt);

      // CreatedAt should remain the same
      expect(finalCreatedAt).toEqual(initialCreatedAt);

      // UpdatedAt should be different (newer)
      expect(finalUpdatedAt.getTime()).toBeGreaterThan(initialUpdatedAt.getTime());

      // Same ID should be maintained
      expect(data2.id).toBe(data1.id);
    });
  });
});