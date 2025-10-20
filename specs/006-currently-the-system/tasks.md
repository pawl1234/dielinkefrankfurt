# Tasks: Member Portal with Role-Based Access

**Feature**: Member Portal with Role-Based Access
**Branch**: `006-currently-the-system`
**Date**: 2025-10-16

**Input**: Design documents from `/specs/006-currently-the-system/`
**Prerequisites**: research.md, data-model.md, contracts/, quickstart.md

## Execution Overview

This feature extends the existing NextAuth.js authentication system with role-based access control and creates a dedicated member portal. The implementation follows a Test-Driven Development approach with contract tests before implementation tasks.

**Key Design Decisions**:
- Extend existing NextAuth.js with role-based checks (no major refactoring)
- Single session per user via `activeSessionToken` field
- Path-based API segregation (`/api/admin/*` vs `/api/portal/*`)
- Minimal database changes (only add `activeSessionToken` field)
- Role changes take effect on next login (active sessions unaffected)

---

## Phase 3.1: Setup & Prerequisites

### T001: Update Prisma schema for User model
**File**: `prisma/schema.prisma`
**Description**: Add `activeSessionToken` field to User model for single-session enforcement

**Changes**:
- Add nullable `activeSessionToken String?` field to User model
- Add `@@index([activeSessionToken])` for session token lookups
- Existing `role` field already present (no changes needed)

**Validation**:
- Run `npm run typecheck` to verify schema syntax
- Prisma model should compile without errors

**Dependencies**: None (can start immediately)

---

### T002: Apply database migration
**Command**: `npm run db:push`
**Description**: Push Prisma schema changes to database

**Expected**:
- `activeSessionToken` field added to `users` table
- Index created on `activeSessionToken`
- Existing data unaffected (field is nullable)

**Dependencies**: T001 (schema must be updated first)

---

## Phase 3.2: Types & Constants

### T003 [P]: Check and update type definitions in src/types/user.ts
**File**: `src/types/user.ts`
**Description**: Define UserRole type and update User interface with session token field

**Changes**:
```typescript
export type UserRole = 'admin' | 'mitglied';

export const USER_ROLES = {
  ADMIN: 'admin',
  MITGLIED: 'mitglied'
} as const;

export interface User {
  // ... existing fields ...
  role: UserRole;  // Change from string to UserRole
  activeSessionToken?: string | null;  // NEW
}

export interface CreateUserData {
  username: string;
  email: string;
  password: string;
  role: UserRole;  // Use UserRole type
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
}

export interface UpdateUserData {
  username?: string;
  email?: string;
  password?: string;
  role?: UserRole;  // Use UserRole type
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
}
```

**Validation**:
- No TypeScript errors
- No `any` types used
- UserRole properly exported

**Dependencies**: T002 (database must have new field)

---

### T004 [P]: Extend NextAuth type definitions
**File**: `src/types/next-auth.d.ts`
**Description**: Extend NextAuth types to include role and sessionToken

**Changes**:
```typescript
import 'next-auth';
import { UserRole } from './user';

declare module 'next-auth' {
  interface User {
    id: string;
    username: string;
    email?: string;
    name?: string;
    role: UserRole;
    isActive?: boolean;
    isEnvironmentUser?: boolean;
  }

  interface Session {
    user: {
      id: string;
      username: string;
      email?: string;
      name?: string;
      role: UserRole;
      isEnvironmentUser?: boolean;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    username: string;
    role: UserRole;
    sessionToken: string;  // NEW
    isEnvironmentUser?: boolean;
  }
}
```

**Validation**:
- NextAuth types extend correctly
- No TypeScript errors in auth code

**Dependencies**: T003 (UserRole type must exist)

---

### T005 [P]: Update API types for user management
**File**: `src/types/api-types.ts`
**Description**: Add/update request/response types for user management API

**Check First**: Search for existing user-related types in this file

**Changes**:
```typescript
import { UserRole } from './user';

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
}

export interface CreateUserResponse {
  success: boolean;
  user?: {
    id: string;
    username: string;
    email: string;
    role: UserRole;
    isActive: boolean;
  };
  error?: string;
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  password?: string;
  role?: UserRole;
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
}

export interface UpdateUserResponse {
  success: boolean;
  user?: {
    id: string;
    username: string;
    email: string;
    role: UserRole;
    isActive: boolean;
  };
  error?: string;
}

export interface DeleteUserRequest {
  id: string;
}

export interface DeleteUserResponse {
  success: boolean;
  error?: string;
}

export interface ListUsersResponse {
  success: boolean;
  users?: Array<{
    id: string;
    username: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    role: UserRole;
    isActive: boolean;
    createdAt: string;
  }>;
  error?: string;
}
```

**Validation**:
- Types compile without errors
- Aligned with contract specifications

**Dependencies**: T003 (UserRole type must exist)

---

## Phase 3.3: Validation Schemas

