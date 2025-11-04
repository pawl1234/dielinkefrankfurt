<!--
SYNC IMPACT REPORT
Version: 1.2.1 → 2.0.0 (MAJOR: Removed file size principle, strengthened db layer requirements)
Modified Principles:
  - Principle IV (DRY) - Enhanced with mandatory "check before adding" discovery process
  - Principle X (Domain-Based Architecture) - Renumbered from XI, added NON-NEGOTIABLE db layer rules
  - Principle XI (Centralized Types) - Renumbered from XII, streamlined
Removed Sections:
  - Principle IX (File Size Limit) - 500-line limit removed per project decision
Added Sections:
  - None
Constitution Size Optimization:
  - Reduced from 302 lines to 189 lines (37% reduction)
  - Removed verbose examples and redundant explanations
  - Consolidated Quality Standards section
  - Removed duplicate barrel export guidelines
Templates Requiring Updates:
  ✅ plan-template.md - Constitution Check updated to 11 principles, strengthened DRY and db layer checks
  ⚠ spec-template.md - Review for alignment with revised principles
  ⚠ tasks-template.md - Review for alignment with domain organization
  ⚠ checklist-template.md - Review for alignment with revised principles
Follow-up TODOs:
  - Review remaining templates for alignment with v2.0.0
-->

# Die Linke Frankfurt Newsletter System Constitution

## Core Principles

### I. Type Safety First
TypeScript strict mode MUST be enforced. The `any` type is PROHIBITED. All function parameters, return values, and variables MUST have explicit types. Use existing types from `src/types/` or create proper interfaces matching Prisma schema.prisma for database models. MUST check `src/types/` for existing definitions before creating new types.

**Rationale**: Type safety prevents runtime errors and improves maintainability. The complex data flow requires strict typing to prevent inconsistencies.

### II. No Software Tests
This project does NOT use automated software tests. Do not create test files, test utilities, testing infrastructure, or suggest adding tests. All validation is performed manually.

**Rationale**: Manual testing is the chosen approach. Resources are allocated to feature development rather than test infrastructure.

### III. KISS Principle (Keep It Simple, Stupid)
The simplest solution is ALWAYS preferred. Do not introduce abstractions, design patterns, or complexity without clear justification. Avoid over-engineering.

**Rationale**: Simple code is easier to understand, maintain, and debug. Complexity should only be added when absolutely necessary.

### IV. DRY Principle (Don't Repeat Yourself)
ALWAYS check for existing solutions before writing new code. MUST search `src/lib/`, `src/types/`, `src/components/`, and API routes for existing types, utilities, functions, components, and patterns. Reuse existing code before creating duplicates.

**Discovery Process** (MANDATORY):
1. Search `src/types/` for existing type definitions
2. Search `src/lib/` for existing utilities and business logic
3. Search `src/components/` for existing UI components
4. Search `src/app/api/` for existing API patterns
5. Only create new code after confirming nothing exists

**Rationale**: Code reuse reduces bugs, improves consistency, and makes maintenance easier. The project has established patterns that must be leveraged rather than duplicated.

### V. Path Aliases and Conventions
Use `@/` import alias for all internal imports. Follow Next.js App Router conventions: API routes in `src/app/api/`, pages in `src/app/`, shared logic in `src/lib/`, components in `src/components/`.

**Import Guidelines**:
- Server code: Use domain barrel exports (`@/lib/newsletter`, `@/lib/email`)
- Client components: Import specific files (`@/lib/newsletter/constants`) to avoid bundling server dependencies
- Database operations: MUST use `@/lib/db/` prefix
- Never use relative imports (`../`) in src/lib; always use `@/lib/`

**Rationale**: Consistent import paths improve readability and prevent broken imports. Barrel exports simplify server-side imports while direct imports prevent server code bundling in client components.

### VI. German User-Facing Text
All user-facing text MUST be in German: error messages, validation messages, success messages, UI labels, form placeholders. Server-side logs and code comments MAY be in English.

**Rationale**: Target audience is German-speaking users. Consistent German text improves user experience.

### VII. Structured Logging
ALWAYS use `logger` from `@/lib/logger.ts` for server-side logging (API routes, server components, utilities). NEVER use `console.log` except for temporary debugging (remove before committing). Logger provides structured logging with levels (debug, info, warn, error, fatal) and supports context, tags, and module identification.

**Rationale**: Structured logging enables better error tracking, debugging, and monitoring in production.

### VIII. Server-Side Validation
ALWAYS validate user input on the server using Zod schemas from `src/lib/validation/`, even if client-side validation exists. Client-side validation (React Hook Form) is optional for UX. Server validation is mandatory for security.

**Rationale**: Client-side validation can be bypassed. Server-side validation is the only security barrier against malicious input.

### IX. Code Documentation
Write JSDoc comments for all functions using TypeScript conventions. Include parameter descriptions and return value descriptions. Code should be self-documenting; avoid unnecessary inline comments.

**Rationale**: JSDoc provides IDE autocomplete and type hints. Well-named variables and functions reduce the need for excessive comments.

