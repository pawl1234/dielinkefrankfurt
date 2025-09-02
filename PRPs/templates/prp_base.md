name: "Base PRP Template v2 - Context-Rich with Validation Loops"
description: |

## Purpose
Template optimized for AI agents to implement features with sufficient context and self-validation capabilities to achieve working code through iterative refinement.

## Core Principles
1. **Context is King**: Include ALL necessary documentation, examples, and caveats
2. **Validation Loops**: Provide executable tests/lints the AI can run and fix
3. **Information Dense**: Use keywords and patterns from the codebase
4. **Progressive Success**: Start simple, validate, then enhance
5. **Global rules**: Be sure to follow all rules in CLAUDE.md

---

## Goal
[What needs to be built - be specific about the end state and desires]

## Why
- [Business value and user impact]
- [Integration with existing features]
- [Problems this solves and for whom]

## What
[User-visible behavior and technical requirements]

### Success Criteria
- [ ] [Specific measurable outcomes]

## All Needed Context

### Documentation & References (list all context needed to implement the feature)
```yaml
# MUST READ - Include these in your context window
- url: [Official API docs URL]
  why: [Specific sections/methods you'll need]
  
- file: [path/to/example.ts]
  why: [Pattern to follow, gotchas to avoid]
  
- doc: [Library documentation URL] 
  section: [Specific section about common pitfalls]
  critical: [Key insight that prevents common errors]

- docfile: [PRPs/ai_docs/file.md]
  why: [docs that the user has pasted in to the project]

```

### Current Codebase tree (run `tree` in the root of the project) to get an overview of the codebase
```bash

```

### Desired Codebase tree with files to be added and responsibility of file
```bash

```

### Known Gotchas of our codebase & Library Quirks
```typescript
// CRITICAL: [Library name] requires [specific setup]
// Example: Next.js API routes require exported handler functions (GET, POST, etc.)
// Example: Prisma client requires await prisma.$disconnect() in serverless environments
// Example: We use Material UI v7 with new Grid system: <Grid size={{ xs: 12, md: 6 }}>
// Example: File uploads use Vercel Blob Storage and require proper FormData handling
// Example: All forms use React Hook Form with validation only shown after submission
// Example: Database operations use Prisma with proper transaction handling
```

## Implementation Blueprint

### Data models and structure

Create the core data models, we ensure type safety and consistency.
```typescript
Examples: 
 - Prisma schema models (schema.prisma)
 - TypeScript interfaces (src/types/*.ts)
 - Zod validation schemas
 - Next.js API response types
 - React component prop types
```

### list of tasks to be completed to fullfill the PRP in the order they should be completed

```yaml
Task 1:
MODIFY src/existing-module.ts:
  - FIND pattern: "export interface ExistingInterface"
  - INJECT after line containing "export interface"
  - PRESERVE existing type definitions

CREATE src/new-feature.ts:
  - MIRROR pattern from: src/similar-feature.ts
  - MODIFY interface name and core logic
  - KEEP error handling pattern identical

...(...)

Task N:
...

```


### Per task pseudocode as needed added to each task
```typescript

// Task 1
// Pseudocode with CRITICAL details dont write entire code
export async function newFeature(param: string): Promise<Result> {
  // PATTERN: Always validate input first (see src/lib/validation.ts)
  const validated = validateInput(param); // throws ValidationError
  
  // GOTCHA: Prisma requires proper connection handling
  const prisma = new PrismaClient();
  try {
    // PATTERN: Use existing error handling wrapper
    const result = await withErrorHandling(async () => {
      // CRITICAL: Use transactions for multi-table operations
      return await prisma.$transaction(async (tx) => {
        // PATTERN: Follow existing database patterns
        return await tx.model.create({ data: validated });
      });
    });
    
    // PATTERN: Standardized response format (see src/lib/api-responses.ts)
    return formatResponse(result);
  } finally {
    await prisma.$disconnect();
  }
}
```

### Integration Points
```yaml
DATABASE:
  - setup: export DATABASE_URL="postgresql://devuser:devpassword@localhost:5432/mydatabase"
  - migration: "npx prisma db push"
  - schema: "Update prisma/schema.prisma"
  
CONFIG:
  - add to: .env.local
  - pattern: "FEATURE_TIMEOUT=30"
  
ROUTES:
  - add to: src/app/api/feature/route.ts
  - pattern: "export async function GET() { ... }"
  
COMPONENTS:
  - add to: src/components/feature/
  - pattern: "Follow existing component structure with proper TypeScript props"
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
// CREATE src/tests/new-feature.test.ts with these test cases:
describe('newFeature', () => {
  it('should handle valid input successfully', async () => {
    // Basic functionality works
    const result = await newFeature('valid_input');
    expect(result.status).toBe('success');
  });

  it('should throw ValidationError for invalid input', async () => {
    // Invalid input raises ValidationError
    await expect(newFeature('')).rejects.toThrow('ValidationError');
  });

  it('should handle database connection errors gracefully', async () => {
    // Mock database error
    jest.spyOn(PrismaClient.prototype, '$transaction').mockRejectedValue(new Error('Connection timeout'));
    
    const result = await newFeature('valid');
    expect(result.status).toBe('error');
    expect(result.message).toContain('database');
  });
});
```

```bash
# Run and iterate until passing:
npm test -- src/tests/new-feature.test.ts
# If failing: Read error, understand root cause, fix code, re-run (never mock to pass)
```

### Level 3: Integration Test
```bash
# Test the API endpoint
curl -X POST http://localhost:3000/api/feature \
  -H "Content-Type: application/json" \
  -d '{"param": "test_value"}'

# Expected: {"status": "success", "data": {...}}
# If error: Check browser network tab or server logs for detailed error info
```

## Final validation Checklist
- [ ] All tests pass: `npm test`
- [ ] No linting errors: `npm run lint`
- [ ] No type errors: `npm run typecheck`
- [ ] Manual test successful: `npm run dev`
- [ ] Error cases handled gracefully
- [ ] Logs are informative but not verbose
- [ ] Documentation updated if needed

---

## Anti-Patterns to Avoid
- ❌ Don't create new patterns when existing ones work
- ❌ Don't skip validation because "it should work"  
- ❌ Don't ignore failing tests - fix them
- ❌ Don't use any type - always use proper TypeScript types
- ❌ Don't hardcode values that should be environment variables
- ❌ Don't catch all exceptions - be specific about error types
- ❌ Don't forget to disconnect Prisma client in serverless functions
- ❌ Don't use old MUI Grid syntax - use new size prop
- ❌ Don't show form validation errors before submission
- ❌ Don't mock internal /src/lib modules in tests - use real implementations