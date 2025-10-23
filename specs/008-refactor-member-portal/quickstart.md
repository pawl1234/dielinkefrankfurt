# Quickstart: Adding Portal Navigation Items

**Date**: 2025-10-23
**Feature**: 008-refactor-member-portal
**Audience**: Developers extending the portal navigation

## Overview

This guide shows how to add new navigation items to the member portal (`/portal`). The navigation system supports three types of items:
- **Links**: Direct navigation to a page
- **Submenus**: Expandable groups of related pages
- **Dividers**: Visual separators between groups

## Prerequisites

- Familiarity with TypeScript and React
- Understanding of Next.js App Router (pages in `src/app/`)
- Knowledge of Material UI components
- Access to Material UI icons library

## Quick Reference

### Adding a Simple Link

**Location**: `src/components/portal/PortalNavigation.tsx`

1. Import the icon at the top of the file:
```typescript
import NewFeatureIcon from '@mui/icons-material/NewFeature';
```

2. Add the link to the `navigationItems` array:
```typescript
const navigationItems: MenuItem[] = [
  // ... existing items ...
  {
    type: 'link',
    key: 'my-feature',
    label: 'Meine Funktion',
    href: '/portal/my-feature',
    icon: <NewFeatureIcon />
  }
];
```

3. Create the corresponding page:
```bash
# Create page file
mkdir -p src/app/portal/my-feature
touch src/app/portal/my-feature/page.tsx
```

4. Implement the page component:
```typescript
// src/app/portal/my-feature/page.tsx
import { Container, Typography, Box } from '@mui/material';

export const metadata = {
  title: 'Meine Funktion - Mitgliederbereich',
  description: 'Beschreibung der Funktion',
};

export default function MyFeaturePage() {
  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Meine Funktion
        </Typography>
        <Typography variant="body1">
          Inhalt der Seite...
        </Typography>
      </Box>
    </Container>
  );
}
```

5. Validate your changes:
```bash
npm run check
```

---

### Adding a Submenu

**Use Case**: When you have multiple related pages that should be grouped together (e.g., Settings → Profile, Security, Notifications).

1. Import icons for the parent and all children:
```typescript
import SettingsIcon from '@mui/icons-material/Settings';
import PersonIcon from '@mui/icons-material/Person';
import SecurityIcon from '@mui/icons-material/Security';
import NotificationsIcon from '@mui/icons-material/Notifications';
```

2. Add the submenu to `navigationItems`:
```typescript
const navigationItems: MenuItem[] = [
  // ... existing items ...
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
  }
];
```

3. Create pages for each submenu item:
```bash
mkdir -p src/app/portal/settings/profile
mkdir -p src/app/portal/settings/security
mkdir -p src/app/portal/settings/notifications
touch src/app/portal/settings/profile/page.tsx
touch src/app/portal/settings/security/page.tsx
touch src/app/portal/settings/notifications/page.tsx
```

4. Implement each page following the pattern in "Adding a Simple Link" step 4

---

### Adding a Divider

**Use Case**: To create visual separation between functional groups of menu items.

```typescript
const navigationItems: MenuItem[] = [
  // ... items in first group ...
  {
    type: 'divider',
    key: 'divider-1'
  },
  // ... items in second group ...
];
```

**Note**: Use unique keys like `'divider-1'`, `'divider-2'`, etc.

---

## Best Practices

### Labels
- ✅ Keep labels short: **max 30 characters**
- ✅ Use clear, descriptive German text
- ✅ Follow title case: "Meine Funktion" (not "meine funktion")
- ❌ Avoid abbreviations unless universally understood

**Examples**:
- ✅ "Startseite", "Dashboard", "Einstellungen"
- ❌ "HP" (unclear), "Superlange Funktionsbeschreibung die nicht passt" (too long)

### Keys
- ✅ Use semantic, descriptive keys: `'profile'`, `'dashboard'`
- ✅ Use lowercase with hyphens: `'my-feature'`, `'status-report'`
- ✅ Ensure uniqueness within the entire navigation array
- ❌ Avoid generic keys: `'item1'`, `'button2'`

### Icons
- ✅ Choose icons that clearly represent the page function
- ✅ Use Material UI icons already in the project
- ✅ Prefer outlined variants (default MUI style)
- ❌ Don't mix outlined and filled icon styles

**Common Icons**:
- `HomeIcon` - Home/Start page
- `DashboardIcon` - Dashboard/Overview
- `PersonIcon` - Profile/User settings
- `SecurityIcon` - Security/Privacy
- `NotificationsIcon` - Notifications/Alerts
- `SettingsIcon` - Settings/Configuration
- `HelpIcon` - Help/Documentation
- `GroupsIcon` - Groups/Teams
- `EventIcon` - Events/Calendar
- `AssessmentIcon` - Reports/Analytics

### Ordering
- ✅ Place most frequently used items first
- ✅ Group related items together (or use submenu)
- ✅ Maintain consistent logical flow
- ✅ Use dividers to separate distinct sections

### Mobile Testing
- ✅ Always test on mobile (320px width minimum)
- ✅ Verify icon-only buttons have clear tooltips
- ✅ Ensure touch targets are at least 44x44px
- ✅ Check navigation doesn't cause horizontal scrolling

---

## Complete Example

Here's a complete navigation configuration with links, submenus, and dividers:

