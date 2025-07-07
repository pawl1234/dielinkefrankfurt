import { NextRequest } from 'next/server';
import { POST } from '@/app/api/groups/submit/route';
import prisma from '@/lib/prisma';
import { put } from '@vercel/blob';

// Note: External dependencies are already mocked in jest.setup.js:
// - @vercel/blob (file storage)
// - @/lib/prisma (database)
// - @/lib/email (email sending)

describe('Group Logo Upload API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock the transaction to call the callback immediately
    (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
      // Create a mock transaction context that mimics Prisma's transaction API
      const txMock = {
        group: {
          create: prisma.group.create
        },
        responsiblePerson: {
          create: jest.fn()
        }
      };
      return callback(txMock);
    });
  });
  
  it('should handle group submission with logo upload', async () => {
    // Mock the external services (Vercel Blob for file uploads)
    (put as jest.Mock).mockResolvedValue({
      url: 'https://example.com/test-logo.jpg'
    });
    
    // Mock the database response
    (prisma.group.create as jest.Mock).mockResolvedValue({
      id: 'group-123',
      name: 'Test Group',
      slug: 'test-group',
      description: 'This is a test group description',
      status: 'NEW',
      logoUrl: 'https://example.com/test-logo.jpg',
      metadata: JSON.stringify({
        originalUrl: 'https://example.com/test-logo.jpg',
        croppedUrl: 'https://example.com/test-logo.jpg'
      }),
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z'),
      responsiblePersons: [{
        id: 'person-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        groupId: 'group-123'
      }]
    });
    
    // Create mock files
    const originalLogo = new File(['original image content'], 'logo.jpg', { type: 'image/jpeg' });
    const croppedLogo = new File(['cropped image content'], 'cropped-logo.jpg', { type: 'image/jpeg' });
    
    // Create form data
    const formData = new FormData();
    formData.append('name', 'Test Group');
    formData.append('description', 'This is a test group description that needs to be at least 50 characters long to pass validation');
    formData.append('responsiblePersonsCount', '1');
    formData.append('responsiblePerson[0].firstName', 'John');
    formData.append('responsiblePerson[0].lastName', 'Doe');
    formData.append('responsiblePerson[0].email', 'john.doe@example.com');
    formData.append('logo', originalLogo);
    formData.append('croppedLogo', croppedLogo);
    
    // Create mock request
    const request = new NextRequest('https://example.com/api/groups/submit', {
      method: 'POST',
      body: formData
    });
    
    // Call the API handler
    const response = await POST(request);
    const data = await response.json();
    
    // Verify the response
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.group.id).toBeDefined();
    expect(data.group.name).toBe('Test Group');
    expect(data.group.logoUrl).toBe('https://example.com/test-logo.jpg');
    
    // Verify that file upload (put) was called for both files
    expect(put).toHaveBeenCalledTimes(2); // Once for original, once for cropped
    
    // Verify database create was called
    expect(prisma.group.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'Test Group',
        description: 'This is a test group description that needs to be at least 50 characters long to pass validation',
        logoUrl: 'https://example.com/test-logo.jpg',
        status: 'NEW',
        metadata: expect.stringContaining('originalUrl')
      })
    });
  });
  
  it('should handle group submission without logo', async () => {
    // Mock the database response (no logo)
    (prisma.group.create as jest.Mock).mockResolvedValue({
      id: 'group-123',
      name: 'Test Group',
      slug: 'test-group',
      description: 'This is a test group description',
      status: 'NEW',
      logoUrl: null,
      metadata: null,
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z'),
      responsiblePersons: [{
        id: 'person-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        groupId: 'group-123'
      }]
    });
    
    // Create form data
    const formData = new FormData();
    formData.append('name', 'Test Group');
    formData.append('description', 'This is a test group description that needs to be at least 50 characters long to pass validation');
    formData.append('responsiblePersonsCount', '1');
    formData.append('responsiblePerson[0].firstName', 'John');
    formData.append('responsiblePerson[0].lastName', 'Doe');
    formData.append('responsiblePerson[0].email', 'john.doe@example.com');
    
    // Create mock request
    const request = new NextRequest('https://example.com/api/groups/submit', {
      method: 'POST',
      body: formData
    });
    
    // Call the API handler
    const response = await POST(request);
    const data = await response.json();
    
    // Verify the response
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.group.id).toBeDefined();
    expect(data.group.logoUrl).toBeNull();
    
    // Verify file upload was not called (no logo provided)
    expect(put).not.toHaveBeenCalled();
    
    // Verify database create was called without logo
    expect(prisma.group.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'Test Group',
        description: 'This is a test group description that needs to be at least 50 characters long to pass validation',
        logoUrl: undefined,
        status: 'NEW',
        metadata: null,
        slug: expect.stringMatching(/^test-group-\d+$/)
      })
    });
  });
  
  it('should handle file validation errors', async () => {
    // Create a file that exceeds the size limit (3MB)
    const largeFileContent = new Uint8Array(3 * 1024 * 1024); // 3MB
    const tooLargeLogo = new File([largeFileContent], 'toolarge.jpg', { type: 'image/jpeg' });
    
    // Create form data with the too-large file
    const formData = new FormData();
    formData.append('name', 'Test Group');
    formData.append('description', 'This is a test group description that needs to be at least 50 characters long to pass validation');
    formData.append('logo', tooLargeLogo); // This will trigger validation error
    formData.append('croppedLogo', tooLargeLogo);
    
    // Create mock request
    const request = new NextRequest('https://example.com/api/groups/submit', {
      method: 'POST',
      body: formData
    });
    
    // Call the API handler
    const response = await POST(request);
    const data = await response.json();
    
    // Verify the response
    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('File size exceeds 2MB limit');
    
    // Verify file upload was not called due to validation error
    expect(put).not.toHaveBeenCalled();
    
    // Verify database create was not called
    expect(prisma.group.create).not.toHaveBeenCalled();
  });
  
  it('should handle upload failures', async () => {
    // Mock the external file upload service to fail
    (put as jest.Mock).mockRejectedValue(new Error('Network error'));
    
    // Create mock files
    const originalLogo = new File(['original image content'], 'logo.jpg', { type: 'image/jpeg' });
    const croppedLogo = new File(['cropped image content'], 'cropped-logo.jpg', { type: 'image/jpeg' });
    
    // Create form data
    const formData = new FormData();
    formData.append('name', 'Test Group');
    formData.append('description', 'This is a test group description that needs to be at least 50 characters long to pass validation');
    formData.append('logo', originalLogo);
    formData.append('croppedLogo', croppedLogo);
    
    // Create mock request
    const request = new NextRequest('https://example.com/api/groups/submit', {
      method: 'POST',
      body: formData
    });
    
    // Call the API handler
    const response = await POST(request);
    const data = await response.json();
    
    // Verify the response
    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Failed to upload');
    
    // Verify file upload was attempted
    expect(put).toHaveBeenCalled();
    
    // Verify database create was not called due to upload failure
    expect(prisma.group.create).not.toHaveBeenCalled();
  }, 15000); // Increase timeout for retry logic
});