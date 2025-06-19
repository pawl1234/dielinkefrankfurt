# Newsletter API Test Plan

## Overview

This document outlines the missing tests for the newsletter API system and provides a structured plan for implementing comprehensive test coverage.

## Existing Test Coverage

### Already Tested:
1. **StatusReportsNewsletter.test.ts**
   - ✅ Newsletter HTML template generation
   - ✅ Status report filtering (last 2 weeks)
   - ✅ Text truncation utility
   - ✅ Active group filtering

2. **email-notifications.test.ts**
   - ✅ General email sending functionality
   - ✅ Email notification templates
   - ✅ Error handling for email failures

## Missing Tests - High Priority

### 1. Newsletter API Route Tests

#### `/api/admin/newsletter/generate/route.ts`
```typescript
describe('POST /api/admin/newsletter/generate', () => {
  it('should generate a new newsletter with appointments and status reports')
  it('should handle missing introduction text')
  it('should require admin authentication')
  it('should handle database errors gracefully')
})
```

#### `/api/admin/newsletter/send/route.ts`
```typescript
describe('POST /api/admin/newsletter/send', () => {
  it('should validate recipient list')
  it('should create email chunks based on settings')
  it('should update newsletter status to "sending"')
  it('should handle invalid email addresses')
  it('should require admin authentication')
})
```

#### `/api/admin/newsletter/send-chunk/route.ts`
```typescript
describe('POST /api/admin/newsletter/send-chunk', () => {
  it('should send emails in BCC mode')
  it('should handle SMTP connection failures')
  it('should retry failed connections')
  it('should update chunk results in database')
  it('should handle partial chunk failures')
  it('should clean Excel-formatted emails')
})
```

#### `/api/admin/newsletter/retry-chunk/route.ts`
```typescript
describe('POST /api/admin/newsletter/retry-chunk', () => {
  it('should retry failed emails with smaller chunks')
  it('should use BCC mode for retries')
  it('should handle progressive chunk size reduction')
  it('should update retry results in database')
  it('should handle complete retry failures')
})
```

#### `/api/admin/newsletter/validate/route.ts`
```typescript
describe('POST /api/admin/newsletter/validate', () => {
  it('should validate email format')
  it('should identify duplicate emails')
  it('should clean Excel-formatted emails')
  it('should return validation statistics')
  it('should handle empty recipient lists')
})
```

### 2. Newsletter Service Tests

#### `newsletter-service.ts`
```typescript
describe('NewsletterService', () => {
  describe('getNewsletterSettings', () => {
    it('should return existing settings from database')
    it('should create default settings if none exist')
    it('should handle cache invalidation')
  })

  describe('updateNewsletterSettings', () => {
    it('should update settings in database')
    it('should invalidate cache after update')
    it('should validate settings before saving')
  })

  describe('fetchNewsletterAppointments', () => {
    it('should fetch featured appointments first')
    it('should fetch upcoming appointments')
    it('should filter by date range')
  })

  describe('generateNewsletter', () => {
    it('should combine appointments and status reports')
    it('should fix URLs in generated HTML')
    it('should handle empty content sections')
  })
})
```

#### `newsletter-sending.ts`
```typescript
describe('NewsletterSending', () => {
  describe('processRecipientList', () => {
    it('should validate and hash email addresses')
    it('should identify new vs existing recipients')
    it('should handle invalid email formats')
    it('should remove duplicates')
  })

  describe('getNewsletterStatus', () => {
    it('should calculate send progress')
    it('should identify failed chunks')
    it('should return retry status')
  })
})
```

#### `newsletter-archive.ts`
```typescript
describe('NewsletterArchive', () => {
  describe('archiveNewsletter', () => {
    it('should save newsletter to database')
    it('should preserve all newsletter data')
  })

  describe('listSentNewsletters', () => {
    it('should support pagination')
    it('should support search by subject')
    it('should filter by status')
    it('should sort by date')
  })

  describe('deleteNewsletter', () => {
    it('should require admin authentication')
    it('should soft delete newsletters')
    it('should log deletion events')
  })
})
```

### 3. Draft Management Tests

#### `/api/admin/newsletter/drafts/route.ts`
```typescript
describe('Newsletter Drafts API', () => {
  it('GET should list all drafts ordered by date')
  it('POST should create new draft with subject')
  it('should require admin authentication for all operations')
})
```

#### `/api/admin/newsletter/drafts/[id]/route.ts`
```typescript
describe('Newsletter Draft Operations', () => {
  it('GET should return specific draft by ID')
  it('PUT should update draft content and metadata')
  it('DELETE should remove draft from database')
  it('should handle non-existent draft IDs')
})
```

