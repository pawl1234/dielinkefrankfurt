# Research Document: Group User Membership & Responsible Person Management

**Feature**: 011-group-user-membership
**Date**: 2025-11-03
**Status**: Phase 0 Complete

## Overview

This document consolidates research findings to resolve all "NEEDS CLARIFICATION" items from the Technical Context section and document key architectural decisions for implementing group membership and responsible person features.

## 1. Database Schema Design

### Decision: Use separate junction tables for members and responsible users

**Rationale**:
- **GroupMember**: Tracks user membership with joinedAt timestamp, supports future role expansion
- **GroupResponsibleUser**: Tracks user-based responsible person assignments separately from email-based ResponsiblePerson model
- Maintains backward compatibility with existing ResponsiblePerson (email-based) model
- Follows Prisma best practices for many-to-many relationships with metadata

**Implementation Details**:
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

**Cascade Delete Strategy**: When a User is deleted, all associated GroupMember and GroupResponsibleUser records are automatically removed via `onDelete: Cascade`, preventing orphaned references.

**Alternatives Considered**:
- Single table with role enum: Rejected because responsible person assignment and membership have different semantics and lifecycles
- Reusing ResponsiblePerson with optional userId: Rejected to maintain backward compatibility and avoid mixing email-based and user-based models

## 2. Email Notification System

### Decision: Extend existing email infrastructure in `src/lib/email/`

**Rationale**:
- Project already has established email patterns using nodemailer
- Existing `src/lib/email/senders.ts` provides email sending utilities
- React Email templates in `src/emails/` for consistent styling
- GroupSettings.officeContactEmail provides fallback sender

**Implementation Pattern**:
1. Create new React Email template: `src/emails/notifications/group-member-joined.tsx`
2. Add utility function in `src/lib/groups/member-notifications.ts`:
   - `sendMemberJoinedNotification(groupId, newMemberUserId)`
   - Query both ResponsiblePerson (email) and GroupResponsibleUser (user.email)
   - Send to all responsible person emails
   - Include member name, group name, timestamp

**Email Template Fields**:
- Group name
- New member name (User.firstName + User.lastName)
- Join timestamp
- Link to group member management (admin portal for now, portal once implemented)

**Alternatives Considered**:
- Using external service like SendGrid: Rejected to avoid new dependencies
- Batch notifications: Rejected for simplicity; immediate notification preferred for member moderation

## 3. Permission System for Responsible Persons

### Decision: Create permission checker utility in `src/lib/groups/permissions.ts` with middleware-based route protection

**Rationale**:
- **Middleware protection**: All authenticated endpoints placed in `/api/portal/*` (portal middleware) or `/api/admin/*` (admin middleware)
- Centralized permission logic prevents duplication across API routes
- Simple role check: User is responsible person if GroupResponsibleUser record exists
- Reusable across API endpoints and UI components
- Admin-only operations (assign/remove responsible persons) protected by admin middleware

**Key Functions**:
```typescript
/**
 * Check if user is a responsible person for a specific group
 */
async function isResponsiblePerson(userId: string, groupId: string): Promise<boolean>

/**
 * Check if user is a member of a specific group
 */
async function isGroupMember(userId: string, groupId: string): Promise<boolean>

/**
 * Get all groups where user is a responsible person
 */
async function getUserResponsibleGroups(userId: string): Promise<Group[]>

/**
 * Get all groups where user is a member (including as responsible person)
 */
async function getUserMemberGroups(userId: string): Promise<Group[]>
```

**Route Protection Structure**:
- Portal endpoints (`/api/portal/groups/*`): Protected by portal middleware, accessible to all authenticated users
- Admin endpoints (`/api/admin/groups/*`): Protected by admin middleware, accessible to admins only
- Business logic checks: Additional permission validation in handlers (e.g., responsible person status)

**Permission Rules** (per spec FR-012 to FR-020):
- **Responsible persons CAN**: Edit group fields, view members, remove members (via portal API with additional checks)
- **Responsible persons CANNOT**: Delete groups, archive groups, remove themselves, edit other groups, assign/remove responsible persons
- **Regular members CAN**: View group details, view member list, leave group (self-removal)
- **Regular members CANNOT**: Edit group, remove other members
- **Admins CAN**: Assign/remove responsible persons (via admin API)

