# Newsletter API Refactoring Implementation Prompts

This document contains a series of prompts for implementing the newsletter API refactoring as outlined in the [Newsletter API Analysis](./newsletter-api-analysis.md) document. Each prompt builds on the previous work and should be implemented sequentially.

## Context Required

**Important**: Before implementing any of these prompts, review the [Newsletter API Analysis](./newsletter-api-analysis.md) document which contains:
- Existing infrastructure and utilities to leverage
- Patterns to follow for standardization
- Specific refactoring goals and constraints
- Details about the TO: field removal plan

## Prompt 1: Test Infrastructure Setup

```text
Context: I'm refactoring the newsletter API system following the patterns in docs/api/newsletter-api-analysis.md. The first step is setting up test infrastructure.

I need to set up the test infrastructure for refactoring the newsletter API system. Please help me:

1. Create test factories in src/tests/factories/:
   - newsletter.factory.ts with createMockNewsletter function
   - email.factory.ts with createMockEmailList function

2. Create test helpers in src/tests/helpers/:
   - newsletter.helpers.ts with mockNewsletterSettings and mockAuthenticatedRequest

3. Create Prisma mocks in src/tests/mocks/:
   - prisma.mock.ts with mockPrismaNewsletter object

4. Create the first test file src/tests/api/newsletter/settings.test.ts that:
   - Tests the GET endpoint for newsletter settings
   - Uses the mocks and helpers we created
   - Follows the pattern from existing tests in StatusReportsNewsletter.test.ts

Make sure all files use TypeScript and follow the existing test patterns in the codebase. The goal is to establish a foundation for test-driven refactoring.
```

## Prompt 2: Add Newsletter Error Types

```text
Context: I'm implementing newsletter API refactoring based on docs/api/newsletter-api-analysis.md. The analysis recommends extending AppError with newsletter-specific error types for consistent error handling.

I need to extend the error handling system with newsletter-specific error types. Please:

1. Update src/lib/errors.ts to add:
   - NewsletterNotFoundError class extending AppError
   - NewsletterValidationError class extending AppError
   - Helper function isNewsletterError to check if error is newsletter-related

2. Create tests in src/tests/lib/errors.test.ts for:
   - NewsletterNotFoundError creation and properties
   - NewsletterValidationError with details
   - Error type checking with isNewsletterError

3. Update the apiErrorResponse function to handle these new error types appropriately

Ensure the new error types follow the existing AppError pattern and include proper TypeScript types. These errors will be used throughout the refactored newsletter APIs.
```

## Prompt 3: Enhance Newsletter Service - Basic Methods

```text
Context: Following the newsletter refactoring plan in docs/api/newsletter-api-analysis.md, I need to enhance the newsletter service with missing CRUD methods rather than creating new services.

I need to enhance the newsletter service with basic CRUD methods. Please:

1. Update src/lib/newsletter-service.ts to add:
   - getNewsletterById(id: string) method that uses the new NewsletterNotFoundError
   - listNewsletters(params: { page?: number, limit?: number, status?: string }) method
   - Modify existing getNewsletterSettings to implement smart caching with invalidation as shown in the analysis doc
   - Modify existing updateNewsletterSettings to invalidate the cache immediately

2. Create comprehensive tests in src/tests/lib/newsletter-service.test.ts for:
   - getNewsletterById with success and not found cases
   - listNewsletters with pagination
   - Settings caching and immediate invalidation on update

3. Ensure all methods:
   - Use handleDatabaseError for error handling
   - Return proper TypeScript types
   - Follow existing patterns in the service

Use the existing newsletter-archive.ts patterns for pagination. The caching should ensure settings updates are reflected immediately.
```

## Prompt 4: Enhance Newsletter Service - CRUD Operations

```text
Context: Continuing the newsletter service enhancement from docs/api/newsletter-api-analysis.md. Building on the basic methods added previously.

I need to add full CRUD operations to the newsletter service. Please:

1. Update src/lib/newsletter-service.ts to add:
   - createNewsletter(data: { subject: string, introduction?: string }) method
   - updateNewsletter(id: string, data: Partial<NewsletterItem>) method  
   - deleteNewsletter(id: string) method

2. Add comprehensive tests in src/tests/lib/newsletter-service.test.ts for:
   - createNewsletter with validation
   - updateNewsletter with partial updates
   - deleteNewsletter with authorization checks

3. Ensure methods:
   - Use the NewsletterNotFoundError when appropriate
   - Validate input data using NewsletterValidationError
   - Log operations using the logger from src/lib/logger.ts
   - Use consistent patterns with other methods in the service

Follow the existing service patterns and use Prisma for database operations.
```

