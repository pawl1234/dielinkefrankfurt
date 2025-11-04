# Quickstart Guide: Group User Membership & Responsible Person Management

**Feature**: 011-group-user-membership
**Branch**: `011-group-user-membership`
**Date**: 2025-11-03

## Overview

This guide provides step-by-step instructions for implementing the group membership and responsible person features. Follow these steps in order to ensure proper setup and implementation.

---

## Prerequisites

Before starting implementation:

1. ✅ Feature specification reviewed (`spec.md`)
2. ✅ Implementation plan approved (`plan.md`)
3. ✅ Data model designed (`data-model.md`)
4. ✅ API contracts defined (`contracts/api-contracts.md`)
5. ✅ Research completed (`research.md`)
6. ✅ Working on feature branch: `011-group-user-membership`

**Required Knowledge**:
- TypeScript (strict mode)
- Next.js 15 App Router
- Prisma ORM
- Material UI components
- React Hook Form + Zod validation
- NextAuth.js authentication

**Development Environment**:
- Node.js 18+
- PostgreSQL database running
- Development server can be started with `npm run dev`

---

## Implementation Phases

### Phase 1: Database Schema (30-60 min)

#### Step 1.1: Update Prisma Schema

**File**: `prisma/schema.prisma`

Add the two new models after the existing `Group` model:

```prisma
// Add to User model (find existing User model and add these relations)
model User {
  // ... existing fields ...

  // NEW: Group membership relationships
  groupMemberships     GroupMember[]         @relation("UserGroupMemberships")
  responsibleForGroups GroupResponsibleUser[] @relation("UserResponsibleGroups")

  // ... existing relations ...
}

// Add to Group model (find existing Group model and add these relations)
model Group {
  // ... existing fields and relations ...

  // NEW: User-based relationships
  members                 GroupMember[]         @relation("GroupMembers")
  responsibleUsers        GroupResponsibleUser[] @relation("GroupResponsibleUsers")

  // ... rest of model ...
}

// Add new models at the end of the file
model GroupMember {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation("UserGroupMemberships", fields: [userId], references: [id], onDelete: Cascade)
  groupId   String
  group     Group    @relation("GroupMembers", fields: [groupId], references: [id], onDelete: Cascade)
  joinedAt  DateTime @default(now())

  @@unique([userId, groupId])
  @@index([userId])
  @@index([groupId])
  @@map("group_member")
}

model GroupResponsibleUser {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation("UserResponsibleGroups", fields: [userId], references: [id], onDelete: Cascade)
  groupId    String
  group      Group    @relation("GroupResponsibleUsers", fields: [groupId], references: [id], onDelete: Cascade)
  assignedAt DateTime @default(now())

  @@unique([userId, groupId])
  @@index([userId])
  @@index([groupId])
  @@map("group_responsible_user")
}
```

#### Step 1.2: Push Database Changes

```bash
npm run db:push
```

**Expected Output**:
```
✔ Generated Prisma Client
✔ Applied migration to database
```

#### Step 1.3: Verify Schema

```bash
npm run db:studio
```

Navigate to `http://localhost:5555` and verify:
- `group_member` table exists with correct columns
- `group_responsible_user` table exists with correct columns
- Relations visible in Prisma Studio

---

### Phase 2: Database Operations Layer (60-90 min)

#### Step 2.1: Create Group Member Operations

**File**: `src/lib/db/group-member-operations.ts`

Create new file with CRUD operations:

```typescript
import prisma from './prisma';
import { GroupMember, Prisma } from '@prisma/client';

/**
 * Create a new group member (user joins group).
 */
export async function createGroupMember(
  userId: string,
  groupId: string
): Promise<GroupMember> {
  // Implementation here - see data-model.md for full function
}

/**
 * Delete a group member (user leaves or is removed).
 */
export async function deleteGroupMember(
  userId: string,
  groupId: string
): Promise<void> {
  // Implementation here
}

/**
 * Find all members of a group with pagination.
 */
export async function findGroupMembers(params: {
  groupId: string;
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}): Promise<{ members: GroupMember[]; totalItems: number }> {
  // Implementation here - include user data and responsible person flag
}

/**
 * Find all groups where user is a member.
 */
export async function findUserMemberships(
  userId: string
): Promise<GroupMember[]> {
  // Implementation here
}

/**
 * Check if user is a member of a group.
 */
export async function isUserMemberOfGroup(
  userId: string,
  groupId: string
): Promise<boolean> {
  // Implementation here
}

/**
 * Count members in a group.
 */
export async function countGroupMembers(groupId: string): Promise<number> {
  // Implementation here
}
```

