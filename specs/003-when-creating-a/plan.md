
# Implementation Plan: Address Management for Appointments

**Branch**: `003-when-creating-a` | **Date**: 2025-10-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/home/paw/nextjs/dielinkefrankfurt/specs/003-when-creating-a/spec.md`

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
Add address management system for appointments with admin CRUD interface and public form dropdown selection. Admins can manage reusable addresses via a dedicated full-page interface accessible from the appointments admin page. Public users can select pre-defined addresses from a dropdown or manually enter location details. SearchFilterBar component is added to appointments admin page with search functionality and "Adressen" button for navigation.

## Technical Context
**Language/Version**: TypeScript 5.9.2, Next.js 15.4.6 (App Router)
**Primary Dependencies**: React 18.2, Material UI 7.3.1, Prisma 6.13.0, Zod 4.0.17, React Hook Form 7.62.0
**Storage**: PostgreSQL via Prisma ORM
**Testing**: Manual testing only (no automated tests per constitution)
**Target Platform**: Web application (server-side rendering + API routes)
**Project Type**: Web (Next.js App Router with frontend + backend)
**Performance Goals**: Standard web performance (<200ms API response time for CRUD operations)
**Constraints**: File size limit 500 lines, no `any` types, German user-facing text, domain-based architecture in src/lib/
**Scale/Scope**: Small feature addition (3-5 new files, 1 new Prisma model, reusable component integration)

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| Type Safety First | [x] PASS | All new code uses TypeScript strict mode, proper Prisma types, no `any` |
| No Software Tests | [x] PASS | No test files planned, manual validation via quickstart.md |
| KISS Principle | [x] PASS | Simple CRUD pattern, standard Prisma/Next.js approach, reuse SearchFilterBar |
| DRY Principle | [x] PASS | Reusing SearchFilterBar, existing form patterns, db operations structure |
| Path Aliases | [x] PASS | All imports use `@/` prefix consistently |
| German User Text | [x] PASS | All UI labels, buttons, messages in German (Adressen, Straße, etc.) |
| Structured Logging | [x] PASS | API routes will use `logger` from `@/lib/logger.ts` |
| Server Validation | [x] PASS | Zod schema for address validation in API routes |
| File Size Limit | [x] PASS | Each file <500 lines (settings page ~300, API ~200, component ~150) |
| Code Documentation | [x] PASS | JSDoc for all new functions, self-documenting code |
| Domain Architecture | [x] PASS | Address operations in `@/lib/db/`, validation in `@/lib/validation/` |

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

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

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

**Output**: research.md with all NEEDS CLARIFICATION resolved

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Generate API contracts** from functional requirements:
   - For each user action → endpoint
   - Use standard REST patterns
   - Document expected request/response schemas

3. **Design validation approach** for contracts:
   - Document manual testing scenarios
   - Create validation checklists
   - Define expected behaviors

4. **Extract validation scenarios** from user stories:
   - Each story → manual validation steps
   - Quickstart = story validation workflow

5. **Update agent file incrementally** (O(1) operation):
   - Run `.specify/scripts/bash/update-agent-context.sh claude`
     **IMPORTANT**: Execute it exactly as specified above. Do not add or remove any arguments.
   - If exists: Add only NEW tech from current plan
   - Preserve manual additions between markers
   - Update recent changes (keep last 3)
   - Keep under 150 lines for token efficiency
   - Output to repository root

**Output**: data-model.md, /contracts/*, validation scenarios, quickstart.md, agent-specific file

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart)

**Task Breakdown**:

1. **Database Layer** [P]
   - Add Address model to Prisma schema
   - Create database migration (`npm run db:push`)
   - Implement `src/lib/db/address-operations.ts` (findAll, findById, create, update, delete)

2. **Validation Layer** [P]
   - Create `src/lib/validation/address-schema.ts` with Zod schemas
   - Add German error messages

3. **API Routes**
   - Implement `/api/admin/addresses/route.ts` (GET, POST, PATCH, DELETE)
   - Implement `/api/addresses/public/route.ts` (GET for public form)
   - Enhance `/api/admin/appointments/route.ts` with search functionality

4. **Admin UI - Address Management**
   - Create `/admin/appointments/addresses/page.tsx` (full-page CRUD interface)
   - Create address list table component
   - Create address form component (create/edit)
   - Add delete confirmation dialog

5. **Admin UI - Appointments Enhancement**
   - Refactor `/admin/appointments/page.tsx` to stay under 500 lines:
     - Extract AppointmentListItem component
     - Extract AppointmentFilters component
   - Add SearchFilterBar integration
   - Add "Adressen" button navigation
   - Implement search handlers

6. **Public UI - Appointment Form**
   - Add address dropdown to `/termine/page.tsx`
   - Implement auto-fill logic for location fields
   - Maintain manual entry fallback

7. **Validation & Testing**
   - Run `npm run check` (lint + typecheck)
   - Execute quickstart.md manual validation
   - Verify all acceptance scenarios from spec.md

**Ordering Strategy**:
1. Database (Task 1) → Must complete first
2. Validation (Task 2) → Parallel with DB operations
3. API routes (Task 3) → After DB and validation
4. Admin address UI (Task 4) → After API routes
5. Admin appointments UI (Task 5) → Parallel with Task 4
6. Public form (Task 6) → After API routes
7. Validation (Task 7) → After all implementation

**Parallel Execution Markers**:
- [P] Database operations + Validation (independent modules)
- [P] Admin address UI + Admin appointments UI (independent pages)

**Estimated Output**: 12-15 numbered, ordered tasks in tasks.md

**File Size Warnings**:
- `/admin/appointments/page.tsx` will require refactoring (split into components)
- This is handled in Task 5 explicitly

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
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (none - all principles satisfied)

---
*Based on Constitution v1.0.0 - See `.specify/memory/constitution.md`*
