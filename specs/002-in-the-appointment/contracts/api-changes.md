# API Contracts: Field Refactor Changes

**Feature**: 002-in-the-appointment
**Date**: 2025-10-07
**Status**: Contract Definition Complete

## Overview

This refactor changes the field name from `state` to `locationDetails` across all API contracts. The field type, validation, and behavior remain the same (optional string, max 100 chars).

## Affected Endpoints

### 1. Public Appointment Submission

**Endpoint**: `POST /api/appointments/submit`

**Request Body Changes**:

**Before**:
```typescript
{
  title: string;
  mainText: string;
  startDateTime: string;
  endDateTime?: string;
  street?: string;
  city?: string;
  state?: string;          // ← REMOVED
  postalCode?: string;
  firstName?: string;
  lastName?: string;
  recurringText?: string;
  featured?: boolean;
  files?: File[];
  coverImage?: File;
  croppedCoverImage?: File;
}
```

**After**:
```typescript
{
  title: string;
  mainText: string;
  startDateTime: string;
  endDateTime?: string;
  street?: string;
  city?: string;
  locationDetails?: string;  // ← ADDED (replaces state)
  postalCode?: string;
  firstName?: string;
  lastName?: string;
  recurringText?: string;
  featured?: boolean;
  files?: File[];
  coverImage?: File;
  croppedCoverImage?: File;
}
```

**Validation**:
```typescript
locationDetails: z.string().max(100).optional()
```

**Response** (unchanged):
```typescript
{
  success: true,
  data: {
    id: number;
    message: string;
  }
}
```

**Error Response for Validation** (German message updated):
```typescript
{
  success: false,
  error: {
    code: "VALIDATION_ERROR",
    message: "Zusatzinformationen darf maximal 100 Zeichen lang sein"
  }
}
```

### 2. Admin Appointment Update

**Endpoint**: `PATCH /api/admin/appointments/[id]`

**Request Body Changes**:

**Before**:
```typescript
{
  // All fields optional (partial update)
  title?: string;
  mainText?: string;
  state?: string;          // ← REMOVED
  // ... other fields
}
```

**After**:
```typescript
{
  // All fields optional (partial update)
  title?: string;
  mainText?: string;
  locationDetails?: string;  // ← ADDED (replaces state)
  // ... other fields
}
```

**Response**:
```typescript
{
  success: true,
  data: {
    id: number;
    // ... updated appointment data with locationDetails
  }
}
```

### 3. Admin Appointment Retrieval

**Endpoint**: `GET /api/admin/appointments/[id]`

**Response Changes**:

**Before**:
```typescript
{
  success: true,
  data: {
    id: number;
    title: string;
    mainText: string;
    startDateTime: string;
    endDateTime: string | null;
    street: string | null;
    city: string | null;
    state: string | null;        // ← REMOVED
    postalCode: string | null;
    // ... other fields
  }
}
```

**After**:
```typescript
{
  success: true,
  data: {
    id: number;
    title: string;
    mainText: string;
    startDateTime: string;
    endDateTime: string | null;
    street: string | null;
    city: string | null;
    locationDetails: string | null;  // ← ADDED (replaces state)
    postalCode: string | null;
    // ... other fields
  }
}
```

## Validation Schema Changes

### Public Form Schema

**File**: `src/lib/validation/appointment.ts`

**Change**:
```typescript
// Before (line 51)
state: createOptionalTextSchema(100, 'Bundesland'),

// After
locationDetails: createOptionalTextSchema(100, 'Zusatzinformationen'),
```

**Exported Type** (auto-updated):
```typescript
export type AppointmentSubmitData = z.infer<typeof appointmentSubmitDataSchema>;
// Now includes locationDetails instead of state
```

### Admin Update Schema

**File**: `src/lib/validation/admin-schemas.ts`

**Change**:
```typescript
// Before (line 63)
state: createOptionalTextSchema(100, 'Bundesland'),

// After
locationDetails: createOptionalTextSchema(100, 'Zusatzinformationen'),
```

**Exported Type** (auto-updated):
```typescript
export type AdminAppointmentUpdate = z.infer<typeof adminAppointmentUpdateSchema>;
// Now includes locationDetails instead of state
```

## Breaking Changes

### API Contract Breaking Changes

**Type**: Field Rename

**Severity**: Medium

**Impact**:
- Any client code directly accessing `state` field will break
- TypeScript compilation will fail if `state` is referenced
- Frontend forms must update field names

**Migration Path for API Consumers**:
1. Update all references from `state` to `locationDetails`
2. Update German labels to "Zusatzinformationen"
3. No behavior changes (field remains optional, same validation)

