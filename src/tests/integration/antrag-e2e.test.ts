import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { NextRequest } from 'next/server';
import { POST as submitAntrag } from '@/app/api/antraege/submit/route';
import { GET as getAntraege, POST as acceptAntrag } from '@/app/api/admin/antraege/[id]/accept/route';
import { POST as rejectAntrag } from '@/app/api/admin/antraege/[id]/reject/route';
import { GET as getConfiguration, PUT as updateConfiguration } from '@/app/api/admin/antraege/configuration/route';
import prisma from '@/lib/prisma';
import { sendAntragAcceptanceEmail, sendAntragRejectionEmail } from '@/lib/email-senders';
import { validateRecaptcha } from '@/lib/validation/utils';
import { uploadAntragFiles } from '@/lib/antrag-file-utils';
import { logger } from '@/lib/logger';
import { AntragFactory, createMockFile, createMockFormData } from '@/tests/factories';
import type { AntragSubmitResponse } from '@/app/api/antraege/submit/route';

// Mock all dependencies
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    antrag: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    antragConfiguration: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $disconnect: jest.fn(),
  },
}));

jest.mock('@/lib/email-senders', () => ({
  sendAntragAcceptanceEmail: jest.fn(),
  sendAntragRejectionEmail: jest.fn(),
}));

jest.mock('@/lib/validation/antrag-validator', () => ({
  ...jest.requireActual('@/lib/validation/antrag-validator'),
  validateRecaptcha: jest.fn(),
}));

jest.mock('@/lib/antrag-file-utils', () => ({
  uploadAntragFiles: jest.fn(),
  deleteAntragFiles: jest.fn(),
  validateAntragFiles: jest.requireActual('@/lib/antrag-file-utils').validateAntragFiles,
}));

