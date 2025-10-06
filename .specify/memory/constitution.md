<!--
SYNC IMPACT REPORT
Version: 0.0.0 → 1.0.0 (MAJOR: Initial constitution establishment)
Modified Principles: N/A (initial creation)
Added Sections:
  - I. Type Safety First
  - II. No Software Tests
  - III. KISS Principle
  - IV. DRY Principle
  - V. Path Aliases and Conventions
  - VI. German User-Facing Text
  - VII. Structured Logging
  - VIII. Server-Side Validation
  - IX. File Size Limit
  - X. Code Documentation
  - Development Workflow
  - Quality Standards
Removed Sections: N/A (initial creation)
Templates Requiring Updates:
  ✅ plan-template.md - Updated constitution references
  ✅ spec-template.md - Aligned with principles
  ✅ tasks-template.md - Aligned with task generation
Follow-up TODOs: None
-->

# Die Linke Frankfurt Newsletter System Constitution

## Core Principles

### I. Type Safety First
TypeScript strict mode MUST be enforced at all times. The `any` type is PROHIBITED. All function parameters, return values, and variables MUST have explicit types. Use existing types from `src/types/` (api-types.ts, component-types.ts, form-types.ts) or create proper interfaces. For Prisma models, use field types matching schema.prisma exactly.

**Rationale**: Type safety prevents runtime errors, improves code maintainability, and provides better IDE support. The project's complex data flow between forms, API routes, and database requires strict typing to prevent data inconsistencies.

### II. No Software Tests
This project does NOT use automated software tests. Do not create test files, test utilities, testing infrastructure, or suggest adding tests when implementing features. All validation is performed manually by humans.

**Rationale**: Manual testing is the chosen approach for this project. Resources are allocated to feature development rather than test infrastructure. This is a deliberate decision for the project's context and team workflow.

### III. KISS Principle (Keep It Simple, Stupid)
The simplest solution is ALWAYS preferred. Do not introduce abstractions, design patterns, or complexity without clear justification. If a straightforward implementation exists, use it. Avoid over-engineering.

**Rationale**: Simple code is easier to understand, maintain, and debug. The project benefits from direct, readable implementations over clever or complex solutions. Complexity should only be added when absolutely necessary.

### IV. DRY Principle (Don't Repeat Yourself)
Reuse existing types, interfaces, utilities, and functions before creating new ones. The project provides extensive shared code in `src/lib/`, `src/types/`, and `src/components/`. MUST check for existing solutions before adding new code.

**Rationale**: Code reuse reduces bugs, improves consistency, and makes maintenance easier. The project has established patterns and utilities that should be leveraged rather than duplicated.

### V. Path Aliases and Conventions
Use `@/` import alias for all internal imports (configured in tsconfig.json as `"@/*": ["./src/*"]`). Follow Next.js App Router conventions: API routes in `src/app/api/`, pages in `src/app/`, shared logic in `src/lib/`, components in `src/components/`.

**Rationale**: Consistent import paths improve code readability and prevent broken imports during refactoring. The established project structure must be maintained for clarity.

### VI. German User-Facing Text
All user-facing text MUST be in German: error messages, validation messages, success messages, UI labels, form placeholders. Server-side logs and code comments MAY be in English for developer clarity.

**Rationale**: The target audience is German-speaking users. Consistent German text improves user experience and accessibility.

### VII. Structured Logging
ALWAYS use the `logger` utility from `@/lib/logger.ts` for all server-side logging (API routes, server components, utilities). NEVER use `console.log` except for temporary debugging (remove before committing). Logger provides structured logging with levels (debug, info, warn, error, fatal) and supports context, tags, and module identification.

**Rationale**: Structured logging enables better error tracking, debugging, and monitoring in production. Consistent logging patterns make troubleshooting easier.

### VIII. Server-Side Validation
ALWAYS validate user input on the server using Zod schemas from `src/lib/validation/`, even if client-side validation exists. Client-side validation (React Hook Form) is optional for UX. Server validation is mandatory for security.

