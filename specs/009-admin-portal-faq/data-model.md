# Data Model: Admin-Managed FAQ System

**Feature**: Admin-Managed FAQ System for Member Portal
**Branch**: `009-admin-portal-faq`
**Date**: 2025-10-23

## Overview

This document defines the database schema, entity relationships, validation rules, and state transitions for the FAQ system. The data model follows Prisma conventions established in the project and supports the requirements defined in spec.md.

---

## Entity: FaqEntry

### Purpose
Represents a single FAQ item (question and answer pair) created and managed by administrators, viewable by authenticated members.

### Prisma Schema

```prisma
model FaqEntry {
  id        String    @id @default(cuid())
  title     String    @db.VarChar(200)
  content   String    @db.Text
  status    FaqStatus @default(ACTIVE)

  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  createdBy String
  creator   User      @relation("FaqCreator", fields: [createdBy], references: [id], onDelete: Cascade)

  updatedBy String
  updater   User      @relation("FaqUpdater", fields: [updatedBy], references: [id], onDelete: Cascade)

  @@map("faq_entry")
  @@index([status])
  @@index([createdAt])
  @@index([title])
}

enum FaqStatus {
  ACTIVE
  ARCHIVED
}
```

### Field Specifications

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String | Primary key, CUID, required | Unique identifier for FAQ entry |
| `title` | String | Max 200 chars, required, indexed | Question or topic title |
| `content` | String | Text field, max 10000 chars, required | Answer in HTML format from rich text editor |
| `status` | FaqStatus | Enum (ACTIVE, ARCHIVED), default ACTIVE, indexed | Current lifecycle state |
| `createdAt` | DateTime | Auto-generated, indexed | Timestamp when entry was created |
| `updatedAt` | DateTime | Auto-updated | Timestamp when entry was last modified |
| `createdBy` | String | Foreign key to User.id, required | User ID of admin who created entry |
| `creator` | User | Relation to User model | Admin user who created entry |
| `updatedBy` | String | Foreign key to User.id, required | User ID of admin who last updated entry |
| `updater` | User | Relation to User model | Admin user who last updated entry |

### Indexes

Indexes optimize common query patterns:

1. **`status` index**: Filter by ACTIVE/ARCHIVED (used in portal and admin list queries)
2. **`createdAt` index**: Audit trail queries and analytics
3. **`title` index**: Alphabetical sorting (all queries order by title ASC)

### Relations

#### With User Model

**FaqEntry → User (creator)**
- Type: Many-to-One
- Relationship: `creator` field references `User.id` via `createdBy` foreign key
- Cascade: `onDelete: Cascade` (if user deleted, FAQ entries are deleted)
- Purpose: Track which admin created each FAQ entry

**FaqEntry → User (updater)**
- Type: Many-to-One
- Relationship: `updater` field references `User.id` via `updatedBy` foreign key
- Cascade: `onDelete: Cascade` (if user deleted, FAQ entries are deleted)
- Purpose: Track which admin last modified each FAQ entry

**User Model Extension** (add to existing User model):
```prisma
model User {
  // ... existing fields ...

  createdFaqs  FaqEntry[] @relation("FaqCreator")
  updatedFaqs  FaqEntry[] @relation("FaqUpdater")
}
```

---

## Enum: FaqStatus

### Values

| Value | Display Label | Description | Color (UI) |
|-------|---------------|-------------|------------|
| `ACTIVE` | "Aktiv" | FAQ is visible to members | success (green) |
| `ARCHIVED` | "Archiviert" | FAQ is hidden from members, only visible to admins | default (gray) |

### State Machine

```
┌─────────────┐
│   CREATE    │
│  (default)  │
└──────┬──────┘
       │
       ▼
   ┌────────┐      Archive Action       ┌────────────┐
   │ ACTIVE │ ────────────────────────►  │  ARCHIVED  │
   └────────┘                            └────────────┘
       ▲              Reactivate Action         │
       └──────────────────────────────────────┘
                                                │
                                                │ Delete Action
                                                ▼
                                          [DELETED]
                                       (removed from DB)
```

### State Transitions

| From | To | Action | Allowed By | Notes |
|------|----|--------|------------|-------|
| - | ACTIVE | Create | Admin | Default status on creation |
| ACTIVE | ARCHIVED | Archive | Admin | Removes from member view |
| ARCHIVED | ACTIVE | Reactivate | Admin | Returns to member view |
| ACTIVE | DELETED | (blocked) | - | Must archive first (safety) |
| ARCHIVED | DELETED | Delete | Admin | Permanent removal from database |

### Business Rules