### T006: Create user validation schemas
**File**: `src/lib/validation/user-schema.ts`
**Description**: Create Zod schemas for user management operations

**Content**:
```typescript
import { z } from 'zod';

export const USER_ROLES = ['admin', 'mitglied'] as const;

export const userRoleSchema = z.enum(USER_ROLES);

export const createUserSchema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_-]+$/),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  role: userRoleSchema,
  firstName: z.string().max(50).optional(),
  lastName: z.string().max(50).optional(),
  isActive: z.boolean().optional().default(true)
});

export const updateUserSchema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_-]+$/).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).max(100).optional(),
  role: userRoleSchema.optional(),
  firstName: z.string().max(50).optional(),
  lastName: z.string().max(50).optional(),
  isActive: z.boolean().optional()
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'Mindestens ein Feld muss angegeben werden' }
);

export const deleteUserSchema = z.object({
  id: z.string().cuid()
});

export const resetPasswordSchema = z.object({
  newPassword: z.string().min(8).max(100)
});
```

**Validation**:
- All validation messages in German
- Schemas match contract requirements
- No TypeScript errors

**Dependencies**: T003, T004, T005 (types must exist)

---

## Phase 3.4: Database Operations

### T007: Update user database operations
**File**: `src/lib/db/user-operations.ts`
**Description**: Add session management operations to existing user-operations.ts

**Check First**: Review existing functions in this file (createUser, updateUser, findUserByUsername, etc.)

**New Functions to Add**:
```typescript
/**
 * Update user's active session token
 *
 * @param userId - User ID
 * @param token - Session token (or null to clear)
 * @returns void
 */
export async function updateUserSessionToken(
  userId: string,
  token: string | null
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { activeSessionToken: token }
  });
}

/**
 * Find user by active session token
 *
 * @param token - Session token
 * @returns User or null
 */
export async function findUserBySessionToken(
  token: string
): Promise<User | null> {
  return await prisma.user.findFirst({
    where: { activeSessionToken: token }
  });
}

/**
 * Invalidate all sessions for a user
 *
 * @param userId - User ID
 * @returns void
 */
export async function invalidateAllSessions(userId: string): Promise<void> {
  await updateUserSessionToken(userId, null);
}
```

**Existing Functions to Verify**:
- `createUser()` - Should already accept role parameter
- `updateUser()` - Should already accept role parameter
- Ensure both handle UserRole type correctly

**Validation**:
- All functions have JSDoc comments
- TypeScript strict mode passes
- Logger used for error cases

**Dependencies**: T001-T005 (schema, types, validation must exist)

---

## Phase 3.5: Authentication & Authorization

### T008: Create authorization helper utilities
**File**: `src/lib/auth/roles.ts` (NEW)
**Description**: Create role-based authorization helpers

**Content**:
```typescript
import { UserRole } from '@/types/user';
import { Session } from 'next-auth';

/**
 * Check if user has one of the allowed roles
 *
 * @param session - NextAuth session object
 * @param allowedRoles - Array of allowed roles
 * @returns true if user has allowed role
 */
export function requireRole(
  session: Session | null,
  allowedRoles: UserRole[]
): boolean {
  if (!session?.user?.role) return false;
  return allowedRoles.includes(session.user.role);
}

/**
 * Check if user has admin role
 *
 * @param userRole - User's role
 * @returns true if user is admin
 */
export function isAdmin(userRole: UserRole): boolean {
  return userRole === 'admin';
}

/**
 * Check if user can access member portal
 *
 * @param userRole - User's role
 * @returns true if user can access portal
 */
export function canAccessPortal(userRole: UserRole): boolean {
  return ['admin', 'mitglied'].includes(userRole);
}

/**
 * Check if user can access admin interface
 *
 * @param userRole - User's role
 * @returns true if user can access admin
 */
export function canAccessAdmin(userRole: UserRole): boolean {
  return isAdmin(userRole);
}
```

**Validation**:
- JSDoc comments on all functions
- TypeScript strict mode passes
- No any types

**Dependencies**: T003 (UserRole type must exist)

---

### T009: Update NextAuth configuration for session management
**File**: `src/lib/auth/auth-options.ts`
**Description**: Update existing auth-options.ts to handle session tokens and role-based redirects

**Changes**:

1. **Import new utilities**:
```typescript
import { updateUserSessionToken } from '@/lib/db/user-operations';
import { UserRole } from '@/types/user';
import { cuid } from '@paralleldrive/cuid2';
```

2. **Update authorize callback** (in credentials provider):
```typescript
async authorize(credentials, req) {
  // ... existing validation ...

  // After successful authentication, generate session token
  if (user) {
    const sessionToken = cuid();
    await updateUserSessionToken(user.id, sessionToken);

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role as UserRole,
      isActive: user.isActive,
      isEnvironmentUser: isEnvUser,
      sessionToken  // NEW: Include in user object
    };
  }

  return null;
}
```

