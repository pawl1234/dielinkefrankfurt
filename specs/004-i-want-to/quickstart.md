# Quickstart Guide: Public Groups Overview Page with Contact Modal

**Feature**: Public Groups Overview Page with Contact Modal
**Date**: 2025-10-09
**Purpose**: Manual validation scenarios for testing the feature

---

## Prerequisites

Before testing, ensure:
- [ ] Database has been updated with new Group model fields (run `npm run db:push`)
- [ ] At least 2-3 active groups exist with varying configurations:
  - One with logo and complete meeting information
  - One without logo and no meeting information
  - One with logo but without meeting information
- [ ] Newsletter settings configured with office contact email
- [ ] SMTP/email settings configured for testing (use maildev for local testing)
- [ ] Development server running (`npm run dev`)

---

## Test Scenarios

### Scenario 1: View Groups Overview Page

**Goal**: Verify that the groups overview page displays correctly with accordions

**Steps**:
1. Navigate to `http://localhost:3000/gruppen-uebersicht`
2. Observe page header with title "Arbeitsgruppen Übersicht" (or similar German text)
3. Verify breadcrumbs show: Start > Arbeitsgruppen Übersicht
4. Count visible accordions - should match number of ACTIVE groups in database

**Expected Results**:
- [ ] Page loads without errors
- [ ] Page uses MainLayout with HomePageHeader styling (matches home page)
- [ ] All ACTIVE groups displayed as accordion items
- [ ] Groups sorted alphabetically by name (A-Z)
- [ ] Each accordion shows group name in summary
- [ ] No NEW or ARCHIVED groups visible
- [ ] Empty state shown if no ACTIVE groups exist

**Validation**:
```sql
-- Database query to verify
SELECT name, status FROM "group" WHERE status = 'ACTIVE' ORDER BY name ASC;
```

---

### Scenario 2: Expand Accordion - Group with Complete Info

**Goal**: Verify accordion expansion shows all group details correctly

**Steps**:
1. On `/gruppen-uebersicht`, click on an accordion for a group with logo and meeting info
2. Observe expanded content

**Expected Results**:
- [ ] Accordion expands smoothly with animation
- [ ] Group logo displayed (not placeholder icon)
- [ ] Full description visible (HTML rendered correctly)
- [ ] Regular meeting section visible with meeting text
- [ ] Meeting location displayed with street, city, postal code
- [ ] Location details shown if provided
- [ ] Two buttons visible: "Details anzeigen" and "Kontakt"

---

### Scenario 3: Expand Accordion - Group Without Meeting Info

**Goal**: Verify graceful handling of missing optional data

**Steps**:
1. On `/gruppen-uebersicht`, click on an accordion for a group without meeting information
2. Observe expanded content

**Expected Results**:
- [ ] Accordion expands normally
- [ ] Group logo shown OR placeholder GroupIcon displayed
- [ ] Description visible
- [ ] NO regular meeting section displayed (hidden when null)
- [ ] Two buttons still visible: "Details anzeigen" and "Kontakt"

---

### Scenario 4: Expand Accordion - Group with Meeting but No Location

**Goal**: Verify partial meeting information display

**Steps**:
1. Create or find group with `regularMeeting` text but null location fields
2. Expand accordion for this group

**Expected Results**:
- [ ] Regular meeting text displayed
- [ ] NO location information shown (address section hidden)
- [ ] Layout remains clean without empty location section

---

### Scenario 5: Navigate to Group Details Page

**Goal**: Verify "Details anzeigen" button navigation works

**Steps**:
1. Expand any accordion on `/gruppen-uebersicht`
2. Click "Details anzeigen" button
3. Observe navigation

**Expected Results**:
- [ ] Browser navigates to `/gruppen/[slug]` page
- [ ] Existing group detail page loads correctly
- [ ] Status reports visible (if any exist for the group)
- [ ] Back button returns to overview page

---

### Scenario 6: Open Contact Modal

**Goal**: Verify contact modal opens and displays correctly

**Steps**:
1. Expand any accordion on `/gruppen-uebersicht`
2. Click "Kontakt" button
3. Observe modal

