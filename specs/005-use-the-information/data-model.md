# Data Model: Strukturierte Wiederkehrende Gruppentreffen

**Feature**: 005-use-the-information
**Date**: 2025-10-12

## Entity Overview

### Group (Modified)
Extension of existing Group model to support structured recurring meeting patterns.

**Fields** (changes only):
- `recurringPatterns`: `String?` - JSON array of rrule strings (replaces `regularMeeting` text field)
- `meetingTime`: `String?` - Meeting time in HH:mm format (e.g., "19:00")
- `meetingStreet`: `String?` - Existing field, unchanged
- `meetingCity`: `String?` - Existing field, unchanged
- `meetingPostalCode`: `String?` - Existing field, unchanged
- `meetingLocationDetails`: `String?` - Existing field, unchanged

**Migration Notes**:
- **REMOVE**: `regularMeeting` field (freeform text)
- **ADD**: `recurringPatterns` (JSON array), `meetingTime` (string)
- Existing groups will have `null` values, admins must manually reconfigure
- No data migration script needed (acceptable data loss per clarifications)

**Example Data**:
```json
{
  "id": "cuid_abc123",
  "name": "AG Klimagerechtigkeit",
  "recurringPatterns": "[\"FREQ=MONTHLY;BYDAY=1MO\",\"FREQ=MONTHLY;BYDAY=3MO\"]",
  "meetingTime": "19:00",
  "meetingStreet": "Musterstraße 123",
  "meetingCity": "Frankfurt",
  "meetingPostalCode": "60311",
  "meetingLocationDetails": "Im Hinterhof, 2. Stock"
}
```

**RRule Format**:
- Standard RFC 5545 format: `FREQ=MONTHLY;BYDAY=3MO`
- Stored as JSON string array: `["FREQ=MONTHLY;BYDAY=1MO", "FREQ=WEEKLY;BYDAY=MO"]`
- Can be parsed by rrule library: `RRule.fromString(ruleString)`

### RecurringPatternType (Enum/Constant, not DB model)
Predefined pattern types available for selection.

**Pattern Definitions**:
```typescript
type PatternType =
  | 'monthly-1st'      // Jeden 1. [Wochentag] im Monat
  | 'monthly-3rd'      // Jeden 3. [Wochentag] im Monat
  | 'monthly-last'     // Jeden letzten [Wochentag] im Monat
  | 'weekly'           // Wöchentlich am [Wochentag]
  | 'biweekly';        // Alle zwei Wochen am [Wochentag]

type Weekday = 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' | 'SU';

interface PatternConfig {
  type: PatternType;
  weekday: Weekday;
}
```

**RRule Generation Rules**:
- `monthly-1st` + `MO` → `FREQ=MONTHLY;BYDAY=1MO`
- `monthly-3rd` + `TU` → `FREQ=MONTHLY;BYDAY=3TU`
- `monthly-last` + `FR` → `FREQ=MONTHLY;BYDAY=-1FR`
- `weekly` + `WE` → `FREQ=WEEKLY;BYDAY=WE`
- `biweekly` + `TH` → `FREQ=WEEKLY;INTERVAL=2;BYDAY=TH`

### CalculatedMeeting (Runtime-only, not stored)
Represents a specific meeting occurrence calculated from recurring patterns.

**Structure**:
```typescript
interface CalculatedMeeting {
  groupId: string;
  groupName: string;
  date: Date;           // Calculated date
  time: string;         // HH:mm format from Group.meetingTime
  street?: string;
  city?: string;
  postalCode?: string;
  locationDetails?: string;
}
```

**Generation**:
1. Load Group with `recurringPatterns` and `meetingTime`
2. Parse each rrule string to RRule object
3. Call `rrule.between(startDate, endDate)` for each pattern
4. Merge all occurrences from all patterns
5. Combine date + time + location into CalculatedMeeting
6. Sort by date ascending

**Example**:
```typescript
// Group has patterns: ["FREQ=MONTHLY;BYDAY=1MO", "FREQ=MONTHLY;BYDAY=3MO"]
// Time: "19:00"
// Calculate for Jan 2025:
// Returns: [
//   { date: 2025-01-06, time: "19:00", ... },  // 1st Monday
//   { date: 2025-01-20, time: "19:00", ... }   // 3rd Monday
// ]
```

## Validation Rules

### RecurringPatternData (Client → Server)
Data structure submitted from form to API.

```typescript
interface RecurringMeetingData {
  patterns?: PatternConfig[];      // Array of { type, weekday }
  time?: string;                   // HH:mm format
  hasNoMeeting?: boolean;          // Mutually exclusive with patterns
}
```

**Validation Rules**:
1. **Mutual Exclusivity**: `hasNoMeeting === true` OR `patterns.length > 0` (not both, not neither)
2. **Time Format**: If patterns exist, time MUST match `/^\d{2}:\d{2}$/` (e.g., "19:00")
3. **Pattern Structure**: Each pattern MUST have valid `type` and `weekday`
4. **RRule Generation**: Each pattern MUST produce valid rrule string parseable by RRule library
5. **Time Requirement**: If `hasNoMeeting === false`, time is REQUIRED
6. **Time Optional**: If `hasNoMeeting === true`, time is ignored

