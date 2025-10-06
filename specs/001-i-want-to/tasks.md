# Tasks: Code Organization Refactoring

**Input**: Design documents from `/specs/001-i-want-to/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/, quickstart.md

## Execution Flow
```
1. Load plan.md from feature directory ✓
2. Load design documents:
   → data-model.md: Domain structure and file organization ✓
   → research.md: Refactoring strategy (8 phases) ✓
   → quickstart.md: Manual validation scenarios ✓
   → contracts/: No API changes (internal refactoring only) ✓
3. Generate tasks by refactoring phase:
   → Phase 1: Newsletter domain reorganization
   → Phase 2: Email infrastructure extraction
   → Phase 3: Appointments domain reorganization
   → Phase 4: Groups domain reorganization
   → Phase 5: Anträge domain reorganization
   → Phase 6: AI & Analytics extraction
   → Phase 7: Auth extraction
   → Phase 8: Final cleanup and validation
4. Apply task rules:
   → Sequential within same files (no [P])
   → Parallel for different domains/files ([P])
   → Validate after each domain refactoring
5. Number tasks sequentially (T001-T060)
6. Validate: npm run check after each domain
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **Exact file paths** provided for each task
- **Validation checkpoint** after each major phase

---

## Phase 1: Newsletter Domain Reorganization

### T001 Create newsletter/ directory structure
**Action**: Create directory and subdirectory structure
```bash
mkdir -p src/lib/newsletter
touch src/lib/newsletter/index.ts
```
**Files**: `src/lib/newsletter/` (new directory)

### T002 Split newsletter-service.ts: Extract settings service
**Action**: Extract lines ~1-250 from newsletter-service.ts to settings-service.ts
- Move settings CRUD operations
- Extract newsletter settings functions
- Add imports for db/newsletter-operations, logger, errors
**Files**:
- Create: `src/lib/newsletter/settings-service.ts` (~250 lines)
- Modify: `src/lib/newsletter-service.ts` (will delete later)

### T003 Split newsletter-service.ts: Extract preview service
**Action**: Extract lines ~251-500 from newsletter-service.ts to preview-service.ts
- Move preview generation logic
- Move fetch approved items functions
- Add imports for db/appointment-operations, db/status-report-operations, logger
**Files**:
- Create: `src/lib/newsletter/preview-service.ts` (~250 lines)

### T004 Split newsletter-service.ts: Extract draft service
**Action**: Extract lines ~501-750 from newsletter-service.ts to draft-service.ts
- Move draft save/load operations
- Move draft validation
- Add imports for db/newsletter-operations, logger
**Files**:
- Create: `src/lib/newsletter/draft-service.ts` (~250 lines)

### T005 Extract SMTP configuration to email/smtp-service.ts
**Action**: Extract SMTP-related code from newsletter-service.ts (lines ~751-1000)
- Move SMTP connection setup
- Move transporter configuration
- This will be moved to email/ directory in Phase 2
**Files**:
- Create: `src/lib/smtp-temp.ts` (~250 lines, temporary location)

### T006 Move newsletter-archive.ts to newsletter/archive-service.ts
**Action**: Move and rename file
```bash
mv src/lib/newsletter-archive.ts src/lib/newsletter/archive-service.ts
```
- Update imports in archive-service.ts to use @/lib/db/newsletter-operations
- Replace console.* with logger
**Files**:
- Move: `src/lib/newsletter-archive.ts` → `src/lib/newsletter/archive-service.ts`

### T007 [P] Move newsletter-sending.ts to newsletter/sending-coordinator.ts
**Action**: Move and rename file
```bash
mv src/lib/newsletter-sending.ts src/lib/newsletter/sending-coordinator.ts
```
- Update imports
- Replace console.* with logger
**Files**:
- Move: `src/lib/newsletter-sending.ts` → `src/lib/newsletter/sending-coordinator.ts`