**Expected Results**:
- [ ] Modal dialog opens with backdrop
- [ ] Modal title shows "Kontakt: [Group Name]" (or similar)
- [ ] Three form fields visible:
  - Name (text input)
  - E-Mail-Adresse (text input)
  - Nachricht (multiline text area)
- [ ] Two buttons: "Senden" and "Abbrechen"
- [ ] All labels in German
- [ ] Modal can be closed by clicking "Abbrechen" or backdrop

---

### Scenario 7: Submit Contact Form - Valid Data

**Goal**: Verify successful contact form submission

**Prerequisites**:
- [ ] Maildev running on port 1080 (or SMTP configured)
- [ ] Group has at least one responsible person
- [ ] Office email configured in newsletter settings

**Steps**:
1. Open contact modal for a group
2. Fill in form:
   - Name: "Test User"
   - E-Mail: "test@example.com"
   - Nachricht: "Dies ist eine Testnachricht mit mindestens zehn Zeichen."
3. Click "Senden"
4. Wait for response

**Expected Results**:
- [ ] Success message displayed in German (e.g., "Nachricht erfolgreich gesendet")
- [ ] Modal remains open for ~2 seconds showing success message
- [ ] Modal automatically closes after delay
- [ ] Email sent to responsible persons (check maildev at `http://localhost:1080`)
- [ ] Email includes:
  - Subject: "Kontaktanfrage für Gruppe: [Group Name]"
  - To: Responsible person emails
  - CC: Office email
  - Reply-To: test@example.com
  - Body contains: requester name, email, message, group name

---

### Scenario 8: Submit Contact Form - Validation Errors

**Goal**: Verify client-side and server-side validation

**Test Cases**:

**8a. Empty Name**
- Steps: Leave name field empty, fill email and message, submit
- Expected: Error message "Name muss mindestens 2 Zeichen lang sein"

**8b. Invalid Email**
- Steps: Enter "invalid-email" in email field, fill other fields, submit
- Expected: Error message "Bitte geben Sie eine gültige E-Mail-Adresse ein"

**8c. Short Message**
- Steps: Enter "Test" (less than 10 chars) in message, fill other fields, submit
- Expected: Error message "Nachricht muss mindestens 10 Zeichen lang sein"

**8d. Name Too Long**
- Steps: Enter 101-character name, fill other fields, submit
- Expected: Error message "Name darf maximal 100 Zeichen lang sein"

**Expected Results for All**:
- [ ] Validation error shown in German
- [ ] Form does not submit
- [ ] Modal remains open
- [ ] User can correct and resubmit

---

### Scenario 9: Submit Contact Form - Email Sending Failure

**Goal**: Verify error handling when email fails to send

**Setup**:
1. Stop maildev or misconfigure SMTP temporarily
2. Open contact modal and fill valid data

**Steps**:
1. Submit contact form with valid data
2. Observe response

**Expected Results**:
- [ ] Error message displayed: "Fehler beim Senden der Nachricht. Bitte versuchen Sie es erneut."
- [ ] Error message in German
- [ ] Modal closes after showing error
- [ ] Error logged in server console with structured logging
- [ ] No retry mechanism offered (user must resubmit manually)

---

### Scenario 10: Contact Form - Group Without Responsible Persons

**Goal**: Verify edge case handling

**Setup**:
1. Create or modify a group to have zero responsible persons (edge case)

**Steps**:
1. Open contact modal for this group
2. Fill and submit form

**Expected Results**:
- [ ] Email sent successfully
- [ ] Email To field empty (no responsible persons)
- [ ] Email CC field contains office email only
- [ ] Success message shown
- [ ] No error occurs

---

### Scenario 11: Public Group Proposal Form - Meeting Fields

**Goal**: Verify meeting fields added to public proposal form

**Steps**:
1. Navigate to `/neue-gruppe`
2. Scroll to find meeting fields

**Expected Results**:
- [ ] "Regelmäßiges Treffen (optional)" text field visible
- [ ] Placeholder text shows example: "z.B. Jeden 3. Dienstag im Monat, 19:00 Uhr"
- [ ] Location fields (street, city, postal code, details) visible
- [ ] Location fields marked as optional
- [ ] Fields use AddressSection component styling
- [ ] Form submits successfully with meeting data filled
- [ ] Form submits successfully with meeting fields empty

