# Research: Strukturierte Wiederkehrende Gruppentreffen

**Feature**: 005-use-the-information
**Date**: 2025-10-12

## Research Questions

### 1. How to implement recurring meeting patterns?
**Decision**: Use **rrule** npm package (RFC 5545 iCalendar standard)

**Rationale**:
- Industry-standard recurrence rule implementation (RFC 5545)
- Handles complex patterns: monthly by day-of-week, weekly, bi-weekly, last occurrence
- Built-in date calculation for any range
- TypeScript support via `@types/rrule`
- Actively maintained with 3M+ weekly downloads
- Handles edge cases (e.g., "5th Monday" in months with only 4 Mondays)
- Serializable format: store as string, reconstruct RRule object

**Alternatives Considered**:
- **date-fns/rrule**: Less comprehensive, lacks built-in recurrence patterns
- **Custom implementation**: High complexity, error-prone edge cases, reinventing the wheel
- **Cron-like patterns**: Not designed for calendar recurrence, lacks "3rd Monday" support

### 2. How to structure recurring pattern data in the database?
**Decision**: Store rrule strings in JSON array field, replace `regularMeeting` text field

**Rationale**:
- RRule.toString() produces compact, standard format: `FREQ=MONTHLY;BYDAY=3MO`
- JSON array supports multiple patterns per group (requirement FR-002a)
- Can be parsed back to RRule objects for calculations
- No schema changes needed beyond field type change
- Compatible with Prisma `String` field type

**Database Schema Changes**:
```prisma
model Group {
  // Remove: regularMeeting String?
  // Add:
  recurringPatterns String? // JSON array of rrule strings: ["FREQ=MONTHLY;BYDAY=1MO", "FREQ=MONTHLY;BYDAY=3MO"]
  meetingTime       String? // Time in HH:mm format (e.g., "19:00")
  // Existing location fields remain unchanged
}
```

**Alternatives Considered**:
- **Separate RecurringPattern table**: Over-engineering for ~10-50 groups, adds JOIN complexity
- **Store full RRule objects as JSON**: Redundant serialization, rrule strings are sufficient
- **Keep text field + add structured**: Confusing dual state, data consistency issues

### 3. How to present predefined patterns to users?
**Decision**: Dropdown/select component with German labels + weekday selection

**Rationale**:
- Users select pattern type (e.g., "Jeden 3. [Wochentag] im Monat")
- Separate weekday selector (Montag-Sonntag)
- Multiple pattern support: "Add Pattern" button
- "Kein regelmäßiges Treffen" checkbox (mutually exclusive)
- Material UI components: Select, FormControl, Checkbox

**Pattern Types to Support** (from FR-002):
1. "Jeden 1. [Wochentag] im Monat" → `FREQ=MONTHLY;BYDAY=1MO` (MO = selected weekday)
2. "Jeden 3. [Wochentag] im Monat" → `FREQ=MONTHLY;BYDAY=3MO`
3. "Jeden letzten [Wochentag] im Monat" → `FREQ=MONTHLY;BYDAY=-1MO`
4. "Wöchentlich am [Wochentag]" → `FREQ=WEEKLY;BYDAY=MO`
5. "Alle zwei Wochen am [Wochentag]" → `FREQ=WEEKLY;INTERVAL=2;BYDAY=MO`

**Alternatives Considered**:
- **Free-form rrule builder**: Too complex for users, defeats simplicity goal
- **Calendar picker**: Doesn't communicate recurrence clearly
- **Text templates with placeholders**: Fragile, harder to validate

### 4. How to calculate and display upcoming meetings?
**Decision**: Server-side calculation using RRule.between(), client-side display

**Rationale**:
- Parse stored rrule strings back to RRule objects
- Use `RRule.between(startDate, endDate)` to get occurrences
- Merge results from multiple patterns per group
- Sort by date, format with German locale
- Cache calculations for performance (optional optimization)

**Display Format** (German):
- Group overview: "Jeden 1. und 3. Montag im Monat um 19:00 Uhr"
- Demo page: "Gruppe Name - Montag, 15. Januar 2025, 19:00 Uhr - Location"

**Alternatives Considered**:
- **Client-side calculation**: Bundles rrule in browser, slower, duplicates logic
- **Pre-calculate all dates**: Storage overhead, invalidation complexity
- **Real-time API calls**: Latency, unnecessary for static patterns

### 5. How to ensure reusability across forms?
**Decision**: Standalone `RecurringMeetingPatternSelector` component in `src/components/forms/`

**Rationale**:
- Encapsulated component with props interface
- No hardcoded form dependencies
- Returns structured data: `{ patterns: string[], time: string, hasNoMeeting: boolean }`
- Can be imported by any form (group creation, admin edit, future forms)
- Material UI based for consistency