jest.mock('@/lib/api-auth', () => ({
  withAdminAuth: jest.fn((handler) => handler),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

// Type the mocked modules
const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockSendAntragAcceptanceEmail = sendAntragAcceptanceEmail as jest.MockedFunction<typeof sendAntragAcceptanceEmail>;
const mockSendAntragRejectionEmail = sendAntragRejectionEmail as jest.MockedFunction<typeof sendAntragRejectionEmail>;
const mockValidateRecaptcha = validateRecaptcha as jest.MockedFunction<typeof validateRecaptcha>;
const mockUploadAntragFiles = uploadAntragFiles as jest.MockedFunction<typeof uploadAntragFiles>;
const mockLogger = logger as jest.Mocked<typeof logger>;

// Helper functions
function createRequest(method: 'GET' | 'POST' | 'PUT', body?: any, headers?: Record<string, string>): NextRequest {
  const url = 'http://localhost:3000/api/test';
  const init: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (body) {
    init.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  return new NextRequest(url, init);
}

function createFormDataRequest(formData: FormData): NextRequest {
  return new NextRequest('http://localhost:3000/api/antraege/submit', {
    method: 'POST',
    body: formData,
  });
}

describe('Antrag End-to-End Integration Tests', () => {
  // Sample test data
  const mockAntragData = {
    id: 'test-antrag-id',
    firstName: 'Max',
    lastName: 'Mustermann',
    email: 'max.mustermann@example.com',
    title: 'Finanzierung für Klimaschutzprojekt',
    summary: 'Wir beantragen Unterstützung für unser lokales Klimaschutzprojekt zur Installation von Solarpanelen auf dem Gemeinschaftszentrum.',
    purposes: JSON.stringify({
      zuschuss: { enabled: true, amount: 2500 },
      personelleUnterstuetzung: { enabled: false, details: '' },
      raumbuchung: { enabled: false, location: '', numberOfPeople: 0, details: '' },
      weiteres: { enabled: false, details: '' }
    }),
    status: 'NEU',
    fileUrls: '["https://example.com/file1.pdf", "https://example.com/file2.jpg"]',
    createdAt: new Date('2024-01-01T10:00:00Z'),
    updatedAt: new Date('2024-01-01T10:00:00Z'),
    decisionComment: null,
    decidedBy: null,
    decidedAt: null,
  };

  const mockConfiguration = {
    id: 1,
    recipientEmails: 'admin@die-linke-frankfurt.de,kreisvorstand@die-linke-frankfurt.de',
    createdAt: new Date('2024-01-01T09:00:00Z'),
    updatedAt: new Date('2024-01-01T09:00:00Z'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    mockPrisma.antragConfiguration.findFirst.mockResolvedValue(mockConfiguration);
    mockValidateRecaptcha.mockResolvedValue(true);
    mockUploadAntragFiles.mockResolvedValue([
      'https://example.com/file1.pdf',
      'https://example.com/file2.jpg'
    ]);
    mockSendAntragAcceptanceEmail.mockResolvedValue({ success: true });
    mockSendAntragRejectionEmail.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Complete User Journey: Submission to Decision', () => {
    it.skip('should handle full lifecycle from user submission to admin acceptance with email notifications', async () => {
      // ========================================
      // 1. INITIAL CONFIGURATION SETUP
      // ========================================
      
      // Admin configures email recipients (if not already configured)
      const configRequest = createRequest('GET');
      const configResponse = await getConfiguration();
      const configData = await configResponse.json();
      
      expect(configResponse.status).toBe(200);
      expect(configData.recipientEmails).toBe('admin@die-linke-frankfurt.de,kreisvorstand@die-linke-frankfurt.de');
      expect(mockPrisma.antragConfiguration.findFirst).toHaveBeenCalled();

      // ========================================
      // 2. USER SUBMITS ANTRAG WITH FILES
      // ========================================
      
      const formData = new FormData();
      formData.append('firstName', mockAntragData.firstName);
      formData.append('lastName', mockAntragData.lastName);
      formData.append('email', mockAntragData.email);
      formData.append('title', mockAntragData.title);
      formData.append('summary', mockAntragData.summary);
      formData.append('purposes', mockAntragData.purposes);
      
      // Add files
      const file1 = createMockFile('budget-plan.pdf', 'application/pdf', 1024 * 1024); // 1MB
      const file2 = createMockFile('project-photos.jpg', 'image/jpeg', 2 * 1024 * 1024); // 2MB
      formData.append('file-0', file1);
      formData.append('file-1', file2);
      formData.append('fileCount', '2');
      
      // Add reCAPTCHA token
      formData.append('recaptchaToken', 'valid-recaptcha-token');

      // Mock successful creation
      const createdAntrag = { ...mockAntragData };
      mockPrisma.antrag.create.mockResolvedValue(createdAntrag);

      const submitRequest = createFormDataRequest(formData);
      const submitResponse = await submitAntrag(submitRequest);
      const submitData: AntragSubmitResponse = await submitResponse.json();

      // Verify successful submission
      expect(submitResponse.status).toBe(200);
      expect(submitData.success).toBe(true);
      expect(submitData.message).toBe('Antrag erfolgreich übermittelt');
      expect(submitData.antrag).toMatchObject({
        id: mockAntragData.id,
        title: mockAntragData.title,
        status: 'NEU'
      });

      // Verify validation was performed
      expect(mockValidateRecaptcha).toHaveBeenCalledWith('valid-recaptcha-token');
      
      // Verify files were uploaded
      expect(mockUploadAntragFiles).toHaveBeenCalledWith([file1, file2]);
      
      // Verify database creation
      expect(mockPrisma.antrag.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          firstName: 'Max',
          lastName: 'Mustermann',
          email: 'max.mustermann@example.com',
          title: 'Finanzierung für Klimaschutzprojekt',
          status: 'NEU',
          fileUrls: JSON.stringify([
            'https://example.com/file1.pdf',
            'https://example.com/file2.jpg'
          ])
        })
      });

      // Verify logging
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Antrag submitted successfully',
        expect.objectContaining({
          context: expect.objectContaining({
            antragId: mockAntragData.id,
            email: 'max.mustermann@example.com'
          })
        })
      );

      // ========================================
      // 3. ADMIN REVIEWS ANTRAG
      // ========================================
      
      // Admin fetches pending anträge
      const pendingAntraege = [createdAntrag];
      mockPrisma.antrag.findMany.mockResolvedValue(pendingAntraege);
      
      // Simulate admin dashboard query
      const adminQuery = await mockPrisma.antrag.findMany({
        where: { status: 'NEU' },
        orderBy: { createdAt: 'desc' }
      });
      
      expect(adminQuery).toHaveLength(1);
      expect(adminQuery[0].title).toBe('Finanzierung für Klimaschutzprojekt');

      // ========================================
      // 4. ADMIN ACCEPTS ANTRAG
      // ========================================
      
      // Mock finding the antrag for acceptance
      mockPrisma.antrag.findUnique.mockResolvedValue(createdAntrag);
      
      // Mock successful update
      const acceptedAntrag = {
        ...createdAntrag,
        status: 'AKZEPTIERT',
        decisionComment: 'Genehmigt: Wichtiges Klimaschutzprojekt mit positivem Impact.',
        decidedAt: new Date('2024-01-02T10:00:00Z'),
      };
      mockPrisma.antrag.update.mockResolvedValue(acceptedAntrag);

      const acceptRequest = createRequest('POST', {
        decisionComment: 'Genehmigt: Wichtiges Klimaschutzprojekt mit positivem Impact.'
      });
      
      const acceptResponse = await acceptAntrag(acceptRequest, { params: { id: mockAntragData.id } });
      const acceptData = await acceptResponse.json();

      // Verify successful acceptance
      expect(acceptResponse.status).toBe(200);
      expect(acceptData.success).toBe(true);
      expect(acceptData.message).toBe('Antrag wurde erfolgreich angenommen');
      expect(acceptData.emailSent).toBe(true);

      // Verify database update
      expect(mockPrisma.antrag.update).toHaveBeenCalledWith({
        where: { id: mockAntragData.id },
        data: {
          status: 'AKZEPTIERT',
          decisionComment: 'Genehmigt: Wichtiges Klimaschutzprojekt mit positivem Impact.',
          decidedAt: expect.any(Date),
        }
      });

      // Verify acceptance email was sent
      expect(mockSendAntragAcceptanceEmail).toHaveBeenCalledWith(
        acceptedAntrag,
        'Genehmigt: Wichtiges Klimaschutzprojekt mit positivem Impact.'
      );

      // Verify logging
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Antrag accepted successfully',
        expect.objectContaining({
          context: expect.objectContaining({
            antragId: mockAntragData.id,
            decidedBy: undefined,
            hasComment: true
          })
        })
      );
    });

    it.skip('should handle complete rejection workflow with email notifications', async () => {
      // ========================================
      // 1. SETUP: ANTRAG EXISTS
      // ========================================
      
      const existingAntrag = { ...mockAntragData };
      mockPrisma.antrag.findUnique.mockResolvedValue(existingAntrag);

      // ========================================
      // 2. ADMIN REJECTS ANTRAG
      // ========================================
      
      const rejectedAntrag = {
        ...existingAntrag,
        status: 'ABGELEHNT',
        decisionComment: 'Antrag entspricht nicht den aktuellen Förderrichtlinien.',
        decidedAt: new Date('2024-01-02T10:00:00Z'),
      };
      mockPrisma.antrag.update.mockResolvedValue(rejectedAntrag);

      const rejectRequest = createRequest('POST', {
        decisionComment: 'Antrag entspricht nicht den aktuellen Förderrichtlinien.'
      });
      
      const rejectResponse = await rejectAntrag(rejectRequest, { params: { id: mockAntragData.id } });
      const rejectData = await rejectResponse.json();

      // Verify successful rejection
      expect(rejectResponse.status).toBe(200);
      expect(rejectData.success).toBe(true);
      expect(rejectData.message).toBe('Antrag wurde erfolgreich abgelehnt');
      expect(rejectData.emailSent).toBe(true);

      // Verify database update
      expect(mockPrisma.antrag.update).toHaveBeenCalledWith({
        where: { id: mockAntragData.id },
        data: {
          status: 'ABGELEHNT',
          decisionComment: 'Antrag entspricht nicht den aktuellen Förderrichtlinien.',
          decidedAt: expect.any(Date),
        }
      });

      // Verify rejection email was sent
      expect(mockSendAntragRejectionEmail).toHaveBeenCalledWith(
        rejectedAntrag,
        'Antrag entspricht nicht den aktuellen Förderrichtlinien.'
      );

      // Verify logging
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Antrag rejected successfully',
        expect.objectContaining({
          context: expect.objectContaining({
            antragId: mockAntragData.id,
            hasComment: true
          })
        })
      );
    });
  });

  describe('Form Validation End-to-End', () => {
    it.skip('should validate all form fields comprehensively', async () => {
      const testCases = [
        {
          name: 'Empty form',
          data: {},
          expectedErrors: {
            firstName: 'Vorname ist erforderlich',
            lastName: 'Nachname ist erforderlich',
            email: 'E-Mail-Adresse ist erforderlich',
            title: 'Titel ist erforderlich',
            summary: 'Zusammenfassung ist erforderlich',
            purposes: 'Mindestens ein Zweck muss ausgewählt werden'
          }
        },
        {
          name: 'Invalid name characters',
          data: {
            firstName: 'Max123',
            lastName: 'Mustermann@invalid',
            email: 'max@example.com',
            title: 'Valid Title',
            summary: 'Valid summary with enough characters',
            purposes: JSON.stringify({ zuschuss: { enabled: true, amount: 500 } })
          },
          expectedErrors: {
            firstName: 'Vorname enthält ungültige Zeichen',
            lastName: 'Nachname enthält ungültige Zeichen'
          }
        },
        {
          name: 'Invalid email format',
          data: {
            firstName: 'Max',
            lastName: 'Mustermann',
            email: 'invalid-email-format',
            title: 'Valid Title',
            summary: 'Valid summary with enough characters',
            purposes: JSON.stringify({ zuschuss: { enabled: true, amount: 500 } })
          },
          expectedErrors: {
            email: 'Bitte geben Sie eine gültige E-Mail-Adresse ein'
          }
        },
        {
          name: 'Invalid zuschuss amount',
          data: {
            firstName: 'Max',
            lastName: 'Mustermann',
            email: 'max@example.com',
            title: 'Valid Title',
            summary: 'Valid summary with enough characters',
            purposes: JSON.stringify({ zuschuss: { enabled: true, amount: 0 } })
          },
          expectedErrors: {
            purposes: 'Betrag muss mindestens 1 Euro betragen'
          }
        },
        {
          name: 'Missing purpose details',
          data: {
            firstName: 'Max',
            lastName: 'Mustermann',
            email: 'max@example.com',
            title: 'Valid Title',
            summary: 'Valid summary with enough characters',
            purposes: JSON.stringify({ 
              personelleUnterstuetzung: { enabled: true, details: '' }
            })
          },
          expectedErrors: {
            purposes: 'Details zur personellen Unterstützung sind erforderlich'
          }
        }
      ];

      for (const testCase of testCases) {
        const request = createRequest('POST', testCase.data);
        const response = await submitAntrag(request);
        const data: AntragSubmitResponse = await response.json();

        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.fieldErrors).toMatchObject(testCase.expectedErrors);
        
        // Verify no database operation occurred
        expect(mockPrisma.antrag.create).not.toHaveBeenCalled();
        mockPrisma.antrag.create.mockClear();
      }
    });

    it.skip('should validate German characters in names correctly', async () => {
      const validGermanData = {
        firstName: 'Björn-Müller',
        lastName: 'von der Höhe',
        email: 'bjoern@example.com',
        title: 'Förderung für Straßenfest',
        summary: 'Wir möchten ein Straßenfest organisieren mit über 100 Teilnehmern.',
        purposes: JSON.stringify({ 
          raumbuchung: { 
            enabled: true, 
            location: 'Römerberg', 
            numberOfPeople: 100,
            details: 'Straßenfest mit Bühnenprogramm'
          }
        })
      };

      const createdAntrag = { ...mockAntragData, ...validGermanData };
      mockPrisma.antrag.create.mockResolvedValue(createdAntrag);

      const request = createRequest('POST', validGermanData);
      const response = await submitAntrag(request);
      const data: AntragSubmitResponse = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockPrisma.antrag.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          firstName: 'Björn-Müller',
          lastName: 'von der Höhe'
        })
      });
    });
  });

  describe('File Upload End-to-End', () => {
    it.skip('should handle file upload validation and processing', async () => {
      const baseData = AntragFactory.createData({ fileUrls: undefined });
      
      // Test file size limits
      const largeFile = createMockFile('large-file.pdf', 'application/pdf', 6 * 1024 * 1024); // 6MB
      const validFile = createMockFile('valid-file.pdf', 'application/pdf', 1 * 1024 * 1024); // 1MB
      
      const formData = createMockFormData({
        ...baseData,
        purposes: JSON.stringify(baseData.purposes),
        fileCount: '2',
        'file-0': largeFile,
        'file-1': validFile
      });

      const request = createFormDataRequest(formData);
      const response = await submitAntrag(request);
      const data: AntragSubmitResponse = await response.json();

      expect(response.status).toBe(400);
      expect(data.fieldErrors?.files).toContain('überschreitet das 5MB Limit');
    });

    it.skip('should reject unsupported file types', async () => {
      const baseData = AntragFactory.createData({ fileUrls: undefined });
      const invalidFile = createMockFile('malicious.exe', 'application/x-msdownload', 1024);

      const formData = createMockFormData({
        ...baseData,
        purposes: JSON.stringify(baseData.purposes),
        fileCount: '1',
        'file-0': invalidFile
      });

      const request = createFormDataRequest(formData);
      const response = await submitAntrag(request);
      const data: AntragSubmitResponse = await response.json();

      expect(response.status).toBe(400);
      expect(data.fieldErrors?.files).toContain('Nicht unterstützter Dateityp');
    });

    it.skip('should enforce maximum file count', async () => {
      const baseData = AntragFactory.createData({ fileUrls: undefined });
      const files = Array.from({ length: 6 }, (_, i) => 
        createMockFile(`file${i}.pdf`, 'application/pdf', 100 * 1024)
      );

      const formData = createMockFormData({
        ...baseData,
        purposes: JSON.stringify(baseData.purposes),
        fileCount: '6',
        ...Object.fromEntries(files.map((file, i) => [`file-${i}`, file]))
      });

      const request = createFormDataRequest(formData);
      const response = await submitAntrag(request);
      const data: AntragSubmitResponse = await response.json();

      expect(response.status).toBe(400);
      expect(data.fieldErrors?.files).toContain('Maximal 5 Dateien erlaubt');
    });

    it.skip('should successfully process valid files', async () => {
      const baseData = AntragFactory.createData({ fileUrls: undefined });
      const files = [
        createMockFile('budget.pdf', 'application/pdf', 1 * 1024 * 1024),
        createMockFile('photo.jpg', 'image/jpeg', 2 * 1024 * 1024)
      ];

      const formData = createMockFormData({
        ...baseData,
        purposes: JSON.stringify(baseData.purposes),
        fileCount: '2',
        'file-0': files[0],
        'file-1': files[1]
      });

      const createdAntrag = { ...mockAntragData };
      mockPrisma.antrag.create.mockResolvedValue(createdAntrag);

      const request = createFormDataRequest(formData);
      const response = await submitAntrag(request);
      const data: AntragSubmitResponse = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockUploadAntragFiles).toHaveBeenCalledWith(files);
    });
  });

  describe('Admin Workflow End-to-End', () => {
    it.skip('should prevent processing already decided anträge', async () => {
      const alreadyAcceptedAntrag = {
        ...mockAntragData,
        status: 'AKZEPTIERT',
        decidedAt: new Date('2024-01-01T10:00:00Z')
      };
      
      mockPrisma.antrag.findUnique.mockResolvedValue(alreadyAcceptedAntrag);

      const acceptRequest = createRequest('POST', {
        decisionComment: 'Trying to accept again'
      });
      
      const response = await acceptAntrag(acceptRequest, { params: { id: mockAntragData.id } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Antrag has already been akzeptiert');
      expect(mockPrisma.antrag.update).not.toHaveBeenCalled();
      expect(mockSendAntragAcceptanceEmail).not.toHaveBeenCalled();
    });

    it.skip('should handle missing antrag gracefully', async () => {
      mockPrisma.antrag.findUnique.mockResolvedValue(null);

      const acceptRequest = createRequest('POST');
      const response = await acceptAntrag(acceptRequest, { params: { id: 'non-existent-id' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Antrag not found');
      expect(mockPrisma.antrag.update).not.toHaveBeenCalled();
    });

    it.skip('should continue processing even if email sending fails', async () => {
      const existingAntrag = { ...mockAntragData };
      mockPrisma.antrag.findUnique.mockResolvedValue(existingAntrag);
      
      const acceptedAntrag = {
        ...existingAntrag,
        status: 'AKZEPTIERT',
        decidedAt: new Date('2024-01-02T10:00:00Z')
      };
      mockPrisma.antrag.update.mockResolvedValue(acceptedAntrag);
      
      // Mock email failure
      mockSendAntragAcceptanceEmail.mockResolvedValue({ 
        success: false, 
        error: 'Email service unavailable' 
      });

      const acceptRequest = createRequest('POST');
      const response = await acceptAntrag(acceptRequest, { params: { id: mockAntragData.id } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.emailSent).toBe(false);
      expect(mockPrisma.antrag.update).toHaveBeenCalled();
    });
  });

  describe('Email Configuration End-to-End', () => {
    it.skip('should create default configuration when none exists', async () => {
      mockPrisma.antragConfiguration.findFirst.mockResolvedValue(null);
      
      const defaultConfig = {
        id: 1,
        recipientEmails: 'admin@die-linke-frankfurt.de,kreisvorstand@die-linke-frankfurt.de',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      mockPrisma.antragConfiguration.create.mockResolvedValue(defaultConfig);

      const request = createRequest('GET');
      const response = await getConfiguration();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.recipientEmails).toBe('admin@die-linke-frankfurt.de,kreisvorstand@die-linke-frankfurt.de');
      expect(mockPrisma.antragConfiguration.create).toHaveBeenCalledWith({
        data: {
          recipientEmails: 'admin@die-linke-frankfurt.de,kreisvorstand@die-linke-frankfurt.de'
        }
      });
    });

    it.skip('should update email configuration with validation', async () => {
      const existingConfig = { ...mockConfiguration };
      mockPrisma.antragConfiguration.findFirst.mockResolvedValue(existingConfig);
      
      const updatedConfig = {
        ...existingConfig,
        recipientEmails: 'new@example.com, admin@test.org',
        updatedAt: new Date()
      };
      mockPrisma.antragConfiguration.update.mockResolvedValue(updatedConfig);

      const updateRequest = createRequest('PUT', {
        recipientEmails: 'new@example.com, admin@test.org'
      });
      
      const response = await updateConfiguration(updateRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.recipientEmails).toBe('new@example.com, admin@test.org');
      expect(mockPrisma.antragConfiguration.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { recipientEmails: 'new@example.com, admin@test.org' }
      });
    });

    it.skip('should validate email addresses in configuration', async () => {
      const updateRequest = createRequest('PUT', {
        recipientEmails: 'invalid-email, another-invalid'
      });
      
      const response = await updateConfiguration(updateRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid email addresses');
      expect(data.details).toEqual([
        'Ungültige E-Mail-Adresse: invalid-email',
        'Ungültige E-Mail-Adresse: another-invalid'
      ]);
      expect(mockPrisma.antragConfiguration.update).not.toHaveBeenCalled();
    });
  });

  describe('Security and Rate Limiting', () => {
    it.skip('should enforce rate limiting on submissions', async () => {
      const validData = AntragFactory.createData({ fileUrls: undefined });
      const ip = '192.168.1.100';

      // Make multiple requests from same IP
      for (let i = 0; i < 6; i++) {
        const request = createRequest('POST', validData, { 'x-forwarded-for': ip });
        const response = await submitAntrag(request);
        
        if (i < 5) {
          // First 5 requests should not be rate limited
          expect(response.status).not.toBe(429);
        } else {
          // 6th request should be rate limited
          expect(response.status).toBe(429);
          const data: AntragSubmitResponse = await response.json();
          expect(data.error).toBe('Zu viele Anfragen. Bitte versuchen Sie es in einer Minute erneut.');
        }
      }
    });

    it.skip('should validate reCAPTCHA when configured', async () => {
      // Mock reCAPTCHA as enabled
      process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY = 'test-site-key';
      
      const validData = AntragFactory.createData({ fileUrls: undefined });
      mockValidateRecaptcha.mockResolvedValue(false);

      const request = createRequest('POST', {
        ...validData,
        recaptchaToken: 'invalid-token'
      });
      
      const response = await submitAntrag(request);
      const data: AntragSubmitResponse = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('reCAPTCHA-Überprüfung fehlgeschlagen. Bitte versuchen Sie es erneut.');
      expect(mockPrisma.antrag.create).not.toHaveBeenCalled();
      
      // Clean up
      delete process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
    });
  });

  describe('Error Handling and Recovery', () => {
    it.skip('should handle database errors gracefully', async () => {
      const validData = AntragFactory.createData({ fileUrls: undefined });
      mockPrisma.antrag.create.mockRejectedValue(new Error('Database connection failed'));

      const request = createRequest('POST', validData);
      const response = await submitAntrag(request);
      const data: AntragSubmitResponse = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Ein Serverfehler ist aufgetreten. Bitte versuchen Sie es später erneut.');
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          context: expect.objectContaining({
            operation: 'createAntrag'
          })
        })
      );
    });

    it.skip('should handle file upload failures gracefully', async () => {
      const baseData = AntragFactory.createData({ fileUrls: undefined });
      const files = [createMockFile('test.pdf', 'application/pdf', 1024)];
      
      const formData = createMockFormData({
        ...baseData,
        purposes: JSON.stringify(baseData.purposes),
        fileCount: '1',
        'file-0': files[0]
      });

      // Mock file upload failure
      mockUploadAntragFiles.mockRejectedValue(new Error('File upload service unavailable'));

      const request = createFormDataRequest(formData);
      const response = await submitAntrag(request);
      const data: AntragSubmitResponse = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Ein Serverfehler ist aufgetreten. Bitte versuchen Sie es später erneut.');
      expect(mockPrisma.antrag.create).not.toHaveBeenCalled();
    });

    it.skip('should handle malformed JSON gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json'
      });
      
      const response = await submitAntrag(request);
      const data: AntragSubmitResponse = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Ein Serverfehler ist aufgetreten. Bitte versuchen Sie es später erneut.');
    });
  });

  describe('Comprehensive Integration Scenarios', () => {
    it.skip('should handle complete workflow with multiple files and all purposes', async () => {
      // Complex form data with all purpose types
      const complexData = {
        firstName: 'Anna',
        lastName: 'Klima-Aktivistin',
        email: 'anna@klimaschutz-frankfurt.de',
        title: 'Umfassendes Klimaschutzprojekt 2024',
        summary: 'Unser Projekt umfasst Solarpanels, personelle Unterstützung für Workshops, Raumbuchungen für Veranstaltungen und weitere innovative Maßnahmen für den Klimaschutz in Frankfurt.',
        purposes: JSON.stringify({
          zuschuss: { 
            enabled: true, 
            amount: 5000 
          },
          personelleUnterstuetzung: { 
            enabled: true, 
            details: 'Benötigen einen Experten für Solartechnik für 3 Workshops à 2 Stunden' 
          },
          raumbuchung: { 
            enabled: true, 
            location: 'Bürgerhaus Bockenheim',
            numberOfPeople: 50,
            details: 'Informationsveranstaltung am 15.06.2024 von 18:00-21:00 Uhr'
          },
          weiteres: { 
            enabled: true, 
            details: 'Unterstützung bei der Öffentlichkeitsarbeit und Social Media Kampagne' 
          }
        })
      };

      // Multiple files of different types
      const files = [
        createMockFile('projektplan.pdf', 'application/pdf', 2 * 1024 * 1024),
        createMockFile('kostenvoranschlag.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 1 * 1024 * 1024),
        createMockFile('standortfotos.jpg', 'image/jpeg', 3 * 1024 * 1024),
        createMockFile('referenzen.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 500 * 1024)
      ];

      const formData = createMockFormData({
        ...complexData,
        purposes: complexData.purposes,
        fileCount: '4',
        'file-0': files[0],
        'file-1': files[1],
        'file-2': files[2],
        'file-3': files[3],
        recaptchaToken: 'valid-complex-token'
      });

      const createdAntrag = { 
        ...mockAntragData, 
        ...complexData,
        purposes: complexData.purposes,
        fileUrls: JSON.stringify([
          'https://example.com/projektplan.pdf',
          'https://example.com/kostenvoranschlag.xlsx',
          'https://example.com/standortfotos.jpg',
          'https://example.com/referenzen.docx'
        ])
      };
      
      mockPrisma.antrag.create.mockResolvedValue(createdAntrag);
      mockUploadAntragFiles.mockResolvedValue([
        'https://example.com/projektplan.pdf',
        'https://example.com/kostenvoranschlag.xlsx',
        'https://example.com/standortfotos.jpg',
        'https://example.com/referenzen.docx'
      ]);

      // Submit the complex antrag
      const submitRequest = createFormDataRequest(formData);
      const submitResponse = await submitAntrag(submitRequest);
      const submitData: AntragSubmitResponse = await submitResponse.json();

      expect(submitResponse.status).toBe(200);
      expect(submitData.success).toBe(true);
      expect(submitData.antrag.title).toBe('Umfassendes Klimaschutzprojekt 2024');

      // Admin accepts with detailed comment
      mockPrisma.antrag.findUnique.mockResolvedValue(createdAntrag);
      const acceptedAntrag = {
        ...createdAntrag,
        status: 'AKZEPTIERT',
        decisionComment: 'Exzellentes Projekt! Alle Bereiche werden unterstützt: Zuschuss von 5000€ genehmigt, Experte für Solartechnik wird vermittelt, Raumbuchung für 15.06.2024 bestätigt, Unterstützung bei Öffentlichkeitsarbeit zugesagt.',
        decidedAt: new Date('2024-01-02T10:00:00Z'),
      };
      mockPrisma.antrag.update.mockResolvedValue(acceptedAntrag);

      const acceptRequest = createRequest('POST', {
        decisionComment: acceptedAntrag.decisionComment
      });
      
      const acceptResponse = await acceptAntrag(acceptRequest, { params: { id: createdAntrag.id } });
      const acceptData = await acceptResponse.json();

      expect(acceptResponse.status).toBe(200);
      expect(acceptData.success).toBe(true);
      expect(acceptData.emailSent).toBe(true);

      // Verify comprehensive logging
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Antrag submitted successfully',
        expect.objectContaining({
          context: expect.objectContaining({
            email: 'anna@klimaschutz-frankfurt.de',
            purposeCount: 4,
            fileCount: 4,
            totalFileSize: expect.any(Number)
          })
        })
      );
    });
  });
});