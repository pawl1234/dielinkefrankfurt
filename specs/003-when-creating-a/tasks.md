# Tasks: Address Management for Appointments

**Feature**: Address Management for Appointments
**Branch**: `003-when-creating-a`
**Input**: Design documents from `/home/paw/nextjs/dielinkefrankfurt/specs/003-when-creating-a/`
**Prerequisites**: research.md, data-model.md, contracts/, quickstart.md

## Task Overview

This feature implements:
1. Admin interface for managing reusable addresses
2. Public form integration with address dropdown
3. Search functionality for appointments admin page
4. Data preservation (appointments store address snapshots, not references)

## Phase 3.1: Database Schema & Validation

- [ ] **T001** [P] Add Address model to Prisma schema in `prisma/schema.prisma`
  - Create Address model with fields: id (String/CUID), name (unique), street, city, postalCode, locationDetails, createdAt, updatedAt
  - Add `@@map("address")` for lowercase table name
  - Add unique index on `name` field
  - No foreign key relationship to Appointment

- [ ] **T002** [P] Create Zod validation schema in `src/lib/validation/address-schema.ts`
  - Export `addressSchema` with validation rules:
    - name: min 1, max 100 chars, German error messages
    - street: min 1 char (required)
    - city: min 1 char (required)
    - postalCode: regex `/^\d{5}$/` (German format)
    - locationDetails: optional
  - Export TypeScript type from schema

- [ ] **T003** Run `npm run db:push` to apply Address table schema changes
  - Execute after T001 completes
  - Verify migration success
  - Check database with `npm run db:studio`

## Phase 3.2: Database Operations Layer

- [ ] **T004** [P] Create address database operations in `src/lib/db/address-operations.ts`
  - Import prisma singleton from `@/lib/db/prisma.ts`
  - Implement functions:
    - `findAllAddresses(options: { page, pageSize, search?, orderBy?, orderDirection? })`
    - `findAddressById(id: string)`
    - `createAddress(data: AddressCreateInput)`
    - `updateAddress(id: string, data: AddressUpdateInput)`
    - `deleteAddress(id: string)`
    - `checkDuplicateName(name: string, excludeId?: string)`
  - Use logger from `@/lib/logger.ts` for error logging
  - Return properly typed results

## Phase 3.3: API Routes - Addresses CRUD

- [ ] **T005** [P] Create GET endpoint in `src/app/api/admin/addresses/route.ts`
  - Import authentication helper from `@/lib/auth/`
  - Check NextAuth session (return 401 if unauthorized)
  - Parse query params: page, pageSize, search, orderBy, orderDirection
  - Call `findAllAddresses` from address-operations
  - Return paginated response: { addresses, totalItems, totalPages, currentPage }
  - Handle errors with German messages
  - Use logger for server-side logging

- [ ] **T006** Create POST endpoint in `src/app/api/admin/addresses/route.ts` (same file as T005)
  - Depends on T005 (same file, sequential implementation)
  - Validate request body with addressSchema
  - Check for duplicate name using `checkDuplicateName`
  - Return 409 status if duplicate: "Adresse mit diesem Namen existiert bereits"
  - Call `createAddress` from address-operations
  - Return 201 status with created address
  - German error messages for validation failures

- [ ] **T007** Create PATCH endpoint in `src/app/api/admin/addresses/route.ts` (same file as T005-T006)
  - Depends on T006 (same file, sequential implementation)
  - Validate request body with addressSchema + id field
  - Check address exists (404 if not found)
  - Check duplicate name (excluding current address ID)
  - Call `updateAddress` from address-operations
  - Return 200 status with updated address

- [ ] **T008** Create DELETE endpoint in `src/app/api/admin/addresses/route.ts` (same file as T005-T007)
  - Depends on T007 (same file, sequential implementation)
  - Extract id from query parameters
  - Validate id is provided (400 if missing)
  - Call `deleteAddress` from address-operations
  - Return 200 status: { message: "Adresse erfolgreich gelöscht" }
  - Handle 404 if address not found

## Phase 3.4: Public API Endpoint

- [ ] **T009** [P] Create public addresses endpoint in `src/app/api/addresses/public/route.ts`
  - No authentication required (public endpoint)
  - GET method only
  - Fetch all addresses ordered by name (ascending)
  - Return: { addresses: PublicAddress[] }
  - Exclude createdAt/updatedAt from response
  - Handle errors with German messages

