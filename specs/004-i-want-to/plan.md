
# Implementation Plan: Public Groups Overview Page with Contact Modal

**Branch**: `004-i-want-to` | **Date**: 2025-10-09 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/home/paw/nextjs/dielinkefrankfurt/specs/004-i-want-to/spec.md`

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
Create a public-facing groups overview page with accordion-style navigation, allowing visitors to browse active groups, view details including optional regular meetings, and contact group responsible persons via email modal. Extends the Group model with meeting schedule and location fields, adds contact form to both public proposal and admin edit interfaces.

## Technical Context
**Language/Version**: TypeScript 5.9 with Next.js 15.4
**Primary Dependencies**: React 18, Material UI 7, Prisma 6, React Hook Form, Zod, Nodemailer
**Storage**: PostgreSQL via Prisma (Group model extended, no contact request persistence)
**Testing**: Manual testing only (no automated tests per constitution)
**Target Platform**: Web application (Next.js App Router)
**Project Type**: web (Next.js with frontend and backend)
**Performance Goals**: Sub-200ms page load for groups list, instant accordion expansion
**Constraints**: Email-only contact (no database storage for privacy), office CC configurable
**Scale/Scope**: ~10-20 active groups, email form with validation, responsive design

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| Type Safety First | [x] PASS | All types from src/types/, PublicAddress reused, no `any` types |
| No Software Tests | [x] PASS | Manual testing only, no test infrastructure |
| KISS Principle | [x] PASS | Simple accordion UI, direct email sending, no over-engineering |
| DRY Principle | [x] PASS | Reusing PublicAddress type, AddressSection component, existing email patterns |
| Path Aliases | [x] PASS | All imports use `@/` prefix per convention |
| German User Text | [x] PASS | All UI labels, validation, and error messages in German |
| Structured Logging | [x] PASS | Logger for API routes and email sending operations |
| Server Validation | [x] PASS | Zod schemas for contact form and group extension fields |
| File Size Limit | [x] PASS | Multiple focused components and API routes, each under 500 lines |
| Code Documentation | [x] PASS | JSDoc for all API handlers and utility functions |
| Domain Architecture | [x] PASS | Groups domain extended, email infrastructure reused, db operations in lib/db |
| Centralized Types | [x] PASS | New types in src/types/api-types.ts and component-types.ts, PublicAddress reused |

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

**Structure Decision**: Next.js App Router structure selected. New feature uses:
- `/gruppen-uebersicht` route for public accordion page
- `/api/groups/overview` and `/api/groups/[slug]/contact` for API endpoints
- Extension of existing Group model in Prisma schema
- Reuse of existing components (AddressSection) and utilities (submitForm, sendEmail)
- New email notification template following existing pattern
- Admin forms extended with meeting fields

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
1. **Database Layer** (Phase 2.1):
   - Update Prisma schema with Group model extensions (regularMeeting, meeting location fields)
   - Create new Prisma model GroupSettings (officeContactEmail)
   - Add new TypeScript types to `src/types/` (GroupContactRequest, PublicGroupWithMeeting, GroupSettingsData, etc.)
   - Create/update Zod validation schema for group contact form

2. **Database Operations** (Phase 2.2):
   - Add `findPublicGroupsWithMeeting()` function to `group-operations.ts`
   - Add `findGroupBySlugForContact()` function to `group-operations.ts`
   - Create new file `group-settings-operations.ts` with getGroupSettings() and updateGroupSettings()

3. **Email Infrastructure** (Phase 2.3):
   - Create email template `group-contact-request.tsx` in notifications
   - Add `sendGroupContactEmail()` function to `senders.ts`

4. **API Routes** (Phase 2.4):
   - Create `GET /api/groups/overview` route
   - Create `POST /api/groups/[slug]/contact` route

5. **Frontend Components** (Phase 2.5):
   - Create `GroupContactModal` component
   - Create `/gruppen-uebersicht/page.tsx` with accordion UI
   - Update `/neue-gruppe` form with meeting fields
   - Update admin group edit form with meeting fields
   - Create GroupSettingsDialog component for groups admin page
   - Integrate settings dialog into groups admin page

**Ordering Strategy**:
- Database schema changes MUST come first (blocking)
- Types and validation can be parallel [P]
- Database operations depend on schema completion
- Email template can be parallel with database operations [P]
- API routes depend on: schema, database operations, email infrastructure
- Frontend components depend on: API routes, types
- Form updates depend on: schema, types

**Estimated Output**: 20-24 numbered, dependency-ordered tasks in tasks.md

**Key Dependencies**:
```
Schema changes → Types [P], DB operations
Types → API routes, Components
DB operations (groups + settings) → API routes
Email template [P] → API routes
API routes → Components
Forms depend on: Schema, Types, Components
Settings dialog depends on: GroupSettings schema, DB operations
```

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

**Artifacts Generated**:
- [x] research.md - 7 research questions answered, all technical unknowns resolved
- [x] data-model.md - 4 entity definitions, validation rules, database operations
- [x] contracts/api-groups-overview.md - GET endpoint contract
- [x] contracts/api-group-contact.md - POST endpoint contract
- [x] quickstart.md - 15 manual test scenarios
- [x] CLAUDE.md - Updated with new feature context

---
*Based on Constitution v1.0.0 - See `.specify/memory/constitution.md`*
