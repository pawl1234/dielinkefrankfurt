# Feature Specification: Group User Membership & Responsible Person Management

**Feature Branch**: `011-group-user-membership`
**Created**: 2025-11-01
**Status**: Draft
**Input**: User description: "I have an existing user portal at src/app/portal/page.tsx and a groups feature that can currently be requested by anonymous users and moderated via the admin portal at src/app/admin/groups/page.tsx. Groups have responsible persons defined via first and last name plus email address in the ResponsiblePerson model. Now I want to add the capability to assign existing user accounts as responsible persons for groups. This should work alongside the current email-based responsible persons for backwards compatibility. When a user account is assigned as a responsible person, we don't need to create a separate ResponsiblePerson entry for them since we already have their information from the User model. Admins should be able to assign and remove responsible persons via the admin portal. Responsible persons should be able to edit all fields of their assigned groups including managing other responsible persons, but they should not be allowed to delete or archive groups. Important: they can only edit their own groups, not any other groups. Secondly, I want to add the capability for authenticated users to join groups as members. Users can self-join any active group without approval. When a user joins a group, the responsible person(s) should receive an email notification. Which members are assigned to a group should only be visible in the user portal - this is not public information. Responsible persons should be able to moderate their group members by viewing a table listing all members and removing them if needed. Responsible persons are automatically also members of their groups and should be listed in the members table with an indicator showing they are responsible persons. In the user portal, I want to add a new menu item called Gruppen with two tabs: Alle Gruppen and Meine Gruppen. The Alle Gruppen tab should show only active groups and be searchable by group name. Users should be able to self-join groups from this view. The Meine Gruppen tab should show groups where the user is either a responsible person or a member, also searchable by name. For the UI, we can reuse patterns from src/app/admin/groups/page.tsx with tabs and accordions, but limited to these two tabs. When clicking on a group in Meine Gruppen, it should open a full new page in the user portal for that specific group. This page should have a submenu item called Mitglieder where users can see all members of the group in a table format. Responsible persons listed in this table should have an indicator showing their role. In the future, groups will support additional features like file storage, meeting invites, and member communication. For now, just add dummy menu items and placeholders for these future capabilities. The user portal already supports nested menus which can be used for this structure."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - User Self-Joins Active Group (Priority: P1)

An authenticated user browses all active groups in the user portal and joins a group they're interested in. They can immediately see their membership status and access the group's member list.

**Why this priority**: This is the core value proposition - enabling users to self-organize into groups. Without this, users cannot become group members at all, making all other features unusable.

**Independent Test**: Can be fully tested by logging in as a user, navigating to the "Gruppen" section, viewing active groups, clicking a join button, and verifying membership is confirmed both in the UI and the members table. Delivers immediate value by allowing community self-organization.

**Acceptance Scenarios**:

1. **Given** a logged-in user viewing the "Alle Gruppen" tab, **When** they click "Beitreten" on an active group, **Then** they are immediately added as a member and see a success confirmation
2. **Given** a user who is already a member of a group, **When** they view that group in "Alle Gruppen", **Then** they see an indicator that they are already a member instead of a join button
3. **Given** a user successfully joins a group, **When** they navigate to "Meine Gruppen" tab, **Then** the newly joined group appears in their list
4. **Given** a user who joins a group, **When** the join action completes, **Then** all responsible persons for that group receive an email notification with the new member's name
5. **Given** a user viewing "Alle Gruppen", **When** they use the search field to filter by group name, **Then** only matching active groups are displayed

---

### User Story 2 - Admin Assigns User Account as Responsible Person (Priority: P2)

An admin assigns an existing user account as a responsible person for a group through the admin portal. The assigned user can now edit the group and manage its members.

**Why this priority**: This enables the transition from email-based responsible persons to user account-based management, which is necessary for responsible persons to access portal features. However, groups can function with email-based responsible persons, so this is lower priority than basic membership.

**Independent Test**: Can be tested by logging into the admin portal, opening a group, adding a user account as responsible person, then logging in as that user and verifying they can edit the group and access member management features. Delivers value by enabling user-based group management.

**Acceptance Scenarios**:

1. **Given** an admin editing a group in the admin portal, **When** they assign a user account as a responsible person, **Then** that user is linked to the group without creating a duplicate ResponsiblePerson entry
2. **Given** a user assigned as a responsible person for a group, **When** they view "Meine Gruppen" in the portal, **Then** the group appears with a "Verantwortlich" indicator
3. **Given** a responsible person viewing their assigned group, **When** they click to edit the group, **Then** they can modify all group fields including name, description, meeting details, and responsible persons
4. **Given** a responsible person editing a group, **When** they attempt to delete or archive the group, **Then** those actions are not available to them (only visible to admins)
5. **Given** a user who is a responsible person for Group A, **When** they view Group B (not assigned to them), **Then** they cannot edit Group B
6. **Given** a responsible person is assigned to a group, **When** the assignment is made, **Then** they are automatically also added as a member of the group

---

### User Story 3 - Responsible Person Manages Group Members (Priority: P3)

A responsible person views all members of their group in a table format and can remove members if needed. They see themselves listed with a special indicator showing their role.

**Why this priority**: This provides moderation capabilities for responsible persons, which is important for group management but not essential for basic group functioning. Groups can operate with members even if moderation features come later.

**Independent Test**: Can be tested by logging in as a responsible person, navigating to their group's "Mitglieder" page, viewing the member table with role indicators, and removing a test member. Delivers value by enabling responsible persons to maintain their group's membership.

**Acceptance Scenarios**:

1. **Given** a responsible person viewing their group's detail page, **When** they click on the "Mitglieder" submenu item, **Then** they see a table listing all group members
2. **Given** a responsible person viewing the members table, **When** they see their own entry, **Then** it includes a visual indicator (badge/chip) showing "Verantwortliche Person"
3. **Given** a responsible person viewing the members table, **When** they click a remove button for a regular member, **Then** that member is removed from the group after confirmation
4. **Given** a responsible person viewing the members table, **When** they attempt to remove themselves, **Then** they cannot do so (responsible persons cannot self-remove)
5. **Given** a regular member viewing a group they belong to, **When** they view the members table, **Then** they see all members with role indicators but cannot remove anyone

---

### User Story 4 - User Portal Group Navigation Structure (Priority: P2)

Users navigate through the group section of the user portal using a new "Gruppen" menu item with tabs for browsing all groups and viewing their own groups. They can drill down into individual group detail pages with nested submenus.

**Why this priority**: This provides the navigation infrastructure needed to access all group features. It's higher priority than member management because without it, users cannot access any group functionality in the portal.

**Independent Test**: Can be tested by logging into the portal, verifying the "Gruppen" menu item exists, switching between tabs, clicking into a group from "Meine Gruppen", and navigating through submenu items. Delivers value by providing organized access to group features.

**Acceptance Scenarios**:

1. **Given** a logged-in user in the portal, **When** they view the main navigation, **Then** they see a "Gruppen" menu item
2. **Given** a user clicking on "Gruppen", **When** the page loads, **Then** they see two tabs: "Alle Gruppen" and "Meine Gruppen"
3. **Given** a user viewing "Meine Gruppen" tab, **When** they click on a group accordion, **Then** they see a button/link to view the full group detail page
4. **Given** a user on a group detail page, **When** they view the page structure, **Then** they see nested submenu items including "Mitglieder" and placeholder items for future features (e.g., "Dateien", "Termine", "Kommunikation")
5. **Given** a user clicking on "Mitglieder" submenu, **When** the section loads, **Then** they see the members table for that specific group
6. **Given** a user clicking on placeholder submenu items, **When** they navigate to those sections, **Then** they see coming soon messages or placeholders indicating future functionality

---

### User Story 5 - Backwards Compatibility with Email-Based Responsible Persons (Priority: P2)

The system continues to support email-based responsible persons (existing ResponsiblePerson records) alongside user account-based responsible persons. Both types can coexist for the same group.

**Why this priority**: This ensures existing groups and workflows continue functioning without disruption. Critical for deployment but not for core feature delivery, since it's about maintaining existing functionality rather than adding new value.

**Independent Test**: Can be tested by viewing a group that has both email-based and user account-based responsible persons, verifying both are displayed correctly in the admin portal, and confirming email notifications reach both types. Delivers value by preventing disruption to existing groups.

**Acceptance Scenarios**:

1. **Given** a group with existing email-based responsible persons, **When** an admin assigns a user account as an additional responsible person, **Then** both the email-based and user-based responsible persons are displayed
2. **Given** a user joining a group with mixed responsible person types, **When** the notification is sent, **Then** both email-based responsible persons and user account-based responsible persons receive the notification
3. **Given** a group with only email-based responsible persons, **When** a user who is not a responsible person views the group in the portal, **Then** they see the group but have no edit permissions
4. **Given** an admin viewing a group in the admin portal, **When** they see the responsible persons list, **Then** they can distinguish between email-based entries (ResponsiblePerson records) and user account-based entries

