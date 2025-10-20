# Contract: Member Portal Routes

**Feature**: Member Portal with Role-Based Access
**Branch**: `006-currently-the-system`
**Date**: 2025-10-16

## Overview

Defines the member portal user interface routes, layouts, and navigation structure. All portal pages require authentication (admin or mitglied role).

---

## Route Structure

### Base Path: `/portal`

**Authorization**: Requires role="admin" OR role="mitglied"

**Routes**:
- `/portal` - Start page (welcome message + navigation instructions)

**Future Expansion**:
The portal is designed to support additional routes modularly. Example future routes:
- `/portal/documents` - Document library
- `/portal/events` - Member events
- `/portal/profile` - User profile management

---

## Portal Layout

### File: `src/app/portal/layout.tsx`

**Purpose**: Shared layout for all member portal pages including navigation menu

**Components**:
1. **Navigation Menu** (left sidebar or top app bar)
2. **Main Content Area** (children)
3. **User Info Display** (username, role, logout button)

**Layout Structure**:
```tsx
<PortalLayout>
  <PortalNavigation>
    <NavigationItems />
    <UserInfo username="Max Mustermann" role="mitglied" />
    <LogoutButton />
  </PortalNavigation>

  <MainContent>
    {children}
  </MainContent>
</PortalLayout>
```

**Navigation Menu Items** (initial):
- **Startseite** - Link to `/portal`
- *(Future items added here modularly)*

**User Info Display**:
- Display: `username` from session
- Role badge: "Administrator" or "Mitglied" (German)
- Logout button: "Abmelden"

**Responsive Behavior**:
- Desktop: Permanent sidebar navigation
- Mobile: Hamburger menu with drawer

**Material UI Components**:
- `Drawer` - Navigation sidebar
- `AppBar` - Top bar
- `List` / `ListItem` - Navigation items
- `Button` - Logout button
- `Typography` - Text elements

---

## Route: /portal (Start Page)

### File: `src/app/portal/page.tsx`

**Purpose**: Initial landing page after member login

**Authorization**: Requires role="admin" OR role="mitglied"

**Content**:

#### Welcome Message
```
Willkommen im Mitgliederbereich

Hallo [username],

herzlich willkommen im Mitgliederbereich von Die Linke Frankfurt Kreisverband.

Hier finden Sie Informationen und Funktionen, die ausschließlich für Mitglieder zugänglich sind.
```

#### Navigation Instructions
```
Navigation

Nutzen Sie das Menü auf der linken Seite, um zwischen verschiedenen Bereichen zu navigieren.

[Bei Fragen wenden Sie sich bitte an die Geschäftsstelle.]
```

**Layout**:
- Page title: "Startseite"
- Welcome section with personalized greeting
- Card-based layout for future feature links
- All text in German per constitution

**Material UI Components**:
- `Container` - Page container
- `Typography` - Headings and text
- `Card` / `CardContent` - Content sections
- `Box` - Layout spacing

**Data Requirements**:
- Get `username` from session
- No database queries needed for initial version

**Responsive Design**:
- Full-width on mobile
- Max-width container on desktop
- Adequate padding and spacing

---

## Navigation Component

### File: `src/components/portal/PortalNavigation.tsx`

**Purpose**: Reusable navigation menu component

**Props**:
```typescript
interface PortalNavigationProps {
  username: string;
  role: UserRole;
  currentPath: string;
}
```

**Navigation Items Configuration**:
```typescript
const navigationItems = [
  {
    label: 'Startseite',
    href: '/portal',
    icon: <HomeIcon />
  }
  // Future items added here
];
```

**Features**:
- Highlight active nav item based on currentPath
- Display user info section
- Logout button functionality
- Expandable for future menu items

**Logout Functionality**:
```typescript
async function handleLogout() {
  await signOut({ callbackUrl: '/auth/signin' });
}
```

---

## Welcome Message Component

### File: `src/components/portal/WelcomeMessage.tsx`

**Purpose**: Display personalized welcome message on start page

**Props**:
```typescript
interface WelcomeMessageProps {
  username: string;
  firstName?: string | null;
}
```

**Display Logic**:
```typescript
const displayName = firstName || username;
```

**Content**:
```tsx
<Card>
  <CardContent>
    <Typography variant="h4" component="h1" gutterBottom>
      Willkommen im Mitgliederbereich
    </Typography>

    <Typography variant="body1" paragraph>
      Hallo {displayName},
    </Typography>

    <Typography variant="body1" paragraph>
      herzlich willkommen im Mitgliederbereich von Die Linke Frankfurt Kreisverband.
    </Typography>

    <Typography variant="body1">
      Hier finden Sie Informationen und Funktionen, die ausschließlich für Mitglieder zugänglich sind.
    </Typography>
  </CardContent>
</Card>
```

---

