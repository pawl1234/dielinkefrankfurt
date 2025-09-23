name: "Error Handling Centralization and Standardization v1"
description: |

## Purpose
Complete the centralization and standardization of error handling across the entire Next.js application, ensuring consistent error responses, proper TypeScript typing, and maintainable code following DRY principles.

## Core Principles
1. **Context is King**: Include ALL necessary documentation, examples, and caveats
2. **Validation Loops**: Provide executable tests/lints the AI can run and fix
3. **Information Dense**: Use keywords and patterns from the codebase
4. **Progressive Success**: Start simple, validate, then enhance
5. **Global rules**: Be sure to follow all rules in CLAUDE.md

---

## Goal
Create a unified, consistent error handling system that:
- Provides structured field errors with German localization
- Uses existing AppError class infrastructure consistently
- Standardizes all API routes to return consistent error formats
- Improves frontend error parsing and display
- Follows TypeScript best practices with proper typing
- Makes error handling maintainable and testable

## Why
- **Business value**: Reduces user confusion with clear, localized error messages
- **Developer experience**: Single pattern to follow for all error handling
- **Maintainability**: DRY principle - centralized error logic
- **Integration**: Works seamlessly with existing useValidationErrors hook
- **Problems solved**: Inconsistent error formats, duplicated validation, poor error visibility

## What
Comprehensive error handling system with:
- Centralized validation using schema-based approach
- Consistent API error responses using existing AppError infrastructure
- Proper error class hierarchy for different error types
- Frontend error parsing that integrates with existing hooks
- Full test coverage for error scenarios

### Success Criteria
- [ ] All API routes use apiErrorResponse() or validationErrorResponse()
- [ ] All validation errors return structured fieldErrors in German
- [ ] No string matching for error detection in API routes
- [ ] Frontend forms handle server errors consistently
- [ ] Tests pass for all error scenarios
- [ ] No TypeScript errors

## All Needed Context

### Documentation & References
```yaml
# MUST READ - Include these in your context window
- url: https://nextjs.org/docs/app/building-your-application/routing/error-handling
  why: Next.js App Router error handling patterns and best practices

- file: src/lib/errors.ts
  why: Existing AppError class, validationErrorResponse, apiErrorResponse - USE THESE

- file: src/lib/validation-messages.ts
  why: Centralized German field labels and validation messages - EXTEND THIS

- file: src/hooks/useValidationErrors.ts
  why: Frontend hook that collects errors - serverFieldErrors support already added

- file: src/app/api/admin/newsletter/send/route.ts
  why: Good example of AppError.validation() usage - FOLLOW THIS PATTERN

- file: src/lib/appointment-handlers.ts
  why: Shows validationErrorResponse() usage with structured errors

- file: src/tests/hooks/useValidationErrors.test.ts
  why: Test pattern for error handling - mirror this approach

- url: https://github.com/colinhacks/zod
  why: Schema validation library for TypeScript - consider for future

- docfile: error-message-improvement.md
  why: Recent analysis showing current state and issues
```

### Current Codebase tree
```bash
src/
├── lib/
│   ├── errors.ts                    # AppError class, apiErrorResponse, validationErrorResponse
│   ├── validation-messages.ts       # Centralized German messages
│   ├── group-handlers.ts           # Mixed validation approach
│   ├── appointment-handlers.ts     # Better validation pattern
│   ├── antrag-handlers.ts          # Not using centralized errors
│   └── validators/
│       └── antrag-validator.ts     # Separate validation file
├── app/api/
│   ├── groups/submit/              # Uses validationErrorResponse ✅
│   ├── appointments/submit/        # Uses validationErrorResponse ✅
│   ├── status-reports/submit/      # String matching for errors ❌
│   ├── antraege/submit/            # Inconsistent error handling ❌
│   └── admin/newsletter/*/         # Good AppError usage ✅
├── hooks/
│   ├── useValidationErrors.ts      # Collects all errors, supports serverFieldErrors
│   └── useFormSubmission.ts        # Handles form submission errors
└── components/forms/
    ├── groups/GroupRequestForm.tsx      # Throws error on fieldErrors
    ├── appointments/AppointmentForm.tsx # Different error pattern
    └── status-reports/StatusReportForm.tsx # Another variation
```

### Desired Codebase tree with files to be added
```bash
src/
├── lib/
│   ├── errors.ts                    # Extended with ValidationError class
│   ├── validation/
│   │   ├── index.ts                 # Export all validators
│   │   ├── schemas.ts               # Shared validation schemas
│   │   ├── group-validator.ts      # Group-specific validation
│   │   ├── appointment-validator.ts # Appointment validation
│   │   ├── status-report-validator.ts # Status report validation
│   │   └── antrag-validator.ts     # Move existing here
│   └── api-middleware.ts           # New: Consistent error wrapper
└── tests/lib/validation/
    ├── group-validator.test.ts
    ├── appointment-validator.test.ts
    └── status-report-validator.test.ts
```

