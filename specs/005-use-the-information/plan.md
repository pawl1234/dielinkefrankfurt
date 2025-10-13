
# Implementation Plan: Strukturierte Wiederkehrende Gruppentreffen

**Branch**: `005-use-the-information` | **Date**: 2025-10-12 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/home/paw/nextjs/dielinkefrankfurt/specs/005-use-the-information/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from file system structure or context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, `GEMINI.md` for Gemini CLI, `QWEN.md` for Qwen Code, or `AGENTS.md` for all other agents).
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
Enable groups to define structured recurring meeting patterns (e.g., "every 3rd Monday of the month") using the **rrule** npm package for robust recurrence rule handling. Replace the current freeform text field with a reusable component that supports predefined patterns, calculates specific meeting dates, and displays them in German. Includes a demo page showing all upcoming meetings for the next 7 days.

## Technical Context
**Language/Version**: TypeScript 5.9.2, Next.js 15.4.6, React 18.2.0
**Primary Dependencies**: **rrule** (recurrence rule library), Material UI 7.3.1, React Hook Form 7.62.0, Zod 4.0.17, Prisma 6.13.0
**Storage**: PostgreSQL via Prisma (extend Group model with structured recurring meeting data)
**Testing**: Manual testing only (no automated tests per constitution)
**Target Platform**: Web (Next.js App Router, server-side rendering)
**Project Type**: web (frontend + backend)
**Performance Goals**: <100ms for pattern calculation over 7-day range, instant UI rendering for pattern selection
**Constraints**: Must support multiple patterns per group, German localization required, reusable component architecture
**Scale/Scope**: ~10-50 groups initially, each with 1-3 recurring patterns, component reused across 3+ forms

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| Type Safety First | [x] PASS | All types from `src/types/`, rrule library types, no `any` used |
| No Software Tests | [x] PASS | Manual validation only, no test infrastructure |
| KISS Principle | [x] PASS | rrule handles complexity, simple component API, straightforward data model |
| DRY Principle | [x] PASS | Reuse existing Group model, form patterns, Material UI components |
| Path Aliases | [x] PASS | All imports use `@/` pattern consistently |
| German User Text | [x] PASS | Pattern labels, form fields, validation messages in German |
| Structured Logging | [x] PASS | Use `logger` for server-side pattern calculations, errors |
| Server Validation | [x] PASS | Zod schema validates pattern data before storage |
| File Size Limit | [x] PASS | Small focused files: pattern definitions, component, utilities, DB operations |
| Code Documentation | [x] PASS | JSDoc for pattern converters, calculation functions |
| Domain Architecture | [x] PASS | Groups domain (`lib/groups/`), reusable components, DB operations in `lib/db/` |
| Centralized Types | [x] PASS | Check `src/types/` for existing pattern/recurrence types before creating new |

## Project Structure

### Documentation (this feature)
```
specs/[###-feature]/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->
```
# Next.js App Router Structure (this project)
src/
├── app/                  # Next.js App Router pages and API routes
│   ├── api/             # API route handlers
│   ├── admin/           # Admin dashboard pages
│   └── [public-pages]/  # Public-facing pages
├── components/          # React components
│   ├── admin/          # Admin-specific components
│   ├── forms/          # Form components
│   └── [shared]/       # Shared UI components
├── lib/                # Shared utilities and logic
│   ├── db/            # Database operations
│   ├── validation/    # Zod schemas
│   ├── form-submission/ # Form utilities
│   └── [domain-specific]/ # Feature-specific utilities
├── types/              # TypeScript type definitions
│   ├── api-types.ts
│   ├── component-types.ts
│   └── form-types.ts
├── emails/             # React Email templates
└── theme/              # Material UI theme configuration
```

**Structure Decision**: Next.js App Router with domain-based architecture. Feature code organized in:
- `lib/groups/` - Domain logic (pattern converters, meeting calculator)
- `lib/db/group-operations.ts` - Database operations
- `lib/validation/group-schema.ts` - Zod validation schemas
- `components/forms/` - Reusable form component
- `app/gruppen/` - Public pages (overview, detail, upcoming demo)
- `app/api/groups/` - API routes (extended with recurring meeting support)
- `app/admin/groups/` - Admin management pages
- `types/` - Centralized type definitions

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:
   ```
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature context}"
   For each technology choice:
     Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: ✅ research.md with all NEEDS CLARIFICATION resolved

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - ✅ Group model extension documented
   - ✅ RecurringPatternType enum defined
   - ✅ CalculatedMeeting runtime structure
   - ✅ Validation rules with Zod schemas
   - ✅ State transitions documented
   - ✅ Database schema changes (Prisma)
   - ✅ Type definitions planned

