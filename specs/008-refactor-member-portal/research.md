# Research: Portal Navigation Refactoring

**Date**: 2025-10-23
**Feature**: 008-refactor-member-portal
**Phase**: Phase 0 - Research & Analysis

## Executive Summary

This research phase analyzed existing navigation patterns in MainLayout.tsx (submenu implementation) and AdminNavigation.tsx (horizontal navigation) to inform the portal navigation refactoring. Key findings: (1) MainLayout provides a proven submenu pattern using MUI Collapse and recursive rendering, (2) AdminNavigation demonstrates effective mobile-first horizontal navigation with icon-only mobile buttons, (3) Type definitions should be centralized in component-types.ts per constitutional principle XII, (4) Click-to-expand submenus are most mobile-friendly, (5) Dead code from sidebar implementation identified for removal.

## Decision: Navigation Pattern

**Chosen**: Horizontal navigation with click-to-expand submenus

**Rationale**:
- Matches admin portal visual design (AdminNavigation.tsx pattern)
- Mobile-friendly: Click interaction works consistently across touch and mouse
- Follows established MainLayout patterns already proven in production
- Maximizes vertical space for content (vs sidebar consuming horizontal space)
- Enables visual consistency between admin and portal sections

**Alternatives Considered**:
1. **Mega menu** (dropdown with multi-column layout)
   - Rejected: Too complex for portal's simple navigation needs
   - Violates KISS principle (constitutional principle III)
   - Difficult to make responsive on mobile

2. **Hover-activated menus**
   - Rejected: Not mobile-friendly (no hover on touch devices)
   - Accessibility concerns for keyboard navigation
   - Users expect click interaction for navigation

3. **Sidebar navigation** (current implementation)
   - Rejected: Consumes horizontal space on desktop
   - Inconsistent with admin portal design
   - Requires drawer component on mobile (extra complexity)
   - This is the pattern being replaced

**Implementation Notes**:
- Use Material UI Button components for horizontal layout
- Implement submenu with Collapse component (same as MainLayout)
- Active state highlighting with `selected` prop
- Responsive breakpoints at 600px (sm), 960px (md), 1280px (lg)

## Decision: Submenu Implementation

**Chosen**: Material UI Collapse component with recursive rendering

