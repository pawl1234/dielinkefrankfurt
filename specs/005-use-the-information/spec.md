# Feature Specification: Strukturierte Wiederkehrende Gruppentreffen

**Feature Branch**: `005-use-the-information`
**Created**: 2025-10-12
**Status**: Draft
**Input**: User description: "Use the information from the context of this session. I want to be able to define a regular meeting for a group with typical patterns like "Ever 3. Monday in the Month" and similar. This should be a reusable component as I need a similar feature later somewhere else as well. On the group request form users should be able to select the regular meeting pattern or tick the box "No regular meeting". On the frontend side I want to reuse the information here @src/app/gruppen/page.tsx and @src/app/gruppen/[slug]/page.tsx for a replacement of the current string based appointment interval. Also I want a demo page which lists the upcommong appointments. It should be the title of the group, the date, , time, the location. One appointment per row sorted by date for the next 7 days. This is just a demo component I dont want to add this feature to the newsletter yet. First I want to build the basis for the form and the componenets used to display the data in the portal."

## Execution Flow (main)
```
1. Parse user description from Input
   → If empty: ERROR "No feature description provided"
2. Extract key concepts from description
   → Identify: actors, actions, data, constraints
3. For each unclear aspect:
   → Mark with [NEEDS CLARIFICATION: specific question]
4. Fill User Scenarios & Testing section
   → If no clear user flow: ERROR "Cannot determine user scenarios"
5. Generate Functional Requirements
   → Each requirement must be testable
   → Mark ambiguous requirements
6. Identify Key Entities (if data involved)
7. Run Review Checklist
   → If any [NEEDS CLARIFICATION]: WARN "Spec has uncertainties"
   → If implementation details found: ERROR "Remove tech details"
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

### Section Requirements
- **Mandatory sections**: Must be completed for every feature
- **Optional sections**: Include only when relevant to the feature
- When a section doesn't apply, remove it entirely (don't leave as "N/A")

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story
Anonymous users submitting a new group proposal can specify recurring meeting patterns (e.g., "every 3rd Monday of the month") using a structured form component instead of entering freeform text. Administrators can later edit these meeting patterns through the admin GUI when reviewing or managing existing groups. Public users visiting group pages should see these meetings rendered as a human-readable schedule. A dedicated demo page displays all upcoming group meetings for the next 7 days in a sorted list showing group name, date, time, and location.

### Acceptance Scenarios

**Form Submission (Anonymous Users)**
1. **Given** an anonymous user is submitting a new group proposal via the public group request form, **When** they define the meeting schedule, **Then** they can select one or more predefined recurring patterns (e.g., "jeden 1. Montag im Monat", "jeden 3. Montag im Monat", "jeden letzten Montag im Monat", "wöchentlich am Montag", "alle zwei Wochen am Montag") or check a box for "Kein regelmäßiges Treffen"

2. **Given** an anonymous user wants multiple meeting patterns for the same group, **When** they configure the meeting schedule, **Then** they can add multiple patterns (e.g., "jeden 1. Montag" + "jeden 3. Montag") that will all use the same meeting time and location

3. **Given** an anonymous user has selected one or more recurring patterns, **When** they submit the group proposal, **Then** all meeting pattern data is stored with the group proposal for admin review

**Admin Management**
4. **Given** an administrator is reviewing or editing an existing group in the admin GUI, **When** they access the meeting schedule settings, **Then** they can modify the recurring meeting patterns (add, remove, or change patterns) using the same component available to anonymous users

5. **Given** an administrator changes a group's meeting patterns, **When** they save the changes, **Then** the new patterns are stored and reflected on all public pages

**Public Display**
6. **Given** a group has one or more defined recurring meeting patterns and location, **When** a public user views the group overview page (`/gruppen`), **Then** the meeting schedule is displayed in German (e.g., "Jeden 1. und 3. Montag im Monat") with the location details

7. **Given** a group has multiple defined recurring meeting patterns, **When** a public user views the group detail page (`/gruppen/[slug]`), **Then** all recurring meeting patterns are displayed in human-readable German format, replacing the current text-based "regularMeeting" field

**Demo Page**
8. **Given** multiple groups have defined recurring meetings (including groups with multiple patterns), **When** a user visits the demo page for upcoming meetings, **Then** they see all meeting occurrences from all patterns occurring in the next 7 days sorted by date, showing: group name, date, time, and location

9. **Given** a group has "Kein regelmäßiges Treffen" selected, **When** displayed on public pages or the demo page, **Then** no meeting information is shown for that group

### Edge Cases
- When a recurring pattern would generate a meeting on a date that doesn't exist (e.g., 5th Monday when month only has 4 Mondays), system silently skips that occurrence – no meeting is generated or displayed for that month
- What happens if location fields are incomplete (e.g., only city but no street)? System should display available location information without errors
- How are holidays handled? [NEEDS CLARIFICATION: Should system skip meetings on public holidays, or display them normally?]

## Requirements *(mandatory)*

### Functional Requirements

**Data Capture**
- **FR-001**: System MUST allow both anonymous users (via public group request form) and administrators (via admin GUI) to define recurring meeting patterns for groups using predefined pattern options
- **FR-002**: System MUST support the following recurring pattern types: "jeden 1. [Wochentag] im Monat", "jeden 3. [Wochentag] im Monat", "jeden 1. und 3. [Wochentag] im Monat", "jeden letzten [Wochentag] im Monat", "wöchentlich am [Wochentag]", "alle zwei Wochen am [Wochentag]"
- **FR-002a**: System MUST allow groups to define multiple recurring patterns simultaneously (e.g., "jeden 1. Montag im Monat" + "jeden 3. Montag im Monat" for the same group)
- **FR-003**: System MUST allow users (both anonymous and admins) to select all weekdays (Montag through Sonntag) for recurring patterns
- **FR-004**: System MUST allow users (both anonymous and admins) to specify "Kein regelmäßiges Treffen" as an option
- **FR-005**: System MUST store meeting time as a required field separate from the recurring pattern
- **FR-006**: System MUST maintain existing location fields (street, city, postal code, location details) for meeting venues
- **FR-007**: System MUST store meeting pattern data submitted by anonymous users with the group proposal for later admin review and approval

**Display & Calculation**
- **FR-008**: System MUST convert stored recurring patterns into human-readable German text (e.g., "Jeden 3. Montag im Monat um 19:00 Uhr")
- **FR-009**: System MUST calculate specific meeting dates from all defined recurring patterns for a group for any given date range (e.g., next 7 days), merging results from multiple patterns when applicable
- **FR-009a**: System MUST silently skip occurrences when a pattern cannot generate a valid date (e.g., "jeden 5. Montag im Monat" in months with only 4 Mondays) without displaying errors or placeholder meetings
- **FR-010**: System MUST display recurring meeting information on the group overview page (`/gruppen`) in place of the current text field
- **FR-011**: System MUST display recurring meeting information on the group detail page (`/gruppen/[slug]`) in the existing meeting information section
- **FR-012**: System MUST provide a demo page listing all upcoming group meetings for the next 7 days
- **FR-013**: Demo page MUST display meetings sorted chronologically (earliest first)
- **FR-014**: Each meeting entry on the demo page MUST show: group name, date, time, and complete location information

**Form Design**
- **FR-015**: Meeting pattern selection component MUST be designed as a reusable component (not hardcoded to group forms) to support future use cases, even though specific future forms are not yet determined
- **FR-016**: Public group request form MUST integrate the recurring meeting pattern selector in place of the current "regularMeeting" text field
- **FR-017**: Admin group edit form MUST integrate the same recurring meeting pattern selector to allow administrators to modify patterns
- **FR-018**: System MUST validate that either a pattern is selected OR "Kein regelmäßiges Treffen" is checked (mutually exclusive)

**Data Migration & Compatibility**
- **FR-019**: System MAY discard existing "regularMeeting" text field data during migration, as data has not been used productively yet
- **FR-019a**: Administrators MUST manually reconfigure meeting patterns for existing groups using the new structured pattern component after migration

**Out of Scope (Explicitly Deferred)**
- **FR-020**: Newsletter integration of recurring meetings is NOT included in this feature

### Key Entities

- **Gruppentreffen (Group Meeting)**: Represents a recurring meeting schedule for a group
  - One or more pattern types (e.g., "jeden 1. Montag im Monat" + "jeden 3. Montag im Monat")
  - Weekday selection per pattern
  - Required meeting time (shared across all patterns)
  - Location information (references existing address fields, shared across all patterns)
  - Association with specific group

- **Treffenmuster (Meeting Pattern)**: Represents the predefined recurring schedule options
  - Pattern identifier (e.g., "monthly-3rd-weekday")
  - German display text template
  - Calculation rules for generating specific dates

- **Berechnetes Treffen (Calculated Meeting Instance)**: Represents a specific occurrence of a recurring meeting
  - Associated group
  - Calculated date
  - Time (inherited from pattern)
  - Location (inherited from group)
  - Used for generating upcoming meetings list

---

## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed
- [x] User-facing text considerations in German

### Requirement Completeness
- [ ] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are verifiable through manual testing
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified
- [x] Aligned with constitution principles (simplicity, no automated tests)

---

## Execution Status
*Updated by main() during processing*

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [ ] Review checklist passed (pending clarifications)

---

## Clarifications

### Session 2025-10-12

- Q: Ist die Uhrzeit (Meeting Time) ein Pflichtfeld oder optional? → A: Pflichtfeld – jede Gruppe muss eine Uhrzeit angeben
- Q: Sind die vier spezifizierten Muster ausreichend, oder sollen initial mehr Muster unterstützt werden? → A: Option D – zusätzlich "wöchentlich am [Wochentag]" und "jeden letzten [Wochentag] im Monat" unterstützen. Außerdem: Mehrere Muster pro Gruppe möglich (z.B. "jeden 1. Montag" + "jeden 3. Montag")
- Q: Wenn ein Muster wie "jeden 5. Montag im Monat" in bestimmten Monaten kein Datum generiert, wie soll das System reagieren? → A: Stilles Überspringen – keine Anzeige, kein Treffen für diesen Monat
- Q: Wie sollen bestehende Freitext-Einträge im "regularMeeting" Feld während der Migration behandelt werden? → A: Manuelle Migration durch Admins – bestehende Daten wurden noch nicht produktiv verwendet, Datenverlust ist akzeptabel
- Q: Welche anderen Formulare oder Features werden die Meeting Pattern Komponente nach der initialen Implementierung wiederverwenden? → A: Noch nicht geklärt – zukünftige Verwendung noch offen

---

## Outstanding Clarifications

1. **Holiday Handling**: Should the system be aware of public holidays and either skip or flag meetings that fall on holidays? (Deferred – low impact for initial release, can be addressed post-MVP)