### T008 [P] Move newsletter-analytics.ts to newsletter/analytics-service.ts
**Action**: Move and rename file
- Extract all Prisma queries to db/analytics-operations.ts
- Update imports to use db/analytics-operations
- Replace console.* with logger
**Files**:
- Move: `src/lib/newsletter-analytics.ts` → `src/lib/newsletter/analytics-service.ts`
- Create: `src/lib/db/analytics-operations.ts` (new DB operations file)

### T009 [P] Move newsletter-tracking.ts to newsletter/tracking-service.ts
**Action**: Move and rename file
```bash
mv src/lib/newsletter-tracking.ts src/lib/newsletter/tracking-service.ts
```
- Update imports
**Files**:
- Move: `src/lib/newsletter-tracking.ts` → `src/lib/newsletter/tracking-service.ts`

### T010 [P] Move newsletter-template.ts to newsletter/template-generator.ts
**Action**: Move and rename file
```bash
mv src/lib/newsletter-template.ts src/lib/newsletter/template-generator.ts
```
- Update imports
**Files**:
- Move: `src/lib/newsletter-template.ts` → `src/lib/newsletter/template-generator.ts`

### T011 [P] Move newsletter-helpers.ts to newsletter/helpers.ts
**Action**: Move file
```bash
mv src/lib/newsletter-helpers.ts src/lib/newsletter/helpers.ts
```
- Replace console.* with logger
**Files**:
- Move: `src/lib/newsletter-helpers.ts` → `src/lib/newsletter/helpers.ts`

### T012 [P] Move newsletter-constants.ts to newsletter/constants.ts
**Action**: Move file
```bash
mv src/lib/newsletter-constants.ts src/lib/newsletter/constants.ts
```
**Files**:
- Move: `src/lib/newsletter-constants.ts` → `src/lib/newsletter/constants.ts`

### T013 [P] Move newsletter-validation.ts to newsletter/validation.ts
**Action**: Move file
```bash
mv src/lib/newsletter-validation.ts src/lib/newsletter/validation.ts
```
**Files**:
- Move: `src/lib/newsletter-validation.ts` → `src/lib/newsletter/validation.ts`

### T014 Create newsletter/index.ts barrel export
**Action**: Create index.ts that re-exports all newsletter functions
```typescript
export * from './settings-service';
export * from './preview-service';
export * from './draft-service';
export * from './archive-service';
export * from './sending-coordinator';
export * from './analytics-service';
export * from './tracking-service';
export * from './template-generator';
export * from './validation';
export * from './helpers';
export * from './constants';
```
**Files**:
- Create: `src/lib/newsletter/index.ts`

### T015 Extract newsletter DB operations to db/newsletter-operations.ts
**Action**: Create new DB operations file
- Extract all Prisma queries from newsletter-service.ts
- Extract any remaining queries from archive-service.ts
- Consolidate newsletter-related DB operations
**Files**:
- Create: `src/lib/db/newsletter-operations.ts` (new file, ~200 lines)

### T016 Update imports in src/app/api/newsletter/ routes
**Action**: Update all newsletter API routes
- Change imports from `@/lib/newsletter-*` to `@/lib/newsletter`
- Update imports to use specific functions from barrel export
**Files**:
- Modify: `src/app/api/newsletter/*/route.ts` (all newsletter API routes)

### T017 Update imports in src/app/admin/newsletter/ pages
**Action**: Update all newsletter admin pages
- Change imports from `@/lib/newsletter-*` to `@/lib/newsletter`
**Files**:
- Modify: `src/app/admin/newsletter/**/page.tsx` (all newsletter pages)

### T018 Delete old newsletter-service.ts
**Action**: Remove original oversized file
```bash
rm src/lib/newsletter-service.ts
```
**Files**:
- Delete: `src/lib/newsletter-service.ts`

### T019 Validate Newsletter Domain
**Action**: Run validation checks
```bash
npm run check
find src/lib/newsletter -type f -name "*.ts" -exec wc -l {} + | sort -rn
```
- Verify all files <500 lines
- Verify no TypeScript errors
- Verify no lint errors
**Checkpoint**: Must pass before proceeding to Phase 2

