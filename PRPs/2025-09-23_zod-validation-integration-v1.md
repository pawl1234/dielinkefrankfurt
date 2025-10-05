name: "Zod Validation System Integration v1"
description: |

## Purpose
Integrate Zod TypeScript schema validation with the existing error handling system to create a unified, type-safe validation approach across all API routes while maintaining German localization and existing error response formats.

## Core Principles
1. **Preserve Existing Error System**: Maintain ValidationError class and response patterns
2. **German Localization**: Keep existing German field labels and messages
3. **Type Safety**: Leverage Zod's TypeScript inference capabilities
4. **Gradual Migration**: Phase approach starting with public APIs
5. **No Breaking Changes**: Maintain existing API response formats

---

## Goal
Replace mixed validation approaches (manual validators, custom schemas) with a unified Zod-based system that integrates seamlessly with the existing ValidationError/ValidationResult architecture while improving type safety and reducing code duplication.

## Why
- **Inconsistent Validation**: Mix of manual validation, custom schemas, and one Zod instance creates maintenance burden
- **Type Safety Gaps**: Manual validators don't provide TypeScript type inference
- **Code Duplication**: Similar validation logic repeated across different validators
- **Admin API Gaps**: Many admin routes lack structured validation
- **Developer Experience**: Better IDE support and runtime validation with Zod

## What
Unified Zod-first validation system that:
- Integrates with existing ValidationError class and response patterns
- Maintains German localization through validation-messages.ts
- Provides full TypeScript type inference
- Reduces validation code by ~60%
- Covers all public APIs (4 routes) and critical admin APIs (15+ routes)

### Success Criteria
- [ ] All public APIs use Zod validation with existing error formats
- [ ] All admin APIs have structured Zod validation
- [ ] Zero breaking changes to existing error response formats
- [ ] German localization preserved and enhanced
- [ ] 90%+ test coverage for new validation system
- [ ] Performance equal or better than current system

## All Needed Context

### Documentation & References
```yaml
# MUST READ - Include these in your context window
- url: https://zod.dev/error-customization
  why: Custom error messages and German localization patterns

- url: https://zod.dev/basics
  why: safeParse() usage and TypeScript integration

- url: https://shipped.club/blog/validating-nextjs-api-inputs-with-zod-and-typescript
  why: Next.js API route validation patterns with Zod

- file: src/lib/errors.ts
  why: ValidationError class, ValidationResult interface, and error response patterns

- file: src/lib/validation-messages.ts
  why: German field labels and validation message templates

- file: src/app/api/admin/antraege/[id]/route.ts
  why: Existing Zod usage pattern to build upon (lines 8-35)

- file: src/lib/validation/schemas.ts
  why: Current validation patterns and shared schemas to migrate

- file: src/tests/lib/validation/group-validator.test.ts
  why: Testing patterns for validators with German messages

- docfile: docs/development/2025-09-23_error-handling-validation-system.md
  why: Complete documentation of current error handling system
```

### Current Codebase Tree
```bash
src/
├── lib/
│   ├── validation/
│   │   ├── index.ts                 # Single export point
│   │   ├── schemas.ts               # Current shared validation patterns
│   │   ├── group-validator.ts       # Manual group validation
│   │   ├── status-report-validator.ts
│   │   ├── appointment-validator.ts
│   │   └── antrag-validator.ts      # Complex manual validation
│   ├── errors.ts                    # ValidationError class & response helpers
│   └── validation-messages.ts       # German localization
├── app/api/
│   ├── groups/submit/               # Public API - needs Zod migration
│   ├── antraege/submit/             # Public API - complex validation
│   ├── status-reports/submit/       # Public API - basic validation
│   ├── appointments/submit/         # Public API - manual validation in handlers
│   └── admin/                       # Admin APIs - minimal validation
└── tests/
    ├── lib/validation/              # Current test patterns
    └── api/                         # API route tests
```

### Desired Codebase Tree with files to be added
```bash
src/lib/validation/
├── index.ts                         # Updated exports
├── zod-helpers.ts                   # NEW: Zod integration utilities
├── zod-schemas.ts                   # NEW: Shared Zod schemas
├── zod-localization.ts              # NEW: German error message mapping
├── group-schema.ts                  # NEW: Zod group validation
├── status-report-schema.ts          # NEW: Zod status report validation
├── appointment-schema.ts            # NEW: Zod appointment validation
└── antrag-schema.ts                 # NEW: Zod antrag validation (complex)
```

