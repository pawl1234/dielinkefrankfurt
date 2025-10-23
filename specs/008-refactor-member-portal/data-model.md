# Data Model: Navigation Components

**Date**: 2025-10-23
**Feature**: 008-refactor-member-portal
**Phase**: Phase 1 - Design & Contracts

## Overview

This document defines the data structures for the portal navigation system. The navigation uses a discriminated union pattern to support three types of menu items: links, dividers, and submenus. All types are defined in `src/types/component-types.ts` per constitutional principle XII (centralized type definitions).

## Core Types

### BaseMenuItem

Base interface for all navigation items. Uses a discriminated union pattern with `type` as the discriminator.

**Purpose**: Provides common fields and enables TypeScript type narrowing based on the `type` field.

**Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| type | 'link' \| 'divider' \| 'submenu' | Yes | Discriminator for union type |
| key | string | Yes | Unique identifier for React keys and submenu state tracking |

**Example**:
```typescript
// Not used directly, only as base for other types
interface BaseMenuItem {
  type: 'link' | 'divider' | 'submenu';
  key: string;
}
```

---

### LinkMenuItem

Represents a single navigation link that navigates to a specific page.

**Purpose**: Primary navigation item type, represents a clickable link to a portal page.

**Fields**:
| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| type | 'link' | Yes | Literal type for discrimination | Must be exactly 'link' |
| key | string | Yes | Unique identifier | No duplicates within same navigation array |
| label | string | Yes | Display text (German) | Non-empty, max 30 characters for button fit |
| href | string | Yes | Next.js route path | Must start with "/" (absolute path) |
| icon | ReactNode | No | Material UI icon component | Must be valid React element |

**Validation Rules**:
- `label`: 1-30 characters, German text (e.g., "Startseite", "Einstellungen")
- `href`: Must be absolute path starting with "/" (e.g., "/portal", "/portal/dashboard")
- `key`: Must be unique within the navigation items array (used for React key prop)
- `icon`: When provided, should be a Material UI icon component (e.g., `<HomeIcon />`)

**Example**:
```typescript
const homeLink: LinkMenuItem = {
  type: 'link',
  key: 'home',
  label: 'Startseite',
  href: '/portal',
  icon: <HomeIcon />
};

const profileLink: LinkMenuItem = {
  type: 'link',
  key: 'profile',
  label: 'Mein Profil',
  href: '/portal/profile',
  icon: <PersonIcon />
};
```

**Usage**: Most common navigation item type, used for direct page links in navigation bar.

---

### DividerMenuItem

Represents a visual separator between groups of navigation items.

**Purpose**: Provides visual grouping and separation in navigation menus.

**Fields**:
| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| type | 'divider' | Yes | Literal type for discrimination | Must be exactly 'divider' |
| key | string | Yes | Unique identifier | No duplicates, used for React key |

**Validation Rules**:
- `key`: Must be unique within navigation items array
- Recommended naming: `'divider-1'`, `'divider-2'`, etc. for easy identification

**Example**:
```typescript
const divider: DividerMenuItem = {
  type: 'divider',
  key: 'divider-1'
};
```

**Rendering**: Typically renders as MUI `<Divider />` component with appropriate margin.

**Usage**: Sparingly used to create visual separation between functional groups of menu items.

---

### SubmenuMenuItem

Represents a parent menu item with nested child items that expand/collapse on click.

**Purpose**: Groups related navigation items under a collapsible parent menu.

**Fields**:
| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| type | 'submenu' | Yes | Literal type for discrimination | Must be exactly 'submenu' |
| key | string | Yes | Unique identifier for state tracking | No duplicates |
| label | string | Yes | Display text (German) | Non-empty, max 30 characters |
| icon | ReactNode | No | Material UI icon component | Must be valid React element |
| items | MenuItem[] | Yes | Nested menu items | Non-empty array, no nested submenus |

**Validation Rules**:
- `label`: 1-30 characters, German text (e.g., "Einstellungen", "Verwaltung")
- `key`: Must be unique, used for tracking open/closed state in `openSubmenus` Record
- `items`: Must contain at least 1 item
- `items`: Cannot contain another `SubmenuMenuItem` (no nested submenus - keeps navigation simple)
- `items`: Typically contains only `LinkMenuItem` types (DividerMenuItem can be used for visual separation)

**State Transitions**:
1. **Closed (default)**: Submenu items are hidden, expand icon shows down arrow
2. **Open**: Submenu items are visible, expand icon shows up arrow
3. Transitions occur on click of parent menu button

