# Data Model: Group User Membership & Responsible Person Management

**Feature**: 011-group-user-membership
**Date**: 2025-11-03
**Status**: Phase 1 Design

## Overview

This document defines the database schema additions and modifications required to support user-based group membership and responsible person assignment while maintaining backwards compatibility with email-based responsible persons.

## New Entities

### GroupMember

Represents a user's membership in a group. Users can join groups themselves (self-join for ACTIVE groups) or be automatically added when assigned as responsible persons.

**Attributes**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String | PK, cuid() | Unique identifier |
| userId | String | FK → User.id, NOT NULL | Reference to User |
| groupId | String | FK → Group.id, NOT NULL | Reference to Group |
| joinedAt | DateTime | NOT NULL, default: now() | Timestamp when user joined group |

**Relationships**:
- Belongs to one User (many-to-one via userId)
- Belongs to one Group (many-to-one via groupId)

**Constraints**:
- `@@unique([userId, groupId])` - Prevents duplicate memberships
- `@@index([userId])` - Fast lookup of user's memberships
- `@@index([groupId])` - Fast lookup of group's members
- `onDelete: Cascade` on both User and Group - Automatic cleanup when User or Group deleted

**Validation Rules** (Zod schema):
- userId: Must be valid cuid, must reference existing active User
- groupId: Must be valid cuid, must reference existing Group
- For self-join: Group must have status=ACTIVE

**State Transitions**:
- Created: When user clicks "Beitreten" OR when assigned as responsible person
- Deleted: When user clicks "Verlassen" OR responsible person removes member OR User/Group deleted

**Prisma Schema**:
```prisma
model GroupMember {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  groupId   String
  group     Group    @relation(fields: [groupId], references: [id], onDelete: Cascade)
  joinedAt  DateTime @default(now())

  @@unique([userId, groupId])
  @@index([userId])
  @@index([groupId])
  @@map("group_member")
}
```

---

### GroupResponsibleUser

Represents a user account assigned as a responsible person for a group. This is separate from the email-based ResponsiblePerson model to maintain backwards compatibility. Users assigned as responsible persons are automatically also members of the group.

**Attributes**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String | PK, cuid() | Unique identifier |
| userId | String | FK → User.id, NOT NULL | Reference to User |
| groupId | String | FK → Group.id, NOT NULL | Reference to Group |
| assignedAt | DateTime | NOT NULL, default: now() | Timestamp when user was assigned |

**Relationships**:
- Belongs to one User (many-to-one via userId)
- Belongs to one Group (many-to-one via groupId)

**Constraints**:
- `@@unique([userId, groupId])` - Prevents duplicate assignments
- `@@index([userId])` - Fast lookup of user's responsible groups
- `@@index([groupId])` - Fast lookup of group's responsible users
- `onDelete: Cascade` on both User and Group - Automatic cleanup when User or Group deleted

**Validation Rules** (Zod schema):
- userId: Must be valid cuid, must reference existing active User
- groupId: Must be valid cuid, must reference existing Group
- Only admins can create/delete GroupResponsibleUser records

**Business Rules**:
1. When GroupResponsibleUser created → Automatically create GroupMember record (if not exists)
2. When GroupResponsibleUser deleted → GroupMember record remains (user stays as member)
3. Responsible persons cannot remove themselves (must be removed by admin or another responsible person)

**Prisma Schema**:
```prisma
model GroupResponsibleUser {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  groupId    String
  group      Group    @relation(fields: [groupId], references: [id], onDelete: Cascade)
  assignedAt DateTime @default(now())

  @@unique([userId, groupId])
  @@index([userId])
  @@index([groupId])
  @@map("group_responsible_user")
}
```

---

## Modified Entities

### User (Existing)

**New Relationships**:
- Has many GroupMember records (user can be member of multiple groups)
- Has many GroupResponsibleUser records (user can be responsible person for multiple groups)

**Prisma Schema Changes**:
```prisma
model User {
  // ... existing fields ...

  // NEW: Group membership relationships
  groupMemberships     GroupMember[]         @relation("UserGroupMemberships")
  responsibleForGroups GroupResponsibleUser[] @relation("UserResponsibleGroups")

  // ... existing relations ...
}
```

