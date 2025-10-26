# Implementation Plan: Refactor Member Portal Navigation

**Branch**: `008-refactor-member-portal` | **Date**: 2025-10-23 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/008-refactor-member-portal/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Refactor the member portal (`/portal`) to use horizontal navigation matching the admin portal design, replacing the current sidebar approach. Create reusable navigation components supporting submenu functionality, implement mobile-first responsive design, and ensure visual consistency with the admin portal while removing all dead code from the previous implementation.

**Primary Goal**: Transform the portal from sidebar navigation to horizontal navigation with submenu support, following admin portal patterns (AdminNavigation.tsx), Material UI best practices, and mobile-first responsive design principles.

**Technical Approach**: Extract and adapt navigation patterns from MainLayout.tsx and AdminNavigation.tsx, create a centralized BaseNavigation component supporting both link and submenu items, implement responsive breakpoints (600px, 960px, 1280px), and integrate with existing authentication/session management.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), Next.js 15 with App Router + React 18
**Primary Dependencies**: Material UI (MUI) v5, NextAuth.js v4, React Hook Form, Zod
**Storage**: PostgreSQL via Prisma (no new data models - uses existing User session)
**Testing**: Manual testing only (per constitution Principle II)
**Target Platform**: Web (mobile-first responsive: 320px to 1920px+)
**Project Type**: Web application (Next.js App Router)
**Performance Goals**:
- Navigation render: <100ms
- Navigation interaction response: <50ms
- Responsive layout transitions: <100ms
- Mobile touch targets: minimum 44x44px
- Zero horizontal scrolling on all screen sizes

**Constraints**:
- MUST reuse MainLayout.tsx patterns without creating duplicate components
- MUST maintain visual consistency with admin portal (AdminNavigation.tsx)
- MUST support nested submenu functionality (1 level deep)
- MUST preserve existing authentication/session management
- NO files over 500 lines (constitution Principle IX)
- ALL user-facing text in German (constitution Principle VI)

**Scale/Scope**:
- 3-5 initial navigation items with room for 8+ future items
- Support for 2-3 submenu items per parent menu item
- Responsive across 6 breakpoints (320px, 375px, 600px, 960px, 1280px, 1920px)
- Expected users: 50-200 members accessing portal

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

This feature MUST comply with the project constitution at `.specify/memory/constitution.md`. Review all 12 core principles and ensure compliance:

| Principle | Requirement | Compliance Status |
|-----------|-------------|-------------------|
| I. Type Safety First | No `any` type; use strict TypeScript; reuse types from `src/types/` | ✅ PASS - Reusing NavigationItem types from component-types.ts |
| II. No Software Tests | Do NOT create test files or testing infrastructure | ✅ PASS - Manual testing only |
| III. KISS Principle | Simplest solution preferred; avoid over-engineering | ✅ PASS - Adapting existing patterns, no new abstractions |
| IV. DRY Principle | Reuse existing code from `src/lib/`, `src/types/`, `src/components/` | ✅ PASS - Reusing MainLayout & AdminNavigation patterns |
| V. Path Aliases | Use `@/` imports; follow Next.js conventions | ✅ PASS - All imports use @/ prefix |
| VI. German User-Facing Text | All UI text MUST be in German | ⚠ VERIFY - Check all labels, tooltips, aria-labels |
| VII. Structured Logging | Use `logger` from `@/lib/logger.ts` (no `console.log`) | ✅ PASS - Navigation is UI-only, minimal logging needed |
| VIII. Server-Side Validation | MUST validate with Zod schemas from `src/lib/validation/` | ✅ N/A - No form submissions in navigation component |
| IX. File Size Limit | NO file over 500 lines; split into modules if needed | ⚠ VERIFY - Monitor BaseNavigation.tsx, PortalLayout.tsx |
| X. Code Documentation | JSDoc for all functions; avoid excessive comments | ⚠ VERIFY - Add JSDoc to new components |
| XI. Domain-Based Architecture | Organize by domain; DB operations in `db/`; follow structure | ✅ PASS - Components in src/components/portal/ |
| XII. Centralized Types | Check `src/types/` before creating new types; no duplicates | ⚠ VERIFY - Check component-types.ts for MenuItem definitions |

**Validation Commands**:
- MUST run `npm run check` before committing (runs lint + typecheck)
- NEVER run `npm run build` or `npm run db:push` solely for validation

