# Research Document: Address Management for Appointments

**Feature**: Address Management for Appointments
**Branch**: `003-when-creating-a`
**Date**: 2025-10-07

## Overview
This document captures technical research findings and design decisions for implementing address management functionality in the appointment system.

## SearchFilterBar Component Analysis

### Decision: SearchFilterBar is fully reusable and generic
**Rationale**:
- Component accepts all necessary props (searchTerm, onSearchChange, onClearSearch, onSearch)
- Uses `children` prop for additional filter controls (highly composable)
- No business logic embedded - completely presentation-focused
- Already successfully used in status-reports admin page
- Clean TypeScript interface with proper typing

**Implementation**:
- Located at: `src/components/admin/tables/SearchFilterBar.tsx`
- Total lines: 67 (well within limits)
- No modifications needed to the component itself
- Can be reused directly in appointments admin page

**Alternatives Considered**:
- Create new search component specifically for appointments (rejected: violates DRY principle)
- Modify existing component (rejected: already perfect for reuse)

## Admin Page Layout Pattern

### Decision: Follow newsletter settings page pattern for address management
**Rationale**:
- Newsletter settings page provides excellent full-page form template
- Uses Material UI Paper component for clean sections
- Proper form field spacing and layout with Grid
- Save/Cancel button pattern at bottom
- Page header with icon for consistency
- Container maxWidth="lg" for responsive layout

**Key Pattern Elements**:
```typescript
<Container maxWidth="lg">
  <AdminNavigation />
  <AdminPageHeader title="..." icon={<Icon />} />
  <Paper sx={{ p: 3 }}>
    <Typography variant="h6">Section Title</Typography>
    <TextField... /> // Form fields
    <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
      <Button variant="outlined">Cancel</Button>
      <Button variant="contained">Save</Button>
    </Box>
  </Paper>
</Container>
```