3. **Update jwt callback**:
```typescript
async jwt({ token, user }) {
  if (user) {
    token.id = user.id;
    token.username = user.username;
    token.role = user.role;
    token.sessionToken = user.sessionToken;  // NEW
    token.isEnvironmentUser = user.isEnvironmentUser;
  }
  return token;
}
```

4. **Update callbacks section** (add redirect callback):
```typescript
async redirect({ url, baseUrl }) {
  // After successful login, redirect based on role
  return url.startsWith(baseUrl) ? url : baseUrl;
},
```

5. **Update signIn callback** (add role-based redirect):
```typescript
async signIn({ user }) {
  // Role-based redirect handled by pages configuration
  return true;
}
```

6. **Update pages configuration**:
```typescript
pages: {
  signIn: '/auth/signin',
  // Remove explicit redirect - will be handled by middleware
},
```

**Validation**:
- NextAuth still works for existing admin login
- Session token generated and stored on login
- No breaking changes to existing functionality

**Dependencies**: T003, T004, T007 (types and DB operations must exist)

---

### T010: Create session validation utility
**File**: `src/lib/auth/session-validation.ts` (NEW)
**Description**: Create utility to validate session tokens

**Content**:
```typescript
import { JWT } from 'next-auth/jwt';
import { findUserById } from '@/lib/db/user-operations';
import { logger } from '@/lib/logger';

/**
 * Validate session token against database
 *
 * @param token - JWT token from NextAuth
 * @returns true if session is valid
 */
export async function validateSessionToken(token: JWT): Promise<boolean> {
  try {
    if (!token.sessionToken) {
      logger.warn('Session validation failed: no session token', {
        module: 'session-validation',
        context: { userId: token.id }
      });
      return false;
    }

    const user = await findUserById(token.id);

    if (!user) {
      logger.warn('Session validation failed: user not found', {
        module: 'session-validation',
        context: { userId: token.id }
      });
      return false;
    }

    if (!user.isActive) {
      logger.warn('Session validation failed: user inactive', {
        module: 'session-validation',
        context: { userId: token.id, username: user.username }
      });
      return false;
    }

    if (user.activeSessionToken !== token.sessionToken) {
      logger.warn('Session validation failed: token mismatch', {
        module: 'session-validation',
        context: { userId: token.id, username: user.username }
      });
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Session validation error', {
      module: 'session-validation',
      context: { error, userId: token.id },
      tags: ['critical']
    });
    return false;
  }
}

/**
 * Check if route is public (no authentication required)
 *
 * @param pathname - Request pathname
 * @returns true if route is public
 */
export function isPublicRoute(pathname: string): boolean {
  const publicPaths = [
    '/',
    '/termine',
    '/neue-gruppe',
    '/gruppen-bericht',
    '/antrag-an-kreisvorstand',
    '/auth/signin',
    '/auth/signout',
    '/api/auth',
  ];

  return publicPaths.some(path => pathname.startsWith(path));
}
```

**Validation**:
- JSDoc comments on all functions
- Structured logging used
- TypeScript strict mode passes

**Dependencies**: T004, T007, T009 (JWT types, DB operations, auth config)

---

### T011: Create Next.js middleware for route protection
**File**: `src/middleware.ts` (NEW or UPDATE if exists)
**Description**: Create middleware to protect routes and validate sessions

**Content**:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { validateSessionToken, isPublicRoute } from '@/lib/auth/session-validation';

