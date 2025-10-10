# Data Model: Public Groups Overview Page with Contact Modal

**Feature**: Public Groups Overview Page with Contact Modal
**Date**: 2025-10-09
**Status**: Complete

## Entity Definitions

### 1. Group (Extended)

**Description**: Represents a working group with optional regular meeting information

**Schema Changes** (Prisma):
```prisma
model Group {
  id                      String               @id @default(cuid())
  name                    String               @db.VarChar(100)
  slug                    String               @unique
  description             String               @db.Text
  logoUrl                 String?
  metadata                String?
  status                  GroupStatus          @default(NEW)

  // NEW: Regular meeting fields
  regularMeeting          String?              @db.Text
  meetingStreet           String?
  meetingCity             String?
  meetingPostalCode       String?              @db.VarChar(5)
  meetingLocationDetails  String?              @db.Text

  createdAt               DateTime             @default(now())
  updatedAt               DateTime             @updatedAt
  statusReports           StatusReport[]
  responsiblePersons      ResponsiblePerson[]

  @@index([status])
  @@index([name])
  @@map("group")
}
```

**Field Descriptions**:
- `regularMeeting`: Free text description of regular meeting schedule (e.g., "Jeden 3. Dienstag im Monat, 19:00 Uhr")
- `meetingStreet`: Street address for meeting location (optional)
- `meetingCity`: City for meeting location (optional)
- `meetingPostalCode`: Postal code for meeting location (optional, max 5 chars)
- `meetingLocationDetails`: Additional location details like room number, building name (optional)

**Validation Rules**:
- `regularMeeting`: Max 500 characters, optional
- `meetingStreet`: Max 200 characters, optional
- `meetingCity`: Max 100 characters, optional
- `meetingPostalCode`: Max 5 characters, optional
- `meetingLocationDetails`: Max 1000 characters, optional
- Location fields can be provided without `regularMeeting` (though UI may discourage this)
- `regularMeeting` can exist without location fields (virtual meetings, TBD locations)

**State Transitions**:
No new state transitions. Existing status transitions remain:
- NEW → ACTIVE (acceptance)
- NEW → ARCHIVED (rejection)
- ACTIVE → ARCHIVED (archiving)

---

### 2. GroupSettings (New Model)

**Description**: Global settings for group-related functionality, including office contact email

**Schema Definition** (Prisma):
```prisma
model GroupSettings {
  id                 Int      @id @default(autoincrement())
  officeContactEmail String?  @db.VarChar(200)
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  @@map("group_settings")
}
```

**Field Descriptions**:
- `officeContactEmail`: Email address to CC on all group contact requests (optional, singleton record)

**Validation Rules**:
- `officeContactEmail`: Valid email format, max 200 characters, optional

**Data Access Pattern**:
- Singleton model: Always use ID=1
- Create on first access if not exists
- Update via admin settings dialog on groups admin page

---

### 3. GroupContactRequest (Non-Persisted)

**Description**: Contact request data sent via email, NOT stored in database

**TypeScript Interface** (in `src/types/api-types.ts`):
```typescript
/**
 * Group settings data
 */
export interface GroupSettingsData {
  id: number;
  officeContactEmail: string | null;
}

/**
 * Group contact request - sent via email only, not persisted
 */
export interface GroupContactRequest {
  groupSlug: string;
  requesterName: string;
  requesterEmail: string;
  message: string;
}

/**
 * Group contact API response
 */
export interface GroupContactResponse {
  success: boolean;
  error?: string;
}
```

**Field Descriptions**:
- `groupSlug`: Slug of the group being contacted
- `requesterName`: Name of the person making the contact request
- `requesterEmail`: Email address for replies
- `message`: Text message/inquiry from the requester

**Validation Rules** (Zod Schema):
```typescript
groupSlug: string, min 1, max 100
requesterName: string, min 2, max 100
requesterEmail: string, email format validation
message: string, min 10, max 5000
```

---

### 4. PublicGroupWithMeeting (Extended Type)

**Description**: Public-facing group data including meeting information

