# Feature Specification: Admin-Managed FAQ System for Member Portal

**Feature Branch**: `009-admin-portal-faq`
**Created**: 2025-10-23
**Status**: Draft
**Input**: User description: "for the Portal @src/app/portal/ I want to add a menu point called FAQ. This FAQ should be filled by the admin in the admin portal @src/app/admin/ like a little cms. Admins can create, edit, delete FAQ entries and authenticated user see these entries in the user portal. The admin component should be designed similar to src/app/admin/groups/page.tsx with an accordion entry per item with states like Aktiv, Archiviert, Gelöscht. Admins should have a button to create a new entry. We dont need the Neu state as the entries are created by the admin and therefore do not need this state. FAQ entries should have a title and then a rich text field. On the portal side we also need an accordion view for all FAQ entries. Also a search across titles and content to filter the FAQ entries. Only users authenticated to the portal are allowed to read the FAQ. This is currently the role Mitglieder, but this might be extended in the future. Currently we use the middleware to enforce authentication. Also add extensible authentication in the database layer like the data access layer pattern of next.js"

## Clarifications

### Session 2025-10-23

- Q: How should FAQ entries be ordered when displayed to members and admins? → A: Automatic ordering alphabetically by title (A-Z) with no manual reordering capability
- Q: Should the system include any initial FAQ entries or seed data when first deployed? → A: Include 1 "Getting Started" FAQ explaining how to use the FAQ system
- Q: Which FAQ operations should be logged by the system for audit trail and debugging? → A: Log only failures and errors (failed saves, validation errors, unauthorized access attempts)
- Q: What is the maximum allowed length for search queries before truncation? → A: 100 characters
- Q: Which rich text formatting features should be available in the FAQ content editor? → A: Reuse existing RichTextEditor component

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Admin Creates and Manages FAQ Entries (Priority: P1)

Administrators need to create, edit, archive, and delete FAQ entries to provide members with up-to-date information about the organization. The admin interface should match the existing groups management interface pattern for consistency.

**Why this priority**: This is the foundation of the feature - without admin-created content, there is nothing for members to view. This enables administrators to build the knowledge base.

**Independent Test**: Can be fully tested by logging in as an admin, navigating to the FAQ management page, creating a new FAQ entry with title and rich text content, then editing, archiving, and deleting entries. Delivers value by allowing admins to populate the FAQ database.

**Acceptance Scenarios**:

1. **Given** an admin is logged in, **When** they navigate to `/admin/faq`, **Then** they see a list of all FAQ entries organized by status (Aktiv, Archiviert) with an "Alle" tab showing all entries
2. **Given** an admin is on the FAQ management page, **When** they click "Neue FAQ erstellen", **Then** a dialog opens with fields for title and rich text content
3. **Given** an admin fills in the title and content fields, **When** they submit the form, **Then** the FAQ entry is created with status "Aktiv" and appears in the active list
4. **Given** an admin views an active FAQ entry in the accordion, **When** they click "Bearbeiten", **Then** the entry expands and shows an inline editor with the current title and content
5. **Given** an admin edits a FAQ entry, **When** they save changes, **Then** the entry is updated and the accordion returns to view mode
6. **Given** an admin views an active FAQ entry, **When** they click "Archivieren", **Then** the entry status changes to "Archiviert" and moves to the archived tab
7. **Given** an admin views an archived FAQ entry, **When** they click "Reaktivieren", **Then** the entry status changes to "Aktiv" and moves to the active tab
8. **Given** an admin views an archived FAQ entry, **When** they click "Löschen" and confirm, **Then** the entry is permanently deleted from the database

---

### User Story 2 - Members Search and Browse FAQ Entries (Priority: P2)

Authenticated members need to easily find answers to their questions by browsing and searching through active FAQ entries in the portal.

**Why this priority**: This delivers the core user value of the FAQ system. Members can only benefit from the FAQ once they can access it, but it depends on P1 having content created first.

**Independent Test**: Can be fully tested by logging in as a member (role: mitglied), navigating to `/portal/faq`, viewing the accordion list of FAQ entries, and using the search field to filter entries by title or content. Delivers value by providing self-service access to organizational information.

**Acceptance Scenarios**:

