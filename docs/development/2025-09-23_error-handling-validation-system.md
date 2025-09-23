# Error Handling and Validation System

> **Date:** 2025-09-23
> **Version:** 2.0
> **Status:** Migrated to Zod-based System

## Overview

This document describes the unified Zod-based error handling and validation system for the DIE LINKE Frankfurt Next.js application. The system provides type-safe validation with full TypeScript inference, consistent German localization, and structured field validation across all API routes.

## Architecture

### Current Architecture (Post-Migration)

```
src/lib/
├── errors.ts                    # Core error classes and response helpers
├── validation-messages.ts       # German field labels and validation messages
└── validation/
    ├── index.ts                 # Centralized exports for all validation
    ├── helpers.ts               # Zod integration utilities
    ├── localization.ts          # German error message mapping for Zod
    ├── schemas.ts               # Base Zod schemas (reusable components)
    ├── utils.ts                 # Rate limiting, reCAPTCHA utilities
    ├── antrag.ts               # Antrag-specific Zod validation
    ├── group.ts                # Group-specific Zod validation
    ├── status-report.ts        # Status report Zod validation
    └── appointment.ts          # Appointment Zod validation
```

### Error Classes Hierarchy

```typescript
Error
├── AppError (existing)
│   ├── ValidationError (new)
│   ├── NewsletterValidationError (existing)
│   └── NewsletterNotFoundError (existing)
└── FileUploadError (existing)
```

## Core Classes and Interfaces

### ValidationError Class

```typescript
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
```

### ValidationResult Interface

```typescript
export interface ValidationResult {
  isValid: boolean;
  errors?: Record<string, string>;
}
```

## Zod-Based Validation System

### Base Zod Schemas

The `schemas.ts` file provides reusable Zod schemas with German error messages:

```typescript
import {
  nameSchema,
  emailSchema,
  longDescriptionSchema,
  firstNameSchema,
  lastNameSchema,
  titleSchema,
  contentSchema
} from '@/lib/validation/schemas';

// Usage examples
const GroupSchema = z.object({
  name: nameSchema,                    // 3-100 chars, German errors
  description: longDescriptionSchema,  // 50-5000 chars, German errors
  responsiblePersons: z.array(z.object({
    firstName: firstNameSchema,        // 2-50 chars, German character validation
    lastName: lastNameSchema,          // 2-50 chars, German character validation
    email: emailSchema                 // Email validation with German messages
  })).min(1, 'Mindestens eine verantwortliche Person ist erforderlich')
});
```

### Zod Integration Utilities

The `helpers.ts` file bridges Zod with existing ValidationResult/ValidationError pattern:

```typescript
import { zodToValidationResult, validateWithZod } from '@/lib/validation/helpers';

// Convert Zod validation to ValidationResult format
const result = zodToValidationResult(MySchema, data);

// Direct validation with error throwing
try {
  const validatedData = validateWithZod(MySchema, data);
  // Use validatedData (fully typed)
} catch (error) {
  // ValidationError thrown automatically
}
```

### Creating New Zod Validators

1. **Create Zod schema file** in `src/lib/validation/`:

```typescript
// src/lib/validation/my-feature.ts
import { z } from 'zod';
import { nameSchema, emailSchema, titleSchema } from './schemas';

// Define Zod schema with German error messages
export const myFeatureSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  title: titleSchema,
  customField: z.string()
    .min(1, 'Benutzerdefiniertes Feld ist erforderlich')
    .max(200, 'Benutzerdefiniertes Feld darf maximal 200 Zeichen lang sein')
});

// Export TypeScript types
export type MyFeatureData = z.infer<typeof myFeatureSchema>;

// Create validation function using Zod helpers
export async function validateMyFeatureWithZod(data: unknown) {
  const { zodToValidationResult } = await import('./helpers');
  return zodToValidationResult(myFeatureSchema, data);
}
```

2. **Export from index.ts**:

```typescript
// src/lib/validation/index.ts
export * from './my-feature';
```

## API Error Handling Patterns