### Known Gotchas & Library Quirks
```typescript
// CRITICAL: Zod v4.0.17 already installed, compatible with TypeScript v5.5+
// Example: Use safeParse() to avoid throwing errors
const result = schema.safeParse(data);
if (!result.success) {
  // Handle ZodError through ValidationResult interface
}

// CRITICAL: Current ValidationError expects Record<string, string> field errors
export class ValidationError extends AppError {
  public readonly fieldErrors: Record<string, string>;
  // Must convert Zod errors to this format
}

// CRITICAL: German localization pattern in validation-messages.ts
export const fieldLabels: Record<string, string> = {
  'name': 'Gruppenname',
  'email': 'E-Mail-Adresse',
  // Zod schemas must reference these labels
};

// CRITICAL: Current API response format must be preserved
return validationErrorResponse(fieldErrors); // Returns structured field errors

// CRITICAL: Test mocking rules - don't mock /src/lib modules
// Use real implementations in tests for validation modules

// CRITICAL: Existing Zod usage pattern in admin/antraege/[id]/route.ts
const result = updateAntragSchema.safeParse(body);
if (!result.success) {
  return NextResponse.json({
    error: 'Validation failed',
    details: result.error.flatten() // Current pattern doesn't use ValidationError
  }, { status: 400 });
}
```

## Implementation Blueprint

### Data Models and Structure

Core integration types that bridge Zod with existing error system:
```typescript
// src/lib/validation/zod-helpers.ts
export interface ZodValidationResult<T> {
  isValid: boolean;
  data?: T;
  errors?: Record<string, string>;
}

// Bridge function to convert Zod errors to existing ValidationResult format
export function zodToValidationResult<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult & { data?: T };

// German error message mapping for Zod
export function createGermanErrorMap(): z.ZodErrorMap;
```

### List of tasks to be completed in order

```yaml
Task 1: Create Zod Integration Infrastructure
DESCRIPTION: Set up core utilities to bridge Zod with existing error system
FILES:
  CREATE src/lib/validation/zod-helpers.ts:
    - IMPLEMENT zodToValidationResult() function
    - IMPLEMENT createGermanErrorMap() using validation-messages.ts
    - IMPLEMENT createZodValidator() wrapper function

  CREATE src/lib/validation/zod-localization.ts:
    - MAP Zod error codes to German messages
    - INTEGRATE with existing fieldLabels from validation-messages.ts
    - HANDLE complex error types (nested objects, arrays)

Task 2: Create Base Zod Schemas
DESCRIPTION: Build reusable Zod schemas using existing validation patterns
FILES:
  CREATE src/lib/validation/zod-schemas.ts:
    - MIGRATE validationSchemas from schemas.ts to Zod equivalents
    - PRESERVE existing field length limits and requirements
    - IMPLEMENT nameSchema, emailSchema, titleSchema, etc.
    - ADD German custom error messages to each schema

Task 3: Migrate Complex Public API (Antraege)
DESCRIPTION: Replace antrag-validator.ts with comprehensive Zod schema
FILES:
  CREATE src/lib/validation/antrag-schema.ts:
    - MIGRATE validateAntragFormData() to Zod schema
    - HANDLE complex purposes object validation
    - PRESERVE exact validation rules from antrag-validator.ts
    - INTEGRATE with file validation patterns

  MODIFY src/app/api/antraege/submit/route.ts:
    - REPLACE validateAntragFormData() with Zod validation
    - MAINTAIN existing ValidationError throwing pattern
    - PRESERVE all error response formats

Task 4: Migrate Remaining Public APIs
DESCRIPTION: Convert group, status report, and appointment validation to Zod
FILES:
  CREATE src/lib/validation/group-schema.ts:
    - MIGRATE validateGroupData() from group-validator.ts
    - HANDLE responsiblePersons array validation
    - PRESERVE logo file validation integration

  CREATE src/lib/validation/status-report-schema.ts:
    - MIGRATE validateStatusReportData() with configurable limits
    - INTEGRATE with newsletter settings for limits

  CREATE src/lib/validation/appointment-schema.ts:
    - MIGRATE manual validation from appointment-handlers.ts
    - HANDLE optional fields and file validation

  MODIFY corresponding API routes:
    - REPLACE existing validation with Zod schemas
    - MAINTAIN ValidationError patterns

Task 5: Enhance Admin API Validation
DESCRIPTION: Add structured validation to admin routes using consistent patterns
FILES:
  MODIFY src/app/api/admin/antraege/[id]/route.ts:
    - REPLACE existing Zod usage with new zodToValidationResult() pattern
    - INTEGRATE with ValidationError class for consistency

  MODIFY src/app/api/admin/groups/route.ts:
    - ADD proper validation for query parameters
    - IMPLEMENT structured error responses

  MODIFY src/app/api/admin/status-reports/route.ts:
    - ENHANCE PUT/PATCH endpoints with Zod validation
    - ADD proper file upload validation

Task 6: Update Validation Exports and Clean Up
DESCRIPTION: Update imports and remove legacy validation code
FILES:
  MODIFY src/lib/validation/index.ts:
    - EXPORT all new Zod schemas and helpers
    - MAINTAIN backward compatibility during transition

  DELETE legacy files after confirming all migrations:
    - src/lib/validation/antrag-validator.ts
    - Manual validation functions in other validators

  UPDATE imports across codebase:
    - REPLACE old validator imports with new Zod schemas
    - VERIFY no breaking changes in dependent code

Task 7: Comprehensive Testing Suite
DESCRIPTION: Create test coverage for all new Zod validation schemas
FILES:
  CREATE src/tests/lib/validation/zod-helpers.test.ts:
    - TEST zodToValidationResult() with various Zod schemas
    - TEST German error message mapping
    - TEST integration with ValidationError class

  CREATE src/tests/lib/validation/antrag-schema.test.ts:
    - MIGRATE tests from existing antrag validator tests
    - TEST complex purposes object validation
    - VERIFY German error messages match existing patterns

  CREATE tests for all new schemas:
    - FOLLOW existing test patterns from group-validator.test.ts
    - TEST valid input acceptance
    - TEST invalid input rejection with correct German messages
    - TEST edge cases and boundary conditions

  UPDATE existing API route tests:
    - VERIFY Zod validation works with existing test patterns
    - ENSURE no breaking changes in error response formats
```