**Gate Status**: ⚠ CONDITIONAL PASS - Proceed to Phase 0 with verification requirements flagged above

## Project Structure

### Documentation (this feature)

```text
specs/008-refactor-member-portal/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output - Component pattern analysis
├── data-model.md        # Phase 1 output - Navigation data structures
├── quickstart.md        # Phase 1 output - Developer guide for adding menu items
├── contracts/           # Phase 1 output - Component prop contracts
│   ├── BaseNavigation.ts        # BaseNavigation component contract
│   ├── PortalNavigation.ts      # PortalNavigation component contract
│   └── MenuItem.ts              # MenuItem type definitions
└── tasks.md             # Phase 2 output - NOT created by /speckit.plan
```

### Source Code (repository root)

```text
src/
├── app/
│   └── portal/
│       ├── layout.tsx                    # MODIFY: Replace sidebar with horizontal nav
│       └── page.tsx                      # MODIFY: Update content for new layout
│
├── components/
│   ├── layout/
│   │   └── MainLayout.tsx               # REFERENCE: Study submenu patterns
│   ├── admin/
│   │   └── AdminNavigation.tsx          # REFERENCE: Study horizontal nav patterns
│   └── portal/
│       ├── BaseNavigation.tsx           # CREATE: Reusable navigation base component
│       ├── PortalNavigation.tsx         # MODIFY: Refactor to use BaseNavigation
│       ├── PortalPageHeader.tsx         # CREATE: Reusable page header component
│       └── WelcomeMessage.tsx           # KEEP: No changes needed
│
└── types/
    └── component-types.ts               # MODIFY: Add MenuItem, SubmenuItem interfaces
```

**Structure Decision**: Single project structure (Next.js App Router) with components organized under `src/components/portal/`. The portal follows the same architectural patterns as admin sections, with layout at app level and reusable components in dedicated directories.

**Key Files**:
- **MainLayout.tsx (lines 41-67, 134-246)**: Contains submenu implementation with `SubmenuMenuItem` type, `openSubmenus` state management, and `Collapse` component for expandable submenus
- **AdminNavigation.tsx (lines 1-117)**: Horizontal navigation pattern with icon buttons, responsive mobile/desktop layouts, active state highlighting
- **PortalNavigation.tsx (current)**: Sidebar-based navigation to be refactored
- **portal/layout.tsx (current)**: Uses sidebar layout with left margin offset to be replaced with top navigation

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | No constitutional violations | N/A |

**Justification**: All implementation choices align with constitutional principles. Reusing existing patterns (KISS, DRY), following established architecture (domain-based), maintaining type safety (no `any` types), and keeping files under 500 lines through proper modularization.

## Phase 0: Research & Analysis

### Research Tasks

1. **Navigation Pattern Analysis**
   - **Task**: Extract and document submenu implementation from MainLayout.tsx
   - **Focus Areas**:
     - `MenuItem` type definition (lines 42-67): LinkMenuItem, DividerMenuItem, SubmenuMenuItem
     - Submenu state management: `openSubmenus` state (line 134), `toggleSubmenu` function (lines 148-153)
     - Submenu rendering: Collapse component (lines 237-241), recursive rendering (lines 161-246)
     - Active state detection: `isRouteActive` function (lines 155-159), nested item highlighting (lines 208-210)
   - **Deliverable**: Document submenu patterns in research.md

2. **Horizontal Navigation Pattern Analysis**
   - **Task**: Extract and document horizontal navigation from AdminNavigation.tsx
   - **Focus Areas**:
     - Responsive layout: mobile vs desktop rendering (lines 82-114)
     - Icon-only mobile buttons with tooltips (lines 83-100)
     - Desktop buttons with startIcon and labels (lines 102-113)
     - Active state styling (lines 86, 104, 109)
     - Flexbox layout patterns (lines 75-81)
   - **Deliverable**: Document horizontal navigation patterns in research.md

3. **Type Definitions Survey**
   - **Task**: Search `src/types/component-types.ts` for existing navigation-related types
   - **Focus Areas**:
     - Check for MenuItem, NavigationItem, or similar interfaces
     - Check for BreadcrumbItem (referenced in MainLayout.tsx line 115)
     - Identify reusable vs. component-specific types
   - **Deliverable**: Document existing types and identify gaps in research.md