### Standard API Route Pattern

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { ValidationError, isValidationError, apiErrorResponse } from '@/lib/errors';
import { validateMyFeatureWithZod } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    // Handle both JSON and FormData
    const contentType = request.headers.get('content-type') || '';
    let data;

    if (contentType.includes('application/json')) {
      data = await request.json();
    } else {
      const formData = await request.formData();
      data = {
        name: formData.get('name') as string,
        email: formData.get('email') as string,
      };
    }

    // Validate using Zod schema
    const validationResult = await validateMyFeatureWithZod(data);
    if (!validationResult.isValid && validationResult.errors) {
      throw new ValidationError(validationResult.errors);
    }

    // Process valid data (fully typed from Zod)
    const validatedData = validationResult.data!;
    const result = await processData(validatedData);

    return NextResponse.json({ success: true, data: result });

  } catch (error) {
    // Handle ValidationError
    if (isValidationError(error)) {
      return error.toResponse();
    }

    // Handle other known errors
    if (error instanceof FileUploadError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    // Generic error handling
    return apiErrorResponse(error, 'Operation failed');
  }
}
```

### Handler Functions Pattern

```typescript
// src/lib/my-handlers.ts
import { ValidationError } from '@/lib/errors';
import { validateMyFeatureWithZod } from '@/lib/validation';

export async function createMyEntity(data: unknown): Promise<MyEntity> {
  // Validate using Zod validator
  const validationResult = await validateMyFeatureWithZod(data);
  if (!validationResult.isValid && validationResult.errors) {
    throw new ValidationError(validationResult.errors);
  }

  // Business logic with fully typed data
  const validatedData = validationResult.data!; // TypeScript knows the exact type
  const entity = await prisma.myEntity.create({ data: validatedData });
  return entity;
}
```

## Frontend Integration

### Using Server Field Errors

The frontend already integrates with the validation system through the `useValidationErrors` hook:

```typescript
// In React components
const {
  validationErrors,
  submissionError,
  hasValidationErrors,
  hasAnyErrors
} = useValidationErrors({
  formErrors,
  customValidations,
  submissionError,
  serverFieldErrors, // ← Populated from API responses
  isSubmitted
});
```

### Form Error Handling Pattern

```typescript
// In form submission handlers
try {
  const response = await fetch('/api/my-endpoint', {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    const result = await response.json();

    // Check for structured field errors
    if (result.fieldErrors && Object.keys(result.fieldErrors).length > 0) {
      setServerFieldErrors(result.fieldErrors);
      const errorValues = Object.values(result.fieldErrors);
      const firstError = errorValues.length > 0 ? String(errorValues[0]) : 'Validierungsfehler aufgetreten';
      throw new Error(firstError);
    }

    throw new Error(result.error || 'Operation failed');
  }

  // Handle success
  const result = await response.json();
  // ...
} catch (error) {
  setSubmissionError(error instanceof Error ? error.message : 'An error occurred');
}
```

## German Localization

### Field Labels

All field labels are centralized in `validation-messages.ts`:

```typescript
export const fieldLabels: Record<string, string> = {
  'name': 'Gruppenname',
  'description': 'Beschreibung',
  'email': 'E-Mail-Adresse',
  'firstName': 'Vorname',
  'lastName': 'Nachname',
  // ... more fields
};
```

### Validation Messages

```typescript
export const validationMessages = {
  required: (field: string): string => {
    const label = fieldLabels[field] || field;
    return `${label} ist erforderlich`;
  },

  email: (field: string): string => {
    const label = fieldLabels[field] || field;
    return `${label} muss eine gültige E-Mail-Adresse sein`;
  },

  between: (field: string, min: number, max: number): string => {
    const label = fieldLabels[field] || field;
    return `${label} muss zwischen ${min} und ${max} Zeichen lang sein`;
  },
  // ... more message templates
};
```

## Testing Zod Validation

### Unit Testing Zod Validators

```typescript
// src/tests/lib/validation/my-feature.test.ts
import { describe, it, expect } from '@jest/globals';
import { validateMyFeatureWithZod, myFeatureSchema } from '@/lib/validation/my-feature';

describe('My Feature Zod Validator', () => {
  it('should accept valid data with full TypeScript typing', async () => {
    const validData = {
      name: 'Test Name',
      email: 'test@example.com',
      title: 'Test Title',
      customField: 'Custom Value'
    };

    const result = await validateMyFeatureWithZod(validData);
    expect(result.isValid).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.errors).toBeUndefined();

    // TypeScript knows the exact type of result.data
    if (result.data) {
      expect(result.data.name).toBe('Test Name');
      expect(result.data.email).toBe('test@example.com');
    }
  });

  it('should return German error messages for invalid data', async () => {
    const invalidData = {
      name: '', // Too short
      email: 'invalid-email',
      customField: '' // Required field missing
    };

    const result = await validateMyFeatureWithZod(invalidData);
    expect(result.isValid).toBe(false);
    expect(result.errors?.name).toBe('Name muss mindestens 3 Zeichen lang sein');
    expect(result.errors?.email).toBe('Bitte geben Sie eine gültige E-Mail-Adresse ein');
    expect(result.errors?.customField).toBe('Benutzerdefiniertes Feld ist erforderlich');
  });

  it('should provide TypeScript type inference', () => {
    // Test that TypeScript can infer types from Zod schema
    type ExpectedType = {
      name: string;
      email: string;
      title: string;
      customField: string;
    };

    const schema = myFeatureSchema;
    type ActualType = z.infer<typeof schema>;

    // This would fail at compile time if types don't match
    const typeCheck: ExpectedType = {} as ActualType;
  });
});
```

### Integration Testing

Test that API routes return consistent error formats:

```typescript
// Test validation errors
const response = await POST(mockRequest);
const result = await response.json();