**Zod Schema**:
```typescript
const patternConfigSchema = z.object({
  type: z.enum(['monthly-1st', 'monthly-3rd', 'monthly-last', 'weekly', 'biweekly']),
  weekday: z.enum(['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']),
});

const recurringMeetingDataSchema = z.object({
  patterns: z.array(patternConfigSchema).optional(),
  time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  hasNoMeeting: z.boolean().optional(),
}).refine(
  (data) => {
    if (data.hasNoMeeting) return data.patterns === undefined || data.patterns.length === 0;
    return data.patterns && data.patterns.length > 0 && !!data.time;
  },
  {
    message: "Wählen Sie entweder 'Kein regelmäßiges Treffen' oder mindestens ein Muster mit Uhrzeit"
  }
);
```

## State Transitions

### Group Meeting Configuration States
A group's meeting configuration can be in one of three states:

1. **No Configuration** (`recurringPatterns === null`, `meetingTime === null`)
   - Initial state for new groups
   - Legacy state for migrated groups
   - Display: "Keine regelmäßigen Treffen angegeben"

2. **No Regular Meetings** (`recurringPatterns === "[]"`, `meetingTime === null`)
   - Explicitly set via "Kein regelmäßiges Treffen" checkbox
   - Display: No meeting info shown

3. **Active Patterns** (`recurringPatterns !== null && JSON.parse().length > 0`, `meetingTime !== null`)
   - One or more patterns configured with time
   - Display: German formatted pattern text + upcoming meetings

**Transitions**:
- From **No Configuration** → **Active Patterns**: User submits patterns + time
- From **No Configuration** → **No Regular Meetings**: User checks "Kein regelmäßiges Treffen"
- From **Active Patterns** → **No Regular Meetings**: User checks "Kein regelmäßiges Treffen"
- From **No Regular Meetings** → **Active Patterns**: User unchecks and adds patterns + time
- From **Active Patterns** → **Active Patterns**: User modifies patterns/time

## Database Schema (Prisma)

```prisma
model Group {
  id                      String               @id @default(cuid())
  name                    String               @db.VarChar(100)
  slug                    String               @unique
  description             String               @db.Text
  logoUrl                 String?
  metadata                String?
  status                  GroupStatus          @default(NEW)

  // Recurring meeting fields (MODIFIED)
  recurringPatterns       String?              @db.Text  // JSON array of rrule strings
  meetingTime             String?              @db.VarChar(5)  // HH:mm format
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

**Migration Steps**:
1. Add `recurringPatterns` field (nullable Text)
2. Add `meetingTime` field (nullable VarChar(5))
3. Remove `regularMeeting` field (data loss acceptable)
4. Run `npm run db:push` to apply changes

## Type Definitions (src/types/)

**Check Existing Types First** (Constitution Principle XII):
- Check `src/types/form-types.ts` for existing recurring/pattern types
- Check `src/types/component-types.ts` for group-related types
- Check `src/types/api-types.ts` for API data structures

**New Types to Add** (if not existing):
```typescript
// In src/types/form-types.ts or new src/types/recurring-meeting-types.ts

export type PatternType =
  | 'monthly-1st'
  | 'monthly-3rd'
  | 'monthly-last'
  | 'weekly'
  | 'biweekly';

export type Weekday = 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' | 'SU';

export interface PatternConfig {
  type: PatternType;
  weekday: Weekday;
}

export interface RecurringMeetingData {
  patterns?: PatternConfig[];
  time?: string;
  hasNoMeeting?: boolean;
}

export interface CalculatedMeeting {
  groupId: string;
  groupName: string;
  slug: string;
  date: Date;
  time: string;
  street?: string;
  city?: string;
  postalCode?: string;
  locationDetails?: string;
}
```

## Relationships

- **Group** has many **CalculatedMeeting** (runtime-only, not stored)
- **PatternConfig** defines how to generate RRule strings
- **RRule strings** stored in Group model, parsed at runtime

## Edge Cases Handled

1. **Invalid Month/Day Combinations**: RRule automatically skips (e.g., "5th Monday" when month has only 4)
2. **Empty Patterns Array**: Treated as "No Regular Meetings"
3. **Null vs Empty**: `null` = not configured, `"[]"` = explicitly no meetings
4. **Time Without Patterns**: Validation prevents this (server-side Zod)
5. **Patterns Without Time**: Validation prevents this (server-side Zod)
6. **Incomplete Location**: Display available fields, no errors
7. **Multiple Patterns Same Weekday**: Allowed (e.g., 1st Monday + 3rd Monday)
8. **Duplicate Dates from Patterns**: Deduplicate when merging calculations

## Performance Considerations

- **Pattern Parsing**: Parse JSON once per request, cache if needed
- **Date Calculation**: RRule.between() is O(n) where n = days in range
- **7-Day Range**: Max ~10 dates per group, negligible performance impact
- **50 Groups**: ~500 calculations total, <50ms expected
- **No Indexing Needed**: recurringPatterns not queried directly

## Future Extensibility

- **Additional Pattern Types**: Add to PatternType enum, update converters
- **Custom RRule Input**: Advanced admin mode for direct rrule string entry
- **Timezone Support**: Store timezone with meetingTime if needed
- **Exceptions**: Add "skipDates" array to exclude specific occurrences
- **Range Limits**: Add "until" date to stop recurrence
