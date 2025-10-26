# Tasks: Refactor Member Portal Navigation

**Input**: Design documents from `/specs/008-refactor-member-portal/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: This project uses manual testing only (per Constitution Principle II). No automated test tasks are included.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `- [ ] [ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Extract and centralize type definitions for reusability

- [X] T001 [P] Extract MenuItem types from src/components/layout/MainLayout.tsx and add to src/types/component-types.ts with JSDoc comments
- [X] T002 [P] Update src/components/layout/MainLayout.tsx to import MenuItem types from @/types/component-types
- [X] T003 [P] Verify no TypeScript errors in MainLayout.tsx after type extraction by running npm run check

**Checkpoint**: Type definitions centralized and reusable across components

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Create reusable base navigation component that all portal pages will use

**⚠️ CRITICAL**: This phase MUST be complete before any user story implementation

- [X] T004 Create BaseNavigation component in src/components/portal/BaseNavigation.tsx with MenuItem rendering logic
- [X] T005 Implement submenu state management (openSubmenus Record) in BaseNavigation.tsx
- [X] T006 Implement toggleSubmenu function for expanding/collapsing submenus in BaseNavigation.tsx
- [X] T007 Implement isRouteActive function for active route detection in BaseNavigation.tsx
- [X] T008 Implement responsive layout logic (icon-only mobile, full desktop) using useMediaQuery in BaseNavigation.tsx
- [X] T009 Implement LinkMenuItem rendering with Button component and Link integration in BaseNavigation.tsx
- [X] T010 Implement DividerMenuItem rendering with MUI Divider component in BaseNavigation.tsx
- [X] T011 Implement SubmenuMenuItem rendering with Collapse component and recursive item rendering in BaseNavigation.tsx
- [X] T012 Add ARIA attributes for accessibility (aria-label, aria-expanded, aria-current) in BaseNavigation.tsx
- [X] T013 Add JSDoc documentation to all functions in BaseNavigation.tsx
- [X] T014 Verify BaseNavigation.tsx is under 500 lines and passes npm run check

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Horizontal Navigation Menu (Priority: P1) 🎯 MVP

**Goal**: Members access the portal and see a horizontal navigation menu similar to the admin portal, with clear icons and labels that adapt to mobile devices

**Independent Test**: Log in as a member user and verify that the horizontal navigation bar appears at the top with responsive behavior on different screen sizes (320px, 600px, 960px, 1280px, 1920px)

### Implementation for User Story 1

- [X] T015 [P] [US1] Create default navigation items array in src/components/portal/PortalNavigation.tsx with home, dashboard, and settings submenu
- [X] T016 [P] [US1] Import required Material UI icons (HomeIcon, DashboardIcon, SettingsIcon, PersonIcon) in PortalNavigation.tsx
- [X] T017 [US1] Refactor PortalNavigation.tsx to use BaseNavigation component with horizontal layout
- [X] T018 [US1] Remove sidebar drawer implementation (lines 70-121, 123-155) from PortalNavigation.tsx
- [X] T019 [US1] Remove mobileOpen state and handleDrawerToggle function (lines 60, 62-64) from PortalNavigation.tsx
- [X] T020 [US1] Remove Drawer imports and unused sidebar-related components from PortalNavigation.tsx
- [X] T021 [US1] Update PortalNavigation.tsx to pass currentPath from usePathname to BaseNavigation
- [X] T022 [US1] Verify PortalNavigation.tsx renders horizontal navigation bar with navigation items
- [X] T023 [US1] Update src/app/portal/layout.tsx to remove sidebar flex layout (lines 23-26)
- [X] T024 [US1] Replace sidebar layout with top navigation layout in src/app/portal/layout.tsx
- [X] T025 [US1] Remove margin-left offset (ml: { xs: 0, md: '250px' }) from main content Box in layout.tsx
- [X] T026 [US1] Verify layout.tsx renders navigation at top with content below
- [X] T027 [US1] Add JSDoc documentation to PortalNavigation component
- [X] T028 [US1] Verify PortalNavigation.tsx is under 500 lines and passes npm run check
- [ ] T029 [US1] Test horizontal navigation on mobile (320px width) - verify icon-only buttons with tooltips
- [ ] T030 [US1] Test horizontal navigation on desktop (1920px width) - verify full buttons with icons and labels
- [ ] T031 [US1] Test active state highlighting by navigating between portal pages
- [ ] T032 [US1] Test responsive behavior by resizing browser window across breakpoints

**Checkpoint**: User Story 1 complete - horizontal navigation functional on all screen sizes

---

## Phase 4: User Story 2 - Reusable Layout Components (Priority: P1)

**Goal**: The portal uses consistent, reusable layout components that match admin portal patterns, allowing easy addition of new portal sections in the future

**Independent Test**: Verify that common components (page headers, content containers) exist and can be reused across different portal pages

### Implementation for User Story 2

- [X] T033 [P] [US2] Create PortalPageHeader component in src/components/portal/PortalPageHeader.tsx with title, icon, and optional action button props
- [X] T034 [P] [US2] Add responsive Typography variants in PortalPageHeader.tsx (h4 mobile, h3 desktop)
- [X] T035 [US2] Add icon support with proper spacing in PortalPageHeader.tsx
- [X] T036 [US2] Add JSDoc documentation to PortalPageHeader component
- [X] T037 [US2] Verify PortalPageHeader.tsx is under 500 lines (estimated ~80 lines)
- [X] T038 [US2] Update src/app/portal/page.tsx to use Container component with maxWidth="lg"
- [X] T039 [US2] Update src/app/portal/page.tsx navigation instruction text from "Menü auf der linken Seite" to "Menü oben"
- [X] T040 [US2] Verify portal page.tsx follows consistent layout pattern with proper spacing
- [ ] T041 [US2] Test PortalPageHeader component on mobile and desktop
- [ ] T042 [US2] Test Container component max-width behavior on different screen sizes
- [ ] T043 [US2] Verify all user-facing text is in German

**Checkpoint**: User Story 2 complete - reusable layout components available for future portal pages

---

## Phase 5: User Story 3 - Mobile-First Responsive Design (Priority: P1)

**Goal**: All portal pages render correctly on mobile devices with touch-friendly controls and appropriate content reflow

**Independent Test**: Access all portal pages on various mobile devices and screen sizes (320px, 375px, 768px widths) and verify no horizontal scrolling and touch targets are at least 44x44px

### Implementation for User Story 3

- [ ] T044 [US3] Verify touch target sizes in BaseNavigation.tsx mobile buttons are minimum 48x48px
- [ ] T045 [US3] Verify gap spacing in BaseNavigation.tsx is 16px on desktop, 8px on mobile
- [ ] T046 [US3] Verify Tooltip components are properly configured for mobile icon-only buttons
- [ ] T047 [US3] Test portal on 320px viewport width - verify no horizontal scrolling
- [ ] T048 [US3] Test portal on 375px viewport width - verify button spacing and layout
- [ ] T049 [US3] Test portal on 600px viewport width - verify breakpoint transition from mobile to desktop
- [ ] T050 [US3] Test portal on 768px viewport width (tablet) - verify landscape/portrait orientation handling
- [ ] T051 [US3] Test portal on 960px viewport width - verify desktop layout
- [ ] T052 [US3] Test portal on 1280px viewport width - verify full desktop experience
- [ ] T053 [US3] Test portal on 1920px viewport width - verify max-width container behavior
- [ ] T054 [US3] Test submenu expansion on mobile - verify inline expansion with proper indentation
- [ ] T055 [US3] Test smooth layout transitions when crossing breakpoints
- [ ] T056 [US3] Verify all text is readable without zooming on mobile devices

**Checkpoint**: User Story 3 complete - mobile-first responsive design validated across all breakpoints

---

## Phase 6: User Story 4 - User Information Display (Priority: P2)

**Goal**: Members see their username and role prominently displayed in the portal interface for context and confirmation

**Independent Test**: Log in as different member users and verify their information displays correctly in the portal navigation area

### Implementation for User Story 4

- [X] T057 [P] [US4] Create PortalUserInfo component in src/components/portal/PortalUserInfo.tsx with username, role badge, and logout button
- [X] T058 [US4] Implement username display in PortalUserInfo.tsx with Typography component
- [X] T059 [US4] Implement role badge display in PortalUserInfo.tsx with Chip component and role-specific styling
- [X] T060 [US4] Add role text mapping (admin → "Administrator", mitglied → "Mitglied") in PortalUserInfo.tsx
- [X] T061 [US4] Implement mobile adaptation in PortalUserInfo.tsx (show initials or condensed format on <600px)
- [X] T062 [US4] Add JSDoc documentation to PortalUserInfo component
- [X] T063 [US4] Verify PortalUserInfo.tsx is under 500 lines (estimated ~100 lines)
- [X] T064 [US4] Update PortalNavigation.tsx to include PortalUserInfo component in top-right corner
- [X] T065 [US4] Add flexbox layout in PortalNavigation.tsx with justifyContent="space-between" for nav items and user info
- [X] T066 [US4] Move user session data (username, role) from layout.tsx to PortalNavigation component props
- [ ] T067 [US4] Test user info display on desktop - verify username and role badge are visible
- [ ] T068 [US4] Test user info display on mobile - verify condensed format
- [ ] T069 [US4] Test with admin user - verify "Administrator" role badge
- [ ] T070 [US4] Test with mitglied user - verify "Mitglied" role badge
- [ ] T071 [US4] Verify all user-facing text (role labels) is in German

**Checkpoint**: User Story 4 complete - user information prominently displayed in navigation

---

## Phase 7: User Story 5 - Logout Functionality (Priority: P2)

**Goal**: Members can easily log out of the portal from any page with clear visual indication of the logout action

**Independent Test**: Click the logout button from various portal pages and verify redirect to the login page with proper session termination

### Implementation for User Story 5

- [X] T072 [US5] Import LogoutIcon from @mui/icons-material/Logout in PortalUserInfo.tsx
- [X] T073 [US5] Add IconButton for logout with LogoutIcon in PortalUserInfo.tsx
- [X] T074 [US5] Add aria-label="Abmelden" to logout IconButton for accessibility
- [X] T075 [US5] Implement onLogout prop handler in PortalUserInfo.tsx
- [X] T076 [US5] Move handleLogout function from old PortalNavigation.tsx (lines 66-68) to new PortalNavigation component
- [X] T077 [US5] Ensure handleLogout calls signOut with callbackUrl: '/login'
- [X] T078 [US5] Verify logout button is consistently positioned across all portal pages
- [ ] T079 [US5] Test logout from portal home page - verify redirect to /login
- [ ] T080 [US5] Test logout from portal dashboard page - verify redirect to /login
- [ ] T081 [US5] Test logout from portal settings page - verify redirect to /login
- [ ] T082 [US5] Test logout on mobile - verify button is accessible and functional
- [ ] T083 [US5] Test logout on desktop - verify smooth redirect
- [ ] T084 [US5] Verify session is properly terminated after logout (cannot access /portal without re-login)
- [ ] T085 [US5] Verify logout button tooltip displays "Abmelden" in German

**Checkpoint**: User Story 5 complete - logout functionality working across all portal pages

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final cleanup, validation, and documentation

- [X] T086 [P] Remove all dead code from previous sidebar implementation in PortalNavigation.tsx
- [X] T087 [P] Remove unused imports from PortalNavigation.tsx
- [X] T088 [P] Verify all files are under 500 lines (BaseNavigation ~250, PortalNavigation ~150, PortalPageHeader ~80, PortalUserInfo ~100)
- [X] T089 [P] Verify all component props match contracts in specs/008-refactor-member-portal/contracts/
- [X] T090 [P] Verify all user-facing text is in German across all components
- [X] T091 [P] Run npm run check and fix any lint or type errors
- [X] T092 [P] Verify no console.log statements in production code (use logger if needed)
- [X] T093 [P] Verify all imports use @/ path alias
- [ ] T094 Test complete portal navigation flow end-to-end (login → navigate → submenu → logout)
- [ ] T095 Test edge case: extremely long username (50+ characters) - verify UI handles gracefully
- [ ] T096 Test edge case: adding 8+ navigation items - verify layout doesn't break
- [ ] T097 Test edge case: 280px viewport (older mobile devices) - verify basic functionality
- [ ] T098 Verify quickstart.md instructions work by following them to add a test navigation item
- [ ] T099 Final validation on all success criteria from spec.md (SC-001 through SC-010)
- [ ] T100 Update agent context by running .specify/scripts/bash/update-agent-context.sh claude

**Checkpoint**: Feature complete, validated, and ready for production

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup (Phase 1) completion - BLOCKS all user stories
- **User Stories (Phases 3-7)**: All depend on Foundational (Phase 2) completion
  - User Story 1 (P1): Can start after Phase 2
  - User Story 2 (P1): Can start after Phase 2
  - User Story 3 (P1): Depends on User Story 1 completion (needs BaseNavigation implementation)
  - User Story 4 (P2): Can start after Phase 2
  - User Story 5 (P2): Depends on User Story 4 completion (uses PortalUserInfo component)
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (US1)**: Depends on Foundational phase - Creates horizontal navigation
- **User Story 2 (US2)**: Depends on Foundational phase - Creates reusable components
- **User Story 3 (US3)**: Depends on User Story 1 - Validates responsive behavior of navigation
- **User Story 4 (US4)**: Depends on Foundational phase - Creates user info display
- **User Story 5 (US5)**: Depends on User Story 4 - Adds logout to user info component

### Within Each User Story

- Phase 1: Type extraction tasks can run in parallel
- Phase 2: BaseNavigation implementation is sequential (each task builds on previous)
- Phase 3 (US1): Navigation item creation (T015-T016) can run in parallel, implementation is sequential
- Phase 4 (US2): PortalPageHeader creation and page updates can run in parallel
- Phase 5 (US3): All testing tasks can run in parallel
- Phase 6 (US4): PortalUserInfo creation (T057-T063) is sequential, testing tasks can run in parallel
- Phase 7 (US5): Implementation is sequential, testing tasks can run in parallel
- Phase 8: Most polish tasks can run in parallel

### Parallel Opportunities

**Phase 1 - All tasks in parallel**:
```bash
Task T001: "Extract MenuItem types"
Task T002: "Update MainLayout imports"
Task T003: "Verify no TypeScript errors"
```

**Phase 4 (US2) - Component creation and page updates**:
```bash
Task T033: "Create PortalPageHeader component"
Task T038: "Update portal page.tsx to use Container"
```

**Phase 5 (US3) - All testing tasks**:
```bash
Task T047-T056: All viewport and responsiveness tests
```

**Phase 8 - Cleanup and validation**:
```bash
Task T086-T093: All code cleanup and validation tasks
```

---

## Parallel Example: User Story 1 (Horizontal Navigation)

```bash
# Create navigation items and imports in parallel:
Task T015: "Create default navigation items array in PortalNavigation.tsx"
Task T016: "Import required Material UI icons in PortalNavigation.tsx"

# After navigation refactoring complete, run all testing tasks in parallel:
Task T029: "Test horizontal navigation on mobile (320px width)"
Task T030: "Test horizontal navigation on desktop (1920px width)"
Task T031: "Test active state highlighting"
Task T032: "Test responsive behavior across breakpoints"
```

---

## Implementation Strategy

### MVP First (User Stories 1-3 Only)

**Recommended approach**: Deliver core navigation functionality first

1. Complete Phase 1: Setup (Type extraction)
2. Complete Phase 2: Foundational (BaseNavigation component)
3. Complete Phase 3: User Story 1 (Horizontal navigation)
4. Complete Phase 4: User Story 2 (Reusable components)
5. Complete Phase 5: User Story 3 (Mobile-first validation)
6. **STOP and VALIDATE**: Test navigation thoroughly on all devices
7. Deploy/demo MVP - members can now navigate portal with modern horizontal menu

**MVP Delivers**: Fully functional, responsive horizontal navigation matching admin portal design

### Incremental Delivery

1. **Foundation** (Phases 1-2) → Types extracted, BaseNavigation ready
2. **MVP** (Phases 3-5) → Horizontal navigation, reusable components, responsive design validated
3. **Enhancement 1** (Phase 6) → User info display added
4. **Enhancement 2** (Phase 7) → Logout functionality added
5. **Polish** (Phase 8) → Final validation and cleanup

Each increment adds value without breaking previous functionality.

### Parallel Team Strategy

With 2-3 developers available:

**Week 1**: Setup + Foundational (together)
- All developers: Complete Phases 1-2 as a team
- Critical: BaseNavigation must be solid before splitting work

**Week 2**: User Stories (parallel)
- Developer A: User Story 1 (T015-T032) - Horizontal navigation
- Developer B: User Story 2 (T033-T043) - Reusable components
- Developer C: User Story 4 (T057-T071) - User info display

**Week 3**: Integration and Polish
- Developer A: User Story 3 (T044-T056) - Responsive validation
- Developer B: User Story 5 (T072-T085) - Logout functionality
- Developer C: Phase 8 (T086-T100) - Polish and validation

---

## Notes

- **[P] tasks**: Different files, no dependencies - safe to run in parallel
- **[Story] label**: Maps task to specific user story (US1-US5) for traceability
- **Independent testing**: Each user story should be independently testable
- **Commit frequently**: Commit after each task or logical group
- **Checkpoints**: Stop at each checkpoint to validate story independently
- **File size limits**: Monitor BaseNavigation.tsx (~250 lines target), keep under 500
- **Type safety**: NO `any` types - check src/types/ before creating new types
- **German text**: ALL user-facing text must be in German
- **Path aliases**: Use @/ for all imports in src/

## Constitutional Compliance Reminders

When implementing tasks, MUST follow the project constitution (`.specify/memory/constitution.md`):

**Code Organization** (Principles IX, XI):
- NO file over 500 lines - refactor into modules if needed
- Components in `src/components/portal/` directory
- Types in `src/types/component-types.ts`
- NO database operations needed for this feature

**Type Safety** (Principles I, XII):
- CHECK `src/types/component-types.ts` for existing MenuItem types
- NO `any` types - use strict TypeScript
- Reuse UserRole type from `src/types/user.ts`

**Validation & Logging** (Principles VII, VIII):
- No server-side validation needed (navigation is client-side UI)
- Use `logger` from `@/lib/logger.ts` if logging needed (minimal for UI components)

**User Experience** (Principle VI):
- ALL user-facing text MUST be in German:
  - Navigation labels: "Startseite", "Dashboard", "Einstellungen"
  - Role badges: "Administrator", "Mitglied"
  - Tooltips: "Abmelden", etc.

**Code Quality** (Principles III, IV, V, X):
- Use `@/` imports for all components and types
- Reuse MainLayout submenu patterns (DRY principle)
- Keep BaseNavigation simple and focused (KISS principle)
- Add JSDoc to all component props and functions

**Testing** (Principle II):
- NO automated tests - this project uses manual testing only
- All testing tasks are manual validation steps

Run `npm run check` (lint + typecheck) before committing each phase. NEVER use `npm run build` or `npm run db:push` solely for validation.

---

## Task Count Summary

- **Total Tasks**: 100
- **Phase 1 (Setup)**: 3 tasks
- **Phase 2 (Foundational)**: 11 tasks
- **Phase 3 (US1 - Horizontal Navigation)**: 18 tasks
- **Phase 4 (US2 - Reusable Components)**: 11 tasks
- **Phase 5 (US3 - Mobile-First Design)**: 13 tasks
- **Phase 6 (US4 - User Info Display)**: 15 tasks
- **Phase 7 (US5 - Logout Functionality)**: 14 tasks
- **Phase 8 (Polish)**: 15 tasks

**Parallel Opportunities**: 25 tasks marked [P] can run in parallel with other tasks in their phase

**MVP Scope**: Tasks T001-T056 (56 tasks) deliver the core navigation functionality

**Suggested First Milestone**: Complete Phases 1-5 (Tasks T001-T056) for fully functional horizontal navigation with responsive design
