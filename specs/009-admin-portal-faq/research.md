# Research Document: Admin-Managed FAQ System

**Feature**: Admin-Managed FAQ System for Member Portal
**Branch**: `009-admin-portal-faq`
**Date**: 2025-10-23

## Overview

This document consolidates research findings to resolve all "NEEDS CLARIFICATION" items from the Technical Context and provides best practices for implementing the FAQ feature. The goal is to inform Phase 1 design decisions with evidence from the existing codebase.

## Research Tasks & Findings

### 1. Role-Based Access Control Implementation (Database Layer)

**Research Question**: How should we implement extensible role-based access control at the database layer following Next.js data access layer pattern?

**Decision**: Implement authorization checks in database operation functions (`faq-operations.ts`) by accepting user session context and validating roles before executing queries.

**Rationale**:
- The project already uses NextAuth.js with role-based authentication at middleware level (`src/middleware.ts`)
- Current roles defined: `admin` and `mitglied` (from `src/lib/validation/user-schema.ts:6`)
- Middleware handles route-level protection; database layer should add defense in depth
- Following Next.js Data Access Layer pattern: validation logic should be centralized in DB operations

**Implementation Pattern** (from existing codebase analysis):
```typescript
// Pattern from existing group-operations.ts and middleware.ts
export async function findActiveFaqEntries(session: { role: string } | null) {
  // Authorization check at DB layer
  if (!session || !['admin', 'mitglied'].includes(session.role)) {
    throw new Error('Unauthorized: Zugriff verweigert');
  }

  // Members only see ACTIVE entries
  const where = session.role === 'mitglied'
    ? { status: FaqStatus.ACTIVE }
    : {}; // Admins can see all based on separate filter

  return await prisma.faqEntry.findMany({ where, orderBy: { title: 'asc' } });
}
```

**Extensibility**: To add new roles in the future, only update:
1. `src/lib/validation/user-schema.ts` - add role to `USER_ROLES` array
2. `src/middleware.ts` - add role to authorized callback if needed
3. Database operation functions - add role to allowed list

**References**:
- Existing middleware: `src/middleware.ts:12-14` (portal role check)
- User role validation: `src/lib/validation/user-schema.ts:6` (USER_ROLES definition)
- Database pattern: `src/lib/db/group-operations.ts:66-98` (pagination with where clause)

---

### 2. Rich Text Editor Integration

**Research Question**: What features and integration patterns should be used for the FAQ rich text editor?

**Decision**: Reuse existing `RichTextEditor` component from `src/components/editor/RichTextEditor.tsx` with TipTap library.

**Rationale**:
- Component already exists and is used in newsletter system (proven, tested)
- Provides essential formatting: bold, italic, lists, links
- Built on TipTap with StarterKit + Link extension
- Supports `maxLength` prop for content limits
- Returns HTML string for storage

**Integration Pattern**:
```typescript
// Admin FAQ form component
import RichTextEditor from '@/components/editor/RichTextEditor';

<RichTextEditor
  value={content}
  onChange={setContent}
  maxLength={10000}
  placeholder="FAQ-Antwort eingeben..."
  minHeight={200}
/>
```

**Content Sanitization**:
- TipTap outputs safe HTML (controlled extensions only)
- Display with `SafeHtml` component (existing: `src/components/ui/SafeHtml`)
- Pattern from groups: `src/app/admin/groups/page.tsx:39` imports SafeHtml

**References**:
- RichTextEditor: `src/components/editor/RichTextEditor.tsx:22-33` (component interface)
- SafeHtml usage: `src/app/admin/groups/page.tsx:39`

---

### 3. Accordion UI Pattern for Admin and Portal Pages

**Research Question**: How should accordion UI be implemented to match the existing groups management pattern?

**Decision**: Use Material UI Accordion component following the pattern established in `src/app/admin/groups/page.tsx`.

**Rationale**:
- Groups management already implements accordion pattern successfully
- Material UI Accordion provides consistent UX
- Supports expand/collapse with controlled state
- Integrates with existing MUI theme