```typescript
// src/components/portal/PortalNavigation.tsx
'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { Box, Paper } from '@mui/material';
import Link from 'next/link';

// Icon imports
import HomeIcon from '@mui/icons-material/Home';
import DashboardIcon from '@mui/icons-material/Dashboard';
import SettingsIcon from '@mui/icons-material/Settings';
import PersonIcon from '@mui/icons-material/Person';
import SecurityIcon from '@mui/icons-material/Security';
import NotificationsIcon from '@mui/icons-material/Notifications';
import HelpIcon from '@mui/icons-material/Help';
import BookIcon from '@mui/icons-material/Book';
import SupportIcon from '@mui/icons-material/Support';

// Type imports
import { MenuItem } from '@/types/component-types';
import { UserRole } from '@/types/user';

// Navigation configuration
const navigationItems: MenuItem[] = [
  // Main navigation
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

  // Settings submenu
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

  // Divider before help section
  {
    type: 'divider',
    key: 'divider-1'
  },

  // Help submenu
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
      }
    ]
  }
];

interface PortalNavigationProps {
  username: string;
  role: UserRole;
}

export default function PortalNavigation({ username, role }: PortalNavigationProps) {
  const pathname = usePathname();

  // Component implementation...
  // (BaseNavigation rendering logic goes here)
}
```

---

## Conditional Navigation Items

**Use Case**: Show certain menu items only to admin users or based on feature flags.

```typescript
const navigationItems: MenuItem[] = [
  // ... standard items ...

  // Conditionally add admin items
  ...(role === 'admin' ? [
    {
      type: 'divider',
      key: 'divider-admin'
    } as const,
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
    } as const
  ] : [])
];
```

---

## Role-Based Navigation Example

```typescript
/**
 * Get navigation items based on user role
 */
function getNavigationItems(role: UserRole): MenuItem[] {
  const baseItems: MenuItem[] = [
    { type: 'link', key: 'home', label: 'Startseite', href: '/portal', icon: <HomeIcon /> },
    { type: 'link', key: 'dashboard', label: 'Dashboard', href: '/portal/dashboard', icon: <DashboardIcon /> }
  ];

  const memberItems: MenuItem[] = [
    {
      type: 'submenu',
      key: 'my-section',
      label: 'Mein Bereich',
      icon: <PersonIcon />,
      items: [
        { type: 'link', key: 'profile', label: 'Profil', href: '/portal/profile', icon: <PersonIcon /> },
        { type: 'link', key: 'settings', label: 'Einstellungen', href: '/portal/settings', icon: <SettingsIcon /> }
      ]
    }
  ];

  const adminItems: MenuItem[] = [
    { type: 'divider', key: 'divider-admin' },
    {
      type: 'submenu',
      key: 'admin',
      label: 'Administration',
      icon: <AdminPanelSettingsIcon />,
      items: [
        { type: 'link', key: 'users', label: 'Benutzerverwaltung', href: '/portal/admin/users', icon: <GroupsIcon /> },
        { type: 'link', key: 'reports', label: 'Berichte', href: '/portal/admin/reports', icon: <AssessmentIcon /> }
      ]
    }
  ];

  return [
    ...baseItems,
    ...memberItems,
    ...(role === 'admin' ? adminItems : [])
  ];
}
```

---

## Troubleshooting

### Navigation item not appearing
- ✅ Check that the item is added to the `navigationItems` array
- ✅ Verify the icon is properly imported
- ✅ Ensure the `key` is unique
- ✅ Run `npm run check` to catch TypeScript errors

### Submenu not expanding
- ✅ Check that `type: 'submenu'` is set correctly
- ✅ Verify `items` array is not empty
- ✅ Ensure child items have `type: 'link'` (not another submenu)

### Active state not highlighting
- ✅ Check that `href` matches the current pathname
- ✅ Verify `usePathname()` is working (client component)
- ✅ Ensure `href` starts with `/` (absolute path)

### TypeScript errors
- ✅ Ensure all required fields are provided (`type`, `key`, `label`, `href` for links)
- ✅ Check that types match the MenuItem interface
- ✅ Run `npm run check` for detailed error messages

### Mobile layout issues
- ✅ Test on actual mobile device or browser dev tools (320px width)
- ✅ Verify tooltips are added for icon-only buttons
- ✅ Check that labels don't exceed 30 characters
- ✅ Ensure no horizontal scrolling occurs

---

## Validation Checklist

Before committing your changes:

- [ ] All labels are in German
- [ ] All labels are ≤ 30 characters
- [ ] All keys are unique within the navigation array
- [ ] All href values start with `/`
- [ ] Icons are imported from `@mui/icons-material`
- [ ] Pages exist for all link menu items
- [ ] Code is tested on mobile (320px) and desktop (1920px)
- [ ] `npm run check` passes with no errors
- [ ] No horizontal scrolling occurs on any screen size
- [ ] Submenu items expand/collapse correctly
- [ ] Active state highlights the correct item
- [ ] Tooltips appear on mobile icon-only buttons

---

## Further Reading

- **Material UI Components**: https://mui.com/material-ui/getting-started/
- **Material UI Icons**: https://mui.com/material-ui/material-icons/
- **Next.js App Router**: https://nextjs.org/docs/app
- **Project Constitution**: `.specify/memory/constitution.md`
- **Data Model Documentation**: `specs/008-refactor-member-portal/data-model.md`
- **Component Contracts**: `specs/008-refactor-member-portal/contracts/`

---

## Need Help?

- Check the data model documentation for detailed type definitions
- Review existing navigation items in `PortalNavigation.tsx` for examples
- Consult the component contracts for prop interfaces
- Ask the team for guidance on complex navigation structures

**Remember**: Keep it simple! Most features only need a simple link, not a submenu.
