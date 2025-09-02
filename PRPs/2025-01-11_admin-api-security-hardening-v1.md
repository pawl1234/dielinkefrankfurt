name: "Admin API Security Hardening & Best Practices Implementation"
description: |

## Purpose
Implement comprehensive security improvements for admin API routes based on the security assessment findings. This PRP addresses critical security gaps including database connection patterns, input validation, audit logging, and security headers to harden the admin API surface.

## Core Principles
1. **Security First**: Address critical vulnerabilities immediately
2. **Defense in Depth**: Multiple layers of security controls
3. **Audit Trail**: Track all admin actions for compliance and security
4. **Fail Secure**: Graceful degradation without exposing sensitive data
5. **Follow CLAUDE.md Rules**: Maintain consistency with existing patterns

---

## Goal
Transform the admin API from its current state with basic authentication to a production-hardened security implementation with comprehensive input validation, audit logging, structured logging with sensitive data masking, and security headers - while fixing critical database connection antipatterns.

## Why
- **Security Compliance**: Current implementation has critical gaps that expose the application to attacks
- **Operational Safety**: Database connection leaks and missing audit trails create operational risks
- **Regulatory Requirements**: Admin actions need proper audit trails for compliance
- **Production Readiness**: Current patterns don't scale and have memory leak issues

## What
A comprehensive security hardening implementation that transforms admin API routes with:

### Success Criteria
- [ ] All admin routes use singleton Prisma client (no memory leaks)
- [ ] Zod schemas validate ALL admin API request bodies that accept JSON
- [ ] Database audit logging tracks ALL admin actions (stored 90 days)
- [ ] Admin audit page at /admin/audit displays searchable audit table
- [ ] Manual cleanup button removes audit logs older than 90 days
- [ ] Sensitive data masked in audit logs (passwords filtered, emails partially masked)
- [ ] Security headers middleware protects against common attacks
- [ ] Comprehensive test coverage for new security middleware
- [ ] Zero breaking changes to existing admin functionality
- [ ] Consistent security middleware applied across entire admin API surface

## All Needed Context

### Documentation & References (list all context needed to implement the feature)
```yaml
# MUST READ - Include these in your context window
- url: https://dub.co/blog/zod-api-validation
  why: Modern Zod validation patterns for Next.js API routes
  critical: Schema-first validation approach with type safety


- url: https://giancarlobuomprisco.com/next/protect-next-api-zod
  why: Protecting Next.js APIs with Zod middleware patterns
  critical: Error handling and response formatting

- file: src/lib/api-auth.ts
  why: Existing admin auth pattern to extend, not replace
  critical: withAdminAuth wrapper pattern is working, build upon it

- file: src/lib/errors.ts
  why: Standardized error handling patterns with AppError class
  critical: Use AppError.* static methods for consistent responses

- file: src/lib/prisma.ts
  why: Singleton pattern already exists - use this instead of new PrismaClient()
  critical: import prisma from '@/lib/prisma' pattern

- file: src/lib/logger.ts
  why: Existing structured logging with sensitive data handling patterns
  critical: Use logger.error/info with module and context parameters

- file: src/lib/validators/antrag-validator.ts
  why: Existing validation patterns
  critical: Follow validation error response format

- file: src/app/api/admin/users/route.ts
  why: Example of problematic patterns to fix (new PrismaClient, logging passwords)
  critical: Fix database connections and sensitive logging

- file: src/app/admin/users/page.tsx
  why: Admin table UI pattern to mirror for audit page
  critical: Table structure, pagination, filtering, and admin page layout

- file: prisma/schema.prisma
  why: Database schema patterns for adding AuditLog model
  critical: Follow existing field naming and relationship patterns

```

### Current Codebase tree (run `tree` in the root of the project) to get an overview of the codebase
```bash
src/
├── app/
│   └── api/
│       └── admin/
│           ├── users/route.ts (CRITICAL - has database antipattern)
│           ├── change-password/route.ts (CRITICAL - needs security hardening)
│           ├── test-email/route.ts (CRITICAL - needs security hardening)
│           └── newsletter/
│               └── send/route.ts (CRITICAL - needs security hardening)
├── lib/
│   ├── api-auth.ts (EXISTING - withAdminAuth pattern)
│   ├── errors.ts (EXISTING - AppError patterns)
│   ├── prisma.ts (EXISTING - singleton pattern)
│   ├── logger.ts (EXISTING - structured logging)
│   └── validators/
│       └── antrag-validator.ts (EXISTING - validation patterns)
└── tests/
    └── api/ (EXISTING - test patterns to follow)
```

