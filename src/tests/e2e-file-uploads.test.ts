// e2e-file-uploads.test.ts - End-to-end tests for file upload functionality
import { 
  validateFile, 
  uploadFile, 
  uploadCroppedImagePair, 
  deleteFiles, 
  validateGroupLogoFile,
  uploadGroupLogoFile,
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
import { createMockFile, createMockImageFile, createMockPdfFile } from './test-utils';

// Mock the Vercel Blob functions
jest.mock('@vercel/blob', () => ({
  put: jest.fn().mockImplementation((path) => {
    // Generate mock URL based on the path
    return Promise.resolve({ url: `https://mock-blob-storage.vercel.app/${path}` });
  }),
  del: jest.fn().mockImplementation(() => {
    return Promise.resolve({ success: true });
  })
}));

describe('File Upload System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('File Validation', () => {
    describe('validateFile (Generic)', () => {
      it('should accept valid files based on allowed types and size', () => {
        // Test with different file types and sizes
        const jpegFile = createMockFile('photo.jpg', 'image/jpeg', 1024 * 500); // 500KB
        const pngFile = createMockFile('icon.png', 'image/png', 1024 * 800); // 800KB
        const pdfFile = createMockFile('document.pdf', 'application/pdf', 1024 * 1000); // 1MB
        
        // Validate JPEG
        expect(() => validateFile(jpegFile, ALLOWED_IMAGE_TYPES, MAX_LOGO_SIZE))
          .not.toThrow();
        
        // Validate PNG
        expect(() => validateFile(pngFile, ALLOWED_IMAGE_TYPES, MAX_LOGO_SIZE))
          .not.toThrow();
        
        // Validate PDF with document types
        expect(() => validateFile(pdfFile, ALLOWED_FILE_TYPES, MAX_FILE_SIZE))
          .not.toThrow();
      });

      it('should reject files with disallowed types', () => {
        // Test with file types not in the allowed list
        const exeFile = createMockFile('program.exe', 'application/octet-stream', 1024);
        const zipFile = createMockFile('archive.zip', 'application/zip', 1024);
        const txtFile = createMockFile('notes.txt', 'text/plain', 1024);
        
        // Validate against image types
        expect(() => validateFile(exeFile, ALLOWED_IMAGE_TYPES, MAX_LOGO_SIZE))
          .toThrow(FileUploadError);
        expect(() => validateFile(exeFile, ALLOWED_IMAGE_TYPES, MAX_LOGO_SIZE))
          .toThrow('Datei: Nicht unterstützter Dateityp');
        
        expect(() => validateFile(zipFile, ALLOWED_IMAGE_TYPES, MAX_LOGO_SIZE))
          .toThrow(FileUploadError);
        
        expect(() => validateFile(txtFile, ALLOWED_IMAGE_TYPES, MAX_LOGO_SIZE))
          .toThrow(FileUploadError);
      });

      it('should reject files that exceed the size limit', () => {
        // Create mock files that exceed the size limit
        // Group logo size limit (1MB)
        const largeJpeg = createMockFile('large-photo.jpg', 'image/jpeg', MAX_LOGO_SIZE + 1024);
        
        // Regular file size limit (5MB)
        const hugePdf = createMockFile('huge-document.pdf', 'application/pdf', MAX_FILE_SIZE + 1024);
        
        // Validate against size limits
        expect(() => validateFile(largeJpeg, ALLOWED_IMAGE_TYPES, MAX_LOGO_SIZE))
          .toThrow(FileUploadError);
        expect(() => validateFile(largeJpeg, ALLOWED_IMAGE_TYPES, MAX_LOGO_SIZE))
          .toThrow(/Dateigröße überschreitet das Limit/);
        
        expect(() => validateFile(hugePdf, ALLOWED_FILE_TYPES, MAX_FILE_SIZE))
          .toThrow(FileUploadError);
      });
      
      it('should reject null or undefined files', () => {
        // @ts-expect-error: Intentionally passing null for testing
        expect(() => validateFile(null, ALLOWED_IMAGE_TYPES, MAX_LOGO_SIZE))
          .toThrow(FileUploadError);
        expect(() => validateFile(null, ALLOWED_IMAGE_TYPES, MAX_LOGO_SIZE))
          .toThrow('Datei ist erforderlich');
        
        // @ts-expect-error: Intentionally passing undefined for testing
        expect(() => validateFile(undefined, ALLOWED_IMAGE_TYPES, MAX_LOGO_SIZE))
          .toThrow(FileUploadError);
      });
    });

    describe('validateGroupLogoFile', () => {
      it('should accept valid image files for group logos', () => {
        const jpegLogo = createMockFile('logo.jpg', 'image/jpeg', 1024 * 500);
        const pngLogo = createMockFile('logo.png', 'image/png', 1024 * 800);
        
        // Should not throw for valid logo files
        expect(() => validateGroupLogoFile(jpegLogo)).not.toThrow();
        expect(() => validateGroupLogoFile(pngLogo)).not.toThrow();
      });
      
      it('should reject non-image files for group logos', () => {
        const pdfFile = createMockFile('document.pdf', 'application/pdf', 1024);
        
        // Should throw for non-image files
        expect(() => validateGroupLogoFile(pdfFile)).toThrow(FileUploadError);
        expect(() => validateGroupLogoFile(pdfFile)).toThrow('Datei: Nicht unterstützter Dateityp');
      });
      
      it('should reject image files exceeding the logo size limit', () => {
        const largeLogo = createMockFile('large-logo.jpg', 'image/jpeg', MAX_LOGO_SIZE + 1024);
        
        // Should throw for oversized logos
        expect(() => validateGroupLogoFile(largeLogo)).toThrow(FileUploadError);
        expect(() => validateGroupLogoFile(largeLogo)).toThrow(/Dateigröße überschreitet das Limit/);
      });
    });

    describe('validateStatusReportFiles', () => {
      it('should accept a valid set of files for status reports', () => {
        const files = [
          createMockFile('document.pdf', 'application/pdf', 1024 * 1000),
          createMockFile('image1.jpg', 'image/jpeg', 1024 * 800),
          createMockFile('image2.png', 'image/png', 1024 * 500)
        ];
        
        // Should not throw for valid file set
        expect(() => validateStatusReportFiles(files)).not.toThrow();
      });
      
      it('should reject when too many files are provided', () => {
        // Create more files than the maximum allowed
        const tooManyFiles = Array(MAX_STATUS_REPORT_FILES_COUNT + 1)
          .fill(null)
          .map((_, i) => createMockFile(`file${i}.pdf`, 'application/pdf', 1024 * 500));
        
        // Should throw for too many files
        expect(() => validateStatusReportFiles(tooManyFiles)).toThrow(FileUploadError);
        expect(() => validateStatusReportFiles(tooManyFiles)).toThrow(/Maximal.*Dateien erlaubt/);
      });
      
      it('should reject when any file type is not allowed', () => {
        const mixedFiles = [
          createMockFile('document.pdf', 'application/pdf', 1024 * 1000),
          createMockFile('image.jpg', 'image/jpeg', 1024 * 800),
          createMockFile('archive.zip', 'application/zip', 1024 * 500) // Invalid type
        ];
        
        // Should throw for invalid file type in the set
        expect(() => validateStatusReportFiles(mixedFiles)).toThrow(FileUploadError);
        expect(() => validateStatusReportFiles(mixedFiles)).toThrow(/Nicht unterstützter Dateityp/);
      });
      
      it('should reject when any file exceeds individual size limit', () => {
        const files = [
          createMockFile('document.pdf', 'application/pdf', 1024 * 1000),
          createMockFile('large-image.jpg', 'image/jpeg', MAX_FILE_SIZE + 1024) // Too large
        ];
        
        // Should throw for oversized file
        expect(() => validateStatusReportFiles(files)).toThrow(FileUploadError);
        expect(() => validateStatusReportFiles(files)).toThrow(/Dateigröße überschreitet das Limit/);
      });
      
      it('should reject when combined file size exceeds the limit', () => {
        // Create files that individually are under the limit but together exceed it
        const halfLimit = Math.floor(MAX_STATUS_REPORT_FILES_SIZE / 2) + 1024;
        
        const files = [
          createMockFile('large1.pdf', 'application/pdf', halfLimit),
          createMockFile('large2.jpg', 'image/jpeg', halfLimit)
        ];
        
        // Should throw for combined size over limit
        expect(() => validateStatusReportFiles(files)).toThrow(FileUploadError);
        expect(() => validateStatusReportFiles(files)).toThrow(/Dateianhänge: Dateigröße überschreitet das Limit/);
      });
      
      it('should accept an empty array of files', () => {
        // Should not throw for empty array
        expect(() => validateStatusReportFiles([])).not.toThrow();
      });
    });
  });

  describe('File Upload Operations', () => {
    describe('uploadFile', () => {
      it('should upload a file to blob storage and return the URL', async () => {
        const file = createMockImageFile('test-image.jpg');
        const folderName = 'groups';
        const prefix = 'logo';
        
        const result = await uploadFile(file, folderName, prefix);
        
        // Should return the URL from the blob storage
        expect(result).toMatch(/^https:\/\/mock-blob-storage\.vercel\.app\/groups\/.+/);
        expect(result).toContain('logo-test-image.jpg');
        
        // Should call put with correct parameters
        expect(put).toHaveBeenCalledTimes(1);
        expect(put).toHaveBeenCalledWith(
          expect.stringContaining('groups/'),
          expect.any(Blob),
          expect.objectContaining({
            access: 'public',
            contentType: 'image/jpeg'
          })
        );
      });
      
      it('should generate a filename with timestamp prefix', async () => {
        const file = createMockImageFile('logo.png');
        
        await uploadFile(file, 'groups', 'logo');
        
        // Extract the path from the put call
        const putCall = (put as jest.Mock).mock.calls[0];
        const path = putCall[0];
        
        // Path should contain timestamp pattern (numbers followed by hyphen)
        expect(path).toMatch(/groups\/\d+-logo-logo\.png$/);
      });
      
      it('should handle different file types correctly', async () => {
        const pdfFile = createMockPdfFile('document.pdf');
        
        await uploadFile(pdfFile, 'reports', 'attachment');
        
        // Should call put with correct content type
        expect(put).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(Blob),
          expect.objectContaining({
            contentType: 'application/pdf'
          })
        );
      });
      
      it('should handle upload errors gracefully', async () => {
        const file = createMockImageFile('test.jpg');
        
        // Mock a failure in put function for all retries
        (put as jest.Mock).mockRejectedValue(new Error('Storage service unavailable'));
        
        // Should throw a FileUploadError with short retry delays for testing
        const config = { maxRetries: 1, retryDelay: 10 };
        await expect(uploadFile(file, 'groups', 'logo', config)).rejects.toThrow(FileUploadError);
        await expect(uploadFile(file, 'groups', 'logo', config)).rejects.toThrow('Upload nach mehreren Versuchen fehlgeschlagen');
        
        // Reset mock to default behavior for other tests
        (put as jest.Mock).mockImplementation((path) => {
          return Promise.resolve({ url: `https://mock-blob-storage.vercel.app/${path}` });
        });
      });
    });

    describe('uploadCroppedImagePair', () => {
      it('should upload original and cropped images and return both URLs', async () => {
        const originalFile = createMockImageFile('original.jpg');
        const croppedFile = createMockImageFile('cropped.jpg');
        
        // Set up mock to return different URLs for each upload
        (put as jest.Mock).mockImplementation((path) => {
          if (path.includes('_crop')) {
            return Promise.resolve({ url: `https://mock-blob-storage.vercel.app/${path}` });
          }
          return Promise.resolve({ url: `https://mock-blob-storage.vercel.app/${path}` });
        });
        
        const result = await uploadCroppedImagePair(originalFile, croppedFile, 'groups', 'logo');
        
        // Should return both URLs
        expect(result.originalUrl).toMatch(/^https:\/\/mock-blob-storage\.vercel\.app\/groups\/.+/);
        expect(result.croppedUrl).toMatch(/^https:\/\/mock-blob-storage\.vercel\.app\/groups\/.+/);
        expect(result.croppedUrl).toContain('_crop');
        
        // Should call put twice - once for each image
        expect(put).toHaveBeenCalledTimes(2);
      });
      
      it('should use the same timestamp for both original and cropped images', async () => {
        const originalFile = createMockImageFile('original.jpg');
        const croppedFile = createMockImageFile('cropped.jpg');
        
        await uploadCroppedImagePair(originalFile, croppedFile, 'groups', 'logo');
        
        // Extract the paths from the put calls
        const paths = (put as jest.Mock).mock.calls.map(call => call[0]);
        
        // Extract the timestamp prefix from the first path
        const timestamp = paths[0].match(/groups\/(\d+)-/)[1];
        
        // Both paths should have the same timestamp
        expect(paths[0]).toContain(`${timestamp}-`);
        expect(paths[1]).toContain(`${timestamp}-`);
      });
      
      it('should handle upload errors gracefully', async () => {
        const originalFile = createMockImageFile('original.jpg');
        const croppedFile = createMockImageFile('cropped.jpg');
        
        // Mock a failure in put function for all retries
        (put as jest.Mock).mockRejectedValue(new Error('Storage service unavailable'));
        
        // Should throw a FileUploadError with short retry delays for testing
        const config = { maxRetries: 1, retryDelay: 10 };
        await expect(uploadCroppedImagePair(originalFile, croppedFile, 'groups', 'logo', config))
          .rejects.toThrow(FileUploadError);
        await expect(uploadCroppedImagePair(originalFile, croppedFile, 'groups', 'logo', config))
          .rejects.toThrow('Upload nach mehreren Versuchen fehlgeschlagen');
        
        // Reset mock to default behavior for other tests
        (put as jest.Mock).mockImplementation((path) => {
          return Promise.resolve({ url: `https://mock-blob-storage.vercel.app/${path}` });
        });
      });
    });

    describe('deleteFiles', () => {
      it('should delete multiple files from blob storage', async () => {
        const urls = [
          'https://mock-blob-storage.vercel.app/groups/123-logo-image1.jpg',
          'https://mock-blob-storage.vercel.app/groups/123-logo-image2.jpg'
        ];
        
        const result = await deleteFiles(urls);
        
        // Should return success
        expect(result.success).toBe(true);
        
        // Should call del with array of URLs
        expect(del).toHaveBeenCalledTimes(1);
        expect(del).toHaveBeenCalledWith(urls);
      });
      
      it('should handle empty array gracefully', async () => {
        const result = await deleteFiles([]);
        
        // Should return success without calling del
        expect(result.success).toBe(true);
        expect(del).not.toHaveBeenCalled();
      });
      
      it('should handle errors without throwing', async () => {
        const urls = [
          'https://mock-blob-storage.vercel.app/groups/123-logo-image1.jpg'
        ];
        
        // Mock a failure in del function for all retries
        (del as jest.Mock).mockRejectedValue(new Error('Failed to delete'));
        
        // Use shorter retry parameters for testing
        const result = await deleteFiles(urls, 1, 10);
        
        // Should return failure but not throw
        expect(result.success).toBe(false);
        expect(del).toHaveBeenCalled();
        
        // Reset mock to default behavior for other tests
        (del as jest.Mock).mockImplementation(() => {
          return Promise.resolve({ success: true });
        });
      });
    });

    describe('Feature-Specific Upload Functions', () => {
      describe('uploadGroupLogoFile', () => {
        it('should validate and upload a group logo file', async () => {
          const logoFile = createMockImageFile('group-logo.png');
          
          const url = await uploadGroupLogoFile(logoFile);
          
          // Should return a valid URL
          expect(url).toMatch(/^https:\/\/mock-blob-storage\.vercel\.app\/groups\/.+/);
          
          // Should validate and call put
          expect(put).toHaveBeenCalledTimes(1);
          expect(put).toHaveBeenCalledWith(
            expect.stringContaining('groups/'),
            expect.any(Blob),
            expect.objectContaining({
              contentType: 'image/jpeg'
            })
          );
        });
        
        it('should reject invalid logo files without uploading', async () => {
          // Create invalid file (PDF instead of image)
          const invalidFile = createMockPdfFile('document.pdf');
          
          // Should throw without calling put
          await expect(uploadGroupLogoFile(invalidFile)).rejects.toThrow(FileUploadError);
          expect(put).not.toHaveBeenCalled();
        });
      });

      describe('uploadStatusReportFiles', () => {
        it('should validate and upload multiple status report files', async () => {
          const files = [
            createMockPdfFile('report.pdf'),
            createMockImageFile('photo.jpg')
          ];
          
          const urls = await uploadStatusReportFiles(files);
          
          // Should return an array of URLs
          expect(urls).toHaveLength(2);
          expect(urls[0]).toMatch(/^https:\/\/mock-blob-storage\.vercel\.app\/status-reports\/.+/);
          expect(urls[1]).toMatch(/^https:\/\/mock-blob-storage\.vercel\.app\/status-reports\/.+/);
          
          // Should call put twice - once for each file
          expect(put).toHaveBeenCalledTimes(2);
        });
        
        it('should return empty array if no files are provided', async () => {
          const urls = await uploadStatusReportFiles([]);
          
          // Should return empty array without calling put
          expect(urls).toEqual([]);
          expect(put).not.toHaveBeenCalled();
        });
        
        it('should reject invalid files without uploading any', async () => {
          const files = [
            createMockPdfFile('report.pdf'),
            createMockFile('invalid.exe', 'application/octet-stream') // Invalid type
          ];
          
          // Should throw without calling put
          await expect(uploadStatusReportFiles(files)).rejects.toThrow(FileUploadError);
          expect(put).not.toHaveBeenCalled();
        });
        
        it('should generate unique filenames for each file', async () => {
          const files = [
            createMockPdfFile('doc1.pdf'),
            createMockPdfFile('doc2.pdf')
          ];
          
          await uploadStatusReportFiles(files);
          
          // Extract paths from put calls
          const paths = (put as jest.Mock).mock.calls.map(call => call[0]);
          
          // Paths should be unique
          expect(paths[0]).not.toEqual(paths[1]);
          // But should have same timestamp
          const timestamp1 = paths[0].match(/status-reports\/(\d+)-/)[1];
          const timestamp2 = paths[1].match(/status-reports\/(\d+)-/)[1];
          expect(timestamp1).toEqual(timestamp2);
        });
      });
    });
  });
});