---

### Edge Cases

- What happens when a user tries to join a group that is not in ACTIVE status (NEW or ARCHIVED)?
  - Users should only be able to join ACTIVE groups; other statuses should not show a join button
- What happens when a responsible person tries to remove another responsible person from the members table?
  - Responsible persons listed in the members table should not have a remove button (or it should be disabled) - they can only be removed via the responsible person management interface
- What happens when a group has no responsible persons at all?
  - The group should still be visible and joinable, but no notifications are sent when users join
- What happens when a user account is deleted but they are assigned as a responsible person?
  - The system uses cascade delete to automatically remove all GroupMember and GroupResponsibleUser records associated with the deleted user, preventing orphaned references
- What happens when a user tries to join a group twice (race condition)?
  - The system should detect duplicate membership attempts and handle gracefully (e.g., unique constraint, show appropriate error message)
- What happens when an admin assigns the same user multiple times as a responsible person?
  - The system should prevent duplicate assignments to the same user for the same group
- What happens when a responsible person views the members table and there are hundreds of members?
  - The table should support pagination or virtual scrolling for performance
- What happens when search returns no results in "Alle Gruppen" or "Meine Gruppen"?
  - Display an appropriate "Keine Gruppen gefunden" message
- What happens when a responsible person tries to remove the last remaining user account-based responsible person (leaving only email-based ones or none)?
  - The system should allow this action - groups can exist with only email-based responsible persons or no responsible persons at all
- What happens when a user leaves a group they just joined?
  - The system should allow immediate self-removal; the user can re-join at any time since groups allow self-join

## Clarifications

### Session 2025-11-03

- Q: What level of control should responsible persons have over other user account-based responsible persons? → A: Responsible persons can remove other responsible persons (but not themselves)
- Q: Can regular members leave groups by themselves, or can they only be removed by responsible persons? → A: Users can leave groups themselves (self-removal)
- Q: What fields should the search functionality in "Alle Gruppen" and "Meine Gruppen" search against? → A: Only group name (partial match, case-insensitive)
- Q: Should member removal (both by responsible persons and self-removal) require confirmation? → A: Show confirmation dialog before removal
- Q: What should happen to a user's group memberships and responsible person assignments when their User account is deleted? → A: Database cascade delete (remove membership and responsible person assignments)

## Requirements *(mandatory)*

### Functional Requirements

#### Data Model & Relationships

- **FR-001**: System MUST create a new database model `GroupMember` to track user membership in groups with fields: id (String/cuid), userId (String, foreign key to User), groupId (String, foreign key to Group), joinedAt (DateTime)
- **FR-002**: System MUST create a new database model `GroupResponsibleUser` to link User accounts as responsible persons for groups with fields: id (String/cuid), userId (String, foreign key to User), groupId (String, foreign key to Group), assignedAt (DateTime)
- **FR-003**: System MUST maintain the existing `ResponsiblePerson` model for backwards compatibility with email-based responsible persons
- **FR-004**: System MUST support a group having both email-based responsible persons (ResponsiblePerson records) and user account-based responsible persons (GroupResponsibleUser records) simultaneously
- **FR-005**: When a User is assigned as a responsible person via GroupResponsibleUser, the system MUST NOT create a duplicate ResponsiblePerson entry
- **FR-006**: System MUST automatically create a GroupMember record when a User is assigned as a responsible person (responsible persons are automatically members)
- **FR-006a**: When a User account is deleted, the system MUST cascade delete all associated GroupMember records (removing all group memberships)
- **FR-006b**: When a User account is deleted, the system MUST cascade delete all associated GroupResponsibleUser records (removing all responsible person assignments)

#### User Group Membership

- **FR-007**: Authenticated users MUST be able to join any group with status=ACTIVE without requiring approval
- **FR-008**: System MUST prevent duplicate memberships (unique constraint on userId + groupId in GroupMember)
- **FR-009**: When a user joins a group, the system MUST send email notifications to all responsible persons (both email-based ResponsiblePerson records and user account-based GroupResponsibleUser records)
- **FR-010**: The email notification MUST include: (1) new member's full name (User.firstName + User.lastName), (2) group name, (3) join timestamp formatted in German (e.g., "03.11.2025 um 14:30 Uhr"), (4) direct link to the group's member management page in the portal (e.g., "/portal/gruppen/[groupId]/mitglieder")
- **FR-011**: Users MUST be able to view a list of all their group memberships in the "Meine Gruppen" tab
- **FR-011a**: Regular members (non-responsible persons) MUST be able to leave groups by themselves (self-removal) without requiring approval from responsible persons. *Implementation Note: While self-removal is a MUST requirement, it can be implemented after basic join functionality (US1) as it provides an independent exit path that doesn't block core membership features.*
- **FR-011b**: Self-removal MUST show a confirmation dialog before removing the user from the group
- **FR-011c**: When a user confirms leaving a group, the system MUST immediately remove their GroupMember record