/**
 * Middleware to protect routes and validate sessions
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Get JWT token
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Not authenticated - redirect to signin
  if (!token) {
    const signInUrl = new URL('/auth/signin', request.url);
    signInUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Validate session token (single-session enforcement)
  const sessionValid = await validateSessionToken(token);
  if (!sessionValid) {
    const signInUrl = new URL('/auth/signin', request.url);
    signInUrl.searchParams.set('error', 'SessionInvalidated');
    signInUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Check authorization based on path
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    if (token.role !== 'admin') {
      // Redirect to portal if they have mitglied role, otherwise forbidden
      if (token.role === 'mitglied') {
        return NextResponse.redirect(new URL('/portal', request.url));
      }
      return new NextResponse('Forbidden', { status: 403 });
    }
  }

  if (pathname.startsWith('/portal') || pathname.startsWith('/api/portal')) {
    if (!['admin', 'mitglied'].includes(token.role)) {
      return new NextResponse('Forbidden', { status: 403 });
    }
  }

  // Apply role-based redirect after login
  if (pathname === '/auth/signin' && token) {
    // Already authenticated, redirect to appropriate dashboard
    if (token.role === 'admin') {
      return NextResponse.redirect(new URL('/admin', request.url));
    } else if (token.role === 'mitglied') {
      return NextResponse.redirect(new URL('/portal', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

**Validation**:
- Middleware protects all routes correctly
- Public routes accessible
- Admin routes require admin role
- Portal routes require admin or mitglied role
- Session validation prevents multi-session access

**Dependencies**: T010 (session validation utility must exist)

---

## Phase 3.6: API Routes - User Management

### T012: Create POST /api/admin/users endpoint
**File**: `src/app/api/admin/users/route.ts`
**Description**: API endpoint to create new users with role assignment

**Content**:
```typescript
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { requireRole } from '@/lib/auth/roles';
import { createUserSchema } from '@/lib/validation/user-schema';
import { createUser, findUserByUsername, findUserByEmail } from '@/lib/db/user-operations';
import { logger } from '@/lib/logger';
import { CreateUserRequest, CreateUserResponse } from '@/types/api-types';

/**
 * POST /api/admin/users - Create new user
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    // Require admin role
    if (!requireRole(session, ['admin'])) {
      logger.warn('Unauthorized user management attempt', {
        module: 'api-admin-users',
        context: { operation: 'create', userId: session?.user?.id }
      });
      return NextResponse.json(
        { success: false, error: 'Keine Berechtigung. Nur Administratoren können Benutzer erstellen.' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body: CreateUserRequest = await request.json();
    const validationResult = createUserSchema.safeParse(body);

    if (!validationResult.success) {
      logger.warn('User creation validation failed', {
        module: 'api-admin-users',
        context: { errors: validationResult.error.issues }
      });
      return NextResponse.json(
        { success: false, error: `Validierungsfehler: ${validationResult.error.issues[0].message}` },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Check for duplicate username or email
    const existingUsername = await findUserByUsername(data.username);
    if (existingUsername) {
      return NextResponse.json(
        { success: false, error: 'Benutzername oder E-Mail bereits vorhanden' },
        { status: 409 }
      );
    }

    const existingEmail = await findUserByEmail(data.email);
    if (existingEmail) {
      return NextResponse.json(
        { success: false, error: 'Benutzername oder E-Mail bereits vorhanden' },
        { status: 409 }
      );
    }

    // Create user
    const user = await createUser({
      username: data.username,
      email: data.email,
      password: data.password,
      role: data.role,
      firstName: data.firstName,
      lastName: data.lastName,
      isActive: data.isActive ?? true,
    });

    logger.info('User created successfully', {
      module: 'api-admin-users',
      context: { userId: user.id, username: user.username, role: user.role, createdBy: session.user.id }
    });

    const response: CreateUserResponse = {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      },
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    logger.error('User creation failed', {
      module: 'api-admin-users',
      context: { error },
      tags: ['critical']
    });
    return NextResponse.json(
      { success: false, error: 'Serverfehler beim Erstellen des Benutzers' },
      { status: 500 }
    );
  }
}
```

**Note**: This file will also contain GET endpoint (next task). Use separate function exports.

**Validation**:
- Contract compliance (api-admin-users.md)
- All error messages in German
- Structured logging used
- TypeScript strict mode passes

**Dependencies**: T003-T009 (types, validation, auth helpers)

---

### T013: Create GET /api/admin/users endpoint
**File**: `src/app/api/admin/users/route.ts` (same file as T012)
**Description**: Add GET endpoint to list all users

**Add to existing file**:
```typescript
/**
 * GET /api/admin/users - List all users
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    // Require admin role
    if (!requireRole(session, ['admin'])) {
      logger.warn('Unauthorized user list access attempt', {
        module: 'api-admin-users',
        context: { operation: 'list', userId: session?.user?.id }
      });
      return NextResponse.json(
        { success: false, error: 'Keine Berechtigung. Nur Administratoren können Benutzer auflisten.' },
        { status: 403 }
      );
    }

    // Get all users
    const users = await listUsers();

    logger.info('User list retrieved', {
      module: 'api-admin-users',
      context: { count: users.length, requestedBy: session.user.id }
    });

    const response: ListUsersResponse = {
      success: true,
      users: users.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt.toISOString(),
      })),
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Failed to retrieve user list', {
      module: 'api-admin-users',
      context: { error },
      tags: ['critical']
    });
    return NextResponse.json(
      { success: false, error: 'Serverfehler beim Abrufen der Benutzerliste' },
      { status: 500 }
    );
  }
}
```

**Note**: Import `listUsers` from `@/lib/db/user-operations`

**Validation**:
- Contract compliance
- Returns all users with role information
- Proper error handling

**Dependencies**: T012 (same file, can be done together)

---

### T014: Create PATCH /api/admin/users/[id]/route.ts endpoint
**File**: `src/app/api/admin/users/[id]/route.ts` (NEW)
**Description**: API endpoint to update user (including role changes)

**Content**:
```typescript
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { requireRole } from '@/lib/auth/roles';
import { updateUserSchema } from '@/lib/validation/user-schema';
import { updateUser, findUserById, findUserByUsername, findUserByEmail } from '@/lib/db/user-operations';
import { logger } from '@/lib/logger';
import { UpdateUserRequest, UpdateUserResponse } from '@/types/api-types';

/**
 * PATCH /api/admin/users/[id] - Update user
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    // Require admin role
    if (!requireRole(session, ['admin'])) {
      logger.warn('Unauthorized user update attempt', {
        module: 'api-admin-users',
        context: { operation: 'update', userId: session?.user?.id, targetUserId: params.id }
      });
      return NextResponse.json(
        { success: false, error: 'Keine Berechtigung. Nur Administratoren können Benutzer bearbeiten.' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body: UpdateUserRequest = await request.json();
    const validationResult = updateUserSchema.safeParse(body);

    if (!validationResult.success) {
      logger.warn('User update validation failed', {
        module: 'api-admin-users',
        context: { errors: validationResult.error.issues, targetUserId: params.id }
      });
      return NextResponse.json(
        { success: false, error: `Validierungsfehler: ${validationResult.error.issues[0].message}` },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Check if user exists
    const existingUser = await findUserById(params.id);
    if (!existingUser) {
      return NextResponse.json(
        { success: false, error: 'Benutzer nicht gefunden' },
        { status: 404 }
      );
    }

    // Check for duplicate username (if changing username)
    if (data.username && data.username !== existingUser.username) {
      const duplicateUsername = await findUserByUsername(data.username);
      if (duplicateUsername) {
        return NextResponse.json(
          { success: false, error: 'Benutzername oder E-Mail bereits vorhanden' },
          { status: 409 }
        );
      }
    }

    // Check for duplicate email (if changing email)
    if (data.email && data.email !== existingUser.email) {
      const duplicateEmail = await findUserByEmail(data.email);
      if (duplicateEmail) {
        return NextResponse.json(
          { success: false, error: 'Benutzername oder E-Mail bereits vorhanden' },
          { status: 409 }
        );
      }
    }

    // Prevent self-deactivation
    if (data.isActive === false && params.id === session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Sie können Ihr eigenes Konto nicht deaktivieren' },
        { status: 400 }
      );
    }

    // Update user
    const updatedUser = await updateUser(params.id, data);

    logger.info('User updated successfully', {
      module: 'api-admin-users',
      context: {
        userId: updatedUser.id,
        username: updatedUser.username,
        changes: Object.keys(data),
        updatedBy: session.user.id
      }
    });

    const response: UpdateUserResponse = {
      success: true,
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role,
        isActive: updatedUser.isActive,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error('User update failed', {
      module: 'api-admin-users',
      context: { error, targetUserId: params.id },
      tags: ['critical']
    });
    return NextResponse.json(
      { success: false, error: 'Serverfehler beim Aktualisieren des Benutzers' },
      { status: 500 }
    );
  }
}
```

**Validation**:
- Contract compliance
- Self-deactivation prevention
- Duplicate checks for username/email
- All error messages in German

**Dependencies**: T003-T009 (types, validation, auth helpers)

---

### T015: Create DELETE /api/admin/users/[id]/route.ts endpoint
**File**: `src/app/api/admin/users/[id]/route.ts` (same file as T014)
**Description**: Add DELETE endpoint to delete users

**Add to existing file**:
```typescript
import { deleteUser } from '@/lib/db/user-operations';
import { DeleteUserResponse } from '@/types/api-types';

/**
 * DELETE /api/admin/users/[id] - Delete user
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    // Require admin role
    if (!requireRole(session, ['admin'])) {
      logger.warn('Unauthorized user deletion attempt', {
        module: 'api-admin-users',
        context: { operation: 'delete', userId: session?.user?.id, targetUserId: params.id }
      });
      return NextResponse.json(
        { success: false, error: 'Keine Berechtigung. Nur Administratoren können Benutzer löschen.' },
        { status: 403 }
      );
    }

    // Prevent self-deletion
    if (params.id === session.user.id) {
      logger.warn('Self-deletion attempt prevented', {
        module: 'api-admin-users',
        context: { userId: session.user.id }
      });
      return NextResponse.json(
        { success: false, error: 'Sie können Ihr eigenes Konto nicht löschen' },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = await findUserById(params.id);
    if (!existingUser) {
      return NextResponse.json(
        { success: false, error: 'Benutzer nicht gefunden' },
        { status: 404 }
      );
    }

    // Delete user
    await deleteUser(params.id);

    logger.info('User deleted successfully', {
      module: 'api-admin-users',
      context: {
        deletedUserId: params.id,
        deletedUsername: existingUser.username,
        deletedBy: session.user.id
      }
    });

    const response: DeleteUserResponse = {
      success: true,
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error('User deletion failed', {
      module: 'api-admin-users',
      context: { error, targetUserId: params.id },
      tags: ['critical']
    });
    return NextResponse.json(
      { success: false, error: 'Serverfehler beim Löschen des Benutzers' },
      { status: 500 }
    );
  }
}
```

**Validation**:
- Self-deletion prevention
- Contract compliance
- Proper logging

**Dependencies**: T014 (same file, can be done together)

---

### T016: Create PATCH /api/admin/users/[id]/reset-password endpoint
**File**: `src/app/api/admin/users/[id]/reset-password/route.ts` (NEW)
**Description**: API endpoint to reset user password

**Content**:
```typescript
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { requireRole } from '@/lib/auth/roles';
import { resetPasswordSchema } from '@/lib/validation/user-schema';
import { updateUser, findUserById } from '@/lib/db/user-operations';
import { logger } from '@/lib/logger';

/**
 * PATCH /api/admin/users/[id]/reset-password - Reset user password
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    // Require admin role
    if (!requireRole(session, ['admin'])) {
      logger.warn('Unauthorized password reset attempt', {
        module: 'api-admin-users',
        context: { operation: 'reset-password', userId: session?.user?.id, targetUserId: params.id }
      });
      return NextResponse.json(
        { success: false, error: 'Keine Berechtigung' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = resetPasswordSchema.safeParse(body);

    if (!validationResult.success) {
      logger.warn('Password reset validation failed', {
        module: 'api-admin-users',
        context: { errors: validationResult.error.issues, targetUserId: params.id }
      });
      return NextResponse.json(
        { success: false, error: 'Neues Passwort erforderlich (mindestens 8 Zeichen)' },
        { status: 400 }
      );
    }

    const { newPassword } = validationResult.data;

    // Check if user exists
    const existingUser = await findUserById(params.id);
    if (!existingUser) {
      return NextResponse.json(
        { success: false, error: 'Benutzer nicht gefunden' },
        { status: 404 }
      );
    }

    // Update password
    await updateUser(params.id, { password: newPassword });

    logger.info('Password reset successfully', {
      module: 'api-admin-users',
      context: {
        userId: params.id,
        username: existingUser.username,
        resetBy: session.user.id
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Passwort erfolgreich zurückgesetzt',
    });
  } catch (error) {
    logger.error('Password reset failed', {
      module: 'api-admin-users',
      context: { error, targetUserId: params.id },
      tags: ['critical']
    });
    return NextResponse.json(
      { success: false, error: 'Serverfehler beim Zurücksetzen des Passworts' },
      { status: 500 }
    );
  }
}
```

**Validation**:
- Contract compliance
- Password validation (min 8 chars)
- Proper logging

**Dependencies**: T003-T009 (types, validation, auth helpers)

---

## Phase 3.7: UI - Member Portal

### T017 [P]: Create portal navigation component
**File**: `src/components/portal/PortalNavigation.tsx` (NEW)
**Description**: Reusable navigation menu component for member portal

**Content**:
```typescript
'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
  Divider,
  IconButton,
  useMediaQuery,
  useTheme,
  Chip,
} from '@mui/material';
import {
  Home as HomeIcon,
  Menu as MenuIcon,
  ExitToApp as LogoutIcon,
} from '@mui/icons-material';
import Link from 'next/link';
import { UserRole } from '@/types/user';

interface NavigationItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const navigationItems: NavigationItem[] = [
  {
    label: 'Startseite',
    href: '/portal',
    icon: <HomeIcon />,
  },
  // Future items added here
];

interface PortalNavigationProps {
  username: string;
  role: UserRole;
}

/**
 * Portal navigation component with sidebar and user info
 *
 * @param username - Current user's username
 * @param role - Current user's role
 * @returns Navigation component
 */
