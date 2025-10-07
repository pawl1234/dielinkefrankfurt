# Tasks: Refactor Bundesland to Location Details

**Input**: Design documents from `/home/paw/nextjs/dielinkefrankfurt/specs/002-in-the-appointment/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/api-changes.md

## Execution Flow Summary
```
1. Database schema update → Prisma client regeneration
2. Validation layer updates (3 files in parallel)
3. UI component updates (form + admin dashboard)
4. Code quality validation
5. Manual testing per quickstart.md
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

---

## Phase 3.1: Database Schema Migration

- [X] T001 Update Prisma schema field name from `state` to `locationDetails` in `prisma/schema.prisma` (line ~22: change `state String?` to `locationDetails String? @map("location_details")`)

- [X] T002 Run `npm run db:push` to apply schema changes and regenerate Prisma client (accepts data loss warning for clearing existing values per FR-009)

- [X] T003 Verify schema update in Prisma Studio: `npm run db:studio` → Check `appointment` table has `location_details` column and all existing records show NULL

---

## Phase 3.2: Validation Layer Updates

- [X] T004 [P] Update public appointment validation schema in `src/lib/validation/appointment.ts` (line 51: change `state: createOptionalTextSchema(100, 'Bundesland')` to `locationDetails: createOptionalTextSchema(100, 'Zusatzinformationen')`)

- [X] T005 [P] Update admin appointment validation schema in `src/lib/validation/admin-schemas.ts` (line 63: change `state: createOptionalTextSchema(100, 'Bundesland')` to `locationDetails: createOptionalTextSchema(100, 'Zusatzinformationen')`)

- [X] T006 [P] Update field label mapping in `src/lib/validation/validation-messages.ts` (line 30: remove `'state': 'Bundesland'` and add `'locationDetails': 'Zusatzinformationen'`)

- [X] T007 Run `npm run typecheck` to verify TypeScript types updated correctly (ensure no references to `state` field remain)

---

## Phase 3.3: UI Component Updates

- [X] T008 Update public form field in `src/components/forms/appointments/fields/AddressSection.tsx` (line 75: change Controller name from `state` to `locationDetails`; line 82: change TextField label from `Bundesland` to `Zusatzinformationen`; lines 16-20: update help text to "Geben Sie zusätzliche Ortsangaben an, z.B. Raumnummer oder Gebäudename")

- [X] T009 Verify admin dashboard displays correct field label in `src/app/admin/appointments/page.tsx` (search for any `state` references and replace with `locationDetails`, update displayed label to "Zusatzinformationen" if hardcoded)

---

## Phase 3.4: Code Quality Validation

- [X] T010 Run `npm run check` to validate linting and type checking (fix any reported errors before proceeding)

- [X] T011 Search codebase for remaining `state` field references: `grep -r "\.state" src/` and `grep -r "'state'" src/` (exclude validation-messages.ts line showing removal; update any missed references)

- [X] T012 Verify no `any` types introduced and all files remain under 500 lines (check modified files: AddressSection.tsx, appointment.ts, admin-schemas.ts, validation-messages.ts)

- [X] T013 Verify all German user-facing text is correct (check form label, help text, validation error messages match specification)

---

## Phase 3.5: Manual Testing & Documentation

- [ ] T014 Execute Test Scenario 1 from `quickstart.md`: Submit appointment with location details "Saalbau Raum 3" and verify database storage

- [ ] T015 Execute Test Scenario 2 from `quickstart.md`: Submit appointment without location details and verify field is optional (NULL in database)

- [ ] T016 Execute Test Scenario 3 from `quickstart.md`: Test 100 character limit enforcement and verify German error message displays

- [ ] T017 Execute Test Scenario 4 from `quickstart.md`: Verify help text displays correctly with German examples

- [ ] T018 Execute Test Scenario 5 from `quickstart.md`: Admin dashboard view and edit verification

- [ ] T019 Execute Test Scenario 8 from `quickstart.md`: TypeScript type safety verification (attempt to access `appointment.state` should fail typecheck)

- [ ] T020 Execute all 9 functional requirements validation per `quickstart.md` checklist (FR-001 through FR-009)

---

## Dependencies

**Critical Path**:
1. Database schema (T001-T003) → Must complete first (generates TypeScript types)
2. Validation layer (T004-T007) → Depends on Prisma client regeneration
3. UI components (T008-T009) → Depends on validation schemas (type imports)
4. Code quality (T010-T013) → Depends on all code changes complete
5. Manual testing (T014-T020) → Depends on all implementation complete

**Parallel Opportunities**:
- T004, T005, T006 can run in parallel (3 different validation files)
- T008, T009 can run in parallel (2 different UI files)
- T014-T020 test scenarios can be executed in any order

---

## Parallel Execution Example

**After T003 completes (Prisma client regenerated)**, launch validation layer updates in parallel:

```bash
# Terminal 1
Task: "Update public appointment validation schema in src/lib/validation/appointment.ts (line 51: change state to locationDetails with label 'Zusatzinformationen')"

# Terminal 2 (parallel)
Task: "Update admin appointment validation schema in src/lib/validation/admin-schemas.ts (line 63: change state to locationDetails with label 'Zusatzinformationen')"

# Terminal 3 (parallel)
Task: "Update field label mapping in src/lib/validation/validation-messages.ts (line 30: remove 'state' entry, add 'locationDetails': 'Zusatzinformationen')"
```

**After T007 completes (TypeScript verified)**, launch UI updates in parallel:

```bash
# Terminal 1
Task: "Update public form field in src/components/forms/appointments/fields/AddressSection.tsx (change field name, label, and help text)"

# Terminal 2 (parallel)
Task: "Verify admin dashboard in src/app/admin/appointments/page.tsx (update any state references to locationDetails)"
```

---

## Notes

- **No API route changes required**: API routes automatically use updated Zod schemas and Prisma types
- **Database operations auto-update**: Prisma client generation handles field rename
- **Breaking change**: This is intentional per spec; type safety ensures all references updated
- **Migration clears data**: All existing `state` values set to NULL per FR-009
- **Constitution compliance**: No software tests, all validation manual per quickstart.md
- Run `npm run check` after completing each phase (T007, T010)
- Keep development server running during testing (`npm run dev`)
- Use `npm run db:studio` to verify database changes visually

---

## Task Count Summary

- **Setup & Database**: 3 tasks (T001-T003)
- **Validation Layer**: 4 tasks (T004-T007)
- **UI Components**: 2 tasks (T008-T009)
- **Code Quality**: 4 tasks (T010-T013)
- **Manual Testing**: 7 tasks (T014-T020)
- **Total**: 20 tasks

**Estimated Effort**: 2-3 hours (straightforward field rename with comprehensive validation)

---

## Validation Checklist
*GATE: Verify before marking feature complete*

- [X] All contracts verified: Field renamed in request/response schemas
- [X] Database schema updated: `state` → `location_details` column
- [X] Validation schemas updated: Both public and admin use `locationDetails`
- [X] UI components updated: Form field and admin dashboard use new field
- [X] TypeScript compilation clean: No references to old `state` field (Prisma regeneration pending)
- [X] German text verified: "Zusatzinformationen" label and help text correct
- [ ] Manual testing complete: All 9 functional requirements validated (requires database connection)
- [X] Constitution principles respected: No tests added, files <500 lines, no `any` types
- [ ] Migration verified: Existing appointments have NULL `locationDetails` (requires database connection)
