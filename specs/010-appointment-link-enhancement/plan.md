# Implementation Plan: Appointment Link Enhancement

**Branch**: `010-appointment-link-enhancement` | **Date**: 2025-10-26 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/010-appointment-link-enhancement/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

This feature enhances appointment sharing by implementing dynamic page titles, rich link previews (Open Graph meta tags), and slug-based URLs for new appointments. The implementation focuses on improving link sharing experience in messengers (WhatsApp, Telegram, Outlook) while maintaining backwards compatibility with existing numeric appointment URLs. Key technical approach:

- Use Next.js 15 `generateMetadata()` for dynamic page titles and Open Graph tags
- Generate URL-friendly slugs from appointment titles on admin acceptance (status change to "accepted")
- Support dual routing: `/termine/[id]` (legacy numeric) and `/termine/[id]-[slug]` (new format)
- Store slugs in a new optional `slug` field in the Appointment model
- Extract appointment ID from URL params for routing (slug is cosmetic)
- Provide default Open Graph image for appointments without cover images

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), Node.js 18+
**Primary Dependencies**: Next.js 15 (App Router), React 18, Material UI (MUI) v5, Prisma ORM (PostgreSQL), NextAuth.js v4
**Storage**: PostgreSQL via Prisma ORM, Vercel Blob Storage for images
**Testing**: Manual testing only (no automated tests per project policy)
**Target Platform**: Vercel deployment (Linux server, Node.js runtime)
**Project Type**: Web application (Next.js App Router with server/client components)
**Performance Goals**: Page load time increase <50ms for metadata generation, slug generation <10ms
**Constraints**: Backwards compatibility required for all existing numeric URLs, no breaking changes to public API
**Scale/Scope**: ~100-500 appointments, public-facing pages with social media sharing

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

This feature MUST comply with the project constitution at `.specify/memory/constitution.md`. Review all 12 core principles and ensure compliance:

| Principle | Requirement | Compliance Status |
|-----------|-------------|-------------------|
| I. Type Safety First | No `any` type; use strict TypeScript; reuse types from `src/types/` | ✅ Will use existing Appointment type from Prisma, create slug-related types in `@/types/api-types.ts` |
| II. No Software Tests | Do NOT create test files or testing infrastructure | ✅ Manual testing only - no test files |
| III. KISS Principle | Simplest solution preferred; avoid over-engineering | ✅ Using Next.js built-in `generateMetadata()`, simple slug generation utility |
| IV. DRY Principle | Reuse existing code from `src/lib/`, `src/types/`, `src/components/` | ✅ Reusing appointment-operations.ts, existing date-utils, component-types |
| V. Path Aliases | Use `@/` imports; follow Next.js conventions | ✅ All imports use `@/` prefix, follow App Router structure |
| VI. German User-Facing Text | All UI text MUST be in German | ✅ Error messages in German (e.g., "Termin nicht gefunden") |
| VII. Structured Logging | Use `logger` from `@/lib/logger.ts` (no `console.log`) | ✅ Error-only logging for slug generation failures |
| VIII. Server-Side Validation | MUST validate with Zod schemas from `src/lib/validation/` | ✅ API endpoint changes will use existing Zod validation |
| IX. File Size Limit | NO file over 500 lines; split into modules if needed | ✅ Creating focused files: slug-generator.ts (~50 lines), metadata utilities (~100 lines) |
| X. Code Documentation | JSDoc for all functions; avoid excessive comments | ✅ JSDoc for slug generation and metadata utilities |
| XI. Domain-Based Architecture | Organize by domain; DB operations in `db/`; follow structure | ✅ Slug logic in `@/lib/appointments/`, DB operations in `@/lib/db/appointment-operations.ts` |
| XII. Centralized Types | Check `src/types/` before creating new types; no duplicates | ✅ Checked component-types.ts (Appointment exists), will add metadata types to api-types.ts |

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
│   ├── termine/[id]/
│   │   └── page.tsx                        # MODIFIED: Add generateMetadata(), update routing logic
│   └── api/
│       └── appointments/
│           └── route.ts                    # MODIFIED: Support slug-based lookup (optional)
├── lib/
│   ├── appointments/
│   │   ├── slug-generator.ts               # NEW: Slug generation utility
│   │   ├── metadata-builder.ts             # NEW: Open Graph metadata builder
│   │   └── index.ts                        # MODIFIED: Export new utilities
│   ├── db/
│   │   └── appointment-operations.ts       # MODIFIED: Add findAppointmentBySlug (optional)
│   └── validation/
│       └── appointment-schema.ts           # MODIFIED: Add slug field validation (if needed)
├── types/
│   └── api-types.ts                        # MODIFIED: Add AppointmentMetadata interface
└── public/
    └── images/
        └── og-default.jpg                  # NEW: Default Open Graph image

prisma/
└── schema.prisma                           # MODIFIED: Add `slug String?` field to Appointment model
```

**Structure Decision**: This is a Next.js 15 web application using the App Router pattern. Files are organized by domain (`lib/appointments/`) with database operations centralized in `lib/db/`. The feature primarily modifies existing appointment detail page (`app/termine/[id]/page.tsx`) and extends the appointments domain with slug generation and metadata utilities. Public assets (default OG image) are stored in `public/images/`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**No constitutional violations detected.** All design decisions comply with project standards:
- Type safety maintained throughout
- Simple, focused utility functions
- Domain-based organization
- No new abstractions or patterns introduced
- Backwards compatibility preserved
