
# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]
**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

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
Reorganize src/lib directory structure to group related code by domain (appointments, groups, newsletters, etc.), consolidate all database operations into src/lib/db/, split files exceeding 500 lines, eliminate standards violations (console usage, misplaced DB operations), and improve overall code navigability while maintaining existing application behavior.

## Technical Context
**Language/Version**: TypeScript 5.9.2 with strict mode
**Primary Dependencies**: Next.js 15.4.6 (App Router), React 18.2.0, Prisma 6.13.0, Material UI 7.3.1
**Storage**: PostgreSQL database via Prisma ORM
**Testing**: Manual testing only (no automated tests per constitution)
**Target Platform**: Next.js web application (server-side and client-side code)
**Project Type**: Web (Next.js App Router with frontend + backend API routes)
**Performance Goals**: No specific performance changes - refactoring must maintain current performance
**Constraints**: No behavioral changes, all imports must be updated, files must stay under 500 lines, npm run check must pass
**Scale/Scope**: 62 files in src/lib (12,635 lines total), 47 files in root requiring reorganization

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| Type Safety First | [x] PASS | Refactoring preserves all existing types, no new `any` types introduced |
| No Software Tests | [x] PASS | No test infrastructure - validation via `npm run check` only |
| KISS Principle | [x] PASS | Simple file moves and splits, no new abstractions or patterns |
| DRY Principle | [x] PASS | Consolidating DB operations eliminates duplication |
| Path Aliases | [x] PASS | All imports use `@/` prefix, will be updated during refactoring |
| German User Text | [x] PASS | No user-facing text changes - structural refactoring only |
| Structured Logging | [x] PASS | Part of refactoring: replace console.* with logger |
| Server Validation | [x] PASS | No validation logic changes - only file locations |
| File Size Limit | [x] PASS | Core goal: split 3 files >500 lines into smaller modules |
| Code Documentation | [x] PASS | Preserve all existing JSDoc, no documentation changes |

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

**Structure Decision**: This project uses Next.js App Router structure. The refactoring affects only src/lib/ directory structure, reorganizing files from a flat root structure (35 files) into domain-based subdirectories (appointments/, groups/, antraege/, newsletter/, email/, ai/, auth/, analytics/) plus existing well-organized directories (db/, hooks/, validation/, blob-storage/, form-submission/). See research.md and data-model.md for detailed structure.

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
- Generate tasks from research.md refactoring strategy (8 phases)
- Each phase → major task with subtasks for file moves/splits
- Each domain → directory creation + file migration + import updates
- Each oversized file → splitting subtasks
- Validation task after each domain

**Ordering Strategy**:
- Sequential by dependency: Newsletter → Email → Appointments → Groups → Anträge → AI/Analytics → Auth → Cleanup
- Newsletter first because it's most complex and has dependencies (email, ai)
- Email second to resolve circular dependencies
- Domain order based on size and complexity
- Each domain task includes: create dir, move files, extract DB ops, update imports, validate
- Mark validation tasks as checkpoints (cannot proceed until npm run check passes)

**Task Structure**:
1. Phase 1: Newsletter Domain (split newsletter-service.ts, create newsletter/, extract DB ops)
2. Phase 2: Email Infrastructure (create email/, move files, resolve circular deps)
3. Phase 3: Appointments Domain (split appointment-handlers.ts, create appointments/)
4. Phase 4: Groups Domain (split group-handlers.ts, create groups/)
5. Phase 5: Anträge Domain (create antraege/, move files)
6. Phase 6: AI & Analytics (create ai/, analytics/ directories)
7. Phase 7: Auth (create auth/, extract user operations)
8. Phase 8: Final Cleanup (move hooks, replace console, final validation)

**Estimated Output**: 40-60 granular tasks organized into 8 major phases

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
- [x] Complexity deviations documented (NONE - no violations)

---
*Based on Constitution v1.0.0 - See `.specify/memory/constitution.md`*