### Task 1 Pseudocode (Zod Integration Infrastructure)
```typescript
// src/lib/validation/zod-helpers.ts

import { z } from 'zod';
import { ValidationResult } from '@/lib/errors';
import { fieldLabels, validationMessages } from '@/lib/validation-messages';

// PATTERN: Convert Zod errors to existing ValidationResult interface
export function zodToValidationResult<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult & { data?: T } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { isValid: true, data: result.data };
  }

  // CRITICAL: Convert ZodError to Record<string, string> format
  const errors: Record<string, string> = {};
  result.error.issues.forEach(issue => {
    const fieldPath = issue.path.join('.');
    errors[fieldPath] = getGermanErrorMessage(issue, fieldPath);
  });

  return { isValid: false, errors };
}

// PATTERN: Map Zod error codes to German messages using existing patterns
function getGermanErrorMessage(issue: z.ZodIssue, fieldPath: string): string {
  const fieldLabel = fieldLabels[fieldPath] || fieldPath;

  switch (issue.code) {
    case z.ZodIssueCode.invalid_type:
      if (issue.expected === 'string') {
        return validationMessages.required(fieldPath);
      }
      break;
    case z.ZodIssueCode.too_small:
      if (issue.type === 'string') {
        return validationMessages.minLength(fieldPath, issue.minimum);
      }
      break;
    // Continue mapping all Zod error codes to German messages
  }
}

// PATTERN: Global error map for consistent German messages
export function createGermanErrorMap(): z.ZodErrorMap {
  return (issue, ctx) => {
    // CRITICAL: Use existing validation message patterns
    return { message: getGermanErrorMessage(issue, issue.path?.join('.') || 'field') };
  };
}

// PATTERN: Wrapper to use Zod with existing error handling
export function createZodValidator<T>(schema: z.ZodSchema<T>) {
  return (data: unknown) => zodToValidationResult(schema, data);
}
```

### Integration Points
```yaml
DATABASE:
  - schema: "No changes to Prisma schema required"
  - validation: "Zod schemas validate before database operations"

CONFIG:
  - dependencies: "Zod v4.0.17 already installed"
  - typescript: "Requires strict mode (already enabled)"

ROUTES:
  - pattern: "All API routes use ValidationError throwing pattern"
  - response: "Maintain validationErrorResponse() format"

COMPONENTS:
  - frontend: "useValidationErrors hook already handles serverFieldErrors"
  - integration: "No changes needed to existing form validation patterns"
```

