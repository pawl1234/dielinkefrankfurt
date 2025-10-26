# Tasks: Admin-Managed FAQ System for Member Portal

**Input**: Design documents from `/specs/009-admin-portal-faq/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: This project does NOT use automated tests per Constitution Principle II. All tasks are for implementation only.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database schema, types, and validation schemas

- [X] T001 Add FaqStatus enum and FaqEntry model to prisma/schema.prisma
- [X] T002 Add FAQ relations to User model in prisma/schema.prisma
- [ ] T003 Run Prisma migration: npx prisma migrate dev --name add-faq-system (USER WILL DO MANUALLY)
- [X] T004 [P] Add FAQ types to src/types/api-types.ts (FaqStatus, FaqEntry, FaqEntryWithUsers, FaqEntryPublic, CreateFaqRequest, UpdateFaqRequest, ListFaqsAdminQuery, ListFaqsAdminResponse, ListFaqsPortalResponse, FaqApiError)
- [X] T005 [P] Add FAQ component types to src/types/component-types.ts (FaqStatusDisplay, FAQ_STATUS_OPTIONS constant)
- [X] T006 [P] Create Zod validation schemas in src/lib/validation/faq-schema.ts (createFaqSchema, updateFaqSchema, searchQuerySchema with German error messages)

**Checkpoint**: Database schema migrated, all types defined, validation schemas ready

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database operations that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T007 Create src/lib/db/faq-operations.ts with createFaqEntry function (accepts data and userId, includes JSDoc, error logging)
- [X] T008 Add findFaqsWithPagination function to src/lib/db/faq-operations.ts (admin queries with where clause, orderBy, pagination, session authorization check)
- [X] T009 Add findActiveFaqEntries function to src/lib/db/faq-operations.ts (members query, returns only ACTIVE status, session authorization check)
- [X] T010 Add findFaqById function to src/lib/db/faq-operations.ts (single FAQ query, role-based filtering, session authorization)
- [X] T011 Add updateFaqEntry function to src/lib/db/faq-operations.ts (partial update, accepts id, data, userId)
- [X] T012 Add deleteFaqEntry function to src/lib/db/faq-operations.ts (with ARCHIVED-only safety check, session authorization)

**Checkpoint**: All database operations complete and ready for API routes - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Admin Creates and Manages FAQ Entries (Priority: P1) 🎯 MVP

**Goal**: Enable administrators to create, edit, archive, reactivate, and delete FAQ entries through a CMS-like interface matching the groups management pattern

**Independent Test**: Log in as admin, navigate to /admin/faq, create new FAQ with title and rich text content, edit it inline, archive it, reactivate it, archive again, then delete it. Verify all operations work correctly and entries appear in correct status tabs.

### Implementation for User Story 1

- [ ] T013 [P] [US1] Create GET handler in src/app/api/admin/faq/route.ts (list FAQs with pagination, status filter, search, validation, error handling with German messages)
- [ ] T014 [P] [US1] Create POST handler in src/app/api/admin/faq/route.ts (create FAQ, Zod validation, call createFaqEntry, error handling with German messages)
- [ ] T015 [P] [US1] Create src/app/api/admin/faq/[id]/route.ts with GET handler (fetch single FAQ by ID, admin authorization, error handling)
- [ ] T016 [US1] Add PATCH handler to src/app/api/admin/faq/[id]/route.ts (update FAQ, Zod validation, call updateFaqEntry, error handling)
- [ ] T017 [US1] Add DELETE handler to src/app/api/admin/faq/[id]/route.ts (delete FAQ with ARCHIVED-only check, error handling with German message)
- [ ] T018 [US1] Create admin FAQ page at src/app/admin/faq/page.tsx with state management (faqs list, pagination, status tabs, search, loading, error, expanded accordion, editing mode, dialogs)
- [ ] T019 [US1] Add accordion component to src/app/admin/faq/page.tsx (follows pattern from groups management: title + status chip in summary, SafeHtml content in details, action buttons)
- [ ] T020 [US1] Implement inline edit mode in admin accordion (RichTextEditor for content, TextField for title, save/cancel buttons)
- [ ] T021 [US1] Add status tabs to src/app/admin/faq/page.tsx (Aktiv, Archiviert, Alle - following groups pattern)
- [ ] T022 [US1] Implement search functionality in src/app/admin/faq/page.tsx (server-side search with query params, SearchFilterBar component)
- [ ] T023 [US1] Add pagination to src/app/admin/faq/page.tsx (AdminPagination component, page/pageSize state, fetch on page change)
- [ ] T024 [US1] Implement create FAQ dialog in src/app/admin/faq/page.tsx (form with title + RichTextEditor, validation, POST to API)
- [ ] T025 [US1] Add archive/reactivate functionality (PATCH request with status change, update UI, success/error notifications)
- [ ] T026 [US1] Add delete functionality with confirmation dialog (only for ARCHIVED entries, ConfirmDialog component, DELETE request)
- [ ] T027 [US1] Add AdminNavigation link to FAQ page in admin navigation component

**Checkpoint**: At this point, User Story 1 should be fully functional - admins can create, edit, archive, reactivate, and delete FAQ entries

---

## Phase 4: User Story 2 - Members Search and Browse FAQ Entries (Priority: P2)

**Goal**: Allow authenticated members to browse all active FAQ entries in accordion view and use real-time search to filter by title or content

**Independent Test**: Log in as member (role: mitglied), navigate to /portal/faq, view accordion list of active FAQs, expand/collapse entries to read content, use search field to filter entries in real-time. Verify only active FAQs are visible and search filters correctly.

### Implementation for User Story 2

- [ ] T028 [P] [US2] Create GET handler in src/app/api/portal/faq/route.ts (list active FAQs, no pagination, call findActiveFaqEntries, member authorization, error handling)
- [ ] T029 [P] [US2] Create src/app/api/portal/faq/[id]/route.ts with GET handler (fetch single active FAQ by ID, member authorization, return 404 if archived)
- [ ] T030 [US2] Create portal FAQ page at src/app/portal/faq/page.tsx with state management (faqs list, search term, filtered faqs, loading, error, expanded accordion)
- [ ] T031 [US2] Add FAQ fetch logic to portal page (useEffect hook, call /api/portal/faq, handle loading/error states)
- [ ] T032 [US2] Implement client-side search filtering in portal page (filter faqs by title and content, truncate search at 100 chars, case-insensitive)
- [ ] T033 [US2] Add search bar to portal page (TextField with SearchIcon, controlled input, updates filteredFaqs on change)
- [ ] T034 [US2] Implement accordion list for portal page (read-only accordion items, title in summary, SafeHtml content in details, expand/collapse)
- [ ] T035 [US2] Add empty state message to portal page (when no FAQs match search: "Keine FAQ-Einträge gefunden")
- [ ] T036 [US2] Add FAQ to portal navigation in src/app/portal/layout.tsx or src/components/portal/PortalNavigation.tsx (menu item with label "FAQ", path "/portal/faq", appropriate icon)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - admins can manage FAQs, members can browse and search them

---

## Phase 5: User Story 3 - Role-Based Access Control with Future Extensibility (Priority: P3)

**Goal**: Ensure database-level authorization checks are in place and extensible for future roles, with defense-in-depth security

**Independent Test**: Attempt to call database operations directly with different session contexts (no session, admin role, mitglied role). Verify operations enforce role checks and throw appropriate errors. Test that members see only active FAQs while admins see all based on filters.

### Implementation for User Story 3

- [ ] T037 [US3] Verify authorization checks in all database operations in src/lib/db/faq-operations.ts (session null checks, role validation against ['admin', 'mitglied'], throw German error messages)
- [ ] T038 [US3] Add structured logging for unauthorized access attempts in src/lib/db/faq-operations.ts (logger.warn with module, context, tags for security events)
- [ ] T039 [US3] Verify API route authorization checks in src/app/api/admin/faq/route.ts and [id]/route.ts (getServerSession, role check for 'admin', return 403 with German error)
- [ ] T040 [US3] Verify API route authorization checks in src/app/api/portal/faq/route.ts and [id]/route.ts (getServerSession, role check for ['admin', 'mitglied'], return 403 with German error)
- [ ] T041 [US3] Add error logging for failed authorization in all API routes (logger.error with module, context, tags, error details)
- [ ] T042 [US3] Add error logging for validation failures in all API routes (logger.error with validation details, user context)
- [ ] T043 [US3] Verify middleware protection for /admin/faq and /portal/faq routes in src/middleware.ts (if not already covered by existing patterns)

**Checkpoint**: All user stories should now be independently functional with comprehensive security - defense in depth with middleware + database layer authorization

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Seed data, final validation, and documentation updates

- [ ] T044 [P] Create or update prisma/seed.ts to include initial "Getting Started" FAQ entry (German content, status ACTIVE, createdBy first admin user)
- [ ] T045 [P] Run npm run check to validate all code (lint + typecheck)
- [ ] T046 Manually test all acceptance scenarios from spec.md User Story 1 (admin CRUD operations)
- [ ] T047 Manually test all acceptance scenarios from spec.md User Story 2 (member browsing and search)
- [ ] T048 Manually test all acceptance scenarios from spec.md User Story 3 (authorization checks)
- [ ] T049 Manually test all edge cases from spec.md (long titles/content, special characters in search, delete active FAQ, etc.)
- [ ] T050 Verify all user-facing text is in German (buttons, labels, error messages, validation messages, empty states)
- [ ] T051 Update CLAUDE.md with FAQ feature information (add to Active Technologies section)

**Checkpoint**: Feature complete, validated, and ready for deployment

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if multiple developers)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Reads data created by US1 but independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Verifies security of US1 and US2 but independently testable

### Within Each User Story

- API routes depend on database operations (Phase 2)
- Admin page depends on admin API routes
- Portal page depends on portal API routes
- Navigation updates can happen anytime after pages exist

### Parallel Opportunities

**Phase 1 (Setup)**:
- T004, T005, T006 can run in parallel (different files)

**Phase 2 (Foundational)**:
- All T007-T012 tasks must be sequential (same file: src/lib/db/faq-operations.ts)

**Phase 3 (User Story 1)**:
- T013 + T014 can run in parallel (same file but different handlers)
- T015 can run in parallel with T013/T014 (different file)
- T018-T027 must be mostly sequential (same admin page file, but components can be extracted)

**Phase 4 (User Story 2)**:
- T028 + T029 can run in parallel (different files)
- T030-T036 must be mostly sequential (same portal page file)

**Phase 5 (User Story 3)**:
- T037-T043 can be done in parallel (verification tasks across different files)

**Phase 6 (Polish)**:
- T044 + T045 + T051 can run in parallel (different files)
- T046-T050 are manual testing tasks (sequential)

**Cross-Phase Parallelism**:
- Once Phase 2 completes, Phase 3, 4, and 5 can ALL start in parallel (different files)
- User Story 1 (admin functionality) and User Story 2 (portal functionality) are completely independent
- User Story 3 (security verification) can proceed alongside US1 and US2

---

## Parallel Example: After Foundational Phase

```bash
# After Phase 2 completes, launch all three user stories in parallel:

# Team Member A: User Story 1 (Admin CRUD)
Task: "Create GET handler in src/app/api/admin/faq/route.ts"
Task: "Create POST handler in src/app/api/admin/faq/route.ts"
Task: "Create admin FAQ page at src/app/admin/faq/page.tsx"

# Team Member B: User Story 2 (Portal View)
Task: "Create GET handler in src/app/api/portal/faq/route.ts"
Task: "Create portal FAQ page at src/app/portal/faq/page.tsx"

# Team Member C: User Story 3 (Security)
Task: "Verify authorization checks in all database operations"
Task: "Add structured logging for unauthorized access"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup → Database schema, types, validation schemas ready
2. Complete Phase 2: Foundational → All database operations ready (CRITICAL)
3. Complete Phase 3: User Story 1 → Admin can manage FAQs
4. **STOP and VALIDATE**: Test admin functionality independently
5. Deploy/demo admin FAQ management

**Estimated Time**: 6-8 hours for MVP

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready (2-3 hours)
2. Add User Story 1 → Test independently → Deploy (4-5 hours) - MVP!
3. Add User Story 2 → Test independently → Deploy (2-3 hours) - Members can now use FAQ
4. Add User Story 3 → Test independently → Deploy (1-2 hours) - Security hardened
5. Add Polish → Final validation → Deploy (1-2 hours) - Production ready

