/**
 * Tests for newsletter helper functions
 * Verifies date formatting, text processing, and appointment utilities
 */

import { describe, it, expect } from '@jest/globals';
import { 
  formatAppointmentDateRange,
  truncateText,
  getCoverImageUrl,
  formatDate,
  formatDateTime,
  formatTime,
  getAppointmentUrl,
  getStatusReportUrl,
  sanitizeTextForEmail,
  extractPlainText,
  generatePreviewText,
  formatEmailAddress,
  hasPhysicalLocation,
  getAppointmentLocation
} from '../../lib/newsletter-helpers';
import { Appointment } from '@prisma/client';

describe('Date Formatting Functions', () => {
  const testDate = new Date('2025-01-20T19:00:00Z');
  const testEndDate = new Date('2025-01-20T21:00:00Z');
  const differentDayEndDate = new Date('2025-01-21T16:00:00Z');

  describe('formatAppointmentDateRange', () => {
    it('should format single date correctly', () => {
      const formatted = formatAppointmentDateRange(testDate);
      expect(formatted).toContain('20. Januar 2025');
      expect(formatted).toContain('20:00');
    });

    it('should format same-day date range correctly', () => {
      const formatted = formatAppointmentDateRange(testDate, testEndDate);
      expect(formatted).toContain('20. Januar 2025');
      expect(formatted).toContain('20:00 - 22:00');
      expect(formatted).toContain('Uhr');
    });

    it('should format multi-day date range correctly', () => {
      const formatted = formatAppointmentDateRange(testDate, differentDayEndDate);
      expect(formatted).toContain('20. Januar 2025');
      expect(formatted).toContain('21. Januar 2025');
      expect(formatted).toContain('20:00 Uhr -');
      expect(formatted).toContain('17:00 Uhr');
    });

    it('should handle string date inputs', () => {
      const formatted = formatAppointmentDateRange('2025-01-20T19:00:00Z', '2025-01-20T21:00:00Z');
      expect(formatted).toContain('20. Januar 2025');
      expect(formatted).toContain('20:00 - 22:00');
    });
  });

  describe('formatDate', () => {
    it('should format date only', () => {
      const formatted = formatDate(testDate);
      expect(formatted).toContain('20. Januar 2025');
      expect(formatted).not.toContain('20:00');
    });
  });

  describe('formatDateTime', () => {
    it('should format date and time', () => {
      const formatted = formatDateTime(testDate);
      expect(formatted).toContain('20. Januar 2025');
      expect(formatted).toContain('20:00');
    });
  });

  describe('formatTime', () => {
    it('should format time only', () => {
      const formatted = formatTime(testDate);
      expect(formatted).toContain('20:00');
      expect(formatted).not.toContain('Januar');
    });
  });
});

describe('Text Processing Functions', () => {
  describe('truncateText', () => {
    it('should not truncate short text', () => {
      const shortText = 'This is a short text.';
      const result = truncateText(shortText, 300);
      expect(result).toBe(shortText);
    });

    it('should truncate long text at word boundary', () => {
      const longText = 'This is a very long text that should be truncated at a word boundary to ensure readability and proper formatting in the newsletter.';
      const result = truncateText(longText, 50);
      
      expect(result.length).toBeLessThanOrEqual(53); // 50 + '...'
      expect(result.endsWith('...')).toBe(true);
      expect(result).not.toContain('boundary to'); // Should break before this
    });

    it('should truncate at max length if no word boundary found', () => {
      const longTextNoSpaces = 'A'.repeat(500);
      const result = truncateText(longTextNoSpaces, 100);
      
      expect(result.length).toBe(103); // 100 + '...'
      expect(result.endsWith('...')).toBe(true);
    });

    it('should handle empty or null text', () => {
      expect(truncateText('', 100)).toBe('');
      expect(truncateText(null as any, 100)).toBe(null);
    });

    it('should use default max length', () => {
      const longText = 'A'.repeat(400);
      const result = truncateText(longText);
      expect(result.length).toBeLessThanOrEqual(303); // 300 + '...'
    });
  });

  describe('sanitizeTextForEmail', () => {
    it('should remove script tags', () => {
      const maliciousText = '<script>alert("xss")</script>Safe content';
      const result = sanitizeTextForEmail(maliciousText);
      expect(result).toBe('Safe content');
    });

    it('should remove HTML tags', () => {
      const htmlText = '<p>This is <strong>bold</strong> text with <a href="#">links</a>.</p>';
      const result = sanitizeTextForEmail(htmlText);
      expect(result).toBe('This is bold text with links.');
    });

    it('should handle empty text', () => {
      expect(sanitizeTextForEmail('')).toBe('');
      expect(sanitizeTextForEmail(null as any)).toBe('');
    });
  });

  describe('extractPlainText', () => {
    it('should convert HTML to plain text', () => {
      const htmlContent = '<p>First paragraph.</p><p>Second paragraph.</p>';
      const result = extractPlainText(htmlContent);
      expect(result).toContain('First paragraph.');
      expect(result).toContain('Second paragraph.');
    });

    it('should convert line breaks', () => {
      const htmlContent = 'Line one<br>Line two<br/>Line three';
      const result = extractPlainText(htmlContent);
      // Function normalizes whitespace, converting newlines to spaces
      expect(result).toBe('Line one Line two Line three');
    });

    it('should handle empty content', () => {
      expect(extractPlainText('')).toBe('');
      expect(extractPlainText(null as any)).toBe('');
    });
  });
});