**Admin Pattern** (with inline editing):
```typescript
// From groups page pattern
const [expandedAccordionId, setExpandedAccordionId] = useState<string | null>(null);
const [editingFaqId, setEditingFaqId] = useState<string | null>(null);

<Accordion
  expanded={expandedAccordionId === faq.id}
  onChange={() => setExpandedAccordionId(expandedAccordionId === faq.id ? null : faq.id)}
>
  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
    <Typography>{faq.title}</Typography>
    <Chip label={faq.status} color={statusColor} />
  </AccordionSummary>
  <AccordionDetails>
    {editingFaqId === faq.id ? (
      <EditForm /> // Inline edit form
    ) : (
      <ViewMode /> // Read-only view with action buttons
    )}
  </AccordionDetails>
</Accordion>
```

**Portal Pattern** (read-only):
```typescript
// Simpler pattern for members
<Accordion>
  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
    <Typography variant="h6">{faq.title}</Typography>
  </AccordionSummary>
  <AccordionDetails>
    <SafeHtml html={faq.content} />
  </AccordionDetails>
</Accordion>
```

**References**:
- Admin accordion: `src/app/admin/groups/page.tsx:49-50` (state management)
- MUI imports: `src/app/admin/groups/page.tsx:22` (Accordion components)

---

### 4. Status Management System

**Research Question**: What status values and transitions should FAQ entries support?

**Decision**: Use two-state system: `ACTIVE` and `ARCHIVED` (no `NEW` state).

**Rationale**:
- Spec explicitly states no `NEW` state needed (admins create entries directly as active)
- Matches project convention for uppercase enum values (e.g., `GroupStatus` in Prisma schema)
- Simple state machine: ACTIVE ↔ ARCHIVED (bidirectional)
- Deletion only allowed for ARCHIVED entries (safety pattern)

**Status Enum** (Prisma):
```prisma
enum FaqStatus {
  ACTIVE
  ARCHIVED
}
```

**State Transitions**:
- Create → ACTIVE (default)
- ACTIVE → ARCHIVED (archive action)
- ARCHIVED → ACTIVE (reactivate action)
- ARCHIVED → DELETED (permanent delete action)
- Constraint: Cannot delete ACTIVE entries directly

**UI Tabs** (Admin):
- "Aktiv" tab - shows ACTIVE entries
- "Archiviert" tab - shows ARCHIVED entries
- "Alle" tab - shows all entries

**References**:
- Status pattern: `src/app/admin/groups/page.tsx:76-80` (status options with labels/colors)
- Prisma enum: Based on existing `GroupStatus` enum pattern

---

### 5. Search Implementation Strategy

**Research Question**: How should real-time search filtering be implemented efficiently?

**Decision**: Client-side search filtering using state management for portal page; server-side search with query params for admin page.

**Rationale**:
- **Portal page**: Expected dataset small (10-50 active FAQs); client-side filtering provides instant feedback (<300ms requirement)
- **Admin page**: May have more entries; server-side search matches existing admin pattern
- Search across title AND content fields
- Case-insensitive search
- Truncate search terms at 100 characters (spec requirement)

**Portal Implementation** (Client-side):
```typescript
const [searchTerm, setSearchTerm] = useState('');

const filteredFaqs = faqs.filter(faq => {
  const term = searchTerm.toLowerCase().slice(0, 100);
  return faq.title.toLowerCase().includes(term) ||
         faq.content.toLowerCase().includes(term);
});
```

**Admin Implementation** (Server-side):
```typescript
// Pattern from groups page
const searchFilter = searchTerm
  ? `&search=${encodeURIComponent(searchTerm.slice(0, 100))}`
  : '';

const response = await fetch(
  `/api/admin/faq?page=${page}&pageSize=${pageSize}${searchFilter}`
);
```

**Database Query** (Prisma):
```typescript
// In faq-operations.ts
const where = {
  OR: [
    { title: { contains: searchTerm, mode: 'insensitive' } },
    { content: { contains: searchTerm, mode: 'insensitive' } }
  ],
  status: statusFilter // Also filter by status
};
```