**Example**:
```typescript
const settingsSubmenu: SubmenuMenuItem = {
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
    },
    {
      type: 'link',
      key: 'notifications',
      label: 'Benachrichtigungen',
      href: '/portal/settings/notifications',
      icon: <NotificationsIcon />
    }
  ]
};
```

**Usage**: Used when multiple related pages should be grouped under a common category.

**Depth Limitation**: Maximum 1 level of nesting (no submenus within submenus) to keep navigation simple and predictable.

---

### MenuItem (Discriminated Union)

Union type combining all menu item types. Enables type-safe pattern matching.

**Type Definition**:
```typescript
type MenuItem = LinkMenuItem | DividerMenuItem | SubmenuMenuItem;
```

**Purpose**: Primary type used for navigation item arrays, enables TypeScript type narrowing based on `type` field.

**Type Narrowing Example**:
```typescript
function renderMenuItem(item: MenuItem) {
  if (item.type === 'link') {
    // TypeScript knows item is LinkMenuItem
    return <Link href={item.href}>{item.label}</Link>;
  }

  if (item.type === 'divider') {
    // TypeScript knows item is DividerMenuItem
    return <Divider key={item.key} />;
  }

  if (item.type === 'submenu') {
    // TypeScript knows item is SubmenuMenuItem
    return <Submenu items={item.items}>{item.label}</Submenu>;
  }
}
```

---

## Component Props

### BaseNavigationProps

Props for the reusable BaseNavigation component.

**Purpose**: Defines the contract for the base navigation component that renders menu items.

**Fields**:
| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| items | MenuItem[] | Yes | - | Array of navigation items to render |
| currentPath | string | Yes | - | Current route path from usePathname() |
| layout | 'horizontal' \| 'vertical' | No | 'horizontal' | Navigation layout orientation |
| compactMobile | boolean | No | true | Show icons only on mobile (<600px) |
| activeStyles | ActiveStyles | No | undefined | Custom styles for active menu items |

**ActiveStyles Interface**:
```typescript
interface ActiveStyles {
  backgroundColor?: string;
  color?: string;
  fontWeight?: string;
}
```

**Example**:
```typescript
<BaseNavigation
  items={navigationItems}
  currentPath="/portal/dashboard"
  layout="horizontal"
  compactMobile={true}
  activeStyles={{
    color: 'primary.main',
    fontWeight: 'bold'
  }}
/>
```

---

### PortalNavigationProps

Props for the PortalNavigation component (portal-specific wrapper of BaseNavigation).

**Purpose**: Defines the contract for the portal navigation component including user session data.

**Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| username | string | Yes | Current user's username from session |
| role | UserRole | Yes | Current user's role ('admin' \| 'mitglied') |
| additionalItems | MenuItem[] | No | Optional additional navigation items beyond defaults |

**Example**:
```typescript
<PortalNavigation
  username="max.mustermann"
  role="mitglied"
  additionalItems={[
    {
      type: 'link',
      key: 'custom-feature',
      label: 'Sonderfunktion',
      href: '/portal/custom',
      icon: <CustomIcon />
    }
  ]}
/>
```

---

### PortalUserInfoProps

Props for the user info display component (username, role, logout).

**Purpose**: Defines the contract for displaying user information and logout button in navigation.

**Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| username | string | Yes | Current user's username to display |
| role | UserRole | Yes | Current user's role for badge display |
| onLogout | () => void | Yes | Logout handler function |

**Example**:
```typescript
<PortalUserInfo
  username="max.mustermann"
  role="mitglied"
  onLogout={handleLogout}
/>
```

---

## State Management

### Submenu State

**Purpose**: Track which submenus are currently open/closed.

**Type**: `Record<string, boolean>`

**Structure**:
```typescript
const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({});

// Example state:
{
  'settings': true,    // Settings submenu is open
  'admin': false,      // Admin submenu is closed
  'tools': true        // Tools submenu is open
}
```

**Operations**:

**Toggle Submenu**:
```typescript
const toggleSubmenu = (key: string) => {
  setOpenSubmenus(prev => ({
    ...prev,
    [key]: !prev[key]
  }));
};
```

**Check if Open**:
```typescript
const isOpen = Boolean(openSubmenus[itemKey]);
```

**Close All Submenus**:
```typescript
setOpenSubmenus({});
```

---

### Active Route State

**Purpose**: Determine which navigation item corresponds to the current page.

**Type**: `string` (from `usePathname()`)

**Active Route Detection**:
```typescript
const isRouteActive = (href: string): boolean => {
  // Exact match for home page
  if (href === '/' && pathname === '/') return true;

  // Prefix match for other pages
  if (href !== '/' && pathname?.startsWith(href)) return true;

  return false;
};
```