expect(response.status).toBe(400);
expect(result).toHaveProperty('error', 'Validation failed');
expect(result).toHaveProperty('type', 'VALIDATION');
expect(result).toHaveProperty('fieldErrors');
expect(result.fieldErrors).toHaveProperty('name');
```

## Migration Guide: Manual to Zod

### Migration Steps Completed

The validation system has been successfully migrated from manual validators to a Zod-based system. All API routes now use Zod validation for type safety and consistency.

### Migration Pattern Used:

**Before (Manual Validation)**:
```typescript
// Old manual validation function
export function validateOldData(data: any): Record<string, string> | null {
  const errors: Record<string, string> = {};

  if (!data.name || data.name.length < 3) {
    errors.name = 'Name muss mindestens 3 Zeichen lang sein';
  }

  return Object.keys(errors).length > 0 ? errors : null;
}
```

**After (Zod-based Validation)**:
```typescript
// New Zod schema with automatic type inference
export const dataSchema = z.object({
  name: nameSchema, // Reusable base schema with German messages
  email: emailSchema,
  // Zod provides full TypeScript typing automatically
});

export type DataType = z.infer<typeof dataSchema>; // Type inferred from schema

export async function validateDataWithZod(data: unknown) {
  const { zodToValidationResult } = await import('./helpers');
  return zodToValidationResult(dataSchema, data);
}
```

### Current State (Post-Migration)

All APIs now use the new Zod-based system:

- ✅ **Antrag API**: `validateAntragWithFilesWithZod()`
- ✅ **Group API**: `validateGroupWithZod()`
- ✅ **Status Report API**: `validateStatusReportWithZod()`
- ✅ **Appointment API**: `validateAppointmentWithZod()`

### Benefits Achieved

1. **Full Type Safety**: TypeScript knows exact types from Zod schemas
2. **Consistent German Messages**: Centralized localization
3. **Reduced Code**: Single validation approach
4. **Better DX**: IDE autocomplete and compile-time validation

## Best Practices

### DO ✅

- **Use shared validation schemas** from `schemas.ts`
- **Import from single entry point**: `@/lib/validation`
- **Always validate in German** using `validation-messages.ts`
- **Throw ValidationError** for field errors
- **Use apiErrorResponse** for generic errors
- **Test validators thoroughly** with German messages
- **Follow the ValidationResult interface** consistently

### DON'T ❌

- **Don't use string matching** for error detection
- **Don't duplicate validation logic** across files
- **Don't return custom error objects** - use ValidationError
- **Don't hardcode German messages** - use validation-messages.ts
- **Don't mix validation with business logic**
- **Don't forget to add new validators** to index.ts exports
- **Don't mock validation modules** in tests - use real implementations

## Performance Considerations

- **Validation is lightweight** - uses simple string checks and regex
- **Async validators** support database lookups (e.g., newsletter settings)
- **Fail fast** - return on first error when appropriate
- **Reuse validation schemas** to minimize memory usage

## Future Enhancements

### Potential Improvements

1. **Schema-based validation** with libraries like Zod
2. **Async validation caching** for database lookups
3. **Custom validation decorators** for TypeScript classes
4. **Validation middleware** for automatic API route validation
5. **Client-side validation** using the same schemas

### Configuration

Configurable limits are supported through newsletter settings:

```typescript
// In status-report-validator.ts
const settings = await getNewsletterSettings();
const titleLimit = settings.statusReportTitleLimit || 100;
const contentLimit = settings.statusReportContentLimit || 5000;
```

## Troubleshooting

### Common Issues

1. **TypeScript errors** - Ensure proper imports from `@/lib/validation`
2. **Test failures** - Update mock paths after moving validators
3. **Missing German messages** - Add new fields to `fieldLabels`
4. **Inconsistent error formats** - Use ValidationError and apiErrorResponse

### Debug Tips

- Check server logs for ValidationError details
- Verify API responses contain `fieldErrors` property
- Ensure frontend `useValidationErrors` receives `serverFieldErrors`
- Test with browser dev tools Network tab for error responses

---

This error handling and validation system provides a robust, consistent, and maintainable foundation for the application's data validation and error management needs.