**Total Estimated Time**: 10-15 hours

### Parallel Team Strategy

With 3 developers:

1. Team completes Setup + Foundational together (2-3 hours)
2. Once Foundational is done:
   - Developer A: User Story 1 (admin CRUD) - 4-5 hours
   - Developer B: User Story 2 (portal view) - 2-3 hours
   - Developer C: User Story 3 (security) - 1-2 hours
3. Stories complete and integrate independently
4. Team completes Polish together (1-2 hours)

**Total Time with Parallel Work**: 8-10 hours

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- This project uses MANUAL TESTING only (no automated tests per Constitution Principle II)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Run `npm run check` before committing (NEVER use `npm run build` for validation)

---

## Constitutional Compliance Reminders

When implementing tasks, MUST follow the project constitution (`.specify/memory/constitution.md`):

**Code Organization** (Principles IX, XI):
- NO file over 500 lines - refactor into modules if needed
- Database operations ONLY in `db/faq-operations.ts`
- Validation schemas ONLY in `validation/faq-schema.ts`
- API routes in `app/api/admin/faq/` and `app/api/portal/faq/`

**Type Safety** (Principles I, XII):
- MUST check `src/types/` for existing types before creating new ones
- NO `any` types - use strict TypeScript
- Add FAQ types to existing `api-types.ts` and `component-types.ts`