**Key Principles**:
- ALL database operations in this file (per Constitution Principle X)
- Use JSDoc comments (per Constitution Principle IX)
- No `any` types (per Constitution Principle I)
- Import types from `@prisma/client`

#### Step 2.2: Extend Group Operations

**File**: `src/lib/db/group-operations.ts`

Add new functions at the end of existing file:

```typescript
/**
 * Assign a user as a responsible person for a group.
 * Automatically creates GroupMember record if not exists.
 */
export async function assignResponsibleUser(
  userId: string,
  groupId: string
): Promise<{ responsibleUser: GroupResponsibleUser; memberCreated: boolean }> {
  // Implementation here - use transaction to create both records
}

/**
 * Remove a user's responsible person assignment.
 * Does NOT remove GroupMember record.
 */
export async function removeResponsibleUser(
  userId: string,
  groupId: string
): Promise<void> {
  // Implementation here
}

/**
 * Find all user-based responsible persons for a group.
 */
export async function findGroupResponsibleUsers(
  groupId: string
): Promise<GroupResponsibleUser[]> {
  // Implementation here - include user data
}

/**
 * Check if user is a responsible person for a group.
 */
export async function isUserResponsibleForGroup(
  userId: string,
  groupId: string
): Promise<boolean> {
  // Implementation here
}

/**
 * Find all groups where user is a member or responsible person.
 */
export async function findGroupsWithMembership(
  userId: string
): Promise<Group[]> {
  // Implementation here - include member and responsible flags
}

/**
 * Get all responsible person emails for a group (both types).
 */
export async function getGroupResponsibleEmails(
  groupId: string
): Promise<string[]> {
  // Query both ResponsiblePerson and GroupResponsibleUser
}
```

#### Step 2.3: Validation Check

Run type checking to verify database operations:

```bash
npm run typecheck
```

**Fix any type errors before proceeding.**

---

### Phase 3: Business Logic Layer (60-90 min)

#### Step 3.1: Create Permission Utilities

**File**: `src/lib/groups/permissions.ts`

Create new domain directory and file:

```bash
mkdir -p src/lib/groups
```

```typescript
import { isUserMemberOfGroup } from '@/lib/db/group-member-operations';
import { isUserResponsibleForGroup } from '@/lib/db/group-operations';

/**
 * Check if user has permission to edit a group.
 */
export async function canUserEditGroup(
  userId: string,
  groupId: string
): Promise<boolean> {
  return await isUserResponsibleForGroup(userId, groupId);
}

/**
 * Check if user has permission to manage members.
 */
export async function canUserManageMembers(
  userId: string,
  groupId: string
): Promise<boolean> {
  return await isUserResponsibleForGroup(userId, groupId);
}

/**
 * Check if user can leave a group (not if they're a responsible person).
 */
export async function canUserLeaveGroup(
  userId: string,
  groupId: string
): Promise<boolean> {
  const isMember = await isUserMemberOfGroup(userId, groupId);
  const isResponsible = await isUserResponsibleForGroup(userId, groupId);
  return isMember && !isResponsible;
}

/**
 * Get comprehensive permissions for a user on a group.
 */
export async function getGroupPermissions(
  userId: string,
  groupId: string
): Promise<GroupPermissions> {
  // Return all permission flags
}
```

#### Step 3.2: Create Email Notification Utilities

**File**: `src/lib/groups/member-notifications.ts`

```typescript
import { getGroupResponsibleEmails } from '@/lib/db/group-operations';
import { findUserById } from '@/lib/db/user-operations';
import { findGroupById } from '@/lib/db/group-operations';
import { sendEmail } from '@/lib/email/senders';
import { render } from '@react-email/render';
import GroupMemberJoinedEmail from '@/emails/notifications/group-member-joined';
import { logger } from '@/lib/logger';

/**
 * Send email notification to responsible persons when a new member joins.
 */
export async function sendMemberJoinedNotification(
  groupId: string,
  newMemberUserId: string
): Promise<void> {
  // Implementation:
  // 1. Get group details
  // 2. Get new member details
  // 3. Get all responsible emails (both types)
  // 4. Render email template
  // 5. Send to all responsible persons
  // 6. Log success/failure
}
```