1. **Given** a member is logged in to the portal, **When** they navigate to `/portal/faq`, **Then** they see all active FAQ entries displayed in an accordion view
2. **Given** a member views the FAQ page, **When** they see an FAQ entry in the list, **Then** they can see the title and a collapsed accordion
3. **Given** a member clicks on an FAQ accordion entry, **When** it expands, **Then** they can read the full rich text content
4. **Given** a member is on the FAQ page, **When** they type text into the search field, **Then** the FAQ list filters in real-time to show only entries where title or content matches the search term
5. **Given** a member searches for a term with no matches, **When** the filter is applied, **Then** they see a message "Keine FAQ-Einträge gefunden"
6. **Given** a member has searched and filtered FAQs, **When** they clear the search field, **Then** all active FAQ entries are displayed again
7. **Given** an unauthenticated user tries to access `/portal/faq`, **When** the page loads, **Then** they are redirected to the login page with callback URL set to `/portal/faq`

---

### User Story 3 - Role-Based Access Control with Future Extensibility (Priority: P3)

The system must enforce that only authenticated users with appropriate roles can access FAQ entries, with a database-level access control pattern that can be extended to support additional roles beyond "admin" and "mitglied" in the future.

**Why this priority**: This ensures security and privacy while building a foundation for future role-based features. It's ranked P3 because basic middleware authentication already exists and handles most cases, but database-level controls add defense in depth and extensibility.

**Independent Test**: Can be tested by attempting to access FAQ endpoints from different authentication states (unauthenticated, admin role, mitglied role) and verifying that API routes properly check permissions at the database operation level. Delivers value by providing secure, extensible access control that prevents unauthorized data access.

**Acceptance Scenarios**:

1. **Given** a database operation is called to fetch FAQs, **When** the caller provides a user session, **Then** the operation verifies the user has an allowed role (admin or mitglied) before returning data
2. **Given** an API endpoint receives a request, **When** it calls a database operation, **Then** it passes the user's session information to the database layer for authorization
3. **Given** a user with role "mitglied" calls the FAQ fetch operation, **When** the operation executes, **Then** it returns only active FAQ entries
4. **Given** a user with role "admin" calls the FAQ fetch operation, **When** the operation executes with status filter "ALL", **Then** it returns FAQ entries regardless of status
5. **Given** a database operation is called without valid authentication, **When** authorization is checked, **Then** it throws an "Unauthorized" error
6. **Given** a new role needs to be granted FAQ access in the future, **When** developers update the allowed roles configuration, **Then** no changes to middleware or API routes are required (only database operation configuration)

---

### Edge Cases

