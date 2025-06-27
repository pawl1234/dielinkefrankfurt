import { Newsletter } from '@prisma/client';
import { subDays } from 'date-fns';

export function createMockNewsletter(overrides?: Partial<Newsletter>): Newsletter {
  const now = new Date();
  
  return {
    id: 'newsletter-123',
    title: 'Newsletter Test',
    content: '<h1>Test Newsletter</h1><p>This is test content</p>',
    createdAt: subDays(now, 7),
    updatedAt: subDays(now, 7),
    sentAt: null,
    settings: JSON.stringify({
      headerLogo: '/images/logo.png',
      headerBanner: '/images/banner.png',
      footerText: 'Dies ist der Footer-Text für den Newsletter',
      testEmailRecipients: ['test@example.com'],
      recipientLists: ['list1', 'list2'],
      unsubscribeLink: 'https://example.com/unsubscribe',
      chunkSize: 50,
      chunkDelayMs: 1000,
      chunkResults: [],
      totalRecipients: 0,
      successfulSends: 0,
      failedSends: 0,
      sendingStartedAt: null,
      sendingCompletedAt: null,
      statusReportIds: []
    }),
    ...overrides
  };
}

export function createMockNewsletterWithSendingData(overrides?: Partial<Newsletter>): Newsletter {
  const now = new Date();
  const sentAt = subDays(now, 1);
  
  return createMockNewsletter({
    sentAt,
    settings: JSON.stringify({
      headerLogo: '/images/logo.png',
      headerBanner: '/images/banner.png',
      footerText: 'Dies ist der Footer-Text für den Newsletter',
      testEmailRecipients: ['test@example.com'],
      recipientLists: ['list1', 'list2'],
      unsubscribeLink: 'https://example.com/unsubscribe',
      chunkSize: 50,
      chunkDelayMs: 1000,
      chunkResults: [
        {
          chunkNumber: 0,
          startedAt: sentAt.toISOString(),
          completedAt: new Date(sentAt.getTime() + 2000).toISOString(),
          success: true,
          error: null,
          results: [
            { email: 'success1@example.com', success: true, error: null },
            { email: 'success2@example.com', success: true, error: null },
            { email: 'failed@example.com', success: false, error: 'Failed to send' }
          ]
        }
      ],
      totalRecipients: 3,
      successfulSends: 2,
      failedSends: 1,
      sendingStartedAt: sentAt.toISOString(),
      sendingCompletedAt: new Date(sentAt.getTime() + 2000).toISOString(),
      statusReportIds: ['report-1', 'report-2']
    }),
    ...overrides
  });
}

export function createMockNewsletterSettings(overrides?: Partial<Record<string, unknown>>) {
  return {
    headerLogo: '/images/logo.png',
    headerBanner: '/images/banner.png',
    footerText: 'Dies ist der Footer-Text für den Newsletter',
    testEmailRecipients: ['test@example.com'],
    unsubscribeLink: 'https://example.com/unsubscribe',
    chunkSize: 50,
    chunkDelayMs: 1000,
    // Include id, createdAt, updatedAt to match service return type
    id: 'settings-123',
    createdAt: new Date('2025-06-26T06:37:57.935Z'),
    updatedAt: new Date('2025-06-26T06:37:57.935Z'),
    ...overrides
  };
}

export function createMockChunkResult(overrides?: Partial<Record<string, unknown>>) {
  return {
    chunkNumber: 0,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    success: true,
    error: null,
    results: [
      { email: 'test1@example.com', success: true, error: null },
      { email: 'test2@example.com', success: true, error: null }
    ],
    ...overrides
  };
}