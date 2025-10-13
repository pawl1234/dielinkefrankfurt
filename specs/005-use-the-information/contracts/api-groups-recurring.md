# API Contract: Groups Recurring Meetings

**Feature**: 005-use-the-information
**Base Path**: `/api/groups` (extends existing API)

## Overview
Endpoints for managing recurring meeting patterns for groups. These extend the existing group creation and update flows.

---

## POST /api/groups (Modified)
Create a new group with recurring meeting patterns.

### Request Body
```typescript
{
  // Existing group fields (name, description, etc.)
  name: string;
  description: string;
  logoFile?: File;
  responsiblePersons: ResponsiblePerson[];

  // NEW: Recurring meeting fields
  recurringMeeting: {
    patterns?: Array<{
      type: 'monthly-1st' | 'monthly-3rd' | 'monthly-last' | 'weekly' | 'biweekly';
      weekday: 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' | 'SU';
    }>;
    time?: string;  // HH:mm format
    hasNoMeeting?: boolean;
  };

  // Existing location fields
  meetingStreet?: string;
  meetingCity?: string;
  meetingPostalCode?: string;
  meetingLocationDetails?: string;
}
```

### Response (200 OK)
```typescript
{
  success: true;
  groupId: string;
  slug: string;
}
```

### Response (400 Bad Request)
```typescript
{
  success: false;
  error: string;  // German validation message
  details?: {
    field: string;
    message: string;
  }[];
}
```

**Validation Rules**:
- Either `hasNoMeeting === true` OR `patterns.length > 0` (mutually exclusive)
- If patterns provided, `time` is REQUIRED and must match `/^\d{2}:\d{2}$/`
- Each pattern must have valid `type` and `weekday`

**Processing**:
1. Validate request body with Zod schema
2. Convert `PatternConfig[]` to rrule strings
3. Store as JSON array in `Group.recurringPatterns`
4. Store time in `Group.meetingTime`
5. Create group with all fields

---

## PATCH /api/admin/groups/[id] (Modified)
Update existing group's recurring meeting patterns (admin only).

### Request Body
```typescript
{
  // All group fields (partial updates supported)
  name?: string;
  description?: string;
  // ... other fields

  // NEW: Recurring meeting fields
  recurringMeeting?: {
    patterns?: Array<{
      type: 'monthly-1st' | 'monthly-3rd' | 'monthly-last' | 'weekly' | 'biweekly';
      weekday: 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' | 'SU';
    }>;
    time?: string;
    hasNoMeeting?: boolean;
  };

  meetingStreet?: string;
  meetingCity?: string;
  meetingPostalCode?: string;
  meetingLocationDetails?: string;
}
```

### Response (200 OK)
```typescript
{
  success: true;
  group: {
    id: string;
    name: string;
    slug: string;
    // ... all group fields including recurringPatterns
  };
}
```

### Response (404 Not Found)
```typescript
{
  success: false;
  error: "Gruppe nicht gefunden";
}
```

**Validation Rules**: Same as POST /api/groups

**Processing**:
1. Load existing group by ID
2. Validate update data with Zod schema
3. Convert patterns to rrule strings if provided
4. Update group fields (replace recurringPatterns/meetingTime)
5. Return updated group

---

## GET /api/groups/[slug] (Modified)
Get group details including recurring meeting patterns (public).

### Response (200 OK)
```typescript
{
  id: string;
  name: string;
  slug: string;
  description: string;
  logoUrl?: string;
  status: string;

  // NEW: Recurring meeting fields
  recurringPatterns?: string;  // JSON array of rrule strings
  meetingTime?: string;         // HH:mm format
  meetingStreet?: string;
  meetingCity?: string;
  meetingPostalCode?: string;
  meetingLocationDetails?: string;

  // Existing fields
  responsiblePersons: ResponsiblePerson[];
  createdAt: string;
  updatedAt: string;
}
```

**Processing**:
1. Load group by slug with relations
2. Return raw `recurringPatterns` and `meetingTime` (client parses)

---

## GET /api/groups/upcoming-meetings
Get all upcoming meetings for active groups in next 7 days.

### Query Parameters
```typescript
{
  days?: number;  // Optional, default 7, max 30
}
```