---

### Scenario 12: Admin Group Edit Form - Meeting Fields

**Goal**: Verify meeting fields added to admin edit form

**Prerequisites**:
- [ ] Logged in as admin

**Steps**:
1. Navigate to `/admin/groups`
2. Click edit on any group
3. Scroll to find meeting fields

**Expected Results**:
- [ ] Meeting fields visible in edit form
- [ ] Existing meeting data pre-populated if available
- [ ] Fields can be added to group without meeting info
- [ ] Fields can be removed by clearing values
- [ ] Form validation works (postal code format, max lengths)
- [ ] Update saves successfully to database

**Validation**:
```sql
-- Verify saved data
SELECT
  name,
  "regularMeeting",
  "meetingStreet",
  "meetingCity",
  "meetingPostalCode"
FROM "group"
WHERE slug = '[edited-group-slug]';
```

---

### Scenario 13: Office Email Configuration

**Goal**: Verify office email can be configured in newsletter settings

**Prerequisites**:
- [ ] Logged in as admin

**Steps**:
1. Navigate to `/admin/newsletter/settings`
2. Find "Office-E-Mail (CC für Gruppenanfragen)" field
3. Enter test email: "office@example.com"
4. Save settings
5. Submit contact form for any group
6. Check received email

**Expected Results**:
- [ ] Office email field visible in settings form
- [ ] Field accepts valid email format
- [ ] Settings save successfully
- [ ] Contact request email includes office email in CC field

---

### Scenario 14: Multiple Groups - Alphabetical Sorting

**Goal**: Verify groups are consistently sorted

**Setup**:
- Ensure database has groups with names starting with different letters:
  - "Bildung", "Klimaschutz", "Soziales", "Antifa", "Wohnungspolitik"

**Steps**:
1. Load `/gruppen-uebersicht`
2. Note order of accordions

**Expected Results**:
- [ ] Groups sorted: Antifa, Bildung, Klimaschutz, Soziales, Wohnungspolitik
- [ ] German umlauts sorted correctly (Ä after A, Ö after O, Ü after U)
- [ ] Sorting case-insensitive

---

### Scenario 15: Responsive Design

**Goal**: Verify page works on mobile and tablet

**Steps**:
1. Open `/gruppen-uebersicht` in browser
2. Open DevTools and switch to mobile view (iPhone, iPad)
3. Test accordion expansion, modal opening, form submission

**Expected Results**:
- [ ] Page layout responsive on mobile (320px width)
- [ ] Accordions stack vertically
- [ ] Text readable without horizontal scroll
- [ ] Modal fills screen appropriately on mobile
- [ ] Form fields usable with touch input
- [ ] Buttons large enough for touch targets

---

## Post-Implementation Validation

After completing all scenarios, run:

### Code Quality Checks
```bash
npm run check
```

**Expected**:
- [ ] No TypeScript errors
- [ ] No ESLint errors
- [ ] All files under 500 lines

### Database Integrity Check
```bash
npm run db:validate
```

**Expected**:
- [ ] Prisma schema valid
- [ ] No migration conflicts

### Visual Inspection
- [ ] No console errors in browser DevTools
- [ ] No React warnings in console
- [ ] German text throughout (no English)
- [ ] Consistent styling with rest of application

---

## Rollback Procedure

If critical issues found:

1. Revert Prisma schema changes:
```bash
git checkout HEAD -- prisma/schema.prisma
npm run db:push
```

2. Remove new page route:
```bash
rm -rf src/app/gruppen-uebersicht
```

3. Revert any modified files (forms, API routes)

---

## Success Criteria

Feature considered complete when:
- [ ] All 15 test scenarios pass
- [ ] `npm run check` passes with no errors
- [ ] Contact emails received correctly
- [ ] No console errors or warnings
- [ ] German text validated by native speaker
- [ ] Responsive design works on mobile and desktop
- [ ] Newsletter settings include office email field
- [ ] Meeting information displays correctly across all cases
