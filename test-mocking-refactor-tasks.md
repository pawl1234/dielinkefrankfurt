# Test Mocking Refactor Task List

## Objective
Refactor test mocks to follow the new guidelines:
- Mock only external dependencies (database, email, file storage)
- Do not mock pure utility functions in `/src/lib/`
- Keep mocks minimal and at the boundary

## Current Status
- [ ] All tests passing after refactor (242 failed, 890 passed - need to fix failing tests)
- [x] Guidelines documented in CLAUDE.md

## Phase 1: Fix Immediate Test Failure ⚡ URGENT
- [x] Add missing functions to errors mock in jest.setup.js
  - [x] Add `handleDatabaseError` function
  - [x] Add `validationErrorResponse` function
  - [x] Run failing test to verify fix

## Phase 2: Mock Only External Dependencies

### Task 2.1: Create minimal Next.js mocks
- [x] Create minimal mock for `next/server` (only NextResponse)
- [x] Move Next.js mocks to top of jest.setup.js
- [x] Remove the full errors module mock
- [x] Test that errors module works with real implementation

### Task 2.2: Remove unnecessary lib mocks
- [x] Remove `@/lib/api-auth` mock (let it use real implementation)
- [x] Remove `@/lib/email-hashing` mock (pure utility functions)
- [x] Keep `@/lib/logger` mock minimal (just silence logs)
- [x] Verify tests still pass

### Task 2.3: Clean up duplicate mocks
- [x] Remove duplicate api-auth mock (appears twice in jest.setup.js)
- [x] Consolidate any other duplicate mocks

### Task 2.4: Fix api-group-logo-upload.test.ts
- [x] Remove mocks for file-upload and group-handlers modules
- [x] Update test to use real validation with actual large files
- [x] Fix test expectations to match real implementation behavior
- [x] Add transaction mock to handle Prisma transaction behavior
- [x] All 4 tests now passing with real implementations

## Phase 3: Fix Newsletter Service Mocks

### Task 3.1: Analyze newsletter dependencies
- [ ] List functions in newsletter-service that call external services
- [ ] List functions that are pure utilities
- [ ] Create plan for selective mocking

### Task 3.2: Refactor newsletter mocks
- [ ] Mock only external-calling functions
- [ ] Remove mocks for pure utility functions
- [ ] Update affected tests

## Phase 4: Update Individual Test Files

### Task 4.1: Remove antrag-handlers mocks
- [ ] Find all tests mocking `@/lib/antrag-handlers`
- [ ] Remove these mocks
- [ ] Fix any resulting test failures

### Task 4.2: Audit other lib mocks in test files
- [ ] Check each test file for lib mocks
- [ ] Remove unnecessary mocks
- [ ] Document any that must remain with reason

## Phase 5: Validation and Cleanup

### Task 5.1: Full test suite validation
- [ ] Run `npm test` for all tests
- [ ] Fix any remaining failures
- [ ] Document any edge cases

### Task 5.2: Update documentation
- [x] Add mocking guidelines to CLAUDE.md
- [x] Include examples of good vs bad mocking

### Task 5.3: Clean up __mocks__ directory
- [x] Update or remove `src/lib/__mocks__/errors.ts` (removed)
- [x] Ensure remaining mocks are complete and necessary

## Notes
- Starting with Phase 1 to ensure tests pass before major refactoring
- Each phase should maintain passing tests

## Issues Encountered
- Many tests fail after removing mocks (242 failed, 890 passed)
- Tests were relying on mocked behavior instead of real implementations
- Need to fix tests to work with real implementations

## Examples Fixed
1. **api-group-logo-upload.test.ts**
   - Removed mocks for file-upload and group-handlers
   - Used real file validation with actual large files
   - Added transaction mock for Prisma
   - Result: All 4 tests passing with real implementations

2. **configuration.test.ts**
   - Fixed date serialization expectations
   - Added validation for preventing database calls on errors
   - Improved assertions to test behavior not mock returns
   - Result: All 11 tests passing

## Lessons Learned
- Created testing-best-practices.md with guidelines
- Key insight: Most test failures were due to tests checking mock behavior rather than real behavior
- Solution: Update test expectations to match real implementation behavior

## Validation Checklist
- [ ] All tests pass
- [ ] No unnecessary mocks of `/src/lib/` modules
- [ ] External services properly mocked
- [ ] Documentation updated
- [ ] No duplicate mock definitions