**Component API**:
```typescript
interface RecurringMeetingPatternSelectorProps {
  value?: RecurringMeetingPatternData;
  onChange: (data: RecurringMeetingPatternData) => void;
  error?: string;
}

interface RecurringMeetingPatternData {
  patterns: string[]; // rrule strings
  time: string; // HH:mm format
  hasNoMeeting: boolean;
}
```

**Alternatives Considered**:
- **Hook-based API**: Less portable, requires form context
- **Context provider**: Over-engineering for single component
- **Inline form fields**: Duplicates code, not reusable

### 6. How to handle validation?
**Decision**: Zod schema for server-side validation, React Hook Form for client-side UX

**Rationale**:
- Validate rrule string format (can be parsed by RRule)
- Validate mutual exclusivity: patterns XOR hasNoMeeting
- Validate time format (HH:mm)
- Zod schema reusable across API routes

**Validation Schema**:
```typescript
const recurringMeetingSchema = z.object({
  patterns: z.array(z.string()).optional(),
  time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  hasNoMeeting: z.boolean().optional(),
}).refine(
  (data) => data.hasNoMeeting || (data.patterns && data.patterns.length > 0),
  { message: "Wählen Sie ein Muster oder 'Kein regelmäßiges Treffen'" }
);
```

**Alternatives Considered**:
- **Client-only validation**: Insecure, can be bypassed
- **Custom validation logic**: Less maintainable than Zod
- **No validation**: Corrupt data, calculation errors

### 7. German Localization Strategy
**Decision**: Manual translation for pattern templates, dayjs for date formatting

**Rationale**:
- Pattern labels hardcoded in German (simple, no i18n overhead)
- Weekday names: German labels (Montag, Dienstag, etc.)
- Date formatting: Use `dayjs` with German locale (`de`)
- RRule stores standard codes (MO, TU), display layer translates

**Translation Mappings**:
```typescript
const WEEKDAY_LABELS = {
  MO: 'Montag', TU: 'Dienstag', WE: 'Mittwoch',
  TH: 'Donnerstag', FR: 'Freitag', SA: 'Samstag', SU: 'Sonntag'
};

const PATTERN_LABELS = {
  'monthly-1st': 'Jeden 1. [Wochentag] im Monat',
  'monthly-3rd': 'Jeden 3. [Wochentag] im Monat',
  'monthly-last': 'Jeden letzten [Wochentag] im Monat',
  'weekly': 'Wöchentlich am [Wochentag]',
  'biweekly': 'Alle zwei Wochen am [Wochentag]'
};
```

**Alternatives Considered**:
- **Full i18n framework**: Overkill for German-only app
- **Store German text in DB**: Harder to change, not data
- **rrule localization library**: Doesn't exist for German

## Implementation Approach Summary

**Data Flow**:
1. User selects patterns + time in form component
2. Component returns `{ patterns: ["FREQ=MONTHLY;BYDAY=1MO"], time: "19:00" }`
3. Form submits to API route
4. API validates with Zod, stores JSON string in `Group.recurringPatterns`
5. Display pages: Load group, parse rrule strings, calculate dates, render German text

**Key Files to Create/Modify**:
- `lib/groups/recurring-patterns.ts` - Pattern definitions, rrule converters
- `lib/groups/meeting-calculator.ts` - Calculate upcoming meetings
- `components/forms/RecurringMeetingPatternSelector.tsx` - Reusable form component
- `app/gruppen/upcoming/page.tsx` - Demo page for next 7 days
- `lib/db/group-operations.ts` - Update query functions
- Prisma schema - Update Group model
- `lib/validation/group-schema.ts` - Add recurring pattern validation

**Dependencies to Install**:
```bash
npm install rrule
npm install --save-dev @types/rrule
```

## Unknowns Resolved
- ✅ Recurring pattern implementation: rrule library
- ✅ Database structure: JSON array of rrule strings
- ✅ Multiple patterns per group: Supported in array
- ✅ German localization: Manual translation + dayjs
- ✅ Reusability: Standalone component with props interface
- ✅ Edge cases: rrule handles automatically (silent skip)

## Risk Assessment
- **Low Risk**: rrule is mature, well-tested library
- **Low Risk**: Schema change is additive, old field can be removed
- **Low Risk**: Component reusability design allows future expansion
- **Medium Risk**: Manual testing required for all patterns + edge cases
- **Mitigation**: Comprehensive quickstart.md with all pattern combinations

## Performance Considerations
- RRule.between() is efficient for small date ranges (7 days)
- Parsing JSON arrays is fast (<1ms per group)
- Consider caching calculated meetings if demo page is slow (premature optimization)
- No pagination needed for initial ~10-50 groups

## Next Steps
Proceed to Phase 1: Design data model, API contracts, and quickstart scenarios
