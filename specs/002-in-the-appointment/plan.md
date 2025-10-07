
# Implementation Plan: Refactor "Bundesland" Field to Location Details

**Branch**: `002-in-the-appointment` | **Date**: 2025-10-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/home/paw/nextjs/dielinkefrankfurt/specs/002-in-the-appointment/spec.md`

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
Refactor the "Bundesland" (state) field in the appointment form to properly represent additional location details like room numbers or building names. The field will be renamed throughout the system (database column: `locationDetails`, frontend label: "Zusatzinformationen") with all existing values cleared during migration. This is a schema refactor affecting database, validation, UI, and documentation.

## Technical Context
**Language/Version**: TypeScript 5.9.2, Next.js 15.4.6
**Primary Dependencies**: React 18.2, Material UI 7.3.1, React Hook Form 7.62, Zod 4.0.17, Prisma 6.13.0
**Storage**: PostgreSQL via Prisma ORM
**Testing**: Manual testing only (no automated tests per constitution)
**Target Platform**: Web application (Next.js App Router, server-side rendering)
**Project Type**: web (frontend + backend integrated)
**Performance Goals**: Standard web app performance (<200ms API response time)
**Constraints**: 500-line file limit per constitution, no `any` types, German user-facing text
**Scale/Scope**: Single field refactor affecting ~10 files (schema, form components, validation, API routes, admin views)

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| Type Safety First | [✓] PASS | Field type changes maintain strict typing (string → string?) |
| No Software Tests | [✓] PASS | Validation through manual testing only |
| KISS Principle | [✓] PASS | Direct field rename with migration, no complex abstractions |
| DRY Principle | [✓] PASS | Reusing existing validation patterns, form components, DB operations |
| Path Aliases | [✓] PASS | All imports use `@/` prefix per project convention |
| German User Text | [✓] PASS | Label "Zusatzinformationen", help text in German |
| Domain-Based Architecture | [✓] PASS | Changes isolated to appointments domain |
| Structured Logging | [✓] PASS | API routes will use existing logger utility |
| Server Validation | [✓] PASS | Zod schema updates for field validation |
| File Size Limit | [✓] PASS | All modified files under 500 lines |
| Code Documentation | [✓] PASS | JSDoc for modified functions, clear variable names |

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
The /tasks command will create tasks.md based on the following breakdown:

1. **Database Layer** [P]
   - Update Prisma schema (rename field, add @map)
   - Run database migration
   - Verify schema in database studio

2. **Validation Layer** [P after database]
   - Update appointment.ts Zod schema
   - Update admin-schemas.ts
   - Update validation-messages.ts field labels

3. **Form Components** [P after validation]
   - Update AddressSection.tsx field name and label
   - Update help text in AddressSection.tsx

4. **Admin Dashboard** [P after validation]
   - Update admin appointments page (if displaying field)

5. **Validation & Testing**
   - Run `npm run check` to verify all changes
   - Execute quickstart.md manual test scenarios
   - Verify all 9 functional requirements

**Ordering Strategy**:
- **Sequential**: Database → Validation → UI (due to type dependencies)
- **Parallel Opportunities**: Within validation layer (3 files independent)
- **Critical Path**: Prisma schema must complete first (generates types)

**Task Attributes**:
- Each task includes file path with line numbers (from research.md)
- German user-facing text specified per constitution
- Validation checkpoints after each layer
- Reference to specific FRs from spec.md

**Estimated Output**: 8-12 numbered tasks in dependency order

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
- [✓] Phase 0: Research complete (/plan command)
- [✓] Phase 1: Design complete (/plan command)
- [✓] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [✓] Initial Constitution Check: PASS
- [✓] Post-Design Constitution Check: PASS
- [✓] All NEEDS CLARIFICATION resolved
- [✓] Complexity deviations documented (none required)

---
*Based on Constitution v1.0.0 - See `.specify/memory/constitution.md`*