- **What happens when an admin tries to delete a FAQ entry that doesn't exist?** System should return a "Nicht gefunden" error message
- **What happens when a member searches with special characters or very long search terms?** Search should handle special characters safely (SQL injection prevention) and truncate search terms at 100 characters
- **What happens when two admins edit the same FAQ entry simultaneously?** Last write wins - the second save overwrites the first (acceptable for this use case, no conflict resolution needed)
- **What happens when an admin creates a FAQ with an extremely long title or content?** System should enforce character limits (title: 200 chars, content: 10000 chars) and show validation error
- **What happens when all FAQ entries are archived?** Members see an empty state message "Keine FAQ-Einträge verfügbar" (note: initial "Getting Started" FAQ can be archived by admins if desired)
- **What happens when an admin tries to archive an already archived FAQ?** System should handle this gracefully (no-op or show message "Bereits archiviert")
- **How does the system handle rich text content with potentially malicious HTML/scripts?** Content should be sanitized on save and rendered safely using the existing SafeHtml component
- **What happens if a user's role changes from mitglied to a non-allowed role while they're viewing the FAQ page?** Next page refresh or API call will enforce new permissions through middleware and redirect if needed

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow admin users to create new FAQ entries with a title (max 200 characters) and rich text content (max 10000 characters)
- **FR-002**: System MUST allow admin users to edit existing FAQ entries, modifying title and content
- **FR-003**: System MUST allow admin users to change FAQ entry status between "Aktiv" and "Archiviert"
- **FR-004**: System MUST allow admin users to permanently delete archived FAQ entries
- **FR-005**: System MUST prevent admin users from deleting active FAQ entries (must archive first)
- **FR-006**: System MUST display FAQ entries in an accordion view on both admin and portal pages, ordered alphabetically by title (A-Z)
- **FR-007**: System MUST show FAQ entries organized by status tabs (Aktiv, Archiviert, Alle) on the admin page
- **FR-008**: System MUST display only active FAQ entries to members on the portal page, ordered alphabetically by title (A-Z)
- **FR-009**: System MUST provide real-time search filtering on the portal FAQ page that searches both title and content (search terms truncated at 100 characters)
- **FR-010**: System MUST enforce authentication at the middleware level, redirecting unauthenticated users to login page
- **FR-011**: System MUST enforce authorization at the database operation level, verifying user roles before returning data
- **FR-012**: System MUST allow only users with role "admin" or "mitglied" to access FAQ data
- **FR-013**: System MUST validate all FAQ input data using Zod schemas on both client and server
- **FR-014**: System MUST sanitize rich text content to prevent XSS attacks
- **FR-015**: System MUST track creation and update timestamps for each FAQ entry
- **FR-016**: System MUST support pagination on the admin FAQ page when there are many entries (10 entries per page default)
- **FR-017**: System MUST provide search functionality on the admin page to filter FAQs by title or content (search terms truncated at 100 characters)
- **FR-018**: System MUST render rich text content safely using the existing SafeHtml component pattern
- **FR-019**: System MUST reuse the existing RichTextEditor component for FAQ content editing (same features as newsletter editor)
- **FR-020**: System MUST add a "FAQ" navigation item to the portal navigation menu
- **FR-021**: System MUST include one initial "Getting Started" FAQ entry upon first deployment that explains how to use the FAQ system (status: ACTIVE, can be edited or archived by admins)
- **FR-022**: System MUST log all failures and errors including failed saves, validation errors, and unauthorized access attempts with relevant context (user ID, operation, timestamp)

### Key Entities

- **FaqEntry**: Represents a single FAQ item
  - **id**: Unique identifier (CUID)
  - **title**: Question or topic (string, max 200 chars) - used for automatic alphabetical sorting (A-Z)
  - **content**: Answer in rich text format (text, max 10000 chars, stored as HTML)
  - **status**: Current state (enum: ACTIVE, ARCHIVED)
  - **createdAt**: Timestamp when entry was created
  - **updatedAt**: Timestamp when entry was last modified
  - **createdBy**: User ID of admin who created the entry (string, references User model)
  - **updatedBy**: User ID of admin who last updated the entry (string, references User model)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Admins can create a new FAQ entry in under 1 minute (from clicking "Neue FAQ erstellen" to successful save)
- **SC-002**: Members can find relevant FAQ entries within 10 seconds using search functionality
- **SC-003**: The FAQ admin interface matches the design patterns of the existing groups management page (uses same components: accordion layout, status tabs, action buttons)
- **SC-004**: All FAQ operations (create, read, update, delete) respond in under 2 seconds under normal load
- **SC-005**: Zero unauthorized access incidents - all database operations properly enforce role-based access control
- **SC-006**: 100% of user-facing text is in German (error messages, labels, buttons, validation messages)
- **SC-007**: Search filtering updates the FAQ list immediately (under 300ms) as users type
- **SC-008**: The portal FAQ page displays correctly on mobile, tablet, and desktop viewports (responsive design)

## Constitutional Compliance Notes

This specification MUST be implemented according to the project constitution (`.specify/memory/constitution.md`). Key reminders:

**Type Safety & Code Quality**:
- NO `any` types (Principle I)
- Reuse types from `src/types/` before creating new ones (Principles I, XII)
- Follow domain-based architecture in `src/lib/` (Principle XI)
- Keep all files under 500 lines (Principle IX)

**User Experience**:
- ALL user-facing text MUST be in German (Principle VI)
- Validate all inputs server-side with Zod (Principle VIII)

**Development Standards**:
- Use `@/` path aliases for imports (Principle V)
- Use `logger` from `@/lib/logger.ts` for all logging (Principle VII)
- Follow KISS (Principle III) and DRY (Principle IV) principles
- NO automated tests (Principle II - manual testing only)

Refer to the full constitution for detailed guidance on each principle.
