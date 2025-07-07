// jest.setup.js

// Mock next/server before any imports to ensure NextResponse is available
jest.mock('next/server', () => ({
  NextResponse: {
    json: (data, init) => ({
      status: init?.status || 200,
      json: async () => data,
      headers: new Map(Object.entries(init?.headers || {}))
    }),
    redirect: (url, init) => ({
      status: init?.status || 307,
      headers: new Map([['Location', url.toString()]])
    })
  },
  NextRequest: class NextRequest {
    constructor(input, init = {}) {
      this.url = input;
      this.method = init.method || 'GET';
      // Create a proper headers object with get method
      const headerEntries = Object.entries(init.headers || {});
      this.headers = {
        get: (name) => {
          const entry = headerEntries.find(([key]) => key.toLowerCase() === name.toLowerCase());
          return entry ? entry[1] : null;
        },
        has: (name) => {
          return headerEntries.some(([key]) => key.toLowerCase() === name.toLowerCase());
        }
      };
      this.body = init.body;
      this.nextUrl = new URL(input);
      this._formData = init.body instanceof FormData ? init.body : null;
    }
    
    async json() {
      if (typeof this.body === 'string') {
        return JSON.parse(this.body);
      }
      return this.body;
    }
    
    async formData() {
      if (this._formData) {
        return this._formData;
      }
      throw new Error('Body is not FormData');
    }
  }
}));

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