### Known Gotchas of our codebase & Library Quirks
```typescript
// CRITICAL: Next.js App Router requires NextResponse for API responses
// Example: Must use NextResponse.json() not just return object

// CRITICAL: Prisma errors need special handling for unique constraints
// Example: P2002 code for unique constraint violation

// CRITICAL: FormData parsing can fail silently - always validate
// Example: formData.get() returns FormDataEntryValue | null

// CRITICAL: We use Material UI v7 with new Grid system
// Example: <Grid size={{ xs: 12, md: 6 }}> not <Grid item xs={12}>

// CRITICAL: All forms show validation only after submission
// Example: Use formSubmitted state to conditionally show errors

// CRITICAL: Never mock /src/lib modules in tests - use real implementations
// Example: Import actual validators, don't mock them

// CRITICAL: Server field errors must throw to prevent success message
// Example: In forms, throw Error when fieldErrors received from server
```

## Implementation Blueprint

### Data models and structure

```typescript
// Extend src/lib/errors.ts with ValidationError class
export class ValidationError extends AppError {
  public readonly fieldErrors: Record<string, string>;

  constructor(fieldErrors: Record<string, string>) {
    const firstError = Object.values(fieldErrors)[0] || 'Validierung fehlgeschlagen';
    super(firstError, ErrorType.VALIDATION, 400);
    this.fieldErrors = fieldErrors;
    this.name = 'ValidationError';
  }

  toResponse(): NextResponse {
    return validationErrorResponse(this.fieldErrors);
  }
}

// Validation result type for all validators
export interface ValidationResult {
  isValid: boolean;
  errors?: Record<string, string>;
}
```

### List of tasks to be completed

```yaml
Task 1:
CREATE src/lib/validation/schemas.ts:
  - DEFINE shared validation patterns (email, phone, text length)
  - USE validation-messages.ts for error messages
  - EXPORT reusable validation functions

Task 2:
MODIFY src/lib/errors.ts:
  - ADD ValidationError class extending AppError
  - ADD isValidationError() type guard
  - KEEP all existing exports

Task 3:
CREATE src/lib/validation/group-validator.ts:
  - MOVE validation logic from group-handlers.ts
  - USE schemas from schemas.ts
  - RETURN ValidationResult type
  - USE validationMessages from validation-messages.ts

Task 4:
CREATE src/lib/validation/status-report-validator.ts:
  - EXTRACT validation from group-handlers.ts validateStatusReportData
  - USE async for newsletter settings lookup
  - RETURN structured errors in German

Task 5:
CREATE src/lib/validation/appointment-validator.ts:
  - CONSOLIDATE validation from appointment-handlers.ts
  - USE shared schemas for common fields
  - RETURN ValidationResult

Task 6:
MODIFY src/lib/group-handlers.ts:
  - IMPORT from validation/group-validator.ts
  - REMOVE validateGroupData function
  - USE new ValidationError class instead of custom object

Task 7:
MODIFY src/app/api/status-reports/submit/route.ts:
  - ADD validation using status-report-validator
  - USE validationErrorResponse for errors
  - REMOVE string matching error detection

Task 8:
MODIFY src/app/api/antraege/submit/route.ts:
  - USE validationErrorResponse consistently
  - IMPORT antrag-validator from new location
  - REMOVE ad-hoc error responses

Task 9:
CREATE src/lib/api-middleware.ts:
  - WRAP API handlers with error handling
  - CATCH and convert all errors to proper responses
  - LOG errors with context

Task 10:
CREATE tests for each new validator:
  - TEST valid input succeeds
  - TEST each validation rule
  - TEST German error messages
  - USE existing test patterns
```

### Per task pseudocode

```typescript
// Task 1: schemas.ts
import { validationMessages, isValidEmail } from '../validation-messages';

export const commonValidators = {
  required: (value: unknown, field: string): string | null => {
    if (!value || (typeof value === 'string' && !value.trim())) {
      return validationMessages.required(field);
    }
    return null;
  },

  stringLength: (value: string, field: string, min: number, max: number): string | null => {
    if (value.length < min || value.length > max) {
      return validationMessages.between(field, min, max);
    }
    return null;
  },

  email: (value: string, field: string): string | null => {
    if (!isValidEmail(value)) {
      return validationMessages.email(field);
    }
    return null;
  }
};

// Task 3: group-validator.ts
import { commonValidators } from './schemas';
import { ValidationResult } from '@/lib/errors';

export async function validateGroupData(data: unknown): Promise<ValidationResult> {
  const errors: Record<string, string> = {};

  // Type guard and cast
  if (!data || typeof data !== 'object') {
    return { isValid: false, errors: { general: 'Ungültige Daten' } };
  }

  const groupData = data as any; // Will be properly typed

  // Validate each field using commonValidators
  const nameError = commonValidators.required(groupData.name, 'name') ||
                    commonValidators.stringLength(groupData.name, 'name', 3, 100);
  if (nameError) errors.name = nameError;

  // Continue for all fields...

  return {
    isValid: Object.keys(errors).length === 0,
    errors: Object.keys(errors).length > 0 ? errors : undefined
  };
}

// Task 9: api-middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { AppError, apiErrorResponse, ValidationError } from './errors';
import { logger } from './logger';

export function withErrorHandling(
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      return await handler(request);
    } catch (error) {
      // Log with context
      logger.error('API Error', {
        path: request.nextUrl.pathname,
        method: request.method,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // Handle ValidationError
      if (error instanceof ValidationError) {
        return error.toResponse();
      }

      // Handle AppError
      if (error instanceof AppError) {
        return error.toResponse();
      }

      // Generic error response
      return apiErrorResponse(error, 'Ein Fehler ist aufgetreten');
    }
  };
}
```

