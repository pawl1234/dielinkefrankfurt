# Tasks: Appointment Link Enhancement

**Input**: Design documents from `/specs/010-appointment-link-enhancement/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: This project does NOT use automated tests per Constitution Principle II - all validation is manual only.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database schema changes and supporting infrastructure

- [X] T001 Add `slug String?` field to Appointment model in `/home/paw/nextjs/dielinkefrankfurt/prisma/schema.prisma`
- [X] T002 Add index on `slug` field in Appointment model in `/home/paw/nextjs/dielinkefrankfurt/prisma/schema.prisma`
- [ ] T003 Run `npm run db:push` to apply database schema changes (USER WILL DO THIS)
- [X] T004 Add default Open Graph image (1200x630px) to `/home/paw/nextjs/dielinkefrankfurt/public/images/og-default.jpg` (placeholder created)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core utilities and type definitions that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T005 [P] Create slug generator utility in `/home/paw/nextjs/dielinkefrankfurt/src/lib/appointments/slug-generator.ts` with `generateAppointmentSlug()` function
- [X] T006 [P] Create metadata builder utility in `/home/paw/nextjs/dielinkefrankfurt/src/lib/appointments/metadata-builder.ts` with `buildAppointmentMetadata()` function
- [X] T007 [P] Create helper function `extractDescription()` in metadata-builder.ts to strip HTML and truncate text
- [X] T008 [P] Create helper function `selectOpenGraphImage()` in metadata-builder.ts to choose OG image
- [X] T009 [P] Create helper function `formatLocationString()` in metadata-builder.ts to format location data
- [X] T010 Add `AppointmentMetadata` interface to `/home/paw/nextjs/dielinkefrankfurt/src/types/api-types.ts`
- [X] T011 Update barrel export in `/home/paw/nextjs/dielinkefrankfurt/src/lib/appointments/index.ts` to include new utilities

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - View Appointment with Dynamic Title (Priority: P1) 🎯 MVP

**Goal**: Display appointment-specific title in browser tab and page metadata

**Independent Test**: Open any appointment detail page and verify the browser tab displays the appointment title instead of a generic title. View page source to confirm `<title>` tag contains appointment name.

### Implementation for User Story 1

- [X] T012 [US1] Create helper function `extractAppointmentId()` in `/home/paw/nextjs/dielinkefrankfurt/src/app/termine/[id]/page.tsx` to parse numeric ID from URL param
- [X] T013 [US1] Implement `generateMetadata()` function in `/home/paw/nextjs/dielinkefrankfurt/src/app/termine/[id]/page.tsx` to generate dynamic page title
- [X] T014 [US1] Update page component in `/home/paw/nextjs/dielinkefrankfurt/src/app/termine/[id]/page.tsx` to use new ID extraction logic
- [X] T015 [US1] Add error handling for invalid appointment IDs (return `notFound()`) in page.tsx
- [X] T016 [US1] Add fallback metadata for appointments that fail to load in generateMetadata()

**Checkpoint**: At this point, User Story 1 should be fully functional - browser tabs show appointment titles, page titles are dynamic

---

## Phase 4: User Story 2 - Rich Link Previews for Messengers (Priority: P2)

**Goal**: Generate Open Graph meta tags so shared links display rich previews in WhatsApp, Telegram, and Outlook

**Independent Test**: Share an appointment link in WhatsApp Web or Telegram and verify a rich preview appears with title, description, date/time, and image. Validate with Facebook Sharing Debugger.

### Implementation for User Story 2

- [X] T017 [US2] Extend `generateMetadata()` in `/home/paw/nextjs/dielinkefrankfurt/src/app/termine/[id]/page.tsx` to call `buildAppointmentMetadata()`
- [X] T018 [US2] Add Open Graph tag generation to metadata-builder.ts (og:title, og:description, og:type, og:url, og:site_name, og:image)
- [X] T019 [US2] Add Twitter Card tag generation to metadata-builder.ts (twitter:card, twitter:title, twitter:description, twitter:image)
- [X] T020 [US2] Add event-specific Open Graph tags to metadata-builder.ts (event:start_time, event:end_time, event:location)
- [X] T021 [US2] Implement logic to parse cover images from appointment metadata JSON in selectOpenGraphImage()
- [X] T022 [US2] Implement fallback to default OG image when no cover image available in selectOpenGraphImage()
- [X] T023 [US2] Ensure all URLs in Open Graph tags are absolute (use `getBaseUrl()` from `@/lib/base-url`)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work - dynamic titles AND rich link previews

---

## Phase 5: User Story 3 - Slug-Based URLs for New Appointments (Priority: P3)

**Goal**: Generate URL-friendly slugs for new appointments to create descriptive URLs like `/termine/123-vollversammlung`

**Independent Test**: Create a new appointment via public form, accept it in admin dashboard, verify it gets a slug in the database, and confirm it's accessible via both `/termine/123` and `/termine/123-slug` URLs.

### Implementation for User Story 3

- [X] T024 [US3] Implement umlaut simplification logic in slug-generator.ts (ä→a, ö→o, ü→u, ß→ss)
- [X] T025 [US3] Implement emoji removal regex in slug-generator.ts (remove all emoji characters)
- [X] T026 [US3] Implement special character removal in slug-generator.ts (keep only alphanumeric and hyphens)
- [X] T027 [US3] Implement slug truncation logic in slug-generator.ts (max 50 characters, clean trailing hyphens)
- [X] T028 [US3] Add fallback logic in slug-generator.ts for empty titles (return `{id}-termin`)
- [X] T029 [US3] Add error-only logging in slug-generator.ts using `logger.error()` from `@/lib/logger.ts`
- [X] T030 [US3] Find or create admin appointment acceptance API endpoint (found in appointment-mutations.ts)
- [X] T031 [US3] Add slug generation logic to acceptance endpoint before updating appointment status
- [X] T032 [US3] Wrap slug generation in try-catch block so acceptance succeeds even if slug generation fails
- [X] T033 [US3] Update acceptance endpoint to set `slug` field when updating appointment to "accepted" status
- [X] T034 [US3] Add warnings array to acceptance response when slug generation fails (handled by error logging)
- [X] T035 [US3] Update `extractAppointmentId()` in page.tsx to support slug format (extract ID from "123-slug")
- [X] T036 [US3] Update metadata builder to use slug-based URLs when slug is available (prefer `/termine/{slug}` over `/termine/{id}`)

**Checkpoint**: All user stories should now be independently functional - dynamic titles, rich previews, AND slug URLs

---

## Phase 6: User Story 4 - Search Engine Optimization (Priority: P4)

**Goal**: Ensure search engines can properly index appointment pages with structured metadata

**Independent Test**: Inspect page source for proper meta tags, submit URL to Google Search Console, validate structured data with schema.org validators.

### Implementation for User Story 4

- [X] T037 [US4] Add `description` meta tag to metadata output in metadata-builder.ts
- [X] T038 [US4] Add canonical URL to metadata output in metadata-builder.ts
- [X] T039 [US4] Verify all metadata tags are properly formatted for search engine crawlers

**Checkpoint**: All user stories complete - dynamic titles, rich previews, slug URLs, AND SEO optimization

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, code quality, and documentation

- [X] T040 [P] Add JSDoc comments to all functions in slug-generator.ts
- [X] T041 [P] Add JSDoc comments to all functions in metadata-builder.ts
- [X] T042 [P] Add JSDoc comments to helper functions in page.tsx
- [X] T043 Run `npm run check` to validate TypeScript types and ESLint rules
- [ ] T044 Manual test: Create appointment with emoji title, verify emojis removed from slug (USER TO TEST)
- [ ] T045 Manual test: Create appointment with umlauts, verify simplified in slug (ä→a, etc.) (USER TO TEST)
- [ ] T046 Manual test: Create appointment with very long title (>100 chars), verify slug truncated (USER TO TEST)
- [ ] T047 Manual test: Access existing appointments via numeric URLs, verify backwards compatibility (USER TO TEST)
- [ ] T048 Manual test: Access new appointments via slug URLs, verify they load correctly (USER TO TEST)
- [ ] T049 Manual test: Access appointment with wrong slug text, verify it still loads (ID takes precedence) (USER TO TEST)
- [ ] T050 Manual test: Share link in WhatsApp Web, verify rich preview appears (USER TO TEST)
- [ ] T051 Manual test: Share link in Telegram, verify rich preview appears (USER TO TEST)
- [ ] T052 Manual test: Validate Open Graph tags with Facebook Sharing Debugger (USER TO TEST)
- [ ] T053 Manual test: Open multiple appointment tabs, verify each shows unique title (USER TO TEST)
- [ ] T054 Manual test: Verify featured appointments show cover image in OG tags (USER TO TEST)
- [ ] T055 Manual test: Verify non-featured appointments show default OG image (USER TO TEST)
- [ ] T056 Run complete validation workflow from quickstart.md document (USER TO TEST)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion (T001-T004) - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion (T005-T011)
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3 → P4)
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Depends on Phase 2 (T005-T011) - No dependencies on other stories
- **User Story 2 (P2)**: Depends on Phase 2 (T005-T011) - Extends US1 but can be tested independently
- **User Story 3 (P3)**: Depends on Phase 2 (T005-T011) - Uses utilities from foundational phase
- **User Story 4 (P4)**: Depends on US2 (T017-T023) - Extends Open Graph implementation

### Within Each User Story

**User Story 1** (T012-T016):
- T012 (ID extraction) must complete before T013-T014
- T013-T016 can be done sequentially

**User Story 2** (T017-T023):
- T017 depends on T006 (metadata builder exists)
- T018-T023 extend the metadata builder (sequential)

**User Story 3** (T024-T036):
- T024-T029 are all enhancements to slug-generator.ts (sequential)
- T030-T034 modify acceptance API endpoint (sequential)
- T035-T036 update page routing (sequential, depend on T024-T029)

**User Story 4** (T037-T039):
- All tasks extend metadata-builder.ts (sequential)

### Parallel Opportunities

**Phase 1 (Setup)**:
- T001-T004 can all run in parallel (different files/operations)

**Phase 2 (Foundational)**:
- T005-T009 marked [P] can run in parallel (different files)
- T010-T011 must run after T005-T009

**Across User Stories**:
- Once Phase 2 completes, all user stories (US1, US2, US3, US4) can start in parallel if team capacity allows
- Different developers can work on different user stories simultaneously

**Within Phase 7 (Polish)**:
- T040-T042 marked [P] (documentation) can run in parallel
- T044-T056 (manual tests) can run in any order

---

## Parallel Example: Phase 2 (Foundational)

```bash
# Launch all core utilities together (different files):
Task: "Create slug generator utility in src/lib/appointments/slug-generator.ts"
Task: "Create metadata builder utility in src/lib/appointments/metadata-builder.ts"
Task: "Create helper function extractDescription() in metadata-builder.ts"
Task: "Create helper function selectOpenGraphImage() in metadata-builder.ts"
Task: "Create helper function formatLocationString() in metadata-builder.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T004)
2. Complete Phase 2: Foundational (T005-T011) - CRITICAL
3. Complete Phase 3: User Story 1 (T012-T016)
4. **STOP and VALIDATE**: Test dynamic titles in browser tabs independently
5. Deploy/demo if ready - immediate user value

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test dynamic titles → Deploy/Demo (MVP!)
3. Add User Story 2 → Test rich link previews → Deploy/Demo
4. Add User Story 3 → Test slug URLs → Deploy/Demo
5. Add User Story 4 → Test SEO metadata → Deploy/Demo
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done (T005-T011):
   - Developer A: User Story 1 (T012-T016)
   - Developer B: User Story 2 (T017-T023)
   - Developer C: User Story 3 (T024-T036)
   - Developer D: User Story 4 (T037-T039)
