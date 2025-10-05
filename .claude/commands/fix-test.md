# Fix the a Test

I will help you fix a broken software test while reusing project context and best practices. I will make sure
to not only make the test work, but also optimized to test to give a real benefit to the project. 

## Test to be fixed: $ARGUMENTS

## Project Overview
- **Tech Stack**: Next.js 15 (App Router), React 18, TypeScript, Material UI v7, Prisma ORM, PostgreSQL
- **Purpose**: Website for political organization (Die Linke Frankfurt) with content management, events, groups, and newsletter functionality
- **Architecture**: Full-stack application with API routes, database operations, file uploads, and email sending

## Testing Setup
- **Framework**: Jest with two configurations:
  - `jest.config.js`: Main config for components/integration tests (jsdom environment)
  - `jest.config.api.js`: API route tests (node environment)
- **Test Commands**:
  - `npm test -- src/tests/emails/templates/Newsletter.test.tsx`: Run a specific tests

## Key Testing Patterns & Conventions
1. **Test Location**: All tests in `/src/tests/` folder
2. **Mock Strategy**: 
   - Mock external services (Database, Email, File storage, Network requests, Browser APIs)
   - Use real implementations for `/src/lib/` modules (business logic)
   - Mock at the boundary, not internal code
3. **Authentication**: Tests use mocked `getToken` from `next-auth/jwt`
4. **Database**: Comprehensive Prisma mock with transaction support in `jest.setup.js`
5. **File Handling**: Mock implementations for File, FormData, Blob APIs

## Test Architecture & Helpers
- **Test Utilities** (`src/tests/test-utils.ts`): Mock data generators, API request helpers
- **Factories** (`src/tests/factories/`): Data factory functions for consistent test data
- **Mocks** (`src/tests/mocks/`): Centralized mock implementations
- **Helpers** (`src/tests/helpers/`): Workflow and domain-specific test helpers

## Common Test Patterns
1. **API Route Testing**: Use NextRequest/NextResponse with proper authentication mocks
2. **Database Testing**: Use global state maps for test data persistence
3. **File Upload Testing**: Mock Vercel Blob storage and FormData handling
4. **Email Testing**: Mock nodemailer and email service functions
5. **Component Testing**: Use @testing-library/react with Material UI mocks
6. **Never validate styling**: Never try to validate the styling html / css return value focus on business logic

## Key Dependencies & Mocking
- **Database**: `@prisma/client` - Fully mocked with state management
- **Authentication**: `next-auth/jwt` - Mocked token validation
- **Email**: `@/lib/email` - Mocked transporter and sending functions
- **File Storage**: `@vercel/blob` - Mocked put/delete operations
- **Date/Time**: `dayjs` and `@mui/x-date-pickers` - Mocked with custom implementations
- **Navigation**: `next/navigation` - Mocked router hooks
- **Server APIs**: `next/server` - Custom NextRequest/NextResponse implementations

## Domain Models
- **Groups**: Organizations with responsible persons, status workflow (NEW → ACTIVE/REJECTED → ARCHIVED)
- **Status Reports**: Content from groups with approval workflow
- **Appointments**: Events with datetime, location, approval status
- **Newsletter**: Email campaigns with chunked sending, analytics tracking
- **File Uploads**: Logo uploads for groups, attachments for reports

## Type Safety Requirements
- **NO `any` types**: Use specific interfaces from `src/types/`
- **Prisma Models**: Proper field types matching schema.prisma
- **Date Handling**: Accept both `Date` and `string` types for date fields
- **Form Validation**: Only show errors after submission attempt

## Common Test Failures & Solutions
1. **TypeScript Errors**: Use proper types, avoid `any`, create proper mock objects with all required fields
2. **Mock Issues**: Ensure mocks match actual API contracts
3. **Async/Promise Issues**: Proper async/await handling in test setup
4. **Date Handling**: Use consistent date formats in tests
5. **File Upload**: Proper FormData mocking with boundary handling
6. **Authentication**: Ensure proper token mocking for protected routes
7. **Database State**: Use global state maps for test data consistency
8. **React Email components**: should be tested using JSX syntax with the render() function, not called as functions
</context>

## Process
IMPORTANT! Follow the defined process in the <process> section: 
IMPORTANT! Only change the code of the test. Never add code to the project itself to make the test pass. 

<process>
1. Analyze the context of the test throughly
    1. Read files related to the test
    2. Check git histroy to see what as been changed
3. Judge whether the test or the implementation is broken.
4. Judge whether the test adds benefit to the project in general. Does it make sense to fix the test?
3. If test does not add benefit to the project according to best practices then sum your findings up. 
4. If the gerneally test adds value the project, then investigate the root cause why the test is failing. 
5. When you found the root cause, then apply a fix to the test. NEVER add code to project except test. 
6. Reiterate over the test until it passes. 
</process>

## Summary output
At the end of this task sum up your findings in a short report answering the following questions:

- What is the test testing in real world szenario?
- Judge the implementation of the test before and after you applied the fix be bloody honest
- Rate the Test value to the project from 1 to 10. 
- Does the Test validate business logic?
- When it took multiple interations to fix the test. Give me a short clear sentance about what would have been helpful to know to fix the test quicker. 
  Exmaple:
    - **Types definitions can be found in /src/types/** 
    OR
    - **Test Utils can be found here: src/tests/test-utils.ts**

<note>
Take your time to think about this. The clearer we are about the problem, the better our solution will be. If you have a rough idea but aren't sure about all the details, that's fine - we'll refine it together.
</note>