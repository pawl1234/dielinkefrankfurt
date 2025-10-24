# Implementation Plan: Admin-Managed FAQ System for Member Portal

**Branch**: `009-admin-portal-faq` | **Date**: 2025-10-23 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/009-admin-portal-faq/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Build an admin-managed FAQ system for the member portal that allows administrators to create, edit, archive, and delete FAQ entries through a CMS-like interface in the admin portal. Members with authenticated access can browse and search these FAQ entries in the portal. The system will use Next.js 15 with App Router, TypeScript strict mode, Material UI components, Prisma for PostgreSQL database access, and implement role-based access control at both middleware and database layers following the data access layer pattern.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Next.js 15 (App Router), React 18, Material UI (MUI) v5, NextAuth.js v4, Prisma ORM, React Hook Form, Zod, TipTap (existing RichTextEditor component)
**Storage**: PostgreSQL via Prisma ORM
**Testing**: Manual testing only (no automated tests per project policy)
**Target Platform**: Web application (Linux server deployment via Vercel)
**Project Type**: Web application with separate admin and member portal interfaces
**Performance Goals**: <2 seconds for all CRUD operations; <300ms for search filtering; support concurrent editing by multiple admins
**Constraints**: 200-character title limit; 10,000-character content limit; 100-character search query limit; role-based access control required; all user-facing text in German
**Scale/Scope**: Estimated 10-50 FAQ entries initially; ~5 admin users managing content; ~100-500 authenticated members viewing content; single database table with relationships to User model

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

This feature MUST comply with the project constitution at `.specify/memory/constitution.md`. Review all 12 core principles and ensure compliance:

| Principle | Requirement | Compliance Status |
|-----------|-------------|-------------------|
| I. Type Safety First | No `any` type; use strict TypeScript; reuse types from `src/types/` | ✅ Will define FaqEntry types in `src/types/api-types.ts`; reuse User types |
| II. No Software Tests | Do NOT create test files or testing infrastructure | ✅ Manual testing only - no test files |
| III. KISS Principle | Simplest solution preferred; avoid over-engineering | ✅ Simple CRUD with status transitions; reusing existing patterns from groups management |
| IV. DRY Principle | Reuse existing code from `src/lib/`, `src/types/`, `src/components/` | ✅ Reusing RichTextEditor, accordion pattern, SafeHtml, form utilities, existing auth |
| V. Path Aliases | Use `@/` imports; follow Next.js conventions | ✅ All imports use `@/` prefix; API in `app/api/`, pages in `app/` |
| VI. German User-Facing Text | All UI text MUST be in German | ✅ All labels, errors, messages in German (e.g., "Neue FAQ erstellen", "Archivieren") |
| VII. Structured Logging | Use `logger` from `@/lib/logger.ts` (no `console.log`) | ✅ Log failures/errors per spec requirement using structured logger |
| VIII. Server-Side Validation | MUST validate with Zod schemas from `src/lib/validation/` | ✅ Create `faq-schema.ts` in `src/lib/validation/`; validate all API endpoints |
| IX. File Size Limit | NO file over 500 lines; split into modules if needed | ✅ Separate files: API routes, admin page, portal page, DB operations, components |
| X. Code Documentation | JSDoc for all functions; avoid excessive comments | ✅ JSDoc for all public functions in DB operations and utilities |
| XI. Domain-Based Architecture | Organize by domain; DB operations in `db/`; follow structure | ✅ Create `src/lib/db/faq-operations.ts` for DB; FAQ logic minimal (CRUD only) |
| XII. Centralized Types | Check `src/types/` before creating new types; no duplicates | ✅ Add to existing `src/types/api-types.ts`; reuse User, session types |

**Validation Commands**:
- MUST run `npm run check` before committing (runs lint + typecheck)
- NEVER run `npm run build` or `npm run db:push` solely for validation

**Constitutional Compliance Summary**: ✅ ALL PRINCIPLES SATISFIED
- No violations requiring justification
- All patterns follow existing project conventions
- Reuses established components and utilities
- Follows domain-based architecture with clear separation of concerns