**Example**:
```typescript
// pathname = '/portal/dashboard'
isRouteActive('/portal') // true (prefix match)
isRouteActive('/portal/dashboard') // true (exact match)
isRouteActive('/admin') // false (no match)
```

**Submenu Active State**:
```typescript
// Check if any child of submenu is active
const hasActiveChild = item.items.some(
  subItem => subItem.type === 'link' && isRouteActive(subItem.href)
);

// Use for highlighting parent menu when child is active
```

---

## Example: Complete Navigation Configuration

### Basic Configuration

```typescript
import HomeIcon from '@mui/icons-material/Home';
import DashboardIcon from '@mui/icons-material/Dashboard';
import SettingsIcon from '@mui/icons-material/Settings';
import PersonIcon from '@mui/icons-material/Person';
import SecurityIcon from '@mui/icons-material/Security';
import NotificationsIcon from '@mui/icons-material/Notifications';

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
      },
      {
        type: 'link',
        key: 'notifications',
        label: 'Benachrichtigungen',
        href: '/portal/settings/notifications',
        icon: <NotificationsIcon />
      }
    ]
  },
  {
    type: 'divider',
    key: 'divider-1'
  }
];
```

### Advanced Configuration with Multiple Submenus

```typescript
import HelpIcon from '@mui/icons-material/Help';
import BookIcon from '@mui/icons-material/Book';
import SupportIcon from '@mui/icons-material/Support';
import FeedbackIcon from '@mui/icons-material/Feedback';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import GroupsIcon from '@mui/icons-material/Groups';
import AssessmentIcon from '@mui/icons-material/Assessment';

const advancedNavigationItems: MenuItem[] = [
  // ... basic items from above ...

  {
    type: 'submenu',
    key: 'help',
    label: 'Hilfe',
    icon: <HelpIcon />,
    items: [
      {
        type: 'link',
        key: 'documentation',
        label: 'Dokumentation',
        href: '/portal/help/docs',
        icon: <BookIcon />
      },
      {
        type: 'link',
        key: 'support',
        label: 'Support',
        href: '/portal/help/support',
        icon: <SupportIcon />
      },
      {
        type: 'link',
        key: 'feedback',
        label: 'Feedback',
        href: '/portal/help/feedback',
        icon: <FeedbackIcon />
      }
    ]
  },

  // Admin-only section (conditionally rendered)
  {
    type: 'divider',
    key: 'divider-admin'
  },
  {
    type: 'submenu',
    key: 'admin',
    label: 'Administration',
    icon: <AdminPanelSettingsIcon />,
    items: [
      {
        type: 'link',
        key: 'users',
        label: 'Benutzerverwaltung',
        href: '/portal/admin/users',
        icon: <GroupsIcon />
      },
      {
        type: 'link',
        key: 'reports',
        label: 'Berichte',
        href: '/portal/admin/reports',
        icon: <AssessmentIcon />
      }
    ]
  }
];
```

---

## Data Flow Diagram

```
Session (layout.tsx)
    ↓
    ├── username: string
    ├── role: UserRole
    └── session validation
        ↓
PortalNavigation Component
    ↓
    ├── User Info Display (top-right)
    │   ├── username
    │   ├── role badge
    │   └── logout button
    │
    └── BaseNavigation Component
        ↓
        ├── MenuItem[] (navigation items)
        ├── currentPath (from usePathname)
        └── Render Logic
            ↓
            ├── LinkMenuItem → Button with Link
            ├── DividerMenuItem → MUI Divider
            └── SubmenuMenuItem → Button + Collapse
                ↓
                └── Recursive render of items
```

---

## Type Location

All types defined in this document will be placed in:
**`src/types/component-types.ts`**

This centralizes navigation types alongside other component-related types (per constitutional principle XII) and enables reuse across admin and portal navigation components.

**Migration Note**: Existing MenuItem types in MainLayout.tsx (lines 42-67) will be extracted and consolidated into component-types.ts during implementation.

---

## Validation Summary

| Entity | Key Validations |
|--------|----------------|
| LinkMenuItem | label ≤ 30 chars, href starts with "/", key unique |
| DividerMenuItem | key unique |
| SubmenuMenuItem | label ≤ 30 chars, items non-empty, no nested submenus, key unique |
| BaseNavigationProps | items required, currentPath required |
| PortalNavigationProps | username required, role required |

**Enforcement**: TypeScript compiler enforces required fields and types. Runtime validation (label length, href format, key uniqueness) should be implemented in navigation component or as Zod schema if needed for configuration validation.