4. **Responsive Breakpoint Strategy**
   - **Task**: Document Material UI breakpoint usage in existing navigation components
   - **Focus Areas**:
     - MUI breakpoints: xs (<600px), sm (600px), md (960px), lg (1280px)
     - Mobile-first vs desktop-first patterns
     - Touch target sizes for mobile (44x44px minimum)
     - Tooltip vs label strategies for compact layouts
   - **Deliverable**: Define breakpoint strategy in research.md

5. **Dead Code Identification**
   - **Task**: Identify all code in current portal implementation that will be replaced
   - **Focus Areas**:
     - Current PortalNavigation.tsx sidebar implementation (lines 70-154)
     - Portal layout.tsx sidebar layout (lines 23-41)
     - Unused imports or utilities
     - Any portal-specific styling that conflicts with new horizontal approach
   - **Deliverable**: List dead code to be removed in research.md

### Research Unknowns to Resolve

| Unknown | Research Question | Expected Resolution |
|---------|------------------|---------------------|
| Submenu activation | Should submenus open on click, hover, or both? | Click-only (mobile-friendly, following MainLayout pattern) |
| Mobile submenu display | How to display submenus on mobile with limited space? | Expand inline with indentation (following MainLayout mobile pattern) |
| Navigation position | Should navigation be sticky/fixed or scroll with page? | Static at top (following AdminNavigation pattern, no fixed positioning) |
| Session handling | Where to display user info with horizontal nav? | Top-right corner in navigation bar (not in menu drawer) |
| Icon library | Which Material UI icons to use for example menu items? | Reuse existing icons: HomeIcon, DashboardIcon, SettingsIcon, PersonIcon |

### Phase 0 Deliverables

**File**: `specs/008-refactor-member-portal/research.md`

**Structure**:
```markdown
# Research: Portal Navigation Refactoring

## Decision: Navigation Pattern
- **Chosen**: Horizontal navigation with click-to-expand submenus
- **Rationale**: Matches admin portal, mobile-friendly, follows established MainLayout patterns
- **Alternatives Considered**: Mega menu (too complex), hover menus (not mobile-friendly), sidebar (current implementation to be replaced)

## Decision: Submenu Implementation
- **Chosen**: Material UI Collapse component with recursive rendering
- **Rationale**: Already implemented in MainLayout.tsx, proven pattern, accessible
- **Alternatives Considered**: Custom CSS transitions (reinventing the wheel), Menu component (not suitable for navigation)

## Decision: Responsive Strategy
- **Chosen**: Icon-only buttons with tooltips on mobile (<600px), full buttons with icons+labels on desktop
- **Rationale**: Matches AdminNavigation pattern, saves mobile space, maintains usability
- **Alternatives Considered**: Hamburger menu (extra click), always show labels (too wide on mobile)

## Decision: Type Organization
- **Chosen**: Define MenuItem types in component-types.ts, reuse across components
- **Rationale**: Constitutional principle XII (centralized types), enables reuse in admin + portal
- **Alternatives Considered**: Portal-specific types (duplication), inline types (not reusable)

## Best Practices: Material UI Navigation
- Use `selected` prop on ListItemButton/Button for active state
- Use Tooltip component for icon-only buttons (accessibility)
- Use `component={Link}` prop for Next.js routing (no full page reload)
- Use `useMediaQuery` hook for responsive behavior
- Minimum 44x44px touch targets for mobile (per WCAG 2.1)

## Integration Patterns: Next.js + MUI
- Server Components for layout (session fetching)
- Client Components for interactive navigation ('use client')
- usePathname hook for active route detection
- Container component for content max-width consistency
```

## Phase 1: Design & Contracts

### Data Model

**File**: `specs/008-refactor-member-portal/data-model.md`