**No changes to existing fields** - only new relations added.

---

### Group (Existing)

**New Relationships**:
- Has many GroupMember records (group can have multiple members)
- Has many GroupResponsibleUser records (group can have multiple user-based responsible persons)

**Existing Relationships** (unchanged):
- Has many ResponsiblePerson records (email-based, for backwards compatibility)
- Has many StatusReport records

**Prisma Schema Changes**:
```prisma
model Group {
  // ... existing fields ...

  // EXISTING: Email-based responsible persons (unchanged)
  responsiblePersons      ResponsiblePerson[]

  // NEW: User-based relationships
  members                 GroupMember[]         @relation("GroupMembers")
  responsibleUsers        GroupResponsibleUser[] @relation("GroupResponsibleUsers")

  // ... existing relations ...
}
```

**No changes to existing fields** - only new relations added.

---

## Entity Relationships Diagram

```
┌─────────────────┐
│      User       │
│  (existing)     │
│                 │
│ id: String (PK) │
│ username        │
│ email           │
│ firstName       │
│ lastName        │
│ ...             │
└────────┬────────┘
         │
         │ 1
         │
         │ N
┌────────┴────────────────┐           ┌────────────────────┐
│   GroupMember (NEW)     │     N     │      Group         │
│                         ├───────────┤   (existing)       │
│ id: String (PK)         │     1     │                    │
│ userId: String (FK)     │           │ id: String (PK)    │
│ groupId: String (FK)    │           │ name               │
│ joinedAt: DateTime      │           │ slug               │
│                         │           │ description        │
│ UNIQUE(userId, groupId) │           │ status: GroupStatus│
└─────────────────────────┘           │ ...                │
                                      └────────┬───────────┘
         │                                     │
         │ 1                                   │ 1
         │                                     │
         │ N                                   │ N
┌────────┴────────────────┐           ┌───────┴────────────┐
│GroupResponsibleUser(NEW)│           │ResponsiblePerson   │
│                         │           │   (existing)       │
│ id: String (PK)         │           │                    │
│ userId: String (FK)     │           │ id: String (PK)    │
│ groupId: String (FK)    │           │ firstName          │
│ assignedAt: DateTime    │           │ lastName           │
│                         │           │ email              │
│ UNIQUE(userId, groupId) │           │ groupId: String(FK)│
└─────────────────────────┘           └────────────────────┘
```

**Key Points**:
1. User ↔ Group: Many-to-many via GroupMember (membership)
2. User ↔ Group: Many-to-many via GroupResponsibleUser (responsible person assignment)
3. Group ↔ ResponsiblePerson: One-to-many (existing, email-based, unchanged)
4. Both membership types use cascade delete on User and Group

---

## Data Integrity Rules

### Referential Integrity

1. **GroupMember**:
   - userId MUST reference valid User.id
   - groupId MUST reference valid Group.id
   - Cascade delete when User or Group deleted

2. **GroupResponsibleUser**:
   - userId MUST reference valid User.id
   - groupId MUST reference valid Group.id
   - Cascade delete when User or Group deleted

### Uniqueness Constraints

1. **GroupMember**: No duplicate (userId, groupId) pairs
2. **GroupResponsibleUser**: No duplicate (userId, groupId) pairs

### Business Rule Constraints

1. **Responsible Person Auto-Membership**:
   - When creating GroupResponsibleUser → Check if GroupMember exists
   - If not exists → Create GroupMember with same userId/groupId
   - Implemented in `src/lib/db/group-member-operations.ts`

2. **Self-Join Restrictions**:
   - Users can only self-join groups with status=ACTIVE
   - Enforced in API validation (Zod schema + API logic)

3. **Self-Removal Restrictions**:
   - Users can remove themselves from GroupMember IF NOT in GroupResponsibleUser
   - Responsible persons cannot self-remove from GroupMember
   - Enforced in API logic

---

## Migration Strategy

### Database Migration Steps

1. **Add new tables**:
   ```bash
   # Prisma will generate migration automatically
   npm run db:push
   ```

2. **No data migration needed**:
   - Existing ResponsiblePerson records remain unchanged
   - New GroupMember and GroupResponsibleUser start empty
   - Users can begin joining groups immediately after deployment

