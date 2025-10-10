# Tasks: [FEATURE NAME]

**Input**: Design documents from `/specs/[###-feature-name]/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → If not found: ERROR "No implementation plan found"
   → Extract: tech stack, libraries, structure
2. Load optional design documents:
   → data-model.md: Extract entities → model tasks
   → contracts/: Each file → contract test task
   → research.md: Extract decisions → setup tasks
3. Generate tasks by category:
   → Setup: project init, dependencies, linting
   → Tests: contract tests, integration tests
   → Core: models, services, CLI commands
   → Integration: DB, middleware, logging
   → Polish: unit tests, performance, docs
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Same file = sequential (no [P])
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001, T002...)
6. Generate dependency graph
7. Create parallel execution examples
8. Validate task completeness:
   → All contracts have tests?
   → All entities have models?
   → All endpoints implemented?
9. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Next.js App Router**: `src/app/`, `src/components/`, `src/lib/`, `src/types/`
- **API Routes**: `src/app/api/[entity]/route.ts`
- **Database**: Prisma schema in `prisma/schema.prisma`, operations in `src/lib/db/`
- **Validation**: Zod schemas in `src/lib/validation/`
- All paths use `@/` alias for imports

## Phase 3.1: Setup
- [ ] T001 Create project structure per implementation plan
- [ ] T002 Initialize [language] project with [framework] dependencies
- [ ] T003 [P] Configure linting and formatting tools

## Phase 3.2: Types & Validation
- [ ] T004 Check src/types/ for existing type definitions that can be reused
- [ ] T005 [P] Create/update type definitions in src/types/[appropriate-file].ts
- [ ] T006 [P] Create Zod validation schemas in src/lib/validation/[entity].ts

## Phase 3.3: Database & Models
- [ ] T007 [P] Update Prisma schema in prisma/schema.prisma for [Entity]
- [ ] T008 [P] Create database operations in src/lib/db/[entity]-operations.ts
- [ ] T009 Run `npm run db:push` to apply schema changes

## Phase 3.4: API Routes & Handlers
- [ ] T010 [P] Create API handler in src/lib/[entity]-handlers.ts
- [ ] T011 [P] Create API route GET /api/[entity] in src/app/api/[entity]/route.ts
- [ ] T012 [P] Create API route POST /api/[entity] in src/app/api/[entity]/route.ts
- [ ] T013 Add error handling and logging using logger from @/lib/logger.ts
- [ ] T014 Add German error messages for validation failures

## Phase 3.5: UI Components & Forms
- [ ] T015 [P] Create form component in src/components/forms/[Entity]Form.tsx
- [ ] T016 [P] Create page in src/app/[route]/page.tsx
- [ ] T017 Integrate submitForm utility from @/lib/form-submission/submit-form.ts
- [ ] T018 Add German labels and placeholders

## Phase 3.6: Validation & Documentation
- [ ] T019 Run `npm run check` to validate types and linting
- [ ] T020 Add JSDoc comments to all functions
- [ ] T021 Verify file sizes (<500 lines)
- [ ] T022 Verify no duplicate type definitions exist
- [ ] T023 Create manual testing checklist in quickstart.md
- [ ] T024 Verify all principles from constitution

## Dependencies
- Type checking (T004) before type creation (T005)
- Types (T005) before validation schemas (T006)
- Database schema (T007) before operations (T008)
- Database operations (T008) before handlers (T010)
- API routes (T011-T012) before UI integration (T017)
- Implementation before validation (T019-T024)

## Parallel Example
```
# Launch T004-T006 together (different files):
Task: "Update Prisma schema in prisma/schema.prisma for User entity"
Task: "Create Zod validation schemas in src/lib/validation/user.ts"
Task: "Create database operations in src/lib/db/user-operations.ts"
```

## Notes
- [P] tasks = different files, no dependencies
- Run `npm run check` after each significant change
- Commit after each task or logical group
- Keep files under 500 lines (split if needed)
- Use existing utilities from `src/lib/` before creating new ones
- All user-facing text in German

## Task Generation Rules
*Applied during main() execution*

1. **From Contracts**:
   - Each endpoint → API route implementation task
   - Each request/response → validation schema task [P]
   - MUST include type checking task before type creation

2. **From Data Model**:
   - Each entity → type checking task (search src/types/)
   - Each entity → type definition task in src/types/ [P]
   - Each entity → Prisma schema update task
   - Each entity → database operations task [P]
   - Each entity → Zod validation task [P]

3. **From User Stories**:
   - Each story → feature implementation tasks
   - Quickstart scenarios → manual validation checklist

4. **Ordering**:
   - Setup → Type Checking → Types → Validation → Database/Models → API Routes → UI → Final Validation
   - Dependencies block parallel execution
   - Group related changes to respect 500-line file limit

## Validation Checklist
*GATE: Checked by main() before returning*

- [ ] Type checking task included before type creation
- [ ] All new types defined in src/types/ centrally
- [ ] All contracts have corresponding API routes
- [ ] All entities have Prisma schema, validation, and operations tasks
- [ ] Database changes before API implementation
- [ ] Parallel tasks truly independent (different files)
- [ ] Each task specifies exact file path
- [ ] No task modifies same file as another [P] task
- [ ] Constitution principles respected (no tests, <500 lines, centralized types, etc.)