**References**:
- Client search: Similar to autocomplete patterns in forms
- Server search: `src/app/admin/groups/page.tsx:86` (search filter pattern)
- Prisma search: Standard `contains` operator with `mode: 'insensitive'`

---

### 6. Pagination Strategy for Admin Page

**Research Question**: Should pagination be implemented, and if so, what pattern should be used?

**Decision**: Implement pagination on admin page matching existing pattern; no pagination on portal page.

**Rationale**:
- Spec requires pagination on admin page (FR-016: 10 entries per page default)
- Portal page has small dataset (only ACTIVE entries); no pagination needed
- Existing admin pages use consistent pagination pattern

**Implementation Pattern**:
```typescript
// State management (from groups page pattern)
const [page, setPage] = useState(1);
const [pageSize, setPageSize] = useState(10);
const [totalItems, setTotalItems] = useState(0);
const [totalPages, setTotalPages] = useState(1);

// API call
const skip = (page - 1) * pageSize;
const response = await fetch(
  `/api/admin/faq?page=${page}&pageSize=${pageSize}&skip=${skip}`
);

// Database query (faq-operations.ts)
export async function findFaqsWithPagination(params: {
  where: Prisma.FaqEntryWhereInput;
  orderBy: Prisma.FaqEntryOrderByWithRelationInput;
  skip: number;
  take: number;
}) {
  const totalItems = await prisma.faqEntry.count({ where: params.where });
  const faqs = await prisma.faqEntry.findMany({
    where: params.where,
    orderBy: params.orderBy,
    skip: params.skip,
    take: params.take
  });
  return { faqs, totalItems };
}
```

**UI Component**:
- Reuse `AdminPagination` component from `src/components/admin/tables/AdminPagination`
- Pattern from: `src/app/admin/groups/page.tsx:9` (import)

**References**:
- Pagination hook: `src/hooks/useAdminState` (existing state management)
- DB pattern: `src/lib/db/group-operations.ts:66-98` (findGroupsWithPagination)

---

### 7. Validation Schema Design

**Research Question**: What validation rules should be applied to FAQ entries?

**Decision**: Create Zod schemas in `src/lib/validation/faq-schema.ts` with field-level validation matching spec requirements.

**Validation Rules** (from spec):
- **Title**: Required, string, 1-200 characters
- **Content**: Required, string, 1-10000 characters (HTML)
- **Status**: Enum (ACTIVE | ARCHIVED)
- **Search term**: Max 100 characters (when provided)

**Schema Implementation**:
```typescript
// src/lib/validation/faq-schema.ts
import { z } from 'zod';

export const FaqStatusEnum = z.enum(['ACTIVE', 'ARCHIVED']);

export const createFaqSchema = z.object({
  title: z.string()
    .min(1, 'Titel ist erforderlich')
    .max(200, 'Titel darf maximal 200 Zeichen lang sein')
    .trim(),
  content: z.string()
    .min(1, 'Inhalt ist erforderlich')
    .max(10000, 'Inhalt darf maximal 10.000 Zeichen lang sein'),
  status: FaqStatusEnum.optional().default('ACTIVE')
});

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
  status: FaqStatusEnum.optional()
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'Mindestens ein Feld muss angegeben werden' }
);

export const searchQuerySchema = z.object({
  query: z.string().max(100, 'Suchbegriff zu lang').optional()
});
```

**Usage Pattern**:
```typescript
// In API route
import { createFaqSchema } from '@/lib/validation/faq-schema';

const body = await request.json();
const validatedData = createFaqSchema.parse(body); // Throws on invalid
```

**References**:
- Validation pattern: `src/lib/validation/user-schema.ts` (user schemas)
- German messages: All error messages in German per Constitution Principle VI

---

### 8. Sorting Strategy

**Research Question**: How should FAQ entries be sorted in both admin and portal interfaces?

**Decision**: Automatic alphabetical sorting by title (A-Z) with no manual reordering capability.

