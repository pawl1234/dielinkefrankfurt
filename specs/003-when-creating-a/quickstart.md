# Quickstart: Address Management Manual Validation

**Feature**: Address Management for Appointments
**Branch**: `003-when-creating-a`
**Purpose**: Manual validation workflow for testing the implemented feature
**Estimated Time**: 30-45 minutes

## Prerequisites

- [ ] Feature fully implemented and committed
- [ ] Development server running (`npm run dev`)
- [ ] Database migrated with new Address table (`npm run db:push`)
- [ ] Admin credentials available
- [ ] Browser with developer tools open

## Validation Workflow

### Phase 1: Address Management (Admin) - 15 minutes

#### 1.1 Navigate to Address Management
1. Log in to admin dashboard: `http://localhost:3000/admin/login`
2. Navigate to: `http://localhost:3000/admin/appointments`
3. **Verify**: SearchFilterBar appears at top of page
4. **Verify**: "Adressen" button visible in SearchFilterBar
5. Click "Adressen" button
6. **Verify**: Redirected to `/admin/appointments/addresses`
7. **Verify**: Page header shows "Adressen verwalten" with icon
8. **Verify**: Empty state message if no addresses exist

#### 1.2 Create Addresses
1. Click "Neue Adresse" button
2. Fill form with first address:
   - Name: `Partei-Büro`
   - Straße: `Musterstraße 123`
   - Stadt: `Frankfurt`
   - PLZ: `60311`
   - Ortsdetails: `2. Stock, Raum 5`
3. Click "Speichern"
4. **Verify**: Success message appears
5. **Verify**: Address appears in table
6. Repeat with second address:
   - Name: `Gewerkschaftshaus`
   - Straße: `Gewerkschaftsplatz 1`
   - Stadt: `Frankfurt`
   - PLZ: `60313`
   - Ortsdetails: (leave empty)
7. **Verify**: Both addresses now in table

#### 1.3 Test Validation
1. Click "Neue Adresse" button
2. Try to create address with duplicate name `Partei-Büro`
3. **Verify**: Error message "Adresse mit diesem Namen existiert bereits"
4. Change name to `Test-Adresse`
5. Enter invalid postal code: `1234` (only 4 digits)
6. **Verify**: Error message "Postleitzahl muss genau 5 Ziffern sein"
7. Enter postal code with letters: `12AB5`
8. **Verify**: Same error message
9. Leave "Stadt" field empty
10. **Verify**: Error message "Stadt ist erforderlich"
11. Fill all fields correctly and save
12. **Verify**: Address created successfully

#### 1.4 Edit Address
1. Click edit button on "Test-Adresse"
2. Change street to: `Neue Straße 456`
3. Change location details to: `Erdgeschoss`
4. Click "Speichern"
5. **Verify**: Success message
6. **Verify**: Updated values shown in table

#### 1.5 Delete Address
1. Click delete button on "Test-Adresse"
2. **Verify**: Confirmation dialog appears
3. Click "Abbrechen"
4. **Verify**: Address still exists
5. Click delete button again
6. Click "Löschen" in confirmation dialog
7. **Verify**: Success message
8. **Verify**: Address removed from table
9. **Verify**: Only "Partei-Büro" and "Gewerkschaftshaus" remain

**Phase 1 Checklist**:
- [ ] Address management page accessible via button
- [ ] Create address works with validation
- [ ] Duplicate name validation works
- [ ] Postal code validation works (German format)
- [ ] Edit address updates correctly
- [ ] Delete address with confirmation works
- [ ] Empty required field validation works

---

### Phase 2: Public Form Integration - 10 minutes

#### 2.1 Address Selection
1. Open public appointment form: `http://localhost:3000/termine`
2. Scroll to location section
3. **Verify**: Address dropdown appears above location fields
4. **Verify**: Dropdown contains "Partei-Büro" and "Gewerkschaftshaus"
5. **Verify**: Dropdown has placeholder text (e.g., "Adresse wählen...")

#### 2.2 Auto-Fill from Dropdown
1. Select "Partei-Büro" from dropdown
2. **Verify**: Street auto-fills to "Musterstraße 123"
3. **Verify**: City auto-fills to "Frankfurt"
4. **Verify**: Postal code auto-fills to "60311"
5. **Verify**: Location details auto-fills to "2. Stock, Raum 5"