```markdown
# Data Model: Navigation Components

## Entity: BaseMenuItem (Union Type)

Base discriminated union for all navigation items.

**Fields**:
- `type`: 'link' | 'divider' | 'submenu' (discriminator)
- `key`: string (unique identifier for React keys and submenu state)

## Entity: LinkMenuItem extends BaseMenuItem

Represents a single navigation link.

**Fields**:
- `type`: 'link' (literal)
- `key`: string
- `label`: string (German text, e.g., "Startseite")
- `href`: string (Next.js route, e.g., "/portal")
- `icon`: ReactNode (MUI icon component)

**Validation Rules**:
- `label`: Non-empty string, max 30 characters (fits in button)
- `href`: Must start with "/" (absolute path)
- `icon`: Must be valid React element

**Example**:
```typescript
{
  type: 'link',
  key: 'home',
  label: 'Startseite',
  href: '/portal',
  icon: <HomeIcon />
}
```

## Entity: DividerMenuItem extends BaseMenuItem

Represents a visual separator in the menu.

**Fields**:
- `type`: 'divider' (literal)
- `key`: string (for React key uniqueness)

**Example**:
```typescript
{
  type: 'divider',
  key: 'divider-1'
}
```

## Entity: SubmenuMenuItem extends BaseMenuItem

Represents a parent menu item with nested children.

**Fields**:
- `type`: 'submenu' (literal)
- `key`: string (used for open/close state tracking)
- `label`: string (German text, e.g., "Einstellungen")
- `icon`: ReactNode (MUI icon component)
- `items`: MenuItem[] (array of nested items, typically LinkMenuItem)

**Validation Rules**:
- `label`: Non-empty string, max 30 characters
- `items`: Non-empty array (at least 1 item)
- `items`: Cannot contain SubmenuMenuItem (no nested submenus - keep it simple)

**State Transitions**:
- Closed (default) → Open (on click)
- Open → Closed (on click)
- Closes automatically when navigating to child route (optional UX enhancement)

**Example**:
```typescript
{
  type: 'submenu',
  key: 'settings',
  label: 'Einstellungen',
  icon: <SettingsIcon />,
  items: [
    { type: 'link', key: 'profile', label: 'Profil', href: '/portal/profile', icon: <PersonIcon /> },
    { type: 'link', key: 'privacy', label: 'Datenschutz', href: '/portal/privacy', icon: <LockIcon /> }
  ]
}
```

## Entity: NavigationConfig

Configuration object for portal navigation.

**Fields**:
- `items`: MenuItem[] (top-level navigation items)
- `username`: string (from session)
- `role`: UserRole ('admin' | 'mitglied')

**Example**:
```typescript
const navigationConfig: NavigationConfig = {
  items: [
    { type: 'link', key: 'home', label: 'Startseite', href: '/portal', icon: <HomeIcon /> },
    { type: 'link', key: 'dashboard', label: 'Dashboard', href: '/portal/dashboard', icon: <DashboardIcon /> },
    {
      type: 'submenu',
      key: 'settings',
      label: 'Einstellungen',
      icon: <SettingsIcon />,
      items: [
        { type: 'link', key: 'profile', label: 'Profil', href: '/portal/profile', icon: <PersonIcon /> }
      ]
    },
    { type: 'divider', key: 'div-1' }
  ],
  username: 'max.mustermann',
  role: 'mitglied'
};
```
```

### API Contracts

**Directory**: `specs/008-refactor-member-portal/contracts/`

**File 1**: `MenuItem.ts`
```typescript
import { ReactNode } from 'react';

/**
 * Base interface for all navigation items
 */
export interface BaseMenuItem {
  type: 'link' | 'divider' | 'submenu';
  key: string;
}

/**
 * Single navigation link
 */
export interface LinkMenuItem extends BaseMenuItem {
  type: 'link';
  label: string;
  href: string;
  icon?: ReactNode;
}

/**
 * Visual separator
 */
export interface DividerMenuItem extends BaseMenuItem {
  type: 'divider';
}

/**
 * Submenu with nested items
 */
export interface SubmenuMenuItem extends BaseMenuItem {
  type: 'submenu';
  label: string;
  icon?: ReactNode;
  items: MenuItem[];
}

/**
 * Discriminated union of all menu item types
 */
export type MenuItem = LinkMenuItem | DividerMenuItem | SubmenuMenuItem;
```

**File 2**: `BaseNavigation.ts`
```typescript
import { MenuItem } from './MenuItem';

/**
 * Base navigation component props
 */
export interface BaseNavigationProps {
  /**
   * Navigation items to render
   */
  items: MenuItem[];

  /**
   * Currently active path (from usePathname)
   */
  currentPath: string;

  /**
   * Responsive behavior mode
   * @default 'horizontal'
   */
  layout?: 'horizontal' | 'vertical';

  /**
   * Show icons only on mobile
   * @default true
   */
  compactMobile?: boolean;

  /**
   * Custom active item styles
   */
  activeStyles?: {
    backgroundColor?: string;
    color?: string;
    fontWeight?: string;
  };
}
```