---

## Phase 2: Email Infrastructure Extraction

### T020 Create email/ directory structure
**Action**: Create directory
```bash
mkdir -p src/lib/email
touch src/lib/email/index.ts
```
**Files**: `src/lib/email/` (new directory)

### T021 Move smtp-temp.ts to email/smtp-service.ts
**Action**: Move SMTP configuration to email directory
```bash
mv src/lib/smtp-temp.ts src/lib/email/smtp-service.ts
```
- Update imports
- Replace console.* with logger
**Files**:
- Move: `src/lib/smtp-temp.ts` → `src/lib/email/smtp-service.ts`

### T022 [P] Move email-senders.ts to email/senders.ts
**Action**: Move and rename file
```bash
mv src/lib/email-senders.ts src/lib/email/senders.ts
```
- Update imports to use @/lib/email/smtp-service
- Replace console.* with logger
**Files**:
- Move: `src/lib/email-senders.ts` → `src/lib/email/senders.ts`

### T023 [P] Move email-render.ts to email/rendering.ts
**Action**: Move and rename file
```bash
mv src/lib/email-render.ts src/lib/email/rendering.ts
```
**Files**:
- Move: `src/lib/email-render.ts` → `src/lib/email/rendering.ts`

### T024 [P] Move email-hashing.ts to email/hashing.ts
**Action**: Move file and extract DB operations
```bash
mv src/lib/email-hashing.ts src/lib/email/hashing.ts
```
- Extract any Prisma queries to db/newsletter-operations.ts
- Replace console.* with logger
**Files**:
- Move: `src/lib/email-hashing.ts` → `src/lib/email/hashing.ts`

### T025 [P] Move email-attachment-utils.ts to email/attachments.ts
**Action**: Move and rename file
```bash
mv src/lib/email-attachment-utils.ts src/lib/email/attachments.ts
```
**Files**:
- Move: `src/lib/email-attachment-utils.ts` → `src/lib/email/attachments.ts`

### T026 [P] Move image-composition.ts to email/image-composition.ts
**Action**: Move file
```bash
mv src/lib/image-composition.ts src/lib/email/image-composition.ts
```
- Replace console.* with logger
**Files**:
- Move: `src/lib/image-composition.ts` → `src/lib/email/image-composition.ts`

### T027 [P] Move email.ts to email/mailer.ts
**Action**: Move and rename file
```bash
mv src/lib/email.ts src/lib/email/mailer.ts
```
**Files**:
- Move: `src/lib/email.ts` → `src/lib/email/mailer.ts`

### T028 Create email/index.ts barrel export
**Action**: Create index.ts that re-exports all email functions
```typescript
export * from './smtp-service';
export * from './senders';
export * from './rendering';
export * from './hashing';
export * from './attachments';
export * from './image-composition';
export * from './mailer';
```
**Files**:
- Create: `src/lib/email/index.ts`

### T029 Update imports in newsletter/ to use @/lib/email
**Action**: Update newsletter domain imports
- Change `@/lib/email-senders` to `@/lib/email`
- Change other email imports to use new paths
**Files**:
- Modify: `src/lib/newsletter/*.ts` (all newsletter files importing email)

### T030 Update imports in appointments/ API routes (prepare for Phase 3)
**Action**: Update appointment email imports
- Change `@/lib/email-senders` to `@/lib/email`
**Files**:
- Modify: `src/app/api/appointments/*/route.ts`

### T031 Validate Email Domain
**Action**: Run validation checks
```bash
npm run check
```
**Checkpoint**: Must pass before proceeding to Phase 3

---

## Phase 3: Appointments Domain Reorganization

### T032 Create appointments/ directory structure
**Action**: Create directory
```bash
mkdir -p src/lib/appointments
touch src/lib/appointments/index.ts
```
**Files**: `src/lib/appointments/` (new directory)

### T033 Split appointment-handlers.ts: Extract appointment service
**Action**: Extract CRUD operations (lines ~1-350)
- Move appointment CRUD functions
- Move business logic
- Extract Prisma queries to db/appointment-operations.ts (if not already there)
**Files**:
- Create: `src/lib/appointments/appointment-service.ts` (~350 lines)