**Rationale**:
- Already successfully implemented in MainLayout.tsx (lines 237-241)
- Proven pattern with smooth animations and accessibility support
- Recursive rendering handles arbitrary depth (though we'll limit to 1 level)
- Built-in ARIA attributes for screen readers
- No need to reinvent the wheel (DRY principle - constitutional principle IV)

**Alternatives Considered**:
1. **Custom CSS transitions**
   - Rejected: Reinventing functionality already provided by MUI
   - More code to maintain, potential for accessibility issues
   - Violates DRY principle (reuse existing solutions)

2. **MUI Menu component**
   - Rejected: Designed for dropdown menus, not navigation
   - Closes on outside click (not desired for persistent navigation)
   - Positioning logic adds unnecessary complexity

3. **Accordion component**
   - Rejected: Designed for content sections, not navigation
   - Visual design doesn't match navigation patterns
   - Less flexible than Collapse for custom styling

**Implementation Pattern from MainLayout.tsx**:
```typescript
// State management (line 134)
const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({});

// Toggle function (lines 148-153)
const toggleSubmenu = (key: string) => {
  setOpenSubmenus(prev => ({
    ...prev,
    [key]: !prev[key]
  }));
};

// Rendering (lines 237-241)
<Collapse in={isOpen} timeout="auto" unmountOnExit>
  <List component="div" disablePadding>
    {item.items.map(subItem => renderMenuItem(subItem, depth + 1))}
  </List>
</Collapse>
```

**Key Features**:
- Record<string, boolean> for tracking multiple open submenus simultaneously
- `timeout="auto"` for smooth, automatic animation timing
- `unmountOnExit` to remove DOM nodes when closed (performance)
- Recursive rendering with depth tracking for indentation

## Decision: Responsive Strategy

**Chosen**: Icon-only buttons with tooltips on mobile (<600px), full buttons with icons+labels on desktop (≥600px)

**Rationale**:
- Matches AdminNavigation.tsx pattern (lines 82-114)
- Saves critical horizontal space on mobile devices
- Tooltips maintain usability and accessibility on mobile
- Desktop users benefit from full labels for clarity
- Follows mobile-first design principle (constitutional requirement)

**Alternatives Considered**:
1. **Hamburger menu with drawer**
   - Rejected: Extra click required to access navigation
   - Hides navigation items behind interaction
   - Current sidebar pattern being replaced for this reason

2. **Always show labels (overflow scroll on mobile)**
   - Rejected: Horizontal scrolling violates FR-020 requirement
   - Poor UX on mobile (users don't expect horizontal scroll in navigation)
   - Makes it difficult to see all options at once

3. **Stacked vertical navigation on mobile**
   - Rejected: Consumes too much vertical space
   - Pushes content down, reducing visible content area
   - Inconsistent layout between mobile and desktop

**Implementation Pattern from AdminNavigation.tsx**:

**Mobile (lines 83-100)**:
```typescript
isMobile ? (
  <Tooltip key={item.href} title={item.label} arrow>
    <Button
      variant={item.isActive ? "contained" : "outlined"}
      color="primary"
      component={Link}
      href={item.href}
      aria-label={item.label}
      sx={{
        minWidth: '48px',
        width: '48px',
        height: '48px',
        padding: 0
      }}
    >
      {item.icon}
    </Button>
  </Tooltip>
)
```

**Desktop (lines 102-113)**:
```typescript
<Button
  key={item.href}
  variant={item.isActive ? "contained" : "outlined"}
  color="primary"
  startIcon={item.icon}
  component={Link}
  href={item.href}
  sx={{ fontWeight: item.isActive ? 'bold' : 'normal' }}
>
  {item.label}
</Button>
```

**Breakpoint Detection**:
```typescript
const theme = useTheme();
const isMobile = useMediaQuery(theme.breakpoints.down('sm')); // <600px
```

**Touch Target Sizes**:
- Mobile buttons: 48x48px (exceeds WCAG 2.1 minimum of 44x44px)
- Desktop buttons: MUI default padding (sufficient for mouse interaction)
- Gap between buttons: 16px desktop, 8px mobile (prevents misclicks)

## Decision: Type Organization

**Chosen**: Define MenuItem types in src/types/component-types.ts, reuse across admin and portal components

**Rationale**:
- Constitutional principle XII mandates centralized type definitions
- Prevents duplicate type definitions (currently MenuItem exists in MainLayout.tsx lines 42-67)
- Enables reuse across admin navigation, portal navigation, and future components
- Single source of truth improves type safety and refactoring
- Reduces maintenance burden (changes propagate automatically)

**Alternatives Considered**:
1. **Portal-specific types in components/portal/**
   - Rejected: Violates principle XII (centralized types)
   - Creates duplication with MainLayout MenuItem types
   - Makes cross-component type sharing difficult

2. **Inline types in component files**
   - Rejected: Not reusable, violates DRY principle
   - Difficult to maintain consistency across components
   - Makes refactoring error-prone

3. **Separate navigation-types.ts file**
   - Considered: Could work but adds another type file
   - Decision: Use component-types.ts (already exists, appropriate for UI component types)
   - Keeps all component-related types together

**Type Discovery Results** (src/types/component-types.ts):
- Searched for existing MenuItem, NavigationItem, MenuItemType interfaces
- Found BreadcrumbItem interface (referenced in MainLayout.tsx line 115)
- No existing MenuItem types in component-types.ts
- Current MenuItem types only exist inline in MainLayout.tsx (lines 42-67)

**Migration Plan**:
1. Extract MenuItem types from MainLayout.tsx
2. Add to src/types/component-types.ts with JSDoc comments
3. Update MainLayout.tsx to import from centralized location
4. Update PortalNavigation.tsx to import same types
5. Future components can reuse MenuItem types

**Type Structure** (from MainLayout.tsx analysis):
```typescript
// Discriminated union base
type MenuItemType = 'link' | 'divider' | 'submenu';

interface BaseMenuItem {
  type: MenuItemType;
  key: string;
}

// Variants
interface LinkMenuItem extends BaseMenuItem {
  type: 'link';
  label: string;
  href: string;
  icon?: ReactNode;
}

interface DividerMenuItem extends BaseMenuItem {
  type: 'divider';
}

interface SubmenuMenuItem extends BaseMenuItem {
  type: 'submenu';
  label: string;
  icon?: ReactNode;
  items: MenuItem[];
}

// Union type
type MenuItem = LinkMenuItem | DividerMenuItem | SubmenuMenuItem;
```

## Decision: Navigation Position

**Chosen**: Static navigation at top of page (scrolls with content)

**Rationale**:
- Matches AdminNavigation.tsx pattern (no fixed/sticky positioning)
- Simpler implementation (no z-index management, no scroll state tracking)
- Follows KISS principle (constitutional principle III)
- Avoids layout shift issues on mobile when keyboard appears
- Content naturally flows below navigation

**Alternatives Considered**:
1. **Sticky/fixed navigation**
   - Rejected: Adds complexity (z-index layering, scroll offset calculations)
   - Can cover content on mobile when keyboard is open
   - Not necessary for portal use case (navigation pages are short)

2. **Sticky on desktop, static on mobile**
   - Rejected: Inconsistent behavior adds cognitive load
   - More complex implementation, violates KISS principle

**Implementation Notes**:
- Navigation renders at top of page layout
- Uses standard document flow (no `position: fixed` or `position: sticky`)
- Content appears below navigation with appropriate margin/padding

## Decision: User Info Display

**Chosen**: Display username and role badge in top-right corner of navigation bar, alongside logout button

**Rationale**:
- Matches admin portal pattern (user info visible at all times)
- Horizontal navigation has space for user info on the same row
- Always visible (no need to open drawer/menu)
- Logical placement next to logout button (session-related actions grouped)

**Alternatives Considered**:
1. **User info in sidebar drawer**
   - Rejected: We're removing the sidebar approach entirely
   - Hidden behind interaction, reduces visibility

2. **User info in page header (below navigation)**
   - Rejected: Takes up vertical space on every page
   - Less obvious connection to session/logout actions
   - Would require duplication on every page

3. **User dropdown menu in navigation**
   - Rejected: Adds extra click to see basic info (username/role)
   - More complex than needed for simple info display

**Implementation Pattern**:
```typescript
// Top navigation bar layout
<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
  {/* Left side: Navigation items */}
  <Box sx={{ display: 'flex', gap: 2 }}>
    {navigationItems.map(item => renderMenuItem(item))}
  </Box>

  {/* Right side: User info + logout */}
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
    <Typography variant="body2">{username}</Typography>
    <Chip label={roleLabel} size="small" color="primary" />
    <IconButton onClick={handleLogout} aria-label="Abmelden">
      <LogoutIcon />
    </IconButton>
  </Box>
</Box>
```

**Mobile Adaptation**:
- On mobile (<600px), show only initials or icon for username
- Role badge may be hidden on very small screens (show on tap/menu)
- Logout button always visible as icon button

## Decision: Icon Library

**Chosen**: Reuse Material UI icons already used in the project

**Rationale**:
- Consistency with admin portal and MainLayout
- No additional dependencies required
- Users already familiar with these icons from admin section
- Follows DRY principle (reuse existing assets)

**Selected Icons for Example Navigation**:
- **HomeIcon** (`@mui/icons-material/Home`) - Startseite (already in use)
- **DashboardIcon** (`@mui/icons-material/Dashboard`) - Dashboard page
- **SettingsIcon** (`@mui/icons-material/Settings`) - Settings submenu parent
- **PersonIcon** (`@mui/icons-material/Person`) - Profile page
- **SecurityIcon** (`@mui/icons-material/Security`) - Security settings
- **NotificationsIcon** (`@mui/icons-material/Notifications`) - Notifications
- **HelpIcon** (`@mui/icons-material/Help`) - Help section

**Icon Usage Guidelines**:
- Choose semantic icons that clearly represent the page function
- Prefer outlined variants for consistency (default MUI style)
- Ensure icon has sufficient color contrast on background
- Always pair with aria-label for accessibility

## Best Practices: Material UI Navigation

### Active State Highlighting
```typescript
// Use selected prop for Button/ListItemButton
<Button
  selected={isActive}
  sx={{
    '&.Mui-selected': {
      color: 'primary.main',
      fontWeight: 'fontWeightBold',
    }
  }}
>
```

### Accessibility with Icon-Only Buttons
```typescript
// Always include aria-label and Tooltip
<Tooltip title="Startseite" arrow>
  <IconButton aria-label="Startseite">
    <HomeIcon />
  </IconButton>
</Tooltip>
```

### Next.js Routing Integration
```typescript
// Use component prop for client-side navigation
<Button component={Link} href="/portal/dashboard">
  Dashboard
</Button>
```

### Responsive Behavior
```typescript
// Use MUI breakpoints and useMediaQuery
const theme = useTheme();
const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

// Render different layouts
{isMobile ? <IconOnlyButton /> : <FullButton />}
```

### Touch Targets for Mobile
```typescript
// Ensure minimum 44x44px per WCAG 2.1
sx={{
  minWidth: '48px',
  minHeight: '48px',
  // 48px exceeds 44px requirement, provides comfortable target
}}
```

### Submenu State Management
```typescript
// Track open state with Record<string, boolean>
const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({});

// Toggle specific submenu by key
const toggleSubmenu = (key: string) => {
  setOpenSubmenus(prev => ({ ...prev, [key]: !prev[key] }));
};

// Check if specific submenu is open
const isOpen = Boolean(openSubmenus[itemKey]);
```

### Active Route Detection with Submenus
```typescript
// Check if current route or any child route is active
const isRouteActive = (href: string): boolean => {
  if (href === '/' && pathname === '/') return true;
  if (href !== '/' && pathname?.startsWith(href)) return true;
  return false;
};

// Highlight parent menu if child is active
const hasActiveChild = item.items.some(
  subItem => subItem.type === 'link' && isRouteActive(subItem.href)
);
```

## Integration Patterns: Next.js + MUI

### Server Components for Layout
```typescript
// app/portal/layout.tsx (Server Component)
import { getServerSession } from 'next-auth';

export default async function PortalLayout({ children }) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login?callbackUrl=/portal');
  }

  return (
    <Box>
      <PortalNavigation
        username={session.user.username}
        role={session.user.role}
      />
      {children}
    </Box>
  );
}
```

### Client Components for Interactive Navigation
```typescript
// components/portal/PortalNavigation.tsx (Client Component)
'use client';