### Backward Compatibility

**Not Maintained**: This is a breaking change

**Rationale**:
- Internal system (not public API)
- Type safety enforces correct updates
- Better to fail fast than silently use wrong field

## Validation Messages

### German Error Messages

**Field Label Updates**:
```typescript
// File: src/lib/validation/validation-messages.ts

export const fieldLabels: Record<string, string> = {
  // ... other labels
  'locationDetails': 'Zusatzinformationen',  // ← ADD
  // Remove: 'state': 'Bundesland'
};
```

**Error Message Examples**:
```typescript
// Required (though field is optional, for completeness)
"Zusatzinformationen ist erforderlich"

// Max length exceeded
"Zusatzinformationen darf maximal 100 Zeichen lang sein"

// Invalid characters (if applied)
"Zusatzinformationen enthält ungültige Zeichen"
```

## Form Data Handling

### Client to Server

**Content-Type**: `multipart/form-data` (for file uploads)

**Field in FormData**:
```typescript
formData.append('locationDetails', value);  // ← Updated from 'state'
```

**Server Extraction**:
```typescript
const formData = await request.formData();
const locationDetails = formData.get('locationDetails') as string | null;
```

### Server Response Format

**JSON Response** (no change in structure):
```json
{
  "success": true,
  "data": {
    "id": 123,
    "title": "Veranstaltung",
    "locationDetails": "Saalbau Raum 3",
    "street": "Hauptstraße 1",
    "city": "Frankfurt"
  }
}
```

## Database Query Changes

### Prisma Client Usage

**Before**:
```typescript
const appointment = await prisma.appointment.create({
  data: {
    title: "...",
    state: "...",  // ← OLD
    // ... other fields
  }
});
```

**After**:
```typescript
const appointment = await prisma.appointment.create({
  data: {
    title: "...",
    locationDetails: "...",  // ← NEW
    // ... other fields
  }
});
```

**TypeScript Enforcement**: Attempting to use `state` will result in a compile error.

### Query Filters

**Not Applicable**: This field is not used in WHERE clauses or ORDER BY.

**Future Queries**: If needed, use `locationDetails`:
```typescript
const appointments = await prisma.appointment.findMany({
  where: {
    locationDetails: { contains: "Saalbau" }  // Example
  }
});
```

## API Implementation Files

### Files Requiring Updates

1. **Form Components**:
   - `src/components/forms/appointments/fields/AddressSection.tsx`
   - Field name in Controller: `state` → `locationDetails`
   - TextField label: `Bundesland` → `Zusatzinformationen`

2. **Validation Schemas**:
   - `src/lib/validation/appointment.ts` (line 51)
   - `src/lib/validation/admin-schemas.ts` (line 63)
   - `src/lib/validation/validation-messages.ts` (add label)

3. **Database Schema**:
   - `prisma/schema.prisma`
   - Field definition update with `@map("location_details")`

4. **Admin Views** (if displaying field):
   - `src/app/admin/appointments/page.tsx`
   - Update displayed field name and label

### Files NOT Requiring Changes

- **API Route Handlers**: Use Zod schemas, automatically updated
- **Database Operations**: Use Prisma client, automatically updated via schema
- **Type Definitions**: Auto-generated from Prisma and Zod

## Testing Validation Scenarios

### Manual API Testing

**Test 1: Submit with locationDetails**
```bash
POST /api/appointments/submit
Content-Type: multipart/form-data

title=Test Event
locationDetails=Saalbau Raum 3
# ... other fields

Expected: 200 OK, appointment created
```

**Test 2: Submit without locationDetails (optional)**
```bash
POST /api/appointments/submit
Content-Type: multipart/form-data

title=Test Event
# locationDetails omitted
# ... other fields

Expected: 200 OK, appointment created with NULL locationDetails
```

**Test 3: Exceed character limit**
```bash
POST /api/appointments/submit
Content-Type: multipart/form-data

title=Test Event
locationDetails=[101 character string]

Expected: 400 Bad Request
Error: "Zusatzinformationen darf maximal 100 Zeichen lang sein"
```

**Test 4: Admin update**
```bash
PATCH /api/admin/appointments/123
Content-Type: application/json

{
  "locationDetails": "Updated location"
}

Expected: 200 OK, appointment updated
```

## Contract Versioning

**Version**: Not applicable (internal API)

**Change Type**: Breaking change

**Migration Window**: None (internal system, immediate update)

---

**API Contracts Complete**: All endpoint changes documented with request/response schemas and validation rules.
