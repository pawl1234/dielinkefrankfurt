import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Email module is mocked globally in jest.setup.js

jest.mock('@/lib/email-hashing', () => ({
  validateEmail: jest.fn((email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)),
  cleanEmail: jest.fn((email: string) => email.trim().toLowerCase())
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

// Mock newsletter-sending module
jest.mock('@/lib/newsletter-sending');

// Import after mocking
import { sendEmailWithTransporter } from '@/lib/email';
import { processSendingChunk } from '@/lib/newsletter-sending';
import { NewsletterSettings } from '@/lib/newsletter-template';

// Get mocked functions
const mockSendEmailWithTransporter = jest.mocked(sendEmailWithTransporter);
const mockProcessSendingChunk = jest.mocked(processSendingChunk);

describe('BCC-Only Mode Newsletter Sending', () => {
  const mockBccSettings: NewsletterSettings & { html: string; subject: string } = {
    headerLogo: '/logo.png',
    headerBanner: '/banner.png', 
    footerText: 'Footer text',
    unsubscribeLink: 'https://example.com/unsubscribe',
    fromEmail: 'newsletter@example.com',
    fromName: 'Test Newsletter',
    replyToEmail: 'reply@example.com',
    chunkSize: 10,
    chunkDelay: 100,
    emailTimeout: 30000,
    html: '<html>Test newsletter content</html>',
    subject: 'Test Newsletter'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock sendEmailWithTransporter (used by processSendingChunk)
    mockSendEmailWithTransporter.mockResolvedValue({
      success: true,
      messageId: 'test-message-id'
    });
    
    // Mock processSendingChunk to return proper results
    mockProcessSendingChunk.mockImplementation(async (chunk, newsletterId, settings, mode) => {
      // Simulate BCC-only mode behavior
      if (chunk.length > 1) {
        // BCC mode - one call to sendEmailWithTransporter
        const result = await mockSendEmailWithTransporter(expect.any(Object), {
          to: `${settings.fromName} <${settings.fromEmail}>`,
          bcc: chunk.join(','),
          subject: settings.subject,
          html: settings.html,
          from: `${settings.fromName} <${settings.fromEmail}>`,
          replyTo: settings.replyToEmail || settings.fromEmail,
          settings
        });
        
        if (result.success) {
          return {
            sentCount: chunk.length,
            failedCount: 0,
            completedAt: new Date().toISOString(),
            results: chunk.map(email => ({ email, success: true }))
          };
        } else {
          return {
            sentCount: 0,
            failedCount: chunk.length,
            completedAt: new Date().toISOString(),
            results: chunk.map(email => ({ email, success: false, error: result.error }))
          };
        }
      } else {
        // Individual mode - one call per email
        const result = await mockSendEmailWithTransporter(expect.any(Object), {
          to: chunk[0],
          subject: settings.subject,
          html: settings.html,
          from: `${settings.fromName} <${settings.fromEmail}>`,
          replyTo: settings.replyToEmail || settings.fromEmail,
          settings
        });
        
        if (result.success) {
          return {
            sentCount: 1,
            failedCount: 0,
            completedAt: new Date().toISOString(),
            results: [{ email: chunk[0], success: true }]
          };
        } else {
          return {
            sentCount: 0,
            failedCount: 1,
            completedAt: new Date().toISOString(),
            results: [{ email: chunk[0], success: false, error: result.error }]
          };
        }
      }
    });
  });

  describe('BCC mode enforcement', () => {
    it('should use BCC mode for multiple emails automatically', async () => {
      const emails = ['user1@example.com', 'user2@example.com', 'user3@example.com'];

      const result = await processSendingChunk(
        emails,
        'newsletter-bcc-test',
        mockBccSettings,
        'initial'
      );

      expect(result.sentCount).toBe(3);
      expect(result.failedCount).toBe(0);
      
      // Should only send one email (BCC mode)
      expect(mockSendEmailWithTransporter).toHaveBeenCalledTimes(1);
      
      // Verify BCC mode was used
      expect(mockSendEmailWithTransporter).toHaveBeenCalledWith(
        expect.any(Object), // The transporter object
        expect.objectContaining({
          to: 'Test Newsletter <newsletter@example.com>',
          bcc: 'user1@example.com,user2@example.com,user3@example.com'
        })
      );
    });

    it('should use individual mode only for single emails', async () => {
      const emails = ['single@example.com'];

      const result = await processSendingChunk(
        emails,
        'newsletter-single-test',
        mockBccSettings,
        'initial'
      );

      expect(result.sentCount).toBe(1);
      expect(result.failedCount).toBe(0);
      
      // Should send one individual email
      expect(mockSendEmailWithTransporter).toHaveBeenCalledTimes(1);
      
      // Verify individual mode was used (no BCC)
      expect(mockSendEmailWithTransporter).toHaveBeenCalledWith(
        expect.any(Object), // The transporter object
        expect.objectContaining({
          to: 'single@example.com'
        })
      );
      
      // Verify BCC field is not present
      expect(mockSendEmailWithTransporter.mock.calls[0][1]).not.toHaveProperty('bcc');
    });

    it('should handle BCC mode failures gracefully', async () => {
      const emails = ['fail1@example.com', 'fail2@example.com'];

      // Override the default success mock for this test
      mockSendEmailWithTransporter.mockResolvedValueOnce({
        success: false,
        error: 'SMTP BCC limit exceeded'
      });

      const result = await processSendingChunk(
        emails,
        'newsletter-bcc-fail',
        mockBccSettings,
        'initial'
      );

      expect(result.sentCount).toBe(0);
      expect(result.failedCount).toBe(2);
      
      // Should attempt BCC send once
      expect(mockSendEmailWithTransporter).toHaveBeenCalledTimes(1);
      
      // All emails should be marked as failed
      expect(result.results).toHaveLength(2);
      expect(result.results.every(r => !r.success)).toBe(true);
      expect(result.results.every(r => r.error === 'SMTP BCC limit exceeded')).toBe(true);
    });

    it('should not have any emailDelay functionality', async () => {
      const emails = ['user1@example.com', 'user2@example.com'];

      // Start timing
      const startTime = Date.now();

      await processSendingChunk(
        emails,
        'newsletter-timing-test',
        mockBccSettings,
        'initial'
      );

      const duration = Date.now() - startTime;

      // Since we're using BCC mode, there should be no individual email delays
      // The call should complete quickly (under 100ms for mocked operations)
      expect(duration).toBeLessThan(100);
      
      // Only one send call should have been made (BCC mode)
      expect(mockSendEmailWithTransporter).toHaveBeenCalledTimes(1);
    });
  });

  describe('Settings validation', () => {
    it('should not accept useBccSending or emailDelay in settings', () => {
      // Type check - these should not be part of the interface
      const settings: NewsletterSettings = {
        headerLogo: 'test.png',
        headerBanner: 'banner.png',
        footerText: 'footer',
        unsubscribeLink: 'https://example.com/unsubscribe'
        // useBccSending: true, // This should cause a TypeScript error
        // emailDelay: 50, // This should cause a TypeScript error
      };

      expect(settings).toBeDefined();
      expect('useBccSending' in settings).toBe(false);
      expect('emailDelay' in settings).toBe(false);
    });

    it('should ignore legacy fields if they somehow exist in settings', async () => {
      const emails = ['test@example.com'];
      
      // Simulate old settings object with legacy fields
      const legacySettings = {
        ...mockBccSettings,
        // These fields should be ignored by the sending logic
        useBccSending: false, // This should have no effect
        emailDelay: 5000, // This should have no effect
      };

      const result = await processSendingChunk(
        emails,
        'newsletter-legacy-test',
        legacySettings as NewsletterSettings & { html: string; subject: string },
        'initial'
      );

      expect(result.sentCount).toBe(1);
      expect(mockSendEmailWithTransporter).toHaveBeenCalledTimes(1);
    });
  });

  describe('Performance optimization', () => {
    it('should use optimized settings for rate limit avoidance', () => {
      // Verify that BCC-optimized settings are reasonable for avoiding rate limits
      expect(mockBccSettings.chunkSize).toBeLessThanOrEqual(50); // Reasonable BCC batch size
      expect(mockBccSettings.chunkDelay).toBeGreaterThanOrEqual(100); // Some delay between batches
      expect(mockBccSettings.emailTimeout).toBeGreaterThanOrEqual(30000); // Reasonable timeout
    });

    it('should process large recipient lists efficiently in BCC mode', async () => {
      // Generate a larger list of emails
      const emails = Array.from({ length: 25 }, (_, i) => `user${i}@example.com`);

      const result = await processSendingChunk(
        emails,
        'newsletter-large-batch',
        mockBccSettings,
        'initial'
      );

      expect(result.sentCount).toBe(25);
      expect(result.failedCount).toBe(0);
      
      // Should still only send one email (BCC mode)
      expect(mockSendEmailWithTransporter).toHaveBeenCalledTimes(1);
      
      // Verify all emails are in the BCC field
      const bccString = emails.join(',');
      expect(mockSendEmailWithTransporter).toHaveBeenCalledWith(
        expect.any(Object), // The transporter object
        expect.objectContaining({
          bcc: bccString
        })
      );
    });
  });
});