#### Responsible Person Permissions

- **FR-012**: Users assigned as responsible persons MUST be able to edit all fields of their assigned groups including: name, slug, description, logoUrl, recurring meeting details, and metadata
- **FR-013**: Responsible persons MUST be able to add and remove other responsible persons (both email-based and user account-based) for their assigned groups, but MUST NOT be able to remove themselves
- **FR-014**: Responsible persons MUST NOT be able to delete groups (that permission remains admin-only)
- **FR-015**: Responsible persons MUST NOT be able to archive groups (that permission remains admin-only)
- **FR-016**: Responsible persons MUST NOT be able to edit groups they are not assigned to
- **FR-017**: Responsible persons MUST be able to view all members of their assigned groups
- **FR-018**: Responsible persons MUST be able to remove regular members from their assigned groups with a confirmation dialog displayed before removal
- **FR-019**: Responsible persons MUST NOT be able to remove themselves from the group membership (they remain members as long as they are responsible persons)
- **FR-020**: Responsible persons MUST NOT be able to remove other responsible persons from the members table (responsible person management is separate from member management)

#### Admin Portal Enhancements

- **FR-021**: Admins MUST be able to assign existing user accounts as responsible persons for groups through the admin portal
- **FR-022**: Admins MUST be able to remove user account-based responsible person assignments through the admin portal
- **FR-023**: The admin portal group management interface MUST display both email-based responsible persons and user account-based responsible persons
- **FR-024**: The admin portal MUST visually distinguish between email-based and user account-based responsible persons using the following pattern: (1) Email-based entries display the email address with an envelope icon (Mail/Email MUI icon) and label "E-Mail Kontakt", (2) User account-based entries display the user's full name with a person icon (Person/AccountCircle MUI icon) and label "Benutzerkonto", (3) both types should be clearly separated or tagged with chips/badges showing their type

#### User Portal - Group Browsing & Navigation

- **FR-025**: The user portal MUST add a new main navigation menu item labeled "Gruppen"
- **FR-026**: The "Gruppen" page MUST display two tabs: "Alle Gruppen" and "Meine Gruppen"
- **FR-027**: The "Alle Gruppen" tab MUST display only groups with status=ACTIVE
- **FR-028**: The "Alle Gruppen" tab MUST include a search field that filters groups by name using partial match and case-insensitive comparison
- **FR-029**: The "Alle Gruppen" tab MUST display a "Beitreten" button for groups the user is not a member of
- **FR-030**: The "Alle Gruppen" tab MUST display a membership indicator (e.g., "Bereits Mitglied") for groups the user is already a member of
- **FR-031**: The "Meine Gruppen" tab MUST display all groups where the user is either a member or a responsible person
- **FR-032**: The "Meine Gruppen" tab MUST include a search field that filters groups by name using partial match and case-insensitive comparison
- **FR-033**: The "Meine Gruppen" tab MUST display a visual indicator (e.g., "Verantwortlich" badge) for groups where the user is a responsible person
- **FR-034**: The "Gruppen" page UI MUST follow the patterns from the existing admin groups page (tabs and accordions) adapted for the user portal

#### User Portal - Group Detail Pages

