# Quickstart: Strukturierte Wiederkehrende Gruppentreffen

**Feature**: 005-use-the-information
**Date**: 2025-10-12

## Purpose
Manual validation guide for recurring meeting patterns feature. Execute these scenarios after implementation to verify correctness.

---

## Prerequisites

### Environment Setup
```bash
# Install dependencies
npm install

# Ensure database is running
npm run db:start

# Apply schema changes
npm run db:push

# Start development server
npm run dev
```

### Test Data
Create at least 3 test groups via admin panel before testing:
- Group A: Single pattern (every 1st Monday)
- Group B: Multiple patterns (every 1st + 3rd Monday)
- Group C: No regular meetings

---

## Scenario 1: Create Group with Single Pattern (Anonymous User)

### Steps
1. Navigate to `/neue-gruppe` (public group request form)
2. Fill out basic group info (name, description, responsible persons)
3. In recurring meeting section:
   - **Do NOT check** "Kein regelmäßiges Treffen"
   - Click "Weiteres Muster hinzufügen" if no pattern shown
   - Select "Jeden 1. [Wochentag] im Monat" from pattern dropdown
   - Select "Montag" from weekday dropdown
   - Enter time: "19:00"
4. Fill location fields: Street, City, Postal Code
5. Submit form

### Expected Results
- ✅ Form submits successfully
- ✅ Success message displayed
- ✅ No validation errors
- ✅ Database: `recurringPatterns` contains `["FREQ=MONTHLY;BYDAY=1MO"]`
- ✅ Database: `meetingTime` = "19:00"
- ✅ Admin panel shows pending group with pattern data

### Error Cases to Verify
- ❌ Submit without time → "Uhrzeit ist erforderlich"
- ❌ Submit with invalid time (e.g., "25:00") → "Ungültiges Zeitformat"
- ❌ Submit with patterns AND "Kein regelmäßiges Treffen" checked → Error message

---

## Scenario 2: Create Group with Multiple Patterns (Anonymous User)

### Steps
1. Navigate to `/neue-gruppe`
2. Fill out basic group info
3. In recurring meeting section:
   - Add first pattern: "Jeden 1. Montag im Monat"
   - Click "+ Weiteres Muster hinzufügen"
   - Add second pattern: "Jeden 3. Montag im Monat"
   - Enter time: "19:00"
4. Fill location fields
5. Submit form

### Expected Results
- ✅ Form submits successfully
- ✅ Database: `recurringPatterns` = `["FREQ=MONTHLY;BYDAY=1MO", "FREQ=MONTHLY;BYDAY=3MO"]`
- ✅ Both patterns stored in correct order

---

## Scenario 3: Create Group with No Regular Meetings (Anonymous User)

### Steps
1. Navigate to `/neue-gruppe`
2. Fill out basic group info
3. In recurring meeting section:
   - **Check** "Kein regelmäßiges Treffen"
   - Verify pattern fields and time field are hidden
4. Submit form

### Expected Results
- ✅ Form submits successfully
- ✅ Database: `recurringPatterns` = "[]" or null
- ✅ Database: `meetingTime` = null
- ✅ No meeting info displayed on group pages

---

## Scenario 4: Edit Group Patterns (Admin)

### Steps
1. Login to admin panel `/admin`
2. Navigate to Groups management
3. Select existing group (created in Scenario 1)
4. Click Edit
5. In recurring meeting section:
   - Remove existing pattern (click "Entfernen")
   - Add new pattern: "Wöchentlich am Mittwoch"
   - Select "Mittwoch" from weekday
   - Change time to "18:30"
6. Save changes

### Expected Results
- ✅ Update successful
- ✅ Database: `recurringPatterns` = `["FREQ=WEEKLY;BYDAY=WE"]`
- ✅ Database: `meetingTime` = "18:30"
- ✅ Public pages reflect new pattern immediately

---

## Scenario 5: Change Group to No Regular Meetings (Admin)

### Steps
1. Login to admin panel
2. Edit group with active patterns
3. Check "Kein regelmäßiges Treffen"
4. Verify all pattern fields hidden
5. Save changes

### Expected Results
- ✅ Update successful
- ✅ Database: `recurringPatterns` = "[]" or null
- ✅ Database: `meetingTime` = null
- ✅ Group pages show no meeting info

---

## Scenario 6: Display Patterns on Group Overview Page

### Steps
1. Navigate to `/gruppen` (public group overview)
2. Locate Group A (single pattern: every 1st Monday at 19:00)
3. Locate Group B (multiple patterns: 1st + 3rd Monday at 19:00)
4. Locate Group C (no regular meetings)

