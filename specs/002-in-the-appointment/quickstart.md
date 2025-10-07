# Quickstart: Manual Validation Guide

**Feature**: 002-in-the-appointment - Bundesland to Location Details Refactor
**Date**: 2025-10-07
**Validation Type**: Manual Testing (per constitution)

## Pre-Implementation Checklist

Before starting implementation, verify:

- [ ] Feature specification reviewed (`spec.md`)
- [ ] Research findings understood (`research.md`)
- [ ] Data model changes clear (`data-model.md`)
- [ ] API contracts reviewed (`contracts/api-changes.md`)
- [ ] Development environment running (database + local server)

## Implementation Order

Follow this sequence to minimize errors:

### Step 1: Database Schema
1. Update `prisma/schema.prisma`
2. Run `npm run db:push` to apply changes
3. Verify schema update with `npm run db:studio`

### Step 2: Validation Layer
1. Update `src/lib/validation/appointment.ts`
2. Update `src/lib/validation/admin-schemas.ts`
3. Update `src/lib/validation/validation-messages.ts`
4. Run `npm run typecheck` to verify types

### Step 3: Form Components
1. Update `src/components/forms/appointments/fields/AddressSection.tsx`
2. Verify TypeScript compilation with `npm run typecheck`

### Step 4: Validation
1. Run `npm run check` (lint + typecheck)
2. Fix any reported errors
3. Verify no `any` types introduced

## Manual Validation Workflow

### Environment Setup

**Prerequisites**:
```bash
# Start PostgreSQL database
npm run db:start

# Start development server
npm run dev

# Open browser to http://localhost:3000
```

**Admin Access**:
- Login at `/admin` (use credentials from env)
- Prepare test account if needed

---

## Test Scenario 1: Public Form Submission with Location Details

**Objective**: Verify users can submit appointments with the new "Zusatzinformationen" field

**Steps**:
1. Navigate to `/termine` (appointment form)
2. Fill required fields:
   - Titel: "Test Termin - Location Details"
   - Beschreibung: "Test für Zusatzinformationen Feld"
   - Startdatum: [future date]
3. Scroll to **Veranstaltungsort** section
4. **Verify**: Field label shows "Zusatzinformationen" (not "Bundesland")
5. Enter: "Saalbau Raum 3"
6. Click submit

**Expected Results**:
- ✓ Form submits successfully
- ✓ Success message displayed
- ✓ No console errors
- ✓ Field appears with label "Zusatzinformationen"

**Validation**:
- Check database: `npm run db:studio`
- Open `appointment` table
- Find created record
- Verify `location_details` column = "Saalbau Raum 3"

---

## Test Scenario 2: Optional Field (Submit Without Location Details)

**Objective**: Verify field remains optional

**Steps**:
1. Navigate to `/termine`
2. Fill required fields only (title, description, date)
3. Leave **Zusatzinformationen** field empty
4. Submit form

**Expected Results**:
- ✓ Form submits successfully
- ✓ No validation error for empty field
- ✓ Appointment created

**Validation**:
- Check database
- Verify `location_details` = NULL

---

## Test Scenario 3: Character Limit Enforcement

**Objective**: Verify 100 character limit is enforced

**Steps**:
1. Navigate to `/termine`
2. Fill required fields
3. In **Zusatzinformationen** field, enter 101 characters:
   ```
   Dies ist ein sehr langer Text mit exakt einhundertundeins Zeichen um die Validierung zu testen ABC
   ```
4. Submit form

**Expected Results**:
- ✓ Validation error displayed
- ✓ Error message in German: "Zusatzinformationen darf maximal 100 Zeichen lang sein"
- ✓ Form does not submit

**Fix**:
- Reduce to 100 characters or less
- Verify submission succeeds

---

## Test Scenario 4: Help Text Verification

**Objective**: Verify help text displays correct German guidance

**Steps**:
1. Navigate to `/termine`
2. Locate **Veranstaltungsort (optional)** section
3. Click help icon or expand help text

**Expected Results**:
- ✓ Help text includes: "Geben Sie zusätzliche Ortsangaben an, z.B. Raumnummer oder Gebäudename"
- ✓ No reference to "Bundesland"
- ✓ Examples mention room numbers and building names

---

## Test Scenario 5: Admin Dashboard Display

**Objective**: Verify admin can view and edit location details

**Steps**:
1. Login to `/admin`
2. Navigate to "Termine" (Appointments)
3. Find test appointment from Scenario 1
4. Click to view/edit

**Expected Results**:
- ✓ Field labeled as "Zusatzinformationen" (not "Bundesland")
- ✓ Value "Saalbau Raum 3" displayed correctly
- ✓ Field is editable

**Edit Test**:
1. Change value to "Römer, Saal 1"
2. Save changes
3. Verify update in database

---

## Test Scenario 6: Admin Update via API

**Objective**: Verify admin can update location details through API

**Prerequisites**: Get appointment ID from previous test

**Steps** (using browser console or API client):
```bash
# Replace [id] with actual appointment ID
curl -X PATCH http://localhost:3000/api/admin/appointments/[id] \
  -H "Content-Type: application/json" \
  -d '{"locationDetails": "Büro EG"}'
```

