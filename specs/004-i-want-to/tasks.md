# Tasks: Public Groups Overview Page with Contact Modal

**Input**: Design documents from `/specs/004-i-want-to/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/

## Execution Flow
```
1. Loaded plan.md and design artifacts
2. Identified entities: Group (extended), Newsletter (extended), GroupContactRequest (non-persisted)
3. Identified contracts: GET /api/groups/overview, POST /api/groups/[slug]/contact
4. Identified components: Groups overview page, contact modal, form extensions
5. Task generation: Setup → Types → Database → API → Email → UI → Validation
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

---

## Phase 3.1: Setup & Prerequisites

- [X] **T001** Verify existing dependencies (Material UI, React Hook Form, Zod, Prisma, Nodemailer, React Email) - no installation needed per research.md

---

## Phase 3.2: Types & Validation

- [X] **T002** Check `src/types/api-types.ts`, `src/types/component-types.ts`, and `src/types/form-types.ts` for existing types that can be reused (PublicAddress pattern)
- [X] **T003** [P] Add `GroupContactRequest` and `GroupContactResponse` interfaces to `src/types/api-types.ts`
- [X] **T004** [P] Add `PublicGroupWithMeeting` interface to `src/types/component-types.ts`
- [X] **T005** [P] Add `GroupContactEmailProps` interface to `src/types/email-types.ts` (if file exists, otherwise create)
- [X] **T006** [P] Create Zod validation schema `src/lib/validation/group-contact-schema.ts` for contact form
- [X] **T007** Update existing group validation schema in `src/lib/validation/group.ts` to include meeting fields (regularMeeting, meetingStreet, meetingCity, meetingPostalCode, meetingLocationDetails)

---

## Phase 3.3: Database & Models

- [X] **T008** Update Prisma schema `prisma/schema.prisma` - Add meeting fields to Group model (regularMeeting, meetingStreet, meetingCity, meetingPostalCode, meetingLocationDetails)
- [X] **T009** Create new Prisma model `GroupSettings` in `prisma/schema.prisma` with officeContactEmail field (singleton pattern with ID=1)
- [X] **T010** Schema changes ready (db:push will be run by human per CLAUDE.md)
- [X] **T011** [P] Add `findPublicGroupsWithMeeting()` function to `src/lib/db/group-operations.ts`
- [X] **T012** [P] Add `findGroupBySlugForContact()` function to `src/lib/db/group-operations.ts`
- [X] **T012b** [P] Create new file `src/lib/db/group-settings-operations.ts` with getGroupSettings() and updateGroupSettings() functions

---

## Phase 3.4: Email Infrastructure

- [X] **T013** Create React Email template `src/emails/notifications/group-contact-request.tsx` following existing notification pattern
- [X] **T014** Add `sendGroupContactEmail()` function to `src/lib/email/senders.ts` using existing sendEmail infrastructure

---

## Phase 3.5: API Routes

- [ ] **T015** [P] Create API route `src/app/api/groups/overview/route.ts` for GET request using findPublicGroupsWithMeeting()
- [ ] **T016** [P] Create API route `src/app/api/groups/[slug]/contact/route.ts` for POST request with Zod validation and email sending
- [ ] **T017** Add error handling with German messages and structured logging to both API routes

---

## Phase 3.6: UI Components

- [ ] **T018** [P] Create GroupContactModal component `src/components/forms/GroupContactModal.tsx` with React Hook Form and Material UI Dialog
- [ ] **T019** [P] Create groups overview page `src/app/gruppen-uebersicht/page.tsx` with Material UI Accordion and fetch from /api/groups/overview
- [ ] **T020** Update public group proposal form `src/app/neue-gruppe/page.tsx` to include optional meeting fields (regularMeeting + AddressSection)
- [ ] **T021** Update admin group edit form to include meeting fields (find existing admin group edit page and add meeting fields)
- [ ] **T022** Create settings dialog component `src/components/admin/groups/GroupSettingsDialog.tsx` with officeContactEmail field and form
- [ ] **T022b** Integrate GroupSettingsDialog into groups admin page (add settings icon button, manage dialog state)

---

## Phase 3.7: Integration & Polish

- [ ] **T023** Run `npm run check` to validate types, linting, and no TypeScript errors
- [ ] **T024** Add JSDoc comments to all new functions (database operations, email senders, API routes)
- [ ] **T025** Verify all new files are under 500 lines (split if needed)
- [ ] **T026** Verify all user-facing text is in German (forms, validation messages, error messages, buttons)
- [ ] **T027** Verify no `any` types used - all types properly defined
- [ ] **T028** Test email sending with local maildev setup (manual validation using quickstart.md scenarios)

---

## Dependencies

