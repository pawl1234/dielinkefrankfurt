import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { createAppointment } from '@/lib/appointment-handlers';
import prisma from '@/lib/prisma';
import { put } from '@vercel/blob';

// Mock Vercel Blob Storage
jest.mock('@vercel/blob', () => ({
  put: jest.fn(),
  del: jest.fn()
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockPut = put as jest.MockedFunction<typeof put>;

describe('File Upload API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful database connection test
    mockPrisma.$queryRaw.mockResolvedValue([{ connection_test: 1 }]);
    
    // Mock successful appointment creation
    mockPrisma.appointment.create.mockResolvedValue({
      id: 1,
      title: 'Test Event',
      teaser: 'Test teaser',
      status: 'pending',
      mainText: 'Test content',
      startDateTime: new Date(),
      endDateTime: null,
      street: '',
      city: '',
      state: '',
      postalCode: '',
      firstName: '',
      lastName: '',
      recurringText: '',
      featured: false,
      processed: false,
      fileUrls: null,
      metadata: null,
      rejectionReason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      processingDate: null,
      statusChangeDate: null
    });
    
    // Mock successful blob upload
    mockPut.mockResolvedValue({
      url: 'https://example.com/test-file.jpg'
    });
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should handle file upload and save to Vercel Blob Store', async () => {
    const formData = new FormData();
    formData.append('title', 'Test Event');
    formData.append('teaser', 'Test teaser');
    formData.append('mainText', '<p>This is a test event</p>');
    formData.append('startDateTime', new Date().toISOString());
    formData.append('fileCount', '1');
    
    const testFile = new File(['test file content'], 'test-image.jpg', { type: 'image/jpeg' });
    formData.append('file-0', testFile);
    
    const request = new NextRequest('http://localhost:3000/api/submit-appointment', {
      method: 'POST',
      body: formData
    });
    
    const response = await createAppointment(request);
    const responseData = await response.json();
    
    // Verify successful response
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

  it('should handle multiple file uploads', async () => {
    const formData = new FormData();
    formData.append('title', 'Test Event');
    formData.append('teaser', 'Test teaser');
    formData.append('mainText', '<p>This is a test event</p>');
    formData.append('startDateTime', new Date().toISOString());
    formData.append('fileCount', '2');
    
    const file1 = new File(['test file 1'], 'image1.jpg', { type: 'image/jpeg' });
    const file2 = new File(['test file 2'], 'document.pdf', { type: 'application/pdf' });
    formData.append('file-0', file1);
    formData.append('file-1', file2);
    
    // Mock multiple blob uploads
    mockPut
      .mockResolvedValueOnce({ url: 'https://example.com/image1.jpg' })
      .mockResolvedValueOnce({ url: 'https://example.com/document.pdf' });
    
    const request = new NextRequest('http://localhost:3000/api/submit-appointment', {
      method: 'POST',
      body: formData
    });
    
    const response = await createAppointment(request);
    const responseData = await response.json();
    
    // Verify successful response
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
    const formData = new FormData();
    formData.append('title', 'Test Event');
    formData.append('teaser', 'Test teaser');
    formData.append('mainText', '<p>This is a test event</p>');
    formData.append('startDateTime', new Date().toISOString());
    
    const request = new NextRequest('http://localhost:3000/api/submit-appointment', {
      method: 'POST',
      body: formData
    });
    
    const response = await createAppointment(request);
    const responseData = await response.json();
    
    // Verify successful response
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
    const formData = new FormData();
    formData.append('title', 'Test Event');
    formData.append('teaser', 'Test teaser');
    formData.append('mainText', '<p>This is a test event</p>');
    formData.append('startDateTime', new Date().toISOString());
    formData.append('featured', 'true');
    
    const coverImage = new File(['cover image content'], 'cover.jpg', { type: 'image/jpeg' });
    const croppedCoverImage = new File(['cropped cover'], 'cover-crop.jpg', { type: 'image/jpeg' });
    formData.append('coverImage', coverImage);
    formData.append('croppedCoverImage', croppedCoverImage);
    
    // Mock blob uploads for cover images
    mockPut
      .mockResolvedValueOnce({ url: 'https://example.com/cover.jpg' })
      .mockResolvedValueOnce({ url: 'https://example.com/cover-crop.jpg' });
    
    const request = new NextRequest('http://localhost:3000/api/submit-appointment', {
      method: 'POST',
      body: formData
    });
    
    const response = await createAppointment(request);
    const responseData = await response.json();
    
    // Verify successful response
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

  it('should handle blob upload errors gracefully', async () => {
    const formData = new FormData();
    formData.append('title', 'Test Event');
    formData.append('teaser', 'Test teaser');
    formData.append('mainText', '<p>This is a test event</p>');
    formData.append('startDateTime', new Date().toISOString());
    formData.append('fileCount', '1');
    
    const testFile = new File(['test file content'], 'test-image.jpg', { type: 'image/jpeg' });
    formData.append('file-0', testFile);
    
    // Mock blob upload failure
    mockPut.mockRejectedValue(new Error('Upload failed'));
    
    const request = new NextRequest('http://localhost:3000/api/submit-appointment', {
      method: 'POST',
      body: formData
    });
    
    const response = await createAppointment(request);
    const responseData = await response.json();
    
    // Verify error response
    expect(responseData.success).toBeFalsy();
    expect(responseData.error).toBeDefined();
    
    // Verify database create was not called
    expect(mockPrisma.appointment.create).not.toHaveBeenCalled();
  });

  it('should handle database errors gracefully', async () => {
    const formData = new FormData();
    formData.append('title', 'Test Event');
    formData.append('teaser', 'Test teaser');
    formData.append('mainText', '<p>This is a test event</p>');
    formData.append('startDateTime', new Date().toISOString());
    
    // Mock database error
    mockPrisma.appointment.create.mockRejectedValue(new Error('Database error'));
    
    const request = new NextRequest('http://localhost:3000/api/submit-appointment', {
      method: 'POST',
      body: formData
    });
    
    const response = await createAppointment(request);
    const responseData = await response.json();
    
    // Verify error response
    expect(responseData.success).toBeFalsy();
    expect(responseData.error).toBeDefined();
  });
});