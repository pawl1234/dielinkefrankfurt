# Feature Specification: Refactor Member Portal (Mitgliederportal)

**Feature Branch**: `008-refactor-member-portal`
**Created**: 2025-10-23
**Status**: Draft
**Input**: User description: "In the last sessions we extended the role based login system to support the role "Mitglied" which was created for the use of the Mitgliederportal. In the same run there was a basic Mitgliederportal created here @src/app/portal This does not follow the design principles of this project. I want to refactor this portal to have a similar styling as the admin portal. So a horizontal menu with space below for the content. I want you to reuse existing components, or build reusable components to make this portal easily extensible over the next weeks. The user portal should follow modern design principles reuse existing patterns and be designd for responsiveness from the start (mobile first). As this is a new start I want to make sure we following next.js typescript and MUI best practices."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Horizontal Navigation Menu (Priority: P1)

Members access the portal and see a horizontal navigation menu similar to the admin portal, with clear icons and labels that adapt to mobile devices.

**Why this priority**: Navigation is the foundation of the entire portal experience. Without proper navigation, members cannot access any portal features. This establishes the visual consistency with the admin portal and provides the framework for all future features.

**Independent Test**: Can be fully tested by logging in as a member user and verifying that the horizontal navigation bar appears at the top with responsive behavior on different screen sizes. Delivers immediate value by providing familiar, consistent navigation patterns.

**Acceptance Scenarios**:

1. **Given** a member is logged in and accesses `/portal`, **When** the page loads on desktop, **Then** a horizontal navigation menu appears at the top with icon buttons, labels, and proper spacing
2. **Given** a member is logged in and accesses `/portal`, **When** the page loads on mobile (screen width < 600px), **Then** the navigation shows icon-only buttons with tooltips in a compact layout
3. **Given** a member is viewing the portal, **When** they click a navigation item, **Then** the current page is highlighted and navigation occurs smoothly
4. **Given** a member resizes the browser window, **When** crossing mobile/desktop breakpoints, **Then** the navigation layout adapts without page reload

---

### User Story 2 - Reusable Layout Components (Priority: P1)

The portal uses consistent, reusable layout components that match admin portal patterns, allowing easy addition of new portal sections in the future.

**Why this priority**: Reusable components are essential for maintainability and rapid feature development. This establishes the component architecture that all future portal features will depend on, preventing technical debt and ensuring consistency.

**Independent Test**: Can be tested by verifying that common components (page headers, notifications, content containers) exist and can be reused across different portal pages. Delivers value by reducing future development time and ensuring visual consistency.

**Acceptance Scenarios**:

1. **Given** a developer wants to add a new portal page, **When** they use the reusable layout components, **Then** the page automatically follows the established design patterns without custom styling
2. **Given** multiple portal pages exist, **When** viewing them sequentially, **Then** all pages share consistent spacing, typography, and layout structure
3. **Given** a portal page needs to display a notification, **When** using the notification component, **Then** it appears in the same location and style as admin notifications
4. **Given** a portal page has a section header, **When** using the page header component, **Then** it displays with the same typography and icon patterns as the admin portal

---

### User Story 3 - Mobile-First Responsive Design (Priority: P1)

All portal pages render correctly on mobile devices with touch-friendly controls and appropriate content reflow.

**Why this priority**: Many members will access the portal from mobile devices. Mobile-first design ensures accessibility for all users and prevents future responsive design issues. This is critical for user adoption and satisfaction.

**Independent Test**: Can be tested by accessing all portal pages on various mobile devices and screen sizes (320px, 375px, 768px widths). Delivers value by ensuring all members can use the portal regardless of device.

**Acceptance Scenarios**:

1. **Given** a member accesses the portal on a smartphone, **When** viewing any page, **Then** all content is readable without horizontal scrolling and buttons are at least 44x44px for touch targets
2. **Given** a member views the portal on a tablet, **When** rotating the device, **Then** the layout adapts to portrait/landscape orientation appropriately
3. **Given** a member uses a small mobile device (320px width), **When** navigating the portal, **Then** no content overflows and all features remain accessible
4. **Given** a member gradually resizes their browser window, **When** crossing breakpoints (600px, 960px, 1280px), **Then** layout transitions occur smoothly without visual glitches

---

### User Story 4 - User Information Display (Priority: P2)

Members see their username and role prominently displayed in the portal interface for context and confirmation.

**Why this priority**: User context is important for member confidence and orientation, but can be implemented after the core navigation and layout are established. This enhances the user experience but is not blocking for basic portal functionality.

**Independent Test**: Can be tested by logging in as different member users and verifying their information displays correctly in the portal header or navigation area. Delivers value by providing user context and role confirmation.

**Acceptance Scenarios**:

1. **Given** a member is logged in, **When** viewing any portal page, **Then** their username is displayed prominently in the navigation or header area
2. **Given** a member has the "Mitglied" role, **When** viewing the portal, **Then** their role badge displays as "Mitglied" with appropriate styling
3. **Given** an admin user accesses the portal, **When** viewing their profile information, **Then** their role badge displays as "Administrator" with admin-specific styling
4. **Given** a member views their user information, **When** on mobile devices, **Then** the user info remains visible but uses condensed formatting

---

### User Story 5 - Logout Functionality (Priority: P2)

Members can easily log out of the portal from any page with clear visual indication of the logout action.