import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';

export default function PortalNavigation({ username, role }) {
  const pathname = usePathname(); // Client-side hook

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  // ... rest of component
}
```

### Container Component for Content Max-Width
```typescript
// Consistent with admin portal and public pages
<Container maxWidth="lg" sx={{ py: 4 }}>
  {children}
</Container>
```

### Theme Usage
```typescript
// Reuse theme from src/theme/theme.ts
// Primary color: #FF0000 (Die Linke red)
// Secondary color: #006473
// Typography: Dosis font family

const theme = useTheme();
// theme.palette.primary.main === '#FF0000'
// theme.breakpoints.down('sm') === media query for <600px
```

## Dead Code Identification

### Files to Modify (Remove Sidebar Code)

**1. src/components/portal/PortalNavigation.tsx**
- **Lines 70-121**: Remove sidebar drawer content (Box with width: 250)
- **Lines 123-155**: Remove drawer rendering logic (temporary drawer for mobile, permanent drawer for desktop)
- **Line 60**: Remove `mobileOpen` state (no longer needed)
- **Lines 62-64**: Remove `handleDrawerToggle` function
- **Lines 7-20**: Update imports (remove Drawer, keep only needed components)
- **Keep**: Lines 29-42 (NavigationItem interface and array structure - will adapt to MenuItem type)
- **Keep**: Lines 66-68 (handleLogout function - move to user info component)

**2. src/app/portal/layout.tsx**
- **Line 23-26**: Remove flex layout with sidebar offset
  ```typescript
  // REMOVE:
  <Box sx={{ display: 'flex', minHeight: '100vh' }}>
    <PortalNavigation ... />
    <Box component="main" sx={{ flexGrow: 1, p: 3, ml: { xs: 0, md: '250px' } }}>

  // REPLACE WITH:
  <Box sx={{ minHeight: '100vh' }}>
    <PortalNavigation ... />
    <Box component="main" sx={{ flexGrow: 1 }}>
  ```

**3. src/app/portal/page.tsx**
- **Lines 38-40**: Update text to reflect new top navigation
  ```typescript
  // OLD:
  "Nutzen Sie das Menü auf der linken Seite, um zwischen verschiedenen Bereichen zu navigieren."

  // NEW:
  "Nutzen Sie das Menü oben, um zwischen verschiedenen Bereichen zu navigieren."
  ```

### Unused Code to Remove

**PortalNavigation.tsx Specific**:
- Drawer component imports and usage
- Fixed positioning for mobile menu button (lines 126-136)
- Sidebar width calculations and offsets
- User info section inside sidebar (lines 72-84) - will move to top navigation bar

**Confirmation Checklist**:
- ✅ Remove all Drawer-related components
- ✅ Remove sidebar layout with fixed width
- ✅ Remove mobile drawer toggle state and handler
- ✅ Remove margin-left offset from main content area
- ✅ Remove fixed position menu button
- ✅ Update user-facing text referencing "left side" navigation

## Phase 0 Summary: Key Findings

### Technical Decisions Made
1. **Navigation Pattern**: Horizontal with click-to-expand submenus
2. **Submenu Implementation**: MUI Collapse with recursive rendering
3. **Responsive Strategy**: Icon-only mobile, full buttons desktop
4. **Type Organization**: Centralized in component-types.ts
5. **Navigation Position**: Static at top (not fixed/sticky)
6. **User Info Display**: Top-right corner with logout button
7. **Icon Library**: Reuse existing MUI icons

### Components to Create
- **BaseNavigation.tsx** (~250 lines): Reusable navigation base component
- **PortalPageHeader.tsx** (~80 lines): Reusable page header component
- **MenuItem types in component-types.ts** (~60 lines): Type definitions

### Components to Modify
- **PortalNavigation.tsx**: Refactor from sidebar to horizontal (reduce from 156 to ~150 lines)
- **portal/layout.tsx**: Replace sidebar layout with top navigation (reduce from 43 to ~35 lines)
- **portal/page.tsx**: Update navigation instructions text (minimal change)

### Components to Keep Unchanged
- **WelcomeMessage.tsx**: No changes needed

### Estimated File Sizes (Post-Refactor)
- BaseNavigation.tsx: ~250 lines (new, under 500 limit)
- PortalNavigation.tsx: ~150 lines (refactored, under 500 limit)
- PortalPageHeader.tsx: ~80 lines (new, under 500 limit)
- portal/layout.tsx: ~35 lines (simplified)
- component-types.ts: +60 lines (MenuItem types added)

**Constitutional Compliance**: ✅ All files remain under 500-line limit (Principle IX)

## Next Steps: Phase 1

1. Create data-model.md with MenuItem entity definitions
2. Create contracts/ directory with TypeScript interface files
3. Create quickstart.md with developer guide for adding menu items
4. Run agent context update script
5. Proceed to task generation (/speckit.tasks command)