### T034 Split appointment-handlers.ts: Extract metadata utilities
**Action**: Extract metadata parsing (lines ~351-700)
- Move iCal parsing functions
- Move metadata extraction logic
**Files**:
- Create: `src/lib/appointments/metadata-utils.ts` (~350 lines)

### T035 Split appointment-handlers.ts: Extract notification handlers
**Action**: Extract email notifications (lines ~701-996)
- Move email notification wrappers
- Use @/lib/email for sending
**Files**:
- Create: `src/lib/appointments/notification-handlers.ts` (~300 lines)

### T036 Create appointments/index.ts barrel export
**Action**: Create barrel export
```typescript
export * from './appointment-service';
export * from './metadata-utils';
export * from './notification-handlers';
```
**Files**:
- Create: `src/lib/appointments/index.ts`

### T037 Update imports in src/app/api/appointments/ routes
**Action**: Update API routes
- Change `@/lib/appointment-handlers` to `@/lib/appointments`
**Files**:
- Modify: `src/app/api/appointments/*/route.ts`

### T038 Update imports in src/app/admin/appointments/ pages
**Action**: Update admin pages
- Change `@/lib/appointment-handlers` to `@/lib/appointments`
**Files**:
- Modify: `src/app/admin/appointments/**/page.tsx`

### T039 Delete old appointment-handlers.ts
**Action**: Remove original file
```bash
rm src/lib/appointment-handlers.ts
```
**Files**:
- Delete: `src/lib/appointment-handlers.ts`

### T040 Validate Appointments Domain
**Action**: Run validation checks
```bash
npm run check
find src/lib/appointments -type f -name "*.ts" -exec wc -l {} + | sort -rn
```
**Checkpoint**: Must pass before proceeding to Phase 4

---

## Phase 4: Groups Domain Reorganization

### T041 Create groups/ directory structure
**Action**: Create directory
```bash
mkdir -p src/lib/groups
touch src/lib/groups/index.ts
```
**Files**: `src/lib/groups/` (new directory)

### T042 Split group-handlers.ts: Extract group service
**Action**: Extract group CRUD (lines ~1-350)
- Move group CRUD operations
- Extract Prisma queries to db/group-operations.ts
**Files**:
- Create: `src/lib/groups/group-service.ts` (~350 lines)

### T043 Split group-handlers.ts: Extract status report service
**Action**: Extract status report CRUD (lines ~351-700)
- Move status report functions
- Create db/status-report-operations.ts for DB queries
**Files**:
- Create: `src/lib/groups/status-report-service.ts` (~350 lines)
- Create: `src/lib/db/status-report-operations.ts` (~150 lines)

### T044 Split group-handlers.ts: Extract file cleanup utilities
**Action**: Extract file management (lines ~701-1029)
- Move file cleanup functions
- Move file handling utilities
**Files**:
- Create: `src/lib/groups/file-cleanup.ts` (~330 lines)

### T045 Create groups/index.ts barrel export
**Action**: Create barrel export
```typescript
export * from './group-service';
export * from './status-report-service';
export * from './file-cleanup';
```
**Files**:
- Create: `src/lib/groups/index.ts`

### T046 Update imports in src/app/api/groups/ and status-reports/ routes
**Action**: Update API routes
- Change `@/lib/group-handlers` to `@/lib/groups`
**Files**:
- Modify: `src/app/api/groups/*/route.ts`
- Modify: `src/app/api/status-reports/*/route.ts`

### T047 Update imports in admin pages
**Action**: Update admin pages
- Change `@/lib/group-handlers` to `@/lib/groups`
**Files**:
- Modify: `src/app/admin/groups/**/page.tsx`
- Modify: `src/app/admin/status-reports/**/page.tsx`

### T048 Delete old group-handlers.ts
**Action**: Remove original file
```bash
rm src/lib/group-handlers.ts
```
**Files**:
- Delete: `src/lib/group-handlers.ts`