describe('Appointment Helper Functions', () => {
  const createMockAppointment = (overrides: Partial<Appointment> = {}): Appointment => ({
    id: 1,
    title: 'Test Event',
    teaser: 'Test teaser',
    mainText: 'Test main text content',
    startDateTime: new Date('2025-01-20T19:00:00Z'),
    endDateTime: new Date('2025-01-20T21:00:00Z'),
    street: 'Musterstraße 123',
    city: 'Frankfurt am Main',
    state: 'Hessen',
    postalCode: '60313',
    firstName: 'Max',
    lastName: 'Mustermann',
    recurringText: null,
    fileUrls: null,
    featured: false,
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    processed: true,
    processingDate: new Date(),
    statusChangeDate: new Date(),
    status: 'accepted',
    rejectionReason: null,
    ...overrides
  });

  describe('getCoverImageUrl', () => {
    it('should return cropped cover image for featured appointments', () => {
      const appointment = createMockAppointment({
        featured: true,
        metadata: JSON.stringify({
          croppedCoverImageUrl: 'https://example.com/cropped.jpg',
          coverImageUrl: 'https://example.com/cover.jpg'
        })
      });

      const result = getCoverImageUrl(appointment);
      expect(result).toBe('https://example.com/cropped.jpg');
    });

    it('should return cover image if no cropped version available', () => {
      const appointment = createMockAppointment({
        featured: true,
        metadata: JSON.stringify({
          coverImageUrl: 'https://example.com/cover.jpg'
        })
      });

      const result = getCoverImageUrl(appointment);
      expect(result).toBe('https://example.com/cover.jpg');
    });

    it('should fallback to file URLs', () => {
      const appointment = createMockAppointment({
        fileUrls: JSON.stringify([
          'https://example.com/document.pdf',
          'https://example.com/image.jpg',
          'https://example.com/another.png'
        ])
      });

      const result = getCoverImageUrl(appointment);
      expect(result).toBe('https://example.com/image.jpg');
    });

    it('should return null if no images available', () => {
      const appointment = createMockAppointment({
        fileUrls: JSON.stringify(['https://example.com/document.pdf'])
      });

      const result = getCoverImageUrl(appointment);
      expect(result).toBeNull();
    });

    it('should handle invalid metadata gracefully', () => {
      const appointment = createMockAppointment({
        featured: true,
        metadata: 'invalid json'
      });

      const result = getCoverImageUrl(appointment);
      expect(result).toBeNull();
    });
  });

  describe('getAppointmentUrl', () => {
    it('should generate correct appointment URL', () => {
      const url = getAppointmentUrl(123, 'https://example.com');
      expect(url).toBe('https://example.com/termine/123');
    });

    it('should handle string IDs', () => {
      const url = getAppointmentUrl('abc-123', 'https://example.com');
      expect(url).toBe('https://example.com/termine/abc-123');
    });
  });

  describe('hasPhysicalLocation', () => {
    it('should return true for appointments with address', () => {
      const appointment = createMockAppointment({
        street: 'Musterstraße 123',
        city: 'Frankfurt am Main'
      });

      expect(hasPhysicalLocation(appointment)).toBe(true);
    });

    it('should return false for online appointments', () => {
      const appointment = createMockAppointment({
        street: null,
        city: null,
        state: null,
        postalCode: null
      });

      expect(hasPhysicalLocation(appointment)).toBe(false);
    });
  });

  describe('getAppointmentLocation', () => {
    it('should format physical location', () => {
      const appointment = createMockAppointment({
        street: 'Musterstraße 123',
        city: 'Frankfurt am Main',
        postalCode: '60313'
      });

      const location = getAppointmentLocation(appointment);
      expect(location).toContain('Musterstraße 123');
      expect(location).toContain('Frankfurt am Main');
      expect(location).toContain('60313');
    });

    it('should detect online events from metadata', () => {
      const appointment = createMockAppointment({
        street: null,
        city: null,
        state: null,
        postalCode: null,
        metadata: JSON.stringify({
          onlineLink: 'https://meet.jit.si/test'
        })
      });

      const location = getAppointmentLocation(appointment);
      expect(location).toBe('Online');
    });

    it('should return default message for unknown location', () => {
      const appointment = createMockAppointment({
        street: null,
        city: null,
        state: null,
        postalCode: null,
        metadata: null
      });

      const location = getAppointmentLocation(appointment);
      expect(location).toBe('Ort wird noch bekannt gegeben');
    });
  });
});

