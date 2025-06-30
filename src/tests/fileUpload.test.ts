import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Import the appointment creation function
import { createAppointment } from '@/lib/appointment-handlers';
import prisma from '@/lib/prisma';

// Mock Vercel Blob Storage
jest.mock('@vercel/blob', () => ({
  put: jest.fn(),
  del: jest.fn()
}));

// Import the mocked functions
import { put } from '@vercel/blob';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockPut = put as jest.MockedFunction<typeof put>;

// Mock FormData and File for the test environment
global.FormData = class FormData {
  constructor() {
    this.data = new Map();
  }
  
  append(key, value) {
    if (this.data.has(key)) {
      const existing = this.data.get(key);
      if (Array.isArray(existing)) {
        existing.push(value);
      } else {
        this.data.set(key, [existing, value]);
      }
    } else {
      this.data.set(key, value);
    }
  }
  
  get(key) {
    const value = this.data.get(key);
    return Array.isArray(value) ? value[0] : value;
  }
  
  getAll(key) {
    const value = this.data.get(key);
    return Array.isArray(value) ? value : (value ? [value] : []);
  }
  
  has(key) {
    return this.data.has(key);
  }
  
  entries() {
    return this.data.entries();
  }
};

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

global.Blob = class Blob {
  constructor(parts, options = {}) {
    this.size = parts.reduce((acc, part) => acc + part.length, 0);
    this.type = options.type || '';
    this._parts = parts;
  }
};