### T049 Validate Groups Domain
**Action**: Run validation checks
```bash
npm run check
find src/lib/groups -type f -name "*.ts" -exec wc -l {} + | sort -rn
```
**Checkpoint**: Must pass before proceeding to Phase 5

---

## Phase 5: Anträge Domain Reorganization

### T050 Create antraege/ directory and move files
**Action**: Create directory and move Antrag files
```bash
mkdir -p src/lib/antraege
mv src/lib/antrag-handlers.ts src/lib/antraege/antrag-handlers.ts
mv src/lib/antrag-file-utils.ts src/lib/antraege/antrag-file-utils.ts
```
- Replace console.* with logger in both files
**Files**:
- Create: `src/lib/antraege/` (new directory)
- Move: `src/lib/antrag-handlers.ts` → `src/lib/antraege/antrag-handlers.ts`
- Move: `src/lib/antrag-file-utils.ts` → `src/lib/antraege/antrag-file-utils.ts`

### T051 Create antraege/index.ts barrel export
**Action**: Create barrel export
```typescript
export * from './antrag-handlers';
export * from './antrag-file-utils';
```
**Files**:
- Create: `src/lib/antraege/index.ts`

### T052 Update imports in src/app/api/antraege/ routes
**Action**: Update API routes
- Change `@/lib/antrag-handlers` to `@/lib/antraege`
- Change `@/lib/antrag-file-utils` to `@/lib/antraege`
**Files**:
- Modify: `src/app/api/antraege/*/route.ts`

### T053 Update imports in admin pages
**Action**: Update admin pages
- Change `@/lib/antrag-*` to `@/lib/antraege`
**Files**:
- Modify: `src/app/admin/antraege/**/page.tsx`

### T054 Validate Anträge Domain
**Action**: Run validation checks
```bash
npm run check
```
**Checkpoint**: Must pass before proceeding to Phase 6

---

## Phase 6: AI & Analytics Extraction

### T055 [P] Create ai/ directory and move AI files
**Action**: Create directory and move files
```bash
mkdir -p src/lib/ai
mv src/lib/ai-service.ts src/lib/ai/service.ts
mv src/lib/ai-prompts.ts src/lib/ai/prompts.ts
mv src/lib/ai-models.ts src/lib/ai/models.ts
```
- Extract Prisma queries from service.ts to db/newsletter-operations.ts
- Replace console.* with logger
- Create index.ts barrel export
**Files**:
- Create: `src/lib/ai/` (new directory)
- Move: `src/lib/ai-service.ts` → `src/lib/ai/service.ts`
- Move: `src/lib/ai-prompts.ts` → `src/lib/ai/prompts.ts`
- Move: `src/lib/ai-models.ts` → `src/lib/ai/models.ts`
- Create: `src/lib/ai/index.ts`

### T056 [P] Create analytics/ directory and move analytics files
**Action**: Create directory and move files
```bash
mkdir -p src/lib/analytics
mv src/lib/fingerprinting.ts src/lib/analytics/fingerprinting.ts
mv src/lib/analytics-cleanup.ts src/lib/analytics/cleanup.ts
```
- Create index.ts barrel export
**Files**:
- Create: `src/lib/analytics/` (new directory)
- Move: `src/lib/fingerprinting.ts` → `src/lib/analytics/fingerprinting.ts`
- Move: `src/lib/analytics-cleanup.ts` → `src/lib/analytics/cleanup.ts`
- Create: `src/lib/analytics/index.ts`

### T057 Update imports for AI and Analytics
**Action**: Update imports throughout codebase
- Change `@/lib/ai-service` to `@/lib/ai`
- Change `@/lib/fingerprinting` to `@/lib/analytics`
**Files**:
- Modify: `src/lib/newsletter/*.ts`
- Modify: `src/app/api/newsletter/*/route.ts`

### T058 Validate AI & Analytics
**Action**: Run validation checks
```bash
npm run check
```
**Checkpoint**: Must pass before proceeding to Phase 7

