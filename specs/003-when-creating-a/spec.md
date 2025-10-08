# Feature Specification: Address Management for Appointments

**Feature Branch**: `003-when-creating-a`
**Created**: 2025-10-07
**Status**: Draft
**Input**: User description: "When creating a new appointment via the public form I can enter an address of an appointment. The ease this process I would like to give users the option to choose from pre existing addresses in a drop down menu. The pre existing addresses should be managed in the admin gui. Here admins can CRUD addresses via a gui element. Therefore I want you to add the SearchFilterBar which is also used here @src/app/admin/status-reports/page.tsx to the appointment GUI here @src/app/admin/appointments/page.tsx Then right to the search element I want to add a button called adresses. When click the GUI element for managing the addresses comes up. I want the edit page to be a full page similar to the newsletter settings @src/app/admin/newsletter/settings/page.tsx in this admin page users can perfrom CRUD actions for addresses. These addresses should then be accessible on the public form. While this implementation I also want you to add the SearchFilterBar and make it work. Analyse the SearchFilterBar whether its a generic component which can be reused. Later I want to reuse it on other locations as well."

## Execution Flow (main)
```
1. Parse user description from Input
   → Feature is clear: Address management for appointments
2. Extract key concepts from description
   → Actors: Public users, Admin users
   → Actions: Select address from dropdown (public), CRUD addresses (admin), search appointments (admin)
   → Data: Addresses (street, city, postal code, location details)
   → Constraints: Reusable components, full-page admin interface
3. For each unclear aspect:
   → [RESOLVED: Addresses must have unique name/label field for dropdown display]
   → [RESOLVED: Public users can select from dropdown OR manually enter address details (fallback mode)]
   → [RESOLVED: Addresses can be deleted without warnings; appointments retain address data copy]
   → [RESOLVED: Search filters by appointment title and event details/description with partial matching]
   → [RESOLVED: Address edits do not affect existing appointments; only new appointments use updated address data]
4. Fill User Scenarios & Testing section
   → Clear user flow identified for both public and admin scenarios
5. Generate Functional Requirements
   → All requirements testable and verifiable
6. Identify Key Entities
   → Address entity with fields for location data
7. Run Review Checklist
   → All clarification points resolved via /clarify session
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

---

## Clarifications

### Session 2025-10-07
- Q: Should addresses have a display name/label field in addition to the full address components? → A: Yes, require a unique name/label field (e.g., "Partei-Büro", "Gewerkschaftshaus") for dropdown display
- Q: How should address selection work on the public appointment form? → A: Dropdown with manual fallback - users can select a pre-defined address OR manually enter location details
- Q: What should happen when an admin tries to delete an address that is already used in existing appointments? → A: Allow deletion without warning - address is removed but existing appointments retain the address data they were created with
- Q: Which appointment fields should the search functionality filter on? → A: Search for title and event details (mainText/description content)
- Q: When an admin edits an existing address in the address management interface, what should happen to appointments that previously used that address? → A: Preserve existing appointments - appointments retain the original address data they were created with; only new appointments use the edited version

---

## User Scenarios & Testing

### Primary User Story

**As a public user** submitting a new appointment, I want to quickly select a pre-defined address from a dropdown menu instead of manually entering location details, so that I can save time and ensure consistent address formatting.

**As an admin user**, I want to manage a centralized list of frequently used addresses through a dedicated interface, so that public users have accurate and commonly used locations available for selection.

**As an admin user**, I want to search and filter appointments to quickly find specific entries.

### Acceptance Scenarios

#### Public User - Address Selection
1. **Given** I am on the public appointment submission form
   **When** I reach the address/location section
   **Then** I see a dropdown menu with pre-defined addresses

2. **Given** I select an address from the dropdown
   **When** I submit the appointment form
   **Then** the selected address is saved with the appointment

3. **Given** no addresses exist in the system
   **When** I view the appointment form
   **Then** I can still manually enter address details (dropdown may show empty state or be hidden, but manual entry remains available)

#### Admin User - Address Management
4. **Given** I am logged into the admin dashboard
   **When** I navigate to the appointments page
   **Then** I see a search bar with an "Adressen" button next to it

5. **Given** I am on the appointments admin page
   **When** I click the "Adressen" button
   **Then** I am taken to a full-page address management interface

6. **Given** I am on the address management page
   **When** I create a new address with location details
   **Then** the address is saved and becomes available in the public form dropdown

7. **Given** I am on the address management page
   **When** I edit an existing address
   **Then** the changes are immediately reflected in the public form dropdown for new appointments, but existing appointments retain the original address data

8. **Given** I am on the address management page
   **When** I delete an address
   **Then** the address is removed from the system immediately without warnings, but existing appointments retain their address data

#### Admin User - Search Functionality
9. **Given** I am on the appointments admin page
   **When** I enter a search term and click "Suchen"
   **Then** the appointment list filters to show only matching results

10. **Given** I have filtered appointments with a search term
    **When** I clear the search
    **Then** all appointments are displayed again

### Edge Cases
- When an address is deleted or edited, existing appointments retain a copy of the original address data (no impact on historical records)
- Only new appointments created after an address edit will use the updated address data
- What happens if an admin tries to create an address with a duplicate name/label (system must prevent with validation error)?
- What happens if a user selects a pre-defined address, then manually modifies the auto-filled fields (manual modifications should be preserved)?
- What happens if no pre-defined addresses exist in the system (users can still manually enter address details)?
- Search uses partial text matching (substring) on appointment title and event details/description fields
- How should search handle special characters, case sensitivity, and German umlauts?

## Requirements

### Functional Requirements

#### Address Management (Admin)
- **FR-001**: System MUST provide a dedicated full-page interface for address management accessible from the appointments admin page
- **FR-002**: Admins MUST be able to create new addresses with the following required fields: unique name/label (e.g., "Partei-Büro"), street, city, postal code, and optional location details/notes
- **FR-003**: Admins MUST be able to view a list of all saved addresses
- **FR-003a**: System MUST enforce uniqueness of address name/label and prevent duplicate entries
- **FR-004**: Admins MUST be able to edit existing addresses
- **FR-004a**: System MUST NOT update address data in existing appointments when the source address is edited (appointments preserve the original data they were created with)
- **FR-005**: Admins MUST be able to delete addresses without warnings or restrictions, even if used in existing appointments
- **FR-005a**: System MUST preserve address data in existing appointments when the source address is deleted (appointments retain a copy of the address information)
- **FR-006**: The address management interface MUST be similar in layout and style to the newsletter settings page (full-page, form-based)
- **FR-007**: System MUST provide an "Adressen" button on the appointments admin page that navigates to the address management interface

#### Address Selection (Public Form)
- **FR-008**: Public appointment submission form MUST display a dropdown menu containing all available pre-defined addresses
- **FR-009**: System MUST populate the address dropdown with all active/saved addresses from the system
- **FR-010**: Users MUST be able to select an address from the dropdown to auto-fill location fields
- **FR-011**: System MUST support manual address entry as fallback - users can choose to manually enter location details if pre-defined addresses don't match their needs
- **FR-011a**: System MUST allow both selection from dropdown AND manual entry in the same form (users are not restricted to one mode)
- **FR-012**: Selected address MUST be saved with the appointment submission

#### Search Functionality (Admin)
- **FR-013**: Appointments admin page MUST display a search bar with search input field and search button
- **FR-014**: System MUST filter displayed appointments based on search term when user submits search
- **FR-015**: System MUST allow users to clear search filters to return to full appointment list
- **FR-016**: Search MUST filter appointments by matching the search term against appointment title and event details/description (mainText content)
- **FR-016a**: Search MUST support partial text matching (substring search) within title and event details fields
- **FR-017**: Search results MUST update the appointment list display in real-time after submission

#### Component Reusability
- **FR-018**: SearchFilterBar component MUST be generic and reusable across multiple admin pages
- **FR-019**: SearchFilterBar MUST support additional filter controls via children prop
- **FR-020**: SearchFilterBar MUST handle search term input, clear action, and search submission

### Key Entities

- **Address**: Represents a pre-defined location that can be selected when creating appointments
  - Contains: Unique name/label (required, e.g., "Partei-Büro", "Gewerkschaftshaus"), street address (required), city (required), postal code (required), location details/notes (optional)
  - Uniqueness: Name/label must be unique across all addresses
  - Display: Name/label is shown in dropdown menu for user selection
  - Relationship: Can be referenced by multiple appointments
  - Lifecycle: Created/managed by admins, selected by public users

- **Appointment**: Existing entity that will reference selected addresses
  - Enhanced with: Link to selected Address (if user chooses pre-defined option) OR direct storage of address data
  - Data preservation: When an address is selected from dropdown, appointment stores a copy of the address data at creation time to ensure historical records remain intact even if source address is deleted or edited
  - Immutability: Appointment address data never changes after creation, regardless of changes to the source address in the address library
  - Maintains: Backward compatibility with manually entered addresses

---

## Review & Acceptance Checklist

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed
- [x] User-facing text considerations in German

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain - **All 5 critical clarification points resolved**
- [x] Requirements are verifiable through manual testing
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified
- [x] Aligned with constitution principles (simplicity, no automated tests)

---

## Execution Status

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked and resolved - **5 clarification points addressed**
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed - **All clarifications resolved**

---

## Notes

### SearchFilterBar Component Analysis
The SearchFilterBar component is already designed as a generic, reusable component:
- Accepts search term state and handlers as props
- Supports additional filters through children prop
- No business logic embedded
- Clean, composable interface
- Ready for reuse across admin pages

### Design Consistency
The address management page should follow the pattern established by the newsletter settings page:
- Full-page layout with container
- Admin navigation at top
- Page header with icon
- Form fields in Paper component
- Save/Cancel buttons at bottom
- Proper spacing and grid layout for form fields
