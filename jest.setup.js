// jest.setup.js
import '@testing-library/jest-dom';

// Polyfill TextEncoder/TextDecoder for Node.js environment
if (typeof TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

// Mock next-auth modules that use jose
jest.mock('next-auth/jwt', () => ({
  getToken: jest.fn().mockResolvedValue({ role: 'admin' }),
  encode: jest.fn(),
  decode: jest.fn(),
}));

// Mock Next.js routing
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    };
  },
  usePathname() {
    return '';
  },
  useSearchParams() {
    return new URLSearchParams();
  },
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // Deprecated
    removeListener: jest.fn(), // Deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver
class MockIntersectionObserver {
  constructor(callback) {
    this.callback = callback;
  }
  observe() {
    this.callback([{ isIntersecting: true }]);
  }
  unobserve() {}
  disconnect() {}
}
global.IntersectionObserver = MockIntersectionObserver;

// Mock scrollTo and scrollIntoView
global.scrollTo = jest.fn();

// Mock scrollIntoView for DOM elements
Element.prototype.scrollIntoView = jest.fn();

// Required for Date usage in tests
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Polyfill ReadableStream for NextRequest support
if (typeof ReadableStream === 'undefined') {
  global.ReadableStream = class ReadableStream {
    constructor(source) {
      this._source = source;
    }
    
    getReader() {
      return {
        read: () => Promise.resolve({ done: true, value: undefined }),
        releaseLock: () => {},
        closed: Promise.resolve()
      };
    }
  };
}

// Set up test environment for API routes
if (typeof Headers === 'undefined') {
  global.Headers = class Headers {
    constructor(init) {
      this._headers = new Map();
      if (init) {
        if (init instanceof Headers) {
          for (const [key, value] of init) {
            this._headers.set(key.toLowerCase(), value);
          }
        } else if (Array.isArray(init)) {
          for (const [key, value] of init) {
            this._headers.set(key.toLowerCase(), value);
          }
        } else {
          Object.entries(init).forEach(([key, value]) => {
            this._headers.set(key.toLowerCase(), value);
          });
        }
      }
    }
    
    get(name) {
      return this._headers.get(name.toLowerCase()) || null;
    }
    
    set(name, value) {
      this._headers.set(name.toLowerCase(), value);
    }
    
    has(name) {
      return this._headers.has(name.toLowerCase());
    }
    
    delete(name) {
      this._headers.delete(name.toLowerCase());
    }
    
    *[Symbol.iterator]() {
      for (const [key, value] of this._headers) {
        yield [key, value];
      }
    }
  };
}

if (typeof Request === 'undefined') {
  global.Request = class Request {
    constructor(input, init = {}) {
      // Use URL object to handle the url property properly
      this._url = new URL(input, 'http://localhost');
      this.method = init.method || 'GET';
      this.headers = new Headers();
      if (init.headers) {
        if (init.headers instanceof Headers) {
          for (const [key, value] of init.headers) {
            this.headers.set(key, value);
          }
        } else {
          Object.entries(init.headers).forEach(([key, value]) => {
            this.headers.set(key, value);
          });
        }
      }
      this._body = init.body;
      this.bodyUsed = false;
    }
    
    get url() {
      return this._url.href;
    }
    
    get body() {
      if (typeof this._body === 'string') {
        const encoder = new TextEncoder();
        return new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(this._body));
            controller.close();
          }
        });
      }
      return this._body;
    }
    
    async json() {
      if (this.bodyUsed) {
        throw new Error('Body already read');
      }
      this.bodyUsed = true;
      if (typeof this._body === 'string') {
        return JSON.parse(this._body);
      }
      return this._body;
    }
    
    async text() {
      if (this.bodyUsed) {
        throw new Error('Body already read');
      }
      this.bodyUsed = true;
      return typeof this._body === 'string' ? this._body : JSON.stringify(this._body);
    }
    
    async formData() {
      if (this.bodyUsed) {
        throw new Error('Body already read');
      }
      this.bodyUsed = true;
      if (this._body instanceof FormData) {
        return this._body;
      }
      // Return an empty FormData if no form data was provided
      return new FormData();
    }
    
    clone() {
      return new Request(this.url, {
        method: this.method,
        headers: this.headers,
        body: this._body
      });
    }
  };
}

if (typeof Response === 'undefined') {
  global.Response = class Response {
    constructor(body, init = {}) {
      this.body = body;
      this.status = init.status || 200;
      this.headers = new Headers(init.headers);
      this.ok = this.status >= 200 && this.status < 300;
      this.statusText = init.statusText || '';
    }
    
    static json(data, init = {}) {
      return new Response(JSON.stringify(data), {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...init.headers
        }
      });
    }
    
    async json() {
      return typeof this.body === 'string' ? JSON.parse(this.body) : this.body;
    }
    
    async text() {
      return typeof this.body === 'string' ? this.body : JSON.stringify(this.body);
    }
  };
}