---

## Phase 7: Auth Extraction

### T059 Create auth/ directory and move auth files
**Action**: Create directory and move files
```bash
mkdir -p src/lib/auth
mv src/lib/auth-options.ts src/lib/auth/auth-options.ts
mv src/lib/api-auth.ts src/lib/auth/api-auth.ts
mv src/lib/auth.ts src/lib/auth/session.ts
```
- Extract user operations from session.ts to db/user-operations.ts
- Replace console.* with logger in all files
- Create index.ts barrel export
**Files**:
- Create: `src/lib/auth/` (new directory)
- Move: `src/lib/auth-options.ts` → `src/lib/auth/auth-options.ts`
- Move: `src/lib/api-auth.ts` → `src/lib/auth/api-auth.ts`
- Move: `src/lib/auth.ts` → `src/lib/auth/session.ts`
- Create: `src/lib/db/user-operations.ts` (new file, ~100 lines)
- Create: `src/lib/auth/index.ts`

### T060 Update auth imports throughout codebase
**Action**: Update imports
- Change `@/lib/auth-options` to `@/lib/auth`
- Change `@/lib/api-auth` to `@/lib/auth`
**Files**:
- Modify: `src/app/api/*/route.ts` (all protected routes)
- Modify: NextAuth configuration files

### T061 Validate Auth Domain
**Action**: Run validation checks
```bash
npm run check
```
**Checkpoint**: Must pass before proceeding to Phase 8

---

## Phase 8: Final Cleanup & Validation

### T062 Move useApiError.ts to hooks/
**Action**: Move client hook to correct location
```bash
mv src/lib/useApiError.ts src/lib/hooks/useApiError.ts
```
- Update imports in components
**Files**:
- Move: `src/lib/useApiError.ts` → `src/lib/hooks/useApiError.ts`

