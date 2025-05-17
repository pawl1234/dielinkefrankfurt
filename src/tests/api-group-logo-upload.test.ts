import { NextRequest } from 'next/server';
import { POST } from '@/app/api/groups/submit/route';
import * as fileUpload from '@/lib/file-upload';
import * as groupHandlers from '@/lib/group-handlers';

// Mock the file upload functionality
jest.mock('@/lib/file-upload', () => ({
  validateFile: jest.fn(),
  uploadCroppedImagePair: jest.fn(),
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif'],
  MAX_LOGO_SIZE: 2 * 1024 * 1024,
  FileUploadError: class FileUploadError extends Error {
    constructor(message: string, public status: number = 500) {
      super(message);
      this.name = 'FileUploadError';
    }
  }
}));

// Mock the group handlers
jest.mock('@/lib/group-handlers', () => ({
  createGroup: jest.fn(),
  ResponsiblePersonCreateData: {}
}));

describe('Group Logo Upload API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('should handle group submission with logo upload', async () => {
    // Mock the file upload return value
    (fileUpload.uploadCroppedImagePair as jest.Mock).mockResolvedValue({
      originalUrl: 'https://example.com/original-logo.jpg',
      croppedUrl: 'https://example.com/cropped-logo.jpg'
    });
    
    // Mock the createGroup return value
    (groupHandlers.createGroup as jest.Mock).mockResolvedValue({
      id: 'group-123',
      name: 'Test Group',
      slug: 'test-group'
    });
    
    // Create mock files
    const originalLogo = new File(['original image content'], 'logo.jpg', { type: 'image/jpeg' });
    const croppedLogo = new File(['cropped image content'], 'cropped-logo.jpg', { type: 'image/jpeg' });
    
    // Create form data
    const formData = new FormData();
    formData.append('name', 'Test Group');
    formData.append('description', 'This is a test group description');
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
    expect(data.group.id).toBe('group-123');
    
    // Verify file upload was called correctly
    expect(fileUpload.validateFile).toHaveBeenCalledWith(
      originalLogo,
      fileUpload.ALLOWED_IMAGE_TYPES,
      fileUpload.MAX_LOGO_SIZE
    );
    
    expect(fileUpload.uploadCroppedImagePair).toHaveBeenCalledWith(
      originalLogo,
      croppedLogo,
      'groups',
      'logo'
    );
    
    // Verify createGroup was called with correct parameters
    expect(groupHandlers.createGroup).toHaveBeenCalledWith({
      name: 'Test Group',
      description: 'This is a test group description',
      logoMetadata: {
        originalUrl: 'https://example.com/original-logo.jpg',
        croppedUrl: 'https://example.com/cropped-logo.jpg'
      },
      responsiblePersons: [
        {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com'
        }
      ]
    });
  });
  
  it('should handle group submission without logo', async () => {
    // Mock the createGroup return value
    (groupHandlers.createGroup as jest.Mock).mockResolvedValue({
      id: 'group-123',
      name: 'Test Group',
      slug: 'test-group'
    });
    
    // Create form data
    const formData = new FormData();
    formData.append('name', 'Test Group');
    formData.append('description', 'This is a test group description');
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
    expect(data.group.id).toBe('group-123');
    
    // Verify file upload was not called
    expect(fileUpload.validateFile).not.toHaveBeenCalled();
    expect(fileUpload.uploadCroppedImagePair).not.toHaveBeenCalled();
    
    // Verify createGroup was called with correct parameters
    expect(groupHandlers.createGroup).toHaveBeenCalledWith({
      name: 'Test Group',
      description: 'This is a test group description',
      logoMetadata: undefined,
      responsiblePersons: [
        {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com'
        }
      ]
    });
  });
  
  it('should handle file validation errors', async () => {
    // Mock the file validation to throw an error
    (fileUpload.validateFile as jest.Mock).mockImplementation(() => {
      throw new fileUpload.FileUploadError('File size exceeds 2MB limit', 400);
    });
    
    // Create mock files
    const originalLogo = new File(['original image content'], 'logo.jpg', { type: 'image/jpeg' });
    const croppedLogo = new File(['cropped image content'], 'cropped-logo.jpg', { type: 'image/jpeg' });
    
    // Create form data
    const formData = new FormData();
    formData.append('name', 'Test Group');
    formData.append('description', 'This is a test group description');
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
    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe('File size exceeds 2MB limit');
    
    // Verify file validation was called but not upload
    expect(fileUpload.validateFile).toHaveBeenCalled();
    expect(fileUpload.uploadCroppedImagePair).not.toHaveBeenCalled();
    
    // Verify createGroup was not called
    expect(groupHandlers.createGroup).not.toHaveBeenCalled();
  });
  
  it('should handle upload failures', async () => {
    // Mock the file upload to throw an error
    (fileUpload.validateFile as jest.Mock).mockImplementation(() => {});
    (fileUpload.uploadCroppedImagePair as jest.Mock).mockImplementation(() => {
      throw new fileUpload.FileUploadError('Failed to upload file', 500);
    });
    
    // Create mock files
    const originalLogo = new File(['original image content'], 'logo.jpg', { type: 'image/jpeg' });
    const croppedLogo = new File(['cropped image content'], 'cropped-logo.jpg', { type: 'image/jpeg' });
    
    // Create form data
    const formData = new FormData();
    formData.append('name', 'Test Group');
    formData.append('description', 'This is a test group description');
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
    expect(data.error).toBe('Failed to upload file');
    
    // Verify file validation and upload were called
    expect(fileUpload.validateFile).toHaveBeenCalled();
    expect(fileUpload.uploadCroppedImagePair).toHaveBeenCalled();
    
    // Verify createGroup was not called
    expect(groupHandlers.createGroup).not.toHaveBeenCalled();
  });
});