# Component Contract: RecurringMeetingPatternSelector

**Feature**: 005-use-the-information
**Component Path**: `src/components/forms/RecurringMeetingPatternSelector.tsx`

## Overview
Reusable form component for selecting recurring meeting patterns. Can be used in any form (group creation, admin edit, future use cases).

---

## Component API

### Props Interface
```typescript
interface RecurringMeetingPatternSelectorProps {
  // Current value (controlled component)
  value?: RecurringMeetingData;

  // Change handler
  onChange: (data: RecurringMeetingData) => void;

  // Validation error from parent form
  error?: string;

  // Optional labels/text overrides
  labels?: {
    title?: string;
    noMeetingLabel?: string;
    addPatternButton?: string;
    timeLabel?: string;
  };

  // Disable all inputs
  disabled?: boolean;
}

interface RecurringMeetingData {
  patterns?: PatternConfig[];
  time?: string;
  hasNoMeeting?: boolean;
}

interface PatternConfig {
  type: PatternType;
  weekday: Weekday;
}

type PatternType =
  | 'monthly-1st'
  | 'monthly-3rd'
  | 'monthly-last'
  | 'weekly'
  | 'biweekly';

type Weekday = 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' | 'SU';
```

### Default Labels (German)
```typescript
const DEFAULT_LABELS = {
  title: 'Regelmäßige Treffen',
  noMeetingLabel: 'Kein regelmäßiges Treffen',
  addPatternButton: 'Weiteres Muster hinzufügen',
  timeLabel: 'Uhrzeit',
  patternTypeLabel: 'Muster',
  weekdayLabel: 'Wochentag',
  removePatternButton: 'Entfernen',
};
```

---

## User Interface Layout

### Structure
```
┌─────────────────────────────────────────────┐
│ Regelmäßige Treffen                         │
├─────────────────────────────────────────────┤
│ ☐ Kein regelmäßiges Treffen                 │
├─────────────────────────────────────────────┤
│ Muster 1:                                   │
│ ┌─────────────────────┐ ┌───────────────┐  │
│ │ Jeden 3. [Wochentag]│ │ Montag        │  │
│ └─────────────────────┘ └───────────────┘  │
│ [Entfernen]                                 │
├─────────────────────────────────────────────┤
│ + Weiteres Muster hinzufügen                │
├─────────────────────────────────────────────┤
│ Uhrzeit:                                    │
│ ┌───────┐                                   │
│ │ 19:00 │                                   │
│ └───────┘                                   │
└─────────────────────────────────────────────┘
```

### Field Visibility Rules
- **"Kein regelmäßiges Treffen" checked**: Hide all pattern fields and time field
- **"Kein regelmäßiges Treffen" unchecked**: Show pattern fields and time field
- **No patterns added yet**: Show "Add Pattern" button
- **1+ patterns added**: Show all patterns with remove buttons + "Add Pattern" button

---

## Pattern Type Options

### Dropdown Options (German)
```typescript
const PATTERN_TYPE_OPTIONS = [
  { value: 'monthly-1st', label: 'Jeden 1. [Wochentag] im Monat' },
  { value: 'monthly-3rd', label: 'Jeden 3. [Wochentag] im Monat' },
  { value: 'monthly-last', label: 'Jeden letzten [Wochentag] im Monat' },
  { value: 'weekly', label: 'Wöchentlich am [Wochentag]' },
  { value: 'biweekly', label: 'Alle zwei Wochen am [Wochentag]' },
];
```

### Weekday Options (German)
```typescript
const WEEKDAY_OPTIONS = [
  { value: 'MO', label: 'Montag' },
  { value: 'TU', label: 'Dienstag' },
  { value: 'WE', label: 'Mittwoch' },
  { value: 'TH', label: 'Donnerstag' },
  { value: 'FR', label: 'Freitag' },
  { value: 'SA', label: 'Samstag' },
  { value: 'SU', label: 'Sonntag' },
];
```

---

## Behavior Specification

### State Management
- **Controlled Component**: Value comes from props, changes emitted via `onChange`
- **Internal State**: None (fully controlled by parent form)
- **Default Value**: `{ patterns: [], time: undefined, hasNoMeeting: false }`

### User Interactions

#### 1. Check "Kein regelmäßiges Treffen"
**Action**: User checks checkbox
**Effect**:
- Emit `onChange({ patterns: [], time: undefined, hasNoMeeting: true })`
- Hide pattern fields and time field
- Clear any existing patterns/time

#### 2. Uncheck "Kein regelmäßiges Treffen"
**Action**: User unchecks checkbox
**Effect**:
- Emit `onChange({ patterns: [], time: undefined, hasNoMeeting: false })`
- Show pattern fields and time field
- Start with empty patterns array

#### 3. Add Pattern
**Action**: User clicks "+ Weiteres Muster hinzufügen"
**Effect**:
- Add new pattern to array: `{ type: 'monthly-1st', weekday: 'MO' }` (defaults)
- Emit `onChange({ ...value, patterns: [...patterns, newPattern] })`
- Show new pattern selector