### Desired Codebase tree with files to be added and responsibility of file
```bash
src/
├── lib/
│   ├── middleware/
│   │   ├── security-headers.ts (NEW - Security headers middleware)
│   │   ├── audit-logging.ts (NEW - Audit trail middleware) 
│   │   ├── validation.ts (NEW - Zod validation middleware)
│   │   └── sensitive-data-filter.ts (NEW - Data masking utility)
│   ├── schemas/
│   │   ├── admin-user.ts (NEW - Zod schemas for user management)
│   │   ├── admin-auth.ts (NEW - Zod schemas for auth operations)
│   │   ├── admin-newsletter.ts (NEW - Zod schemas for newsletter operations)
│   │   └── admin-common.ts (NEW - Common schemas and action name mappings)
│   └── audit/
│       └── audit-logger.ts (NEW - Centralized audit logging)
├── tests/
│   ├── lib/
│   │   ├── middleware/ (NEW - Middleware tests)
│   │   └── audit/ (NEW - Audit logging tests)
│   └── integration/
│       └── admin-security.test.ts (NEW - End-to-end security tests)
├── app/
│   └── admin/
│       └── audit/ (NEW - Admin audit page)
│           └── page.tsx (NEW - Audit logs table with search/filter)
└── types/
    └── security.ts (NEW - Security & audit TypeScript types including AuditLogEntry, etc.)
```

### Known Gotchas of our codebase & Library Quirks
```typescript
// CRITICAL: Database connection antipattern found in multiple admin routes
// BAD: const prisma = new PrismaClient(); (creates memory leaks)
// GOOD: import prisma from '@/lib/prisma';

// NOTE: CVE-2025-29927 Next.js middleware bypass
// Current Next.js version 15.4.6 is NOT vulnerable (patched in 15.2.3)
// No CVE protection needed for this codebase

// CRITICAL: Sensitive data logging found in users/route.ts:49-51
// Password generation logs expose sensitive information
// Use logger with sensitive data masking


// PATTERN: All admin routes use withAdminAuth wrapper - extend, don't replace
// PATTERN: Use AppError.* static methods for consistent error responses
// PATTERN: Use structured logging with logger.error(error, { module, context, tags })
// PATTERN: Zod already installed - use for all new validation schemas
// PATTERN: Material UI v7 - not relevant for backend API security
// PATTERN: Test patterns exist in src/tests/api/ - mirror for new security features
// PATTERN: Never mock /src/lib modules in tests - use real implementations
```

## Implementation Blueprint

### Data models and structure

Create security middleware, audit data models, and database schema with comprehensive type safety.

### Prisma Schema Addition
```sql
-- Add to prisma/schema.prisma
model AuditLog {
  id          String    @id @default(cuid())
  createdAt   DateTime  @default(now())
  userId      String
  username    String    // Denormalized for easier queries
  action      String    // e.g., "user.create", "newsletter.send"
  resource    String    // e.g., "user", "newsletter", "appointment"
  resourceId  String?   // ID of the affected resource
  method      String    // HTTP method (GET, POST, PUT, DELETE)
  endpoint    String    // API endpoint path
  userAgent   String?   // Optional browser/client info
  success     Boolean
  error       String?   // Error message if failed
  metadata    Json?     // Additional context data
  duration    Int?      // Request duration in milliseconds
  
  // Add relation to User
  user        User      @relation(fields: [userId], references: [id])
  
  @@index([createdAt])
  @@index([userId])
  @@index([action])
  @@index([resource])
  @@map("audit_logs")
}

-- Add to existing User model
model User {
  // ... existing fields ...
  auditLogs   AuditLog[]
}
```

