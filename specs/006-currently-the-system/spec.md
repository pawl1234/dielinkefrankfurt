# Feature Specification: Member Portal with Role-Based Access

**Feature Branch**: `006-currently-the-system`
**Created**: 2025-10-16
**Status**: Draft
**Input**: User description: "Currently the system has an public interface and an admin interface. I want to extend the system with a user interface for members of the party. The goal is to develop an authenticated user portal and give it an initialy design. It should include a menu system and a start page with basic information. We will expand the feature set of the user interface in the future. Prepare it to be modular and extensible. Therefore we also need to change the role concept an introduce the new role mitglied. User accounts with admin or mitglied role can login to the user portal. Therefore we also need to change the authentication implementation. It might be that we will have more roles in the future. Build an extensible system. Also set the foundation to have a clear seperaion between admin api's and user portal api's its important for me to have a secure seggregation of the different porpuses. Users will be managed by the admin via the admin interface. Also for now its enough to add new users via the admin interface."

## Execution Flow (main)
```
1. Parse user description from Input
   → Feature description provided
2. Extract key concepts from description
   → Actors: Members (mitglied), Admins
   → Actions: Login, navigate portal, view information, manage users
   → Data: User accounts with roles, portal content
   → Constraints: Modular/extensible design, secure API segregation
3. For each unclear aspect:
   → Marked with [NEEDS CLARIFICATION: specific question]
4. Fill User Scenarios & Testing section
   → User flows identified for member login and portal navigation
5. Generate Functional Requirements
   → Each requirement testable
6. Identify Key Entities
   → User with role, portal content
7. Run Review Checklist
   → Check for ambiguities and implementation details
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

---

## Clarifications

### Session 2025-10-16
- Q: When an administrator changes a user's role while that user is actively logged in, what should happen to their active session? → A: Session remains valid with old role until user logs out and logs back in
- Q: How should forgotten password situations be handled initially? → A: Admins manually reset passwords through admin interface
- Q: Should there be confirmation or safeguards when an administrator deletes a user account? → A: Confirmation dialog + prevent self-deletion
- Q: How should the system handle concurrent logins from the same user account? → A: Multiple concurrent sessions are allowed (JWT-based stateless authentication)
- Q: What content should appear on the member portal start page after login? → A: Welcome message + navigation instructions only
- Note: Reuse existing user management interface in admin interface (extend with role field)

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story
Party members need a dedicated authenticated portal where they can access member-specific information and functionality. The portal should be separate from the public-facing website and the admin dashboard. Members log in with credentials managed by administrators and can navigate through a menu system to access various sections. Initially, the portal provides basic information on a start page, with the architecture supporting future expansion of member-specific features.

### Acceptance Scenarios

#### Member Portal Access
1. **Given** a party member has received login credentials from an administrator, **When** they navigate to the member portal login page, **Then** they can enter their credentials and access the member portal
2. **Given** a member is logged into the portal, **When** they view the start page, **Then** they see a welcome message and navigation instructions
3. **Given** a member is logged into the portal, **When** they interact with the navigation menu, **Then** they can navigate between different sections of the member portal
4. **Given** an administrator is logged in, **When** they access the member portal login page, **Then** they can also log into the member portal using their admin credentials

#### User Management by Admins
5. **Given** an administrator is logged into the admin interface, **When** they navigate to user management, **Then** they can create new user accounts with either "admin" or "mitglied" role
6. **Given** an administrator is creating a new user, **When** they assign a role, **Then** they can choose from available roles (initially "admin" and "mitglied")
7. **Given** an administrator is managing users, **When** they view the user list, **Then** they can see all users with their assigned roles
8. **Given** an administrator is editing a user, **When** they change the user's role, **Then** the new role takes effect on the user's next login (active sessions continue with previous role)
9. **Given** a user has forgotten their password, **When** they contact an administrator, **Then** the administrator can reset the user's password through the admin interface
10. **Given** an administrator attempts to delete a user account, **When** they confirm the deletion dialog, **Then** the account is deleted (unless attempting to delete their own account)
11. **Given** an administrator attempts to delete their own account, **When** they try to do so, **Then** the system prevents the deletion

#### Security and Segregation
12. **Given** a member is logged into the member portal, **When** they attempt to access admin-only functionality, **Then** the system prevents access and shows appropriate feedback
13. **Given** any user attempts to access portal functionality without authentication, **When** they try to view member portal pages, **Then** they are redirected to the login page
14. **Given** a user has an active session, **When** they log in again from a different location or browser, **Then** both sessions remain active (JWT-based stateless sessions)

### Edge Cases
- When a user account has its role changed while they are logged in, the active session continues with the old role until JWT token expires
- System prevents administrators from deleting their own account
- What happens when a member's account is deactivated or deleted? [NEEDS CLARIFICATION: Should there be account deactivation vs. deletion?]
- When a user logs in while already having an active session, both sessions remain active (no server-side session tracking)
- When a user forgets their password, administrators must reset it manually through the admin interface
- Password changes do not invalidate existing JWT tokens (sessions remain valid until JWT expiration)

## Requirements *(mandatory)*

### Functional Requirements

#### Authentication & Authorization
- **FR-001**: System MUST support role-based access control with at least two roles: "admin" and "mitglied"
- **FR-002**: System MUST allow users with "admin" role to access both the admin interface and the member portal
- **FR-003**: System MUST allow users with "mitglied" role to access only the member portal
- **FR-004**: System MUST prevent unauthenticated users from accessing member portal pages
- **FR-005**: System MUST redirect unauthenticated users attempting to access the member portal to a login page
- **FR-006**: System MUST maintain separate authentication contexts for public, member portal, and admin interfaces
- **FR-007**: When a user's role is changed, active sessions MUST continue with the original role until JWT token expires
- **FR-008**: System MUST use JWT-based stateless authentication (multiple concurrent sessions allowed)
- **FR-009**: System MUST support future addition of new user roles without requiring major restructuring [NEEDS CLARIFICATION: What are anticipated future roles?]

#### Member Portal Interface
- **FR-010**: System MUST provide a dedicated member portal accessible at a distinct URL path
- **FR-011**: Member portal MUST include a navigation menu system for accessing different sections
- **FR-012**: Member portal MUST include a start page displayed after successful login
- **FR-013**: Start page MUST display a welcome message in German and navigation instructions
- **FR-014**: Portal interface MUST be designed to support modular addition of new features and sections
- **FR-015**: All user-facing text in the member portal MUST be in German

#### User Management
- **FR-016**: Administrators MUST be able to create new user accounts through existing admin user management interface
- **FR-017**: When creating a user, administrators MUST assign a role from available options
- **FR-018**: Administrators MUST be able to view a list of all user accounts with their roles
- **FR-019**: Administrators MUST be able to edit existing user accounts, including changing roles
- **FR-020**: Administrators MUST be able to reset user passwords through the admin interface
- **FR-021**: Administrators MUST be able to delete user accounts with confirmation dialog
- **FR-022**: System MUST prevent administrators from deleting their own account
- **FR-023**: User accounts MUST store credentials securely [note: implementation detail avoided, but security requirement stated]
- **FR-024**: System MUST validate user credentials during login attempts

#### API Security & Segregation
- **FR-025**: System MUST maintain separate API endpoints for admin operations and member portal operations
- **FR-026**: Admin-specific API endpoints MUST be accessible only to users with admin role
- **FR-027**: Member portal API endpoints MUST be accessible to users with either admin or mitglied role
- **FR-028**: Public API endpoints MUST remain accessible without authentication
- **FR-029**: System MUST enforce authorization checks at the API level, not just at the UI level

#### System Architecture
- **FR-030**: Portal architecture MUST support addition of new features without modifying core authentication or navigation structure
- **FR-031**: System MUST maintain clear separation between public, member, and admin functionality
- **FR-032**: Navigation menu MUST be configurable to accommodate future feature additions [NEEDS CLARIFICATION: Should menu configuration be managed by admins or only through code?]

### Key Entities

- **User Account**: Represents an authenticated user of the system with assigned role(s) determining access permissions. Key attributes include credentials (username/email), password, assigned role, account status. Managed exclusively by administrators through the admin interface.

- **User Role**: Defines access permissions and capabilities within the system. Initially includes "admin" (full access to admin interface and member portal) and "mitglied" (access to member portal only). Must support future expansion to additional roles.

- **Portal Section**: Represents a navigable area within the member portal. Initially includes start page displaying welcome message and navigation instructions. Architecture must support adding new sections modularly.

- **Portal Navigation Item**: Represents an entry in the member portal navigation menu. Links to portal sections and can be organized hierarchically for future expansion.

---

## Review & Acceptance Checklist

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed
- [x] User-facing text considerations in German

### Requirement Completeness
- [ ] No [NEEDS CLARIFICATION] markers remain (3 deferred clarifications)
- [x] Requirements are verifiable through manual testing
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified
- [x] Aligned with constitution principles (simplicity, no automated tests)

---

## Execution Status

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Critical clarifications resolved (5 questions answered)

---

## Deferred Clarifications

The following questions can be addressed during planning phase as they are lower impact or have reasonable defaults:

1. **Account Lifecycle** (Edge Cases, line 81): Should there be account deactivation vs. permanent deletion?
   - *Deferral rationale*: Can default to deletion-only initially; deactivation can be added later if needed

2. **Future Roles** (FR-009, line 98): What are anticipated future roles beyond admin and mitglied?
   - *Deferral rationale*: System designed for extensibility; specific roles can be defined when requirements emerge

3. **Menu Configuration** (FR-032, line 129): Should navigation menu configuration be managed by admins through UI or only through code?
   - *Deferral rationale*: Code-based configuration is simpler initially; admin UI can be added in future iteration
