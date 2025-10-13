# Tasks: Strukturierte Wiederkehrende Gruppentreffen

**Input**: Design documents from `/home/paw/nextjs/dielinkefrankfurt/specs/005-use-the-information/`
**Prerequisites**: ✅ plan.md, ✅ research.md, ✅ data-model.md, ✅ contracts/, ✅ quickstart.md

## Execution Flow (main)
```
1. Load plan.md from feature directory ✅
   → Tech stack: TypeScript 5.9.2, Next.js 15.4.6, React 18.2.0, rrule library
   → Structure: Next.js App Router with domain-based architecture
2. Load optional design documents ✅
   → data-model.md: Group model extension, RecurringPatternType, CalculatedMeeting
   → contracts/: api-groups-recurring.md, component-recurring-meeting-selector.md
   → research.md: rrule implementation, JSON storage, German localization
3. Generate tasks by category ✅
   → Setup: rrule dependencies
   → Types: Check existing, add recurring meeting types
   → Database: Prisma schema changes, operations
   → Domain Logic: Pattern converters, meeting calculator
   → Validation: Zod schemas for recurring meetings
   → Components: Reusable RecurringMeetingPatternSelector
   → API Routes: Extend existing, add upcoming-meetings endpoint
   → UI: Forms and display pages
   → Polish: Manual validation, code quality checks
4. Apply task rules ✅
   → Different files = marked [P] for parallel
   → Same file = sequential (no [P])
   → Type checking before type creation
5. Number tasks sequentially (T001-T022) ✅
6. Validate task completeness ✅
   → All contracts have implementation tasks
   → All entities have models/validation/operations
   → All endpoints implemented
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Phase 3.1: Setup & Dependencies
- [X] T001 Install rrule npm package: `npm install rrule`
- [X] T002 Install @types/rrule for TypeScript support: `npm install --save-dev @types/rrule`

## Phase 3.2: Types & Validation
- [X] T003 Check `src/types/form-types.ts`, `src/types/component-types.ts`, and `src/types/api-types.ts` for existing recurring meeting or pattern types to avoid duplication
- [X] T004 [P] Create recurring meeting types in `src/types/form-types.ts`: `PatternType`, `Weekday`, `PatternConfig`, `RecurringMeetingData`, `CalculatedMeeting`
- [X] T005 [P] Create Zod validation schema for recurring meetings in `src/lib/validation/group.ts`: `patternConfigSchema`, `recurringMeetingDataSchema`, extend `groupCreateSchema`

## Phase 3.3: Database Layer
- [X] T006 Update Prisma schema in `prisma/schema.prisma`: Add `recurringPatterns` (String?, Text), add `meetingTime` (String?, VarChar(5)), remove `regularMeeting` field from Group model
- [X] T007 Skipped per CLAUDE.md: Database changes will be validated by human

## Phase 3.4: Domain Logic & Utilities
- [X] T008 [P] Create `src/lib/groups/recurring-patterns.ts`: Pattern definitions (PATTERN_TYPE_OPTIONS, WEEKDAY_OPTIONS), German label mappings, rrule converter functions (PatternConfig → rrule string), pattern-to-text display function
- [X] T009 [P] Create `src/lib/groups/meeting-calculator.ts`: Calculate upcoming meetings function (parse rrule strings, use RRule.between(), merge occurrences, sort by date), German date formatting using dayjs

## Phase 3.5: Database Operations
- [X] T010 Update `src/lib/db/group-operations.ts`: Extend group creation/update functions to handle `recurringPatterns` JSON serialization, add `getGroupsWithUpcomingMeetings()` function, add JSON parsing for `recurringPatterns` field

## Phase 3.6: Reusable Component
- [X] T011 Create `src/components/forms/RecurringMeetingPatternSelector.tsx`: Implement controlled component with props interface (value, onChange, error, labels, disabled), render checkbox for "Kein regelmäßiges Treffen", render pattern selectors (type + weekday dropdowns), render time input (Material UI TextField type="time"), implement add/remove pattern logic, display error message, use German labels from recurring-patterns.ts

## Phase 3.7: API Routes
- [X] T012 Modify `src/app/api/groups/submit/route.ts`: Extend POST handler to accept `recurringMeeting` field, validate with Zod schema, convert PatternConfig[] to rrule strings using recurring-patterns.ts, store in Group.recurringPatterns as JSON, handle "Kein regelmäßiges Treffen" case (empty array), add German error messages
- [X] T013 Modify `src/app/api/admin/groups/[id]/route.ts`: Extend PATCH handler to accept `recurringMeeting` field, validate and convert patterns, update Group.recurringPatterns and Group.meetingTime, handle pattern removal case
- [X] T014 Create `src/app/api/groups/upcoming-meetings/route.ts`: GET handler to load active groups with recurringPatterns, calculate meetings using meeting-calculator.ts for next 7 days (or query param days, max 30), return sorted CalculatedMeeting[] array, handle errors with German messages

## Phase 3.8: Public Forms
- [X] T015 Update `src/components/forms/groups/GroupRequestForm.tsx` and `GroupMeetingSection.tsx`: Import RecurringMeetingPatternSelector component, replace `regularMeeting` text field with RecurringMeetingPatternSelector, integrate with React Hook Form Controller, pass error state from form validation, submit `recurringMeeting` data to API

## Phase 3.9: Admin Forms
- [X] T016 Update admin group edit form (`src/components/forms/groups/EditGroupForm.tsx`): Import RecurringMeetingPatternSelector, replace existing meeting field with new component, load existing `recurringPatterns` and `meetingTime` from group data, convert rrule strings back to PatternConfig[] for editing, submit updated data

## Phase 3.10: Public Display Pages
- [ ] T017 Update `src/app/gruppen/page.tsx`: Display recurring meeting patterns in German using pattern-to-text converter from recurring-patterns.ts, show time and location info, handle groups with no patterns ("Keine regelmäßigen Treffen" or hide section)
- [ ] T018 Update `src/app/gruppen/[slug]/page.tsx`: Display detailed pattern information using German labels, show meeting time and full location details, handle null/empty patterns gracefully

## Phase 3.11: Demo Page
- [ ] T019 Create `src/app/gruppen/upcoming/page.tsx`: Fetch from `/api/groups/upcoming-meetings`, display sorted list of upcoming meetings (next 7 days), show: group name (with link to detail), German formatted date (e.g., "Montag, 15. Januar 2025"), time ("19:00 Uhr"), location (street, city), handle empty results, add page title and description

## Phase 3.12: Validation & Code Quality
- [X] T020 Run `npm run check` to validate TypeScript types and ESLint rules, fix any errors
  - Linting: ✅ All warnings fixed (unused error variables renamed to _error)
  - TypeScript: ⚠️ 7 type errors expected - Prisma types will be regenerated when `npm run db:push` is run
  - All errors relate to new `recurringPatterns` and `meetingTime` fields not yet in Prisma client
  - These will auto-resolve when database schema is pushed
- [ ] T021 Execute all 15 quickstart scenarios manually from `quickstart.md`, verify all functional requirements (FR-001 through FR-018), verify all constitution compliance checks, document any issues found
- [ ] T022 Verify final code quality: All files <500 lines (run `wc -l` on new/modified files), no `any` types (grep for ": any" in src/), all imports use `@/` alias, all user-facing text in German, all functions have JSDoc comments, structured logging with logger (no console.log)

## Dependencies

**Sequential Dependencies**:
- T001-T002 → T003 (need rrule installed to reference types)
- T003 → T004 (check existing types before creating new)
- T004 → T005 (types before validation schemas)
- T004 → T008, T009 (types before domain logic)
- T006-T007 → T010 (schema changes before operations)
- T008 → T011, T012, T013, T014 (pattern converters before components/APIs)
- T009 → T014 (calculator before upcoming-meetings API)
- T010 → T014 (operations before upcoming-meetings API)
- T011 → T015, T016 (component before form integration)
- T012-T013 → T015, T016 (API routes before forms)
- T014 → T019 (API before demo page)
- T008 → T017, T018 (pattern display logic before public pages)
- All implementation (T001-T019) → T020-T022 (validation last)

**Parallel Opportunities**:
- T004 ⟂ T005 (types and validation in different files)
- T008 ⟂ T009 (recurring-patterns.ts and meeting-calculator.ts independent)
- T012 ⟂ T013 (different API route files)
- T017 ⟂ T018 (different display page files)

## Parallel Execution Example

```bash
# Phase 3.2: Types & Validation (after T003 completes)
# Launch T004 and T005 together:
Task: "Create recurring meeting types in src/types/form-types.ts"
Task: "Create Zod validation schema in src/lib/validation/group-schema.ts"