- **FR-035**: Clicking on a group in "Meine Gruppen" MUST navigate to a dedicated group detail page in the user portal
- **FR-036**: The group detail page MUST display a nested submenu with at least the following items: "Übersicht", "Mitglieder", and placeholder items for future features
- **FR-037**: Placeholder submenu items MUST be labeled appropriately for future functionality (e.g., "Dateien", "Termine", "Kommunikation") and display a standardized placeholder message. Each placeholder page MUST show: (1) a centered info icon or construction icon, (2) heading "Demnächst verfügbar", (3) descriptive text explaining the planned feature (e.g., "Hier können Sie in Zukunft Dateien mit Ihrer Gruppe teilen"), (4) the placeholder MUST use Material UI's Paper or Card component for consistent styling
- **FR-038**: The "Mitglieder" submenu section MUST display a table listing all group members
- **FR-039**: The members table MUST include columns for: member name, join date, and role indicator
- **FR-040**: The members table MUST display a visual indicator (e.g., "Verantwortlich" badge) for members who are also responsible persons
- **FR-041**: The members table MUST display a "Entfernen" button for each regular member (visible only to responsible persons)
- **FR-042**: The members table MUST NOT display a "Entfernen" button for responsible persons in the member list
- **FR-043**: The members table MUST support pagination if displaying more than 50 members
- **FR-044**: Regular members (non-responsible persons) MUST be able to view the members table but MUST NOT see remove buttons
- **FR-045**: The group detail page MUST display an "Bearbeiten" button that is only visible to responsible persons of that group
- **FR-045a**: The group detail page or "Meine Gruppen" list MUST display a "Verlassen" button for regular members (non-responsible persons) to leave the group. *Cross-reference: This requirement implements the self-removal functionality defined in FR-011a through FR-011c.*
- **FR-045b**: The "Verlassen" button MUST NOT be displayed to responsible persons (they cannot leave while assigned as responsible persons)

#### Group Editing in User Portal

- **FR-046**: Responsible persons MUST be able to access a group editing form from the group detail page
- **FR-047**: The group editing form in the user portal MUST allow editing of: name, slug, description, logo, and meeting details
- **FR-048**: The group editing form MUST validate all inputs using the same validation rules as the admin portal
- **FR-049**: The group editing form MUST support managing responsible persons (both adding/removing email-based and user account-based)
- **FR-050**: The group editing form MUST NOT display delete or archive buttons to responsible persons

#### Privacy & Visibility

- **FR-051**: Group membership information (who is a member of which group) MUST only be visible within the user portal
- **FR-052**: Public-facing pages MUST NOT display group membership lists or member counts
- **FR-053**: Responsible person information MUST remain visible in public contexts (as currently implemented)

### Key Entities *(include if feature involves data)*

- **GroupMember**: Represents a user's membership in a group. Attributes: unique identifier, reference to User, reference to Group, timestamp of when they joined. Relationships: belongs to one User, belongs to one Group. Unique constraint on (userId, groupId) pair.

- **GroupResponsibleUser**: Represents a user account assigned as a responsible person for a group. Attributes: unique identifier, reference to User, reference to Group, timestamp of assignment. Relationships: belongs to one User, belongs to one Group. Unique constraint on (userId, groupId) pair.

- **User** (existing): Gains new relationships: can be a member of multiple groups (via GroupMember), can be a responsible person for multiple groups (via GroupResponsibleUser).

- **Group** (existing): Gains new relationships: has many members (via GroupMember), has many user-based responsible persons (via GroupResponsibleUser). Retains existing relationship with email-based responsible persons (ResponsiblePerson).

- **ResponsiblePerson** (existing): Continues to represent email-based responsible person contacts. No changes to this model, maintained for backwards compatibility.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Authenticated users can join an active group in under 5 seconds from viewing the group list to seeing membership confirmation
- **SC-002**: Users assigned as responsible persons can successfully edit their assigned groups and see changes reflected immediately
- **SC-003**: Responsible persons receive email notifications within 2 minutes when a new member joins their group
- **SC-004**: The members table displays all group members with correct role indicators for groups with up to 500 members without performance degradation
- **SC-005**: Search functionality in "Alle Gruppen" and "Meine Gruppen" returns filtered results in under 1 second
- **SC-006**: Responsible persons can remove a group member in under 10 seconds from clicking remove to seeing the updated members table
- **SC-007**: The group detail page with nested navigation loads completely in under 2 seconds
- **SC-008**: Zero data integrity issues with backward compatibility - all existing groups with email-based responsible persons continue functioning without errors
- **SC-009**: 100% of join attempts either succeed or fail with clear error messages (no silent failures or unclear states)

## Assumptions

- The existing User model has firstName and lastName fields populated (as indicated by the schema)
- The user portal already supports nested menu structures as mentioned in the requirements
- The existing email sending infrastructure can handle additional notification types for group membership
- The GroupSettings.officeContactEmail is used as a fallback "from" address for group notifications if no responsible person email is available
- User accounts have valid email addresses (required by the User model's unique email constraint)
- The React Hook Form and Material UI patterns from the admin portal can be reused in the user portal
- Performance is acceptable with up to 1000 members per group; beyond that, advanced pagination/virtualization may be needed
- The existing authentication and session management handles user portal access control
- File storage for future group features (mentioned as placeholders) will use the existing Vercel Blob Storage pattern

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