### T063 Move prisma.ts to db/
**Action**: Move Prisma singleton to database directory
```bash
mv src/lib/prisma.ts src/lib/db/prisma.ts
```
- Update all imports in db/*-operations.ts files
**Files**:
- Move: `src/lib/prisma.ts` → `src/lib/db/prisma.ts`
- Modify: `src/lib/db/*.ts` (update imports)

### T064 Replace remaining console usage with logger
**Action**: Search and replace console.* calls
```bash
grep -r "console\.\(log\|error\|warn\|info\)" src/lib --include="*.ts" --exclude="logger.ts"
```
- Replace all console.log with logger.info
- Replace all console.error with logger.error
- Replace all console.warn with logger.warn
**Files**:
- Modify: Any remaining files with console usage
- Primary targets: `src/lib/image-compression.ts`, `src/lib/base-url.ts`

### T065 Final file size validation
**Action**: Verify all files under 500 lines
```bash
find src/lib -type f \( -name "*.ts" -o -name "*.tsx" \) -exec wc -l {} + | sort -rn | head -20
```
- If any files exceed 500 lines, split them further
**Validation**: Maximum file size = 500 lines

### T066 Final type checking
**Action**: Run full TypeScript validation
```bash
npm run typecheck
```
**Expected**: 0 errors

### T067 Final linting
**Action**: Run full ESLint validation
```bash
npm run lint
```
**Expected**: 0 errors

### T068 Final combined check
**Action**: Run combined validation
```bash
npm run check
```
**Expected**: 0 errors
**Checkpoint**: Must pass before manual testing

### T069 Execute quickstart.md manual testing
**Action**: Follow quickstart.md validation workflow
- Test Newsletter domain (15 min)
- Test Appointments domain (10 min)
- Test Groups domain (10 min)
- Test Anträge domain (10 min)
- Test Email infrastructure (5 min)
- Test AI infrastructure (5 min)
- Test Auth infrastructure (5 min)
- Execute full system smoke test (15 min)
**Documentation**: `/home/paw/nextjs/dielinkefrankfurt/specs/001-i-want-to/quickstart.md`
**Estimated Time**: 75 minutes

### T070 Final git commit
**Action**: Commit refactored code
```bash
git add .
git commit -m "refactor: reorganize src/lib into domain-based structure

- Split oversized files (newsletter-service, group-handlers, appointment-handlers)
- Group code by domain (newsletter/, email/, appointments/, groups/, antraege/, ai/, analytics/, auth/)
- Consolidate all DB operations in db/ directory
- Replace console usage with structured logger
- Maintain backward compatibility via barrel exports
- All files now under 500 lines
- npm run check passes without errors"
```
**Validation**: Clean git status

---

## Dependencies Graph

```
Setup (T001)
  ↓
Phase 1: Newsletter (T002-T019)
  ↓
Phase 2: Email (T020-T031) — depends on Newsletter completion
  ↓
Phase 3: Appointments (T032-T040) — depends on Email completion
  ‖
Phase 4: Groups (T041-T049) — parallel with Appointments
  ‖
Phase 5: Anträge (T050-T054) — parallel with Groups
  ↓
Phase 6: AI & Analytics (T055-T058) — depends on Newsletter
  ↓
Phase 7: Auth (T059-T061)
  ↓
Phase 8: Final Cleanup (T062-T070)
```

## Parallel Execution Opportunities

### During Phase 1 (Newsletter):
```bash
# T007, T009, T010, T011, T012, T013 can run in parallel (different files)
# Example:
Task: "Move newsletter-sending.ts to newsletter/sending-coordinator.ts"
Task: "Move newsletter-tracking.ts to newsletter/tracking-service.ts"
Task: "Move newsletter-template.ts to newsletter/template-generator.ts"
```

### During Phase 2 (Email):
```bash
# T022, T023, T025, T026, T027 can run in parallel (different files)
# Example:
Task: "Move email-render.ts to email/rendering.ts"
Task: "Move email-attachment-utils.ts to email/attachments.ts"
Task: "Move image-composition.ts to email/image-composition.ts"
```

### Between Phases 3-5:
```bash
# Phases 4 and 5 can run parallel to Phase 3 after Phase 2 completes
# Example:
Task: "Refactor Groups domain (T041-T049)"
Task: "Refactor Anträge domain (T050-T054)"
```

## Validation Checkpoints

Each phase must pass validation before proceeding:

1. **After Phase 1 (T019)**: Newsletter domain validated
2. **After Phase 2 (T031)**: Email infrastructure validated
3. **After Phase 3 (T040)**: Appointments domain validated
4. **After Phase 4 (T049)**: Groups domain validated
5. **After Phase 5 (T054)**: Anträge domain validated
6. **After Phase 6 (T058)**: AI & Analytics validated
7. **After Phase 7 (T061)**: Auth domain validated
8. **After Phase 8 (T068)**: Final automated validation
9. **After Phase 8 (T069)**: Manual testing validation

**All checkpoints require**: `npm run check` passes with 0 errors

## Success Criteria

- [ ] All 70 tasks completed
- [ ] All files under 500 lines
- [ ] All DB operations in db/ directory
- [ ] No console.* usage (only logger)
- [ ] All imports updated and working
- [ ] `npm run check` passes
- [ ] Manual testing checklist completed (quickstart.md)
- [ ] Application behavior unchanged
- [ ] Code organized by domain

## Notes

- **Sequential Execution**: Tasks within the same file must run sequentially
- **Parallel Execution**: Tasks marked [P] operate on different files and can run in parallel
- **Validation**: Run `npm run check` after each major phase
- **Commit Strategy**: Commit after each domain phase (after T019, T031, T040, T049, T054, T058, T061, T070)
- **File Splits**: Large files split into ~250-350 line modules
- **Barrel Exports**: Each domain has index.ts for backward compatibility
- **No Tests**: This project does not use automated tests (per constitution)
- **Manual Validation**: Use quickstart.md for comprehensive manual testing

---

**Tasks Generated**: 2025-10-06
**Estimated Total Time**: 8-12 hours (developer time)
**Validation Time**: 75 minutes (manual testing)
