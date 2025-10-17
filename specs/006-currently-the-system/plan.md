
# Implementation Plan: Member Portal with Role-Based Access

**Branch**: `006-currently-the-system` | **Date**: 2025-10-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/home/paw/nextjs/dielinkefrankfurt/specs/006-currently-the-system/spec.md`

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
Extend the existing newsletter management system with an authenticated member portal for party members (mitglied). The system currently has public interfaces and an admin interface. This feature introduces a third interface type: a member portal with role-based access control. Users with "admin" or "mitglied" roles can access the portal after authentication.

**Key Finding**: User management UI already exists at `src/app/admin/users/page.tsx` with comprehensive CRUD functionality. Only needs minor modification to add "mitglied" role option to existing dropdowns.

The implementation requires:
1. Extending the authentication system to support multiple roles (admin, mitglied) with future extensibility
2. Creating a new member portal interface with navigation menu and start page
3. Establishing clear API segregation between admin operations and member portal operations
4. **Extending existing** user management UI to add "mitglied" role option (page already exists)
5. Implementing session management (one session per user, role changes apply on next login)

## Technical Context
**Language/Version**: TypeScript (strict mode), Next.js 15+ with App Router
**Primary Dependencies**: Next.js, NextAuth.js v4, React 18+, Material UI (MUI), Prisma ORM, Zod, bcrypt
**Storage**: PostgreSQL (via Prisma), Vercel Blob Storage (for files)
**Testing**: Manual testing only (no automated tests per constitution)
**Target Platform**: Web (Linux server deployment, Vercel hosting)
**Project Type**: Web (Next.js fullstack with API routes + frontend)
**Performance Goals**: <500ms page load, <200ms API response (typical web app expectations)
**Constraints**: Must maintain existing admin/public interfaces without breaking changes, secure role separation, session security
**Scale/Scope**: Small-to-medium org (~100-500 members), 3 interface types (public, admin, member portal), role-based access system

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| Type Safety First | [x] PASS | Will check existing types in `src/types/` (user.ts, api-types.ts, component-types.ts), create new role types if needed |
| No Software Tests | [x] PASS | No tests planned, manual validation only per constitution |
| KISS Principle | [x] PASS | Simplest approach: Extend existing User model with role field, use NextAuth callbacks for role checks, no complex RBAC framework |
| DRY Principle | [x] PASS | Reuse existing auth utilities (`src/lib/auth/`), NextAuth configuration, admin UI patterns, form submission utilities |
| Path Aliases | [x] PASS | Will use `@/` consistently for all imports |
| German User Text | [x] PASS | All portal UI text, error messages, and form labels in German |
| Structured Logging | [x] PASS | Will use `logger` from `@/lib/logger.ts` for API routes and server operations |
| Server Validation | [x] PASS | Will create Zod schemas for user management operations (role assignment validation) |
| File Size Limit | [x] PASS | Plan to create small focused files: member portal pages, auth middleware, role utilities all <500 lines |
| Code Documentation | [x] PASS | JSDoc for all new functions, inline comments only where necessary |
| Domain Architecture | [x] PASS | Auth modifications in `src/lib/auth/`, portal pages in `src/app/portal/`, API routes follow existing structure |
| Centralized Types | [x] PASS | Will check `src/types/user.ts` and `api-types.ts`, extend User type with role, create RoleType if not exists |

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
```
src/
├── app/
│   ├── api/
│   │   ├── admin/
│   │   │   └── users/         # NEW: User management endpoints (create, update, delete with role)
│   │   └── portal/            # NEW: Member portal API endpoints (future features)
│   ├── admin/
│   │   └── users/
│   │       └── page.tsx       # MODIFY: Extend existing user management UI to add "mitglied" role option
│   ├── portal/                # NEW: Member portal pages
│   │   ├── layout.tsx         # Portal layout with navigation menu
│   │   └── page.tsx           # Portal start page (welcome + instructions)
│   └── auth/
│       └── signin/            # MODIFY: Update sign-in to support role-based redirects
├── components/
│   └── portal/                # NEW: Member portal components
│       ├── PortalNavigation.tsx    # Navigation menu component
│       └── WelcomeMessage.tsx      # Welcome message component
├── lib/
│   ├── auth/
│   │   ├── roles.ts           # NEW: Role definitions, role checking utilities
│   │   ├── session.ts         # MODIFY: Extend session with role information
│   │   └── middleware.ts      # NEW: Role-based authorization middleware
│   ├── db/
│   │   └── user-operations.ts # MODIFY: Add role parameter to user CRUD operations
│   └── validation/
│       └── user-schema.ts     # NEW: Zod schema for user creation/update with role
├── types/
│   ├── user.ts                # MODIFY: Extend User type with role field
│   └── api-types.ts           # MODIFY: Add UserRole enum, user management API types
└── middleware.ts              # MODIFY: Add portal route protection
```

**Structure Decision**: Next.js App Router structure with domain-based organization. New member portal functionality added as `/portal/*` routes parallel to existing `/admin/*` routes. Authentication infrastructure extended in `src/lib/auth/` to support role-based access. Database operations for user management consolidated in existing `src/lib/db/user-operations.ts` file. TypeScript types extended in centralized `src/types/` directory following constitution principle XII.

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

The /tasks command will generate tasks.md by analyzing the design artifacts created in Phase 1:

1. **From data-model.md**:
   - Task 1: Extend Prisma User model with activeSessionToken field
   - Task 2: Run database migration (prisma db push)
   - Tasks for updating src/types/user.ts with UserRole type and extended User interface
   - Tasks for updating src/types/api-types.ts with user management types
   - Tasks for updating src/types/next-auth.d.ts with session token extension

2. **From contracts/auth-flow.md**:
   - Task for creating src/lib/auth/roles.ts (role constants and utilities)
   - Task for updating src/lib/auth/session.ts (session token generation)
   - Task for updating src/lib/auth/auth-options.ts (session callbacks)
   - Task for creating/updating src/middleware.ts (route protection)
   - Tasks for updating src/lib/db/user-operations.ts (session token operations)

3. **From contracts/api-admin-users.md**:
   - Task for creating src/lib/validation/user-schema.ts (Zod schemas)
   - Task for creating src/app/api/admin/users/route.ts (POST, GET)
   - Task for creating src/app/api/admin/users/[id]/route.ts (PATCH, DELETE)
   - Task for creating src/app/api/admin/users/[id]/reset-password/route.ts (PATCH)

4. **From contracts/portal-routes.md**:
   - Task for creating src/app/portal/layout.tsx
   - Task for creating src/app/portal/page.tsx
   - Task for creating src/components/portal/PortalNavigation.tsx
   - Task for creating src/components/portal/WelcomeMessage.tsx
   - Task for MODIFYING src/app/admin/users/page.tsx (add "mitglied" role to dropdown)

5. **From quickstart.md**:
   - Final validation task referencing quickstart.md workflows

**Ordering Strategy**:

Tasks will be ordered by dependency:

**Phase A - Foundation** (can run in parallel where marked [P]):
1. [P] Database schema changes (Prisma + migration)
2. [P] Type definitions (src/types/*)
3. [P] Validation schemas (src/lib/validation/user-schema.ts)

**Phase B - Authentication Infrastructure**:
4. Role utilities (src/lib/auth/roles.ts)
5. Session token operations (src/lib/db/user-operations.ts updates)
6. Auth options updates (src/lib/auth/auth-options.ts)
7. Middleware (src/middleware.ts)

**Phase C - Backend APIs**:
8. [P] User management API routes (src/app/api/admin/users/*)

**Phase D - Frontend UI**:
9. [P] Portal layout and pages (src/app/portal/*)
10. [P] Portal components (src/components/portal/*)
11. [P] Extend admin user management UI (src/app/admin/users/page.tsx - add "mitglied" to role dropdown)

**Phase E - Validation**:
12. Manual testing following quickstart.md
13. Code validation (npm run check)

**Grouping Strategy**:
- Group type updates into single task (all src/types/* files)
- Group related API routes (all user CRUD in one or two tasks)
- Keep files focused and under 500 lines each
- User management UI extension is minimal (add 2 lines to existing file)

**Estimated Output**: 10-15 numbered, dependency-ordered tasks in tasks.md (reduced from 12-18 due to existing user management UI)

**Task Format**: Each task will include:
- Task number and title
- Files to create/modify
- Dependencies (must complete tasks X, Y first)
- Implementation guidance from contracts
- Acceptance criteria from quickstart.md
- [P] marker for parallelizable tasks

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
- [x] Phase 0: Research complete (/plan command) - research.md created
- [x] Phase 1: Design complete (/plan command) - data-model.md, contracts/, quickstart.md, CLAUDE.md updated
- [x] Phase 2: Task planning approach documented (/plan command)
- [ ] Phase 3: Tasks generated (/tasks command) - NEXT STEP
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS - All 12 principles followed in design
- [x] All NEEDS CLARIFICATION resolved (via research.md)
- [x] Complexity deviations documented (none - simple approach chosen)

---
*Based on Constitution v1.0.0 - See `.specify/memory/constitution.md`*