#### 4. Remove Pattern
**Action**: User clicks "Entfernen" on pattern N
**Effect**:
- Remove pattern at index N
- Emit `onChange({ ...value, patterns: patterns.filter((_, i) => i !== N) })`

#### 5. Change Pattern Type
**Action**: User selects different pattern type from dropdown
**Effect**:
- Update pattern at index N
- Emit `onChange({ ...value, patterns: [...patterns with updated type] })`

#### 6. Change Weekday
**Action**: User selects different weekday
**Effect**:
- Update pattern at index N
- Emit `onChange({ ...value, patterns: [...patterns with updated weekday] })`

#### 7. Change Time
**Action**: User types/selects time
**Effect**:
- Emit `onChange({ ...value, time: newTime })`

---

## Validation Display

### Error Prop
- Display error message below component in red (Material UI FormHelperText)
- Error comes from parent form (React Hook Form or manual validation)

### Example Errors (German)
- "Wählen Sie entweder 'Kein regelmäßiges Treffen' oder mindestens ein Muster"
- "Uhrzeit ist erforderlich, wenn Muster ausgewählt sind"
- "Ungültiges Zeitformat. Verwenden Sie HH:mm (z.B. 19:00)"

---

## Material UI Components Used

### Component Hierarchy
```tsx
<Box>
  <Typography variant="h6">{title}</Typography>

  <FormControlLabel
    control={<Checkbox checked={hasNoMeeting} />}
    label={noMeetingLabel}
  />

  {!hasNoMeeting && (
    <>
      {patterns.map((pattern, index) => (
        <Box key={index}>
          <FormControl>
            <InputLabel>Muster</InputLabel>
            <Select value={pattern.type}>
              {/* Pattern type options */}
            </Select>
          </FormControl>

          <FormControl>
            <InputLabel>Wochentag</InputLabel>
            <Select value={pattern.weekday}>
              {/* Weekday options */}
            </Select>
          </FormControl>

          <Button onClick={removePattern}>Entfernen</Button>
        </Box>
      ))}

      <Button onClick={addPattern}>+ Weiteres Muster hinzufügen</Button>

      <TextField
        label="Uhrzeit"
        type="time"
        value={time}
        InputLabelProps={{ shrink: true }}
        inputProps={{ step: 300 }} // 5 min intervals
      />
    </>
  )}

  {error && <FormHelperText error>{error}</FormHelperText>}
</Box>
```

---

## Usage Examples

### React Hook Form Integration
```tsx
import { Controller } from 'react-hook-form';
import { RecurringMeetingPatternSelector } from '@/components/forms/RecurringMeetingPatternSelector';

function GroupForm() {
  const { control } = useForm<GroupFormData>();

  return (
    <Controller
      name="recurringMeeting"
      control={control}
      render={({ field, fieldState }) => (
        <RecurringMeetingPatternSelector
          value={field.value}
          onChange={field.onChange}
          error={fieldState.error?.message}
        />
      )}
    />
  );
}
```

### Manual State Management
```tsx
import { RecurringMeetingPatternSelector } from '@/components/forms/RecurringMeetingPatternSelector';

function GroupForm() {
  const [recurringMeeting, setRecurringMeeting] = useState<RecurringMeetingData>({
    patterns: [],
    time: undefined,
    hasNoMeeting: false,
  });

  return (
    <RecurringMeetingPatternSelector
      value={recurringMeeting}
      onChange={setRecurringMeeting}
    />
  );
}
```

### Custom Labels
```tsx
<RecurringMeetingPatternSelector
  value={value}
  onChange={onChange}
  labels={{
    title: 'Wann trifft sich die Gruppe?',
    noMeetingLabel: 'Keine festen Termine',
  }}
/>
```

---

## Accessibility

- All form controls have proper labels (Material UI InputLabel)
- Checkbox has associated label text
- Error messages linked to form controls via aria-describedby
- Time input supports keyboard navigation
- Select dropdowns support keyboard navigation (Material UI default)

---

## Responsive Design

- Full width on mobile (<600px)
- Pattern selectors stack vertically on mobile
- Pattern selectors side-by-side on desktop (≥600px)
- Time field reduced width on desktop (max 200px)

---

## Testing Scenarios

### Manual Validation Checklist
1. Check "Kein regelmäßiges Treffen" → verify all fields hidden
2. Uncheck "Kein regelmäßiges Treffen" → verify fields shown
3. Add pattern → verify new pattern appears with defaults
4. Remove pattern → verify pattern removed
5. Change pattern type → verify onChange called with updated data
6. Change weekday → verify onChange called with updated data
7. Enter time → verify onChange called with time
8. Add multiple patterns → verify all patterns maintained
9. Display error prop → verify error message shown in red
10. Disable component → verify all inputs disabled
