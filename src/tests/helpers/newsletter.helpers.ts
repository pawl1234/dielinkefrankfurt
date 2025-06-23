import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export function mockNewsletterSettings(overrides?: Partial<Record<string, unknown>>) {
  return {
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
    statusReportIds: [],
    ...overrides
  };
}

export function mockAuthenticatedRequest(
  url: string,
  method: string = 'GET',
  body?: unknown
): NextRequest {
  const request = new NextRequest(new URL(url, 'http://localhost:3000'), {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  // Mock the authentication by setting up getToken to return an admin user
  (getToken as jest.Mock).mockResolvedValue({
    role: 'admin',
    name: 'Admin User',
    email: 'admin@example.com'
  });

  return request;
}

export function mockUnauthenticatedRequest(
  url: string,
  method: string = 'GET',
  body?: unknown
): NextRequest {
  const request = new NextRequest(new URL(url, 'http://localhost:3000'), {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  // Mock no authentication
  (getToken as jest.Mock).mockResolvedValue(null);

  return request;
}

export function expectNewsletterResponse(response: Response, expectedStatus: number = 200) {
  expect(response.status).toBe(expectedStatus);
  expect(response.headers.get('content-type')).toContain('application/json');
}

export async function parseNewsletterResponse<T = unknown>(response: Response): Promise<T> {
  const text = await response.text();
  return JSON.parse(text);
}

export function createMockEmailChunk(startIndex: number, size: number): string[] {
  const emails: string[] = [];
  for (let i = startIndex; i < startIndex + size; i++) {
    emails.push(`recipient${i}@example.com`);
  }
  return emails;
}

export function mockSendingProgress(
  totalRecipients: number,
  successfulSends: number,
  failedSends: number = 0
) {
  return {
    totalRecipients,
    successfulSends,
    failedSends,
    progress: Math.round((successfulSends + failedSends) / totalRecipients * 100),
    isComplete: successfulSends + failedSends === totalRecipients
  };
}