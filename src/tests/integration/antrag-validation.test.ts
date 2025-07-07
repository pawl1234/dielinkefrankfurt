import { POST, requestCounts } from '@/app/api/antraege/submit/route';
import { createAntrag } from '@/lib/db/antrag-operations';
import { uploadAntragFiles, deleteAntragFiles } from '@/lib/antrag-file-utils';
import { validateRecaptcha } from '@/lib/validators/antrag-validator';
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
jest.mock('@/lib/validators/antrag-validator', () => {
  const actual = jest.requireActual('@/lib/validators/antrag-validator');
  return {
    ...actual,
    validateRecaptcha: jest.fn()
  };
});
jest.mock('@/lib/logger');

const mockCreateAntrag = createAntrag as jest.MockedFunction<typeof createAntrag>;
const mockUploadAntragFiles = uploadAntragFiles as jest.MockedFunction<typeof uploadAntragFiles>;
const mockDeleteAntragFiles = deleteAntragFiles as jest.MockedFunction<typeof deleteAntragFiles>;
const mockValidateRecaptcha = validateRecaptcha as jest.MockedFunction<typeof validateRecaptcha>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('Antrag Submission - Validation Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    console.error = jest.fn();
    console.log = jest.fn();
    console.warn = jest.fn();
    // Clear rate limit map between tests
    requestCounts.clear();
  });

  describe('Field Validation', () => {
    it('should validate all required fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/antraege/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      const response = await POST(request);
      const data: AntragSubmitResponse = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.fieldErrors).toMatchObject({
        firstName: 'Vorname ist erforderlich',
        lastName: 'Nachname ist erforderlich',
        email: 'E-Mail-Adresse ist erforderlich',
        title: 'Titel ist erforderlich',
        summary: 'Zusammenfassung ist erforderlich',
        purposes: 'Mindestens ein Zweck muss ausgewählt werden'
      });
    });

    it('should validate first name constraints', async () => {
      const testCases = [
        { firstName: 'A', error: 'Vorname muss zwischen 2 und 50 Zeichen lang sein' },
        { firstName: 'A'.repeat(51), error: 'Vorname muss zwischen 2 und 50 Zeichen lang sein' },
        { firstName: 'Test123', error: 'Vorname enthält ungültige Zeichen' },
        { firstName: 'Test@Name', error: 'Vorname enthält ungültige Zeichen' }
      ];

      for (const testCase of testCases) {
        // Clear rate limit for each test
        requestCounts.clear();
        
        const requestData = AntragFactory.createData({ 
          firstName: testCase.firstName,
          fileUrls: undefined 
        });

        const request = new NextRequest('http://localhost:3000/api/antraege/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestData)
        });

        const response = await POST(request);
        const data: AntragSubmitResponse = await response.json();

        expect(response.status).toBe(400);
        expect(data.fieldErrors?.firstName).toBe(testCase.error);
      }
    });

    it('should validate email format', async () => {
      const invalidEmails = [
        'notanemail',
        'test@',
        '@example.com',
        'test@.com',
        'test@example'
      ];

      for (const email of invalidEmails) {
        // Clear rate limit for each test
        requestCounts.clear();
        
        const requestData = AntragFactory.createData({ 
          email,
          fileUrls: undefined 
        });

        const request = new NextRequest('http://localhost:3000/api/antraege/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestData)
        });

        const response = await POST(request);
        const data: AntragSubmitResponse = await response.json();

        expect(response.status).toBe(400);
        expect(data.fieldErrors?.email).toBe('Bitte geben Sie eine gültige E-Mail-Adresse ein');
      }
    });

    it('should accept valid German characters in names', async () => {
      const requestData = AntragFactory.createData({ 
        firstName: 'Björn-Müller',
        lastName: 'von der Höhe',
        fileUrls: undefined 
      });

      const createdAntrag = AntragFactory.create(requestData);
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

  describe('Purpose Validation', () => {
    it('should require at least one purpose', async () => {
      const requestData = AntragFactory.createData({ 
        purposes: {},
        fileUrls: undefined 
      });

      const request = new NextRequest('http://localhost:3000/api/antraege/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      const response = await POST(request);
      const data: AntragSubmitResponse = await response.json();

      expect(response.status).toBe(400);
      expect(data.fieldErrors?.purposes).toBe('Mindestens ein Zweck muss ausgewählt werden');
    });

    it('should validate zuschuss amount constraints', async () => {
      const testCases = [
        { amount: 0, error: 'Betrag muss mindestens 1 Euro betragen' },
        { amount: -100, error: 'Betrag muss mindestens 1 Euro betragen' },
        { amount: 1000000, error: 'Betrag darf maximal 999.999 Euro betragen' }
      ];

      for (const testCase of testCases) {
        // Clear rate limit for each test
        requestCounts.clear();
        
        const requestData = AntragFactory.createData({ 
          purposes: {
            zuschuss: { enabled: true, amount: testCase.amount }
          },
          fileUrls: undefined 
        });

        const request = new NextRequest('http://localhost:3000/api/antraege/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestData)
        });

        const response = await POST(request);
        const data: AntragSubmitResponse = await response.json();

        expect(response.status).toBe(400);
        expect(data.fieldErrors?.purposes).toBe(testCase.error);
      }
    });

    it('should validate required fields for each enabled purpose', async () => {
      // Test personnel support without details
      let requestData = AntragFactory.createData({ 
        purposes: {
          personelleUnterstuetzung: { enabled: true, details: '' }
        },
        fileUrls: undefined 
      });

      let request = new NextRequest('http://localhost:3000/api/antraege/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      let response = await POST(request);
      let data: AntragSubmitResponse = await response.json();

      expect(response.status).toBe(400);
      expect(data.fieldErrors?.purposes).toBe('Details zur personellen Unterstützung sind erforderlich');

      // Test room booking without required fields
      requestData = AntragFactory.createData({ 
        purposes: {
          raumbuchung: { 
            enabled: true, 
            location: '',
            numberOfPeople: 10,
            details: 'Test'
          }
        },
        fileUrls: undefined 
      });

      request = new NextRequest('http://localhost:3000/api/antraege/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      response = await POST(request);
      data = await response.json();

      expect(response.status).toBe(400);
      expect(data.fieldErrors?.purposes).toBe('Ort für Raumbuchung ist erforderlich');
    });

    it('should validate text length limits for purpose details', async () => {
      const longText = 'A'.repeat(1001);
      const requestData = AntragFactory.createData({ 
        purposes: {
          weiteres: { enabled: true, details: longText }
        },
        fileUrls: undefined 
      });

      const request = new NextRequest('http://localhost:3000/api/antraege/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      const response = await POST(request);
      const data: AntragSubmitResponse = await response.json();

      expect(response.status).toBe(400);
      expect(data.fieldErrors?.purposes).toBe('Details zu weiteren Anliegen dürfen maximal 1000 Zeichen lang sein');
    });
  });

  describe('File Validation', () => {
    it('should validate file constraints when files are present', async () => {
      const requestData = AntragFactory.createData({ fileUrls: undefined });
      const largeFile = createMockFile('large.pdf', 'application/pdf', 6 * 1024 * 1024); // 6MB

      const formData = createMockFormData({
        ...requestData,
        purposes: JSON.stringify(requestData.purposes),
        fileCount: '1',
        'file-0': largeFile
      });

      const request = new NextRequest('http://localhost:3000/api/antraege/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'multipart/form-data' },
        body: formData
      });

      const response = await POST(request);
      const data: AntragSubmitResponse = await response.json();

      expect(response.status).toBe(400);
      expect(data.fieldErrors?.files).toContain('überschreitet das 5MB Limit');
    });

    it('should validate file type constraints', async () => {
      const requestData = AntragFactory.createData({ fileUrls: undefined });
      const invalidFile = createMockFile('script.exe', 'application/x-msdownload', 1024);

      const formData = createMockFormData({
        ...requestData,
        purposes: JSON.stringify(requestData.purposes),
        fileCount: '1',
        'file-0': invalidFile
      });

      const request = new NextRequest('http://localhost:3000/api/antraege/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'multipart/form-data' },
        body: formData
      });

      const response = await POST(request);
      const data: AntragSubmitResponse = await response.json();

      expect(response.status).toBe(400);
      expect(data.fieldErrors?.files).toContain('Nicht unterstützter Dateityp');
    });

    it('should validate total file count', async () => {
      const requestData = AntragFactory.createData({ fileUrls: undefined });
      const files = Array.from({ length: 6 }, (_, i) => 
        createMockFile(`file${i}.pdf`, 'application/pdf', 100 * 1024)
      );

      const formData = createMockFormData({
        ...requestData,
        purposes: JSON.stringify(requestData.purposes),
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
      expect(data.fieldErrors?.files).toContain('Maximal 5 Dateien erlaubt');
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit excessive requests from same IP', async () => {
      const requestData = AntragFactory.createData({ fileUrls: undefined });
      const ip = '192.168.1.100';

      // Make 6 requests (limit is 5 per minute)
      for (let i = 0; i < 6; i++) {
        const request = new NextRequest('http://localhost:3000/api/antraege/submit', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-forwarded-for': ip
          },
          body: JSON.stringify(requestData)
        });

        const response = await POST(request);
        
        if (i < 5) {
          // First 5 requests should pass validation (will fail on other grounds)
          expect(response.status).not.toBe(429);
        } else {
          // 6th request should be rate limited
          expect(response.status).toBe(429);
          const data: AntragSubmitResponse = await response.json();
          expect(data.error).toBe('Zu viele Anfragen. Bitte versuchen Sie es in einer Minute erneut.');
          expect(mockLogger.warn).toHaveBeenCalledWith(
            'Rate limit exceeded for Antrag submission',
            expect.objectContaining({ context: { ip } })
          );
        }
      }
    });

    it('should allow requests from different IPs', async () => {
      const requestData = AntragFactory.createData({ fileUrls: undefined });

      // Make requests from different IPs
      for (let i = 0; i < 3; i++) {
        const request = new NextRequest('http://localhost:3000/api/antraege/submit', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-forwarded-for': `192.168.1.${100 + i}`
          },
          body: JSON.stringify(requestData)
        });

        const response = await POST(request);
        // Should not be rate limited
        expect(response.status).not.toBe(429);
      }
    });
  });

  describe('reCAPTCHA Verification', () => {
    beforeEach(() => {
      // Clear environment variable
      delete process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
    });

    it('should skip reCAPTCHA when not configured', async () => {
      const requestData = AntragFactory.createData({ fileUrls: undefined });
      const createdAntrag = AntragFactory.create(requestData);
      
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
      expect(mockValidateRecaptcha).not.toHaveBeenCalled();
    });

    it('should verify reCAPTCHA when configured', async () => {
      process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY = 'test-site-key';
      
      const requestData = AntragFactory.createData({ fileUrls: undefined });
      const createdAntrag = AntragFactory.create(requestData);
      
      mockValidateRecaptcha.mockResolvedValue(true);
      mockCreateAntrag.mockResolvedValue(createdAntrag);

      const request = new NextRequest('http://localhost:3000/api/antraege/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...requestData,
          recaptchaToken: 'test-token'
        })
      });

      const response = await POST(request);
      const data: AntragSubmitResponse = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockValidateRecaptcha).toHaveBeenCalledWith('test-token');
    });

    it('should reject submission when reCAPTCHA fails', async () => {
      process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY = 'test-site-key';
      
      const requestData = AntragFactory.createData({ fileUrls: undefined });
      
      mockValidateRecaptcha.mockResolvedValue(false);

      const request = new NextRequest('http://localhost:3000/api/antraege/submit', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.100'
        },
        body: JSON.stringify({
          ...requestData,
          recaptchaToken: 'invalid-token'
        })
      });

      const response = await POST(request);
      const data: AntragSubmitResponse = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('reCAPTCHA-Überprüfung fehlgeschlagen. Bitte versuchen Sie es erneut.');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'reCAPTCHA validation failed for Antrag submission',
        expect.objectContaining({ 
          context: { 
            ip: '192.168.1.100',
            email: requestData.email 
          } 
        })
      );
    });

    it('should handle missing reCAPTCHA token when required', async () => {
      process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY = 'test-site-key';
      
      const requestData = AntragFactory.createData({ fileUrls: undefined });
      
      mockValidateRecaptcha.mockResolvedValue(false);

      const request = new NextRequest('http://localhost:3000/api/antraege/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData) // No recaptchaToken
      });

      const response = await POST(request);
      const data: AntragSubmitResponse = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('reCAPTCHA-Überprüfung fehlgeschlagen. Bitte versuchen Sie es erneut.');
    });
  });

  describe('Error Messages', () => {
    it.skip('should return user-friendly error messages in German', async () => {
      const testCases = [
        {
          data: { firstName: 'A' },
          expectedError: 'Vorname muss zwischen 2 und 50 Zeichen lang sein'
        },
        {
          data: { email: 'invalid' },
          expectedError: 'Bitte geben Sie eine gültige E-Mail-Adresse ein'
        },
        {
          data: { title: 'AB' },
          expectedError: 'Titel muss zwischen 3 und 200 Zeichen lang sein'
        }
      ];

      for (const testCase of testCases) {
        // Clear rate limit for each test
        requestCounts.clear();
        
        const requestData = AntragFactory.createData({ 
          ...testCase.data,
          fileUrls: undefined 
        });

        const request = new NextRequest('http://localhost:3000/api/antraege/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestData)
        });

        const response = await POST(request);
        const data: AntragSubmitResponse = await response.json();

        expect(response.status).toBe(400);
        expect(Object.values(data.fieldErrors || {})).toContain(testCase.expectedError);
      }
    });

    it.skip('should return field-specific errors for multiple validation failures', async () => {
      const request = new NextRequest('http://localhost:3000/api/antraege/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: 'A',
          lastName: '',
          email: 'invalid@',
          title: 'TT',
          summary: 'Short',
          purposes: {}
        })
      });

      const response = await POST(request);
      const data: AntragSubmitResponse = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.fieldErrors).toBeDefined();
      expect(Object.keys(data.fieldErrors!).length).toBeGreaterThan(1);
      expect(data.error).toBe('Validierung fehlgeschlagen. Bitte überprüfen Sie Ihre Eingaben.');
    });
  });
});