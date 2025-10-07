<!--
SYNC IMPACT REPORT
Version: 1.0.0 → 1.1.0 (MINOR: Added domain-based architecture principle)
Modified Principles:
  - V. Path Aliases and Conventions → Expanded with domain-based architecture rules
  - IX. File Size Limit → Added reference to domain organization
Added Sections:
  - XI. Domain-Based Architecture (new principle)
  - Domain Organization Standards (new quality standard section)
  - Barrel Export Guidelines (new quality standard section)
Removed Sections: None
Templates Requiring Updates:
  ✅ plan-template.md - Already references domain structure in Phase 1
  ✅ spec-template.md - Already aligned with modular design
  ✅ tasks-template.md - Already includes domain organization tasks
  ⚠ CLAUDE.md - Should reference new domain structure (manual update recommended)
Follow-up TODOs:
  - Update CLAUDE.md to document new domain-based src/lib structure
  - Consider adding domain architecture diagram to documentation
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

**Import Guidelines**:
- Use domain barrel exports for server code: `@/lib/newsletter`, `@/lib/email`
- Import specific files for client components to avoid bundling server dependencies: `@/lib/newsletter/constants`
- All database operations MUST use `@/lib/db/` prefix
- Never use relative imports (`../`) in src/lib; always use `@/lib/` aliases

**Rationale**: Consistent import paths improve code readability and prevent broken imports during refactoring. The established project structure must be maintained for clarity. Barrel exports simplify server-side imports while direct imports prevent server code from being bundled in client components.

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
NEVER create a file longer than 500 lines of code. If a file approaches this limit, refactor by splitting into modules or helper files. Organize code into clearly separated modules grouped by feature or responsibility following the domain-based architecture (see Principle XI).

**Rationale**: Large files are difficult to navigate, understand, and maintain. Smaller, focused modules improve code organization and team collaboration. The 500-line limit enforces modular design and prevents monolithic files.

### X. Code Documentation
Write JSDoc comments for all functions using TypeScript conventions. Include parameter descriptions and return value descriptions. Do NOT add unnecessary inline comments. Code following clean code practices should be self-documenting and readable without excessive comments.

**Rationale**: JSDoc provides IDE autocomplete and type hints. Well-named variables and functions reduce the need for inline comments. Documentation should focus on "why" rather than "what" (which should be obvious from the code).

### XI. Domain-Based Architecture
Code in `src/lib/` MUST be organized by domain with clear separation of concerns. Each domain directory MUST contain an `index.ts` barrel export for convenient imports. Related functionality MUST be grouped together.

**Domain Structure**:
- **Business Domains**: `appointments/`, `groups/`, `antraege/`, `newsletter/` - domain-specific business logic
- **Infrastructure**: `email/`, `ai/`, `analytics/`, `auth/` - cross-cutting technical concerns
- **Data Access**: `db/` - ALL Prisma database operations consolidated here
- **Supporting**: `hooks/`, `validation/`, `blob-storage/`, `form-submission/` - shared utilities
- **Core Utilities**: Root-level files (logger.ts, errors.ts, date-utils.ts, file-utils.ts, base-url.ts, image-compression.ts) - fundamental utilities used everywhere

**Rules**:
1. All Prisma database queries MUST be in `db/*-operations.ts` files
2. Business logic files MUST NOT contain direct Prisma queries (call db operations instead)
3. Each domain MUST have focused service files under 500 lines
4. Cross-cutting concerns (email, auth, analytics) MUST be in dedicated infrastructure directories
5. Client components importing from `src/lib/` MUST import specific files, NOT barrel exports that include server-only code

**Rationale**: Domain-based organization improves code navigability, reduces cognitive load, and enforces clear boundaries between business logic and data access. Separating infrastructure from domains prevents tight coupling. The 500-line file limit combined with domain organization ensures the codebase remains maintainable as it grows.

## Development Workflow

### Command Usage
Use ONLY the following commands to validate changed code:
- `npm run check` - Run lint + typecheck (MUST run before committing)
- `npm run lint` - ESLint check only
- `npm run lint:fix` - Auto-fix ESLint issues
- `npm run typecheck` - TypeScript type checking only

