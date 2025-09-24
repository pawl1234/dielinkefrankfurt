import { POST, requestCounts } from '@/app/api/antraege/submit/route';
import { createAntrag } from '@/lib/db/antrag-operations';
import { uploadAntragFiles, deleteAntragFiles } from '@/lib/antrag-file-utils';
import { FileUploadError } from '@/lib/file-upload';
import { logger } from '@/lib/logger';
import { NextRequest } from 'next/server';
import { AntragFactory, createMockFile, createMockFormData } from '@/tests/factories';
import type { AntragSubmitResponse } from '@/app/api/antraege/submit/route';

// Mock dependencies
jest.mock('@/lib/db/antrag-operations');
jest.mock('@/lib/antrag-file-utils', () => ({
  uploadAntragFiles: jest.fn(),
  deleteAntragFiles: jest.fn(),
  validateAntragFiles: jest.requireActual('@/lib/antrag-file-utils').validateAntragFiles
}));
jest.mock('@/lib/logger');
jest.mock('@/lib/validation/utils', () => {
  const actual = jest.requireActual('@/lib/validation/utils');
  return {
    ...actual,
    validateRecaptcha: jest.fn().mockResolvedValue(true)
  };
});

const mockCreateAntrag = createAntrag as jest.MockedFunction<typeof createAntrag>;
const mockUploadAntragFiles = uploadAntragFiles as jest.MockedFunction<typeof uploadAntragFiles>;
const mockDeleteAntragFiles = deleteAntragFiles as jest.MockedFunction<typeof deleteAntragFiles>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('POST /api/antraege/submit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.error = jest.fn(); // Suppress error logs in tests
    console.log = jest.fn(); // Suppress log messages in tests
    console.warn = jest.fn(); // Suppress warning logs in tests
    // Clear rate limit map between tests
    requestCounts.clear();
  });

  describe('Successful submission', () => {
    it('should create an Antrag with valid data', async () => {
      const requestData = AntragFactory.createData({ fileUrls: undefined });
      requestData.recaptchaToken = 'mock-token'; // Add recaptcha token
      const createdAntrag = AntragFactory.create({
        ...requestData,
        purposes: JSON.stringify(requestData.purposes),
        fileUrls: null
      });

      mockCreateAntrag.mockResolvedValue(createdAntrag);

      const request = new NextRequest('http://localhost:3000/api/antraege/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      const response = await POST(request);
      const data: AntragSubmitResponse = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Antrag erfolgreich übermittelt');
      expect(data.antrag).toMatchObject({
        id: createdAntrag.id,
        title: createdAntrag.title,
        summary: createdAntrag.summary,
        status: createdAntrag.status
      });

      expect(mockCreateAntrag).toHaveBeenCalledWith({
        firstName: requestData.firstName,
        lastName: requestData.lastName,
        email: requestData.email.toLowerCase(), // Email is normalized to lowercase
        title: requestData.title,
        summary: requestData.summary,
        purposes: requestData.purposes,
        fileUrls: []
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Antrag submitted successfully',
        expect.objectContaining({
          context: {
            antragId: createdAntrag.id,
            title: createdAntrag.title,
            email: createdAntrag.email
          }
        })
      );
    });

    it('should handle missing optional fileUrls', async () => {
      const requestData = AntragFactory.createData({ fileUrls: undefined });
      requestData.recaptchaToken = 'mock-token'; // Add recaptcha token
      const createdAntrag = AntragFactory.create({
        ...requestData,
        purposes: JSON.stringify(requestData.purposes),
        fileUrls: null
      });

      mockCreateAntrag.mockResolvedValue(createdAntrag);

      const request = new NextRequest('http://localhost:3000/api/antraege/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      const response = await POST(request);
      const data: AntragSubmitResponse = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('Validation errors', () => {
    it('should return 400 for missing firstName', async () => {
      const requestData = { 
        ...AntragFactory.createData({ fileUrls: undefined }),
        firstName: ''
      };

      const request = new NextRequest('http://localhost:3000/api/antraege/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      const response = await POST(request);
      const data: AntragSubmitResponse = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.fieldErrors?.firstName).toBe('Vorname enthält ungültige Zeichen');
      expect(mockCreateAntrag).not.toHaveBeenCalled();
    });

    it('should return 400 for missing lastName', async () => {
      const requestData = { 
        ...AntragFactory.createData({ fileUrls: undefined }),
        lastName: ''
      };

      const request = new NextRequest('http://localhost:3000/api/antraege/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      const response = await POST(request);
      const data: AntragSubmitResponse = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.fieldErrors?.lastName).toBe('Nachname enthält ungültige Zeichen');
    });

    it('should return 400 for invalid email', async () => {
      const requestData = { 
        ...AntragFactory.createData({ fileUrls: undefined }),
        email: 'invalid-email'
      };

      const request = new NextRequest('http://localhost:3000/api/antraege/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      const response = await POST(request);
      const data: AntragSubmitResponse = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.fieldErrors?.email).toBe('Bitte geben Sie eine gültige E-Mail-Adresse ein');
    });

    it('should return 400 for missing title', async () => {
      const requestData = { 
        ...AntragFactory.createData({ fileUrls: undefined }),
        title: ''
      };

      const request = new NextRequest('http://localhost:3000/api/antraege/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      const response = await POST(request);
      const data: AntragSubmitResponse = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.fieldErrors?.title).toBe('Titel muss mindestens 3 Zeichen lang sein');
    });

    it('should return 400 for missing summary', async () => {
      const requestData = { 
        ...AntragFactory.createData({ fileUrls: undefined }),
        summary: 'Too short'
      };

      const request = new NextRequest('http://localhost:3000/api/antraege/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      const response = await POST(request);
      const data: AntragSubmitResponse = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.fieldErrors?.summary).toBe('Zusammenfassung muss mindestens 10 Zeichen lang sein');
    });

    it('should return 400 for invalid purposes structure', async () => {
      const requestData = { 
        ...AntragFactory.createData({ fileUrls: undefined }),
        purposes: {} // No enabled purposes
      };

      const request = new NextRequest('http://localhost:3000/api/antraege/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      const response = await POST(request);
      const data: AntragSubmitResponse = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.fieldErrors?.purposes).toBe('Mindestens ein Zweck muss ausgewählt werden');
    });

    it('should return 400 for invalid zuschuss amount when enabled', async () => {
      const requestData = { 
        ...AntragFactory.createData({ fileUrls: undefined }),
        purposes: {
          zuschuss: { enabled: true, amount: 0 }
        }
      };

      const request = new NextRequest('http://localhost:3000/api/antraege/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      const response = await POST(request);
      const data: AntragSubmitResponse = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.fieldErrors?.purposes).toBe('Betrag muss mindestens 1 Euro betragen');
    });
  });

  describe('Database error handling', () => {
    it('should return 500 when database operation fails', async () => {
      const requestData = AntragFactory.createData({ fileUrls: undefined });

      mockCreateAntrag.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/antraege/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      const response = await POST(request);
      const data: AntragSubmitResponse = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Fehler beim Übermitteln des Antrags');
      expect(console.error).toHaveBeenCalledWith(
        'Error submitting Antrag:',
        expect.any(Error)
      );
    });

    it('should return 500 for unexpected errors thrown by createAntrag', async () => {
      const requestData = AntragFactory.createData({ fileUrls: undefined });

      mockCreateAntrag.mockRejectedValue(new Error('Unexpected database error'));

      const request = new NextRequest('http://localhost:3000/api/antraege/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      const response = await POST(request);
      const data: AntragSubmitResponse = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Fehler beim Übermitteln des Antrags');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/antraege/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      const response = await POST(request);
      const data: AntragSubmitResponse = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.fieldErrors).toBeDefined();
      expect(Object.keys(data.fieldErrors!).length).toBeGreaterThan(0);
    });

    it('should handle malformed JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/antraege/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Fehler beim Übermitteln des Antrags');
    });

    it.skip('should trim string fields before validation', async () => {
      const baseData = AntragFactory.createData({ fileUrls: undefined });
      const requestData = {
        firstName: '  ' + baseData.firstName + '  ',
        lastName: '  ' + baseData.lastName + '  ',
        email: '  ' + baseData.email + '  ',
        title: '  ' + baseData.title + '  ',
        summary: '  ' + baseData.summary + '  ',
        purposes: baseData.purposes,
        recaptchaToken: 'mock-token'
      };

      const expectedData = {
        firstName: baseData.firstName,
        lastName: baseData.lastName,
        email: baseData.email.toLowerCase(),
        title: baseData.title,
        summary: baseData.summary,
        purposes: baseData.purposes
      };

      const createdAntrag = AntragFactory.create({
        ...expectedData,
        purposes: JSON.stringify(expectedData.purposes),
        fileUrls: null
      });

      mockCreateAntrag.mockResolvedValue(createdAntrag);

      const request = new NextRequest('http://localhost:3000/api/antraege/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      // Verify that the Antrag was created with trimmed values and lowercase email
      expect(mockCreateAntrag).toHaveBeenCalledWith(expect.objectContaining({
        firstName: expectedData.firstName,
        lastName: expectedData.lastName,
        email: expectedData.email, // Email normalized to lowercase
        title: expectedData.title,
        summary: expectedData.summary,
        purposes: expectedData.purposes,
        fileUrls: []
      }));
    });
  });

  describe('File upload functionality', () => {
    it('should successfully upload files with form data', async () => {
      const requestData = AntragFactory.createData();
      const file1 = createMockFile('document1.pdf', 'application/pdf', 1024 * 1024); // 1MB
      const file2 = createMockFile('image1.jpg', 'image/jpeg', 512 * 1024); // 512KB

      const formData = createMockFormData({
        firstName: requestData.firstName,
        lastName: requestData.lastName,
        email: requestData.email,
        title: requestData.title,
        summary: requestData.summary,
        purposes: JSON.stringify(requestData.purposes),
        recaptchaToken: 'mock-token',
        fileCount: '2',
        'file-0': file1,
        'file-1': file2
      });

      const uploadedUrls = [
        'https://blob.vercel-storage.com/antraege/123-0-document1.pdf',
        'https://blob.vercel-storage.com/antraege/123-1-image1.jpg'
      ];

      const createdAntrag = AntragFactory.create({
        ...requestData,
        purposes: JSON.stringify(requestData.purposes),
        fileUrls: JSON.stringify(uploadedUrls)
      });

      mockUploadAntragFiles.mockResolvedValue(uploadedUrls);
      mockCreateAntrag.mockResolvedValue(createdAntrag);

      const request = new NextRequest('http://localhost:3000/api/antraege/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'multipart/form-data' },
        body: formData
      });

      const response = await POST(request);
      const data: AntragSubmitResponse = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockUploadAntragFiles).toHaveBeenCalledWith([file1, file2]);
      expect(mockCreateAntrag).toHaveBeenCalledWith(expect.objectContaining({
        fileUrls: uploadedUrls
      }));
    });

    it('should handle file validation errors', async () => {
      const requestData = AntragFactory.createData({ fileUrls: undefined });
      const file = createMockFile('large-file.pdf', 'application/pdf', 6 * 1024 * 1024); // 6MB

      const formData = createMockFormData({
        firstName: requestData.firstName,
        lastName: requestData.lastName,
        email: requestData.email,
        title: requestData.title,
        summary: requestData.summary,
        purposes: JSON.stringify(requestData.purposes),
        recaptchaToken: 'mock-token',
        fileCount: '1',
        'file-0': file
      });

      const request = new NextRequest('http://localhost:3000/api/antraege/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'multipart/form-data' },
        body: formData
      });

      const response = await POST(request);
      const data: AntragSubmitResponse = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.fieldErrors?.files).toBe('überschreitet das 5MB Limit');
      expect(mockCreateAntrag).not.toHaveBeenCalled();
      expect(mockUploadAntragFiles).not.toHaveBeenCalled();
    });

    it('should handle too many files error', async () => {
      const requestData = AntragFactory.createData({ fileUrls: undefined });
      const files = Array.from({ length: 6 }, (_, i) =>
        createMockFile(`file${i}.pdf`, 'application/pdf', 500 * 1024)
      );

      const formData = createMockFormData({
        firstName: requestData.firstName,
        lastName: requestData.lastName,
        email: requestData.email,
        title: requestData.title,
        summary: requestData.summary,
        purposes: JSON.stringify(requestData.purposes),
        recaptchaToken: 'mock-token',
        fileCount: '6',
        ...Object.fromEntries(files.map((file, i) => [`file-${i}`, file]))
      });

      const request = new NextRequest('http://localhost:3000/api/antraege/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'multipart/form-data' },
        body: formData
      });

      const response = await POST(request);
      const data: AntragSubmitResponse = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.fieldErrors?.files).toBe('Maximal 5 Dateien erlaubt');
      expect(mockUploadAntragFiles).not.toHaveBeenCalled();
    });

    it('should handle invalid file type error', async () => {
      const requestData = AntragFactory.createData({ fileUrls: undefined });
      const file = createMockFile('script.js', 'application/javascript', 1024);

      const formData = createMockFormData({
        firstName: requestData.firstName,
        lastName: requestData.lastName,
        email: requestData.email,
        title: requestData.title,
        summary: requestData.summary,
        purposes: JSON.stringify(requestData.purposes),
        recaptchaToken: 'mock-token',
        fileCount: '1',
        'file-0': file
      });

      const request = new NextRequest('http://localhost:3000/api/antraege/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'multipart/form-data' },
        body: formData
      });

      const response = await POST(request);
      const data: AntragSubmitResponse = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.fieldErrors?.files).toContain('Nicht unterstützter Dateityp');
      expect(mockUploadAntragFiles).not.toHaveBeenCalled();
    });

    it('should clean up uploaded files if database creation fails', async () => {
      const requestData = AntragFactory.createData();
      const file = createMockFile('document.pdf', 'application/pdf', 1024 * 1024);

      const formData = createMockFormData({
        firstName: requestData.firstName,
        lastName: requestData.lastName,
        email: requestData.email,
        title: requestData.title,
        summary: requestData.summary,
        purposes: JSON.stringify(requestData.purposes),
        recaptchaToken: 'mock-token',
        fileCount: '1',
        'file-0': file
      });

      const uploadedUrls = ['https://blob.vercel-storage.com/antraege/123-0-document.pdf'];

      mockUploadAntragFiles.mockResolvedValue(uploadedUrls);
      mockCreateAntrag.mockRejectedValue(new Error('Database connection failed'));
      mockDeleteAntragFiles.mockResolvedValue({ success: true, deletedUrls: uploadedUrls });

      const request = new NextRequest('http://localhost:3000/api/antraege/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'multipart/form-data' },
        body: formData
      });

      const response = await POST(request);
      const data: AntragSubmitResponse = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Fehler beim Übermitteln des Antrags');
      expect(mockDeleteAntragFiles).toHaveBeenCalledWith(uploadedUrls);
      expect(console.log).toHaveBeenCalledWith('🧹 Cleaning up uploaded files after database error...');
    });

    it('should handle blob storage errors', async () => {
      const requestData = AntragFactory.createData();
      const file = createMockFile('document.pdf', 'application/pdf', 1024 * 1024);

      const formData = createMockFormData({
        firstName: requestData.firstName,
        lastName: requestData.lastName,
        email: requestData.email,
        title: requestData.title,
        summary: requestData.summary,
        purposes: JSON.stringify(requestData.purposes),
        recaptchaToken: 'mock-token',
        fileCount: '1',
        'file-0': file
      });

      mockUploadAntragFiles.mockRejectedValue(new Error('Network error'));

      const request = new NextRequest('http://localhost:3000/api/antraege/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'multipart/form-data' },
        body: formData
      });

      const response = await POST(request);
      const data: AntragSubmitResponse = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Fehler beim Hochladen der Dateien');
      expect(mockCreateAntrag).not.toHaveBeenCalled();
    });

    it('should work without files (JSON request)', async () => {
      const requestData = AntragFactory.createData({ fileUrls: undefined });
      requestData.recaptchaToken = 'mock-token'; // Add recaptcha token
      const createdAntrag = AntragFactory.create({
        ...requestData,
        purposes: JSON.stringify(requestData.purposes),
        fileUrls: null
      });

      mockCreateAntrag.mockResolvedValue(createdAntrag);

      const request = new NextRequest('http://localhost:3000/api/antraege/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      const response = await POST(request);
      const data: AntragSubmitResponse = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockUploadAntragFiles).not.toHaveBeenCalled();
      expect(mockCreateAntrag).toHaveBeenCalledWith(expect.objectContaining({
        firstName: requestData.firstName,
        lastName: requestData.lastName,
        email: requestData.email.toLowerCase(), // Email is normalized to lowercase
        title: requestData.title,
        summary: requestData.summary,
        purposes: requestData.purposes,
        fileUrls: []
      }));
    });

    it('should handle empty file inputs', async () => {
      const requestData = AntragFactory.createData();

      const formData = createMockFormData({
        firstName: requestData.firstName,
        lastName: requestData.lastName,
        email: requestData.email,
        title: requestData.title,
        summary: requestData.summary,
        purposes: JSON.stringify(requestData.purposes),
        recaptchaToken: 'mock-token',
        fileCount: '0'
      });

      const createdAntrag = AntragFactory.create({
        ...requestData,
        purposes: JSON.stringify(requestData.purposes),
        fileUrls: null
      });

      mockCreateAntrag.mockResolvedValue(createdAntrag);

      const request = new NextRequest('http://localhost:3000/api/antraege/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'multipart/form-data' },
        body: formData
      });

      const response = await POST(request);
      const data: AntragSubmitResponse = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockUploadAntragFiles).not.toHaveBeenCalled();
    });
  });
});