3. Stories complete and integrate independently

---

## Summary

**Total Tasks**: 56 tasks
- Phase 1 (Setup): 4 tasks
- Phase 2 (Foundational): 7 tasks
- Phase 3 (US1 - Dynamic Titles): 5 tasks
- Phase 4 (US2 - Rich Previews): 7 tasks
- Phase 5 (US3 - Slug URLs): 13 tasks
- Phase 6 (US4 - SEO): 3 tasks
- Phase 7 (Polish): 17 tasks

**Parallel Opportunities**:
- Phase 1: All 4 tasks can run in parallel
- Phase 2: 5 tasks marked [P] can run in parallel
- User Stories 1-4: Can all proceed in parallel after Phase 2
- Phase 7: 3 documentation tasks can run in parallel

**Suggested MVP Scope**: Phase 1 + Phase 2 + Phase 3 (User Story 1 only)
- Delivers immediate value: dynamic page titles in browser tabs
- 16 tasks total (setup + foundational + US1)
- Can be completed and tested independently
- Additional stories can be added incrementally

---

## Notes

- [P] tasks = different files, no dependencies between them
- [Story] label maps task to specific user story for traceability (US1, US2, US3, US4)
- Each user story should be independently completable and testable
- No automated tests per Constitution Principle II - all validation is manual
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Run `npm run check` before committing (never `npm run build` or `npm run db:push` for validation)