**TypeScript Interface** (in `src/types/component-types.ts`):
```typescript
/**
 * Public group with regular meeting information
 * Extends basic Group type with meeting-specific fields for display
 */
export interface PublicGroupWithMeeting {
  id: string;
  name: string;
  slug: string;
  description: string;
  logoUrl: string | null;
  regularMeeting: string | null;
  meetingStreet: string | null;
  meetingCity: string | null;
  meetingPostalCode: string | null;
  meetingLocationDetails: string | null;
}
```

---

## Database Operations

### New/Modified Functions in `src/lib/db/group-operations.ts`

#### 1. findPublicGroupsWithMeeting()
```typescript
/**
 * Finds public (ACTIVE) groups with meeting information for overview page.
 *
 * @returns Promise resolving to groups array with meeting details
 */
export async function findPublicGroupsWithMeeting(): Promise<PublicGroupWithMeeting[]>
```

**Query Details**:
- Filter: `status: 'ACTIVE'`
- Order: `name: 'asc'` (alphabetical)
- Select: All display fields including new meeting fields
- No pagination (expected 10-20 active groups)

#### 2. findGroupBySlugForContact()
```typescript
/**
 * Finds a group by slug with responsible persons for contact form.
 *
 * @param slug Group slug
 * @returns Promise resolving to group with responsible persons or null
 */
export async function findGroupBySlugForContact(
  slug: string
): Promise<(Group & { responsiblePersons: ResponsiblePerson[] }) | null>
```

**Query Details**:
- Filter: `slug: slug, status: 'ACTIVE'`
- Include: `responsiblePersons`
- Used by contact API to get recipient emails

#### 3. updateGroupWithPersons() - MODIFIED
Existing function extended to handle new meeting fields in `updateData` parameter. No signature change needed (uses `Prisma.GroupUpdateInput`).

---

### New Functions in `src/lib/db/group-settings-operations.ts` (NEW FILE)

#### 1. getGroupSettings()
```typescript
/**
 * Gets the global group settings singleton record.
 * Creates record with default values if it doesn't exist.
 *
 * @returns Promise resolving to GroupSettings
 */
export async function getGroupSettings(): Promise<GroupSettings>
```

**Query Details**:
- Check for record with ID=1
- If not exists, create with `{ id: 1, officeContactEmail: null }`
- Return existing or newly created record

#### 2. updateGroupSettings()
```typescript
/**
 * Updates the global group settings.
 *
 * @param data - Partial settings data to update
 * @returns Promise resolving to updated GroupSettings
 */
export async function updateGroupSettings(
  data: Partial<Pick<GroupSettings, 'officeContactEmail'>>
): Promise<GroupSettings>
```

**Query Details**:
- Upsert operation targeting ID=1
- Validate email format if provided

---

## Data Flow Diagrams

### 1. Groups Overview Page Load

```
User navigates to /gruppen-uebersicht
         ↓
Page component renders (client-side)
         ↓
useEffect fetches /api/groups/overview
         ↓
API route calls findPublicGroupsWithMeeting()
         ↓
Prisma queries database (SELECT with meeting fields)
         ↓
API returns PublicGroupWithMeeting[] as JSON
         ↓
Component renders accordions sorted alphabetically
         ↓
User expands accordion → Shows logo, description, meeting info
```

### 2. Contact Form Submission

```
User clicks "Kontakt" button
         ↓
Modal opens with form (name, email, message fields)
         ↓
User fills form and clicks "Senden"
         ↓
React Hook Form validates (client-side)
         ↓
submitForm() POSTs to /api/groups/[slug]/contact
         ↓
API route validates with Zod schema
         ↓
API route calls findGroupBySlugForContact(slug)
         ↓
API route calls getGroupSettings() for officeContactEmail
         ↓
API route calls sendGroupContactEmail()
         ↓
Email sent via Nodemailer (To: responsible persons, CC: office, Reply-To: requester)
         ↓
API returns success/error response
         ↓
Modal shows success message (2s) then closes, OR shows error and stays open
```

### 3. Group Creation/Update with Meeting Info

```
Admin/User fills group form with optional meeting fields
         ↓
Form submission includes regularMeeting and location fields
         ↓
API route validates all fields including meeting data
         ↓
createGroupWithPersons() OR updateGroupWithPersons()
         ↓
Prisma transaction saves group with meeting fields
         ↓
Success response returned
```

---

## Validation Schema Definitions