## Phase 3.5: Admin UI - Address Management Page

- [ ] **T010** [P] Create address management page in `src/app/admin/appointments/addresses/page.tsx`
  - Import Material UI components: Container, Paper, Typography, Button, TextField, Box, Grid
  - Import AdminNavigation and AdminPageHeader
  - Use React Hook Form with addressSchema resolver
  - Implement CRUD operations via API calls:
    - Fetch addresses list on mount
    - Create address form with dialog/inline
    - Edit address (populate form with existing data)
    - Delete address (confirmation dialog)
  - Add German labels: "Adressen verwalten", "Neue Adresse", "Speichern", "Abbrechen"
  - Use submitForm utility from `@/lib/form-submission/submit-form.ts`
  - Keep file under 500 lines (split into components if needed)

- [ ] **T011** [P] Add JSDoc comments to address management page functions
  - Document form handlers (handleSubmit, handleEdit, handleDelete)
  - Document state management and API calls
  - Use TypeScript conventions for JSDoc

## Phase 3.6: Appointments Admin Page - Search Integration

- [ ] **T012** Create SearchFilterBar integration in `src/app/admin/appointments/page.tsx`
  - CAUTION: Page may exceed 500 lines after changes (check T019 for refactoring)
  - Import SearchFilterBar from `@/components/admin/tables/SearchFilterBar.tsx`
  - Add state: `const [searchTerm, setSearchTerm] = useState('')`
  - Add search handlers:
    - `handleSearchChange(value: string)`
    - `handleClearSearch()`
    - `handleSearch()`
  - Replace existing search UI with SearchFilterBar component
  - Add "Adressen" button in SearchFilterBar children prop
  - Button navigates to `/admin/appointments/addresses`

- [ ] **T013** Update appointments API route in `src/app/api/admin/appointments/route.ts`
  - Depends on T012 (frontend needs to pass search param)
  - Extract `search` query parameter
  - Add conditional OR clause to Prisma where:
    ```typescript
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { mainText: { contains: search, mode: 'insensitive' } }
      ];
    }
    ```
  - Combine with existing status filter using AND logic
  - Test case-insensitive search with German umlauts

## Phase 3.7: Public Form - Address Dropdown Integration

- [ ] **T014** Add address dropdown to public appointment form in `src/app/termine/page.tsx`
  - Import Material UI Select/Autocomplete component
  - Fetch addresses from `/api/addresses/public` on mount
  - Add dropdown above existing location fields
  - On address selection, auto-populate fields:
    - street, city, postalCode, locationDetails
  - Allow manual override (user can edit auto-filled values)
  - Submit form with final field values (no address ID reference)
  - Add German labels: "Adresse wählen...", "Oder manuelle Eingabe:"

- [ ] **T015** [P] Add JSDoc comments to appointment form address integration
  - Document address selection handler
  - Document auto-fill logic
  - Document manual override behavior

## Phase 3.8: Code Quality & Validation

- [ ] **T016** Run `npm run check` to validate TypeScript and ESLint
  - Execute after all implementation tasks complete
  - Fix any type errors
  - Fix any linting issues
  - Ensure no `any` types used

- [ ] **T017** Verify file sizes are under 500 lines
  - Check all modified/created files:
    - `src/app/api/admin/addresses/route.ts` (estimate: ~200 lines)
    - `src/app/admin/appointments/addresses/page.tsx` (estimate: ~300 lines)
    - `src/lib/db/address-operations.ts` (estimate: ~150 lines)
    - `src/lib/validation/address-schema.ts` (estimate: ~30 lines)
    - `src/app/admin/appointments/page.tsx` (WARNING: may exceed 500 lines)
  - If any file exceeds 500 lines, create refactoring task

- [ ] **T018** Add JSDoc comments to all new functions
  - Database operations in address-operations.ts
  - API route handlers
  - Form handlers and utilities
  - Use TypeScript conventions: `@param`, `@returns`

- [ ] **T019** Refactor appointments admin page if file exceeds 500 lines (conditional task)
  - ONLY execute if `src/app/admin/appointments/page.tsx` > 500 lines after T012
  - Extract appointment list items into separate component: `src/components/admin/appointments/AppointmentListItem.tsx`
  - Extract filter controls into: `src/components/admin/appointments/AppointmentFilters.tsx`
  - Move accordion logic to custom hook: `src/lib/hooks/useAppointmentAccordion.ts`
  - Update imports in main page
  - Verify functionality unchanged after refactoring