// api-auth module - now using real implementation

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
      findMany: jest.fn().mockImplementation(({ where, include, orderBy, take, skip }) => {
        const appointmentState = global._mockAppointmentState || new Map();
        let appointments = Array.from(appointmentState.values());
        
        // Apply filters
        if (where) {
          if (where.status) {
            appointments = appointments.filter(a => a.status === where.status);
          }
          if (where.startDateTime && where.startDateTime.gte) {
            appointments = appointments.filter(a => a.startDateTime >= where.startDateTime.gte);
          }
          if (where.featured !== undefined) {
            appointments = appointments.filter(a => a.featured === where.featured);
          }
        }
        
        // Apply ordering
        if (orderBy) {
          if (Array.isArray(orderBy)) {
            // Multiple sort criteria
            appointments.sort((a, b) => {
              for (const sort of orderBy) {
                const field = Object.keys(sort)[0];
                const direction = sort[field];
                let aVal = a[field];
                let bVal = b[field];
                
                if (direction === 'desc') {
                  [aVal, bVal] = [bVal, aVal];
                }
                
                if (aVal < bVal) return -1;
                if (aVal > bVal) return 1;
              }
              return 0;
            });
          } else {
            const field = Object.keys(orderBy)[0];
            const direction = orderBy[field];
            appointments.sort((a, b) => {
              let aVal = a[field];
              let bVal = b[field];
              
              if (direction === 'desc') {
                [aVal, bVal] = [bVal, aVal];
              }
              
              if (aVal < bVal) return -1;
              if (aVal > bVal) return 1;
              return 0;
            });
          }
        }
        
        // Apply pagination
        if (skip) {
          appointments = appointments.slice(skip);
        }
        if (take) {
          appointments = appointments.slice(0, take);
        }
        
        return Promise.resolve(appointments);
      }),
      findUnique: jest.fn().mockImplementation(({ where }) => {
        // If querying by ID, return the appointment from global state
        if (where && where.id) {
          const appointmentState = global._mockAppointmentState || new Map();
          const appointment = appointmentState.get(where.id);
          if (appointment) {
            return Promise.resolve(appointment);
          }
          
          // Fallback for tests that don't create appointments
          return Promise.resolve({
            id: where.id,
            title: 'Test Appointment',
            slug: 'test-appointment-slug',
            mainText: 'Test content',
            startDateTime: new Date(),
            endDateTime: new Date(),
            location: 'Test Location',
            street: 'Test Street',
            city: 'Test City',
            state: 'Test State',
            postalCode: '12345',
            firstName: 'Test',
            lastName: 'User',
            email: 'test@example.com',
            phone: '+49 123 456789',
            status: 'pending',
            processed: false,
            featured: false,
            coverImageUrl: null,
            fileUrls: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            processingDate: null,
            statusChangeDate: null,
            rejectionReason: null
          });
        }
        return Promise.resolve(null);
      }),
      create: jest.fn().mockImplementation((createData) => {
        const title = createData.data.title || 'Test Appointment';
        const slug = title.toLowerCase()
          .replace(/[äöüß]/g, (match) => ({ 'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss' }[match]))
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
        
        const newAppointment = {
          id: Math.floor(Math.random() * 10000),
          title: title,
          slug: slug,
          mainText: createData.data.mainText || 'Test content',
          startDateTime: createData.data.startDateTime || new Date(),
          endDateTime: createData.data.endDateTime || new Date(),
          location: createData.data.location || 'Test Location',
          street: createData.data.street || 'Test Street',
          city: createData.data.city || 'Test City',
          state: createData.data.state || 'Test State',
          postalCode: createData.data.postalCode || '12345',
          firstName: createData.data.firstName || 'Test',
          lastName: createData.data.lastName || 'User',
          email: createData.data.email || 'test@example.com',
          phone: createData.data.phone || '+49 123 456789',
          status: 'pending',
          processed: false,
          featured: createData.data.featured || false,
          coverImageUrl: null,
          fileUrls: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          processingDate: null,
          statusChangeDate: null,
          rejectionReason: null
        };
        
        // Store in a global appointment state for retrieval
        global._mockAppointmentState = global._mockAppointmentState || new Map();
        global._mockAppointmentState.set(newAppointment.id, newAppointment);
        
        return Promise.resolve(newAppointment);
      }),
      update: jest.fn().mockImplementation(({ where, data }) => {
        const appointmentState = global._mockAppointmentState || new Map();
        const existingAppointment = appointmentState.get(where.id);
        
        if (existingAppointment) {
          const updatedAppointment = {
            ...existingAppointment,
            ...data,
            updatedAt: new Date()
          };
          appointmentState.set(where.id, updatedAppointment);
          return Promise.resolve(updatedAppointment);
        }
        
        return Promise.resolve(null);
      }),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    group: {
      findMany: jest.fn().mockImplementation(({ where, include, orderBy, take, skip }) => {
        const groupState = global._mockGroupState || new Map();
        let groups = Array.from(groupState.values());
        
        // Apply filters
        if (where) {
          if (where.status) {
            groups = groups.filter(g => g.status === where.status);
          }
          if (where.id) {
            groups = groups.filter(g => g.id === where.id);
          }
        }
        
        // Apply ordering
        if (orderBy && orderBy.name) {
          const direction = orderBy.name;
          groups.sort((a, b) => {
            let aVal = a.name;
            let bVal = b.name;
            
            if (direction === 'desc') {
              [aVal, bVal] = [bVal, aVal];
            }
            
            if (aVal < bVal) return -1;
            if (aVal > bVal) return 1;
            return 0;
          });
        }
        
        // Apply pagination
        if (skip) {
          groups = groups.slice(skip);
        }
        if (take) {
          groups = groups.slice(0, take);
        }
        
        return Promise.resolve(groups);
      }),
      findUnique: jest.fn().mockImplementation(({ where, include }) => {
        const groupState = global._mockGroupState || new Map();
        
        // If querying by ID, check the global state first
        if (where && where.id) {
          const group = groupState.get(where.id);
          if (group) {
            // Apply status filter if specified
            if (where.status && group.status !== where.status) {
              return Promise.resolve(null);
            }
            
            // Add responsible persons if include is specified
            if (include && include.responsiblePersons && group.responsiblePersons) {
              return Promise.resolve({
                ...group,
                responsiblePersons: group.responsiblePersons
              });
            }
            
            return Promise.resolve(group);
          }
          
          // Fallback for tests that don't create groups
          const fallbackGroup = {
            id: where.id,
            name: 'Test Group',
            slug: 'test-group-slug',
            description: 'Test Description',
            logoUrl: null,
            status: 'NEW',
            metadata: null,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          // Add empty responsible persons array if include is specified
          if (include && include.responsiblePersons) {
            fallbackGroup.responsiblePersons = [];
          }
          
          return Promise.resolve(fallbackGroup);
        }
        
        // Handle status-only queries
        if (where && where.status) {
          const matchingGroups = Array.from(groupState.values()).filter(g => g.status === where.status);
          if (matchingGroups.length > 0) {
            const group = matchingGroups[0];
            if (include && include.responsiblePersons) {
              return Promise.resolve({
                ...group,
                responsiblePersons: group.responsiblePersons || []
              });
            }
            return Promise.resolve(group);
          }
          return Promise.resolve(null);
        }
        
        return Promise.resolve(null);
      }),
      create: jest.fn().mockImplementation(({ data, include }) => {
        const newGroup = {
          id: Math.random().toString(36).substring(2, 15),
          name: data.name || 'Test Group',
          slug: data.slug || data.name?.toLowerCase().replace(/\s+/g, '-') || 'test-group-slug',
          description: data.description || 'Test Description',
          logoUrl: data.logoUrl || null,
          status: data.status || 'NEW',
          metadata: data.metadata || null,
          createdAt: new Date(),
          updatedAt: new Date(),
          responsiblePersons: data.responsiblePersons?.create || []
        };
        
        // Store in a global group state for retrieval
        global._mockGroupState = global._mockGroupState || new Map();
        global._mockGroupState.set(newGroup.id, newGroup);
        
        return Promise.resolve(newGroup);
      }),
      update: jest.fn().mockImplementation(({ where, data }) => {
        const groupState = global._mockGroupState || new Map();
        const existingGroup = groupState.get(where.id);
        
        if (existingGroup) {
          const updatedGroup = {
            ...existingGroup,
            ...data,
            updatedAt: new Date()
          };
          groupState.set(where.id, updatedGroup);
          return Promise.resolve(updatedGroup);
        }
        
        return Promise.resolve({
          id: 'test-group-id',
          name: 'Test Group',
          slug: 'test-group-slug',
          description: 'Test Description',
          logoUrl: null,
          status: 'REJECTED',
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          responsiblePersons: [{
            id: 'test-person-id',
            firstName: 'Test',
            lastName: 'Person',
            email: 'test@example.com',
            groupId: 'test-group-id'
          }]
        });
      }),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    responsiblePerson: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn().mockImplementation(({ data }) => {
        const newPerson = {
          id: Math.random().toString(36).substring(2, 15),
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          groupId: data.groupId
        };
        return Promise.resolve(newPerson);
      }),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    statusReport: {
      findMany: jest.fn().mockImplementation(({ where, include, orderBy, take, skip }) => {
        const statusReportState = global._mockStatusReportState || new Map();
        let statusReports = Array.from(statusReportState.values());
        
        // Apply filters
        if (where) {
          if (where.status) {
            statusReports = statusReports.filter(sr => sr.status === where.status);
          }
          if (where.groupId) {
            statusReports = statusReports.filter(sr => sr.groupId === where.groupId);
          }
          if (where.id) {
            statusReports = statusReports.filter(sr => sr.id === where.id);
          }
        }
        
        // Apply ordering
        if (orderBy && orderBy.createdAt) {
          const direction = orderBy.createdAt;
          statusReports.sort((a, b) => {
            let aVal = a.createdAt;
            let bVal = b.createdAt;
            
            if (direction === 'desc') {
              [aVal, bVal] = [bVal, aVal];
            }
            
            if (aVal < bVal) return -1;
            if (aVal > bVal) return 1;
            return 0;
          });
        }
        
        // Apply pagination
        if (skip) {
          statusReports = statusReports.slice(skip);
        }
        if (take) {
          statusReports = statusReports.slice(0, take);
        }
        
        return Promise.resolve(statusReports);
      }),
      findUnique: jest.fn().mockImplementation(({ where, include }) => {
        if (where && where.id) {
          const statusReportState = global._mockStatusReportState || new Map();
          const statusReport = statusReportState.get(where.id);
          if (statusReport) {
            // Add group relation if include is specified
            if (include && include.group) {
              const groupState = global._mockGroupState || new Map();
              const group = groupState.get(statusReport.groupId);
              return Promise.resolve({
                ...statusReport,
                group: group || {
                  id: statusReport.groupId,
                  name: 'Test Group',
                  slug: 'test-group',
                  status: 'ACTIVE',
                  responsiblePersons: []
                }
              });
            }
            return Promise.resolve(statusReport);
          }
        }
        return Promise.resolve(null);
      }),
      create: jest.fn().mockImplementation(({ data }) => {
        const newStatusReport = {
          id: Math.random().toString(36).substring(2, 15),
          title: data.title || 'Test Status Report',
          content: data.content || 'Test content',
          reporterFirstName: data.reporterFirstName || 'Test',
          reporterLastName: data.reporterLastName || 'User',
          fileUrls: data.fileUrls || null,
          status: data.status || 'NEW',
          groupId: data.groupId || 'test-group-id',
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        // Store in a global status report state for retrieval
        global._mockStatusReportState = global._mockStatusReportState || new Map();
        global._mockStatusReportState.set(newStatusReport.id, newStatusReport);
        
        return Promise.resolve(newStatusReport);
      }),
      update: jest.fn().mockImplementation(({ where, data, include }) => {
        const statusReportState = global._mockStatusReportState || new Map();
        const existingStatusReport = statusReportState.get(where.id);
        
        if (existingStatusReport) {
          const updatedStatusReport = {
            ...existingStatusReport,
            ...data,
            updatedAt: new Date()
          };
          statusReportState.set(where.id, updatedStatusReport);
          
          // Add group relation if include is specified
          if (include && include.group) {
            const groupState = global._mockGroupState || new Map();
            const group = groupState.get(updatedStatusReport.groupId);
            return Promise.resolve({
              ...updatedStatusReport,
              group: group || {
                id: updatedStatusReport.groupId,
                name: 'Test Group',
                slug: 'test-group',
                status: 'ACTIVE',
                responsiblePersons: []
              }
            });
          }
          
          return Promise.resolve(updatedStatusReport);
        }
        
        return Promise.resolve(null);
      }),
      delete: jest.fn(),
      deleteMany: jest.fn(),
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
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    newsletterItem: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn().mockImplementation(({ where }) => {
        // Create a mock newsletter item if one is requested
        return Promise.resolve({
          id: where.id || 'test-newsletter-item-id',
          subject: 'Test Newsletter Subject',
          introductionText: 'Test introduction',
          content: '<html><body><h1>Test Newsletter</h1></body></html>',
          status: 'draft',
          createdAt: new Date(),
          updatedAt: new Date(),
          sentAt: null,
          recipientCount: null,
          settings: JSON.stringify({
            headerLogo: '/images/logo.png',
            footerText: 'Newsletter Footer',
            unsubscribeLink: 'https://example.com/unsubscribe',
            chunkSize: 50,
            chunkDelayMs: 1000,
            chunkResults: [],
            totalRecipients: 0,
            successfulSends: 0,
            failedSends: 0,
            sendingStartedAt: null,
            sendingCompletedAt: null
          })
        });
      }),
      create: jest.fn().mockImplementation(({ data }) => {
        // Return the created newsletter item with merged data
        return Promise.resolve({
          id: data.id || 'test-newsletter-item-id',
          subject: data.subject || 'Test Newsletter Subject',
          introductionText: data.introductionText || 'Test introduction',
          content: data.content || '<html><body><h1>Test Newsletter</h1></body></html>',
          status: data.status || 'draft',
          createdAt: new Date(),
          updatedAt: new Date(),
          sentAt: data.sentAt || null,
          recipientCount: data.recipientCount || null,
          settings: data.settings || JSON.stringify({
            headerLogo: '/images/logo.png',
            footerText: 'Newsletter Footer',
            unsubscribeLink: 'https://example.com/unsubscribe',
            chunkSize: 50,
            chunkDelayMs: 1000,
            chunkResults: [],
            totalRecipients: 0,
            successfulSends: 0,
            failedSends: 0,
            sendingStartedAt: null,
            sendingCompletedAt: null
          })
        });
      }),
      update: jest.fn().mockImplementation(({ where, data }) => {
        // Return updated newsletter item
        return Promise.resolve({
          id: where.id,
          subject: data.subject || 'Test Newsletter Subject',
          introductionText: data.introductionText || 'Test introduction',
          content: data.content || '<html><body><h1>Test Newsletter</h1></body></html>',
          status: data.status || 'draft',
          createdAt: new Date(),
          updatedAt: new Date(),
          sentAt: data.sentAt || null,
          recipientCount: data.recipientCount || null,
          settings: data.settings || JSON.stringify({
            headerLogo: '/images/logo.png',
            footerText: 'Newsletter Footer',
            unsubscribeLink: 'https://example.com/unsubscribe',
            chunkSize: 50,
            chunkDelayMs: 1000,
            chunkResults: [],
            totalRecipients: 0,
            successfulSends: 0,
            failedSends: 0,
            sendingStartedAt: null,
            sendingCompletedAt: null
          })
        });
      }),
      delete: jest.fn(),
      deleteMany: jest.fn(),
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
    antrag: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    antragConfiguration: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn().mockImplementation(async (callback) => {
      // Mock transaction with proper context
      let currentGroup = null;
      const currentResponsiblePersons = [];
      
      const tx = {
        group: {
          create: jest.fn().mockImplementation(({ data }) => {
            const groupId = Math.random().toString(36).substring(2, 15);
            currentGroup = {
              id: groupId,
              name: data.name || 'Test Group',
              slug: data.slug || data.name?.toLowerCase().replace(/\s+/g, '-') || 'test-group-slug',
              description: data.description || 'Test Description',
              logoUrl: data.logoUrl || null,
              status: data.status || 'NEW',
              metadata: data.metadata || null,
              createdAt: new Date(),
              updatedAt: new Date(),
              responsiblePersons: []
            };
            
            return Promise.resolve(currentGroup);
          }),
          update: jest.fn().mockResolvedValue({
            id: 'test-group-id',
            name: 'Test Group',
            slug: 'test-group-slug',
            description: 'Test Description',
            logoUrl: null,
            status: 'REJECTED',
            metadata: null,
            createdAt: new Date(),
            updatedAt: new Date()
          }),
          findUnique: jest.fn().mockResolvedValue({
            id: 'test-group-id',
            name: 'Test Group',
            slug: 'test-group-slug',
            description: 'Test Description',
            logoUrl: null,
            status: 'REJECTED',
            metadata: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            responsiblePersons: [{
              id: 'test-person-id',
              firstName: 'Test',
              lastName: 'Person',
              email: 'test@example.com',
              groupId: 'test-group-id'
            }]
          }),
          findMany: jest.fn().mockResolvedValue([]),
          delete: jest.fn(),
          deleteMany: jest.fn()
        },
        responsiblePerson: {
          create: jest.fn().mockImplementation(({ data }) => {
            const newPerson = {
              id: Math.random().toString(36).substring(2, 15),
              firstName: data.firstName,
              lastName: data.lastName,
              email: data.email,
              groupId: data.groupId
            };
            
            // Add to current group if it exists
            if (currentGroup && currentGroup.id === data.groupId) {
              currentGroup.responsiblePersons.push(newPerson);
            }
            
            currentResponsiblePersons.push(newPerson);
            return Promise.resolve(newPerson);
          }),
          deleteMany: jest.fn()
        },
        statusReport: {
          create: jest.fn().mockImplementation(({ data }) => {
            const newStatusReport = {
              id: Math.random().toString(36).substring(2, 15),
              title: data.title || 'Test Status Report',
              content: data.content || 'Test content',
              reporterFirstName: data.reporterFirstName || 'Test',
              reporterLastName: data.reporterLastName || 'User',
              fileUrls: data.fileUrls || null,
              status: data.status || 'NEW',
              groupId: data.groupId || 'test-group-id',
              createdAt: new Date(),
              updatedAt: new Date()
            };
            
            // Store in a global status report state for retrieval
            global._mockStatusReportState = global._mockStatusReportState || new Map();
            global._mockStatusReportState.set(newStatusReport.id, newStatusReport);
            
            return Promise.resolve(newStatusReport);
          }),
          deleteMany: jest.fn()
        },
        appointment: {
          deleteMany: jest.fn()
        },
        newsletter: {
          deleteMany: jest.fn()
        },
        newsletterItem: {
          deleteMany: jest.fn()
        }
      };
      
      const result = await callback(tx);
      
      // After transaction completes, store the group with responsible persons in global state
      if (currentGroup) {
        global._mockGroupState = global._mockGroupState || new Map();
        global._mockGroupState.set(currentGroup.id, currentGroup);
      }
      
      return result;
    }),
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

// email-hashing - now using real implementation

// Mock errors module - only mock the apiErrorResponse function
jest.mock('@/lib/errors', () => ({
  ...jest.requireActual('@/lib/errors'),
  apiErrorResponse: jest.fn().mockImplementation((error, message = 'An error occurred') => {
    return {
      status: 500,
      json: async () => ({ error: message }),
      headers: new Map()
    };
  })
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

// API authentication - now using real implementation from @/lib/api-auth


// newsletter-sending - now using real implementation

// Newsletter service is NOT mocked - we want to test real business logic
// Only external dependencies like email sending are mocked
// However, we need to mock getNewsletterSettings to avoid caching issues in tests
jest.mock('@/lib/newsletter-service', () => {
  const actual = jest.requireActual('@/lib/newsletter-service');
  return {
    ...actual,
    getNewsletterSettings: jest.fn(),
    sendNewsletterTestEmail: jest.fn()
  };
});

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