## Validation Loop

### Level 1: Syntax & Style
```bash
# Run these FIRST - fix any errors before proceeding
npm run lint                    # ESLint with auto-fix
npm run typecheck              # TypeScript type checking

# Expected: No errors. If errors exist, READ error and fix before continuing.
```

### Level 2: Unit Tests for each new Zod schema
```typescript
// CREATE src/tests/lib/validation/zod-helpers.test.ts
import { zodToValidationResult, createGermanErrorMap } from '@/lib/validation/zod-helpers';
import { z } from 'zod';

describe('Zod Integration Helpers', () => {
  beforeAll(() => {
    // Set global error map for consistent German messages
    z.setErrorMap(createGermanErrorMap());
  });

  it('should convert valid Zod parse to ValidationResult', () => {
    const schema = z.object({ name: z.string() });
    const result = zodToValidationResult(schema, { name: 'Test' });

    expect(result.isValid).toBe(true);
    expect(result.data).toEqual({ name: 'Test' });
    expect(result.errors).toBeUndefined();
  });

  it('should convert Zod errors to German field errors', () => {
    const schema = z.object({
      name: z.string().min(3, 'Name must be at least 3 characters'),
      email: z.string().email()
    });
    const result = zodToValidationResult(schema, { name: '', email: 'invalid' });

    expect(result.isValid).toBe(false);
    expect(result.errors?.name).toBe('Gruppenname ist erforderlich');
    expect(result.errors?.email).toBe('E-Mail-Adresse muss eine gültige E-Mail-Adresse sein');
  });

  it('should handle complex nested object validation', () => {
    // Test nested objects like Antrag purposes
    const schema = z.object({
      purposes: z.object({
        zuschuss: z.object({
          enabled: z.boolean(),
          amount: z.number().min(1)
        })
      })
    });

    const result = zodToValidationResult(schema, {
      purposes: { zuschuss: { enabled: true, amount: 0 } }
    });

    expect(result.isValid).toBe(false);
    expect(result.errors?.['purposes.zuschuss.amount']).toContain('mindestens');
  });
});

// CREATE similar tests for each schema: antrag-schema.test.ts, group-schema.test.ts, etc.
```

```bash
# Run and iterate until passing:
npm test -- src/tests/lib/validation/zod-helpers.test.ts
# If failing: Read error, understand root cause, fix code, re-run (don't mock to pass)
```

### Level 3: Integration Test
```bash
# Test the API endpoint with new Zod validation
curl -X POST http://localhost:3000/api/antraege/submit \
  -H "Content-Type: application/json" \
  -d '{"firstName": "", "lastName": "Test", "email": "invalid-email"}'

# Expected: {
#   "error": "Validation failed",
#   "type": "VALIDATION",
#   "fieldErrors": {
#     "firstName": "Vorname ist erforderlich",
#     "email": "E-Mail-Adresse muss eine gültige E-Mail-Adresse sein"
#   }
# }

# If error: Check browser network tab or server logs for detailed error info
```

## Final Validation Checklist
- [ ] All tests pass: `npm test`
- [ ] No linting errors: `npm run lint`
- [ ] No type errors: `npm run typecheck`
- [ ] Manual test successful: `npm run dev`
- [ ] Zod validation integrates with existing ValidationError
- [ ] German error messages preserved and enhanced
- [ ] API response formats unchanged (backward compatibility)
- [ ] Performance equal or better than manual validation
- [ ] All public APIs use Zod validation
- [ ] Critical admin APIs have structured validation

---

## Anti-Patterns to Avoid
- ❌ Don't change existing error response formats - maintain backward compatibility
- ❌ Don't lose German localization - preserve all existing field labels
- ❌ Don't mock Zod or validation modules in tests - use real implementations
- ❌ Don't skip ValidationError integration - maintain existing error handling patterns
- ❌ Don't use parse() - always use safeParse() for better error handling
- ❌ Don't ignore existing validation rules - preserve exact business logic
- ❌ Don't create breaking changes - migrate gradually with compatibility
- ❌ Don't forget configurable limits - maintain newsletter settings integration
- ❌ Don't skip complex validation - handle nested objects and arrays properly

**Confidence Score: 9/10** - Comprehensive context provided with existing patterns, clear migration path, and detailed validation loops for one-pass implementation success.