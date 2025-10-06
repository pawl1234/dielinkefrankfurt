# Feature Specification: Code Organization Refactoring for src/lib

**Feature Branch**: `001-i-want-to`
**Created**: 2025-10-06
**Status**: Draft
**Input**: User description: "I want to reorganize the code in @src/lib there are currently many files in the root directory and then there are files in some sub directory. I would like to optimize the code organization to make it easier to navigate the code. I think there are different patterns spread across the files like a file including database operations even there is src/lib/db folder. Also there are files domain related but not gather together. I want you to analyse the code files and the relationship to each other. Then propose a file system structure which supports this project. The next step is to refactor the code to be organized across the new structure. Also while analysing the code you can find what code is contradicting current project standards defined in the claude.md or the constitution.md My goal is to refactor to code while keeping the current application code intact."

## Execution Flow (main)
```
1. Parse user description from Input
   → Identified: Reorganize src/lib directory structure
2. Extract key concepts from description
   → Actors: Developers navigating codebase
   → Actions: Analyze files, reorganize structure, refactor code
   → Data: Source files in src/lib
   → Constraints: Keep application code intact, follow CLAUDE.md standards
3. For each unclear aspect:
   → File size targets for new modules: Use <500 line standard from CLAUDE.md
   → Database operation patterns: Move all to src/lib/db/ as per CLAUDE.md
4. Fill User Scenarios & Testing section
   → Developer navigation improved, standards compliance verified
5. Generate Functional Requirements
   → All requirements testable via manual code inspection
6. Identify Key Entities
   → Files, directories, code modules
7. Run Review Checklist
   → No implementation details in spec
   → All requirements clear and testable
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT developers need and WHY
- ❌ Avoid HOW to implement (no specific refactoring steps)
- 👥 Written for technical stakeholders maintaining code quality

---

## User Scenarios & Testing

### Primary User Story
As a developer working on the newsletter management system, I need to easily locate and navigate code files related to specific features (appointments, newsletters, groups, etc.) so that I can make changes efficiently without searching through dozens of unorganized files. The code organization should follow the project's documented standards from CLAUDE.md, with clear separation of concerns and all database operations properly located in the db/ folder.

### Acceptance Scenarios

1. **Given** a developer needs to modify appointment-related code, **When** they navigate to src/lib, **Then** they should find all appointment code grouped together in a clear directory structure

2. **Given** a developer needs to add a new database operation, **When** they look for where to place it, **Then** they should find a clear pattern in src/lib/db/ with existing operations organized by domain

3. **Given** a developer is reviewing the codebase for standards compliance, **When** they check file sizes, **Then** no file should exceed 500 lines as per CLAUDE.md standards

4. **Given** a developer searches for database operations, **When** they examine files outside src/lib/db/, **Then** they should not find any Prisma queries mixed into service or handler files

5. **Given** a developer needs to understand newsletter functionality, **When** they navigate to the newsletter section, **Then** they should find related files grouped by subfeature (sending, analytics, templates) rather than mixed together

6. **Given** a developer reviews logging practices, **When** they search for console.log/console.error, **Then** they should find only logger usage from @/lib/logger as per CLAUDE.md standards

### Edge Cases
- What happens when refactored files have import path changes? All imports across the entire application must be updated to reflect new paths
- How does the system ensure no functionality breaks during reorganization? Application behavior must remain identical - only file locations and imports change
- What if circular dependencies are discovered during reorganization? Dependencies must be restructured to eliminate circular imports

---

## Requirements

### Functional Requirements

#### Code Organization Structure

- **FR-001**: System MUST organize all domain-specific code (appointments, groups, anträge, newsletters, email, ai, analytics, auth) into separate subdirectories under src/lib

- **FR-002**: System MUST consolidate all database operations into src/lib/db/ directory with files named by domain (e.g., appointment-operations.ts, group-operations.ts, newsletter-operations.ts)

- **FR-003**: System MUST organize newsletter-related code into logical subgroups (services, sending, analytics, templates) due to the complexity of this domain

- **FR-003a**: System MUST organize all email-related functionality (sending, rendering, templates, attachments) in a dedicated src/lib/email/ directory to serve as cross-cutting infrastructure for all domains

- **FR-003b**: System MUST organize all AI-related functionality (services, prompts, models) in a unified src/lib/ai/ directory, with domain-specific prompts and logic organized as internal modules within this directory

- **FR-004**: System MUST group all React hooks under src/lib/hooks/ directory

- **FR-005**: System MUST maintain existing well-organized subdirectories (blob-storage/, validation/, form-submission/) in their current structure

- **FR-006**: System MUST keep core utility files (logger, errors, base-url, date-utils, file-utils, prisma, etc.) at src/lib/ root level for easy discovery and short import paths

#### File Size Compliance

- **FR-007**: System MUST ensure no file exceeds 500 lines of code as specified in CLAUDE.md standards

- **FR-008**: System MUST split the following oversized files into smaller, focused modules:
  - newsletter-service.ts (currently 1,236 lines)
  - group-handlers.ts (currently 1,029 lines)
  - appointment-handlers.ts (currently 996 lines)

- **FR-009**: Each split module MUST maintain a single, clear responsibility (e.g., settings management, CRUD operations, utilities)

#### Standards Compliance

- **FR-010**: System MUST eliminate all direct database operations (Prisma queries) from files outside src/lib/db/ directory

- **FR-011**: System MUST replace all console.log/console.error/console.warn usage with logger from @/lib/logger as per CLAUDE.md logging conventions

- **FR-012**: System MUST separate concerns currently mixed in handler files (CRUD operations, file management, email notifications should be in separate modules)

- **FR-013**: System MUST maintain language conventions - all user-facing text in German, internal logs and comments in English

#### Code Integrity

- **FR-014**: System MUST preserve all existing functionality - no behavior changes, only structural reorganization

- **FR-015**: System MUST update all import paths across the entire application to reflect new file locations

- **FR-016**: System MUST maintain all existing TypeScript type definitions and interfaces without changes

- **FR-017**: System MUST preserve all existing exports from reorganized files

- **FR-017a**: System MUST use barrel exports (index.ts files) in each domain directory to re-export functions from split modules, minimizing breaking changes to existing import paths

- **FR-018**: System MUST eliminate circular dependencies identified during analysis (newsletter-service ↔ email-senders)

#### Validation & Quality

- **FR-019**: Refactored code MUST pass `npm run check` (lint + typecheck) without errors

- **FR-020**: System MUST maintain all existing import path aliases (@/ prefix)

- **FR-021**: System MUST not introduce new dependencies or change package.json

- **FR-022**: System MUST preserve all JSDoc comments and code documentation

#### Execution Strategy

- **FR-023**: Refactoring MUST be executed incrementally by domain (newsletter, appointments, groups, anträge, etc.) with each domain completed, verified with `npm run check`, and committed separately before proceeding to the next domain

### Key Entities

- **Source Files**: TypeScript files in src/lib requiring reorganization (62 files, 12,635 total lines)

- **Directory Structure**: Logical grouping of files by domain and responsibility
  - Domain directories: appointments/, groups/, antraege/, newsletter/
  - Cross-cutting directories: email/ (sending, rendering, templates, attachments), ai/ (AI services)
  - Infrastructure directories: db/, hooks/, utilities/
  - Existing directories: blob-storage/, validation/, form-submission/

- **Code Modules**: Individual responsibilities extracted from oversized files
  - Newsletter modules: settings service, preview service, draft service, archive service, sending coordinator, SMTP service, analytics service
  - Appointment modules: service (CRUD), utilities, metadata handling
  - Group modules: group service, status report service, utilities

- **Import Paths**: References to files that must be updated application-wide

- **Database Operations**: Prisma queries that must be moved to db/ directory (identified in 10 files currently outside db/)

- **Standards Violations**: Code patterns contradicting CLAUDE.md/constitution.md
  - Files over 500 lines (3 files)
  - Database operations outside db/ (10 files)
  - Console usage instead of logger (6 files)
  - Misplaced client-side code (1 file)
  - Mixed concerns in handlers (5 files)

---

## Review & Acceptance Checklist

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for technical stakeholders
- [x] All mandatory sections completed
- [x] User-facing text considerations in German (preserved in refactoring)

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are verifiable through manual testing (code inspection)
- [x] Success criteria are measurable (file count, line count, standards compliance)
- [x] Scope is clearly bounded (src/lib directory only)
- [x] Dependencies and assumptions identified (must update imports application-wide)
- [x] Aligned with constitution principles (simplicity, no automated tests, maintainability)

---

## Execution Status

- [x] User description parsed
- [x] Key concepts extracted (reorganize, separate domains, move DB operations, fix violations)
- [x] Ambiguities marked (none - standards are clear in CLAUDE.md)
- [x] User scenarios defined (developer navigation and maintenance)
- [x] Requirements generated (26 functional requirements)
- [x] Entities identified (files, directories, modules, imports, violations)
- [x] Review checklist passed

---

## Clarifications

### Session 2025-10-06

- Q: The refactoring involves 62 files across multiple domains (newsletter, appointments, groups, etc.). Should this be executed incrementally or atomically? → A: Incremental by domain - Refactor one domain at a time (e.g., newsletter first, then appointments), commit after each domain is complete and verified
- Q: Some files serve multiple domains (e.g., email-senders.ts sends emails for appointments, groups, and newsletters). How should cross-cutting files be organized? → A: Create dedicated email/ directory - Group all email-related functionality (sending, rendering, templates) in a separate email/ domain directory
- Q: When splitting large files (newsletter-service.ts: 1,236 lines → multiple modules), how should exports be handled to minimize breaking changes? → A: Barrel exports via index.ts - Create domain index.ts files that re-export all functions from split modules, preserving original import paths
- Q: The AI-related files (ai-service.ts, ai-prompts.ts, ai-models.ts) currently mix newsletter-specific logic with general AI capabilities. How should these be organized? → A: Keep unified in ai/ directory - All AI functionality stays together in src/lib/ai/, with domain-specific prompts/logic as internal modules
- Q: Utility files (logger.ts, errors.ts, base-url.ts, date-utils.ts, file-utils.ts, prisma.ts, etc.) are used across all domains. Where should these be placed? → A: Keep at src/lib/ root - Leave core utilities at the root level for easy discovery and short import paths

---

## Analysis Summary

### Current State
- **Total files in src/lib**: 62 files
- **Total lines of code**: 12,635 lines
- **Current subdirectories**: 5 (blob-storage, db, form-submission, validation, hooks)
- **Files in root**: 47 files (too many for easy navigation)

### Identified Issues
1. **3 files exceed 500-line limit** (newsletter-service: 1,236 lines, group-handlers: 1,029 lines, appointment-handlers: 996 lines)
2. **10 files have database operations outside db/** (violates CLAUDE.md architecture)
3. **5 files mix multiple concerns** (CRUD + email + file cleanup in same file)
4. **6 files use console instead of logger** (violates CLAUDE.md logging standards)
5. **1 client hook misplaced** (useApiError.ts in root instead of hooks/)
6. **Domain-related files scattered** (newsletter files not grouped, appointment/group handlers separate from related code)

### Expected Outcome
- Organized directory structure by domain (appointments/, groups/, antraege/, newsletter/, email/, ai/)
- All database operations in src/lib/db/ organized by domain
- All files under 500 lines
- All console usage replaced with logger
- Clear separation of concerns (services, operations, utilities)
- Improved developer navigation and code maintainability
- Full compliance with CLAUDE.md standards