**Alternatives Considered**:
- Dialog-based address management (rejected: requirement specifies full-page interface)
- Inline editing in table (rejected: doesn't match specification requirements)

## Database Schema Design

### Decision: Simple Address model with direct field storage
**Rationale**:
- Appointment model already has location fields (street, city, postalCode, locationDetails)
- Address model should mirror these fields for consistency
- Add unique name/label field for dropdown display and identification
- Use `String @id @default(cuid())` for complex entity (not autoincrement)
- No relationship needed - appointments copy address data on creation

**Schema**:
```prisma
model Address {
  id          String   @id @default(cuid())
  name        String   @unique  // Required unique label (e.g., "Partei-Büro")
  street      String
  city        String
  postalCode  String
  locationDetails String?  // Optional notes
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([name])
  @@map("address")
}
```

**Alternatives Considered**:
- Foreign key relationship (rejected: requirement specifies data preservation after address deletion)
- JSON storage for address data (rejected: violates normalization, harder to query)
- Shared fields in base table (rejected: current schema already well-structured)

## Public Form Integration

### Decision: Dropdown + manual fallback hybrid approach
**Rationale**:
- Users can select from dropdown OR manually enter address
- Both modes available simultaneously (not exclusive)
- Maintains backward compatibility with existing appointments
- Simple conditional logic: if address selected, populate fields; user can still override

**Implementation Strategy**:
1. Add Address dropdown above existing address fields
2. On selection, auto-fill street/city/postal code/locationDetails
3. User can modify auto-filled values if needed
4. On submit, save the final field values (not address ID)

**Alternatives Considered**:
- Exclusive mode (dropdown XOR manual) - rejected: requirement allows both
- Store address reference ID - rejected: breaks data preservation requirement

## Search Functionality

### Decision: Server-side filtering with Prisma `contains` mode
**Rationale**:
- Search term filters appointment title and mainText (event details)
- Prisma provides case-insensitive search via `mode: 'insensitive'`
- Partial matching with `contains` operator
- Server-side ensures consistent behavior and reduces client bundle

**Implementation**:
```typescript
where: {
  OR: [
    { title: { contains: searchTerm, mode: 'insensitive' } },
    { mainText: { contains: searchTerm, mode: 'insensitive' } }
  ]
}
```

**Alternatives Considered**:
- Client-side filtering (rejected: doesn't work with pagination)
- Full-text search with PostgreSQL (rejected: overkill for simple substring search)

## Validation Schema

### Decision: Zod schema for address validation
**Rationale**:
- Consistent with project's validation patterns
- All fields required except locationDetails (optional)
- Name uniqueness enforced at database level, checked in API
- German error messages for user-facing text

**Schema Structure**:
```typescript
const addressSchema = z.object({
  name: z.string().min(1, "Name ist erforderlich").max(100, "Name zu lang"),
  street: z.string().min(1, "Straße ist erforderlich"),
  city: z.string().min(1, "Stadt ist erforderlich"),
  postalCode: z.string().regex(/^\d{5}$/, "Postleitzahl muss 5 Ziffern sein"),
  locationDetails: z.string().optional()
});
```

**Alternatives Considered**:
- Class-validator (rejected: project uses Zod)
- Manual validation (rejected: violates DRY principle)

## API Route Structure

### Decision: RESTful CRUD operations in single route file
**Rationale**:
- Follows project pattern (see `/api/admin/status-reports/route.ts`)
- GET: List/retrieve addresses with pagination
- POST: Create new address
- PATCH: Update existing address
- DELETE: Delete address
- All operations use Zod validation and logger

**File**: `/api/admin/addresses/route.ts` (~200 lines estimated)

**Alternatives Considered**:
- Separate file per operation (rejected: increases file count)
- Combine with appointments API (rejected: violates separation of concerns)

## Domain Architecture

### Decision: Follow domain-based architecture per constitution
**Rationale**:
- Database operations in `src/lib/db/address-operations.ts`
- Validation schema in `src/lib/validation/address-schema.ts`
- No new domain needed (addresses are part of appointments domain)
- Reuse existing form submission utilities

**File Organization**:
```
src/lib/
├── db/
│   └── address-operations.ts      # findAll, create, update, delete functions
├── validation/
│   └── address-schema.ts          # Zod schemas
```

**Alternatives Considered**:
- Create new addresses/ domain (rejected: addresses are appointment-related, not standalone)
- Inline DB queries in API routes (rejected: violates domain architecture principle)

## Navigation Flow

### Decision: Button in SearchFilterBar leading to dedicated route
**Rationale**:
- "Adressen" button placed in SearchFilterBar children slot
- Route: `/admin/appointments/addresses`
- Clean separation from appointments listing
- Breadcrumb navigation for easy return

**Implementation**:
```typescript
<SearchFilterBar {...props}>
  {/* existing filters */}
  <Button
    variant="contained"
    onClick={() => router.push('/admin/appointments/addresses')}
  >
    Adressen
  </Button>
</SearchFilterBar>
```

**Alternatives Considered**:
- Modal dialog (rejected: requirement specifies full-page interface)
- Sidebar drawer (rejected: doesn't match existing patterns)

## Technology Decisions Summary

| Aspect | Technology | Reason |
|--------|-----------|--------|
| Form Library | React Hook Form | Existing project standard |
| Validation | Zod | Existing project standard |
| UI Components | Material UI 7.3.1 | Existing project standard |
| Database ORM | Prisma 6.13.0 | Existing project standard |
| Routing | Next.js App Router | Existing project standard |
| State Management | React useState | Simple CRUD doesn't need complex state |
| HTTP Client | fetch API | Existing project standard |

## File Size Estimates

| File | Estimated Lines | Within Limit? |
|------|----------------|---------------|
| `/api/admin/addresses/route.ts` | ~200 | ✅ Yes |
| `/admin/appointments/addresses/page.tsx` | ~300 | ✅ Yes |
| `src/lib/db/address-operations.ts` | ~150 | ✅ Yes |
| `src/lib/validation/address-schema.ts` | ~30 | ✅ Yes |
| Modified `/admin/appointments/page.tsx` | +50 lines | ✅ Yes (total ~610, needs review) |

**Note**: The appointments admin page will exceed 500 lines after modifications. This requires refactoring into smaller components per constitution.

## Performance Considerations

### Decision: Standard pagination for address list
**Rationale**:
- Addresses expected to be <100 total (low volume)
- Standard 10 items per page default
- Simple offset-based pagination via Prisma skip/take
- No special indexing needed beyond name uniqueness

**Alternatives Considered**:
- Load all addresses at once (rejected: not scalable)
- Cursor-based pagination (rejected: overkill for small dataset)

## Edge Cases Handled

1. **Duplicate address names**: Database unique constraint + Zod validation
2. **German umlauts in search**: Prisma case-insensitive mode handles Unicode
3. **Address deletion with existing appointments**: Appointments retain copy of data
4. **Address edit with existing appointments**: Only new appointments use updated data
5. **Empty address list**: Graceful empty state message on public form
6. **Long location details**: Optional field, no strict length limit (reasonable max in validation)

## Open Questions Resolved

All clarification points from spec were resolved:
- ✅ Address name/label field requirement
- ✅ Dropdown vs manual entry mode (hybrid approach)
- ✅ Deletion behavior (preserve appointment data)
- ✅ Search fields (title and mainText)
- ✅ Edit behavior (preserve historical appointments)

## Next Steps for Phase 1

1. Create data-model.md with entity definitions
2. Generate API contracts in contracts/ directory
3. Create quickstart.md with manual validation scenarios
4. Update CLAUDE.md with new address management context

---
**Research Complete**: All technical unknowns resolved, ready for Phase 1 design.
