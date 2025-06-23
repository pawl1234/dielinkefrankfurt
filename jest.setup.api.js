// jest.setup.api.js
// Setup for API route tests

// Polyfill TextEncoder/TextDecoder for Node environment
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Set test environment variables
process.env.ADMIN_USERNAME = 'testadmin';
process.env.ADMIN_PASSWORD = 'testpassword';
process.env.NEXTAUTH_SECRET = 'test-secret';
process.env.VERCEL_PROJECT_PRODUCTION_URL = 'http://localhost:3000';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.NODE_ENV = 'test';

// Mock API authentication
jest.mock('@/lib/api-auth', () => ({
  withAdminAuth: jest.fn((handler) => handler)
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

// Mock error handling
jest.mock('@/lib/errors', () => ({
  AppError: {
    validation: jest.fn((message) => ({
      toResponse: jest.fn(() => ({
        status: 400,
        json: jest.fn().mockResolvedValue({ error: message })
      }))
    })),
    notFound: jest.fn((message) => ({
      toResponse: jest.fn(() => ({
        status: 404,
        json: jest.fn().mockResolvedValue({ error: message })
      }))
    }))
  },
  apiErrorResponse: jest.fn((error, message) => ({
    status: 500,
    json: jest.fn().mockResolvedValue({ error: message || 'An error occurred' })
  }))
}));

// Mock newsletter service
jest.mock('@/lib/newsletter-service', () => ({
  sendNewsletterTestEmail: jest.fn(),
  fixUrlsInNewsletterHtml: jest.fn((html) => html),
  getNewsletterSettings: jest.fn(),
  updateNewsletterSettings: jest.fn(),
  getNewsletterById: jest.fn(),
  updateNewsletter: jest.fn(),
  listDraftNewsletters: jest.fn(),
  saveDraftNewsletter: jest.fn()
}));

// Mock newsletter sending
jest.mock('@/lib/newsletter-sending', () => ({
  processRecipientList: jest.fn(),
  processSendingChunk: jest.fn()
}));

// Mock email hashing
jest.mock('@/lib/email-hashing', () => ({
  cleanEmail: jest.fn((email) => email.trim().toLowerCase()),
  validateEmail: jest.fn((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)),
  validateAndHashEmails: jest.fn()
}));

// Mock the prisma connection check to prevent database connection attempts
jest.mock('@/lib/prisma', () => ({
  prisma: {
    newsletter: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    newsletterItem: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    appointment: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    statusReport: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    group: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $queryRaw: jest.fn(),
    $disconnect: jest.fn(),
  },
  __esModule: true,
  default: {
    newsletter: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    newsletterItem: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    appointment: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    statusReport: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    group: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $queryRaw: jest.fn(),
    $disconnect: jest.fn(),
  }
}));