#### Step 3.3: Create Email Template

**File**: `src/emails/notifications/group-member-joined.tsx`

```typescript
import { Html, Head, Body, Container, Section, Text, Link } from '@react-email/components';

interface GroupMemberJoinedEmailProps {
  groupName: string;
  memberName: string;
  memberEmail: string;
  groupUrl: string;
}

/**
 * Email template for group member join notification.
 */
export default function GroupMemberJoinedEmail({
  groupName,
  memberName,
  memberEmail,
  groupUrl
}: GroupMemberJoinedEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Section>
            <Text style={heading}>Neues Mitglied beigetreten</Text>
            <Text style={paragraph}>
              {memberName} ({memberEmail}) ist der Gruppe "{groupName}" beigetreten.
            </Text>
            <Link href={groupUrl} style={link}>
              Gruppe verwalten
            </Link>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Styles here
```

#### Step 3.4: Validation Check

```bash
npm run typecheck
```

---

### Phase 4: Validation Schemas (30 min)

#### Step 4.1: Extend Group Validation Schema

**File**: `src/lib/validation/group-schema.ts`

Add new schemas at the end of existing file:

```typescript
import { z } from 'zod';

// Join group request
export const joinGroupSchema = z.object({
  groupId: z.string().cuid('Ungültige Gruppen-ID')
});

// Leave group request
export const leaveGroupSchema = z.object({
  groupId: z.string().cuid('Ungültige Gruppen-ID')
});

// Remove member request
export const removeMemberSchema = z.object({
  userId: z.string().cuid('Ungültige Benutzer-ID')
});

// Assign responsible user request
export const assignResponsibleUserSchema = z.object({
  userId: z.string().cuid('Ungültige Benutzer-ID')
});

// Remove responsible user request
export const removeResponsibleUserSchema = z.object({
  userId: z.string().cuid('Ungültige Benutzer-ID')
});

// Export types
export type JoinGroupInput = z.infer<typeof joinGroupSchema>;
export type LeaveGroupInput = z.infer<typeof leaveGroupSchema>;
export type RemoveMemberInput = z.infer<typeof removeMemberSchema>;
export type AssignResponsibleUserInput = z.infer<typeof assignResponsibleUserSchema>;
export type RemoveResponsibleUserInput = z.infer<typeof removeResponsibleUserSchema>;
```

---

### Phase 5: API Routes (90-120 min)

#### Step 5.1: Create Join Group Endpoint

**File**: `src/app/api/portal/groups/join/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { joinGroupSchema } from '@/lib/validation/group-schema';
import { createGroupMember, isUserMemberOfGroup } from '@/lib/db/group-member-operations';
import { findGroupById } from '@/lib/db/group-operations';
import { sendMemberJoinedNotification } from '@/lib/groups/member-notifications';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    // 1. Check authentication (middleware ensures this, but verify session data)
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert' },
        { status: 401 }
      );
    }

    // 2. Validate request body
    const body = await request.json();
    const validation = joinGroupSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Ungültige Anfrage', details: validation.error.message },
        { status: 400 }
      );
    }

    // 3. Check if group exists and is ACTIVE
    const group = await findGroupById(validation.data.groupId);
    if (!group) {
      return NextResponse.json(
        { error: 'Gruppe nicht gefunden' },
        { status: 404 }
      );
    }
    if (group.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Diese Gruppe ist nicht aktiv und kann nicht beigetreten werden' },
        { status: 403 }
      );
    }

    // 4. Check if already member
    const isMember = await isUserMemberOfGroup(session.user.id, validation.data.groupId);
    if (isMember) {
      return NextResponse.json(
        { error: 'Sie sind bereits Mitglied dieser Gruppe' },
        { status: 400 }
      );
    }

    // 5. Create membership
    const groupMember = await createGroupMember(session.user.id, validation.data.groupId);

    // 6. Send notification (async, don't wait)
    sendMemberJoinedNotification(validation.data.groupId, session.user.id)
      .catch(err => logger.error('Failed to send member joined notification', { error: err }));

    // 7. Return success
    return NextResponse.json({
      success: true,
      message: 'Erfolgreich der Gruppe beigetreten',
      data: { groupMember }
    });

  } catch (error) {
    logger.error('Error in POST /api/groups/join', { error });
    return NextResponse.json(
      { error: 'Fehler beim Beitreten der Gruppe' },
      { status: 500 }
    );
  }
}
```

