# Data Model: Member Portal with Role-Based Access

**Feature**: Member Portal with Role-Based Access
**Branch**: `006-currently-the-system`
**Date**: 2025-10-16

## Overview

This document defines the data model changes required to support role-based access control and the member portal. The existing system already has a User model with a role field. This feature extends the model with session management and formalizes role types.

## Entity Changes

### 1. User (MODIFY EXISTING)

**Description**: Represents authenticated system users with assigned roles determining access permissions.

**Existing Fields** (from prisma/schema.prisma:209-227):
- `id`: String (cuid) - Primary key
- `username`: String (unique) - Login username
- `email`: String (unique) - User email address
- `passwordHash`: String - Bcrypt hashed password
- `firstName`: String? - Optional first name
- `lastName`: String? - Optional last name
- `isActive`: Boolean (default true) - Account active status
- `role`: String (default "admin") - User role for authorization
- `createdAt`: DateTime - Account creation timestamp
- `updatedAt`: DateTime - Last update timestamp
- `passwordResetToken`: String? - Token for password reset (existing, unused in this feature)
- `passwordResetExpires`: DateTime? - Token expiration (existing, unused in this feature)

**New Fields**:
- `activeSessionToken`: String? - Current valid session token for single-session enforcement

**Validation Rules**:
- `username`: Required, unique, 3-50 characters
- `email`: Required, unique, valid email format
- `passwordHash`: Required, bcrypt hash
- `role`: Required, must be one of: "admin", "mitglied"
- `firstName`: Optional, max 50 characters
- `lastName`: Optional, max 50 characters
- `isActive`: Required, boolean
- `activeSessionToken`: Optional, cuid format if present

**State Transitions**:
```
NEW → ACTIVE (when account created with isActive=true)
ACTIVE → INACTIVE (when admin sets isActive=false)
INACTIVE → ACTIVE (when admin reactivates account)
ACTIVE → DELETED (when admin deletes account)

Role Changes:
ANY_ROLE → ANY_ROLE (admin can change role, takes effect on next login)

Session States:
NO_SESSION → HAS_SESSION (on login, activeSessionToken set)
HAS_SESSION → NO_SESSION (on logout or session invalidation)
HAS_SESSION → NEW_SESSION (on new login, old token replaced)
```

**Relationships**:
- None (User is a standalone entity in this system)

**Indexes** (existing from prisma/schema.prisma:223-225):
- `email` (unique constraint + index)
- `username` (unique constraint + index)
- `isActive` (filter index)

**New Indexes Required**:
- `activeSessionToken` (lookup index for session validation)

### 2. UserRole (NEW TYPE DEFINITION)

**Description**: Type-safe enumeration of user roles for authorization

**Type Definition** (TypeScript):
```typescript
export type UserRole = 'admin' | 'mitglied';
```

**Constant Definitions** (for runtime use):
```typescript
export const USER_ROLES = {
  ADMIN: 'admin',
  MITGLIED: 'mitglied'
} as const;
```

**Validation Rules**:
- Must be one of the defined role values
- Case-sensitive exact match required
- Future roles can be added by extending the type and constant

**Role Permissions**:
- `admin`: Full system access (admin interface + member portal)
- `mitglied`: Member portal access only

### 3. Session (IMPLICIT - JWT Token Claims)

**Description**: Represents an authenticated user session stored in JWT token

**Token Claims Structure**:
```typescript
{
  id: string;              // User ID
  username: string;         // Username for display
  role: UserRole;           // User role for authorization
  sessionToken: string;     // Active session token (cuid)
  isEnvironmentUser: boolean; // Whether user is env-based admin
  iat: number;              // Token issued at (JWT standard)
  exp: number;              // Token expires at (JWT standard)
}
```

**Validation**:
- Session token must match activeSessionToken in database
- Token must not be expired (JWT exp claim)
- User must be active (isActive=true)

**Lifecycle**:
1. Created on successful login
2. Validated on every protected route access
3. Invalidated on logout or new login
4. Expires based on NextAuth session max age

## Database Schema Changes

### Prisma Schema Modification

```prisma
model User {
  id                   String      @id @default(cuid())
  username             String      @unique
  email                String      @unique
  passwordHash         String
  firstName            String?
  lastName             String?
  isActive             Boolean     @default(true)
  role                 String      @default("admin")
  activeSessionToken   String?     // NEW FIELD
  createdAt            DateTime    @default(now())
  updatedAt            DateTime    @updatedAt
  passwordResetToken   String?
  passwordResetExpires DateTime?

  @@index([email])
  @@index([username])
  @@index([isActive])
  @@index([activeSessionToken])  // NEW INDEX
  @@map("users")
}
```

### Migration Impact

**Migration Type**: Additive (low risk)

**Changes**:
1. Add nullable `activeSessionToken` field to User table
2. Add index on `activeSessionToken` field

**Data Migration**:
- No data migration needed
- Existing users: activeSessionToken will be null
- On next login: activeSessionToken will be populated

**Backward Compatibility**:
- ✅ Existing admin users continue to work
- ✅ Existing authentication flow continues to work
- ✅ Null activeSessionToken is valid (user not logged in)

## Type Definitions

### TypeScript Types (src/types/)

#### user.ts (MODIFY)

```typescript
export type UserRole = 'admin' | 'mitglied';

export interface User {
  id: string;
  username: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  isActive: boolean;
  role: UserRole;  // Changed from string to UserRole
  activeSessionToken?: string | null;  // NEW
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserData {
  username: string;
  email: string;
  password: string;  // Plain text, will be hashed
  role: UserRole;
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
}

export interface UpdateUserData {
  username?: string;
  email?: string;
  password?: string;  // Plain text, will be hashed if provided
  role?: UserRole;
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
}
```

#### api-types.ts (MODIFY/ADD)

```typescript
// User Management API Types

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

#### next-auth.d.ts (EXTEND)

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

## Validation Schemas

### Zod Schemas (src/lib/validation/)

#### user-schema.ts (NEW)

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
  { message: 'At least one field must be provided for update' }
);

export const deleteUserSchema = z.object({
  id: z.string().cuid()
});
```

## Data Access Patterns

### Database Operations (src/lib/db/user-operations.ts)

**Existing operations to MODIFY**:
- `createUser()` - Add activeSessionToken parameter (optional)
- `updateUser()` - Add activeSessionToken parameter (optional)
- `findUserByUsername()` - No changes
- `findUserById()` - No changes
- `deleteUser()` - No changes
- `listUsers()` - No changes

**New operations to ADD**:
- `updateUserSessionToken(userId: string, token: string | null)` - Update session token
- `findUserBySessionToken(token: string)` - Find user by active session token
- `invalidateAllSessions(userId: string)` - Clear session token (logout)

### Authorization Helpers (src/lib/auth/)

**New functions**:
- `requireRole(allowedRoles: UserRole[])` - Middleware factory for role checks
- `hasRole(userRole: UserRole, allowedRoles: UserRole[])` - Check if user has allowed role
- `isAdmin(userRole: UserRole)` - Check if user is admin
- `canAccessPortal(userRole: UserRole)` - Check if user can access portal
- `validateSessionToken(userId: string, token: string)` - Verify session token validity

## Summary

**New Entities**: 0 (only type definition)
**Modified Entities**: 1 (User model)
**New Fields**: 1 (activeSessionToken)
**New Indexes**: 1 (activeSessionToken)
**Migration Risk**: Low (additive change only)
**Backward Compatibility**: ✅ Full compatibility maintained
