import { 
  validateFile, 
  uploadFile, 
  uploadCroppedImagePair, 
  deleteFiles, 
  validateStatusReportFiles,
  uploadStatusReportFiles,
  FileUploadError, 
  ALLOWED_IMAGE_TYPES, 
  ALLOWED_FILE_TYPES,
  MAX_LOGO_SIZE,
  MAX_FILE_SIZE,
  MAX_STATUS_REPORT_FILES_SIZE,
  MAX_STATUS_REPORT_FILES_COUNT
} from '../lib/file-upload';
import { put, del } from '@vercel/blob';

// Mock the Vercel Blob functions
jest.mock('@vercel/blob', () => ({
  put: jest.fn(),
  del: jest.fn()
}));

describe('File Upload Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateFile', () => {
    it('should accept valid image files', () => {
      const file = new File(['test image content'], 'test.jpg', { type: 'image/jpeg' });
      expect(() => validateFile(file, ALLOWED_IMAGE_TYPES, MAX_LOGO_SIZE)).not.toThrow();
    });

    it('should reject files with invalid types', () => {
      const file = new File(['test text content'], 'test.txt', { type: 'text/plain' });
      expect(() => validateFile(file, ALLOWED_IMAGE_TYPES, MAX_LOGO_SIZE)).toThrow(FileUploadError);
      expect(() => validateFile(file, ALLOWED_IMAGE_TYPES, MAX_LOGO_SIZE)).toThrow('Unsupported file type');
    });

    it('should reject files that exceed the size limit', () => {
      // Create a mock file with a size property overridden
      const file = new File(['test image content'], 'test.jpg', { type: 'image/jpeg' });
      Object.defineProperty(file, 'size', { value: MAX_LOGO_SIZE + 1 });

      expect(() => validateFile(file, ALLOWED_IMAGE_TYPES, MAX_LOGO_SIZE)).toThrow(FileUploadError);
      expect(() => validateFile(file, ALLOWED_IMAGE_TYPES, MAX_LOGO_SIZE)).toThrow('File size exceeds');
    });
  });

  describe('uploadFile', () => {
    it('should upload a file to blob storage', async () => {
      const mockUrl = 'https://example.com/test.jpg';
      (put as jest.Mock).mockResolvedValue({ url: mockUrl });

      const file = new File(['test image content'], 'test.jpg', { type: 'image/jpeg' });
      const result = await uploadFile(file, 'groups', 'logo');

      expect(result).toBe(mockUrl);
      expect(put).toHaveBeenCalled();
      expect(put).toHaveBeenCalledWith(
        expect.stringMatching(/^groups\/.+-logo-test.jpg$/),
        expect.any(Blob),
        expect.objectContaining({
          access: 'public',
          contentType: 'image/jpeg'
        })
      );
    });

    it('should handle upload errors', async () => {
      (put as jest.Mock).mockRejectedValue(new Error('Storage service unavailable'));

      const file = new File(['test image content'], 'test.jpg', { type: 'image/jpeg' });
      
      await expect(uploadFile(file, 'groups', 'logo')).rejects.toThrow(FileUploadError);
      await expect(uploadFile(file, 'groups', 'logo')).rejects.toThrow('Failed to upload file');
    });
  });

  describe('uploadCroppedImagePair', () => {
    it('should upload both original and cropped images', async () => {
      (put as jest.Mock).mockImplementation((path) => {
        if (path.includes('_crop')) {
          return Promise.resolve({ url: 'https://example.com/test_crop.jpg' });
        }
        return Promise.resolve({ url: 'https://example.com/test.jpg' });
      });

      const originalFile = new File(['original image content'], 'test.jpg', { type: 'image/jpeg' });
      const croppedFile = new File(['cropped image content'], 'test_crop.jpg', { type: 'image/jpeg' });

      const result = await uploadCroppedImagePair(originalFile, croppedFile, 'groups', 'logo');

      expect(result).toEqual({
        originalUrl: 'https://example.com/test.jpg',
        croppedUrl: 'https://example.com/test_crop.jpg'
      });
      
      expect(put).toHaveBeenCalledTimes(2);
    });

    it('should handle upload errors for cropped image pairs', async () => {
      (put as jest.Mock).mockRejectedValue(new Error('Storage service unavailable'));

      const originalFile = new File(['original image content'], 'test.jpg', { type: 'image/jpeg' });
      const croppedFile = new File(['cropped image content'], 'test_crop.jpg', { type: 'image/jpeg' });

      await expect(uploadCroppedImagePair(originalFile, croppedFile, 'groups', 'logo')).rejects.toThrow(FileUploadError);
      await expect(uploadCroppedImagePair(originalFile, croppedFile, 'groups', 'logo')).rejects.toThrow('Failed to upload images');
    });
  });

  describe('deleteFiles', () => {
    it('should delete multiple files from blob storage', async () => {
      (del as jest.Mock).mockResolvedValue({ success: true });

      const urls = [
        'https://example.com/test1.jpg',
        'https://example.com/test2.jpg'
      ];

      const result = await deleteFiles(urls);

      expect(result).toEqual({ success: true });
      expect(del).toHaveBeenCalledWith(urls);
    });

    it('should handle empty array of URLs', async () => {
      const result = await deleteFiles([]);

      expect(result).toEqual({ success: true });
      expect(del).not.toHaveBeenCalled();
    });

    it('should handle deletion errors without throwing', async () => {
      (del as jest.Mock).mockRejectedValue(new Error('Storage service unavailable'));

      const urls = ['https://example.com/test.jpg'];
      const result = await deleteFiles(urls);

      expect(result).toEqual({ success: false });
      expect(del).toHaveBeenCalled();
    });
  });
  
  describe('validateStatusReportFiles', () => {
    it('should validate files successfully when all criteria are met', () => {
      // Create valid files
      const files = [
        new File(['test pdf content'], 'test.pdf', { type: 'application/pdf' }),
        new File(['test image content'], 'test.jpg', { type: 'image/jpeg' })
      ];
      
      // This should not throw
      expect(() => validateStatusReportFiles(files)).not.toThrow();
    });
    
    it('should throw error if too many files are provided', () => {
      // Create more files than allowed
      const files = Array(MAX_STATUS_REPORT_FILES_COUNT + 1)
        .fill(null)
        .map((_, i) => new File(['test content'], `file${i}.pdf`, { type: 'application/pdf' }));
      
      expect(() => validateStatusReportFiles(files)).toThrow(FileUploadError);
      expect(() => validateStatusReportFiles(files)).toThrow(`Too many files. Maximum of ${MAX_STATUS_REPORT_FILES_COUNT} files allowed.`);
    });
    
    it('should throw error if file type is not allowed', () => {
      const files = [
        new File(['test pdf content'], 'test.pdf', { type: 'application/pdf' }),
        new File(['test text content'], 'test.txt', { type: 'text/plain' })
      ];
      
      expect(() => validateStatusReportFiles(files)).toThrow(FileUploadError);
      expect(() => validateStatusReportFiles(files)).toThrow('Unsupported file type');
    });
    
    it('should throw error if individual file size is too large', () => {
      const file1 = new File(['test pdf content'], 'test.pdf', { type: 'application/pdf' });
      const file2 = new File(['test pdf content'], 'large.pdf', { type: 'application/pdf' });
      // Override size property
      Object.defineProperty(file2, 'size', { value: MAX_FILE_SIZE + 1024 });
      
      const files = [file1, file2];
      
      expect(() => validateStatusReportFiles(files)).toThrow(FileUploadError);
      expect(() => validateStatusReportFiles(files)).toThrow('exceeds 5MB limit');
    });
    
    it('should throw error if combined file size is too large', () => {
      // Create files that individually are fine but together exceed the limit
      const singleFileSize = Math.floor(MAX_STATUS_REPORT_FILES_SIZE / 2) + 1024; // Just over half the limit
      
      const file1 = new File(['test pdf content'], 'file1.pdf', { type: 'application/pdf' });
      const file2 = new File(['test pdf content'], 'file2.pdf', { type: 'application/pdf' });
      
      // Override size properties
      Object.defineProperty(file1, 'size', { value: singleFileSize });
      Object.defineProperty(file2, 'size', { value: singleFileSize });
      
      const files = [file1, file2];
      
      expect(() => validateStatusReportFiles(files)).toThrow(FileUploadError);
      expect(() => validateStatusReportFiles(files)).toThrow('Total file size exceeds');
    });
  });
  
  describe('uploadStatusReportFiles', () => {
    it('should return empty array if no files are provided', async () => {
      const result = await uploadStatusReportFiles([]);
      expect(result).toEqual([]);
      expect(put).not.toHaveBeenCalled();
    });
    
    it('should upload multiple files successfully', async () => {
      // Mock the put function to return different URLs for each call
      (put as jest.Mock).mockImplementation((path) => {
        return Promise.resolve({ url: `https://example.com/${path}` });
      });
      
      const files = [
        new File(['test pdf content'], 'test.pdf', { type: 'application/pdf' }),
        new File(['test image content'], 'test.jpg', { type: 'image/jpeg' })
      ];
      
      const result = await uploadStatusReportFiles(files);
      
      expect(result).toHaveLength(2);
      expect(result[0]).toContain('https://example.com/status-reports/');
      expect(result[1]).toContain('https://example.com/status-reports/');
      expect(put).toHaveBeenCalledTimes(2);
    });
    
    it('should throw FileUploadError if upload fails', async () => {
      // Mock the put function to throw an error
      (put as jest.Mock).mockRejectedValue(new Error('Upload failed'));
      
      const files = [new File(['test pdf content'], 'test.pdf', { type: 'application/pdf' })];
      
      await expect(uploadStatusReportFiles(files)).rejects.toThrow(FileUploadError);
      await expect(uploadStatusReportFiles(files)).rejects.toThrow('Failed to upload files');
    });
    
    it('should validate files before uploading', async () => {
      // Create invalid files (wrong type)
      const files = [
        new File(['test text content'], 'test.txt', { type: 'text/plain' })
      ];
      
      await expect(uploadStatusReportFiles(files)).rejects.toThrow(FileUploadError);
      await expect(uploadStatusReportFiles(files)).rejects.toThrow('Unsupported file type');
      expect(put).not.toHaveBeenCalled();
    });
  });
});