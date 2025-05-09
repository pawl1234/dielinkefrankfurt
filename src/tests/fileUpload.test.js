// @jest/globals
import { describe, it, expect, beforeEach, afterEach, jest } from 'jest';
import fs from 'fs';
import path from 'path';
import { NextRequest } from 'next/server';
import { POST } from '../app/api/submit-appointment/route';

// Mock FormData and Blob
global.FormData = class FormData {
  constructor() {
    this.data = {};
  }
  append(key, value) {
    this.data[key] = value;
  }
  get(key) {
    return this.data[key];
  }
};

// Mock File
global.File = class File {
  constructor(bits, name, options = {}) {
    this.name = name;
    this.size = bits.length;
    this.type = options.type || 'application/octet-stream';
    this._bits = bits;
  }
  
  async arrayBuffer() {
    return Buffer.from(this._bits);
  }
};

// Mock NextRequest
jest.mock('next/server', () => ({
  NextRequest: jest.fn().mockImplementation((url, options = {}) => ({
    url,
    formData: jest.fn().mockImplementation(async () => options.formData || new FormData()),
  })),
  NextResponse: {
    json: jest.fn().mockImplementation((body, init) => ({
      body,
      init,
    })),
  },
}));

// Mock prisma
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    appointment: {
      create: jest.fn().mockResolvedValue({}),
    },
  },
}));

// Mock fs
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  unlinkSync: jest.fn(),
}));

describe('File Upload API', () => {
  let mockFormData;
  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  
  beforeEach(() => {
    mockFormData = new FormData();
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock form data with required fields
    mockFormData.append('teaser', 'Test Event');
    mockFormData.append('mainText', '<p>This is a test event</p>');
    mockFormData.append('startDateTime', new Date().toISOString());
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should handle file upload and save to uploads directory', async () => {
    // Mock file exists
    fs.existsSync.mockReturnValue(false);
    
    // Create test file
    const testFile = new File(['test file content'], 'test-image.jpg', { type: 'image/jpeg' });
    mockFormData.append('file', testFile);
    
    // Create mock request
    const request = new NextRequest('http://localhost:3000/api/submit-appointment', {
      formData: mockFormData
    });
    
    // Call the API route
    const response = await POST(request);
    
    // Assertions
    expect(fs.existsSync).toHaveBeenCalledWith(uploadDir);
    expect(fs.mkdirSync).toHaveBeenCalledWith(uploadDir, { recursive: true });
    expect(fs.writeFileSync).toHaveBeenCalled();
    expect(response.body.success).toBe(true);
  });

  it('should reject files that are too large', async () => {
    // Create large test file (6MB)
    const largeContent = new Array(6 * 1024 * 1024).fill('a').join('');
    const largeFile = new File([largeContent], 'large-file.jpg', { type: 'image/jpeg' });
    largeFile.size = 6 * 1024 * 1024; // Manually set size
    
    mockFormData.append('file', largeFile);
    
    // Create mock request
    const request = new NextRequest('http://localhost:3000/api/submit-appointment', {
      formData: mockFormData
    });
    
    // Call the API route
    const response = await POST(request);
    
    // Assertions
    expect(response.body.error).toContain('exceeds 5MB limit');
    expect(response.init.status).toBe(400);
  });

  it('should reject files with unsupported types', async () => {
    // Create unsupported file type
    const testFile = new File(['test content'], 'test.exe', { type: 'application/exe' });
    mockFormData.append('file', testFile);
    
    // Create mock request
    const request = new NextRequest('http://localhost:3000/api/submit-appointment', {
      formData: mockFormData
    });
    
    // Call the API route
    const response = await POST(request);
    
    // Assertions
    expect(response.body.error).toContain('Unsupported file type');
    expect(response.init.status).toBe(400);
  });
});