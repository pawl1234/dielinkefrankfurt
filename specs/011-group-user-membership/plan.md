# Implementation Plan: Group User Membership & Responsible Person Management

**Branch**: `011-group-user-membership` | **Date**: 2025-11-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/011-group-user-membership/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Add capability for authenticated users to join groups as members and assign user accounts as responsible persons. Users can self-join active groups, responsible persons receive email notifications for new members, and responsible persons can edit their groups and manage members. User portal will feature a new "Gruppen" section with tabs for browsing all groups and viewing user's groups, plus dedicated group detail pages with member management. Maintains backwards compatibility with existing email-based responsible persons.

## Technical Context

**Language/Version**: TypeScript 5.9.2 (strict mode)
**Primary Dependencies**: Next.js 15.4.6 (App Router), React 19.2.0, Material UI 7.3.1, Prisma 6.13.0, NextAuth.js 4.24.11, React Hook Form 7.62.0, Zod 4.0.17
**Storage**: PostgreSQL via Prisma ORM, Vercel Blob Storage for images
**Testing**: Manual testing only (no automated tests per project policy)
**Target Platform**: Web application deployed on Vercel
**Project Type**: Web (Next.js fullstack with separated frontend/backend concerns)
**Performance Goals**: <1s search response, <2s page load, <5s member join workflow, <2min email notification delivery
**Constraints**: Must maintain backwards compatibility with existing email-based responsible persons, member tables must support up to 500 members without performance degradation
**Scale/Scope**: ~10 new API endpoints, 2 new database models, 5-7 new UI pages/components, estimated 15-20 new files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

This feature MUST comply with the project constitution at `.specify/memory/constitution.md`. Review all 11 core principles and ensure compliance:

| Principle | Requirement | Compliance Status |
|-----------|-------------|-------------------|
| I. Type Safety First | No `any` type; use strict TypeScript; reuse types from `src/types/` | ✅ Will use strict types, extend User/Group types |
| II. No Software Tests | Do NOT create test files or testing infrastructure | ✅ Manual testing only, no test files |
| III. KISS Principle | Simplest solution preferred; avoid over-engineering | ✅ Direct join/leave, simple member table, reuse existing patterns |
| IV. DRY Principle | Check existing solutions first: `src/lib/`, `src/types/`, `src/components/`, `src/app/api/` | ✅ Will reuse group UI patterns, email infrastructure, form patterns |
| V. Path Aliases | Use `@/` imports; follow Next.js conventions | ✅ All imports will use `@/` prefix |
| VI. German User-Facing Text | All UI text MUST be in German | ✅ All UI labels/messages in German (Gruppen, Beitreten, Mitglieder, etc.) |
| VII. Structured Logging | Use `logger` from `@/lib/logger.ts` (no `console.log`) | ✅ Will use logger for all server-side operations |
| VIII. Server-Side Validation | MUST validate with Zod schemas from `src/lib/validation/` | ✅ Will create Zod schemas for join/assignment operations |
| IX. Code Documentation | JSDoc for all functions; avoid excessive comments | ✅ JSDoc for all new functions |
| X. Domain-Based Architecture | ALL db operations in `src/lib/db/`; organize by domain | ✅ New: `src/lib/db/group-member-operations.ts`, extend `group-operations.ts` |
| XI. Centralized Types | Check `src/types/` before creating new types; no duplicates | ✅ Will extend existing types, add minimal new types as needed |