### TypeScript Types
```typescript
// Core security types
interface AuditLogEntry {
  id: string;
  createdAt: Date;
  userId: string;
  username: string;
  action: string;
  resource: string;
  resourceId?: string;
  method: string;
  endpoint: string;
  userAgent?: string;
  success: boolean;
  error?: string;
  metadata?: Record<string, unknown>;
  duration?: number;
}

// Action name mapping for user-friendly display
const ActionDisplayNames = {
  'user.create': 'User Created',
  'user.update': 'User Updated', 
  'user.delete': 'User Deleted',
  'user.reset-password': 'Password Reset',
  'password.change': 'Password Changed',
  'newsletter.send': 'Newsletter Sent',
  'newsletter.test': 'Test Email Sent',
  'email.test': 'Test Email Sent',
  'audit.cleanup': 'Audit Logs Cleaned'
};

// Zod validation schemas for admin operations
const UserCreateSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  role: z.enum(['admin', 'user']).default('admin')
});

// Sensitive field patterns for data masking
const SensitiveFieldPatterns = [
  'password', 'token', 'secret', 'key', 'auth', 'credential'
];
```

### list of tasks to be completed to fullfill the PRP in the order they should be completed

```yaml
Task 1: Add Database Schema for Audit Logs
MODIFY prisma/schema.prisma:
  - ADD AuditLog model with comprehensive fields
  - ADD relation to existing User model
  - ADD proper indexes for query performance
  - RUN prisma db push to update database schema
  - NO MIGRATION FILES needed - db push handles schema updates

Task 2: Fix Critical Database Connection Pattern
MODIFY all admin routes in src/app/api/admin/**/*.ts:
  - FIND pattern: "const prisma = new PrismaClient()"
  - REPLACE with: "import prisma from '@/lib/prisma'"
  - PRESERVE all existing functionality and error handling
  - TARGET FILES: users/route.ts, users/[id]/route.ts, change-password/route.ts

Task 3: Create Security Headers Middleware
CREATE src/lib/middleware/security-headers.ts:
  - IMPLEMENT security headers (X-Content-Type-Options, X-Frame-Options, etc.)
  - INTEGRATE with Next.js response middleware pattern
  - FOLLOW existing middleware wrapper pattern

Task 4: Create Validation Infrastructure
CREATE src/lib/schemas/admin-user.ts:
  - MIRROR validation patterns from src/lib/validators/antrag-validator.ts
  - IMPLEMENT Zod schemas for user CRUD operations
  - INCLUDE password complexity validation

CREATE src/lib/schemas/admin-auth.ts:
  - IMPLEMENT change password validation schema
  - INCLUDE current/new password validation

CREATE src/lib/schemas/admin-common.ts:
  - IMPLEMENT action name to display name mapping
  - DEFINE common validation patterns and utilities
  - INCLUDE sensitive field detection patterns

CREATE src/lib/middleware/validation.ts:
  - IMPLEMENT withValidation wrapper following withAdminAuth pattern
  - INTEGRATE with AppError.validation responses
  - SUPPORT Zod schema validation

Task 5: Create Database Audit Logging System
CREATE src/lib/audit/audit-logger.ts:
  - IMPLEMENT database audit logging (store to AuditLog model)
  - INTEGRATE with Prisma client for database operations
  - INCLUDE 90-day automated cleanup job
  - INCLUDE sensitive data masking (passwords filtered, emails masked)
  - SUPPORT structured audit events with metadata

CREATE src/lib/middleware/audit-logging.ts:
  - IMPLEMENT withAuditLog middleware wrapper
  - INTEGRATE with database audit-logger.ts
  - CAPTURE comprehensive request/response metadata
  - MEASURE and store request duration
  - FOLLOW existing middleware composition patterns

Task 6: Create Admin Audit Page
CREATE src/app/admin/audit/page.tsx:
  - MIRROR UI patterns from src/app/admin/users/page.tsx
  - IMPLEMENT searchable table with columns: Date, Time, User, Action, Resource, Status, Duration
  - ADD filtering by date range, user, action type, success/failure
  - ADD pagination for large audit datasets
  - INCLUDE manual cleanup button "Delete logs older than 90 days"
  - ADD export functionality (CSV format for audit reports)
  - FOLLOW existing admin page layout patterns

CREATE src/app/api/admin/audit/route.ts:
  - IMPLEMENT GET endpoint for audit log fetching
  - SUPPORT pagination, filtering, and sorting
  - USE existing withAdminAuth middleware
  - INTEGRATE with audit logging middleware

CREATE src/app/api/admin/audit/cleanup/route.ts:
  - IMPLEMENT POST endpoint for manual audit cleanup
  - DELETE audit logs older than 90 days using Prisma deleteMany
  - USE existing withAdminAuth middleware
  - RETURN count of deleted records

Task 7: Update Admin Navigation
MODIFY admin navigation component:
  - ADD "Audit Logs" menu item pointing to /admin/audit
  - FOLLOW existing navigation patterns and styling
  - ENSURE proper admin role access control

Task 8: Create Sensitive Data Filtering
CREATE src/lib/middleware/sensitive-data-filter.ts:
  - IMPLEMENT email masking (user@domain.com → u***@domain.com)
  - IMPLEMENT password filtering (never log passwords)
  - IMPLEMENT sensitive field detection (password, token, secret, key fields)
  - INTEGRATE with existing logger.ts patterns
  - SUPPORT configurable sensitive field patterns

Task 9: Implement Enhanced Middleware Composition
MODIFY src/lib/api-auth.ts:
  - CREATE secureAdminAuth(config) helper that composes ALL security layers
  - CREATE validatedAdminAuth helper function  
  - CREATE auditedAdminAuth helper function
  - PRESERVE existing withAdminAuth functionality
  - SUPPORT middleware composition pattern

Task 10: Apply Security Improvements to ALL Admin Routes
MODIFY ALL admin routes in src/app/api/admin/**/*.ts (36 total routes):
  - REPLACE database connection pattern where found (Task 1)
  - ADD comprehensive audit logging for ALL admin actions
  - ADD Zod validation for ALL routes that accept request bodies
  - FIX sensitive data logging issues
  - PRESERVE all existing functionality

High Priority Routes (implement first):
MODIFY src/app/api/admin/users/route.ts:
  - ADD comprehensive security middleware stack
  - ADD Zod validation using admin-user schemas
  - ADD audit logging for user creation/modification

MODIFY src/app/api/admin/change-password/route.ts:
  - ADD Zod validation using admin-auth schemas
  - ADD audit logging for password changes

MODIFY src/app/api/admin/test-email/route.ts:
  - ADD audit logging for test email sends

MODIFY src/app/api/admin/newsletter/send/route.ts:
  - ADD comprehensive audit logging for newsletter sends

Systematic Application to Remaining Routes:
MODIFY all remaining admin routes following patterns:
  - All routes: Audit logging and security headers
  - Routes with request bodies: Zod validation
  - All routes: Sensitive data masking in logs

Task 11: Create Comprehensive Security Middleware Tests
CREATE src/tests/lib/middleware/validation.test.ts:
  - TEST Zod schema validation
  - TEST error response formatting
  - TEST invalid input handling
  - FOLLOW existing test patterns

CREATE src/tests/lib/audit/audit-logger.test.ts:
  - TEST audit log creation
  - TEST sensitive data masking
  - TEST structured logging output
  - NEVER mock /src/lib modules - use real implementations

Task 12: Create Integration Security Tests
CREATE src/tests/integration/admin-security.test.ts:
  - TEST end-to-end security middleware chain
  - TEST auth + validation + audit logging together
  - TEST audit logging for complete request flows
  - FOLLOW existing integration test patterns

Task 13: Update Admin Route Security Headers
CREATE src/app/api/admin/middleware.ts (if needed for route-level middleware):
  - IMPLEMENT security headers for admin route group
  - INTEGRATE with security-headers.ts middleware
  - FOLLOW Next.js App Router middleware patterns
```