### 1. Group Contact Request Schema (Zod)

**File**: `src/lib/validation/group-contact-schema.ts` (new)

```typescript
import { z } from 'zod';

export const groupContactSchema = z.object({
  requesterName: z
    .string()
    .min(2, 'Name muss mindestens 2 Zeichen lang sein')
    .max(100, 'Name darf maximal 100 Zeichen lang sein')
    .trim(),

  requesterEmail: z
    .string()
    .email('Bitte geben Sie eine gültige E-Mail-Adresse ein')
    .max(200, 'E-Mail-Adresse darf maximal 200 Zeichen lang sein')
    .trim(),

  message: z
    .string()
    .min(10, 'Nachricht muss mindestens 10 Zeichen lang sein')
    .max(5000, 'Nachricht darf maximal 5000 Zeichen lang sein')
    .trim()
});

export type GroupContactFormData = z.infer<typeof groupContactSchema>;
```

### 2. Group Meeting Fields Schema Extension (Zod)

**File**: Extend existing schema in `src/lib/validation/group-schema.ts` (if exists)

```typescript
// Add to existing group schema
regularMeeting: z
  .string()
  .max(500, 'Regelmäßiges Treffen darf maximal 500 Zeichen lang sein')
  .trim()
  .optional(),

meetingStreet: z
  .string()
  .max(200, 'Straße darf maximal 200 Zeichen lang sein')
  .trim()
  .optional(),

meetingCity: z
  .string()
  .max(100, 'Stadt darf maximal 100 Zeichen lang sein')
  .trim()
  .optional(),

meetingPostalCode: z
  .string()
  .max(5, 'Postleitzahl darf maximal 5 Zeichen lang sein')
  .regex(/^\d{5}$/, 'Postleitzahl muss 5 Ziffern enthalten')
  .trim()
  .optional(),

meetingLocationDetails: z
  .string()
  .max(1000, 'Ortsdetails dürfen maximal 1000 Zeichen lang sein')
  .trim()
  .optional()
```

---

## Type Definitions Summary

### New Types (in `src/types/api-types.ts`)
- `GroupContactRequest`
- `GroupContactResponse`

### New Types (in `src/types/component-types.ts`)
- `PublicGroupWithMeeting`

### Extended Types (in `src/types/email-types.ts`)
- `GroupContactEmailProps` (new interface for contact email template)

### Reused Types
- `PublicAddress` (from `src/components/forms/appointments/fields/AddressSection.tsx`) - structure matches meeting location fields

---

## Migration Notes

### Database Migration Steps
1. Run Prisma schema update: `prisma db push --accept-data-loss`
2. Existing groups will have NULL values for new fields (acceptable, fields are optional)
3. No data migration needed (all fields nullable)
4. Update existing group via admin interface if meeting info needs to be added

### Backward Compatibility
- All new fields are optional (nullable)
- Existing code querying Group model unaffected
- Existing group queries work without modification
- UI gracefully handles missing meeting information

---

## Indexing Considerations

No new indexes required:
- `name` index already exists for alphabetical sorting
- `status` index already exists for ACTIVE filter
- Meeting fields not queried independently (always loaded with group)

---

## Data Integrity Constraints

1. **Email Validation**: Both requester email and office email validated as proper email format
2. **Group Status**: Contact form only works for ACTIVE groups (checked in API route)
3. **Responsible Persons**: At least one responsible person recommended (but not enforced - CC to office if none)
4. **Postal Code Format**: German postal code format (5 digits) validated if provided
5. **String Lengths**: All text fields have max lengths to prevent abuse

---

## Summary

Data model extends Group entity with optional meeting fields and adds non-persisted GroupContactRequest type for email-only contact functionality. New GroupSettings singleton model created for group-related global settings including office email configuration. All changes are backward compatible and follow existing database conventions (nullable fields, lowercase table names, proper indexes).

**Database Changes**:
- Group model: +5 fields (all optional)
- GroupSettings model: +1 new model (singleton pattern with ID=1)

**New Types**: 5 TypeScript interfaces (GroupSettingsData added)
**New Validation Schemas**: 1 Zod schema (contact form)
**New Database Operations**: 1 new function in group-operations.ts, 1 new file group-settings-operations.ts with 2 functions
