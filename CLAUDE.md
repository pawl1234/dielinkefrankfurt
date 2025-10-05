### 🔄 Project Awareness & Context
- **Always read `PLANNING.md`** at the start of a new conversation to understand the project's architecture, goals, style, and constraints.
- **Check `TASK.md`** before starting a new task. If the task isn’t listed, add it with a brief description and today's date.
- **Use consistent naming conventions, file structure, and architecture patterns** as described in `PLANNING.md`.
- **Use npm** for package management and running commands in this Node.js project.
- **Expect the server to be started** do not run "npm run dev" and expect the server to be running on http://localhost:3000

### Tech Stack

- **Frontend**: Next.js 15 with App Router, React 18, TypeScript
- **UI Components**: Material UI (MUI) v7
- **Form Handling**: React Hook Form
- **Rich Text Editing**: TipTap
- **File Upload**: Uppy components
- **Database**: PostgreSQL via Prisma ORM
- **File Storage**: Vercel Blob Storage
- **Authentication**: NextAuth.js
- **Email**: Nodemailer

### 🧱 Code Structure & Modularity
- **Never create a file longer than 500 lines of code.** If a file approaches this limit, refactor by splitting it into modules or helper files.
- **Organize code into clearly separated modules**, grouped by feature or responsibility.
- **Use clear, consistent imports** (prefer relative imports within packages).
- **Use Next.js environment variables** (.env.local, .env) and process.env for configuration.

### 🧪 Testing & Reliability
- **Always create unit tests for new features** (functions, classes, routes, etc).
- **After updating any logic**, check whether existing unit tests need to be updated. If so, do it.
- **Tests should live in a `/src/tests` folder** mirroring the main app structure.
  - Include at least:
    - 1 test for expected use
    - 1 edge case
    - 1 failure case
- **Mocking Rules**:
   - Never mock modules in /src/lib/ unless they directly interact with external services
   - Do not mock pure utility functions, error handlers, or data transformers
   - Do not mock modules just because they import other modules - mock the root dependency instead
   - External services: Database (Prisma), Email providers, File storage (Vercel Blob)
   - Browser/Node incompatibilities: next/server, next/navigation, browser APIs
   - Network requests: APIs, webhooks, third-party services
   - Mock at the boundary: Mock external dependencies, not your own code
   - Keep mocks minimal: Only mock the specific methods you need, not entire modules
   - Use real implementations: For /src/lib/ modules, use the actual code in tests
   - Mock once, centrally: If NextResponse needs mocking, do it in jest.setup.js, not everywhere
   - Never mock anything outside the folder /src/tests everything test related should stay in /src/tests


### ✅ Task Completion
- **Mark completed tasks in `TASK.md`** immediately after finishing them.
- Add new sub-tasks or TODOs discovered during development to `TASK.md` under a “Discovered During Work” section.

### 📎 Style & Conventions
- **Use TypeScript** as the primary language.
- **Follow TypeScript/JavaScript best practices**, use proper TypeScript types, and format with Prettier/ESLint.
- **Use TypeScript interfaces** for data validation and type safety.
- Use Next.js API routes for APIs and Prisma ORM for database interactions.
- Write **JSDoc comments for functions** using TypeScript conventions:
    ```typescript
      /**
         * Brief summary.
         *
         * @param param1 - Description of parameter
         * @returns Description of return value
         */
      function example(param1: string): string {
         // implementation
      }

### 📚 Documentation & Explainability
- **Update `README.md`** when new features are added, dependencies change, or setup steps are modified.
- **Date inf front of .md files** when you add a new .md file always add the date in ISO format as prefix like 'yyyy-mm-dd_' example '2025-07-09_feature-abc.md'
- **Comment non-obvious code** and ensure everything is understandable to a mid-level developer.
- When writing complex logic, **add an inline `// Reason:` comment** explaining the why, not just the what.

### 🧠 AI Behavior Rules
- **Never assume missing context. Ask questions if uncertain.**
- **Never hallucinate libraries or functions** – before introducing new libraries ALWAS ask for permission.
- **Always confirm file paths and module names** exist before referencing them in code or tests.
- **Never delete or overwrite existing code** unless explicitly instructed to or if part of a task from `TASK.md`.


## Common Issues and Solutions

- **Build failures**: Check for TypeScript errors with `npm run typecheck`
- **Database connection issues**: Verify DATABASE_URL is correct
- **File upload failures**: Check BLOB_READ_WRITE_TOKEN is set correctly
- **Authentication problems**: Verify NEXTAUTH_SECRET and VERCEL_PROJECT_PRODUCTION_URL are set
- **MUI v7 Grid usage**: Material UI v7 uses a new Grid system this code is wrong: `<Grid item xs={{12}}>` use the new correct way instead: `<Grid size={{ xs: 12, md: 6 }}>`.
- **Date handling**: When working with date fields, be aware that the Prisma client uses JavaScript `Date` objects for datetime fields, but our interface definitions sometimes expect `string`. In components, use `Date | string` as the type for date fields.
- **Form validation**: Forms should only show validation errors after submission. Use a `formSubmitted` state variable to conditionally display error messages. For component reuse, validation controls can accept a `showValidationErrors` prop.
- **TypeScript**: NEVER use the `any` type. Always use specific types from `src/types/` (api-types.ts, component-types.ts, form-types.ts) or create proper interfaces. For Prisma models, use proper field types matching schema.prisma. For test mocks, create objects with all required fields instead of type assertions. While development make sure type safety is always ensured.