**Repeat similar pattern for other endpoints**:

**Portal endpoints** (in `src/app/api/portal/groups/`):
- `leave/route.ts` (POST)
- `route.ts` (GET - list groups)
- `[groupId]/route.ts` (GET - group details)
- `[groupId]/members/route.ts` (GET, DELETE)

**Admin endpoints** (in `src/app/api/admin/groups/`):
- `[groupId]/responsible/route.ts` (POST, DELETE)

#### Step 5.2: Test API Endpoints

Use a tool like Postman or curl to test each endpoint:

```bash
# Test join group (must be authenticated with session cookie)
curl -X POST http://localhost:3000/api/portal/groups/join \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{"groupId":"clxyz123..."}'
```

**Verify**:
- Middleware protects endpoints (requests to `/api/portal/*` require authentication)
- Session validation works
- Validation works (400 for invalid input)
- Success creates database record
- Email notification sent

**Note**: Portal middleware should already be configured. If not, verify middleware configuration in `src/middleware.ts` or similar.

---

### Phase 6: Portal UI Components (120-180 min)

#### Step 6.1: Create Groups List Component

**File**: `src/components/portal/GroupsList.tsx`

```typescript
'use client';

import { Box, Card, CardContent, Typography, Button, Chip } from '@mui/material';
import { PortalGroupListItem } from '@/types/api-types';

interface GroupsListProps {
  groups: PortalGroupListItem[];
  onJoinGroup: (groupId: string) => Promise<void>;
  onLeaveGroup: (groupId: string) => Promise<void>;
}

export default function GroupsList({ groups, onJoinGroup, onLeaveGroup }: GroupsListProps) {
  // Implementation: Map over groups, render cards with join/leave buttons
}
```

#### Step 6.2: Create Members Table Component

**File**: `src/components/portal/GroupMembersTable.tsx`

```typescript
'use client';

import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { GroupMemberResponse } from '@/types/api-types';
import { Chip, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

interface GroupMembersTableProps {
  members: GroupMemberResponse[];
  canManageMembers: boolean;
  onRemoveMember: (userId: string) => Promise<void>;
}

export default function GroupMembersTable({
  members,
  canManageMembers,
  onRemoveMember
}: GroupMembersTableProps) {
  // Implementation: DataGrid with columns for name, joined date, role indicator
}
```

#### Step 6.3: Create Group Edit Form Component

**File**: `src/components/portal/GroupEditForm.tsx`

Reuse patterns from admin group form, adapt for portal context.

---

### Phase 7: Portal Pages (120-180 min)

#### Step 7.1: Create Main Groups Page

**File**: `src/app/portal/gruppen/page.tsx`

```typescript
import { Tabs, Tab, Box, TextField } from '@mui/material';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { redirect } from 'next/navigation';
import GroupsList from '@/components/portal/GroupsList';

export default async function GruppenPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/login?callbackUrl=/portal/gruppen');
  }

  // Fetch groups from API
  // Render tabs: Alle Gruppen, Meine Gruppen
  // Include search field
}
```

#### Step 7.2: Create Group Detail Page

**File**: `src/app/portal/gruppen/[groupId]/page.tsx`

Display group overview with navigation to submenu items.

#### Step 7.3: Create Members Page

**File**: `src/app/portal/gruppen/[groupId]/mitglieder/page.tsx`

Display members table using GroupMembersTable component.

#### Step 7.4: Create Group Layout with Submenu

**File**: `src/app/portal/gruppen/[groupId]/layout.tsx`

```typescript
import { Box, Tabs, Tab } from '@mui/material';
import Link from 'next/link';

export default function GroupLayout({ children, params }: { children: React.ReactNode; params: { groupId: string } }) {
  return (
    <Box>
      <Tabs>
        <Tab label="Übersicht" component={Link} href={`/portal/gruppen/${params.groupId}`} />
        <Tab label="Mitglieder" component={Link} href={`/portal/gruppen/${params.groupId}/mitglieder`} />
        <Tab label="Dateien" component={Link} href={`/portal/gruppen/${params.groupId}/dateien`} disabled />
        {/* More placeholder tabs */}
      </Tabs>
      {children}
    </Box>
  );
}
```

