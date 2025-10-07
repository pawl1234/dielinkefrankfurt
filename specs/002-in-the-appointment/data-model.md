# Data Model: Bundesland to Location Details Refactor

**Feature**: 002-in-the-appointment
**Date**: 2025-10-07
**Status**: Design Complete

## Entity: Appointment

### Current Schema (Before Refactor)
```prisma
model Appointment {
  id             Int       @id @default(autoincrement())
  title          String
  mainText       String
  startDateTime  DateTime
  endDateTime    DateTime?

  // Location information
  street         String?
  city           String?
  state          String?    // ← TO BE REFACTORED
  postalCode     String?

  // ... other fields

  @@map("appointment")
}
```

### New Schema (After Refactor)
```prisma
model Appointment {
  id             Int       @id @default(autoincrement())
  title          String
  mainText       String
  startDateTime  DateTime
  endDateTime    DateTime?

  // Location information
  street         String?
  city           String?
  locationDetails String?   // ← RENAMED FROM state
  postalCode     String?

  // ... other fields

  @@map("appointment")
}
```

### Field Specification: locationDetails

| Property | Value | Rationale |
|----------|-------|-----------|
| **Database Column** | `location_details` | PostgreSQL lowercase convention with underscore |
| **Prisma Field** | `locationDetails` | camelCase for TypeScript compatibility |
| **Type** | `String?` | Optional text field (nullable) |
| **Max Length** | 100 characters | Sufficient for room/building names |
| **Validation** | Optional, max 100 chars | Zod schema enforcement |
| **Default** | `NULL` | No default value required |
| **Index** | None | Optional field, not queried frequently |

### Field Purpose and Usage

**User-Facing Label**: "Zusatzinformationen" (Additional Information)

**Help Text**: "Geben Sie zusätzliche Ortsangaben an, z.B. Raumnummer oder Gebäudename"

**Example Values**:
- "Saalbau Raum 3"
- "Büro"
- "Römer, Saal 1"
- "EG, Seminarraum links"
- NULL (when not provided)

**Business Rules**:
1. Field is optional - users can submit appointments without it
2. When provided, must not exceed 100 characters
3. No special validation beyond length (accepts any UTF-8 characters)
4. Field cleared in migration - all existing values set to NULL

## Data Migration

### Migration Type: Schema Change with Data Reset

**Migration Steps**:
1. Run Prisma schema update
2. Rename column `state` → `location_details` in PostgreSQL
3. Clear all existing values (set to NULL)
4. No data preservation needed

**Migration Command**:
```bash
# Update schema in prisma/schema.prisma first, then:
npm run db:push
```

**Prisma Schema Change**:
```prisma
// Before
state          String?

// After
locationDetails String?   @map("location_details")
```

**SQL Equivalent** (for reference only, Prisma handles this):
```sql
-- Rename column
ALTER TABLE appointment RENAME COLUMN state TO location_details;

-- Clear all existing values (per requirement FR-009)
UPDATE appointment SET location_details = NULL;
```

### Migration Impact Assessment

| Aspect | Impact | Mitigation |
|--------|--------|------------|
| **Downtime** | None | Column rename is instant in PostgreSQL |
| **Data Loss** | All existing state values cleared | Intentional per spec (FR-009) |
| **API Compatibility** | Breaking change | Field renamed in all API contracts |
| **Database Size** | No change | Same data type, same storage |
| **Performance** | No impact | No index changes, optional field |

### Rollback Plan

If rollback needed:
```prisma
// Revert schema change
locationDetails String?   @map("location_details")
// Back to:
state          String?
```

Then run: `npm run db:push`

## Validation Rules

### Client-Side (React Hook Form)
- Optional field (no required validation)
- Max length: 100 characters
- Type: text input (Material UI TextField)

### Server-Side (Zod Schema)

**Schema Definition**:
```typescript
locationDetails: createOptionalTextSchema(100, 'Zusatzinformationen')
```

**Validation Behavior**:
- `undefined`: Valid (field not provided)
- `null`: Valid (explicitly no value)
- Empty string `""`: Valid (treated as no value)
- String 1-100 chars: Valid
- String >100 chars: Invalid - error message in German

