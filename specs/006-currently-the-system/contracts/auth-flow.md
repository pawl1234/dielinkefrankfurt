# Contract: Authentication & Authorization Flow

**Feature**: Member Portal with Role-Based Access
**Branch**: `006-currently-the-system`
**Date**: 2025-10-16

## Overview

This document defines the authentication and authorization flow for role-based access control, including login, session management, and route protection.

---

## Authentication Flow

### 1. Login Process

**Entry Points**:
- `/auth/signin` - Shared sign-in page for both admins and members

**Flow**:
```
1. User navigates to /auth/signin
2. User enters username and password
3. Form submits to NextAuth.js /api/auth/callback/credentials
4. NextAuth calls authorize() function in auth-options.ts
5. authorize() calls findUserByCredentials():
   a. Check if env-based admin (ADMIN_USERNAME/ADMIN_PASSWORD match)
   b. If not, query database for user by username
   c. Verify user.isActive === true
   d. Verify password with bcrypt.compare()
6. If valid, generate new session token (cuid)
7. Update user.activeSessionToken in database (invalidates old sessions)
8. Include session token in JWT claims
9. NextAuth jwt callback adds role and sessionToken to token
10. NextAuth session callback adds role to session object
11. Redirect based on role:
    - admin → /admin
    - mitglied → /portal
```

**Session Token Generation**:
```typescript
const sessionToken = cuid(); // Generate unique token
await updateUserSessionToken(user.id, sessionToken);
```

**JWT Token Structure**:
```json
{
  "id": "clx123456789",
  "username": "maxmustermann",
  "role": "mitglied",
  "sessionToken": "clxtokenabc123",
  "isEnvironmentUser": false,
  "iat": 1697456789,
  "exp": 1697543189
}
```

### 2. Session Validation

**On Every Protected Route Access**:
```
1. Middleware extracts JWT token from request
2. Middleware calls getToken() to decode JWT
3. Middleware validates:
   a. Token not expired (JWT exp claim)
   b. Session token in JWT matches activeSessionToken in database
   c. User is active (isActive === true)
4. If invalid, clear session and redirect to /auth/signin
5. If valid, proceed to authorization check
```

**Session Validation Function**:
```typescript
async function validateSession(token: JWT): Promise<boolean> {
  if (!token.sessionToken) return false;

  const user = await findUserById(token.id);
  if (!user) return false;
  if (!user.isActive) return false;
  if (user.activeSessionToken !== token.sessionToken) return false;

  return true;
}
```

### 3. Logout Process

**Endpoint**: `/api/auth/signout` (NextAuth default)

**Flow**:
```
1. User clicks logout button
2. Request sent to /api/auth/signout
3. Server-side:
   a. Extract user ID from session
   b. Clear activeSessionToken in database
   c. NextAuth clears JWT token cookie
4. Redirect to /auth/signin
```

**Implementation**:
```typescript
// In NextAuth callbacks
async signOut({ token }) {
  if (token?.id) {
    await invalidateAllSessions(token.id);
  }
}
```

---

## Authorization Flow

### 1. Route Protection Levels

**Public Routes** (no authentication required):
- `/` - Public homepage
- `/termine` - Appointment submission form
- `/neue-gruppe` - Group proposal form
- `/gruppen-bericht` - Status report form
- `/antrag-an-kreisvorstand` - Board request form
- `/auth/signin` - Sign-in page
- `/api/*` (root-level public APIs)

**Member Portal Routes** (require admin OR mitglied role):
- `/portal/*` - All member portal pages

**Admin Routes** (require admin role only):
- `/admin/*` - All admin dashboard pages
- `/api/admin/*` - All admin API endpoints

### 2. Middleware Authorization Logic

**Location**: `src/middleware.ts`