export default function PortalNavigation({ username, role }: PortalNavigationProps) {
  const pathname = usePathname();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/auth/signin' });
  };

  const drawerContent = (
    <Box sx={{ width: 250, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* User Info Section */}
      <Box sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
          {username}
        </Typography>
        <Chip
          label={role === 'admin' ? 'Administrator' : 'Mitglied'}
          size="small"
          color={role === 'admin' ? 'primary' : 'default'}
          sx={{ mt: 1 }}
        />
      </Box>

      <Divider />

      {/* Navigation Items */}
      <List sx={{ flexGrow: 1 }}>
        {navigationItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <ListItem key={item.href} disablePadding>
              <ListItemButton
                component={Link}
                href={item.href}
                selected={isActive}
                onClick={isMobile ? handleDrawerToggle : undefined}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      <Divider />

      {/* Logout Button */}
      <List>
        <ListItem disablePadding>
          <ListItemButton onClick={handleLogout}>
            <ListItemIcon>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText primary="Abmelden" />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      {isMobile && (
        <IconButton
          color="inherit"
          aria-label="Menü öffnen"
          edge="start"
          onClick={handleDrawerToggle}
          sx={{ position: 'fixed', top: 16, left: 16, zIndex: 1300 }}
        >
          <MenuIcon />
        </IconButton>
      )}

      {/* Drawer */}
      {isMobile ? (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
        >
          {drawerContent}
        </Drawer>
      ) : (
        <Drawer variant="permanent" open>
          {drawerContent}
        </Drawer>
      )}
    </>
  );
}
```

**Validation**:
- Responsive design (mobile drawer, desktop permanent)
- Active page highlighting
- All text in German
- MUI components used

**Dependencies**: T003 (UserRole type must exist)

---

### T018 [P]: Create welcome message component
**File**: `src/components/portal/WelcomeMessage.tsx` (NEW)
**Description**: Display personalized welcome message

**Content**:
```typescript
import { Card, CardContent, Typography } from '@mui/material';

interface WelcomeMessageProps {
  username: string;
  firstName?: string | null;
}

/**
 * Welcome message component for portal start page
 *
 * @param username - User's username
 * @param firstName - User's first name (optional)
 * @returns Welcome message component
 */
export default function WelcomeMessage({ username, firstName }: WelcomeMessageProps) {
  const displayName = firstName || username;

  return (
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
  );
}
```

**Validation**:
- All text in German
- MUI components used
- Displays first name if available, otherwise username

**Dependencies**: None (can be done in parallel with T017)

---

### T019: Create portal layout
**File**: `src/app/portal/layout.tsx` (NEW)
**Description**: Shared layout for all portal pages

**Content**:
```typescript
import { Box } from '@mui/material';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { redirect } from 'next/navigation';
import PortalNavigation from '@/components/portal/PortalNavigation';

/**
 * Portal layout with navigation menu
 */
export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  // Redirect if not authenticated (middleware should handle this, but double-check)
  if (!session?.user) {
    redirect('/auth/signin?callbackUrl=/portal');
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <PortalNavigation
        username={session.user.username}
        role={session.user.role}
      />

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          ml: { xs: 0, md: '250px' }, // Offset for permanent drawer on desktop
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
```

**Validation**:
- Layout renders correctly
- Navigation visible on all portal pages
- Content area properly positioned

**Dependencies**: T017 (PortalNavigation component must exist)

---

### T020: Create portal start page
**File**: `src/app/portal/page.tsx` (NEW)
**Description**: Member portal start page with welcome message

**Content**:
```typescript
import { Container, Box, Typography } from '@mui/material';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { redirect } from 'next/navigation';
import { findUserById } from '@/lib/db/user-operations';
import WelcomeMessage from '@/components/portal/WelcomeMessage';

export const metadata = {
  title: 'Startseite - Mitgliederbereich',
  description: 'Mitgliederbereich von Die Linke Frankfurt Kreisverband',
};

/**
 * Portal start page
 */
export default async function PortalPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/auth/signin?callbackUrl=/portal');
  }

  // Get user details for firstName
  const user = await findUserById(session.user.id);

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <WelcomeMessage
          username={session.user.username}
          firstName={user?.firstName}
        />

        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            Navigation
          </Typography>
          <Typography variant="body1">
            Nutzen Sie das Menü auf der linken Seite, um zwischen verschiedenen Bereichen zu navigieren.
          </Typography>
        </Box>
      </Box>
    </Container>
  );
}
```

**Validation**:
- Page renders with welcome message
- Displays username or firstName
- All text in German
- Responsive layout

**Dependencies**: T018, T019 (WelcomeMessage and layout must exist)

---

## Phase 3.8: UI - Admin User Management

### T021: Update admin user management page to support mitglied role
**File**: `src/app/admin/users/page.tsx` (MODIFY EXISTING)
**Description**: Add "Mitglied" option to role dropdowns in existing user management page

**Check First**: Read the entire file to understand current structure

**Changes Required**:

1. **Create User Dialog - Add Mitglied option** (around line 379):
```tsx
<Select
  fullWidth
  value={newUser.role}
  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
  required
