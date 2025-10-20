# Research: Member Portal with Role-Based Access

**Feature**: Member Portal with Role-Based Access
**Branch**: `006-currently-the-system`
**Date**: 2025-10-16

## Research Findings

### 1. Current Authentication System Analysis

**Decision**: Extend existing NextAuth.js v4 implementation with role-based access control

**Current State**:
- NextAuth.js v4 with JWT strategy (src/lib/auth/auth-options.ts:55)
- Credentials provider configured (src/lib/auth/auth-options.ts:8-31)
- User model already has `role` field (String, default "admin") (prisma/schema.prisma:217)
- Session callbacks already include role in JWT token (src/lib/auth/auth-options.ts:37)
- Existing database operations support role field (src/lib/db/user-operations.ts:50)
- Types already defined in src/types/user.ts:9 with role as string

**Rationale**:
- Foundation is already in place, no need to restructure
- NextAuth.js JWT strategy supports role-based claims
- Prisma User model already has role field ready for extension
- Existing auth callbacks propagate role to session
- Only need to: (1) define role constants, (2) add authorization checks, (3) implement session invalidation

**Alternatives considered**:
- Third-party RBAC libraries: Rejected - adds complexity, current system sufficient per KISS principle
- Database-backed sessions: Rejected - JWT strategy already working, would require major refactoring
- Separate authentication system for member portal: Rejected - violates DRY principle

### 2. Role Definition and Management

**Decision**: Create enumerated role constants with "admin" and "mitglied", stored as strings in database

**Rationale**:
- Database already uses String type for role field (prisma/schema.prisma:217)
- String type provides flexibility for future role additions
- No schema migration needed
- Can validate roles with Zod schemas at API boundaries

**Implementation approach**:
- Define role constants in src/lib/auth/roles.ts: `USER_ROLES = { ADMIN: 'admin', MITGLIED: 'mitglied' }`
- Create type-safe TypeScript union type: `type UserRole = 'admin' | 'mitglied'`
- Add to centralized types in src/types/user.ts
- Validate with Zod enum in user management schemas

**Alternatives considered**:
- Prisma enum for roles: Rejected - less flexible for future additions, requires migrations
- Bitmask permissions: Rejected - over-engineering for current requirements

### 3. Session Management Strategy

**Decision**: Implement single-session-per-user using NextAuth JWT with custom session storage tracking

**Clarification resolved**: Per spec.md Session 2025-10-16, only one session per user allowed (new login invalidates previous)

**Rationale**:
- NextAuth JWT strategy doesn't natively track session invalidation
- Need to add session token tracking to database
- On login, generate unique session token, store in database, include in JWT
- On subsequent requests, verify session token still valid in database
- On new login for same user, invalidate previous session tokens

**Implementation approach**:
1. Extend User model with `activeSessionToken` field (nullable String)
2. On login: Generate cuid token, store in activeSessionToken field
3. Include session token in JWT claims
4. Create middleware to verify session token on protected routes
5. On new login: Invalidate old token before creating new one

**Alternatives considered**:
- Database sessions: Rejected - requires switching from JWT to database strategy, major refactoring
- Allow multiple sessions: Rejected - contradicts user requirement from clarifications
- Redis session store: Rejected - adds infrastructure complexity

### 4. API Segregation Pattern

**Decision**: Use path-based API segregation with authorization middleware

**Rationale**:
- Next.js App Router supports route groups and middleware
- Clear separation: `/api/admin/*` vs `/api/portal/*` vs `/api/*` (public)
- Middleware can enforce authorization based on path prefix
- Follows existing project structure patterns (src/app/api/admin/ already exists)

**Implementation approach**:
- Admin APIs: `/api/admin/*` - require role="admin"
- Portal APIs: `/api/portal/*` - require role="admin" OR role="mitglied"
- Public APIs: `/api/*` (root level) - no authentication required
- Create authorization helper: `requireRole(['admin', 'mitglied'])` for API routes
- Use Next.js middleware.ts for route protection

