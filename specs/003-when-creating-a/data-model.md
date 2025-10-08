# Data Model: Address Management for Appointments

**Feature**: Address Management for Appointments
**Branch**: `003-when-creating-a`
**Date**: 2025-10-07

## Entity Definitions

### Address Entity (NEW)

**Purpose**: Store reusable location addresses for appointment selection

**Table Name**: `address` (PostgreSQL lowercase convention)

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String | Primary Key, CUID | Unique identifier for address |
| name | String | Required, Unique, Max 100 chars | Display label for dropdown (e.g., "Partei-Büro", "Gewerkschaftshaus") |
| street | String | Required | Street address |
| city | String | Required | City name |
| postalCode | String | Required, Pattern: /^\d{5}$/ | German postal code (5 digits) |
| locationDetails | String | Optional | Additional location information or notes |
| createdAt | DateTime | Auto-generated | Timestamp of creation |
| updatedAt | DateTime | Auto-updated | Timestamp of last modification |

**Indexes**:
- Primary: `id` (CUID)
- Unique: `name` (for fast lookup and uniqueness enforcement)

**Validation Rules**:
1. `name` must be unique across all addresses (enforced at DB level)
2. `name` length: 1-100 characters
3. `street` must not be empty
4. `city` must not be empty
5. `postalCode` must match German format: exactly 5 digits
6. `locationDetails` is optional, no strict length limit (reasonable max 500 chars)

**Prisma Schema**:
```prisma
model Address {
  id              String   @id @default(cuid())
  name            String   @unique @db.VarChar(100)
  street          String
  city            String
  postalCode      String   @db.VarChar(5)
  locationDetails String?  @db.Text
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([name])
  @@map("address")
}
```

**Lifecycle**:
- Created by admins via address management interface
- Updated by admins (edits do NOT affect existing appointments)
- Deleted by admins (deletion does NOT affect existing appointments)
- Selected by public users in appointment form (data is copied, not referenced)

**Data Preservation Behavior**:
- When an address is selected in the appointment form, the current field values are copied into the Appointment record
- Appointments do NOT store a foreign key reference to the Address table
- If an Address is deleted or edited, existing appointments retain their original address data
- Only new appointments created after an edit will use the updated address values

---

### Appointment Entity (MODIFIED)

**Purpose**: Store appointment submissions with optional address selection

**Changes**:
No database schema changes required. Existing fields remain:
- `street: String?`
- `city: String?`
- `postalCode: String?`
- `locationDetails: String?`

**Behavior Changes**:
1. Public form adds address dropdown above location fields
2. When user selects address from dropdown, fields auto-populate with address data
3. User can modify auto-populated values (manual override)
4. On form submission, final field values are saved (not address ID)
5. Appointment record contains snapshot of address at time of creation

**Data Flow**:
```
User selects "Partei-Büro" →
  street = "Musterstraße 123"
  city = "Frankfurt"
  postalCode = "60311"
  locationDetails = "2. Stock, Raum 5"

User modifies street to "Musterstraße 125" →
  street = "Musterstraße 125" (user's override)
  city = "Frankfurt" (from address)
  postalCode = "60311" (from address)
  locationDetails = "2. Stock, Raum 5" (from address)

Submit form →
  Appointment record stores final values, no Address reference
```

**Backward Compatibility**:
- Existing appointments with manually entered addresses remain unchanged
- New appointments can use either dropdown selection OR manual entry
- Both modes produce identical data structure in database

---

## Relationships

**Address ↔ Appointment**: No database relationship
- Addresses are template data for appointment creation
- Appointments store copied address values, not references
- This design ensures data immutability and historical preservation

---

## State Transitions

### Address Status
Addresses do not have explicit status field. State is binary:
- **Exists**: Address is available for selection in public form
- **Deleted**: Address no longer available (does not affect existing appointments)

### Appointment Status (No changes)
Existing appointment status transitions remain unchanged:
- `pending` → `accepted` or `rejected` (by admin)

---

## Search and Filtering

### Address Management (Admin)
- **List View**: Paginated table with all addresses
- **Search**: By name, street, or city (client-side filter sufficient for small dataset)
- **Sort**: By name (alphabetical) or createdAt (chronological)

### Appointment Search (Admin) - NEW
- **Search Term**: Filters appointments by `title` OR `mainText` (event details)
- **Search Mode**: Case-insensitive, partial matching (Prisma `contains` with `mode: 'insensitive'`)
- **Implementation**: Server-side filtering in API route

**Prisma Query Example**:
```typescript
where: {
  OR: [
    { title: { contains: searchTerm, mode: 'insensitive' } },
    { mainText: { contains: searchTerm, mode: 'insensitive' } }
  ],
  status: statusFilter  // Combined with existing status filter
}
```

---

## Validation Summary

### Server-Side (Zod Schema)
```typescript
// Address creation/update
const addressSchema = z.object({
  name: z.string().min(1, "Name ist erforderlich").max(100, "Name darf maximal 100 Zeichen sein"),
  street: z.string().min(1, "Straße ist erforderlich"),
  city: z.string().min(1, "Stadt ist erforderlich"),
  postalCode: z.string().regex(/^\d{5}$/, "Postleitzahl muss genau 5 Ziffern sein"),
  locationDetails: z.string().optional()
});

// Duplicate name check (in API route)
const existingAddress = await prisma.address.findUnique({ where: { name } });
if (existingAddress && existingAddress.id !== updatingId) {
  throw ValidationError("Adresse mit diesem Namen existiert bereits");
}
```

### Client-Side (React Hook Form)
Same validation rules for immediate user feedback, but server validation is authoritative.

---

## Data Integrity Constraints

1. **Address Name Uniqueness**: Enforced by database unique constraint + Zod validation
2. **German Postal Code Format**: Validated by regex pattern in Zod schema
3. **Required Fields**: All fields except locationDetails are required
4. **Immutability Guarantee**: Appointment address data never changes after creation (achieved by copying values instead of referencing)

---

## Migration Requirements

### New Table
```sql
CREATE TABLE "address" (
  "id" TEXT NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "street" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "postalCode" VARCHAR(5) NOT NULL,
  "locationDetails" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "address_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "address_name_key" ON "address"("name");
CREATE INDEX "address_name_idx" ON "address"("name");
```

### Existing Tables
No schema changes required to `appointment` table.

---

## Data Model Validation Checklist

- [x] All entities have clear purpose and lifecycle
- [x] Field types match TypeScript/Prisma conventions
- [x] Validation rules are specific and testable
- [x] Relationships (or lack thereof) are clearly documented
- [x] Migration requirements are explicit
- [x] German text is used for user-facing error messages
- [x] Data preservation strategy is documented
- [x] No foreign key relationships (intentional design for immutability)

---
**Data Model Complete**: Ready for contract generation