2. **Generate API contracts** from functional requirements:
   - ✅ POST /api/groups (extended)
   - ✅ PATCH /api/admin/groups/[id] (extended)
   - ✅ GET /api/groups/[slug] (extended)
   - ✅ GET /api/groups/upcoming-meetings (new)
   - ✅ Request/response schemas documented
   - ✅ Validation rules defined
   - ✅ Error handling specified

3. **Design validation approach** for contracts:
   - ✅ Manual testing scenarios in quickstart.md
   - ✅ 15 comprehensive test scenarios
   - ✅ All FR requirements mapped to scenarios
   - ✅ Constitution compliance checklist

4. **Extract validation scenarios** from user stories:
   - ✅ Anonymous user submission (Scenarios 1-3)
   - ✅ Admin management (Scenarios 4-5)
   - ✅ Public display (Scenarios 6-7)
   - ✅ Demo page (Scenario 8)
   - ✅ Edge cases (Scenarios 9-12)
   - ✅ Code quality checks (Scenarios 13-15)

5. **Component contract created**:
   - ✅ RecurringMeetingPatternSelector props interface
   - ✅ UI layout specification
   - ✅ Behavior specification
   - ✅ Material UI component hierarchy
   - ✅ Usage examples
   - ✅ Accessibility requirements

6. **Update agent file incrementally** (O(1) operation):
   - ✅ Ran `.specify/scripts/bash/update-agent-context.sh claude`
   - ✅ Added rrule library context
   - ✅ Added feature-specific dependencies
   - ✅ CLAUDE.md updated

