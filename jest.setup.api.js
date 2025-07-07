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

// Mock error handling - Create real classes for instanceof checks
class MockAppError extends Error {
  constructor(message, type = 'UNKNOWN', statusCode = 500, originalError, context) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.statusCode = statusCode;
    this.originalError = originalError;
    this.context = context;
  }
  
  static validation(message, context) {
    return new MockAppError(message, 'VALIDATION', 400, undefined, context);
  }
  
  static notFound(message) {
    return new MockAppError(message, 'NOT_FOUND', 404);
  }
  
  static database(message, originalError) {
    return new MockAppError(message, 'DATABASE', 500, originalError);
  }
  
  static fileUpload(message, originalError, context) {
    return new MockAppError(message, 'FILE_UPLOAD', 500, originalError, context);
  }
  
  toResponse() {
    return {
      status: this.statusCode,
      json: () => Promise.resolve({ 
        error: this.message, 
        type: this.type 
      })
    };
  }
}

jest.mock('@/lib/errors', () => ({
  AppError: MockAppError,
  ErrorType: {
    VALIDATION: 'VALIDATION',
    DATABASE: 'DATABASE',
    FILE_UPLOAD: 'FILE_UPLOAD',
    NOT_FOUND: 'NOT_FOUND',
    UNKNOWN: 'UNKNOWN'
  },
  validationErrorResponse: jest.fn((fieldErrors) => ({
    status: 400,
    json: jest.fn().mockResolvedValue({ 
      error: 'Validation failed',
      type: 'VALIDATION',
      fieldErrors 
    })
  })),
  apiErrorResponse: jest.fn((error, message) => {
    if (error instanceof MockAppError) {
      return error.toResponse();
    }
    return {
      status: 500,
      json: jest.fn().mockResolvedValue({ 
        error: message || 'An error occurred' 
      })
    };
  }),
  handleFileUploadError: jest.fn((error, context) => {
    return MockAppError.fileUpload('File upload failed', error, context);
  }),
  handleDatabaseError: jest.fn((error, operation) => {
    return MockAppError.database(`Database error during ${operation}`, error);
  }),
  getLocalizedErrorMessage: jest.fn((message) => message)
}));

// Mock newsletter service
jest.mock('@/lib/newsletter-service', () => ({
  sendNewsletterTestEmail: jest.fn().mockResolvedValue({
    success: true,
    recipientCount: 1,
    messageId: 'test-message'
  }),
  fixUrlsInNewsletterHtml: jest.fn((html) => html),
  getNewsletterSettings: jest.fn().mockResolvedValue({
    chunkSize: 50,
    fromEmail: 'newsletter@die-linke-frankfurt.de',
    fromName: 'Die Linke Frankfurt'
  }),
  updateNewsletterSettings: jest.fn().mockResolvedValue({}),
  getNewsletterById: jest.fn().mockResolvedValue(null),
  updateNewsletter: jest.fn().mockResolvedValue({}),
  listDraftNewsletters: jest.fn().mockResolvedValue([]),
  saveDraftNewsletter: jest.fn().mockResolvedValue({}),
  fetchNewsletterAppointments: jest.fn().mockResolvedValue({
    featuredAppointments: [],
    upcomingAppointments: []
  }),
  fetchNewsletterStatusReports: jest.fn().mockResolvedValue({
    statusReportsByGroup: []
  }),
  generateNewsletter: jest.fn().mockResolvedValue('<html>Generated Newsletter HTML</html>'),
  handleGetNewsletterSettings: jest.fn(),
  handleUpdateNewsletterSettings: jest.fn(),
  handleGenerateNewsletter: jest.fn(),
  handleSendTestNewsletter: jest.fn(),
  createNewsletter: jest.fn().mockResolvedValue({}),
  deleteNewsletter: jest.fn().mockResolvedValue({}),
  listNewsletters: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, limit: 10, totalPages: 0 }),
  getNewsletter: jest.fn().mockResolvedValue(null),
  deleteDraftNewsletter: jest.fn().mockResolvedValue({}),
  updateDraftNewsletter: jest.fn().mockResolvedValue({})
}));

// Mock newsletter sending
jest.mock('@/lib/newsletter-sending', () => ({
  processRecipientList: jest.fn().mockResolvedValue({
    valid: 0,
    invalid: 0,
    new: 0,
    existing: 0,
    invalidEmails: [],
    hashedEmails: []
  }),
  processSendingChunk: jest.fn().mockResolvedValue({
    sentCount: 0,
    failedCount: 0,
    completedAt: new Date().toISOString(),
    results: []
  })
}));

// Mock newsletter template
jest.mock('@/lib/newsletter-template', () => ({
  generateNewsletterHtml: jest.fn().mockReturnValue('<html>Generated Newsletter HTML</html>'),
  getDefaultNewsletterSettings: jest.fn(() => ({
    headerLogo: '/default-logo.png',
    footerText: 'Default footer',
    unsubscribeLink: 'https://example.com/unsubscribe'
  }))
}));

// Mock base URL
jest.mock('@/lib/base-url', () => ({
  getBaseUrl: jest.fn(() => 'https://example.com')
}));

// Mock email hashing
jest.mock('@/lib/email-hashing', () => ({
  cleanEmail: jest.fn((email) => email.trim().toLowerCase()),
  validateEmail: jest.fn((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)),
  validateAndHashEmails: jest.fn()
}));

// Mock email functionality
jest.mock('@/lib/email', () => ({
  createTransporter: jest.fn(),
  sendEmailWithTransporter: jest.fn().mockImplementation(async (transporter, options) => {
    try {
      const result = await transporter.sendMail(options);
      // Check if we have accepted/rejected arrays (BCC mode simulation)
      if (result.accepted && result.rejected) {
        return { 
          success: result.accepted.length > 0, 
          messageId: result.messageId || 'mock-message-id',
          accepted: result.accepted,
          rejected: result.rejected
        };
      } else {
        return { success: true, messageId: result.messageId || 'mock-message-id' };
      }
    } catch (error) {
      return { success: false, error };
    }
  }),
  sendTestEmail: jest.fn().mockResolvedValue({
    success: true,
    recipientCount: 1,
    messageId: 'test-message'
  }),
  sendEmail: jest.fn().mockResolvedValue({
    messageId: 'test-message',
    response: 'Email sent successfully'
  })
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
      count: jest.fn(),
    },
    responsiblePerson: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
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
      count: jest.fn(),
    },
    responsiblePerson: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
    $disconnect: jest.fn(),
  }
}));