---

## Constitutional Compliance Reminders

When implementing tasks, MUST follow the project constitution (`.specify/memory/constitution.md`):

**Code Organization** (Principles IX, XI):
- NO file over 500 lines - refactor into modules if needed
- Follow domain-based architecture: `lib/appointments/` for appointment utilities
- ALL database operations in `lib/db/appointment-operations.ts` only

**Type Safety** (Principles I, XII):
- MUST check `src/types/api-types.ts` for existing types before creating new ones
- NO `any` types - use strict TypeScript
- Reuse Appointment type from `@prisma/client`

**Validation & Logging** (Principles VII, VIII):
- Server-side validation MANDATORY using Zod from `src/lib/validation/`
- Use `logger` from `@/lib/logger.ts` for all server logging (NO `console.log`)
- Per FR-017: Log errors ONLY, no debug/info logs for normal operation

**User Experience** (Principle VI):
- ALL user-facing text MUST be in German (e.g., "Termin nicht gefunden")

**Code Quality** (Principles III, IV, V, X):
- Use `@/` imports (never relative imports)
- Reuse existing utilities before creating new ones (DRY)
- Keep solutions simple (KISS)
- JSDoc for all functions with TypeScript conventions

**Testing** (Principle II):
- NO automated tests - this project uses manual testing only
- All validation tasks (T044-T056) are manual tests following quickstart.md

Run `npm run check` (lint + typecheck) before committing. NEVER use `npm run build` or `npm run db:push` solely for validation.