**File 3**: `PortalNavigation.ts`
```typescript
import { UserRole } from '@/types/user';
import { MenuItem } from './MenuItem';

/**
 * Portal navigation component props
 */
export interface PortalNavigationProps {
  /**
   * Current user's username
   */
  username: string;

  /**
   * Current user's role
   */
  role: UserRole;

  /**
   * Optional additional navigation items (beyond defaults)
   */
  additionalItems?: MenuItem[];
}

/**
 * Portal user info display props
 */
export interface PortalUserInfoProps {
  username: string;
  role: UserRole;
  onLogout: () => void;
}
```

### Quickstart Guide

**File**: `specs/008-refactor-member-portal/quickstart.md`

```markdown
# Quickstart: Adding Portal Navigation Items

## Overview

This guide shows how to add new navigation items to the member portal (`/portal`).

## Prerequisites

- Familiarity with TypeScript and React
- Understanding of Next.js App Router
- Knowledge of Material UI components

## Adding a Simple Link

**File**: `src/components/portal/PortalNavigation.tsx`

1. Import the icon:
```typescript
import NewIcon from '@mui/icons-material/NewIcon';
```

2. Add the link to `navigationItems` array:
```typescript
const navigationItems: MenuItem[] = [
  // ... existing items
  {
    type: 'link',
    key: 'my-feature',
    label: 'Meine Funktion',
    href: '/portal/my-feature',
    icon: <NewIcon />
  }
];
```

3. Create the page at `src/app/portal/my-feature/page.tsx`

## Adding a Submenu

1. Import icons for parent and children:
```typescript
import ParentIcon from '@mui/icons-material/ParentIcon';
import Child1Icon from '@mui/icons-material/Child1Icon';
import Child2Icon from '@mui/icons-material/Child2Icon';
```

2. Add the submenu:
```typescript
const navigationItems: MenuItem[] = [
  // ... existing items
  {
    type: 'submenu',
    key: 'my-section',
    label: 'Meine Sektion',
    icon: <ParentIcon />,
    items: [
      {
        type: 'link',
        key: 'subsection-1',
        label: 'Unterbereich 1',
        href: '/portal/my-section/sub1',
        icon: <Child1Icon />
      },
      {
        type: 'link',
        key: 'subsection-2',
        label: 'Unterbereich 2',
        href: '/portal/my-section/sub2',
        icon: <Child2Icon />
      }
    ]
  }
];
```

3. Create pages for each subitem

## Adding a Divider

```typescript
const navigationItems: MenuItem[] = [
  // ... items before divider
  {
    type: 'divider',
    key: 'divider-1'
  },
  // ... items after divider
];
```

## Best Practices

- Keep labels short (max 30 characters)
- Use semantic, descriptive keys
- Choose appropriate Material UI icons
- Maintain alphabetical or logical ordering
- Test on mobile (320px width) and desktop (1920px width)
- Ensure all text is in German
- Run `npm run check` before committing

## Example: Complete Navigation

```typescript
import HomeIcon from '@mui/icons-material/Home';
import DashboardIcon from '@mui/icons-material/Dashboard';
import SettingsIcon from '@mui/icons-material/Settings';
import PersonIcon from '@mui/icons-material/Person';
import SecurityIcon from '@mui/icons-material/Security';

const navigationItems: MenuItem[] = [
  {
    type: 'link',
    key: 'home',
    label: 'Startseite',
    href: '/portal',
    icon: <HomeIcon />
  },
  {
    type: 'link',
    key: 'dashboard',
    label: 'Dashboard',
    href: '/portal/dashboard',
    icon: <DashboardIcon />
  },
  {
    type: 'submenu',
    key: 'settings',
    label: 'Einstellungen',
    icon: <SettingsIcon />,
    items: [
      {
        type: 'link',
        key: 'profile',
        label: 'Profil',
        href: '/portal/settings/profile',
        icon: <PersonIcon />
      },
      {
        type: 'link',
        key: 'security',
        label: 'Sicherheit',
        href: '/portal/settings/security',
        icon: <SecurityIcon />
      }
    ]
  },
  {
    type: 'divider',
    key: 'divider-1'
  }
];
```
```

### Agent Context Update

After completing Phase 1 design, run the agent context update script:

```bash
.specify/scripts/bash/update-agent-context.sh claude
```