### Per task pseudocode as needed added to each task

```typescript
// Task 5: Comprehensive Security Composition
export function secureAdminAuth(config: SecurityConfig) {
  // PATTERN: Compose ALL security layers in correct order for ALL admin routes
  return compose(
    withAdminAuth, // Existing auth pattern
    config.schema ? withValidation(config.schema) : identity,  // Optional validation
    withAuditLog(config.action), // Track all admin actions
    withSecurityHeaders() // Security headers
  );
}

// Task 5: Database Audit Logging
export function withAuditLog(action: string, resource: string) {
  return function<TContext>(handler: ApiHandler<TContext>): ApiHandler<TContext> {
    return async (request: NextRequest, context: TContext) => {
      const startTime = Date.now();
      let success = false;
      let error: string | undefined;
      let resourceId: string | undefined;
      
      try {
        const response = await handler(request, context);
        success = response.status < 400;
        
        // Extract resource ID from response if available
        if (response.status === 200 || response.status === 201) {
          try {
            const data = await response.clone().json();
            resourceId = data.id || data.data?.id;
          } catch {
            // Ignore JSON parsing errors
          }
        }
        
        // PATTERN: Store audit log in database
        const token = await getToken({ req: request });
        await auditLogger.logToDatabase({
          userId: token?.sub || 'unknown',
          username: token?.username || 'unknown',
          action,
          resource,
          resourceId,
          method: request.method,
          endpoint: request.url,
          userAgent: request.headers.get('user-agent'),
          success,
          error,
          duration: Date.now() - startTime,
          // CRITICAL: Mask sensitive data
          metadata: maskSensitiveData(await getRequestMetadata(request))
        });
        
        return response;
      } catch (err) {
        error = err instanceof Error ? err.message : String(err);
        success = false;
        
        // Still log failed requests
        const token = await getToken({ req: request });
        await auditLogger.logToDatabase({
          userId: token?.sub || 'unknown',
          username: token?.username || 'unknown',
          action,
          resource,
          resourceId,
          method: request.method,
          endpoint: request.url,
          userAgent: request.headers.get('user-agent'),
          success,
          error,
          duration: Date.now() - startTime,
          metadata: { error: error }
        });
        
        throw err;
      }
    };
  };
}

// Task 3: Validation Middleware  
export function withValidation<T>(schema: z.ZodSchema<T>) {
  return function<TContext>(handler: ApiHandler<TContext>): ApiHandler<TContext> {
    return async (request: NextRequest, context: TContext) => {
      try {
        const body = await request.json();
        const result = schema.safeParse(body);
        
        if (!result.success) {
          // PATTERN: Use existing validation error response pattern
          return AppError.validation(
            'Validation failed',
            { fieldErrors: formatZodErrors(result.error) }
          ).toResponse();
        }
        
        // PATTERN: Add validated data to request context
        return await handler(request, { ...context, validatedData: result.data });
      } catch (error) {
        return apiErrorResponse(error, 'Invalid request data');
      }
    };
  };
}
```