1. **Creation**: All new FAQ entries default to `ACTIVE` status
2. **Member Visibility**: Only `ACTIVE` entries are shown to members
3. **Admin Visibility**: Admins can see all statuses (filtered by tabs)
4. **Deletion Protection**: Cannot delete `ACTIVE` entries directly (must archive first)
5. **Bidirectional Transition**: Can move freely between ACTIVE ↔ ARCHIVED

---

## Validation Rules

### Server-Side Validation (Zod Schemas)

All validation schemas defined in `src/lib/validation/faq-schema.ts`:

#### Create FAQ Schema

```typescript
export const createFaqSchema = z.object({
  title: z.string()
    .min(1, 'Titel ist erforderlich')
    .max(200, 'Titel darf maximal 200 Zeichen lang sein')
    .trim(),
  content: z.string()
    .min(1, 'Inhalt ist erforderlich')
    .max(10000, 'Inhalt darf maximal 10.000 Zeichen lang sein'),
  status: z.enum(['ACTIVE', 'ARCHIVED']).optional().default('ACTIVE')
});
```

**Validation Rules**:
- `title`: Required, 1-200 characters, trimmed whitespace
- `content`: Required, 1-10,000 characters, HTML string
- `status`: Optional (defaults to ACTIVE), must be ACTIVE or ARCHIVED

#### Update FAQ Schema

```typescript
export const updateFaqSchema = z.object({
  title: z.string()
    .min(1, 'Titel ist erforderlich')
    .max(200, 'Titel darf maximal 200 Zeichen lang sein')
    .trim()
    .optional(),
  content: z.string()
    .min(1, 'Inhalt ist erforderlich')
    .max(10000, 'Inhalt darf maximal 10.000 Zeichen lang sein')
    .optional(),
  status: z.enum(['ACTIVE', 'ARCHIVED']).optional()
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'Mindestens ein Feld muss angegeben werden' }
);
```

**Validation Rules**:
- All fields optional (partial update)
- At least one field must be provided
- Same constraints as create schema for provided fields

#### Search Query Schema

```typescript
export const searchQuerySchema = z.object({
  query: z.string()
    .max(100, 'Suchbegriff zu lang')
    .optional()
});
```

**Validation Rules**:
- `query`: Optional, max 100 characters

### Client-Side Validation (React Hook Form)

Optional for UX, but server-side validation is mandatory:

```typescript
// In FAQ form component
const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(createFaqSchema) // or updateFaqSchema
});
```

---

## Database Operations

All database operations consolidated in `src/lib/db/faq-operations.ts`. Functions use explicit types and include authorization checks.

### Core Operations

#### Create FAQ Entry

```typescript
/**
 * Creates a new FAQ entry.
 *
 * @param data FAQ data including title, content, and status
 * @param userId ID of the admin user creating the FAQ
 * @returns Promise resolving to created FAQ entry
 */
export async function createFaqEntry(
  data: { title: string; content: string; status?: FaqStatus },
  userId: string
): Promise<FaqEntry> {
  return await prisma.faqEntry.create({
    data: {
      title: data.title,
      content: data.content,
      status: data.status || FaqStatus.ACTIVE,
      createdBy: userId,
      updatedBy: userId
    },
    include: {
      creator: { select: { id: true, username: true } },
      updater: { select: { id: true, username: true } }
    }
  });
}
```

#### Find FAQs with Pagination (Admin)

```typescript
/**
 * Finds FAQ entries with pagination, filtering, and search.
 *
 * @param params Query parameters including where clause, order, pagination
 * @param session User session for authorization
 * @returns Promise resolving to FAQ entries and total count
 */
export async function findFaqsWithPagination(
  params: {
    where: Prisma.FaqEntryWhereInput;
    orderBy: Prisma.FaqEntryOrderByWithRelationInput;
    skip: number;
    take: number;
  },
  session: { role: string } | null
): Promise<{ faqs: FaqEntry[]; totalItems: number }> {
  // Authorization check
  if (!session || session.role !== 'admin') {
    throw new Error('Unauthorized: Nur Administratoren dürfen auf diese Funktion zugreifen');
  }

  const totalItems = await prisma.faqEntry.count({ where: params.where });

  const faqs = await prisma.faqEntry.findMany({
    where: params.where,
    orderBy: params.orderBy,
    skip: params.skip,
    take: params.take,
    include: {
      creator: { select: { id: true, username: true } },
      updater: { select: { id: true, username: true } }
    }
  });

  return { faqs, totalItems };
}
```

#### Find Active FAQs (Members)