## Prompt 5: Standardize Settings API

```text
Context: Implementing API standardization from docs/api/newsletter-api-analysis.md. The goal is to use ApiHandler<T> type, consistent error handling, and structured logging across all newsletter APIs.

I need to standardize the newsletter settings API to use consistent patterns. Please:

1. Update src/app/api/admin/newsletter/settings/route.ts to:
   - Import and use ApiHandler<SimpleRouteContext> type from @/types/api-types
   - Use withAdminAuth wrapper consistently
   - Replace try-catch with proper error handling using apiErrorResponse and handleDatabaseError
   - Add structured logging with logger following the privacy-conscious pattern in the analysis
   - Use the enhanced newsletter service methods we created

2. Create comprehensive tests in src/tests/api/newsletter/settings.test.ts for:
   - GET endpoint returning settings
   - PUT endpoint updating settings and invalidating cache  
   - POST endpoint (if needed) or remove if redundant
   - Authentication requirements
   - Error handling scenarios

3. Ensure the API:
   - Returns consistent response formats
   - Uses handleDatabaseError for database errors
   - Follows the standardized pattern shown in section 3 of the analysis document

The API should maintain backward compatibility with the frontend.
```

## Prompt 6: Standardize Generate API and Remove Route

```text
Context: Following the API consolidation plan from docs/api/newsletter-api-analysis.md which identifies /route as redundant with /generate.

I need to standardize the generate API and remove the redundant route endpoint. Please:

1. Update src/app/api/admin/newsletter/generate/route.ts to:
   - Use ApiHandler<SimpleRouteContext> type
   - Implement consistent error handling with apiErrorResponse
   - Add structured logging following privacy-conscious patterns
   - Ensure it returns the created newsletter ID

2. Delete src/app/api/admin/newsletter/route.ts (the redundant endpoint)

3. Create tests in src/tests/api/newsletter/generate.test.ts for:
   - Successful newsletter generation with appointments and status reports
   - Generation with missing introduction text
   - Authentication requirements
   - Database error handling

4. Update any frontend code that might be using the old /route endpoint to use /generate instead

Follow the standardized pattern from the settings API we just updated.
```

## Prompt 7: Consolidate Sending Logic

```text
Context: Implementing the sending logic consolidation from docs/api/newsletter-api-analysis.md to eliminate code duplication between send-chunk and retry-chunk.

I need to consolidate the email sending logic that's duplicated between send-chunk and retry-chunk. Please:

1. Update src/lib/newsletter-sending.ts to add:
   - processSendingChunk(chunk: string[], newsletterId: string, settings: NewsletterSettings, mode: 'initial' | 'retry' = 'initial') method
   - This should contain the common BCC sending logic
   - Include email cleaning, validation, and transporter management from email.ts
   - Return a ChunkResult object as defined in src/types/api-types.ts

2. Update src/app/api/admin/newsletter/send-chunk/route.ts to:
   - Use the new processSendingChunk method
   - Remove duplicated sending logic (keep only API-specific concerns)
   - Maintain the existing response format for frontend compatibility

3. Create tests in src/tests/lib/newsletter-sending.test.ts for:
   - processSendingChunk with successful sending
   - Handling SMTP failures and retries
   - Email validation and cleaning
   - Privacy-conscious logging (no full email addresses in logs)

Ensure the consolidated logic maintains all existing functionality including logging patterns from the analysis document.
```

## Prompt 8: Remove TO Field Sending - Database Migration