**Flow**:
```
1. Request arrives at Next.js
2. Middleware executes before page/API handler
3. Check route path:
   a. Public route? → Allow (skip auth)
   b. Protected route? → Continue to step 4
4. Extract and validate session (see Session Validation above)
5. If session invalid → Redirect to /auth/signin
6. Check authorization:
   a. /admin/* path → Require role === 'admin'
   b. /portal/* path → Require role === 'admin' OR role === 'mitglied'
   c. /api/admin/* path → Require role === 'admin'
   d. /api/portal/* path → Require role === 'admin' OR role === 'mitglied'
7. If authorized → Allow request
8. If not authorized → Return 403 Forbidden
```

**Middleware Implementation Pattern**:
```typescript
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes - skip auth
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Get session token
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  // Not authenticated
  if (!token) {
    return redirectToSignIn(request);
  }

  // Validate session token
  const sessionValid = await validateSession(token);
  if (!sessionValid) {
    return redirectToSignIn(request);
  }

  // Check authorization
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    if (token.role !== 'admin') {
      return new NextResponse('Forbidden', { status: 403 });
    }
  }

  if (pathname.startsWith('/portal') || pathname.startsWith('/api/portal')) {
    if (!['admin', 'mitglied'].includes(token.role)) {
      return new NextResponse('Forbidden', { status: 403 });
    }
  }

  return NextResponse.next();
}
```

### 3. API Route Authorization

**For each protected API route**:

```typescript
// src/app/api/admin/users/route.ts
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { requireRole } from '@/lib/auth/roles';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  // Require admin role
  const authorized = requireRole(session, ['admin']);
  if (!authorized) {
    return NextResponse.json(
      { success: false, error: 'Keine Berechtigung' },
      { status: 403 }
    );
  }

  // Proceed with operation...
}
```

**Authorization Helper Function**:
```typescript
// src/lib/auth/roles.ts
export function requireRole(
  session: Session | null,
  allowedRoles: UserRole[]
): boolean {
  if (!session?.user?.role) return false;
  return allowedRoles.includes(session.user.role);
}
```

---

## Single-Session Enforcement

### Requirement
Per spec.md clarification (Session 2025-10-16): Allow only one session per user (new login invalidates previous session).

### Implementation

**On Login**:
```
1. User successfully authenticates
2. Generate new sessionToken (cuid)
3. Update user.activeSessionToken in database (overwrites previous token)
4. Include new sessionToken in JWT claims
5. Previous session's token is now invalid
```

**On Request**:
```
1. Extract sessionToken from JWT
2. Query user.activeSessionToken from database
3. If tokens don't match → Session invalid → Logout
```

**Database Operation**:
```typescript
// src/lib/db/user-operations.ts
export async function updateUserSessionToken(
  userId: string,
  token: string | null
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { activeSessionToken: token }
  });
}
```

**User Experience**:
- User A logs in from device 1 → Session token "abc123"
- User A logs in from device 2 → Session token "xyz789" (overwrites "abc123")
- User A on device 1 makes request → Token "abc123" doesn't match "xyz789" → Logged out

---

## Role Change Handling

### Requirement
Per spec.md clarification (Session 2025-10-16): When admin changes user's role, active session continues with old role until logout.

### Implementation

**Role stored in two places**:
1. Database: `user.role` field (source of truth)
2. JWT Token: `token.role` claim (snapshot at login time)

**Admin Updates User Role**:
```
1. Admin calls PATCH /api/admin/users/[id] with new role
2. Database user.role field updated
3. User's JWT token still contains old role
4. User's active session continues with old role (no disruption)
```

**Role Change Takes Effect**:
```
1. User logs out (session invalidated)
2. User logs in again
3. New JWT created with current role from database
4. User now has new role in session
```

**Code Pattern**:
```typescript
// Role check always uses token.role, not database role
export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });
  // Use token.role (from JWT), NOT database lookup
  if (token.role !== 'admin') {
    return forbidden();
  }
}
```

---

## Error Handling

### Authentication Errors