## Phase 3.9: Manual Validation

- [ ] **T020** Execute manual validation workflow from `quickstart.md`
  - Follow all 5 phases:
    - Phase 1: Address Management (Admin) - 15 min
    - Phase 2: Public Form Integration - 10 min
    - Phase 3: Data Preservation - 10 min
    - Phase 4: Search Functionality (Admin) - 10 min
    - Phase 5: Code Quality Validation - 5 min
  - Check all checklist items in quickstart.md
  - Document any issues found
  - Fix issues before marking complete

- [ ] **T021** Verify constitution principles compliance
  - All user-facing text in German ✓
  - No software tests created ✓
  - All files under 500 lines ✓
  - Server logging uses logger from @/lib/logger.ts ✓
  - No client-side console.log (except debugging) ✓
  - TypeScript: No `any` types ✓
  - JSDoc comments on all functions ✓
  - Path aliases use `@/` ✓
  - Database operations use Prisma singleton ✓

---

## Task Dependencies

```
Setup & Database:
  T001 (Prisma schema) ──┐
  T002 (Zod schema) ─────┼──> T003 (db:push) ──> T004 (DB operations)
                         │
API Implementation:      │
  T004 ──> T005 ──> T006 ──> T007 ──> T008 (Admin API - sequential, same file)
  T004 ──> T009 (Public API - parallel)
                         │
Frontend (Admin):        │
  T005-T008 ──> T010 (Address management page)
  T010 ──> T011 (JSDoc for admin page)
                         │
Frontend (Appointments): │
  T005-T008 ──> T012 (SearchFilterBar integration)
  T012 ──> T013 (Appointments API update)
                         │
Frontend (Public Form):  │
  T009 ──> T014 (Address dropdown in public form)
  T014 ──> T015 (JSDoc for public form)
                         │
Validation:              │
  T008, T013, T014 ──> T016 (npm run check)
  T016 ──> T017 (File size check)
  T017 ──> T018 (JSDoc comments)
  T018 ──> T019 (Conditional refactoring)
  T019 ──> T020 (Manual validation)
  T020 ──> T021 (Constitution compliance)
```

---

## Parallel Execution Examples

**Phase 3.1 - Schema & Validation (can run in parallel)**:
```bash
# T001 and T002 operate on different files
Task T001: Add Address model to Prisma schema
Task T002: Create Zod validation schema
# Then run T003 sequentially
```

**Phase 3.3 - API Routes (sequential - same file)**:
```bash
# T005-T008 modify the same file, CANNOT run in parallel
Task T005 (GET)
  → T006 (POST)
  → T007 (PATCH)
  → T008 (DELETE)
```

**Phase 3.4-3.5 - Public API + Admin Page (can run in parallel)**:
```bash
# T009 and T010 operate on different files
Task T009: Create public addresses endpoint
Task T010: Create address management page
```

**Phase 3.8 - JSDoc (can run in parallel)**:
```bash
# T011 and T015 operate on different files
Task T011: Add JSDoc to address management page
Task T015: Add JSDoc to appointment form
```

---

## Notes

- **[P] markers**: Tasks that can run in parallel (different files, no dependencies)
- **No [P]**: Tasks that modify the same file or depend on previous tasks (sequential)
- **File size warning**: `src/app/admin/appointments/page.tsx` likely to exceed 500 lines after T012
- **Data preservation**: Appointments store address field values, NOT foreign key references
- **Search implementation**: Case-insensitive Prisma `contains` with `mode: 'insensitive'`
- **German text**: All user-facing messages must be in German
- **Logging**: Use `logger` from `@/lib/logger.ts` for server-side logging only

---

## Success Criteria

All tasks completed AND:
- [ ] `npm run check` passes with no errors
- [ ] All files under 500 lines (or refactored per T019)
- [ ] All manual validation steps in quickstart.md pass
- [ ] All constitution principles verified (T021)
- [ ] No TypeScript `any` types used
- [ ] All functions have JSDoc comments
- [ ] All user-facing text in German

---

**Tasks Ready for Implementation**: Execute tasks in dependency order or use parallel execution where marked [P]