NEVER run `npm run build` or `npm run db:push` solely to validate changes. Database changes are validated separately by humans.

### Workflow Steps
1. Add or change code following domain-based architecture
2. Run `npm run check` to validate
3. Fix any errors reported
4. Changes are validated manually by a human

**Rationale**: The validation workflow is streamlined to catch type errors and linting issues quickly without full builds. Production builds and database migrations are managed separately as part of deployment.

## Quality Standards

### Domain Organization Standards
**Business Domain Structure** (appointments, groups, antraege, newsletter):
- Service files: CRUD operations, business logic, orchestration
- Each service file: Single responsibility, under 500 lines
- Utilities: Domain-specific helper functions
- Constants: Domain-specific configuration values
- Validation: Domain-specific Zod schemas (if not in central validation/)

**Infrastructure Domain Structure** (email, ai, analytics, auth):
- Service files: Core functionality used across multiple business domains
- Configuration files: Settings, constants, prompts
- Utilities: Infrastructure-specific helpers
- NO business logic - infrastructure provides services, not domain rules

**Database Layer** (db/):
- MUST contain ALL Prisma database operations
- One file per entity: `{entity}-operations.ts`
- Functions named semantically: `findUserById`, `createAppointment`, `updateGroupStatus`
- NO business logic - pure data access functions
- Files organized alphabetically for easy discovery

**Supporting Utilities**:
- `hooks/`: React hooks for client components
- `validation/`: Zod schemas for server-side validation
- `blob-storage/`: File upload/download utilities
- `form-submission/`: Form submission helpers
- Root utilities: logger, errors, date-utils, file-utils (used everywhere)

### Barrel Export Guidelines
**Purpose**: Barrel exports (`index.ts` files) simplify imports and provide backward compatibility during refactoring.

**Rules**:
1. Every domain directory MUST have an `index.ts` barrel export
2. Barrel exports MUST re-export all public functions from the domain
3. Server-side code MAY use barrel exports: `import { fn } from '@/lib/domain'`
4. Client components MUST NOT import barrel exports containing server-only code
5. Client components MUST import specific files: `import { CONSTANT } from '@/lib/domain/constants'`

**Server-Only Code Includes**:
- Prisma database operations
- Node.js APIs (fs, child_process, net)
- Server libraries (Sharp, Nodemailer, etc.)

**Client-Safe Code Includes**:
- Constants and configuration
- Type definitions
- Validation schemas (Zod)
- Utility functions with no server dependencies

**Example Patterns**:
```typescript
// ✅ Server code (API routes, server components)
import { getNewsletterSettings } from '@/lib/newsletter';

// ✅ Client component - specific file import
import { NEWSLETTER_LIMITS } from '@/lib/newsletter/constants';

// ❌ Client component - barrel export (if it includes server code)
import { NEWSLETTER_LIMITS } from '@/lib/newsletter'; // BAD: Bundles server code
```

**Rationale**: Barrel exports improve developer experience and reduce import clutter. However, Next.js bundles everything in the dependency tree, so client components must avoid importing server-only code. Direct imports solve this while maintaining clean server-side code.

### Database Conventions
- Models use lowercase table names: `@@map("table_name")`
- IDs: `Int @id @default(autoincrement())` for simple models, `String @id @default(cuid())` for complex entities
- Status fields: uppercase enums (`GroupStatus`, `AntragStatus`) with values like `NEW`, `ACTIVE`, `ARCHIVED`
- JSON storage: `String` or `String @db.Text` fields for flexible metadata
- Always use singleton Prisma instance from `src/lib/db/prisma.ts`
- ALL database operations MUST be in `db/*-operations.ts` files

**Rationale**: Consistent database patterns prevent errors and improve maintainability. The singleton Prisma pattern prevents connection issues during development HMR. Centralizing database operations in db/ enforces separation between data access and business logic.

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

**Version**: 1.1.0 | **Ratified**: 2025-10-06 | **Last Amended**: 2025-10-07