**Rationale**: Client-side validation can be bypassed. Server-side validation is the only security barrier against malicious input and ensures data integrity.

### IX. File Size Limit
NEVER create a file longer than 500 lines of code. If a file approaches this limit, refactor by splitting into modules or helper files. Organize code into clearly separated modules grouped by feature or responsibility.

**Rationale**: Large files are difficult to navigate, understand, and maintain. Smaller, focused modules improve code organization and team collaboration.

### X. Code Documentation
Write JSDoc comments for all functions using TypeScript conventions. Include parameter descriptions and return value descriptions. Do NOT add unnecessary inline comments. Code following clean code practices should be self-documenting and readable without excessive comments.

**Rationale**: JSDoc provides IDE autocomplete and type hints. Well-named variables and functions reduce the need for inline comments. Documentation should focus on "why" rather than "what" (which should be obvious from the code).

## Development Workflow

### Command Usage
Use ONLY the following commands to validate changed code:
- `npm run check` - Run lint + typecheck (MUST run before committing)
- `npm run lint` - ESLint check only
- `npm run lint:fix` - Auto-fix ESLint issues
- `npm run typecheck` - TypeScript type checking only

NEVER run `npm run build` or `npm run db:push` solely to validate changes. Database changes are validated separately by humans.

### Workflow Steps
1. Add or change code
2. Run `npm run check` to validate
3. Fix any errors reported
4. Changes are validated manually by a human

**Rationale**: The validation workflow is streamlined to catch type errors and linting issues quickly without full builds. Production builds and database migrations are managed separately as part of deployment.

## Quality Standards

### Database Conventions
- Models use lowercase table names: `@@map("table_name")`
- IDs: `Int @id @default(autoincrement())` for simple models, `String @id @default(cuid())` for complex entities
- Status fields: uppercase enums (`GroupStatus`, `AntragStatus`) with values like `NEW`, `ACTIVE`, `ARCHIVED`
- JSON storage: `String` or `String @db.Text` fields for flexible metadata
- Always use singleton Prisma instance from `src/lib/db/prisma.ts`

**Rationale**: Consistent database patterns prevent errors and improve maintainability. The singleton Prisma pattern prevents connection issues during development HMR.

### Form Submission Pattern
- Client: Use `submitForm()` utility from `src/lib/form-submission/submit-form.ts`
- Server: API routes validate with Zod, call database operations, return JSON
- File uploads: Use FormData with image compression (`react-image-crop`, `sharp`)

**Rationale**: Standardized form submission improves consistency, error handling, and code reuse across the application.

### Error Handling
- Use custom error types from `src/lib/errors.ts` (ValidationError, etc.)
- Always provide German error messages for users
- Log all errors with structured context using logger
- Return appropriate HTTP status codes (400 for validation, 500 for server errors)

**Rationale**: Consistent error handling improves debugging, user experience, and system reliability.

### Technology Stack Standards
- Next.js 15+ with App Router (no Pages Router)
- TypeScript in strict mode
- Prisma for database access (PostgreSQL)
- Material UI (MUI) for components
- React Hook Form + Zod for forms
- Vercel Blob for file storage
- NextAuth.js for authentication

**Rationale**: Established stack decisions ensure consistency and leverage existing project infrastructure.

## Governance

### Amendment Process
Constitution changes MUST be documented with version increments following semantic versioning:
- MAJOR: Principle removals or incompatible changes
- MINOR: New principles or expanded guidance
- PATCH: Clarifications or wording improvements

### Compliance Review
All code changes MUST comply with these principles. When principles conflict with requirements, the simplest compliant solution MUST be chosen. Complexity MUST be justified before introduction.

### Constitution Authority
This constitution supersedes conflicting guidance. When in doubt, consult this document. Template updates MUST align with constitutional principles.

**Version**: 1.0.0 | **Ratified**: 2025-10-06 | **Last Amended**: 2025-10-06