## Error Handling & Validation System

This project uses a centralized error handling and validation system located in `src/lib/validation/`. **ALWAYS use this system** for consistent error handling across the application.

### Key Principles

- **German localization**: All validation messages must be in German
- **Structured field errors**: Use `ValidationError` class for form validation
- **Consistent API responses**: Use `validationErrorResponse()` and `apiErrorResponse()`
- **No string matching**: Never use string matching for error detection
- **DRY validation**: Reuse shared validation schemas

### Quick Usage Guide

#### 1. API Route Error Handling
```typescript
import { ValidationError, isValidationError, apiErrorResponse } from '@/lib/errors';
import { validateMyData } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    // ... extract data from request

    // Validate using centralized validator
    const validationResult = await validateMyData(data);
    if (!validationResult.isValid && validationResult.errors) {
      throw new ValidationError(validationResult.errors);
    }

    // ... process data
    return NextResponse.json({ success: true });

  } catch (error) {
    // Handle ValidationError (returns structured field errors)
    if (isValidationError(error)) {
      return error.toResponse();
    }

    // Handle other errors consistently
    return apiErrorResponse(error, 'Operation failed');
  }
}
```

#### 2. Creating New Validators
```typescript
// src/lib/validation/my-validator.ts
import { validationSchemas } from './schemas';
import { ValidationResult } from '@/lib/errors';

export async function validateMyData(data: Partial<MyDataType>): Promise<ValidationResult> {
  const errors: Record<string, string> = {};

  // Use shared schemas for consistency
  const nameError = validationSchemas.name.validate(data.name || '', 'name');
  if (nameError) errors.name = nameError;

  return {
    isValid: Object.keys(errors).length === 0,
    errors: Object.keys(errors).length > 0 ? errors : undefined
  };
}

// Export from src/lib/validation/index.ts
export * from './my-validator';
```

#### 3. Handler Functions
```typescript
// src/lib/my-handlers.ts
import { ValidationError } from '@/lib/errors';
import { validateMyData } from '@/lib/validation';

export async function createMyEntity(data: MyDataType) {
  // Always validate first
  const validationResult = await validateMyData(data);
  if (!validationResult.isValid && validationResult.errors) {
    throw new ValidationError(validationResult.errors);
  }

  // Business logic here...
  return await prisma.myEntity.create({ data });
}
```

#### 4. Frontend Integration
The frontend already integrates via `useValidationErrors` hook:
```typescript
// Server field errors are automatically handled
const { validationErrors, submissionError } = useValidationErrors({
  formErrors,
  customValidations,
  submissionError,
  serverFieldErrors, // ← Populated from ValidationError responses
  isSubmitted
});
```

### Available Validation Schemas

Use these predefined schemas from `src/lib/validation/schemas.ts`:

- `validationSchemas.name` - Names (3-100 chars)
- `validationSchemas.title` - Titles (3-200 chars)
- `validationSchemas.email` - Email validation
- `validationSchemas.longDescription` - Long text (50-5000 chars)
- `validationSchemas.shortDescription` - Short text (10-500 chars)
- `validationSchemas.firstName` - Person first name (2-50 chars)
- `validationSchemas.lastName` - Person last name (2-50 chars)
- `validationSchemas.content` - Content fields (10-10000 chars)
- `validationSchemas.optionalText(maxLength)` - Optional text with max length

### Common Validators

From `src/lib/validation/schemas.ts`:
```typescript
import { commonValidators } from '@/lib/validation/schemas';

// Use these for custom validation
commonValidators.required(value, 'fieldName');
commonValidators.email(value, 'email');
commonValidators.stringLength(value, 'name', 3, 100);
commonValidators.arrayNotEmpty(array, 'items');
```

### German Field Labels

All field labels are centralized in `src/lib/validation-messages.ts`. When adding new fields:

1. Add to `fieldLabels` object:
```typescript
export const fieldLabels: Record<string, string> = {
  'myNewField': 'Mein neues Feld',
  // ...
};
```

2. Use in validation messages:
```typescript
validationMessages.required('myNewField'); // Returns: "Mein neues Feld ist erforderlich"
```

### Error Response Patterns

#### ✅ CORRECT - Use ValidationError
```typescript
if (!validationResult.isValid && validationResult.errors) {
  throw new ValidationError(validationResult.errors);
}
```

#### ✅ CORRECT - Use apiErrorResponse
```typescript
catch (error) {
  return apiErrorResponse(error, 'German error message');
}
```

#### ❌ WRONG - String matching
```typescript
// DON'T DO THIS
if (error.message.includes('required')) {
  return NextResponse.json({ error: error.message }, { status: 400 });
}
```

#### ❌ WRONG - Custom error objects
```typescript
// DON'T DO THIS
throw { validationErrors: errors, isValidationError: true };
```

### Testing Validation

When testing validators, use real implementations (don't mock them):
```typescript
// ✅ CORRECT
import { validateMyData } from '@/lib/validation/my-validator';

describe('My Validator', () => {
  it('should return German error messages', async () => {
    const result = await validateMyData({});
    expect(result.errors?.name).toBe('Name ist erforderlich');
  });
});
```

### Documentation

For detailed information, see: [docs/development/2025-09-23_error-handling-validation-system.md](docs/development/2025-09-23_error-handling-validation-system.md) 