```text
Context: Starting the TO: field removal process outlined in docs/api/newsletter-api-analysis.md section "TO: Field Email Sending Removal".

I need to create a database migration to remove the individual TO: field sending mode. Please:

1. Create a new Prisma migration that:
   - Removes the useBccSending column from the Newsletter table
   - Removes the emailDelay column from the Newsletter table
   - Run: npx prisma migrate dev --name remove-individual-sending-mode

2. Update src/lib/newsletter-template.ts:
   - Remove useBccSending from NewsletterSettings interface
   - Remove emailDelay from NewsletterSettings interface
   - Update getDefaultNewsletterSettings() to remove these fields

3. Update any TypeScript interfaces that reference these fields

4. Create a test to ensure the migration works correctly and old code doesn't break

This is the first step in removing the TO: field sending mode completely. The goal is to simplify to BCC-only mode.
```

## Prompt 9: Remove TO Field Sending - Code Cleanup

```text
Context: Completing the TO: field removal from docs/api/newsletter-api-analysis.md. This removes all individual sending code, keeping only BCC mode.

I need to remove all code related to individual TO: field sending. Please:

1. Update src/app/api/admin/newsletter/send-chunk/route.ts:
   - Remove the entire individual sending block (lines 272-372 as noted in the analysis)
   - Remove the conditional check for useBccSending
   - Keep only the BCC sending logic (lines 150-271)
   - Remove any emailDelay handling

2. Update src/app/admin/newsletter/settings/page.tsx:
   - Remove the toggle switch UI for BCC mode (lines 253-262)
   - Remove the related state management
   - Keep the explanation that emails are sent in BCC mode
   - Remove any emailDelay input fields

3. Update src/app/api/admin/newsletter/retry-chunk/route.ts:
   - Remove any comments about "always using BCC"
   - Clean up any code that checks for useBccSending

4. Create/update tests to ensure BCC-only mode works correctly

All newsletters should now only use BCC sending mode to avoid rate limiting issues.
```

## Prompt 10: Standardize Remaining APIs

```text
Context: Completing the API standardization from docs/api/newsletter-api-analysis.md for all remaining newsletter endpoints.

I need to standardize all remaining newsletter APIs to use consistent patterns. Please update these APIs:

1. src/app/api/admin/newsletter/validate/route.ts
2. src/app/api/admin/newsletter/send-test/route.ts  
3. src/app/api/admin/newsletter/appointments/route.ts
4. src/app/api/admin/newsletter/status-reports/route.ts

For each API:
- Use ApiHandler<SimpleRouteContext> or ApiHandler<IdRouteContext> as appropriate
- Implement consistent error handling with apiErrorResponse
- Add structured logging with proper context (following privacy patterns)
- Use service methods instead of direct database queries where possible

Also create tests for each API in src/tests/api/newsletter/:
- validate.test.ts
- send-test.test.ts
- appointments.test.ts
- status-reports.test.ts

Each test should cover authentication, success cases, and error scenarios following our established patterns.
```

## Prompt 11: Complete Integration Testing

```text
Context: Final phase of the newsletter refactoring from docs/api/newsletter-api-analysis.md. Need to ensure everything works together correctly.

I need to create comprehensive integration tests for the newsletter system. Please:

1. Create src/tests/integration/newsletter-workflow.test.ts that tests:
   - Complete newsletter creation, generation, and sending flow
   - Error recovery when sending fails
   - Retry mechanism for failed chunks
   - Settings changes affecting newsletter generation
   - BCC-only sending mode

2. Create src/tests/integration/newsletter-archive.test.ts that tests:
   - Creating and archiving newsletters
   - Searching and pagination
   - Viewing failed recipients through the UI button added earlier

3. Update docs/api/newsletter-api-analysis.md:
   - Mark completed refactoring items with checkmarks
   - Add any new findings or patterns discovered during implementation
   - Update the migration status section

4. Run all tests and create a coverage report showing we've achieved our coverage goals (80% minimum for services, 100% for API routes)

Ensure all integration tests use realistic scenarios and test the actual user workflows with the refactored system.
```

## Implementation Notes

- Each prompt builds on the previous work
- Maintain backward compatibility with the frontend
- Use consistent error handling and logging patterns
- Ensure comprehensive test coverage
- Follow TypeScript best practices
- Keep the frontend-based sending mechanism intact
- Focus on code reuse over creating new abstractions

The implementation should result in a cleaner, more maintainable newsletter system that leverages existing infrastructure while removing redundancies and inconsistencies.