```typescript
/**
 * Finds all active FAQ entries for member viewing.
 *
 * @param session User session for authorization
 * @returns Promise resolving to active FAQ entries
 */
export async function findActiveFaqEntries(
  session: { role: string } | null
): Promise<FaqEntry[]> {
  // Authorization check
  if (!session || !['admin', 'mitglied'].includes(session.role)) {
    throw new Error('Unauthorized: Zugriff verweigert');
  }

  return await prisma.faqEntry.findMany({
    where: { status: FaqStatus.ACTIVE },
    orderBy: { title: 'asc' },
    select: {
      id: true,
      title: true,
      content: true,
      status: true,
      createdAt: true,
      updatedAt: true
    }
  });
}
```

#### Update FAQ Entry

```typescript
/**
 * Updates an existing FAQ entry.
 *
 * @param id FAQ entry ID
 * @param data Partial FAQ data to update
 * @param userId ID of the admin user updating the FAQ
 * @returns Promise resolving to updated FAQ entry
 */
export async function updateFaqEntry(
  id: string,
  data: { title?: string; content?: string; status?: FaqStatus },
  userId: string
): Promise<FaqEntry> {
  return await prisma.faqEntry.update({
    where: { id },
    data: {
      ...data,
      updatedBy: userId
    },
    include: {
      creator: { select: { id: true, username: true } },
      updater: { select: { id: true, username: true } }
    }
  });
}
```

#### Delete FAQ Entry

```typescript
/**
 * Deletes a FAQ entry (only if archived).
 *
 * @param id FAQ entry ID
 * @param session User session for authorization
 * @returns Promise resolving when deleted
 */
export async function deleteFaqEntry(
  id: string,
  session: { role: string } | null
): Promise<void> {
  // Authorization check
  if (!session || session.role !== 'admin') {
    throw new Error('Unauthorized: Nur Administratoren dürfen FAQs löschen');
  }

  // Safety check: Only allow deleting archived entries
  const faq = await prisma.faqEntry.findUnique({ where: { id } });
  if (!faq) {
    throw new Error('FAQ nicht gefunden');
  }
  if (faq.status === FaqStatus.ACTIVE) {
    throw new Error('Aktive FAQs können nicht gelöscht werden. Bitte zuerst archivieren.');
  }

  await prisma.faqEntry.delete({ where: { id } });
}
```

#### Find FAQ by ID

```typescript
/**
 * Finds a single FAQ entry by ID.
 *
 * @param id FAQ entry ID
 * @param session User session for authorization
 * @returns Promise resolving to FAQ entry or null
 */
export async function findFaqById(
  id: string,
  session: { role: string } | null
): Promise<FaqEntry | null> {
  // Authorization check
  if (!session || !['admin', 'mitglied'].includes(session.role)) {
    throw new Error('Unauthorized: Zugriff verweigert');
  }

  const faq = await prisma.faqEntry.findUnique({
    where: { id },
    include: {
      creator: { select: { id: true, username: true } },
      updater: { select: { id: true, username: true } }
    }
  });

  // Members can only see active FAQs
  if (session.role === 'mitglied' && faq?.status !== FaqStatus.ACTIVE) {
    return null;
  }

  return faq;
}
```

---

## Query Patterns

### Admin Queries

#### List FAQs with Status Filter
```typescript
// All active FAQs
const { faqs, totalItems } = await findFaqsWithPagination({
  where: { status: FaqStatus.ACTIVE },
  orderBy: { title: 'asc' },
  skip: 0,
  take: 10
}, session);

// All archived FAQs
const { faqs, totalItems } = await findFaqsWithPagination({
  where: { status: FaqStatus.ARCHIVED },
  orderBy: { title: 'asc' },
  skip: 0,
  take: 10
}, session);

// All FAQs (no status filter)
const { faqs, totalItems } = await findFaqsWithPagination({
  where: {},
  orderBy: { title: 'asc' },
  skip: 0,
  take: 10
}, session);
```

#### Search FAQs
```typescript
const searchTerm = 'mitgliedschaft';
const { faqs, totalItems } = await findFaqsWithPagination({
  where: {
    OR: [
      { title: { contains: searchTerm, mode: 'insensitive' } },
      { content: { contains: searchTerm, mode: 'insensitive' } }
    ],
    status: FaqStatus.ACTIVE // Optional: combine with status filter
  },
  orderBy: { title: 'asc' },
  skip: 0,
  take: 10
}, session);
```

### Member Queries

#### List Active FAQs (No Pagination)
```typescript
const faqs = await findActiveFaqEntries(session);
// Returns all ACTIVE entries, sorted by title A-Z
```