**Validation & Logging** (Principles VII, VIII):
- Server-side Zod validation MANDATORY in all API routes
- Use `logger` from `@/lib/logger.ts` (NO `console.log`)
- Log only failures/errors with structured context

**User Experience** (Principle VI):
- ALL user-facing text MUST be in German (buttons, errors, messages)

**Code Quality** (Principles III, IV, V, X):
- Use `@/` imports for all src/ paths
- Reuse existing components: RichTextEditor, SafeHtml, AdminPagination, accordion patterns
- JSDoc for all database operation functions
- Keep solutions simple (KISS)

**Testing** (Principle II):
- NO automated tests - manual testing only

Run `npm run check` before committing. NEVER use `npm run build` or `npm run db:push` solely for validation.

---

## Summary

**Total Tasks**: 51 tasks
- Phase 1 (Setup): 6 tasks
- Phase 2 (Foundational): 6 tasks
- Phase 3 (User Story 1): 15 tasks
- Phase 4 (User Story 2): 9 tasks
- Phase 5 (User Story 3): 7 tasks
- Phase 6 (Polish): 8 tasks

**Parallel Opportunities**:
- 6 tasks can run in parallel during Setup (T004, T005, T006)
- 3 user stories can start in parallel after Foundational phase
- Multiple verification tasks in User Story 3 can run in parallel

**Independent Test Criteria**:
- User Story 1: Admin can perform all CRUD operations successfully
- User Story 2: Members can browse and search FAQ entries
- User Story 3: Authorization blocks unauthorized access at DB layer

**Suggested MVP Scope**: Phase 1 + Phase 2 + Phase 3 (User Story 1 only) = Admin FAQ management system

**Format Validation**: ✅ ALL tasks follow checklist format (checkbox, ID, optional [P]/[Story] labels, description with file paths)
