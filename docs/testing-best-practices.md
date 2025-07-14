# Testing Best Practices - Lessons Learned

## The Problem with Excessive Mocking

The original tests were testing the mocks themselves rather than the actual code behavior. This leads to:
- False confidence (tests pass but code might be broken)
- Tests that break when implementation details change
- No verification of actual business logic

## Key Principles

### 1. Mock at the Boundaries
Only mock external dependencies:
- ✅ Database (Prisma)
- ✅ External APIs 
- ✅ File storage (Vercel Blob)
- ✅ Email services
- ❌ Internal utility functions
- ❌ Business logic modules

### 2. Test Behavior, Not Implementation
Instead of:
```javascript
// Bad: Testing that mock returns what we told it to
expect(data).toEqual({
  createdAt: "2025-07-07T09:07:53.979Z", // Testing exact mock format
  updatedAt: "2025-07-07T09:07:53.979Z"
});
```

Do this:
```javascript
// Good: Testing actual behavior
expect(data.id).toBe(1);
expect(data.recipientEmails).toBe('admin@test.com');
expect(data.createdAt).toBeDefined(); // Just verify it exists
```

### 3. Use Real Implementations When Possible
```javascript
// Bad: Mocking internal validation
jest.mock('@/lib/file-upload', () => ({
  validateFile: jest.fn()
}));

// Good: Use real validation with test data
const largeFile = new File([new Uint8Array(3 * 1024 * 1024)], 'large.jpg');
// This will trigger real validation logic
```

### 4. Document What You're Testing
Add comments explaining:
- What the test actually verifies
- What it doesn't test (due to necessary mocks)
- Why certain mocks are necessary

### 5. Test Error Cases Realistically
```javascript
// Good: Verify validation prevents database calls
expect(response.status).toBe(400);
expect(mockPrisma.antragConfiguration.findFirst).not.toHaveBeenCalled();
```

## Examples from Our Refactoring

### api-group-logo-upload.test.ts
**Before**: Mocked file-upload and group-handlers modules
**After**: Used real implementations, only mocked Vercel Blob and Prisma
**Result**: Tests now verify actual validation logic and error handling

### configuration.test.ts  
**Before**: Testing exact mock return values
**After**: Testing actual behavior and side effects
**Result**: Tests verify business logic like email validation and trimming

## When Mocking is Necessary

Some mocking is unavoidable, but document why:
- Authentication in tests (we can't have real sessions)
- External services (we can't make real API calls)
- Database operations (we need predictable test data)

## Red Flags in Tests

Watch out for:
- Tests that only call mocked functions
- Exact equality checks on mock return values
- Mocking modules from `/src/lib/`
- Tests that pass even when the actual code is broken
- No assertions about side effects or error handling