## Error States

### Unauthorized Access

**Scenario**: User tries to access `/portal` without authentication or with insufficient role

**Handling**:
1. Middleware intercepts request
2. Redirect to `/auth/signin?callbackUrl=/portal`
3. After successful login, redirect back to `/portal`

### Session Expired

**Scenario**: User's session expires while viewing portal

**Handling**:
1. Middleware detects invalid session
2. Clear session cookie
3. Redirect to `/auth/signin?error=SessionExpired`
4. Show message: "Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an."

### Inactive Account

**Scenario**: Admin deactivates user's account while user is using portal

**Handling**:
1. Next request validates session
2. Detects user.isActive === false
3. Force logout
4. Redirect to signin with appropriate error

---

## Accessibility

**Requirements**:
- Semantic HTML structure
- ARIA labels for navigation
- Keyboard navigation support
- Focus management
- Screen reader friendly
- Sufficient color contrast

**ARIA Labels**:
```tsx
<nav aria-label="Mitgliederbereich Navigation">
  <List>
    <ListItem>
      <Link href="/portal" aria-current={isActive ? 'page' : undefined}>
        Startseite
      </Link>
    </ListItem>
  </List>
</nav>
```

---

## Internationalization

**Current**: All text in German (per constitution principle VI)

**Text Constants** (for future i18n):
```typescript
// src/lib/portal/constants.ts
export const PORTAL_TEXTS = {
  WELCOME_TITLE: 'Willkommen im Mitgliederbereich',
  WELCOME_GREETING: 'Hallo',
  NAVIGATION_LABEL: 'Navigation',
  START_PAGE: 'Startseite',
  LOGOUT: 'Abmelden',
  // ... more texts
};
```

---

## Styling

**Theme**: Reuse existing Material UI theme from `src/theme/`

**Custom Styles** (if needed):
- Create `src/styles/portal.module.css` for portal-specific styles
- Use Material UI's `sx` prop for component-level styling
- Maintain consistency with admin dashboard styling

**Color Scheme**:
- Follow Die Linke brand colors (likely already defined in theme)
- Ensure sufficient contrast for accessibility
- Differentiate from admin interface visually if desired

---

## Performance Considerations

**Initial Load**:
- Start page has minimal data requirements (only session data)
- No database queries for MVP version
- Fast initial render

**Navigation**:
- Use Next.js Link component for client-side navigation
- Prefetch portal routes on hover
- Shared layout prevents full page reloads

**Code Splitting**:
- Portal components in separate chunk from admin components
- Lazy load future portal features

---

## Testing Scenarios

### Manual Testing Checklist

**Layout & Navigation**:
- [ ] Portal layout renders correctly
- [ ] Navigation menu displays all items
- [ ] Current page highlighted in navigation
- [ ] User info displays correctly (username, role)
- [ ] Logout button works
- [ ] Layout is responsive (mobile and desktop)

**Start Page**:
- [ ] Welcome message displays with username
- [ ] Welcome message displays with firstName if available
- [ ] Navigation instructions visible
- [ ] Page layout is clean and readable
- [ ] All text is in German

**Authentication**:
- [ ] Unauthenticated user redirected to signin
- [ ] After signin, user redirected back to portal
- [ ] Admin user can access portal
- [ ] Mitglied user can access portal

**Navigation**:
- [ ] Click Startseite link navigates to /portal
- [ ] Browser back button works correctly
- [ ] URL updates on navigation
- [ ] Active page highlighted in menu

**Logout**:
- [ ] Logout button initiates signOut
- [ ] User redirected to signin page
- [ ] Session cleared
- [ ] Cannot access portal after logout without signing in

**Responsive Design**:
- [ ] Layout works on mobile (< 768px width)
- [ ] Layout works on tablet (768px - 1024px)
- [ ] Layout works on desktop (> 1024px)
- [ ] Navigation menu accessible on all sizes

**Accessibility**:
- [ ] Keyboard navigation works
- [ ] Screen reader can navigate
- [ ] Focus indicators visible
- [ ] ARIA labels present
- [ ] Color contrast sufficient

---

## Future Expansion Points

**Modular Navigation**:
The navigation system is designed to easily add new items:

```typescript
// Add to navigationItems array
{
  label: 'Dokumente',
  href: '/portal/documents',
  icon: <DocumentIcon />,
  requiresRole: ['admin', 'mitglied'] // optional role restriction
}
```

**Dynamic Navigation** (future):
- Load navigation items from configuration
- Role-based menu visibility
- Permissions-based feature flags

**Additional Features** (future considerations):
- User profile page
- Notification center
- Search functionality
- Breadcrumb navigation
- Quick actions sidebar

**Layout Variants** (future):
- Different layouts for different portal sections
- Nested layouts for hierarchical navigation
- Customizable user preferences (theme, layout)