>
  <MenuItem value="admin">Admin</MenuItem>
  <MenuItem value="mitglied">Mitglied</MenuItem>  {/* ADD THIS LINE */}
</Select>
```

2. **Edit User Dialog - Add Mitglied option** (around line 434):
```tsx
<Select
  fullWidth
  value={editUser.role || ''}
  onChange={(e) => setEditUser({ ...editUser, role: e.target.value })}
>
  <MenuItem value="admin">Admin</MenuItem>
  <MenuItem value="mitglied">Mitglied</MenuItem>  {/* ADD THIS LINE */}
</Select>
```

3. **Update role display in table** (if needed):
- Check if role column displays correctly for both admin and mitglied
- Ensure German labels: "Administrator" for admin, "Mitglied" for mitglied

4. **Optional: Update default role** (around line 43):
```tsx
const [newUser, setNewUser] = useState({
  username: '',
  email: '',
  password: '',
  role: 'mitglied',  // Change default from 'admin' to 'mitglied' (optional)
  firstName: '',
  lastName: '',
});
```

**Validation**:
- Can create users with both admin and mitglied roles
- Can edit user roles between admin and mitglied
- Role displays correctly in user list
- No breaking changes to existing functionality

**Dependencies**: T012-T016 (API endpoints must exist)

---

## Phase 3.9: Final Validation & Documentation

### T022: Run code quality checks
**Command**: `npm run check`
**Description**: Validate TypeScript and linting

**Expected**:
- ✅ No TypeScript errors
- ✅ No ESLint errors
- ✅ All types properly defined
- ✅ No `any` types used

**Dependencies**: All previous tasks

---

### T023: Verify file sizes
**Description**: Ensure no file exceeds 500 lines

**Check files**:
- All new files created in this feature
- All modified files

**Action if exceeded**:
- Refactor into smaller modules
- Extract helper functions
- Split large components

**Dependencies**: All previous tasks

---

### T024: Add JSDoc comments
**Description**: Ensure all functions have JSDoc comments

**Check**:
- All API route handlers
- All database operations
- All utility functions
- All React components

**Format**:
```typescript
/**
 * Brief description
 *
 * @param paramName - Parameter description
 * @returns Return value description
 */