#### 2.3 Manual Override
1. With "Partei-Büro" still selected, change street to: `Musterstraße 125`
2. **Verify**: Street field accepts manual edit
3. **Verify**: Other fields remain from selected address
4. Fill remaining appointment form fields (title, description, date, etc.)
5. Submit form
6. **Verify**: Success message
7. Navigate to admin appointments: `/admin/appointments`
8. Find newly created appointment
9. **Verify**: Street shows "Musterstraße 125" (user's override)
10. **Verify**: Other location fields show "Partei-Büro" values

#### 2.4 Manual Entry (No Selection)
1. Open `/termine` again
2. **Do NOT** select from address dropdown
3. Manually enter location:
   - Straße: `Manuelle Straße 789`
   - Stadt: `Offenbach`
   - PLZ: `63065`
   - Ortsdetails: `Test-Ort`
4. Fill remaining form fields and submit
5. **Verify**: Success message
6. Check in admin panel
7. **Verify**: Appointment shows manually entered address

**Phase 2 Checklist**:
- [ ] Address dropdown appears on public form
- [ ] Dropdown contains all active addresses
- [ ] Selection auto-fills location fields
- [ ] Manual override of auto-filled fields works
- [ ] Appointment saves user's final values
- [ ] Manual entry without dropdown selection works

---

### Phase 3: Data Preservation - 10 minutes

#### 3.1 Address Edit Impact
1. Create appointment using "Gewerkschaftshaus" address
2. Note the original street: "Gewerkschaftsplatz 1"
3. Go to admin address management: `/admin/appointments/addresses`
4. Edit "Gewerkschaftshaus"
5. Change street to: "Gewerkschaftsplatz 99"
6. Save changes
7. **Verify**: Address table shows updated street
8. Navigate back to appointments: `/admin/appointments`
9. Find previously created appointment (step 1)
10. **Verify**: Appointment still shows "Gewerkschaftsplatz 1" (original value)
11. Create NEW appointment using "Gewerkschaftshaus"
12. **Verify**: New appointment shows "Gewerkschaftsplatz 99" (updated value)

#### 3.2 Address Deletion Impact
1. Create appointment using "Partei-Büro" address
2. Note the complete address details
3. Go to admin address management
4. Delete "Partei-Büro" address
5. **Verify**: Address removed from admin table
6. Open public form `/termine`
7. **Verify**: "Partei-Büro" no longer in dropdown
8. Go to appointments admin
9. Find appointment from step 1
10. **Verify**: Appointment still shows complete "Partei-Büro" address
11. **Verify**: Address data is intact and readable

**Phase 3 Checklist**:
- [ ] Editing address does NOT change existing appointments
- [ ] New appointments use updated address values
- [ ] Deleting address removes it from dropdown
- [ ] Deleted address data preserved in existing appointments
- [ ] Historical appointment data remains viewable

---

### Phase 4: Search Functionality (Admin) - 10 minutes

#### 4.1 Basic Search
1. Navigate to `/admin/appointments`
2. **Verify**: SearchFilterBar with search input visible
3. Create test appointments with these titles:
   - "Demonstration für Klimaschutz"
   - "Demokratie-Workshop"
   - "Feierabend-Demo"
   - "Mitgliederversammlung"
4. Enter "demo" in search field
5. Click "Suchen" button
6. **Verify**: Only first 3 appointments visible (contain "demo")
7. **Verify**: "Mitgliederversammlung" NOT visible

#### 4.2 Case-Insensitive Search
1. Clear search (click X in search field)
2. Enter "DEMO" (uppercase)
3. **Verify**: Same 3 results as lowercase "demo"
4. Enter "Demo" (mixed case)
5. **Verify**: Same results

#### 4.3 Search in Event Details
1. Create appointment with:
   - Title: "Veranstaltung"
   - Event details (mainText): "Wir diskutieren über Demokratie"
2. Search for "demokratie"
3. **Verify**: "Veranstaltung" appears in results (matched in description)
4. **Verify**: "Demokratie-Workshop" also appears (matched in title)

#### 4.4 German Umlaut Handling
1. Create appointment with title: "Treffen im März"
2. Search for "märz"
3. **Verify**: Appointment found (case-insensitive includes umlauts)
4. Search for "MÄRZ"
5. **Verify**: Same appointment found

#### 4.5 Combined Filters
1. Filter by status: "pending"
2. Enter search term: "demo"
3. **Verify**: Only pending appointments containing "demo" shown
4. Change status to "accepted"
5. **Verify**: Results update (accepted + "demo")

#### 4.6 Edge Cases
1. Search for "xyz123notfound"
2. **Verify**: Empty state message displayed
3. Clear search
4. **Verify**: All appointments return
5. Enter very long search term (>100 characters)
6. **Verify**: No errors, graceful handling

**Phase 4 Checklist**:
- [ ] Search filters by title
- [ ] Search filters by event details (mainText)
- [ ] Case-insensitive search works
- [ ] German umlauts handled correctly
- [ ] Search combines with status filter
- [ ] Clear search returns all results
- [ ] Empty search results show proper message

---

### Phase 5: Code Quality Validation - 5 minutes

#### 5.1 Run Validation Commands
```bash
npm run check
```

**Expected**:
- [ ] No TypeScript errors
- [ ] No ESLint errors
- [ ] All files pass type checking

#### 5.2 File Size Check
```bash
wc -l src/app/admin/appointments/page.tsx
wc -l src/app/admin/appointments/addresses/page.tsx
wc -l src/app/api/admin/addresses/route.ts
wc -l src/lib/db/address-operations.ts
wc -l src/lib/validation/address-schema.ts
```

**Expected**:
- [ ] All files <500 lines
- [ ] If appointments page >500 lines, refactoring task created

#### 5.3 Browser Console Check
1. Open browser DevTools (F12)
2. Navigate through all admin and public pages
3. **Verify**: No console errors
4. **Verify**: No console warnings (except expected dev-mode warnings)

---

## Success Criteria

All checklist items must be checked (✓) for feature to be considered complete:

**Core Functionality**:
- [ ] Address CRUD operations work correctly
- [ ] Public form dropdown integration works
- [ ] Search functionality works as specified
- [ ] Data preservation behavior verified

**Quality Standards**:
- [ ] No TypeScript errors (`npm run check`)
- [ ] No console errors in browser
- [ ] All files under 500 lines (or refactoring planned)
- [ ] German user-facing text throughout

**Edge Cases**:
- [ ] Validation errors displayed correctly
- [ ] Empty states handled gracefully
- [ ] Confirmation dialogs work
- [ ] Manual override on public form works

---

## Troubleshooting

### Address dropdown not showing
- Check API endpoint: `curl http://localhost:3000/api/addresses/public`
- Verify database has addresses: `npm run db:studio`
- Check browser console for network errors

### Search not working
- Verify search parameter in API URL (Network tab)
- Check API logs for Prisma query errors
- Test direct API call: `curl http://localhost:3000/api/admin/appointments?search=demo`

### Validation errors not showing
- Check Zod schema in `src/lib/validation/address-schema.ts`
- Verify error messages in German
- Check API response in Network tab

### Data not preserving after deletion
- Verify appointment record in database directly
- Check that appointment fields (street, city, etc.) are populated
- Confirm no foreign key relationships in schema

---

## Completion Report Template

After validation, document results:

```
## Validation Results - [DATE]

**Tester**: [Name]
**Duration**: [X] minutes
**Environment**: Development (localhost:3000)

### Phase 1: Address Management
- Status: [✓ PASS / ✗ FAIL]
- Issues: [None / List issues]

### Phase 2: Public Form Integration
- Status: [✓ PASS / ✗ FAIL]
- Issues: [None / List issues]

### Phase 3: Data Preservation
- Status: [✓ PASS / ✗ FAIL]
- Issues: [None / List issues]

### Phase 4: Search Functionality
- Status: [✓ PASS / ✗ FAIL]
- Issues: [None / List issues]

### Phase 5: Code Quality
- Status: [✓ PASS / ✗ FAIL]
- Issues: [None / List issues]

### Overall Result: [✓ READY FOR MERGE / ✗ NEEDS FIXES]

### Recommended Next Steps:
- [Deploy to staging / Fix issues / ...]
```

---
**Quickstart Complete**: Ready for manual validation after implementation