describe('File Upload API', () => {
  let mockFormData;
  
  beforeEach(() => {
    mockFormData = new FormData();
    jest.clearAllMocks();
    
    // Mock successful database connection test
    mockPrisma.$queryRaw.mockResolvedValue([{ connection_test: 1 }]);
    
    // Mock successful appointment creation
    mockPrisma.appointment.create.mockResolvedValue({
      id: 1,
      title: 'Test Event',
      teaser: 'Test teaser',
      status: 'pending'
    });
    
    // Mock successful blob upload
    mockPut.mockResolvedValue({
      url: 'https://example.com/test-file.jpg'
    });
    
    // Set up basic form data with required fields
    mockFormData.append('title', 'Test Event');
    mockFormData.append('teaser', 'Test teaser');
    mockFormData.append('mainText', '<p>This is a test event</p>');
    mockFormData.append('startDateTime', new Date().toISOString());
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should handle file upload and save to Vercel Blob Store', async () => {
    // Create test file
    const testFile = new File(['test file content'], 'test-image.jpg', { type: 'image/jpeg' });
    mockFormData.append('fileCount', '1');
    mockFormData.append('file-0', testFile);
    
    // Create mock request with formData method
    const request = {
      formData: jest.fn().mockResolvedValue(mockFormData)
    };
    
    // Call the appointment creation function
    const response = await createAppointment(request);
    const responseData = await response.json();
    
    // Verify the response
    expect(responseData.success).toBe(true);
    expect(responseData.appointmentId).toBe(1);
    
    // Verify blob upload was called
    expect(mockPut).toHaveBeenCalledWith(
      expect.stringMatching(/^appointments\/\d+-0-test-image\.jpg$/),
      expect.any(Blob),
      expect.objectContaining({
        access: 'public',
        contentType: 'image/jpeg',
        addRandomSuffix: false,
        cacheControlMaxAge: 31536000
      })
    );
    
    // Verify database create was called with file URLs
    expect(mockPrisma.appointment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: 'Test Event',
        fileUrls: '["https://example.com/test-file.jpg"]'
      })
    });
  });

  it('should reject files that are too large', async () => {
    // Create large test file (6MB) - simulate size by setting the size property
    const largeFile = new File(['a'.repeat(1000)], 'large-file.jpg', { type: 'image/jpeg' });
    // Override the size property to simulate a large file
    Object.defineProperty(largeFile, 'size', { value: 6 * 1024 * 1024 });
    
    mockFormData.append('fileCount', '1');
    mockFormData.append('file-0', largeFile);
    
    const request = {
      formData: jest.fn().mockResolvedValue(mockFormData)
    };
    
    // Call the appointment creation function
    const response = await createAppointment(request);
    const responseData = await response.json();
    
    // Verify the response shows an error
    expect(response.status).toBe(400);
    expect(responseData.error).toContain('Dateigröße überschreitet das Limit');
    
    // Verify blob upload was not called
    expect(mockPut).not.toHaveBeenCalled();
    
    // Verify database create was not called
    expect(mockPrisma.appointment.create).not.toHaveBeenCalled();
  });

  it('should reject files with unsupported types', async () => {
    // Create unsupported file type
    const testFile = new File(['test content'], 'test.exe', { type: 'application/exe' });
    mockFormData.append('fileCount', '1');
    mockFormData.append('file-0', testFile);
    
    const request = {
      formData: jest.fn().mockResolvedValue(mockFormData)
    };
    
    // Call the appointment creation function
    const response = await createAppointment(request);
    const responseData = await response.json();
    
    // Verify the response shows an error
    expect(response.status).toBe(400);
    expect(responseData.error).toContain('Nicht unterstützter Dateityp');
    
    // Verify blob upload was not called
    expect(mockPut).not.toHaveBeenCalled();
    
    // Verify database create was not called
    expect(mockPrisma.appointment.create).not.toHaveBeenCalled();
  });

  it('should handle multiple file uploads', async () => {
    // Create multiple test files
    const file1 = new File(['test file 1'], 'image1.jpg', { type: 'image/jpeg' });
    const file2 = new File(['test file 2'], 'document.pdf', { type: 'application/pdf' });
    
    mockFormData.append('fileCount', '2');
    mockFormData.append('file-0', file1);
    mockFormData.append('file-1', file2);
    
    // Mock multiple blob uploads
    mockPut
      .mockResolvedValueOnce({ url: 'https://example.com/image1.jpg' })
      .mockResolvedValueOnce({ url: 'https://example.com/document.pdf' });
    
    const request = {
      formData: jest.fn().mockResolvedValue(mockFormData)
    };
    
    // Call the appointment creation function
    const response = await createAppointment(request);
    const responseData = await response.json();
    
    // Verify the response
    expect(responseData.success).toBe(true);
    
    // Verify blob upload was called twice
    expect(mockPut).toHaveBeenCalledTimes(2);
    
    // Verify database create was called with both file URLs
    expect(mockPrisma.appointment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        fileUrls: '["https://example.com/image1.jpg","https://example.com/document.pdf"]'
      })
    });
  });

  it('should create appointment without files when no fileCount is provided', async () => {
    // Don't add any files to the form data
    
    const request = {
      formData: jest.fn().mockResolvedValue(mockFormData)
    };
    
    // Call the appointment creation function
    const response = await createAppointment(request);
    const responseData = await response.json();
    
    // Verify the response
    expect(responseData.success).toBe(true);
    
    // Verify blob upload was not called
    expect(mockPut).not.toHaveBeenCalled();
    
    // Verify database create was called without file URLs
    expect(mockPrisma.appointment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: 'Test Event',
        fileUrls: null
      })
    });
  });

  it('should handle featured appointments with cover images', async () => {
    // Set up featured appointment
    mockFormData.append('featured', 'true');
    const coverImage = new File(['cover image content'], 'cover.jpg', { type: 'image/jpeg' });
    const croppedCoverImage = new File(['cropped cover'], 'cover-crop.jpg', { type: 'image/jpeg' });
    mockFormData.append('coverImage', coverImage);
    mockFormData.append('croppedCoverImage', croppedCoverImage);
    
    // Mock blob uploads for cover images
    mockPut
      .mockResolvedValueOnce({ url: 'https://example.com/cover.jpg' })
      .mockResolvedValueOnce({ url: 'https://example.com/cover-crop.jpg' });
    
    const request = {
      formData: jest.fn().mockResolvedValue(mockFormData)
    };
    
    // Call the appointment creation function
    const response = await createAppointment(request);
    const responseData = await response.json();
    
    // Verify the response
    expect(responseData.success).toBe(true);
    
    // Verify blob upload was called for cover images
    expect(mockPut).toHaveBeenCalledTimes(2);
    
    // Verify database create was called with metadata containing cover image URLs
    expect(mockPrisma.appointment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        featured: true,
        metadata: expect.stringContaining('coverImageUrl')
      })
    });
  });
});