```

**Dependencies**: All previous tasks

---

### T025: Manual validation using quickstart.md
**Description**: Execute all manual testing scenarios from quickstart.md

**Test Workflows**:
1. User Management (Workflow 1)
2. Member Authentication (Workflow 2)
3. Member Portal Access (Workflow 3)
4. Authorization & Access Control (Workflow 4)
5. Session Management (Workflow 5)
6. Role Change Handling (Workflow 6)
7. Account Deactivation (Workflow 7)
8. Error Handling (Workflow 8)

**Document Results**:
- Create test results log
- Note any issues found
- Fix issues before completion

**Dependencies**: All previous tasks

---

## Dependencies Summary

```
Phase 3.1 (Setup):
T001 → T002

Phase 3.2 (Types):
T002 → T003, T004, T005 (all parallel)

Phase 3.3 (Validation):
T003, T004, T005 → T006

Phase 3.4 (Database):
T001-T006 → T007

Phase 3.5 (Auth):
T003 → T008
T003, T004, T007, T009 → T009
T004, T007, T009 → T010
T010 → T011

Phase 3.6 (API Routes):
T003-T009 → T012, T013 (parallel or sequential in same file)
T003-T009 → T014, T015 (parallel or sequential in same file)
T003-T009 → T016

Phase 3.7 (Portal UI):
T003 → T017, T018 (parallel)
T017 → T019
T018, T019 → T020