**Output**: ✅ data-model.md, ✅ contracts/*, ✅ quickstart.md, ✅ CLAUDE.md updated

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
The /tasks command will generate tasks in the following categories:

1. **Setup & Dependencies** (Phase 0)
   - Install rrule package
   - Install @types/rrule

2. **Type Definitions** (Phase 1) [P]
   - Check existing types in `src/types/`
   - Create recurring meeting types if not existing
   - PatternType, Weekday, PatternConfig, RecurringMeetingData, CalculatedMeeting

3. **Database Layer** (Phase 2)
   - Modify Prisma schema (Group model)
   - Add `recurringPatterns` field
   - Add `meetingTime` field
   - Remove `regularMeeting` field
   - Run `npm run db:push`

4. **Domain Logic** (Phase 3) [P]
   - Create `lib/groups/recurring-patterns.ts` - Pattern definitions, rrule converters
   - Create `lib/groups/meeting-calculator.ts` - Calculate upcoming meetings
   - Add German localization constants

5. **Validation Layer** (Phase 4) [P]
   - Update `lib/validation/group-schema.ts` - Add recurring meeting validation
   - Create pattern config schema
   - Create recurring meeting data schema

6. **Database Operations** (Phase 5)
   - Update `lib/db/group-operations.ts` - Extend group queries
   - Add functions to handle recurringPatterns JSON parsing
   - Add upcoming meetings query function

7. **Reusable Component** (Phase 6)
   - Create `components/forms/RecurringMeetingPatternSelector.tsx`
   - Implement all pattern type options
   - Implement weekday selection
   - Implement time input
   - Implement "Kein regelmäßiges Treffen" toggle
   - Add pattern add/remove functionality

8. **API Routes** (Phase 7)
   - Modify `app/api/groups/route.ts` - POST endpoint with recurring meeting support
   - Modify `app/api/admin/groups/[id]/route.ts` - PATCH endpoint
   - Create `app/api/groups/upcoming-meetings/route.ts` - GET endpoint

9. **Public Forms** (Phase 8)
   - Update `app/neue-gruppe/page.tsx` - Integrate RecurringMeetingPatternSelector
   - Replace regularMeeting text field with new component

10. **Admin Forms** (Phase 9)
    - Update admin group edit form - Integrate RecurringMeetingPatternSelector
    - Ensure pattern data loads correctly for editing

11. **Public Display Pages** (Phase 10)
    - Update `app/gruppen/page.tsx` - Display patterns in German
    - Create pattern-to-text converter utility
    - Update `app/gruppen/[slug]/page.tsx` - Display detailed pattern info

12. **Demo Page** (Phase 11)
    - Create `app/gruppen/upcoming/page.tsx` - Upcoming meetings list
    - Fetch from `/api/groups/upcoming-meetings`
    - Display sorted list with all required fields
    - German date formatting

13. **Validation & Testing** (Phase 12)
    - Run `npm run check`
    - Execute all quickstart.md scenarios manually
    - Verify all FR requirements
    - Verify constitution compliance

**Ordering Strategy**:
- Dependencies first (Phase 0)
- Types before code (Phase 1)
- Database schema before operations (Phase 2-3)
- Domain logic parallel with validation (Phase 3-4) [P]
- Database operations after domain logic (Phase 5)
- Component standalone (Phase 6) [P]
- API routes after database operations (Phase 7)
- Forms after component + API (Phase 8-9)
- Display pages after forms (Phase 10-11)
- Validation last (Phase 12)

**Parallel Execution Opportunities** [P]:
- Type definitions (independent)
- Domain logic files (recurring-patterns.ts, meeting-calculator.ts)
- Validation schemas (independent from domain logic)
- Reusable component (independent until integration)

**Estimated Output**: 18-22 numbered, dependency-ordered tasks in tasks.md

**File Count Estimate**:
- New files: ~8 (types, domain logic, component, API route, demo page)
- Modified files: ~8 (schema, validation, forms, display pages, db operations)
- Total: ~16 files (well under 500 lines each per constitution)

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following constitutional principles)
**Phase 5**: Validation (manual testing, execute quickstart.md, `npm run check`)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command) ✅
- [x] Phase 1: Design complete (/plan command) ✅
- [x] Phase 2: Task planning complete (/plan command - describe approach only) ✅
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS ✅
- [x] Post-Design Constitution Check: PASS ✅
- [x] All NEEDS CLARIFICATION resolved ✅
- [x] Complexity deviations documented: NONE ✅

**Artifacts Created**:
- ✅ `/home/paw/nextjs/dielinkefrankfurt/specs/005-use-the-information/plan.md` (this file)
- ✅ `/home/paw/nextjs/dielinkefrankfurt/specs/005-use-the-information/research.md`
- ✅ `/home/paw/nextjs/dielinkefrankfurt/specs/005-use-the-information/data-model.md`
- ✅ `/home/paw/nextjs/dielinkefrankfurt/specs/005-use-the-information/quickstart.md`
- ✅ `/home/paw/nextjs/dielinkefrankfurt/specs/005-use-the-information/contracts/api-groups-recurring.md`
- ✅ `/home/paw/nextjs/dielinkefrankfurt/specs/005-use-the-information/contracts/component-recurring-meeting-selector.md`
- ✅ `/home/paw/nextjs/dielinkefrankfurt/CLAUDE.md` (updated)

**Ready for Next Phase**:
✅ All Phase 0-2 work complete. Execute `/tasks` command to generate tasks.md

---
*Based on Constitution v1.2.0 - See `.specify/memory/constitution.md`*