**Why this priority**: Logout is a standard security feature but is not immediately needed for testing the core layout and navigation. It can be implemented after the main UI structure is complete.

**Independent Test**: Can be tested by clicking the logout button from various portal pages and verifying redirect to the login page with proper session termination. Delivers value by providing secure session management.

**Acceptance Scenarios**:

1. **Given** a member is logged in to the portal, **When** they click the logout button, **Then** their session ends and they are redirected to `/login`
2. **Given** a member logs out, **When** attempting to access portal pages directly via URL, **Then** they are redirected to the login page
3. **Given** a member is on any portal page, **When** looking for the logout option, **Then** it is consistently located in the same position across all pages
4. **Given** a member clicks logout on mobile, **When** the action completes, **Then** the logout confirmation is clear and the redirect occurs smoothly

---

### Edge Cases

- What happens when a member has an extremely long username (50+ characters)?
- How does the navigation handle when more than 8 navigation items are added in the future?
- What happens when a member's session expires while they are viewing a portal page?
- How does the layout handle content that exceeds the viewport height on various screen sizes?
- What happens when a member accesses the portal with JavaScript disabled?
- How does the portal handle extremely narrow viewports (280px - older mobile devices)?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Portal MUST use a horizontal navigation menu at the top of the page, matching the visual style of the admin portal
- **FR-002**: Portal navigation MUST display icon buttons with labels on desktop (screen width ≥ 600px)
- **FR-003**: Portal navigation MUST display icon-only buttons with tooltips on mobile (screen width < 600px)
- **FR-004**: Portal MUST reuse existing Material UI theme configuration from admin portal (primary color #FF0000, secondary #006473, Dosis font)
- **FR-005**: Portal layout MUST follow the admin portal pattern: navigation at top, content below in a Container component
- **FR-006**: Portal MUST provide reusable layout components (PortalPageHeader, PortalNotification) following admin component patterns
- **FR-007**: Portal MUST use TypeScript with NO `any` types, using proper type definitions from `src/types/`
- **FR-008**: Portal MUST implement mobile-first responsive design with breakpoints at 600px (sm), 960px (md), and 1280px (lg)
- **FR-009**: Portal MUST display current user's username and role in the interface
- **FR-010**: Portal MUST provide a logout button accessible from all portal pages
- **FR-011**: Portal MUST use server-side session validation in layout.tsx using `getServerSession()`
- **FR-012**: Portal MUST redirect unauthenticated users to `/login?callbackUrl=/portal`
- **FR-013**: Portal MUST use `@/` path aliases for all imports
- **FR-014**: Portal navigation MUST highlight the currently active page
- **FR-015**: Portal MUST maintain session state across all portal pages
- **FR-016**: Portal layout components MUST be extractable and reusable for future portal features
- **FR-017**: Portal MUST use Material UI components exclusively, no custom CSS files
- **FR-018**: All user-facing text MUST be in German
- **FR-019**: Portal MUST support touch-friendly controls on mobile (minimum 44x44px touch targets)
- **FR-020**: Portal MUST prevent horizontal scrolling on all screen sizes
- **FR-021**: Portal navigation MUST use consistent spacing and alignment with admin portal (gap of 16px on desktop, 8px on mobile)
- **FR-022**: Portal MUST render all content within Material UI Container component with appropriate max-width
- **FR-023**: Portal MUST follow Next.js App Router conventions (Server Components by default, 'use client' only when needed)

### Key Entities *(include if feature involves data)*

- **Portal User Session**: Contains username, role (admin or mitglied), user ID, email, and authentication status
- **Navigation Item**: Contains label (German text), href (page route), icon (Material UI icon), and active state
- **Portal Page**: Contains page content, header with title/icon, and notification system

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Members can access all portal pages on mobile devices (320px width) without horizontal scrolling
- **SC-002**: Portal navigation responds to screen size changes within 100ms of resize event
- **SC-003**: All portal navigation buttons have minimum 44x44px touch targets on mobile devices
- **SC-004**: Portal pages load with consistent layout patterns matching admin portal visual design
- **SC-005**: Developers can add a new portal page using reusable components in under 15 minutes
- **SC-006**: Portal TypeScript compilation completes with zero type errors
- **SC-007**: All portal pages pass responsive design testing at breakpoints: 320px, 375px, 600px, 960px, 1280px, 1920px
- **SC-008**: Member users can complete navigation between portal sections in under 2 seconds
- **SC-009**: Portal code follows project conventions with no files exceeding 500 lines
- **SC-010**: Portal logout successfully terminates session and redirects to login page in under 1 second

## Assumptions

- The existing authentication system (NextAuth.js with "mitglied" role) is already implemented and functional
- The Material UI theme configuration in `src/theme/theme.ts` will be reused without modifications
- The admin portal's AdminNavigation component serves as the design reference for the portal navigation
- Future portal features (dashboard widgets, member-specific functionality) will be added in subsequent iterations
- The current portal has a sidebar navigation that will be completely replaced with horizontal navigation
- The project's path alias configuration (`@/`) is already set up in tsconfig.json
- The PortalNavigation component currently uses a sidebar pattern that needs to be refactored to horizontal layout
- Session management and authentication middleware are already configured for `/portal/*` routes
- The portal will initially have minimal navigation items (Home, future placeholders) with more added over time

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