**Expected Results**:
- ✓ Response: `{ success: true, data: { ... } }`
- ✓ Database updated with new value

---

## Test Scenario 7: Data Migration Verification

**Objective**: Verify existing appointments have NULL location details after migration

**Steps**:
1. Open database studio: `npm run db:studio`
2. Navigate to `appointment` table
3. Check appointments created before this refactor

**Expected Results**:
- ✓ Column `location_details` exists
- ✓ All old records have `location_details` = NULL
- ✓ Column `state` does not exist

---

## Test Scenario 8: TypeScript Type Safety

**Objective**: Verify TypeScript catches incorrect field usage

**Steps**:
1. In any file, try to access `appointment.state`
2. Run `npm run typecheck`

**Expected Results**:
- ✓ TypeScript error: Property 'state' does not exist
- ✓ Suggests using 'locationDetails' instead

**Fix**:
- Use `appointment.locationDetails` instead

---

## Test Scenario 9: Form Validation Edge Cases

**Objective**: Test edge cases and special characters

**Test Cases**:

| Input | Expected Behavior |
|-------|-------------------|
| Empty string `""` | Accepted (optional field) |
| Single character `"A"` | Accepted |
| Exactly 100 chars | Accepted |
| 101 chars | Rejected with error |
| Special chars `"Raum #3 (EG)"` | Accepted |
| Unicode `"Römer-Saal Größe M"` | Accepted |
| HTML `"<script>alert()</script>"` | Sanitized (existing XSS protection) |

**Execute Each Test**:
1. Navigate to `/termine`
2. Enter test value in Zusatzinformationen
3. Submit and verify behavior

---

## Test Scenario 10: Newsletter Display (If Applicable)

**Objective**: Verify location details appear correctly in newsletters

**Prerequisites**: Create newsletter with test appointment

**Steps**:
1. Navigate to `/admin/newsletter/edit`
2. Include test appointment with location details
3. Generate preview
4. Check email template display

**Expected Results**:
- ✓ Location details displayed alongside address
- ✓ Formatting is correct
- ✓ No "Bundesland" references

---

## Validation Completion Checklist

After running all scenarios, verify:

### Code Quality
- [ ] `npm run check` passes (no lint or type errors)
- [ ] No `console.log` statements in production code
- [ ] No `any` types introduced
- [ ] All German user-facing text correct

### Functional Requirements
- [ ] FR-001: Field renamed throughout system ✓
- [ ] FR-002: Field labeled "Zusatzinformationen" ✓
- [ ] FR-003: Accepts room/building names ✓
- [ ] FR-004: Field is optional ✓
- [ ] FR-005: Admin dashboard shows correct label ✓
- [ ] FR-006: 100 character limit enforced ✓
- [ ] FR-007: Error messages use German term ✓
- [ ] FR-008: Help text displays correctly ✓
- [ ] FR-009: Existing values cleared ✓

### Database
- [ ] Schema updated correctly
- [ ] Column renamed: `state` → `location_details`
- [ ] Migration applied without errors
- [ ] All existing records have NULL locationDetails

### User Interface
- [ ] Public form displays new field label
- [ ] Help text updated
- [ ] Admin dashboard updated
- [ ] No visual regressions

### API
- [ ] Submit endpoint accepts locationDetails
- [ ] Update endpoint accepts locationDetails
- [ ] Response includes locationDetails
- [ ] Validation errors in German

---

## Common Issues and Troubleshooting

### Issue: TypeScript errors persist after schema update

**Solution**:
```bash
# Regenerate Prisma client
npm run db:generate

# Restart TypeScript server in IDE
# VS Code: Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server"
```

### Issue: Old field name still appears in form

**Solution**:
- Clear browser cache
- Hard refresh (Ctrl+Shift+R)
- Check AddressSection.tsx for correct field name

### Issue: Validation messages in English

**Solution**:
- Verify `validation-messages.ts` has German label
- Check Zod schema uses correct field name
- Clear Next.js cache: `rm -rf .next`

### Issue: Database migration fails

**Solution**:
```bash
# Check current schema
npm run db:studio

# Force schema sync (dev only)
npm run db:push --force-reset
```

---

## Post-Validation Steps

After all tests pass:

1. **Commit Changes**:
   ```bash
   git add .
   git commit -m "Refactor Bundesland to locationDetails field"
   ```

2. **Document Any Deviations**:
   - Note any changes from spec
   - Update spec if requirements changed during implementation

3. **Mark Tasks Complete**:
   - Update `tasks.md` with completion status
   - Note any follow-up items

4. **Prepare for Review**:
   - Ensure all validation scenarios documented
   - Capture screenshots if needed
   - Prepare demo for stakeholder

---

## Validation Sign-Off

**Tested By**: _________________

**Date**: _________________

**All Scenarios Passed**: [ ] Yes [ ] No

**Notes**:
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

**Ready for Production**: [ ] Yes [ ] No

---

**Quickstart Guide Complete**: All manual validation scenarios defined with expected results and troubleshooting guidance.