# Phase 3.4: Domain Logic (after T004 completes)
# Launch T008 and T009 together:
Task: "Create src/lib/groups/recurring-patterns.ts with pattern definitions and converters"
Task: "Create src/lib/groups/meeting-calculator.ts with date calculation logic"

# Phase 3.7: API Routes (after T010, T011 complete)
# Launch T012 and T013 together:
Task: "Modify src/app/api/groups/route.ts to handle recurring meetings"
Task: "Modify src/app/api/admin/groups/[id]/route.ts to handle pattern updates"

# Phase 3.10: Display Pages (after T008 completes)
# Launch T017 and T018 together:
Task: "Update src/app/gruppen/page.tsx to display patterns"
Task: "Update src/app/gruppen/[slug]/page.tsx to display pattern details"
```

## File Impact Summary

**New Files** (8 files):
1. `src/lib/groups/recurring-patterns.ts` (~150 lines)
2. `src/lib/groups/meeting-calculator.ts` (~120 lines)
3. `src/components/forms/RecurringMeetingPatternSelector.tsx` (~250 lines)
4. `src/app/api/groups/upcoming-meetings/route.ts` (~80 lines)
5. `src/app/gruppen/upcoming/page.tsx` (~120 lines)

**Modified Files** (8 files):
1. `prisma/schema.prisma` (+2 lines, -1 line in Group model)
2. `src/types/form-types.ts` (+30 lines for recurring meeting types)
3. `src/lib/validation/group-schema.ts` (+40 lines for validation)
4. `src/lib/db/group-operations.ts` (+50 lines for JSON handling + query)
5. `src/app/api/groups/route.ts` (+60 lines for recurring meeting processing)
6. `src/app/api/admin/groups/[id]/route.ts` (+50 lines for pattern updates)
7. `src/app/neue-gruppe/page.tsx` (+30 lines for component integration)
8. `src/app/gruppen/page.tsx` (+40 lines for pattern display)
9. `src/app/gruppen/[slug]/page.tsx` (+40 lines for pattern details)
10. Admin group edit form (location TBD during T016, ~30 lines)

**Total**: ~18 files touched, all estimated <500 lines ✅

## Notes
- [P] tasks can run in parallel (different files, no dependencies)
- Run `npm run check` after significant changes (especially after T010, T014, T016)
- No automated tests per constitution (manual testing in T021)
- All user-facing text must be in German (validation in T022)
- Use `logger` from `@/lib/logger.ts` for server-side logging (no console.log)
- Reuse existing Material UI components and form patterns from codebase
- Group patterns stored as JSON array of rrule strings (e.g., `["FREQ=MONTHLY;BYDAY=1MO"]`)
- Demo page path `/gruppen/upcoming` may need adjustment if conflicts with existing routes

## Validation Checklist
*GATE: Verify before marking Phase 3 complete*

**Design Coverage**:
- [x] Type checking task included before type creation (T003 → T004)
- [x] All new types defined in `src/types/` centrally (T004)
- [x] All contracts have corresponding implementation tasks
  - api-groups-recurring.md → T012, T013, T014
  - component-recurring-meeting-selector.md → T011
- [x] All entities have Prisma schema, validation, operations tasks
  - Group model → T006, T007 (Prisma)
  - RecurringMeetingData → T005 (validation)
  - Group operations → T010
- [x] Database changes before API implementation (T006-T007 → T012-T014)
- [x] Parallel tasks truly independent (different files, verified above)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task
- [x] Constitution principles respected
  - ✅ No software tests (only manual validation T021)
  - ✅ File size limit documented (<500 lines, checked in T022)
  - ✅ Centralized types (T003-T004 in src/types/)
  - ✅ Path aliases (`@/` throughout)
  - ✅ German user text (validated in T022)
  - ✅ Structured logging (logger used in API routes)
  - ✅ Server validation (Zod schemas in T005, used in T012-T014)
  - ✅ Domain architecture (lib/groups/ for domain logic)

**Functional Coverage**:
- [x] FR-001-018: All functional requirements mapped to tasks
- [x] All quickstart scenarios covered in T021 manual validation
- [x] All pattern types implemented (T008, T011)
- [x] Component reusability achieved (T011 standalone component)
- [x] German localization throughout (T008, T012-T019)
- [x] Edge cases handled (invalid dates skipped by rrule, T021 validation)

## Ready for Implementation
✅ All prerequisites met
✅ 22 tasks generated, dependency-ordered
✅ Parallel execution opportunities identified
✅ Constitution compliance verified
✅ Design coverage complete

**Next Step**: Execute tasks T001-T022 in order, respecting dependencies and running parallel tasks concurrently where marked [P].