**Alternatives Considered**:
- Full RBAC system: Over-engineering for simple use case
- Inline permission checks: Violates DRY principle
- Single unprotected `/api/groups/*`: Security risk, rejected in favor of middleware protection

## 4. User Portal Navigation Structure

### Decision: Nested routes with grouped layouts following Next.js App Router patterns

**Rationale**:
- Existing portal uses Next.js App Router (confirmed by `src/app/portal/page.tsx`)
- Nested routes provide clean URLs: `/portal/gruppen/[groupId]/mitglieder`
- Layout components enable shared navigation/submenu across group pages
- Follows Material UI patterns already in use

**Route Structure**:
```
/portal/gruppen                              → Main groups page (tabs: Alle/Meine)
/portal/gruppen/[groupId]                    → Group detail overview
/portal/gruppen/[groupId]/mitglieder         → Members table
/portal/gruppen/[groupId]/bearbeiten         → Edit group (responsible only)
/portal/gruppen/[groupId]/dateien            → Placeholder (future)
/portal/gruppen/[groupId]/termine            → Placeholder (future)
/portal/gruppen/[groupId]/kommunikation      → Placeholder (future)
```

**Layout Hierarchy**:
- `/portal/layout.tsx`: Portal-wide navigation
- `/portal/gruppen/[groupId]/layout.tsx`: Group-specific submenu

**Alternatives Considered**:
- Single page with tabs: Rejected for complexity and poor URL structure
- Query params for subviews: Rejected for poor UX and SEO

## 5. Search and Filtering

### Decision: Server-side search using Prisma with case-insensitive partial match

**Rationale**:
- Prisma supports `mode: 'insensitive'` for case-insensitive searches
- Search on group name only (per spec clarification)
- Server-side filtering reduces client-side data transfer
- Sufficient for expected scale (~100 groups max)

**Implementation Pattern**:
```typescript
// API route: /api/portal/groups/route.ts
const groups = await prisma.group.findMany({
  where: {
    name: {
      contains: searchQuery,
      mode: 'insensitive'
    },
    status: 'ACTIVE' // For "Alle Gruppen" tab
  }
});
```

**Alternatives Considered**:
- Client-side filtering: Rejected due to unnecessary data transfer for large datasets
- Full-text search: Over-engineering for simple name search
- Elasticsearch: Unnecessary complexity for current scale

## 6. Member Table Pagination

### Decision: Use Material UI DataGrid with server-side pagination

**Rationale**:
- Material UI DataGrid already used in admin portal
- Built-in pagination, sorting, filtering
- Server-side pagination for performance with 500+ members
- Consistent UI with existing admin patterns

**Pagination Parameters**:
- Default page size: 50 members
- Configurable page sizes: [25, 50, 100]
- Initial sort: By joinedAt DESC (newest first)

**Alternatives Considered**:
- Basic table with manual pagination: More work to implement
- Infinite scroll: Rejected for complexity
- Load all members client-side: Rejected for performance with 500+ members

## 7. Backwards Compatibility Strategy

### Decision: Maintain ResponsiblePerson model unchanged, query both tables for responsible persons

**Rationale**:
- Zero migration risk for existing groups
- Email notifications query both ResponsiblePerson and GroupResponsibleUser
- Admin portal displays both types with visual indicators
- No breaking changes to existing API contracts

**Implementation Pattern**:
```typescript
// Get all responsible person emails for a group
async function getGroupResponsibleEmails(groupId: string): Promise<string[]> {
  const emailBased = await prisma.responsiblePerson.findMany({
    where: { groupId },
    select: { email: true }
  });

  const userBased = await prisma.groupResponsibleUser.findMany({
    where: { groupId },
    include: { user: { select: { email: true } } }
  });

  return [
    ...emailBased.map(p => p.email),
    ...userBased.map(p => p.user.email)
  ];
}
```

**Migration Path** (optional future enhancement):
- Existing groups continue with email-based responsible persons
- New assignments can use user accounts
- Admin can optionally migrate email-based to user accounts if email matches User.email