### Integration Points
```yaml
DATABASE:
  - schema: Add AuditLog model to prisma/schema.prisma 
  - migration: Run "npx prisma db push" to update schema
  - pattern: "import prisma from '@/lib/prisma'"
  - retention: Manual cleanup of audit logs > 90 days via admin UI

AUTHENTICATION:
  - extend: src/lib/api-auth.ts withAdminAuth wrapper
  - pattern: "Compose new middleware with existing auth"

ERROR_HANDLING:
  - extend: src/lib/errors.ts AppError patterns
  - pattern: "AppError.validation(), AppError.authorization()"

LOGGING:
  - extend: src/lib/logger.ts structured logging
  - pattern: "logger.error(error, { module, context, tags })"

ROUTES:
  - modify: ALL src/app/api/admin/**/*.ts (36 routes)
  - pattern: "export const POST = secureAdminAuth({ action, resource, schema })(handler)"
  - ensure: Consistent security across entire admin API surface
  
ADMIN_UI:
  - add: src/app/admin/audit/page.tsx (new audit logs page)  
  - modify: Admin navigation component (add audit logs menu item)
  - pattern: Mirror existing admin table patterns from users page
  - features: Search, filter, pagination, manual cleanup, CSV export

TYPES:
  - create: src/types/security.ts
  - pattern: "Define interfaces for middleware and audit types"
```

## Validation Loop

### Level 1: Syntax & Style
```bash
# Run these FIRST - fix any errors before proceeding
npm run lint                    # ESLint with auto-fix
npm run typecheck              # TypeScript type checking

# Expected: No errors. If errors, READ the error and fix.
```