#### Client-Side Search (Portal)
```typescript
// After fetching all active FAQs
const searchTerm = 'mitgliedschaft';
const filteredFaqs = faqs.filter(faq => {
  const term = searchTerm.toLowerCase().slice(0, 100);
  return faq.title.toLowerCase().includes(term) ||
         faq.content.toLowerCase().includes(term);
});
```

---

## Data Integrity Rules

### Referential Integrity

1. **Creator/Updater References**:
   - `createdBy` and `updatedBy` must reference valid User IDs
   - Foreign key constraints enforce relationship
   - Cascade delete: If user deleted, FAQ entries are deleted

2. **Status Enum**:
   - Only ACTIVE or ARCHIVED allowed
   - Database enforces enum constraint

### Business Logic Constraints

1. **Deletion Protection**:
   - ACTIVE entries cannot be deleted directly
   - Must transition to ARCHIVED before deletion
   - Enforced at database operation level

2. **Authorization**:
   - Only admins can create, update, archive, or delete FAQs
   - Both admins and members can read ACTIVE FAQs
   - Only admins can read ARCHIVED FAQs
   - Enforced at database operation level (not just middleware)

3. **Required Fields**:
   - `title` and `content` required on creation
   - `createdBy` and `updatedBy` required (set programmatically)
   - `status` defaults to ACTIVE if not provided

### Data Quality Rules

1. **Title**:
   - Trimmed of leading/trailing whitespace
   - Max 200 characters
   - Used for alphabetical sorting

2. **Content**:
   - HTML string from TipTap editor
   - Max 10,000 characters
   - Sanitized by TipTap (only allowed extensions)
   - Displayed with SafeHtml component

3. **Timestamps**:
   - `createdAt` auto-generated on creation
   - `updatedAt` auto-updated on any modification

---

## Seed Data

Initial FAQ entry for deployment:

```typescript
// Prisma seed script or migration
import { Prisma, FaqStatus } from '@prisma/client';

const seedData = {
  title: 'Wie verwende ich das FAQ-System?',
  content: `
    <p>Willkommen beim FAQ-System! Hier findest du Antworten auf häufig gestellte Fragen.</p>
    <p><strong>Suche verwenden:</strong> Nutze die Suchleiste oben, um nach Stichwörtern zu suchen.</p>
    <p><strong>FAQ durchsuchen:</strong> Klicke auf eine Frage, um die vollständige Antwort zu sehen.</p>
    <p>Bei weiteren Fragen wende dich bitte an einen Administrator.</p>
  `,
  status: FaqStatus.ACTIVE,
  createdBy: 'SYSTEM_ADMIN_ID', // Replace with actual admin user ID
  updatedBy: 'SYSTEM_ADMIN_ID'
};

await prisma.faqEntry.create({ data: seedData });
```

---

## Migration Notes

### Database Migration Steps

1. Add `FaqStatus` enum to Prisma schema
2. Add `FaqEntry` model to Prisma schema
3. Add relations to existing `User` model
4. Run `npx prisma migrate dev --name add-faq-system`
5. Run seed script to add initial FAQ entry
6. Verify migration with `npx prisma studio`

### Backwards Compatibility

No breaking changes to existing models. Only additions:
- New `FaqEntry` table
- New `FaqStatus` enum
- Two new relations on `User` model (non-breaking)

### Rollback Plan

If needed, remove:
1. `FaqEntry` model from schema
2. `FaqStatus` enum from schema
3. Relations from `User` model
4. Run migration to drop tables

---

## Performance Considerations

### Indexes

- `status` index: Fast filtering by ACTIVE/ARCHIVED
- `title` index: Fast alphabetical sorting
- `createdAt` index: Audit queries

### Query Optimization

1. **Member Portal**: No pagination needed (small dataset of ACTIVE entries only)
2. **Admin Portal**: Pagination reduces query size (10 entries per page)
3. **Search**: Uses indexed fields (title) + text search (content)
4. **Ordering**: Always by `title` ASC (indexed)

### Scaling Assumptions

- 10-50 FAQ entries initially
- ACTIVE entries typically < 30 (fast for client-side filtering)
- Admin queries paginated (scales to 100s of entries)
- No need for full-text search indexes at current scale

---

## Summary

The FAQ data model is simple, well-constrained, and follows all project conventions:

✅ Single entity (FaqEntry) with clear purpose
✅ Two-state lifecycle (ACTIVE, ARCHIVED)
✅ Referential integrity with User model
✅ Comprehensive validation rules
✅ Role-based authorization at DB layer
✅ Indexed for common query patterns
✅ Follows Prisma conventions (lowercase table name, CUID, etc.)
✅ German error messages
✅ Clear state transitions with safety constraints
✅ Ready for Phase 2 implementation

**Next**: Define API contracts in `/contracts/` directory.