3. **Rollback Plan**:
   - Drop `group_member` table
   - Drop `group_responsible_user` table
   - Remove relations from User and Group models
   - No impact on existing functionality

### Backwards Compatibility

**Guaranteed Compatibility**:
- ✅ Existing ResponsiblePerson records continue working
- ✅ No changes to existing Group, User, or ResponsiblePerson fields
- ✅ Existing API endpoints unchanged
- ✅ Admin portal group management continues functioning

**Additive Changes Only**:
- New relations added to User and Group (non-breaking)
- New tables added (no impact on existing tables)
- New API endpoints (no changes to existing endpoints)

---

## Database Operations Reference

**New Files to Create**:

1. **src/lib/db/group-member-operations.ts**:
   - `createGroupMember(userId, groupId)` - Add user to group
   - `deleteGroupMember(userId, groupId)` - Remove user from group
   - `findGroupMembers(groupId, pagination)` - List group members with pagination
   - `findUserMemberships(userId)` - List user's group memberships
   - `isUserMemberOfGroup(userId, groupId)` - Check membership existence
   - `countGroupMembers(groupId)` - Get member count

2. **src/lib/db/group-operations.ts** (extend existing):
   - `assignResponsibleUser(userId, groupId)` - Assign user as responsible person (creates GroupResponsibleUser + GroupMember)
   - `removeResponsibleUser(userId, groupId)` - Remove responsible person assignment
   - `findGroupResponsibleUsers(groupId)` - List user-based responsible persons
   - `isUserResponsibleForGroup(userId, groupId)` - Check responsible person status
   - `findGroupsWithMembership(userId)` - Find groups where user is member or responsible

**Query Patterns**:

```typescript
// Example: Get all group members with responsible person indicator
const members = await prisma.groupMember.findMany({
  where: { groupId },
  include: {
    user: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true
      }
    },
    // Check if this member is also a responsible person
    user: {
      include: {
        responsibleForGroups: {
          where: { groupId }
        }
      }
    }
  },
  orderBy: { joinedAt: 'desc' }
});

// Example: Get all responsible person emails (both types)
const emailResponsible = await prisma.responsiblePerson.findMany({
  where: { groupId },
  select: { email: true }
});

const userResponsible = await prisma.groupResponsibleUser.findMany({
  where: { groupId },
  include: {
    user: { select: { email: true } }
  }
});

const allEmails = [
  ...emailResponsible.map(r => r.email),
  ...userResponsible.map(r => r.user.email)
];
```

---

## Validation Schemas

**New Zod Schemas** (in `src/lib/validation/group-schema.ts`):

```typescript
// Join group request
export const joinGroupSchema = z.object({
  groupId: z.string().cuid()
});

// Leave group request
export const leaveGroupSchema = z.object({
  groupId: z.string().cuid()
});

// Remove member request (for responsible persons)
export const removeMemberSchema = z.object({
  groupId: z.string().cuid(),
  userId: z.string().cuid()
});

// Assign responsible user request (for admins)
export const assignResponsibleUserSchema = z.object({
  groupId: z.string().cuid(),
  userId: z.string().cuid()
});

// Remove responsible user request (for admins/responsible persons)
export const removeResponsibleUserSchema = z.object({
  groupId: z.string().cuid(),
  userId: z.string().cuid()
});
```

---

## Data Model Summary

**New Tables**: 2
- GroupMember (user membership)
- GroupResponsibleUser (user-based responsible persons)

**Modified Tables**: 2
- User (added 2 relations)
- Group (added 2 relations)

**Unchanged Tables**: 1
- ResponsiblePerson (maintained for backwards compatibility)

**Total Database Operations Files**:
- New: `group-member-operations.ts`
- Extended: `group-operations.ts`

**Cascade Delete Behavior**:
- User deleted → All GroupMember + GroupResponsibleUser records deleted
- Group deleted → All GroupMember + GroupResponsibleUser records deleted

**Performance Considerations**:
- All tables have appropriate indexes for common queries
- Unique constraints prevent duplicates at database level
- Pagination support for member lists (50 items/page default)
