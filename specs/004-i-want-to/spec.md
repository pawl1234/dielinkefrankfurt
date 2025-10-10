# Feature Specification: Public Groups Overview Page with Contact Modal

**Feature Branch**: `004-i-want-to`
**Created**: 2025-10-09
**Status**: Draft
**Input**: User description: "I want to create a new public page to present the groups of this project in a different way. My idea is to follow the current styling of my application similar to @src/app/page.tsx with MainLayout and HomePageHeader. In the center of the page I want a accordion per group in this project. Sorted alphabetical. If you open the accordion of a group you can see the group logo if existent and the group description. Additionally I want to add to the group schema that a group can have an optional regular meeting. If a group has a regular meeting, then this should be defined in a free text field. Typical regular meetings are "Jeden 3. Dienstag im Montag" or "Jede zweite Woche Montag" so complex fields. If there is a regular meeting then also the location should be defined. The location definition can be similar to the address fields we are using here @src/components/forms/appointments/fields/AddressSection.tsx Then I also want to add two buttons to the accordion details page. One button is leading to the group details page, where each group has also their status reports @src/app/gruppen/[slug]/page.tsx. The other button should open a modal, where interested people can contact the group responsible persons. The modal should ask for name and email address of the requester and then should provide a text field for the ask to the group. When pressing send this information should be sent to the responsible persons entered for the group. Use an email template similar to the existing ones here @src/emails/notifications"