// Mock File API for upload tests
if (typeof File !== 'undefined') {
  // Add missing methods to File prototype
  if (!File.prototype.arrayBuffer) {
    File.prototype.arrayBuffer = function() {
      return Promise.resolve(new ArrayBuffer(this.size || 0));
    };
  }
  
  if (!File.prototype.text) {
    File.prototype.text = function() {
      return Promise.resolve(this.name || '');
    };
  }
  
  if (!File.prototype.stream) {
    File.prototype.stream = function() {
      return new ReadableStream();
    };
  }
}

// Mock Blob constructor if not available
if (typeof Blob === 'undefined') {
  global.Blob = class Blob {
    constructor(parts = [], options = {}) {
      this.size = parts.reduce((size, part) => size + (part.length || 0), 0);
      this.type = options.type || '';
      this._parts = parts;
    }
    
    async arrayBuffer() {
      return new ArrayBuffer(this.size);
    }
    
    async text() {
      return this._parts.join('');
    }
    
    slice(start = 0, end = this.size, contentType = '') {
      return new Blob(this._parts, { type: contentType });
    }
  };
}

// Mock FormData if needed
if (typeof FormData === 'undefined') {
  global.FormData = class FormData {
    constructor() {
      this._data = new Map();
    }
    
    append(name, value) {
      if (!this._data.has(name)) {
        this._data.set(name, []);
      }
      this._data.get(name).push(value);
    }
    
    get(name) {
      const values = this._data.get(name);
      return values ? values[0] : null;
    }
    
    getAll(name) {
      return this._data.get(name) || [];
    }
    
    has(name) {
      return this._data.has(name);
    }
    
    set(name, value) {
      this._data.set(name, [value]);
    }
    
    delete(name) {
      this._data.delete(name);
    }
    
    *entries() {
      for (const [key, values] of this._data.entries()) {
        for (const value of values) {
          yield [key, value];
        }
      }
    }
    
    *keys() {
      for (const key of this._data.keys()) {
        yield key;
      }
    }
    
    *values() {
      for (const values of this._data.values()) {
        for (const value of values) {
          yield value;
        }
      }
    }
    
    [Symbol.iterator]() {
      return this.entries();
    }
  };
}

// Mock FileReader if needed
if (typeof FileReader === 'undefined') {
  global.FileReader = class FileReader {
    constructor() {
      this.result = null;
      this.error = null;
      this.readyState = 0; // EMPTY
      this.onload = null;
      this.onerror = null;
      this.onloadend = null;
    }
    
    readAsDataURL(file) {
      setTimeout(() => {
        this.result = `data:${file.type || 'application/octet-stream'};base64,dGVzdA==`;
        this.readyState = 2; // DONE
        if (this.onload) this.onload({ target: this });
        if (this.onloadend) this.onloadend({ target: this });
      }, 0);
    }
    
    readAsText(file) {
      setTimeout(() => {
        this.result = file.name || '';
        this.readyState = 2; // DONE
        if (this.onload) this.onload({ target: this });
        if (this.onloadend) this.onloadend({ target: this });
      }, 0);
    }
    
    readAsArrayBuffer(file) {
      setTimeout(() => {
        this.result = new ArrayBuffer(file.size || 0);
        this.readyState = 2; // DONE
        if (this.onload) this.onload({ target: this });
        if (this.onloadend) this.onloadend({ target: this });
      }, 0);
    }
  };
}

// Mock Prisma for component and integration tests
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    appointment: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
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
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    statusReport: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    newsletter: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    newsletterItem: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    hashedRecipient: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
    $disconnect: jest.fn(),
  }
}));

// Mock email functionality
jest.mock('@/lib/email', () => ({
  sendEmail: jest.fn().mockResolvedValue({ success: true }),
  sendTestEmail: jest.fn().mockResolvedValue({
    success: true,
    recipientCount: 1,
    messageId: 'test-message'
  }),
  createTransporter: jest.fn(() => ({
    verify: jest.fn().mockResolvedValue(true),
    close: jest.fn(),
    sendMail: jest.fn()
  })),
  sendEmailWithTransporter: jest.fn().mockResolvedValue({
    success: true,
    messageId: 'test-message-id'
  })
}));

// Mock Vercel blob functionality
jest.mock('@vercel/blob', () => ({
  put: jest.fn().mockResolvedValue({ url: 'https://example.com/test.jpg' }),
  del: jest.fn().mockResolvedValue({ success: true })
}));

// Mock email hashing functions
jest.mock('@/lib/email-hashing', () => ({
  cleanEmail: jest.fn((email) => email.trim().toLowerCase()),
  validateEmail: jest.fn((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)),
  validateAndHashEmails: jest.fn()
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

// Mock crypto module for email hashing
jest.mock('crypto', () => ({
  randomBytes: jest.fn(() => ({ toString: () => 'mocked-salt-value' })),
  createHash: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn(() => 'mocked-hash-value'),
  })),
}));

// Mock API authentication for API tests
jest.mock('@/lib/api-auth', () => ({
  withAdminAuth: jest.fn((handler) => handler)
}));

