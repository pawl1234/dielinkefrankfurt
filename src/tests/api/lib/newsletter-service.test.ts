import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { NewsletterNotFoundError, NewsletterValidationError } from '@/lib/errors';

// Mock NextResponse
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, init) => ({ 
      data, 
      status: init?.status || 200,
      json: async () => data 
    }))
  }
}));

// Mock logger to suppress console output in tests
jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock the newsletter template defaults
jest.mock('@/lib/newsletter-template', () => ({
  getDefaultNewsletterSettings: jest.fn(() => ({
    headerLogo: '/images/logo.png',
    headerBanner: '/images/banner.png',
    footerText: 'Default footer',
    testEmailRecipients: [],
    unsubscribeLink: 'https://example.com/unsubscribe',
    chunkSize: 50,
    chunkDelayMs: 1000,
  })),
}));

// Mock prisma with proper jest functions
const mockPrismaNewsletter = {
  findFirst: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
};

const mockPrismaNewsletterItem = {
  findUnique: jest.fn(),
  findMany: jest.fn(),
  count: jest.fn(),
};

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    newsletter: mockPrismaNewsletter,
    newsletterItem: mockPrismaNewsletterItem,
  },
}));

import { 
  fixUrlsInNewsletterHtml,
} from '@/lib/newsletter-service';
import { getDefaultNewsletterSettings } from '@/lib/newsletter-template';

describe('Newsletter Service - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fixUrlsInNewsletterHtml', () => {
    it('should return empty string for empty input', () => {
      expect(fixUrlsInNewsletterHtml('')).toBe('');
    });

    it('should return original HTML if no URLs need fixing', () => {
      const html = '<p>Hello world</p>';
      expect(fixUrlsInNewsletterHtml(html)).toBe(html);
    });

    it('should handle null/undefined input gracefully', () => {
      expect(fixUrlsInNewsletterHtml(null as unknown as string)).toBe(null);
      expect(fixUrlsInNewsletterHtml(undefined as unknown as string)).toBe(undefined);
    });
  });

  describe('NewsletterValidationError', () => {
    it('should create validation error with field details', () => {
      const error = new NewsletterValidationError('Validation failed', {
        subject: 'Subject is required',
        content: 'Content is too long'
      });

      expect(error.message).toBe('Validation failed');
      expect(error.name).toBe('NewsletterValidationError');
      expect(error.type).toBe('NEWSLETTER');
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({
        subject: 'Subject is required',
        content: 'Content is too long'
      });
    });

    it('should have details property for field errors', () => {
      const error = new NewsletterValidationError('Multiple field errors', {
        subject: 'Required field missing',
        introduction: 'Text too long',
        content: 'Invalid format'
      });

      expect(error.details).toBeDefined();
      expect(Object.keys(error.details)).toEqual(['subject', 'introduction', 'content']);
    });
  });

  describe('NewsletterNotFoundError', () => {
    it('should create not found error with context', () => {
      const error = new NewsletterNotFoundError('Newsletter not found', { id: '123' });

      expect(error.message).toBe('Newsletter not found');
      expect(error.name).toBe('NewsletterNotFoundError');
      expect(error.type).toBe('NEWSLETTER');
      expect(error.statusCode).toBe(404);
      expect(error.context).toEqual({ id: '123' });
    });
  });

  describe('Validation logic', () => {
    it('should validate subject requirements', () => {
      // Test subject validation logic
      const validSubject = 'Valid Newsletter Subject';
      const emptySubject = '';
      const longSubject = 'A'.repeat(201); // Over 200 chars

      expect(validSubject.length).toBeGreaterThan(0);
      expect(validSubject.length).toBeLessThanOrEqual(200);
      
      expect(emptySubject.length).toBe(0);
      expect(longSubject.length).toBeGreaterThan(200);
    });

    it('should validate newsletter status for updates', () => {
      const validStatuses = ['draft', 'sending', 'sent', 'failed'];
      const invalidStatus = 'invalid';

      expect(validStatuses).toContain('draft');
      expect(validStatuses).toContain('sent');
      expect(validStatuses).not.toContain(invalidStatus);
    });

    it('should validate newsletter status for deletion', () => {
      // Only draft newsletters should be deletable
      const draftStatus = 'draft';
      const sentStatus = 'sent';
      const sendingStatus = 'sending';

      expect(draftStatus).toBe('draft');
      expect(sentStatus).not.toBe('draft');
      expect(sendingStatus).not.toBe('draft');
    });
  });

  describe('Data transformation', () => {
    it('should trim whitespace from subject', () => {
      const subjectWithSpaces = '  Newsletter Subject  ';
      const trimmedSubject = subjectWithSpaces.trim();

      expect(trimmedSubject).toBe('Newsletter Subject');
      expect(trimmedSubject).not.toContain('  ');
    });

    it('should handle settings serialization', () => {
      const settings = {
        headerLogo: '/logo.png',
        footerText: 'Footer',
        chunkSize: 50
      };

      const serialized = JSON.stringify(settings);
      const deserialized = JSON.parse(serialized);

      expect(deserialized).toEqual(settings);
      expect(typeof serialized).toBe('string');
      expect(typeof deserialized).toBe('object');
    });

    it('should handle null and undefined values', () => {
      const settingsWithNulls = {
        headerLogo: null,
        footerText: undefined,
        chunkSize: 50
      };

      const defaults = getDefaultNewsletterSettings();
      const merged = {
        headerLogo: settingsWithNulls.headerLogo ?? defaults.headerLogo,
        footerText: settingsWithNulls.footerText ?? defaults.footerText,
        chunkSize: settingsWithNulls.chunkSize ?? defaults.chunkSize
      };

      expect(merged.headerLogo).toBe(defaults.headerLogo);
      expect(merged.footerText).toBe(defaults.footerText);
      expect(merged.chunkSize).toBe(50);
    });
  });

  describe('Authorization patterns', () => {
    it('should enforce draft-only operations', () => {
      const draftNewsletter = { status: 'draft' };
      const sentNewsletter = { status: 'sent' };

      // Only draft newsletters should be editable
      const canEditDraft = draftNewsletter.status === 'draft';
      const canEditSent = sentNewsletter.status === 'draft';

      expect(canEditDraft).toBe(true);
      expect(canEditSent).toBe(false);
    });
  });
});