### Expected Results
- ✅ Group A displays: "Jeden 1. Montag im Monat um 19:00 Uhr"
- ✅ Group B displays: "Jeden 1. und 3. Montag im Monat um 19:00 Uhr"
- ✅ Group C displays: No meeting info (or "Keine regelmäßigen Treffen")
- ✅ Location info displayed for Groups A & B
- ✅ Text is in German, properly formatted

---

## Scenario 7: Display Patterns on Group Detail Page

### Steps
1. Navigate to `/gruppen/[slug]` for Group A
2. Verify meeting information section

### Expected Results
- ✅ Pattern displayed in German: "Jeden 1. Montag im Monat"
- ✅ Time displayed: "19:00 Uhr"
- ✅ Location details displayed (street, city, postal code)
- ✅ No raw rrule strings visible to users

---

## Scenario 8: Demo Page - Upcoming Meetings (Next 7 Days)

### Steps
1. Navigate to `/gruppen/upcoming` (or demo page path)
2. Verify list of upcoming meetings

### Expected Results
- ✅ Meetings sorted chronologically (earliest first)
- ✅ Each row shows:
  - Group name
  - Date (German format: "Montag, 15. Januar 2025")
  - Time ("19:00 Uhr")
  - Location (street, city)
- ✅ Only meetings within next 7 days shown
- ✅ Meetings from all active groups included
- ✅ Groups with no patterns excluded
- ✅ Multiple patterns per group result in multiple entries

### Test with Current Date
**Example**: If today is January 10, 2025 (Friday):
- Group A (every 1st Monday): Next occurrence = January 6 (past) or February 3 (future)
- Group B (1st + 3rd Monday): January 6 (past), January 20 (future)
- Verify only January 20 appears if within 7 days

---

## Scenario 9: Edge Case - 5th Monday in 4-Monday Month

### Steps
1. Create group with pattern: "Jeden 5. Montag im Monat" (not in supported list, but test if added)
2. OR: Manually set `recurringPatterns` to `["FREQ=MONTHLY;BYDAY=5MO"]` via database
3. Navigate to demo page during month with only 4 Mondays (e.g., February 2025)

### Expected Results
- ✅ No error displayed
- ✅ No meeting shown for this group in February
- ✅ Meeting shows in months with 5 Mondays (e.g., March 2025)
- ✅ Silent skip behavior (no placeholder or error message)

---

## Scenario 10: Pattern Validation Errors

### Test Cases
1. **Submit patterns without time**:
   - Select pattern, leave time empty
   - Expected: "Uhrzeit ist erforderlich, wenn Muster ausgewählt sind"

2. **Submit time without patterns**:
   - Check "Kein regelmäßiges Treffen" unchecked
   - Enter time, don't add pattern
   - Expected: "Wählen Sie mindestens ein Muster oder 'Kein regelmäßiges Treffen'"

3. **Submit invalid time format**:
   - Enter "25:99" or "abc"
   - Expected: "Ungültiges Zeitformat. Verwenden Sie HH:mm (z.B. 19:00)"

4. **Submit both patterns and "Kein regelmäßiges Treffen"**:
   - Add pattern, then check "Kein regelmäßiges Treffen"
   - (Should be prevented by UI, but test if not)
   - Expected: Error message

---

## Scenario 11: All Pattern Types

Test each pattern type individually:

### 11a. Jeden 1. Montag im Monat
- Pattern: `FREQ=MONTHLY;BYDAY=1MO`
- Expected dates (January 2025): January 6

### 11b. Jeden 3. Dienstag im Monat
- Pattern: `FREQ=MONTHLY;BYDAY=3TU`
- Expected dates (January 2025): January 21

### 11c. Jeden letzten Freitag im Monat
- Pattern: `FREQ=MONTHLY;BYDAY=-1FR`
- Expected dates (January 2025): January 31

### 11d. Wöchentlich am Mittwoch
- Pattern: `FREQ=WEEKLY;BYDAY=WE`
- Expected dates (next 7 days): Every Wednesday in range

### 11e. Alle zwei Wochen am Donnerstag
- Pattern: `FREQ=WEEKLY;INTERVAL=2;BYDAY=TH`
- Expected dates: Every other Thursday starting from a reference date

**Validation**: Use a calendar to verify calculated dates match expected dates.

---

## Scenario 12: Incomplete Location Fields

### Steps
1. Create group with patterns but only fill:
   - City: "Frankfurt"
   - Leave street, postal code, location details empty
2. View on demo page

### Expected Results
- ✅ No errors displayed
- ✅ Only city shown: "Frankfurt"
- ✅ No "undefined" or null text