**Expected Updates to `.specify/templates/agent-file-template.md`**:
- Add "BaseNavigation component pattern (horizontal + submenu support)" to Active Technologies
- Add "MenuItem discriminated union (LinkMenuItem, DividerMenuItem, SubmenuMenuItem)" to Active Technologies
- Update recent changes to reflect portal navigation refactoring

## Phase 2: Task Planning (NOT DONE BY /speckit.plan)

**Note**: Phase 2 (task generation) is executed by the `/speckit.tasks` command, NOT by `/speckit.plan`.

The tasks.md file will be generated based on the design artifacts created in Phase 1 (data-model.md, contracts/, quickstart.md) and will include:
- Component creation tasks
- Refactoring tasks
- Dead code removal tasks
- Testing tasks (manual)
- Documentation tasks

## Re-evaluation: Constitution Check

*After completing Phase 1 design, re-check constitutional compliance*

| Principle | Post-Design Status | Notes |
|-----------|-------------------|-------|
| I. Type Safety First | ✅ PASS | All types defined in contracts/, no `any` usage |
| II. No Software Tests | ✅ PASS | Manual testing only |
| III. KISS Principle | ✅ PASS | Reusing proven patterns, no unnecessary complexity |
| IV. DRY Principle | ✅ PASS | BaseNavigation is reusable across portal sections |
| V. Path Aliases | ✅ PASS | All imports use @/ prefix |
| VI. German User-Facing Text | ⚠ VERIFY | Review example menu items in implementation |
| VII. Structured Logging | ✅ PASS | UI components, minimal logging needed |
| VIII. Server-Side Validation | ✅ N/A | No form submissions |
| IX. File Size Limit | ✅ PASS | BaseNavigation ~250 lines, PortalNavigation ~150 lines (estimated) |
| X. Code Documentation | ✅ PASS | JSDoc provided in contracts/ |
| XI. Domain-Based Architecture | ✅ PASS | Components in src/components/portal/ |
| XII. Centralized Types | ✅ PASS | Types defined in contracts/, will move to component-types.ts |

**Final Gate Status**: ✅ PASS - Ready for implementation

## Success Metrics

From spec.md success criteria, the following metrics will validate this implementation:

- **SC-001**: Mobile navigation (320px) renders without horizontal scrolling
- **SC-002**: Navigation responds to resize within 100ms
- **SC-003**: All touch targets meet 44x44px minimum
- **SC-004**: Visual consistency with admin portal achieved
- **SC-005**: New navigation items can be added in <15 minutes
- **SC-006**: Zero TypeScript errors (`npm run check`)
- **SC-007**: Responsive testing at all breakpoints passes
- **SC-008**: Navigation transitions complete in <2 seconds
- **SC-009**: All files stay under 500 lines
- **SC-010**: Logout functionality works in <1 second

## Implementation Notes

### Dead Code Removal Checklist
- Current PortalNavigation.tsx sidebar implementation (lines 70-154)
- Portal layout.tsx sidebar offset styles (line 35: `ml: { xs: 0, md: '250px' }`)
- Drawer-based navigation components (lines 139-152 in PortalNavigation.tsx)
- Mobile menu button with fixed positioning (lines 126-136)
- Any portal-specific sidebar styles

### Integration Points
- Session data from layout.tsx (lines 15-20) - reuse for user info display
- NextAuth signOut function (line 67 in PortalNavigation.tsx) - move to user info component
- Container/Box layout from page.tsx (lines 27-33) - maintain content container pattern

### Responsive Strategy Details
- **Mobile (<600px)**: Icon-only buttons, tooltips on hover/tap, submenu expands inline
- **Tablet (600-960px)**: Icon + label buttons, compact spacing, horizontal layout
- **Desktop (>960px)**: Full buttons with icons + labels, generous spacing, horizontal layout

### Accessibility Considerations
- All icon buttons MUST have aria-label or Tooltip
- Submenu buttons MUST have aria-expanded attribute
- Active navigation items MUST have aria-current="page"
- Keyboard navigation MUST work (Tab, Enter, Space)
- Color contrast MUST meet WCAG AA standards (4.5:1 text, 3:1 UI components)

## Next Steps

1. User approves this plan
2. Execute `/speckit.tasks` to generate detailed implementation tasks
3. Execute `/speckit.implement` to begin implementation
4. Execute `/speckit.analyze` after implementation to verify cross-artifact consistency