### Integration Points
```yaml
DATABASE:
  - No changes needed - validation happens before DB operations

CONFIG:
  - No new environment variables needed

ROUTES:
  - UPDATE: All API routes to use withErrorHandling wrapper
  - PATTERN: "export const POST = withErrorHandling(async (request) => { ... })"

COMPONENTS:
  - ENSURE: Forms throw Error when receiving fieldErrors
  - USE: serverFieldErrors prop in FormBase

TYPES:
  - ADD: ValidationResult to src/types/api-types.ts
  - ENSURE: Proper typing for all validators
```

## Validation Loop

### Level 1: Syntax & Style
```bash
# Run these FIRST - fix any errors before proceeding
npm run lint                    # ESLint with auto-fix
npm run typecheck              # TypeScript type checking

# Expected: No errors. If errors, READ the error and fix.
```

### Level 2: Unit Tests
```typescript
// CREATE src/tests/lib/validation/group-validator.test.ts
import { describe, it, expect } from '@jest/globals';
import { validateGroupData } from '@/lib/validation/group-validator';

describe('Group Validator', () => {
  it('should accept valid group data', async () => {
    const data = {
      name: 'Test Group',
      description: 'A'.repeat(50), // Minimum 50 chars
      responsiblePersons: [{
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com'
      }]
    };

    const result = await validateGroupData(data);
    expect(result.isValid).toBe(true);
    expect(result.errors).toBeUndefined();
  });

  it('should return German error for missing name', async () => {
    const data = { description: 'A'.repeat(50) };

    const result = await validateGroupData(data);
    expect(result.isValid).toBe(false);
    expect(result.errors?.name).toBe('Gruppenname ist erforderlich');
  });

  it('should validate description length', async () => {
    const data = {
      name: 'Test',
      description: 'Too short'
    };

    const result = await validateGroupData(data);
    expect(result.errors?.description).toContain('zwischen 50 und 5000');
  });
});
```

```bash
# Run and iterate until passing:
npm test -- src/tests/lib/validation/group-validator.test.ts
# If failing: Read error, fix validation logic, re-run
```

### Level 3: Integration Test
```bash
# Test group submission with validation
curl -X POST http://localhost:3000/api/groups/submit \
  -H "Content-Type: multipart/form-data" \
  -F "name=Test" \
  -F "description=Short"

# Expected: {"error":"Validation failed","type":"VALIDATION","fieldErrors":{"description":"Beschreibung muss zwischen 50 und 5000 Zeichen lang sein"}}

# Test status report submission
curl -X POST http://localhost:3000/api/status-reports/submit \
  -H "Content-Type: multipart/form-data" \
  -F "groupId=123" \
  -F "title="

# Expected: Structured validation error in German
```

## Final Validation Checklist
- [ ] All API routes return consistent error formats
- [ ] ValidationError class properly extends AppError
- [ ] All validators return German messages
- [ ] Tests pass: `npm test`
- [ ] No linting errors: `npm run lint`
- [ ] No type errors: `npm run typecheck`
- [ ] Manual test successful: Forms show proper errors
- [ ] No string matching for error detection in APIs
- [ ] Logging includes proper context
- [ ] Documentation updated in error-message-improvement.md

---

## Anti-Patterns to Avoid
- ❌ Don't create new error formats - use AppError classes
- ❌ Don't use string matching for error detection
- ❌ Don't duplicate validation logic - use shared validators
- ❌ Don't return plain JSON responses - use validationErrorResponse/apiErrorResponse
- ❌ Don't forget to throw errors in forms when fieldErrors received
- ❌ Don't use English error messages - everything in German
- ❌ Don't mock validation modules in tests
- ❌ Don't catch errors without logging context
- ❌ Don't mix validation with business logic

## Confidence Score: 8/10

Strong confidence due to:
- ✅ Existing infrastructure (AppError, validationErrorResponse) to build upon
- ✅ Clear patterns from newsletter APIs to follow
- ✅ Frontend hooks already support serverFieldErrors
- ✅ Test patterns established
- ✅ German messages already centralized

Minor risks:
- ⚠️ Need to ensure all forms handle server errors consistently
- ⚠️ Migration of existing validation logic needs careful testing