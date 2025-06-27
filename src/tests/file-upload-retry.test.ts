import { uploadFile, uploadCroppedImagePair, deleteFiles, FileUploadError } from '@/lib/file-upload';
import { put, del } from '@vercel/blob';

// Mock Vercel Blob's put and del functions
jest.mock('@vercel/blob', () => ({
  put: jest.fn(),
  del: jest.fn()
}));

// Mock global console methods
global.console.log = jest.fn();
global.console.error = jest.fn();
global.console.warn = jest.fn();

describe('File Upload Retry Mechanisms', () => {
  let mockFile: File;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create a mock file for testing
    const blob = new Blob(['test file content'], { type: 'image/jpeg' });
    mockFile = new File([blob], 'test-image.jpg', { type: 'image/jpeg' });
    
    // Mock the arrayBuffer method on File
    mockFile.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(10));
  });
  
  describe('uploadFile with retry', () => {
    it('should upload a file successfully on first attempt', async () => {
      // Mock successful upload
      (put as jest.Mock).mockResolvedValueOnce({ url: 'https://example.com/test-image.jpg' });
      
      const url = await uploadFile(mockFile, 'tests', 'test', {
        maxRetries: 3,
        retryDelay: 10
      });
      
      expect(url).toBe('https://example.com/test-image.jpg');
      expect(put).toHaveBeenCalledTimes(1);
      expect(mockFile.arrayBuffer).toHaveBeenCalledTimes(1);
    });
    
    it('should retry on failure and succeed on second attempt', async () => {
      // Mock a failure followed by success
      (put as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ url: 'https://example.com/test-image.jpg' });
      
      const onRetry = jest.fn();
      
      const url = await uploadFile(mockFile, 'tests', 'test', {
        maxRetries: 3,
        retryDelay: 10, // Short delay for tests
        onRetry
      });
      
      expect(url).toBe('https://example.com/test-image.jpg');
      expect(put).toHaveBeenCalledTimes(2);
      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('❌ Upload attempt'), 
        expect.any(Error)
      );
    });
    
    it('should throw error after max retries exceeded', async () => {
      // Mock consistent failures
      (put as jest.Mock).mockRejectedValue(new Error('Network error'));
      
      await expect(uploadFile(mockFile, 'tests', 'test', {
        maxRetries: 2,
        retryDelay: 10
      })).rejects.toThrow(FileUploadError);
      
      expect(put).toHaveBeenCalledTimes(3); // Initial attempt + 2 retries
      expect(console.error).toHaveBeenCalledTimes(3);
    });
    
    it('should report progress during upload', async () => {
      // Mock successful upload
      (put as jest.Mock).mockResolvedValueOnce({ url: 'https://example.com/test-image.jpg' });
      
      const onProgress = jest.fn();
      
      await uploadFile(mockFile, 'tests', 'test', { onProgress });
      
      expect(onProgress).toHaveBeenCalledWith(0); // Start progress
      expect(onProgress).toHaveBeenCalledWith(100); // Complete progress
      expect(onProgress).toHaveBeenCalledTimes(2);
    });
  });
  
  describe('uploadCroppedImagePair with retry', () => {
    let mockCroppedFile: File;
    
    beforeEach(() => {
      // Create a mock cropped file
      const croppedBlob = new Blob(['cropped content'], { type: 'image/jpeg' });
      mockCroppedFile = new File([croppedBlob], 'cropped-image.jpg', { type: 'image/jpeg' });
      mockCroppedFile.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(5));
    });
    
    it('should upload both images successfully on first attempt', async () => {
      // Mock successful uploads
      (put as jest.Mock)
        .mockResolvedValueOnce({ url: 'https://example.com/original.jpg' })
        .mockResolvedValueOnce({ url: 'https://example.com/cropped.jpg' });
      
      const result = await uploadCroppedImagePair(mockFile, mockCroppedFile, 'tests', 'avatar', {
        maxRetries: 3,
        retryDelay: 10
      });
      
      expect(result).toEqual({
        originalUrl: 'https://example.com/original.jpg',
        croppedUrl: 'https://example.com/cropped.jpg'
      });
      expect(put).toHaveBeenCalledTimes(2);
    });
    
    it('should retry after first upload fails, then succeed', async () => {
      // First attempt: fails on first image
      // Second attempt: both uploads succeed
      (put as jest.Mock)
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockResolvedValueOnce({ url: 'https://example.com/original.jpg' })
        .mockResolvedValueOnce({ url: 'https://example.com/cropped.jpg' });
      
      const onRetry = jest.fn();
      
      const result = await uploadCroppedImagePair(mockFile, mockCroppedFile, 'tests', 'avatar', {
        maxRetries: 3,
        retryDelay: 10,
        onRetry
      });
      
      expect(result).toEqual({
        originalUrl: 'https://example.com/original.jpg',
        croppedUrl: 'https://example.com/cropped.jpg'
      });
      expect(put).toHaveBeenCalledTimes(3); // Failed + 2 successful uploads
      expect(onRetry).toHaveBeenCalledTimes(1);
    });
    
    it('should report progress for both uploads', async () => {
      // Mock successful uploads
      (put as jest.Mock)
        .mockResolvedValueOnce({ url: 'https://example.com/original.jpg' })
        .mockResolvedValueOnce({ url: 'https://example.com/cropped.jpg' });
      
      const onProgress = jest.fn();
      
      await uploadCroppedImagePair(mockFile, mockCroppedFile, 'tests', 'avatar', {
        onProgress
      });
      
      expect(onProgress).toHaveBeenCalledWith(0); // Start
      expect(onProgress).toHaveBeenCalledWith(50); // After first upload
      expect(onProgress).toHaveBeenCalledWith(100); // Complete
      expect(onProgress).toHaveBeenCalledTimes(3);
    });
    
    it('should throw error after max retries are exceeded', async () => {
      // Mock persistent failures
      (put as jest.Mock).mockRejectedValue(new Error('Upload failed'));
      
      await expect(uploadCroppedImagePair(mockFile, mockCroppedFile, 'tests', 'avatar', {
        maxRetries: 2,
        retryDelay: 10
      })).rejects.toThrow(FileUploadError);
      
      expect(put).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });
  
  describe('deleteFiles with retry', () => {
    it('should delete files successfully on first attempt', async () => {
      // Mock successful deletion
      (del as jest.Mock).mockResolvedValueOnce({});
      
      const urls = ['https://example.com/file1.jpg', 'https://example.com/file2.jpg'];
      const result = await deleteFiles(urls, 3, 10);
      
      expect(result.success).toBe(true);
      expect(result.deletedUrls).toEqual(urls);
      expect(del).toHaveBeenCalledTimes(1);
      expect(del).toHaveBeenCalledWith(urls);
    });
    
    it('should retry deletion on failure and succeed', async () => {
      // Mock a failure followed by success
      (del as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({});
      
      const urls = ['https://example.com/file1.jpg', 'https://example.com/file2.jpg'];
      const result = await deleteFiles(urls, 3, 10);
      
      expect(result.success).toBe(true);
      expect(result.deletedUrls).toEqual(urls);
      expect(del).toHaveBeenCalledTimes(2);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('❌ File deletion attempt'), 
        expect.any(Error)
      );
    });
    
    it('should return partial failure after max retries', async () => {
      // Mock persistent failures
      (del as jest.Mock).mockRejectedValue(new Error('Deletion failed'));
      
      const urls = ['https://example.com/file1.jpg', 'https://example.com/file2.jpg'];
      const result = await deleteFiles(urls, 2, 10);
      
      expect(result.success).toBe(false);
      expect(result.deletedUrls).toEqual([]);
      expect(del).toHaveBeenCalledTimes(3); // Initial + 2 retries
      expect(console.error).toHaveBeenCalledTimes(4); // 3 retry attempts + 1 max retries exceeded message
    });
  });
});