**Post-Design Re-Evaluation** (Phase 1 Complete):
After completing Phase 1 design (data-model, API contracts, quickstart), all constitutional principles remain satisfied:

✅ **Type Safety**: All types defined in central type files; no `any` types used
✅ **No Tests**: Manual testing only - no test infrastructure created
✅ **KISS**: Simple CRUD operations; no over-engineering; reuses existing patterns
✅ **DRY**: Reuses RichTextEditor, SafeHtml, AdminPagination, accordion patterns, auth middleware
✅ **Path Aliases**: All imports use `@/` prefix; follows Next.js conventions
✅ **German Text**: All user-facing messages in German (validated in quickstart)
✅ **Structured Logging**: Uses `logger` from `@/lib/logger.ts` for all error logging
✅ **Server Validation**: All inputs validated with Zod schemas in API routes
✅ **File Size**: Design ensures separation (API routes, DB operations, components) - all under 500 lines
✅ **Documentation**: JSDoc comments specified for all database operations
✅ **Domain Architecture**: Database operations in `db/faq-operations.ts`; validation in `validation/faq-schema.ts`
✅ **Centralized Types**: All FAQ types added to existing `src/types/api-types.ts` and `component-types.ts`

**Design Validation**: ✅ PASSED
- Design phase complete with zero constitutional violations
- All artifacts follow project conventions
- Implementation can proceed to Phase 2 (/speckit.tasks)

## Project Structure

### Documentation (this feature)

```text
specs/009-admin-portal-faq/
├── plan.md              # This file (/speckit.plan command output)
├── spec.md              # Feature specification (already exists)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

This is a web application with Next.js App Router structure. The FAQ feature will be integrated into the existing codebase following the established domain-based architecture:

```text
src/
├── app/                                    # Next.js App Router
│   ├── api/
│   │   └── faq/                           # NEW: FAQ API routes
│   │       ├── route.ts                   # GET (list), POST (create)
│   │       └── [id]/
│   │           └── route.ts               # GET (single), PATCH (update), DELETE
│   ├── admin/
│   │   └── faq/                           # NEW: Admin FAQ management page
│   │       └── page.tsx                   # Admin CRUD interface with accordion/tabs
│   └── portal/
│       ├── layout.tsx                     # MODIFY: Add FAQ to navigation
│       └── faq/                           # NEW: Member FAQ viewing page
│           └── page.tsx                   # Member accordion + search
│
├── components/
│   ├── admin/
│   │   └── FaqManagement.tsx              # NEW: Admin FAQ component (accordion, forms)
│   └── portal/
│       └── FaqList.tsx                    # NEW: Member FAQ component (accordion, search)
│
├── lib/
│   ├── db/
│   │   └── faq-operations.ts              # NEW: All Prisma FAQ queries
│   └── validation/
│       └── faq-schema.ts                  # NEW: Zod schemas for FAQ validation
│
├── types/
│   └── api-types.ts                       # MODIFY: Add FaqEntry, FaqStatus types
│
└── prisma/
    └── schema.prisma                       # MODIFY: Add FaqEntry model
```

**Structure Decision**: Web application structure (Next.js App Router pattern)

The FAQ feature follows the existing project's domain-based architecture:
- **API routes** in `app/api/faq/` for RESTful endpoints
- **Admin interface** in `app/admin/faq/` matching groups management pattern
- **Member interface** in `app/portal/faq/` for authenticated viewing
- **Database operations** consolidated in `lib/db/faq-operations.ts`
- **Validation schemas** in `lib/validation/faq-schema.ts`
- **Types** added to existing `types/api-types.ts`
- **Components** split by role (admin vs portal) for clear separation

This structure ensures:
- Clear separation between admin and member functionality
- Database operations isolated from API and UI layers
- Reuse of existing auth middleware and component patterns
- Type safety through centralized type definitions
- Compliance with domain-based architecture principle (Constitution XI)

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**Status**: No constitutional violations identified. All design decisions follow existing project patterns and KISS/DRY principles.