**Rationale**:
- Spec clarification explicitly states alphabetical sorting by title (A-Z)
- No manual ordering required (simplifies implementation)
- Consistent sorting across admin and portal views
- Easy for users to find entries by title

**Implementation**:
```typescript
// Database query (default ordering)
orderBy: { title: 'asc' }

// In all findMany operations:
const faqs = await prisma.faqEntry.findMany({
  where: whereClause,
  orderBy: { title: 'asc' } // Always sort by title A-Z
});
```

**References**:
- Spec: spec.md:12 (clarification about ordering)
- DB pattern: Similar to existing orderBy usage in group-operations.ts

---

### 9. Initial Seed Data

**Research Question**: Should the system include initial FAQ entries when first deployed?

**Decision**: Include one "Getting Started" FAQ entry to explain how to use the FAQ system.

**Rationale**:
- Spec requirement (FR-021): Include initial "Getting Started" FAQ
- Provides immediate value to members on first deployment
- Admins can edit or archive this entry if desired
- Acts as example for admins creating additional entries

**Seed Data**:
```typescript
// To be added to Prisma seed script or migration
{
  title: "Wie verwende ich das FAQ-System?",
  content: `
    <p>Willkommen beim FAQ-System! Hier findest du Antworten auf häufig gestellte Fragen.</p>
    <p><strong>Suche verwenden:</strong> Nutze die Suchleiste oben, um nach Stichwörtern zu suchen.</p>
    <p><strong>FAQ durchsuchen:</strong> Klicke auf eine Frage, um die vollständige Antwort zu sehen.</p>
    <p>Bei weiteren Fragen wende dich bitte an einen Administrator.</p>
  `,
  status: 'ACTIVE',
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: 'system', // Or first admin user ID
  updatedBy: 'system'
}
```

**References**:
- Spec: spec.md:115 (FR-021 requirement)

---

### 10. Error Logging Strategy

**Research Question**: What operations should be logged and how?

**Decision**: Log only failures and errors (failed saves, validation errors, unauthorized access) using structured logger from `@/lib/logger.ts`.

**Rationale**:
- Spec clarification: Log only failures/errors (not all operations)
- Constitution Principle VII: Use structured logger (not console.log)
- Reduces log noise while capturing important issues
- Includes context for debugging (user ID, operation, timestamp)

**Logging Pattern**:
```typescript
import { logger } from '@/lib/logger';

// In API routes
try {
  const faq = await createFaqEntry(data);
  return NextResponse.json(faq, { status: 201 });
} catch (error) {
  logger.error('FAQ creation failed', {
    module: 'api/faq',
    context: { userId: session.user.id, title: data.title },
    tags: ['faq', 'create', 'error'],
    error
  });
  return NextResponse.json(
    { error: 'FAQ konnte nicht erstellt werden' },
    { status: 500 }
  );
}

// Unauthorized access
if (!session || !['admin', 'mitglied'].includes(session.role)) {
  logger.warn('Unauthorized FAQ access attempt', {
    module: 'db/faq-operations',
    context: { role: session?.role, operation: 'findActiveFaqEntries' },
    tags: ['security', 'unauthorized']
  });
  throw new Error('Unauthorized: Zugriff verweigert');
}
```

**What to Log**:
- ❌ Successful operations (too verbose)
- ✅ Validation errors (user input issues)
- ✅ Database operation failures
- ✅ Unauthorized access attempts
- ✅ Unexpected errors in API routes

**References**:
- Logger: `@/lib/logger.ts` (existing utility)
- Spec: spec.md:116 (FR-022 logging requirement)
- Constitution: `.specify/memory/constitution.md:59-62` (Principle VII)

---

## Technology Stack Summary

All required technologies already exist in the project:

| Technology | Version/Library | Purpose | Status |
|------------|----------------|---------|--------|
| TypeScript | 5.x strict mode | Type safety | ✅ Existing |
| Next.js | 15 with App Router | Framework | ✅ Existing |
| React | 18 | UI library | ✅ Existing |
| Material UI | v5 | Component library | ✅ Existing |
| Prisma | Latest | ORM for PostgreSQL | ✅ Existing |
| NextAuth.js | v4 | Authentication | ✅ Existing |
| TipTap | Latest | Rich text editor | ✅ Existing |
| React Hook Form | Latest | Form handling | ✅ Existing |
| Zod | Latest | Validation | ✅ Existing |

**No new dependencies required.**

---

## Best Practices Summary

### Database Operations
- Consolidate all Prisma queries in `src/lib/db/faq-operations.ts`
- Include JSDoc comments for all functions
- Pass session context for authorization checks
- Use Prisma transactions for multi-step operations

### API Routes
- Validate all inputs with Zod schemas
- Return appropriate HTTP status codes (200, 201, 400, 401, 403, 404, 500)
- Use German error messages for user-facing responses
- Log errors with structured context

### Components
- Keep files under 500 lines (split if needed)
- Reuse existing components (RichTextEditor, SafeHtml, AdminPagination)
- Use Material UI theme consistently
- Separate admin and portal components clearly

### Type Safety
- Define types in `src/types/api-types.ts`
- No `any` types allowed
- Use Prisma-generated types where applicable
- Export types for reuse

### Code Organization
- Follow domain-based architecture
- Use `@/` path aliases for all imports
- Server code: Use barrel exports (`@/lib/faq`)
- Client code: Import specific files (`@/lib/validation/faq-schema`)

---

## Alternatives Considered

### 1. Client-side vs Server-side Search (Admin Page)

**Rejected Alternative**: Client-side search for admin page

**Why Rejected**:
- Admin may have many more entries than portal (including archived)
- Pagination already requires server round-trips
- Server-side search scales better
- Matches existing admin page patterns

### 2. Three-state vs Two-state Status System

**Rejected Alternative**: Include `NEW` status like groups

**Why Rejected**:
- Spec explicitly states no `NEW` state needed
- Admins create entries directly as active (no submission/approval workflow)
- Simpler state machine (KISS principle)

### 3. Custom Rich Text Editor vs Reusing Existing

**Rejected Alternative**: Build custom editor with more features

**Why Rejected**:
- Violates DRY principle (existing editor works well)
- Existing editor provides all required features
- Adds unnecessary complexity
- Spec explicitly says reuse existing RichTextEditor

### 4. Separate FAQ Domain Directory vs Minimal Structure

**Rejected Alternative**: Create `src/lib/faq/` domain directory with multiple files

**Why Rejected**:
- FAQ feature is simple CRUD with no complex business logic
- Would create unnecessary files for simple operations
- Database operations sufficient in `db/faq-operations.ts`
- Validation in `validation/faq-schema.ts`
- No need for separate service layer (KISS principle)

---

## Open Questions (Resolved)

All "NEEDS CLARIFICATION" items from Technical Context have been resolved:

✅ Role-based access control pattern → Data access layer with session validation
✅ Rich text editor integration → Reuse existing RichTextEditor component
✅ Accordion UI pattern → Follow groups management pattern with MUI Accordion
✅ Status management → Two-state system (ACTIVE, ARCHIVED)
✅ Search implementation → Client-side for portal, server-side for admin
✅ Pagination strategy → Admin page only, 10 per page default
✅ Validation rules → Zod schemas with spec-defined limits
✅ Sorting strategy → Alphabetical by title (A-Z)
✅ Initial seed data → One "Getting Started" FAQ
✅ Logging strategy → Errors and failures only with structured logger

---

## Next Steps

Phase 0 (Research) is complete. Proceed to Phase 1 (Design):

1. ✅ Create `data-model.md` - Define Prisma schema, entity relationships
2. ✅ Create API contracts in `/contracts/` - OpenAPI specs for REST endpoints
3. ✅ Create `quickstart.md` - Developer guide for implementing the feature
4. ✅ Update agent context - Add new technology to Claude Code context

**Phase 0 Complete**: All unknowns resolved. Ready for Phase 1 design.