---

## Scenario 13: Type Safety Verification

### Code Review Checks
1. Open `lib/groups/recurring-patterns.ts`
   - ✅ No `any` types used
   - ✅ All functions have return type annotations

2. Open `components/forms/RecurringMeetingPatternSelector.tsx`
   - ✅ Props interface defined with all types
   - ✅ No implicit any

3. Check `src/types/` directory
   - ✅ RecurringMeetingData types defined centrally
   - ✅ No duplicate type definitions in multiple files

---

## Scenario 14: Console and Logs

### Steps
1. Execute Scenario 8 (demo page)
2. Check browser console
3. Check server logs (terminal running `npm run dev`)

### Expected Results
- ✅ No errors in browser console
- ✅ No unhandled promise rejections
- ✅ Server logs show structured logging (if calculations logged)
- ✅ No `console.log` statements in production code

---

## Scenario 15: Run Code Quality Checks

### Commands
```bash
# Run all checks
npm run check

# Individual checks
npm run lint
npm run typecheck
```

### Expected Results
- ✅ No linting errors
- ✅ No TypeScript errors
- ✅ All files under 500 lines (verify with `wc -l`)
- ✅ All imports use `@/` alias (no `../` in src/lib)

---

## Verification Checklist

### Functional Requirements
- [ ] FR-001: Anonymous users can define patterns (Scenario 1)
- [ ] FR-002: All pattern types supported (Scenario 11)
- [ ] FR-002a: Multiple patterns per group (Scenario 2)
- [ ] FR-003: All weekdays selectable (Scenario 11)
- [ ] FR-004: "Kein regelmäßiges Treffen" works (Scenario 3)
- [ ] FR-005: Time required and separate (Scenario 10)
- [ ] FR-006: Location fields maintained (Scenario 12)
- [ ] FR-007: Patterns stored with proposal (Scenario 1)
- [ ] FR-008: German display text (Scenario 6, 7)
- [ ] FR-009: Date calculation works (Scenario 8)
- [ ] FR-009a: Invalid dates skipped (Scenario 9)
- [ ] FR-010: Group overview displays patterns (Scenario 6)
- [ ] FR-011: Group detail displays patterns (Scenario 7)
- [ ] FR-012: Demo page lists meetings (Scenario 8)
- [ ] FR-013: Demo page sorted chronologically (Scenario 8)
- [ ] FR-014: Demo page shows all required fields (Scenario 8)
- [ ] FR-015: Component is reusable (Code Review)
- [ ] FR-016: Public form integrated (Scenario 1)
- [ ] FR-017: Admin form integrated (Scenario 4)
- [ ] FR-018: Mutual exclusivity validated (Scenario 10)

### Constitution Compliance
- [ ] Type Safety: No `any` types (Scenario 13)
- [ ] No Tests: No test files created (Verify with `find . -name "*.test.*"`)
- [ ] KISS: Simple rrule integration, no over-engineering (Code Review)
- [ ] DRY: Reused existing components/types (Code Review)
- [ ] Path Aliases: All `@/` imports (Code Review)
- [ ] German Text: All user-facing text in German (Scenario 6, 7, 8, 10)
- [ ] Logging: `logger` used for server-side (Code Review)
- [ ] Validation: Zod schemas server-side (Code Review)
- [ ] File Size: All files <500 lines (Scenario 15)
- [ ] Documentation: JSDoc on functions (Code Review)
- [ ] Domain Architecture: Files organized by domain (Code Review)
- [ ] Centralized Types: Types in `src/types/` (Scenario 13)

### Code Quality
- [ ] Lint passes (Scenario 15)
- [ ] Typecheck passes (Scenario 15)
- [ ] No console.log in code (Scenario 14)
- [ ] No errors in browser console (Scenario 14)
- [ ] Structured logging used (Scenario 14)

---

## Rollback Plan

If critical issues found:
1. Revert Prisma schema changes: `git checkout prisma/schema.prisma`
2. Revert API route changes: `git checkout src/app/api/groups/`
3. Run `npm run db:push` to restore old schema
4. Remove new component files
5. Restart development server

---

## Success Criteria

**Feature is COMPLETE when**:
- All 15 scenarios pass
- All functional requirements verified (checkboxes checked)
- All constitution compliance verified (checkboxes checked)
- `npm run check` passes with no errors
- No critical bugs discovered

**Feature is INCOMPLETE if**:
- Any scenario fails with unexpected behavior
- TypeScript errors present
- User-facing text in English
- Files exceed 500 lines
- `any` types found in code