**Invalid Credentials**:
- **Response**: Redirect to `/auth/signin?error=CredentialsSignin`
- **Message**: "Ungültige Anmeldedaten"
- **Log**: `logger.warn('Authentication failed', { username })`

**Inactive Account**:
- **Response**: Redirect to `/auth/signin?error=AccountInactive`
- **Message**: "Konto deaktiviert"
- **Log**: `logger.warn('Login attempt for inactive account', { username })`

**Session Expired**:
- **Response**: Clear session, redirect to `/auth/signin?error=SessionExpired`
- **Message**: "Sitzung abgelaufen. Bitte erneut anmelden."

**Session Invalidated** (another login):
- **Response**: Clear session, redirect to `/auth/signin?error=SessionInvalidated`
- **Message**: "Sie wurden von einem anderen Gerät angemeldet."

### Authorization Errors

**Insufficient Permissions**:
- **API Response**: 403 Forbidden
- **Body**: `{ success: false, error: "Keine Berechtigung" }`
- **Page**: Show error message, option to return to appropriate dashboard

**Forbidden Page Access**:
- **Response**: Redirect to appropriate dashboard based on role
- **Admin accessing portal**: Redirect to `/admin` (they have access)
- **Mitglied accessing admin**: Redirect to `/portal` with error message

---

## Security Considerations

1. **Password Security**:
   - Passwords hashed with bcrypt (10 rounds)
   - Plain text passwords never logged or stored
   - Password reset requires admin action

2. **Session Security**:
   - JWT tokens signed with NEXTAUTH_SECRET
   - Session tokens are cuid (cryptographically strong)
   - Tokens stored in httpOnly cookies (XSS protection)
   - Session token validation on every request

3. **Single-Session Enforcement**:
   - Prevents account sharing
   - Limits exposure if credentials compromised
   - Token stored in database, not just JWT

4. **Role-Based Access**:
   - Authorization checked in middleware (infrastructure level)
   - Authorization checked in API routes (application level)
   - Defense in depth approach

5. **Environment Admin**:
   - Fallback admin from env vars (ADMIN_USERNAME/ADMIN_PASSWORD)
   - No database dependency for emergency access
   - Cannot be deleted or deactivated
   - Marked with isEnvironmentUser flag

---

## Testing Scenarios

### Manual Testing Checklist

**Authentication**:
- [ ] Admin user logs in successfully
- [ ] Mitglied user logs in successfully
- [ ] Login with invalid username fails
- [ ] Login with invalid password fails
- [ ] Login with inactive account fails
- [ ] Env-based admin login works
- [ ] Admin redirected to /admin after login
- [ ] Mitglied redirected to /portal after login

**Single-Session**:
- [ ] User logs in on device 1
- [ ] Same user logs in on device 2
- [ ] Device 1 session becomes invalid
- [ ] Device 1 user is logged out on next request

**Authorization**:
- [ ] Admin can access /admin pages
- [ ] Admin can access /portal pages
- [ ] Mitglied can access /portal pages
- [ ] Mitglied cannot access /admin pages (403 or redirect)
- [ ] Unauthenticated user cannot access /admin (redirect to signin)
- [ ] Unauthenticated user cannot access /portal (redirect to signin)
- [ ] Admin can call /api/admin/* endpoints
- [ ] Mitglied cannot call /api/admin/* endpoints (403)

**Role Changes**:
- [ ] Admin changes user role from mitglied to admin
- [ ] User's active session still has mitglied role
- [ ] User logs out and logs back in
- [ ] User now has admin role in session
- [ ] User can now access admin interface

**Logout**:
- [ ] User logs out successfully
- [ ] Session token cleared from database
- [ ] User redirected to /auth/signin
- [ ] User cannot access protected pages after logout

**Session Validation**:
- [ ] Expired JWT token logs user out
- [ ] Tampered JWT token logs user out
- [ ] User deactivated by admin → logs out on next request
- [ ] User deleted by admin → logs out on next request