### 4. Settings Management Tests

#### `/api/admin/newsletter/settings/route.ts`
```typescript
describe('Newsletter Settings API', () => {
  it('GET should return current settings')
  it('PUT should update settings and invalidate cache')
  it('should validate email settings')
  it('should handle missing settings gracefully')
})
```

### 5. Recovery and Status Tests

#### `/api/admin/newsletter/recover/route.ts`
```typescript
describe('Newsletter Recovery API', () => {
  it('GET should return available recovery options')
  it('POST should reset stuck newsletters')
  it('POST should mark incomplete sends as complete')
  it('POST should reset to draft status')
})
```

#### `/api/admin/newsletter/send-status/[id]/route.ts`
```typescript
describe('Newsletter Send Status API', () => {
  it('should return detailed send progress')
  it('should calculate completion percentage')
  it('should identify failed chunks')
  it('should return retry information')
})
```

## Testing Utilities to Create

### 1. Mock Factories
```typescript
// src/tests/factories/newsletter.factory.ts
export const createMockNewsletter = (overrides = {}) => ({
  id: 'test-newsletter-id',
  subject: 'Test Newsletter',
  content: '<html>...</html>',
  status: 'draft',
  settings: {},
  ...overrides
});

// src/tests/factories/email.factory.ts
export const createMockEmailList = (count: number) => {
  return Array.from({ length: count }, (_, i) => `test${i}@example.com`);
};
```

### 2. Test Helpers
```typescript
// src/tests/helpers/newsletter.helpers.ts
export const mockNewsletterSettings = {
  chunkSize: 50,
  useBccSending: true,
  emailDelay: 100,
  // ... other settings
};

export const mockAuthenticatedRequest = (body = {}) => {
  return new Request('http://localhost:3000/api/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
};
```

### 3. Database Mocks
```typescript
// src/tests/mocks/prisma.mock.ts
export const mockPrismaNewsletter = {
  newsletterItem: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  newsletter: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};
```

## Testing Patterns to Follow

### 1. API Route Tests
```typescript
import { GET, POST } from '@/app/api/admin/newsletter/[endpoint]/route';
import { withAdminAuth } from '@/lib/api-auth';

jest.mock('@/lib/api-auth');
jest.mock('@/lib/prisma');

describe('Newsletter API Endpoint', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should require authentication', async () => {
    const mockRequest = new Request('http://localhost:3000/api/test');
    await GET(mockRequest);
    expect(withAdminAuth).toHaveBeenCalled();
  });

  it('should handle successful request', async () => {
    // Test implementation
  });

  it('should handle errors gracefully', async () => {
    // Test error scenarios
  });
});
```

### 2. Service Tests
```typescript
import { service } from '@/lib/newsletter-service';
import prisma from '@/lib/prisma';

jest.mock('@/lib/prisma');

describe('Newsletter Service', () => {
  it('should perform expected operation', async () => {
    prisma.newsletterItem.findMany.mockResolvedValue([]);
    const result = await service.method();
    expect(result).toBeDefined();
  });
});
```

## Test Execution Priority

### Phase 1: Core Functionality (Week 1)
1. Newsletter generation API tests
2. Send and send-chunk API tests
3. Newsletter service core methods

### Phase 2: Data Management (Week 2)
4. Draft management tests
5. Archive management tests
6. Settings management tests

### Phase 3: Advanced Features (Week 3)
7. Retry and recovery tests
8. Validation tests
9. Status tracking tests

### Phase 4: Integration Tests (Week 4)
10. End-to-end newsletter workflow
11. Error recovery scenarios
12. Performance tests for large recipient lists

## Coverage Goals

- **Unit Test Coverage**: 80% minimum for all services
- **API Route Coverage**: 100% for all endpoints
- **Integration Coverage**: Key workflows tested end-to-end
- **Error Scenarios**: All error paths tested

## Running Tests

```bash
# Run all tests
npm test

# Run newsletter tests only
npm test -- newsletter

# Run with coverage
npm test -- --coverage

# Watch mode for development
npm test -- --watch
```

## Notes

1. **Reuse Existing Patterns**: Follow the patterns established in `StatusReportsNewsletter.test.ts` and `email-notifications.test.ts`
2. **Mock External Dependencies**: Always mock Prisma, email services, and external APIs
3. **Test Both Success and Failure**: Each test should cover happy path and error scenarios
4. **Use Realistic Test Data**: Create test data that mirrors production scenarios
5. **Avoid Testing Implementation Details**: Focus on behavior and outcomes