**Alternatives considered**:
- Separate API subdomains: Rejected - overkill for this scale, deployment complexity
- Single API with per-endpoint checks only: Rejected - less secure, easier to miss checks
- GraphQL with field-level permissions: Rejected - not using GraphQL in this project

### 5. Member Portal UI Architecture

**Decision**: Create dedicated `/portal/*` routes with shared layout and navigation

**Rationale**:
- Mirrors existing `/admin/*` structure
- Next.js App Router layout system provides shared navigation
- Material UI (MUI) components available for consistent design
- Can reuse patterns from admin dashboard

**Implementation approach**:
- Create src/app/portal/layout.tsx with navigation menu
- Create src/app/portal/page.tsx as start page
- Use MUI Drawer or AppBar component for navigation
- All text in German per constitution principle VI
- Modular navigation configuration for future expansion

**Structure**:
```
src/app/portal/
├── layout.tsx       # Portal layout with navigation menu
└── page.tsx         # Start page with welcome message
```

**Alternatives considered**:
- Tabs within admin interface: Rejected - spec requires separate member portal
- Single page app with routing: Rejected - App Router provides better structure
- Reuse admin layout: Rejected - different navigation needs, separate concerns

### 6. User Management UI Extension

**Decision**: Extend existing admin user management interface at `/admin/users`

**Current State**:
- User management page ALREADY EXISTS at src/app/admin/users/page.tsx
- Existing functionality: create user, list users, edit user, delete user, toggle active status, reset password
- UI uses MUI components (Table, Dialog, TextField, Switch)
- Role dropdown exists with only "admin" option (lines 379, 434)
- Comments indicate "Add more roles in the future" (lines 380, 435)

**Required Changes**:
- Add "mitglied" option to role dropdown in create dialog (line 379)
- Add "mitglied" option to role dropdown in edit dialog (line 434)
- Update form default role if needed (currently defaults to 'admin' on line 43)
- Backend API already structured to accept role parameter

**Rationale**:
- Existing UI is comprehensive and well-structured
- Only minor modification needed (add one menu item)
- Consistent with existing code style and patterns
- User CRUD operations already exist in src/lib/db/user-operations.ts

**Implementation approach**:
- Modify src/app/admin/users/page.tsx:
  - Add `<MenuItem value="mitglied">Mitglied</MenuItem>` to both role dropdowns
  - Optionally update default role or make role selection required
  - No structural changes needed

**Alternatives considered**:
- Create new page from scratch: Rejected - existing page is excellent and comprehensive
- Use separate component for role selector: Rejected - inline MenuItem is simpler for this use case

### 7. Authentication Flow Updates

**Decision**: Update sign-in flow to support role-based redirects

**Current behavior**: Sign-in redirects to `/admin` (src/lib/auth/auth-options.ts:53)

**New behavior**:
- After successful login, check user role
- Admin role → redirect to `/admin`
- Mitglied role → redirect to `/portal`
- Update NextAuth callbacks to handle redirect based on role

**Implementation approach**:
1. Add custom redirect logic in NextAuth callbacks (signIn callback)
2. Read role from token/user object
3. Return redirect URL based on role
4. Existing sign-in page already shared between admin and members

**Alternatives considered**:
- Separate login pages: Rejected - unnecessary duplication, confusing UX
- Post-login role selection: Rejected - users have fixed roles

### 8. Middleware and Route Protection

**Decision**: Implement Next.js middleware for route protection and session validation

**Rationale**:
- Next.js middleware runs before page renders
- Can check authentication and authorization early
- Can validate session token for single-session enforcement
- Prevents unauthorized access at infrastructure level

**Implementation approach**:
1. Create/update src/middleware.ts
2. Protect `/admin/*` routes - require admin role
3. Protect `/portal/*` routes - require admin or mitglied role
4. Validate session token on protected routes
5. Redirect unauthenticated users to sign-in page