---

### Phase 8: Admin Portal Extensions (60-90 min)

#### Step 8.1: Extend Admin Group Page

**File**: `src/app/admin/groups/page.tsx`

Add UI for assigning/removing user-based responsible persons:
- User search/select component
- Display both email-based and user-based responsible persons
- Visual distinction between types

---

### Phase 9: Testing & Validation (60-90 min)

#### Step 9.1: Manual Testing Checklist

Test all user stories from spec.md:

- [ ] User can join active group
- [ ] User receives confirmation after joining
- [ ] Responsible persons receive email notification
- [ ] User can view "Meine Gruppen"
- [ ] User can leave group (if not responsible person)
- [ ] Responsible person can view members
- [ ] Responsible person can remove members
- [ ] Responsible person can edit group
- [ ] Responsible person cannot delete/archive group
- [ ] Admin can assign user as responsible person
- [ ] Search works in both tabs
- [ ] Pagination works for large member lists
- [ ] Backwards compatibility maintained (email-based responsible persons still work)

#### Step 9.2: Run Validation

```bash
npm run check
```

**Fix all lint and type errors.**

#### Step 9.3: Database Verification

```bash
npm run db:studio
```

Verify:
- GroupMember records created correctly
- GroupResponsibleUser records created correctly
- Cascade deletes work (test by deleting a test user)
- Unique constraints prevent duplicates

---

## Development Commands Reference

```bash
# Start development server
npm run dev

# Run type checking
npm run typecheck

# Run linting
npm run lint

# Fix linting issues automatically
npm run lint:fix

# Run full validation (MUST run before committing)
npm run check

# Push database schema changes
npm run db:push

# Open Prisma Studio
npm run db:studio
```

---

## Troubleshooting

### Database Migration Issues

**Problem**: `npm run db:push` fails with constraint errors

**Solution**:
1. Check for existing data conflicts
2. Verify foreign key references
3. Check Prisma schema syntax
4. Review migration output for specific errors

### Type Errors

**Problem**: TypeScript errors after adding new types

**Solution**:
1. Ensure Prisma Client regenerated: `npm run db:generate`
2. Restart TypeScript server in VS Code
3. Check import paths use `@/` alias
4. Verify types exist in `src/types/`

### Authentication Issues

**Problem**: API routes return 401 even when logged in

**Solution**:
1. Check NextAuth.js session in browser DevTools
2. Verify `authOptions` imported correctly
3. Check cookie settings in NextAuth config

### Email Not Sending

**Problem**: Member join notifications not received

**Solution**:
1. Check email server running (`npm run mail:start`)
2. Verify GroupSettings.officeContactEmail configured
3. Check logger output for email errors
4. Test with MailDev web UI (http://localhost:1080)

---

## Next Steps

After completing this implementation:

1. ✅ Run final validation: `npm run check`
2. ✅ Verify all acceptance criteria from spec.md
3. ✅ Test manually with multiple user accounts
4. ✅ Commit changes with descriptive message
5. ⏭ Move to next phase or create pull request

---

## Support Resources

- **Project Constitution**: `.specify/memory/constitution.md`
- **Feature Spec**: `specs/011-group-user-membership/spec.md`
- **Data Model**: `specs/011-group-user-membership/data-model.md`
- **API Contracts**: `specs/011-group-user-membership/contracts/api-contracts.md`
- **Research**: `specs/011-group-user-membership/research.md`

---

## Estimated Timeline

| Phase | Task | Time Estimate |
|-------|------|---------------|
| 1 | Database Schema | 30-60 min |
| 2 | Database Operations | 60-90 min |
| 3 | Business Logic | 60-90 min |
| 4 | Validation Schemas | 30 min |
| 5 | API Routes | 90-120 min |
| 6 | Portal UI Components | 120-180 min |
| 7 | Portal Pages | 120-180 min |
| 8 | Admin Extensions | 60-90 min |
| 9 | Testing & Validation | 60-90 min |
| **Total** | | **10-16 hours** |

**Note**: Times are estimates for experienced developers familiar with the codebase. Adjust based on skill level and unfamiliarity with technologies.