**Alternatives Considered**:
- Migrate all ResponsiblePerson to users: Rejected due to risk and complexity
- Deprecate ResponsiblePerson: Rejected due to breaking change

## 8. Technology Stack Validation

### Confirmed Technologies (from package.json):

| Technology | Version | Usage |
|------------|---------|-------|
| Next.js | 15.4.6 | App Router, API routes |
| React | 19.2.0 | UI components |
| TypeScript | 5.9.2 | Type safety (strict mode) |
| Prisma | 6.13.0 | ORM for PostgreSQL |
| Material UI | 7.3.1 | Component library |
| React Hook Form | 7.62.0 | Form handling |
| Zod | 4.0.17 | Schema validation |
| NextAuth.js | 4.24.11 | Authentication |
| Nodemailer | 6.10.1 | Email sending |

**No New Dependencies Required**: All features can be implemented with existing stack.

## 9. Performance Considerations

### Database Indexes

All new tables include appropriate indexes:
- `@@unique([userId, groupId])` - Prevents duplicate memberships/assignments
- `@@index([userId])` - Fast user lookup for "my groups"
- `@@index([groupId])` - Fast group member listing

### Query Optimization

- Use `include` with `select` to limit returned fields
- Paginate member lists server-side
- Cache frequently accessed permission checks in API route handlers (per-request)
- Batch email sends for member notifications

### Expected Load

- ~100 active groups
- ~500 members per group (max)
- ~10 responsible persons per group (max)
- Member joins: ~10/day
- Email notifications: ~10/day

**Performance Goals** (from Technical Context):
- Search response: <1s ✅ Achievable with indexes
- Page load: <2s ✅ Achievable with pagination
- Member join workflow: <5s ✅ Simple INSERT + email queue
- Email delivery: <2min ✅ Existing infrastructure supports

## 10. Security Considerations

### Authentication & Authorization

- **Middleware-level protection**: Portal endpoints in `/api/portal/*`, admin endpoints in `/api/admin/*`
- Middleware enforces authentication before requests reach route handlers
- Additional business logic checks in handlers (responsible person status, member status)
- Verify user session data in handlers
- Validate groupId and userId against session user

### Input Validation

- Server-side Zod validation for all API inputs
- Prevent SQL injection via Prisma (parameterized queries)
- Sanitize group member removal confirmations

### Data Privacy

- Member lists only visible in portal (authenticated)
- No public exposure of membership data
- Email addresses hidden in UI (show names only)
- Follow existing privacy patterns for group data

## 11. Testing Strategy

Per project policy (Constitution Principle II):
- **Manual testing only** - no automated tests
- Test checklist will be created in Phase 2 (tasks.md)
- Key test scenarios from spec acceptance criteria

## Summary of Key Decisions

1. **Database**: Two new models (GroupMember, GroupResponsibleUser) with cascade delete
2. **Email**: Extend existing React Email templates and nodemailer infrastructure
3. **Permissions**: Centralized utility in `src/lib/groups/permissions.ts`
4. **Navigation**: Nested Next.js routes with layout-based submenus
5. **Search**: Server-side Prisma queries with case-insensitive partial match
6. **Pagination**: Material UI DataGrid with server-side pagination (50 items/page)
7. **Backwards Compatibility**: Keep ResponsiblePerson unchanged, query both tables
8. **Stack**: No new dependencies required
9. **Performance**: Appropriate indexes, server-side pagination, <2s page loads
10. **Security**: NextAuth session validation, Zod server-side validation
11. **Testing**: Manual testing with acceptance criteria checklist

## Risks & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Email notification failures | Medium | Medium | Use existing retry logic, log failures, queue system |
| Permission check bypass | Low | High | Centralized permission utility, server-side validation |
| Duplicate membership race condition | Low | Low | Database unique constraint, handle gracefully in UI |
| Performance with 500+ members | Low | Medium | Server-side pagination, DataGrid optimization |
| Backwards compatibility break | Low | High | Keep ResponsiblePerson unchanged, thorough manual testing |

All risks have acceptable mitigation strategies using existing project infrastructure.