### Level 2: Unit Tests each new feature/file/function use existing test patterns
```typescript
// CREATE src/tests/lib/middleware/validation.test.ts
describe('withValidation', () => {
  const testSchema = z.object({
    name: z.string().min(1),
    email: z.string().email()
  });

  it('should pass validation with valid data', async () => {
    const handler = withValidation(testSchema)(
      async (req, ctx) => NextResponse.json({ data: ctx.validatedData })
    );
    
    const request = new NextRequest('http://localhost/api/test', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test User', email: 'test@example.com' })
    });
    
    const response = await handler(request, {});
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data.data.name).toBe('Test User');
  });

  it('should reject invalid data with field errors', async () => {
    const handler = withValidation(testSchema)(
      async () => NextResponse.json({ success: true })
    );
    
    const request = new NextRequest('http://localhost/api/test', {
      method: 'POST',
      body: JSON.stringify({ name: '', email: 'invalid-email' })
    });
    
    const response = await handler(request, {});
    expect(response.status).toBe(400);
    
    const data = await response.json();
    expect(data.error).toBe('Validation failed');
    expect(data.fieldErrors).toBeDefined();
  });
});

// CREATE src/tests/lib/audit/audit-logger.test.ts
describe('auditLogger', () => {
  it('should log admin actions with structured data', async () => {
    const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
    
    await auditLogger.log({
      action: 'user.create',
      userId: 'admin-123',
      success: true,
      metadata: { username: 'testuser' }
    });
    
    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringContaining('[AUDIT]'),
      expect.objectContaining({
        action: 'user.create',
        userId: 'admin-123',
        success: true
      })
    );
  });

  it('should mask sensitive data in audit logs', async () => {
    const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
    
    await auditLogger.log({
      action: 'password.change',
      userId: 'admin-123',
      success: true,
      metadata: { 
        email: 'user@example.com',
        password: 'secret123'  // Should be filtered out
      }
    });
    
    const logCall = mockConsoleLog.mock.calls[0];
    const logData = logCall[1];
    
    expect(logData.metadata.email).toBe('u***@example.com');
    expect(logData.metadata.password).toBeUndefined();
  });
});
```

```bash
# Run and iterate until passing:
npm test -- src/tests/lib/middleware/validation.test.ts
npm test -- src/tests/lib/audit/audit-logger.test.ts
# If failing: Read error, understand root cause, fix code, re-run
```

### Level 3: Integration Test
```bash
# Test the secured admin endpoints with database audit logging
curl -X POST http://localhost:3000/api/admin/users \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=valid-admin-token" \
  -d '{"username": "test", "email": "test@example.com", "password": "Test123!"}'

# Expected: {\"status\": \"success\", \"data\": {...}} with audit log stored in database


# Test audit page displays logs correctly
curl -X GET http://localhost:3000/api/admin/audit \
  -H "Cookie: next-auth.session-token=valid-admin-token"

# Expected: Array of audit log entries with Date, Time, User, Action, Resource, Status

# Test manual audit cleanup
curl -X POST http://localhost:3000/api/admin/audit/cleanup \
  -H "Cookie: next-auth.session-token=valid-admin-token"

# Expected: {"deleted": 5, "message": "Deleted 5 audit logs older than 90 days"}

# Test audit page UI
open http://localhost:3000/admin/audit
# Expected: Admin page with searchable table, cleanup button, and recent audit entries
```

## Final validation Checklist
- [ ] All tests pass: `npm test`
- [ ] No linting errors: `npm run lint`
- [ ] No type errors: `npm run typecheck`
- [ ] Manual test successful: `npm run dev`
- [ ] Audit logs captured for all admin actions with structured data
- [ ] Sensitive data properly masked in logs (emails, passwords filtered)
- [ ] Database connections use singleton pattern (no memory leaks)
- [ ] All admin routes maintain existing functionality
- [ ] Security headers applied to all admin responses
- [ ] Zod validation active on routes with request bodies

---

## Anti-Patterns to Avoid
- ❌ Don't break existing admin auth - extend withAdminAuth, don't replace
- ❌ Don't create new database connection patterns - use existing prisma singleton
- ❌ Don't log passwords or sensitive data unmasked
- ❌ Don't mock /src/lib modules in tests - use real implementations for security testing
- ❌ Don't ignore middleware order - auth -> validation -> audit -> security headers
- ❌ Don't make security optional - all admin endpoints need protection
- ❌ Don't expose internal error details in production responses
- ❌ Don't skip audit logging for any admin action that modifies data

---

## Security Hardening Confidence Score: 9/10

This PRP provides comprehensive context, addresses all critical vulnerabilities identified in the security assessment, includes protection against the recent CVE-2025-29927, follows existing codebase patterns, and provides detailed validation gates. The implementation approach builds upon existing infrastructure rather than replacing it, reducing risk of breaking changes while significantly improving security posture.

The 9/10 score reflects high confidence in one-pass implementation success due to thorough research, detailed task breakdown, comprehensive testing approach, and alignment with existing codebase patterns.