## Execution Flow (main)
```
1. Parse user description from Input
   → Feature description provided: Public groups overview page
2. Extract key concepts from description
   → Actors: Public visitors, group responsible persons
   → Actions: View groups, contact groups, navigate to group details
   → Data: Groups with logos, descriptions, regular meetings, meeting locations
   → Constraints: Alphabetical sorting, optional regular meetings
3. For each unclear aspect:
   → [Marked in requirements below]
4. Fill User Scenarios & Testing section
   → User flow clear: browse groups, expand accordion, contact/navigate
5. Generate Functional Requirements
   → All requirements testable via manual interaction
6. Identify Key Entities
   → Group (extended), Contact Request
7. Run Review Checklist
   → Spec contains some clarification needs
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

---

## Clarifications

### Session 2025-10-09
- Q: Should contact requests be stored in the database for record-keeping, or only sent via email without persistence? → A: No database storage for privacy reasons. Contact requests sent via email only: To field contains responsible persons' emails, CC field contains configurable office email address. Office email address configurable via settings dialog in group admin page (stored in GroupSettings singleton model with ID=1).
- Q: What should happen when a group has no responsible persons and a visitor tries to contact them? → A: Send email only to office CC address (no To recipients). Note: Responsible persons are expected to be mandatory field, so this edge case should be rare/impossible under normal operation.
- Q: Should the contact modal close automatically after successful submission, or stay open with success message? → A: Close automatically immediately after showing brief success message (approximately 2 seconds).
- Q: When a group has a regular meeting defined, should the meeting location be mandatory or optional? → A: Optional - regular meeting can exist without location (supports virtual meetings, TBD locations).
- Q: What should happen when email sending fails after a user submits the contact form? → A: Show user-friendly error message in modal, log failure for admin review, close modal (no retry option - user must resubmit if needed).
- Q: Where should regular meeting and location fields be editable? → A: Must be included in both the public group proposal form (neue-gruppe) AND the admin group edit form to allow adding this information to existing groups.

---

## User Scenarios & Testing *(mandatory)*

### Primary User Stories

**Public Visitor Story**
As a public visitor interested in Die Linke Frankfurt's working groups, I want to browse all available groups in an organized overview so that I can learn about their activities, find their regular meetings, and contact them if I'm interested in participating.

**Group Proposer Story**
As someone proposing a new group, I want to include our regular meeting schedule and location in the proposal form so that interested members know when and where we meet.

**Admin Story**
As an admin managing existing groups, I want to add or edit regular meeting information for groups so that I can keep meeting details up-to-date without creating a new group.

### Acceptance Scenarios

1. **Given** I visit the groups overview page, **When** the page loads, **Then** I see all active groups displayed as collapsible accordions sorted alphabetically by name

2. **Given** I see the groups overview, **When** I click on a group accordion, **Then** it expands to show the group's logo (if available), full description, regular meeting schedule (if defined), and meeting location (if defined)

3. **Given** an accordion is expanded, **When** I view the available actions, **Then** I see two buttons: one to view full group details with status reports, and one to contact the group

4. **Given** I click the "contact group" button, **When** the modal opens, **Then** I see fields for my name, email address, and a message text field for my inquiry

5. **Given** I fill out the contact form with valid information, **When** I click send, **Then** my message is sent to all responsible persons registered for that group and I receive confirmation

6. **Given** I click the "view details" button, **When** the navigation occurs, **Then** I am taken to the existing group detail page showing status reports

7. **Given** I am submitting a new group proposal, **When** I fill out the group proposal form, **Then** I can optionally enter regular meeting schedule and location information

8. **Given** I am an admin editing an existing group, **When** I access the group edit form, **Then** I can add, modify, or remove regular meeting schedule and location information

### Edge Cases
- What happens when a group has no logo? → Display placeholder icon
- What happens when a group has no regular meeting defined? → Do not show meeting information section
- What happens when a group has a regular meeting but no location? → Show meeting schedule without location details (supports virtual/TBD meetings)
- What happens when I submit contact form with invalid email? → Show validation error before sending
- What happens when email sending fails? → Show user-friendly error message, log failure for admin review, close modal without retry option
- What happens when a group has no responsible persons? → Send email only to office CC address (edge case, responsible persons expected to be mandatory)
- What happens when visiting page and no groups exist? → Show empty state message

## Requirements *(mandatory)*

### Functional Requirements

**Page Layout & Display**
- **FR-001**: System MUST display a public groups overview page with consistent styling matching the application's home page layout
- **FR-002**: System MUST display groups as expandable/collapsible accordion components
- **FR-003**: System MUST sort groups alphabetically by name
- **FR-004**: System MUST show only active groups in the overview [NEEDS CLARIFICATION: Confirm that only ACTIVE status groups should appear, not NEW or ARCHIVED]

**Group Information Display**
- **FR-005**: System MUST display group logo when available within the expanded accordion
- **FR-006**: System MUST display group description in the expanded accordion
- **FR-007**: System MUST display regular meeting schedule when defined for a group
- **FR-008**: System MUST display meeting location details when both regular meeting and location are defined
- **FR-009**: System MUST gracefully handle missing optional data (logo, regular meeting, meeting location) without breaking layout

**Group Data Model Extensions**
- **FR-010**: System MUST support storing optional regular meeting schedule as free-text field for each group
- **FR-011**: System MUST support storing meeting location data including street, city, postal code, and additional location details
- **FR-012**: System MUST allow meeting location fields to be optional

**Form Integration**
- **FR-013A**: Public group proposal form (neue-gruppe) MUST include optional fields for regular meeting schedule and location
- **FR-013B**: Admin group edit form MUST include fields for adding, modifying, or removing regular meeting schedule and location
- **FR-013C**: Both forms MUST use consistent field structure for meeting schedule (free text) and location (street, city, postal code, location details)

**Navigation & Actions**
- **FR-014**: System MUST provide a button/link within expanded accordion to navigate to full group detail page
- **FR-015**: System MUST provide a button to open contact modal for reaching group responsible persons
- **FR-016**: Navigation to group details MUST preserve existing functionality showing status reports

**Contact Modal**
- **FR-017**: System MUST display modal dialog when contact button is clicked
- **FR-018**: Contact modal MUST collect requester's name
- **FR-019**: Contact modal MUST collect requester's email address with validation
- **FR-020**: Contact modal MUST provide text field for requester to enter their message/inquiry
- **FR-021**: System MUST send contact request email to all responsible persons registered for the selected group
- **FR-022**: System MUST show success confirmation message after successful email submission
- **FR-023**: System MUST automatically close modal after brief delay (approximately 2 seconds) following successful submission
- **FR-024**: System MUST validate all required fields before allowing submission

**Error Handling**
- **FR-025**: System MUST display user-friendly error message in German when email sending fails
- **FR-026**: System MUST log email sending failures with sufficient detail for admin troubleshooting
- **FR-027**: System MUST close contact modal after displaying error message (no retry mechanism provided)

**Email Notification**
- **FR-028**: System MUST send email notification with requester name, requester email, and message text
- **FR-029**: Email MUST be sent to responsible persons in To field (or only to office CC if no responsible persons exist)
- **FR-030**: Email MUST include configurable office email address in CC field
- **FR-031**: Email MUST set reply-to address to requester's email address for direct responses
- **FR-032**: Email template MUST follow existing notification email styling and structure
- **FR-033**: Email MUST clearly identify which group the inquiry is about

**Contact Settings & Configuration**
- **FR-034**: System MUST provide admin settings interface for configuring office CC email address
- **FR-035**: Admin settings interface MUST follow similar pattern to address management page
- **FR-036**: Office CC email address MUST be used for all group contact requests

**User-Facing Text**
- **FR-037**: All user-facing text MUST be in German including labels, buttons, validation messages, and success confirmations

### Key Entities

- **Group (Extended)**: Represents a working group within Die Linke Frankfurt
  - Existing attributes: name, slug, description, logo, status, responsible persons
  - New attributes: regular meeting schedule (optional free text), meeting location (optional: street, city, postal code, location details)
  - Regular meeting schedule examples: "Jeden 3. Dienstag im Monat", "Jede zweite Woche Montag"
  - Meeting location follows same structure as appointment addresses

- **Contact Request**: Represents an inquiry from a public visitor to a group
  - Attributes: requester name, requester email, message text, target group
  - Not stored in database (privacy protection)
  - Used only for email delivery to responsible persons (To) and office address (CC)

- **Contact Settings**: Configuration for group contact functionality
  - Attributes: office email address (CC recipient for all contact requests)
  - Managed via admin settings interface

---

## Review & Acceptance Checklist

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed
- [x] User-facing text considerations in German

### Requirement Completeness
- [ ] No [NEEDS CLARIFICATION] markers remain (1 deferred clarification)
- [x] Requirements are verifiable through manual testing
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified
- [x] Aligned with constitution principles (simplicity, no automated tests)

**Deferred Clarifications:**
1. Confirm only ACTIVE status groups appear in overview? (Low impact - can be validated during planning/implementation)

---

## Execution Status

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [ ] Review checklist passed (pending clarifications)