**Validation Commands**:
- MUST run `npm run check` before committing (runs lint + typecheck)
- NEVER run `npm run build` or `npm run db:push` solely for validation

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── api/
│   │   ├── portal/
│   │   │   └── groups/
│   │   │       ├── route.ts               # [NEW] List groups (all/my views)
│   │   │       ├── join/route.ts          # [NEW] User joins group
│   │   │       ├── leave/route.ts         # [NEW] User leaves group
│   │   │       └── [groupId]/
│   │   │           ├── route.ts           # [NEW] Group detail
│   │   │           └── members/route.ts   # [NEW] List/remove members
│   │   └── admin/
│   │       └── groups/
│   │           └── [groupId]/
│   │               └── responsible/route.ts # [NEW] Assign/remove responsible users
│   ├── admin/
│   │   └── groups/page.tsx                # [EXTEND] Add user assignment UI
│   └── portal/
│       ├── gruppen/
│       │   ├── page.tsx                   # [NEW] Main groups page (tabs)
│       │   └── [groupId]/
│       │       ├── page.tsx               # [NEW] Group detail overview
│       │       ├── mitglieder/page.tsx    # [NEW] Members table
│       │       ├── bearbeiten/page.tsx    # [NEW] Edit group (responsible only)
│       │       └── layout.tsx             # [NEW] Group submenu layout
│       └── page.tsx                       # [EXISTING] Portal home
├── components/
│   ├── portal/
│   │   ├── GroupsList.tsx                 # [NEW] Reusable groups list
│   │   ├── GroupMembersTable.tsx          # [NEW] Members table component
│   │   └── GroupEditForm.tsx              # [NEW] Group editing form
│   └── admin/
│       └── groups/
│           └── ResponsibleUserSelector.tsx # [NEW] User assignment selector
├── lib/
│   ├── db/
│   │   ├── group-member-operations.ts     # [NEW] Member CRUD operations
│   │   ├── group-operations.ts            # [EXTEND] Add responsible user queries
│   │   └── user-operations.ts             # [EXTEND] User lookup for assignment
│   ├── groups/
│   │   ├── permissions.ts                 # [NEW] Check responsible person access
│   │   └── member-notifications.ts        # [NEW] Email notifications for joins
│   ├── validation/
│   │   └── group-schema.ts                # [EXTEND] Add member/responsible schemas
│   └── email/
│       └── templates/                     # [EXTEND] Add member join notification
└── types/
    ├── api-types.ts                       # [EXTEND] Add member/responsible types
    └── component-types.ts                 # [EXTEND] Add portal component types

prisma/
└── schema.prisma                          # [EXTEND] Add GroupMember, GroupResponsibleUser
```

**Structure Decision**: Next.js App Router web application. New functionality organized by domain:
- Database operations in `src/lib/db/` (strict separation)
- Business logic in `src/lib/groups/`
- **Portal API routes** in `src/app/api/portal/groups/` (protected by portal middleware)
- **Admin API routes** in `src/app/api/admin/groups/` (protected by admin middleware)
- Portal UI in `src/app/portal/gruppen/`
- Admin extensions in `src/app/admin/groups/`
- Reusable components in `src/components/portal/`

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**No constitutional violations identified.** All design decisions comply with project constitution principles:

- ✅ Type safety maintained throughout
- ✅ Simple, direct implementation (no over-engineering)
- ✅ Reuses existing patterns and infrastructure
- ✅ All database operations properly separated in `src/lib/db/`
- ✅ Domain-based architecture followed
- ✅ No new dependencies required

## Post-Design Constitution Re-Check

After completing Phase 1 design (research, data model, API contracts, quickstart), re-evaluating constitution compliance:

| Principle | Post-Design Status | Notes |
|-----------|-------------------|-------|
| I. Type Safety First | ✅ PASS | All types defined in contracts, no `any` usage planned |
| II. No Software Tests | ✅ PASS | Manual testing checklist in quickstart.md |
| III. KISS Principle | ✅ PASS | Simple junction tables, direct API endpoints, no abstractions |
| IV. DRY Principle | ✅ PASS | Reusing email infrastructure, group UI patterns, form patterns |
| V. Path Aliases | ✅ PASS | All imports use `@/` prefix per design |
| VI. German User-Facing Text | ✅ PASS | All API errors and UI text in German per contracts |
| VII. Structured Logging | ✅ PASS | Logger usage specified in all API routes |
| VIII. Server-Side Validation | ✅ PASS | Zod schemas defined for all endpoints |
| IX. Code Documentation | ✅ PASS | JSDoc specified for all database operations |
| X. Domain-Based Architecture | ✅ PASS | New files properly organized: `db/`, `groups/`, clear separation |
| XI. Centralized Types | ✅ PASS | Types defined in `api-types.ts`, reusing existing types |

**GATE STATUS**: ✅ **PASSED** - Ready to proceed to Phase 2 (task generation)