```
T001 (check deps)
  ↓
T002 (check types) → T003-T005 [P] (type definitions)
                      ↓
                   T006-T007 [P] (validation schemas)
                      ↓
                   T008-T009 (Prisma schema) → T010 (db:push)
                      ↓
                   T011-T012-T012b [P] (DB operations)
                      ↓
                   T013-T014 [P] (email infrastructure)
                      ↓
                   T015-T016 [P] (API routes) → T017 (error handling)
                      ↓
                   T018-T019 [P] (new components/pages)
                      ↓
                   T020-T021 (form updates - sequential, may touch same files)
                      ↓
                   T022-T022b (settings dialog - sequential, creation then integration)
                      ↓
                   T023-T028 (validation & polish)
```

---

## Parallel Execution Examples

### Types Phase (T003-T005)
```bash
# Launch 3 type definition tasks together (different files):
Task: "Add GroupContactRequest and GroupContactResponse to src/types/api-types.ts"
Task: "Add PublicGroupWithMeeting to src/types/component-types.ts"
Task: "Add GroupContactEmailProps to src/types/email-types.ts"
```

### Validation Phase (T006-T007)
```bash
# Launch 2 validation tasks together (different files):
Task: "Create group-contact-schema.ts with Zod validation"
Task: "Update existing group-schema.ts with meeting fields"
```

### Database Operations (T011-T012-T012b)
```bash
# Launch 3 DB operation tasks together (different files):
Task: "Add findPublicGroupsWithMeeting() to group-operations.ts"
Task: "Add findGroupBySlugForContact() to group-operations.ts"
Task: "Create group-settings-operations.ts with getGroupSettings() and updateGroupSettings()"
```

### Email Infrastructure (T013-T014)
```bash
# Launch 2 email tasks together (different files):
Task: "Create group-contact-request.tsx email template"
Task: "Add sendGroupContactEmail() to email/senders.ts"
```

### API Routes (T015-T016)
```bash
# Launch 2 API route tasks together (different files):
Task: "Create GET /api/groups/overview route"
Task: "Create POST /api/groups/[slug]/contact route"
```

### New Components (T018-T019)
```bash
# Launch 2 component tasks together (different files):
Task: "Create GroupContactModal component"
Task: "Create /gruppen-uebersicht page with accordions"
```

---

## Notes

- [P] tasks = different files OR different non-conflicting functions in same file, no dependencies
- Run `npm run check` frequently during development (not just at T023)
- Use existing patterns from CLAUDE.md:
  - `submitForm()` utility for form submissions
  - `logger` from `@/lib/logger.ts` for all logging
  - `AddressSection` component for location fields
  - Material UI Dialog for modals and settings dialogs
  - React Hook Form with Zod resolvers for client validation
  - Singleton database pattern for global settings (GroupSettings with ID=1)
  - `getGroupSettings()` function returns/creates singleton record
- All validation must use Zod schemas server-side (constitution requirement)
- Keep files under 500 lines - split if necessary
- No `any` types - use proper TypeScript interfaces
- All user-facing text in German
- This project does NOT use tests - manual validation via quickstart.md

---

## Task Generation Rules Applied

1. **From Contracts** (api-group-contact.md, api-groups-overview.md):
   - T015: GET /api/groups/overview implementation
   - T016: POST /api/groups/[slug]/contact implementation
   - T006: Validation schema for contact request
   - T003-T004: Type definitions for requests/responses

2. **From Data Model** (data-model.md):
   - T002: Check existing types (MUST happen first)
   - T003-T005: Type definitions in src/types/
   - T008-T009: Prisma schema updates
   - T011-T012: Database operations
   - T006-T007: Zod validation schemas

3. **From Research** (research.md):
   - T001: Dependency verification (no new deps needed)
   - T013-T014: Email infrastructure
   - T018-T022: UI components following Material UI patterns
   - T020-T022: Form extensions with meeting fields

4. **From Quickstart** (quickstart.md):
   - T028: Manual validation scenarios
   - T023-T027: Code quality checks

5. **Ordering**:
   - Setup → Type Checking → Types → Validation → Database → Email → API → UI → Validation
   - Dependencies strictly enforced (db:push before operations, operations before API, etc.)

---

## Validation Checklist
*Verified before task list generation*

- [x] Type checking task (T002) included before type creation (T003-T005)
- [x] All new types defined in src/types/ centrally
- [x] All contracts have corresponding API routes (T015, T016)
- [x] All entities have Prisma schema (T008, T009), validation (T006, T007), and operations (T011, T012) tasks
- [x] Database changes (T008-T010) before API implementation (T015-T017)
- [x] Parallel tasks truly independent (different files or non-conflicting functions)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task in same phase
- [x] Constitution principles respected (no tests, <500 lines, centralized types, German text, server validation)