// Mock error handling for API tests
jest.mock('@/lib/errors', () => ({
  AppError: {
    validation: jest.fn((message, context) => ({
      message,
      statusCode: 400,
      type: 'VALIDATION',
      context,
      toResponse: jest.fn(() => ({
        status: 400,
        json: () => Promise.resolve({ error: message, type: 'VALIDATION' })
      }))
    })),
    authentication: jest.fn((message = 'Authentication failed') => ({
      message,
      statusCode: 401,
      type: 'AUTHENTICATION',
      toResponse: jest.fn(() => ({
        status: 401,
        json: () => Promise.resolve({ error: message, type: 'AUTHENTICATION' })
      }))
    })),
    authorization: jest.fn((message = 'Not authorized') => ({
      message,
      statusCode: 403,
      type: 'AUTHORIZATION',
      toResponse: jest.fn(() => ({
        status: 403,
        json: () => Promise.resolve({ error: message, type: 'AUTHORIZATION' })
      }))
    })),
    notFound: jest.fn((message) => ({
      message,
      statusCode: 404,
      type: 'NOT_FOUND',
      toResponse: jest.fn(() => ({
        status: 404,
        json: () => Promise.resolve({ error: message, type: 'NOT_FOUND' })
      }))
    })),
    database: jest.fn((message, originalError) => ({
      message,
      statusCode: 500,
      type: 'DATABASE',
      originalError,
      toResponse: jest.fn(() => ({
        status: 500,
        json: () => Promise.resolve({ error: message, type: 'DATABASE' })
      }))
    }))
  },
  NewsletterNotFoundError: jest.fn().mockImplementation((message = 'Newsletter not found', context) => ({
    message,
    name: 'NewsletterNotFoundError',
    type: 'NEWSLETTER',
    statusCode: 404,
    context,
    toResponse: jest.fn(() => ({
      status: 404,
      json: () => Promise.resolve({ error: message, type: 'NEWSLETTER' })
    }))
  })),
  NewsletterValidationError: jest.fn().mockImplementation((message = 'Newsletter validation failed', details, context) => ({
    message,
    name: 'NewsletterValidationError',
    type: 'NEWSLETTER',
    statusCode: 400,
    details,
    context,
    toResponse: jest.fn(() => ({
      status: 400,
      json: () => Promise.resolve({ 
        error: message, 
        type: 'NEWSLETTER',
        fieldErrors: details
      })
    }))
  })),
  apiErrorResponse: jest.fn((error, message) => {
    // Mock the logic from the real apiErrorResponse function
    if (error && typeof error === 'object' && 'toResponse' in error && typeof error.toResponse === 'function') {
      // This is an AppError with toResponse method
      return error.toResponse();
    }
    
    // Fallback for other errors
    const response = {
      status: error?.statusCode || 500,
      json: jest.fn().mockResolvedValue({ 
        error: message || error?.message || 'An error occurred' 
      })
    };
    return response;
  }),
  getLocalizedErrorMessage: jest.fn((message) => {
    const translations = {
      'File size exceeds limit': 'Dateigröße überschreitet das Limit',
      'Unsupported file type': 'Nicht unterstützter Dateityp'
    };
    return translations[message] || message;
  })
}));

// Mock newsletter service
jest.mock('@/lib/newsletter-service', () => ({
  sendNewsletterTestEmail: jest.fn().mockResolvedValue({
    success: true,
    recipientCount: 1,
    messageId: 'test-message'
  }),
  fixUrlsInNewsletterHtml: jest.fn((html) => html),
  getNewsletterSettings: jest.fn().mockResolvedValue({}),
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

// Mock MUI X Date Pickers
jest.mock('@mui/x-date-pickers/DateTimePicker', () => ({
  DateTimePicker: ({ onChange, value, label, format, inputRef, minDateTime, ampm, slotProps, ...props }) => (
    <div data-testid={`mui-datetime-picker-${label?.toLowerCase().replace(/\s+/g, '-') || 'datetime'}`}>
      <label>{label}</label>
      <input
        type="datetime-local"
        value={value ? new Date(value).toISOString().slice(0, 16) : ''}
        onChange={(e) => onChange && onChange(new Date(e.target.value))}
        ref={inputRef}
      />
    </div>
  )
}));

jest.mock('@mui/x-date-pickers/LocalizationProvider', () => ({
  LocalizationProvider: ({ children }) => children
}));

jest.mock('@mui/x-date-pickers/AdapterDayjs', () => ({
  AdapterDayjs: jest.fn().mockImplementation(() => ({}))
}));

// Mock dayjs
jest.mock('dayjs', () => {
  const mockDayjs = (date) => {
    const jsDate = date ? new Date(date) : new Date();
    return {
      toDate: () => jsDate,
      format: (format) => jsDate.toISOString(),
      locale: jest.fn(),
      isValid: () => true,
      isBefore: jest.fn(),
      isAfter: jest.fn(),
      isSame: jest.fn(),
      add: jest.fn(() => mockDayjs()),
      subtract: jest.fn(() => mockDayjs()),
      startOf: jest.fn(() => mockDayjs()),
      endOf: jest.fn(() => mockDayjs()),
    };
  };
  
  mockDayjs.locale = jest.fn();
  mockDayjs.extend = jest.fn();
  
  return mockDayjs;
});

