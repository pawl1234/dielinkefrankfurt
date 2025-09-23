# Error Handling and Validation System

> **Date:** 2025-09-23
> **Version:** 1.0
> **Status:** Implemented

## Overview

This document describes the centralized error handling and validation system implemented for the DIE LINKE Frankfurt Next.js application. The system provides consistent, type-safe error handling with German localization and structured field validation across all API routes.

## Architecture

### Core Components

```
src/lib/
├── errors.ts                    # Core error classes and response helpers
├── validation-messages.ts       # German field labels and validation messages
└── validation/
    ├── index.ts                 # Single export point for all validators
    ├── schemas.ts               # Shared validation patterns and utilities
    ├── group-validator.ts       # Group-specific validation logic
    ├── status-report-validator.ts # Status report validation with configurable limits
    ├── appointment-validator.ts # Appointment validation logic
    └── antrag-validator.ts      # Antrag (application) validation logic
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

## Validation System

### Shared Validation Schemas

The `schemas.ts` file provides reusable validation patterns:

```typescript
import { validationSchemas, commonValidators } from '@/lib/validation/schemas';

// Common validators
commonValidators.required(value, 'fieldName');
commonValidators.email(value, 'email');
commonValidators.stringLength(value, 'name', 3, 100);

// Predefined schemas
validationSchemas.name.validate(value, 'name');
validationSchemas.email.validate(value, 'email');
validationSchemas.longDescription.validate(value, 'description');
```

### Creating New Validators

1. **Create validator file** in `src/lib/validation/`:

```typescript
// src/lib/validation/my-validator.ts
import { validationSchemas, validateFields } from './schemas';
import { ValidationResult } from '@/lib/errors';

export interface MyDataType {
  name: string;
  email: string;
  // ... other fields
}

export async function validateMyData(data: Partial<MyDataType>): Promise<ValidationResult> {
  const errors: Record<string, string> = {};

  // Type guard
  if (!data || typeof data !== 'object') {
    return {
      isValid: false,
      errors: { general: 'Ungültige Daten erhalten' }
    };
  }

  // Use shared schemas
  const nameError = validationSchemas.name.validate(data.name || '', 'name');
  if (nameError) errors.name = nameError;

  const emailError = validationSchemas.email.validate(data.email || '', 'email');
  if (emailError) errors.email = emailError;

  return {
    isValid: Object.keys(errors).length === 0,
    errors: Object.keys(errors).length > 0 ? errors : undefined
  };
}
```

2. **Export from index.ts**:

```typescript
// src/lib/validation/index.ts
export * from './my-validator';
```

## API Error Handling Patterns

### Standard API Route Pattern

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { ValidationError, isValidationError, apiErrorResponse } from '@/lib/errors';
import { validateMyData } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // Extract and validate data
    const data = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
    };

    const validationResult = await validateMyData(data);
    if (!validationResult.isValid && validationResult.errors) {
      throw new ValidationError(validationResult.errors);
    }

    // Process valid data
    const result = await processData(data);

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
import { validateMyData } from '@/lib/validation';

export async function createMyEntity(data: MyDataType): Promise<MyEntity> {
  // Validate using centralized validator
  const validationResult = await validateMyData(data);
  if (!validationResult.isValid && validationResult.errors) {
    throw new ValidationError(validationResult.errors);
  }

  // Business logic
  const entity = await prisma.myEntity.create({ data });
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

## Testing

### Unit Testing Validators

```typescript
// src/tests/lib/validation/my-validator.test.ts
import { describe, it, expect } from '@jest/globals';
import { validateMyData } from '@/lib/validation/my-validator';

describe('My Validator', () => {
  it('should accept valid data', async () => {
    const validData = {
      name: 'Test Name',
      email: 'test@example.com'
    };

    const result = await validateMyData(validData);
    expect(result.isValid).toBe(true);
    expect(result.errors).toBeUndefined();
  });

  it('should return German error messages', async () => {
    const invalidData = {
      // Missing required fields
    };

    const result = await validateMyData(invalidData);
    expect(result.isValid).toBe(false);
    expect(result.errors?.name).toBe('Name ist erforderlich');
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

## Migration Guide

### Updating Existing Validators

1. **Move validation logic** to `src/lib/validation/`
2. **Use shared schemas** instead of custom validation
3. **Return ValidationResult** instead of strings/nulls
4. **Throw ValidationError** in handlers instead of custom objects

### Before (Old Pattern):

```typescript
// Old validation function
export function validateOldData(data: any): Record<string, string> | null {
  const errors: Record<string, string> = {};

  if (!data.name) {
    errors.name = 'Name ist erforderlich';
  }

  return Object.keys(errors).length > 0 ? errors : null;
}

// Old handler
export async function createOldEntity(data: any) {
  const validationErrors = validateOldData(data);
  if (validationErrors) {
    throw { validationErrors, isValidationError: true };
  }
  // ...
}
```

### After (New Pattern):

```typescript
// New validation function
export async function validateNewData(data: Partial<DataType>): Promise<ValidationResult> {
  const errors: Record<string, string> = {};

  const nameError = validationSchemas.name.validate(data.name || '', 'name');
  if (nameError) errors.name = nameError;

  return {
    isValid: Object.keys(errors).length === 0,
    errors: Object.keys(errors).length > 0 ? errors : undefined
  };
}

// New handler
export async function createNewEntity(data: DataType) {
  const validationResult = await validateNewData(data);
  if (!validationResult.isValid && validationResult.errors) {
    throw new ValidationError(validationResult.errors);
  }
  // ...
}
```

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