### X. Domain-Based Architecture
Code in `src/lib/` MUST be organized by domain with clear separation of concerns. Each domain directory MUST contain an `index.ts` barrel export. Related functionality MUST be grouped together.

**Domain Structure**:
- **Business Domains**: `appointments/`, `groups/`, `antraege/`, `newsletter/` - domain-specific business logic
- **Infrastructure**: `email/`, `ai/`, `analytics/`, `auth/` - cross-cutting technical concerns
- **Data Access**: `db/` - **ALL Prisma database operations MUST be here**
- **Supporting**: `hooks/`, `validation/`, `blob-storage/`, `form-submission/` - shared utilities
- **Core Utilities**: Root-level files (logger.ts, errors.ts, date-utils.ts, etc.) - fundamental utilities

**Database Layer Rules** (NON-NEGOTIABLE):
1. ALL Prisma database queries MUST be in `src/lib/db/*-operations.ts` files
2. Business logic files MUST NOT contain direct Prisma queries
3. API routes MUST call db operations, never direct Prisma
4. Each entity gets one file: `{entity}-operations.ts`
5. Functions named semantically: `findUserById`, `createAppointment`, `updateGroupStatus`

**Other Rules**:
1. Cross-cutting concerns (email, auth, analytics) MUST be in dedicated infrastructure directories
2. Client components importing from `src/lib/` MUST import specific files, NOT barrel exports with server-only code

**Rationale**: Domain-based organization improves navigability and reduces cognitive load. Centralizing ALL database operations in `src/lib/db/` enforces strict separation between data access and business logic, making the codebase easier to maintain and test manually.

### XI. Centralized Type Definitions
All TypeScript interfaces, types, and type definitions MUST be defined centrally in `src/types/`. Before creating any new interface or type, MUST check existing type files for reusable definitions. Duplicate interface definitions are PROHIBITED.

**Type Files**:
- `api-types.ts` - API request/response types, server-side data structures
- `component-types.ts` - React component props, UI-related types
- `form-types.ts` - Form data types, validation types
- `email-types.ts` - Email-related types
- `newsletter-types.ts` - Newsletter-specific types
- `user.ts` - User and authentication types

**Rules**:
1. MUST search `src/types/` before defining new interfaces
2. MUST reuse existing types through imports: `import type { SomeType } from '@/types/api-types'`
3. If similar types exist, extend or compose them rather than duplicate
4. Only create domain-specific types when exclusively used within that domain
5. When refactoring, consolidate duplicate types

**Rationale**: Centralized type definitions prevent duplicate definitions, reduce inconsistency risks, and improve type compatibility. Single source of truth for types makes refactoring safer.

## Development Workflow

### Command Usage
Use ONLY these commands to validate code:
- `npm run check` - Lint + typecheck (MUST run before committing)
- `npm run lint` - ESLint check only
- `npm run lint:fix` - Auto-fix ESLint issues
- `npm run typecheck` - TypeScript type checking only

NEVER run `npm run build` or `npm run db:push` solely to validate changes.

### Workflow Steps
1. Add or change code following domain-based architecture
2. Run `npm run check` to validate
3. Fix any errors reported
4. Changes are validated manually by a human

**Rationale**: Streamlined validation catches type errors and linting issues quickly without full builds.

## Quality Standards

### Database Conventions
- Models use lowercase table names: `@@map("table_name")`
- IDs: `Int @id @default(autoincrement())` for simple models, `String @id @default(cuid())` for complex entities
- Status fields: uppercase enums (`GroupStatus`, `AntragStatus`) with values like `NEW`, `ACTIVE`, `ARCHIVED`
- JSON storage: `String` or `String @db.Text` for flexible metadata
- Always use singleton Prisma instance from `src/lib/db/prisma.ts`
- **ALL database operations MUST be in `src/lib/db/*-operations.ts` files**

### Form Submission Pattern
- Client: Use `submitForm()` utility from `src/lib/form-submission/submit-form.ts`
- Server: API routes validate with Zod, call database operations, return JSON
- File uploads: Use FormData with image compression (`react-image-crop`, `sharp`)

### Error Handling
- Use custom error types from `src/lib/errors.ts`
- Always provide German error messages for users
- Log all errors with structured context using logger
- Return appropriate HTTP status codes (400 for validation, 500 for server errors)

### Technology Stack
- Next.js 15+ with App Router (no Pages Router)
- TypeScript in strict mode
- Prisma for database access (PostgreSQL)
- Material UI (MUI) for components
- React Hook Form + Zod for forms
- Vercel Blob for file storage
- NextAuth.js for authentication

## Governance

### Amendment Process
Constitution changes MUST be documented with version increments following semantic versioning:
- MAJOR: Principle removals or incompatible changes
- MINOR: New principles or expanded guidance
- PATCH: Clarifications or wording improvements

### Compliance Review
All code changes MUST comply with these principles. When principles conflict with requirements, the simplest compliant solution MUST be chosen.

### Constitution Authority
This constitution supersedes conflicting guidance. When in doubt, consult this document.

**Version**: 2.0.0 | **Ratified**: 2025-10-06 | **Last Amended**: 2025-11-01