Phase 3.8 (Admin UI):
T012-T016 → T021

Phase 3.9 (Validation):
All previous → T022, T023, T024, T025 (sequential)
```

---

## Parallel Execution Examples

### Example 1: Type Definitions (after database migration)
```bash
# Launch T003, T004, T005 in parallel (different files):
Task: "Check and update type definitions in src/types/user.ts"
Task: "Extend NextAuth type definitions in src/types/next-auth.d.ts"
Task: "Update API types for user management in src/types/api-types.ts"
```

### Example 2: Portal Components
```bash
# Launch T017, T018 in parallel (different files):
Task: "Create portal navigation component in src/components/portal/PortalNavigation.tsx"
Task: "Create welcome message component in src/components/portal/WelcomeMessage.tsx"
```

### Example 3: API Routes (can be done sequentially in same files)
```bash
# T012 and T013 are in the same file, do sequentially or together
# T014 and T015 are in the same file, do sequentially or together
# T016 is in a separate file, can be parallel with above
```

---

## Notes

- **[P]** indicates tasks that can run in parallel (different files, no dependencies)
- Tasks without [P] should be done sequentially or depend on previous tasks
- Run `npm run check` frequently to catch errors early
- Keep all user-facing text in German per constitution
- Use structured logging with `logger` from `@/lib/logger.ts`
- Never use `any` type - always define proper types
- All files must stay under 500 lines

---

## Constitution Compliance Checklist

After implementation, verify:

- [ ] **Type Safety First**: No `any` types, all types defined in src/types/
- [ ] **No Tests Policy**: No test files created
- [ ] **KISS Principle**: Simplest solution chosen (extending existing auth vs new system)
- [ ] **DRY Principle**: Code reused (existing user operations, auth patterns)
- [ ] **German Language**: All user-facing text in German
- [ ] **Structured Logging**: Logger used for all server-side logging
- [ ] **File Size Limit**: No file exceeds 500 lines
- [ ] **Modular Architecture**: Domain-based organization maintained
- [ ] **JSDoc Comments**: All functions documented
- [ ] **Path Aliases**: @/ used consistently

---

## Success Criteria

Feature is complete when:

1. ✅ All tasks T001-T025 completed
2. ✅ `npm run check` passes without errors
3. ✅ All manual validation workflows pass (quickstart.md)
4. ✅ All constitution principles respected
5. ✅ No console errors in browser
6. ✅ All user-facing text in German
7. ✅ Database migration applied successfully
8. ✅ Single-session enforcement working
9. ✅ Role-based access control working
10. ✅ Member portal accessible to appropriate users