**Error Messages**:
- Max length exceeded: "Zusatzinformationen darf maximal 100 Zeichen lang sein"
- Field label in errors: "Zusatzinformationen"

### Validation Message Updates

**File**: `src/lib/validation/validation-messages.ts`

**Addition**:
```typescript
export const fieldLabels: Record<string, string> = {
  // ... existing fields
  'state': 'Bundesland',              // ← REMOVE
  'locationDetails': 'Zusatzinformationen',  // ← ADD
  // ... other fields
};
```

## Type Definitions

### TypeScript Types (Auto-Generated from Zod)

**Before**:
```typescript
type AppointmentSubmitData = {
  // ... other fields
  state?: string;
  // ... other fields
}
```

**After**:
```typescript
type AppointmentSubmitData = {
  // ... other fields
  locationDetails?: string;
  // ... other fields
}
```

### Prisma Types (Auto-Generated)

**Generated Type** (from `@prisma/client`):
```typescript
type Appointment = {
  id: number;
  title: string;
  mainText: string;
  startDateTime: Date;
  endDateTime: Date | null;
  street: string | null;
  city: string | null;
  locationDetails: string | null;  // ← Updated
  postalCode: string | null;
  // ... other fields
}
```

## State Transitions

**Not Applicable**: This field does not have state transitions. It's a simple data field that can be:
- Created (set during form submission)
- Updated (modified in admin dashboard)
- Deleted (set to NULL)

No workflow or status management required.

## Related Entities

### Direct Relationships
- **None**: locationDetails is a scalar field, not a relation

### Indirect Relationships
- Used in newsletter templates to display event location
- May be included in email notifications
- Displayed in admin dashboard for appointment review

### No Schema Changes Required For
- Newsletter model
- Group model
- StatusReport model
- User model

## Database Constraints

### Constraints Applied
- **Type**: `String` (VARCHAR in PostgreSQL)
- **Nullable**: `true` (field is optional)
- **Max Length**: 100 characters (enforced by validation, not DB constraint)

### No Constraints For
- **Unique**: Not applicable (multiple events can share locations)
- **Foreign Key**: Not applicable (scalar field)
- **Default Value**: NULL is implicit for nullable fields
- **Check Constraint**: Not needed (validation handles length)

## Integration Points

### Frontend Forms
- **Public Form**: `src/components/forms/appointments/fields/AddressSection.tsx`
  - Material UI TextField
  - React Hook Form Controller
  - Client-side validation (optional)

### API Routes
- **Submit Endpoint**: `src/app/api/appointments/submit/route.ts`
  - Validates with `appointmentSubmitDataSchema`
  - Saves to database via Prisma

- **Admin Update**: `src/app/api/admin/appointments/[id]/route.ts`
  - Validates with `adminAppointmentUpdateSchema`
  - Updates via Prisma

### Admin Dashboard
- **View**: `src/app/admin/appointments/page.tsx`
  - Displays locationDetails in appointment list/detail view
  - Edit form includes locationDetails field

### Email/Newsletter
- **Template Generation**: `src/lib/newsletter/template-generator.ts`
  - May include locationDetails in event descriptions
  - Displays alongside other address fields

## Data Quality Considerations

### Expected Data Quality
- **Completeness**: Low (optional field, many NULL values expected)
- **Consistency**: High (validated format, character limit)
- **Accuracy**: User-dependent (no automated verification)

### Data Cleaning
- **Not Required**: Values will be cleared during migration
- **Future**: No cleaning logic needed (simple text field)

### Monitoring
- **No metrics needed**: Optional field, not business-critical
- **Admin visibility**: Available in appointment details

## Performance Considerations

### Query Impact
- **No change**: Field not used in WHERE clauses or JOIN conditions
- **No index needed**: Optional field, rarely queried
- **Storage**: Negligible (100 chars max, most NULL)

### Expected Usage Patterns
- Written once during appointment submission
- Updated occasionally via admin dashboard
- Read during appointment display (no filtering/sorting)

---

**Data Model Complete**: All entity changes documented with validation rules, types, and migration strategy.