**Pattern**:
```typescript
export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request })

  // Check authentication
  if (!token) return redirectToSignIn()

  // Check session validity
  if (!await isSessionValid(token.sessionToken)) return redirectToSignIn()

  // Check authorization based on path
  if (isAdminPath && token.role !== 'admin') return forbidden()
  if (isPortalPath && !['admin', 'mitglied'].includes(token.role)) return forbidden()

  return NextResponse.next()
}
```

**Alternatives considered**:
- Per-page authentication checks: Rejected - easy to miss, less secure
- Higher-order component wrappers: Rejected - middleware is more idiomatic in App Router

### 9. Database Migration Strategy

**Decision**: Minimal schema changes - only add activeSessionToken field to User model

**Changes required**:
```prisma
model User {
  // ... existing fields ...
  activeSessionToken String? // For single-session enforcement
}
```

**Rationale**:
- Role field already exists (prisma/schema.prisma:217)
- Only need session token tracking for single-session requirement
- Minimize migration risk

**Migration approach**:
1. Update prisma/schema.prisma
2. Run `npx prisma db push` (per CLAUDE.md:199)
3. Existing users retain current roles
4. No data migration needed

**Alternatives considered**:
- Add session table: Rejected - simpler to add field to User model for this use case
- Use separate sessions table: Rejected - over-engineering per KISS principle

### 10. Type Safety Strategy

**Decision**: Extend existing centralized types in src/types/

**Changes required**:
1. src/types/user.ts - Add UserRole type union
2. src/types/api-types.ts - Add user management API request/response types
3. src/types/next-auth.d.ts - Extend NextAuth session/token types with sessionToken

**Rationale**:
- Follows constitution principle XII (Centralized Type Definitions)
- Types already partially defined (src/types/user.ts:9 has role as string)
- Need to narrow string type to specific role union

**Implementation**:
```typescript
// src/types/user.ts
export type UserRole = 'admin' | 'mitglied';

export interface User {
  // ... existing fields ...
  role: UserRole; // Change from string to UserRole
  activeSessionToken?: string | null;
}

// src/types/api-types.ts
export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
}
```

**Alternatives considered**:
- Keep role as generic string: Rejected - loses type safety benefits
- Create separate types file for auth: Rejected - centralized types preferred per constitution

## Summary of Key Decisions

1. **Authentication**: Extend existing NextAuth.js with role-based checks
2. **Roles**: String-based roles with constants, type-safe union type
3. **Session Management**: Single session per user via activeSessionToken field
4. **API Segregation**: Path-based with `/api/admin/*` and `/api/portal/*`
5. **Portal UI**: Dedicated `/portal/*` routes with shared layout
6. **User Management**: New `/admin/users` interface for CRUD operations
7. **Route Protection**: Next.js middleware for authentication and authorization
8. **Database**: Minimal changes - only add activeSessionToken field
9. **Type Safety**: Extend centralized types in src/types/

## Risks and Mitigations

**Risk 1**: Session token invalidation race condition
- *Mitigation*: Use database transaction for token updates, check token validity on every request

**Risk 2**: Breaking existing admin authentication
- *Mitigation*: Make changes backward-compatible, existing admin users retain "admin" role

**Risk 3**: Middleware performance impact
- *Mitigation*: Keep middleware lightweight, cache role checks, only validate on protected routes

**Risk 4**: Type mismatches between Prisma and TypeScript
- *Mitigation*: Use Prisma-generated types where possible, manual sync for extensions

## Dependencies and Prerequisites

- NextAuth.js v4 (already installed)
- Prisma ORM (already configured)
- Material UI (already installed)
- bcrypt (already installed for password hashing)

## Technical Constraints Resolved

All items from Technical Context are now resolved:
- ✅ Language/Version: TypeScript with Next.js 15
- ✅ Dependencies: NextAuth, Prisma, MUI confirmed
- ✅ Storage: PostgreSQL via Prisma
- ✅ Performance: Standard web app, middleware adds <10ms per request
- ✅ Constraints: Maintain backward compatibility with existing interfaces
- ✅ Scale: Suitable for 100-500 members

No remaining NEEDS CLARIFICATION items.