describe('URL Generation Functions', () => {
  describe('getStatusReportUrl', () => {
    it('should generate correct status report URL with anchor', () => {
      const url = getStatusReportUrl('report-123', 'test-group', 'https://example.com');
      expect(url).toBe('https://example.com/gruppen/test-group#report-report-123');
    });
  });
});

describe('Email Utility Functions', () => {
  describe('formatEmailAddress', () => {
    it('should format email with name', () => {
      const formatted = formatEmailAddress('test@example.com', 'John Doe');
      expect(formatted).toBe('John Doe <test@example.com>');
    });

    it('should return email only if no name provided', () => {
      const formatted = formatEmailAddress('test@example.com');
      expect(formatted).toBe('test@example.com');
    });

    it('should handle empty name', () => {
      const formatted = formatEmailAddress('test@example.com', '');
      expect(formatted).toBe('test@example.com');
    });

    it('should handle empty email', () => {
      const formatted = formatEmailAddress('');
      expect(formatted).toBe('');
    });
  });

  describe('generatePreviewText', () => {
    it('should convert HTML to plain text for preview', () => {
      const htmlContent = '<p>Willkommen zum Newsletter!</p><p>Hier sind die wichtigsten Informationen.</p>';
      const result = generatePreviewText(htmlContent);
      
      expect(result).toBe('Willkommen zum Newsletter! Hier sind die wichtigsten Informationen.');
    });

    it('should truncate long text to specified length', () => {
      const longHtmlContent = '<p>Dies ist ein sehr langer Text, der definitiv mehr als 90 Zeichen hat und daher truncated werden sollte für die Preview.</p>';
      const result = generatePreviewText(longHtmlContent, 50);
      
      expect(result.length).toBeLessThanOrEqual(50);
      expect(result).toContain('...');
    });

    it('should handle HTML with line breaks', () => {
      const htmlWithBreaks = '<p>Erste Zeile<br>Zweite Zeile<br/><br>Dritte Zeile</p>';
      const result = generatePreviewText(htmlWithBreaks);
      
      expect(result).toBe('Erste Zeile Zweite Zeile Dritte Zeile');
      expect(result).not.toContain('<br');
    });

    it('should truncate at word boundaries when possible', () => {
      const htmlContent = '<p>Dies ist ein Test für Wortgrenzen beim Truncating von langem Text</p>';
      const result = generatePreviewText(htmlContent, 30);
      
      // Should truncate and add ellipsis
      expect(result).toContain('...');
      expect(result.length).toBeLessThanOrEqual(30);
      // Result should be reasonable - starting correctly
      expect(result).toMatch(/^Dies ist ein/);
    });

    it('should handle empty or null content', () => {
      expect(generatePreviewText('')).toBe('');
      expect(generatePreviewText(null as any)).toBe('');
      expect(generatePreviewText(undefined as any)).toBe('');
    });

    it('should use default 90 character limit', () => {
      const shortText = '<p>Kurzer Text</p>';
      const result = generatePreviewText(shortText);
      
      expect(result).toBe('Kurzer Text');
      expect(result.length).toBeLessThanOrEqual(90);
    });

    it('should remove multiple spaces and newlines', () => {
      const messyHtml = '<p>Text   with    multiple\n\n\nspaces\n  and   newlines</p>';
      const result = generatePreviewText(messyHtml);
      
      expect(result).toBe('Text with multiple spaces and newlines');
    });
  });
});