### Response (200 OK)
```typescript
{
  meetings: Array<{
    groupId: string;
    groupName: string;
    groupSlug: string;
    date: string;        // ISO 8601 date
    time: string;        // HH:mm format
    street?: string;
    city?: string;
    postalCode?: string;
    locationDetails?: string;
  }>;
}
```

**Processing**:
1. Load all active groups with `recurringPatterns !== null`
2. For each group:
   - Parse `recurringPatterns` JSON to array
   - For each rrule string:
     - Create RRule object
     - Calculate occurrences in date range (today to today + days)
   - Merge occurrences from all patterns
   - Combine with `meetingTime` and location fields
3. Sort all meetings by date ascending
4. Return merged list

**Error Response (500)**:
```typescript
{
  success: false;
  error: "Fehler beim Berechnen der Termine";
}
```

---

## Validation Schemas (Zod)

### Pattern Config Schema
```typescript
const patternConfigSchema = z.object({
  type: z.enum(['monthly-1st', 'monthly-3rd', 'monthly-last', 'weekly', 'biweekly']),
  weekday: z.enum(['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']),
});
```

### Recurring Meeting Data Schema
```typescript
const recurringMeetingDataSchema = z.object({
  patterns: z.array(patternConfigSchema).optional(),
  time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  hasNoMeeting: z.boolean().optional(),
}).refine(
  (data) => {
    if (data.hasNoMeeting) return !data.patterns || data.patterns.length === 0;
    return data.patterns && data.patterns.length > 0 && !!data.time;
  },
  {
    message: "Wählen Sie entweder 'Kein regelmäßiges Treffen' oder mindestens ein Muster mit Uhrzeit"
  }
);
```

### Group Creation Schema (Extended)
```typescript
const groupCreateSchema = z.object({
  // Existing fields
  name: z.string().min(1).max(100),
  description: z.string().min(1),
  responsiblePersons: z.array(responsiblePersonSchema),

  // NEW: Recurring meeting
  recurringMeeting: recurringMeetingDataSchema,

  // Location fields
  meetingStreet: z.string().optional(),
  meetingCity: z.string().optional(),
  meetingPostalCode: z.string().length(5).optional(),
  meetingLocationDetails: z.string().optional(),
});
```

---

## Error Handling

### Client Errors (400)
- Invalid pattern type: "Ungültiger Mustertyp"
- Invalid weekday: "Ungültiger Wochentag"
- Invalid time format: "Ungültiges Zeitformat. Verwenden Sie HH:mm (z.B. 19:00)"
- Missing time with patterns: "Uhrzeit ist erforderlich, wenn Muster ausgewählt sind"
- Both patterns and hasNoMeeting: "Wählen Sie entweder Muster oder 'Kein regelmäßiges Treffen', nicht beides"
- Neither patterns nor hasNoMeeting: "Wählen Sie mindestens ein Muster oder 'Kein regelmäßiges Treffen'"

### Server Errors (500)
- RRule parsing error: "Fehler beim Verarbeiten des Musters"
- Database error: "Fehler beim Speichern der Gruppe"
- Calculation error: "Fehler beim Berechnen der Termine"

All errors logged with `logger.error()` with context.

---

## Authorization

- **POST /api/groups**: Public (anonymous users)
- **PATCH /api/admin/groups/[id]**: Admin only (NextAuth session required)
- **GET /api/groups/[slug]**: Public
- **GET /api/groups/upcoming-meetings**: Public

---

## Performance Requirements

- Pattern calculation: <100ms for 7-day range per group
- Upcoming meetings endpoint: <500ms for 50 groups
- No caching required for initial implementation
- RRule objects created once per calculation

---

## Testing Scenarios

### Manual Validation Checklist
1. Create group with single pattern → verify rrule stored correctly
2. Create group with multiple patterns → verify array stored correctly
3. Create group with "Kein regelmäßiges Treffen" → verify empty array
4. Update group patterns via admin → verify patterns replaced
5. Submit invalid time format → verify 400 error
6. Submit patterns without time → verify 400 error
7. Submit both patterns and hasNoMeeting → verify 400 error
8. Fetch upcoming meetings → verify dates sorted, all patterns included
9. Group with "5th Monday" pattern in 4-Monday month → verify no error, occurrence skipped
10. Location fields incomplete → verify no error, display available fields
