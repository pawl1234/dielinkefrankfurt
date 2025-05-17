// mock-services.ts - Mock implementations for external services
import { put, del } from '@vercel/blob';
import { sendEmail } from '../lib/email';

// Mock Vercel Blob Storage
export function setupMockBlobStorage() {
  // Mock the Vercel Blob functions
  jest.mock('@vercel/blob', () => ({
    put: jest.fn().mockImplementation((path, data, options) => {
      // Create a mock URL based on the path
      const url = `https://mock-blob-storage.vercel.app/${path}`;
      return Promise.resolve({ url });
    }),
    del: jest.fn().mockImplementation((urls) => {
      return Promise.resolve({ success: true });
    })
  }));
}

export function resetMockBlobStorage() {
  if (jest.isMockFunction(put)) {
    (put as jest.Mock).mockClear();
  }
  if (jest.isMockFunction(del)) {
    (del as jest.Mock).mockClear();
  }
}

// Simulate blob storage errors
export function simulateBlobStorageError(errorMessage: string = 'Blob storage error') {
  if (jest.isMockFunction(put)) {
    (put as jest.Mock).mockRejectedValue(new Error(errorMessage));
  }
}

// Mock Email Service
export function setupMockEmailService() {
  jest.mock('../lib/email', () => ({
    sendEmail: jest.fn().mockImplementation(() => 
      Promise.resolve({ success: true, messageId: 'mock-message-id' })
    )
  }));
}

export function resetMockEmailService() {
  if (jest.isMockFunction(sendEmail)) {
    (sendEmail as jest.Mock).mockClear();
  }
}

// Simulate email service errors
export function simulateEmailServiceError(errorMessage: string = 'Email service error') {
  if (jest.isMockFunction(sendEmail)) {
    (sendEmail as jest.Mock).mockRejectedValue(new Error(errorMessage));
  }
}

// Mock environment variables
export function setupMockEnvironment() {
  const originalEnv = process.env;

  // Save original env variables
  beforeAll(() => {
    process.env = { ...originalEnv };
    process.env.NEXTAUTH_URL = 'https://test.dielinke-frankfurt.de';
    process.env.BLOB_READ_WRITE_TOKEN = 'mock-blob-token';
    process.env.CONTACT_EMAIL = 'test@dielinke-frankfurt.de';
    process.env.ADMIN_USERNAME = 'admin';
    process.env.ADMIN_PASSWORD = 'password';
  });

  // Restore original env variables
  afterAll(() => {
    process.env = originalEnv;
  });
}

// Mock NextAuth
export function setupMockNextAuth() {
  jest.mock('next-auth/jwt', () => ({
    getToken: jest.fn().mockResolvedValue({
      role: 'admin',
      name: 'Admin User'
    })
  }));
}

// Mock database
export function setupMockDatabase() {
  // This is a placeholder for database mocking
  // Actual implementation would depend on your data access patterns
  jest.mock('../lib/prisma', () => {
    const mockClient = {
      group: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn()
      },
      responsiblePerson: {
        createMany: jest.fn(),
        deleteMany: jest.fn()
      },
      statusReport: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn()
      }
    };
    
    return {
      __esModule: true,
      default: mockClient
    };
  });
}