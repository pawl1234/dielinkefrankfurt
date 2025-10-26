# Quickstart Guide: FAQ System Implementation

**Feature**: Admin-Managed FAQ System for Member Portal
**Branch**: `009-admin-portal-faq`
**Date**: 2025-10-23

## Overview

This guide provides step-by-step instructions for implementing the FAQ system. Follow these steps in order to ensure all dependencies are met and the feature is built according to the specification.

**Estimated Implementation Time**: 6-8 hours

---

## Prerequisites

Before starting implementation, ensure:

1. ✅ You have read the following documents in order:
   - `spec.md` - Feature requirements
   - `research.md` - Technical decisions and best practices
   - `data-model.md` - Database schema and validation rules
   - `contracts/api-contracts.yaml` - REST API specifications
   - `contracts/TypeScriptTypes.ts` - TypeScript type definitions

2. ✅ You are on the correct branch:
   ```bash
   git checkout 009-admin-portal-faq
   ```

3. ✅ Your development environment is set up:
   - Node.js and npm installed
   - PostgreSQL database running
   - Environment variables configured (`.env`)

4. ✅ You understand the project architecture:
   - Next.js 15 App Router
   - TypeScript strict mode
   - Prisma ORM for database
   - Material UI for components
   - Domain-based architecture in `src/lib/`

---

## Implementation Phases

### Phase 1: Database Schema (30-45 minutes)

#### 1.1 Update Prisma Schema

**File**: `prisma/schema.prisma`

Add the FaqStatus enum and FaqEntry model:

```prisma
// Add after existing enums
enum FaqStatus {
  ACTIVE
  ARCHIVED
}

// Add after existing models
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
```

Update the existing User model to add FAQ relations:

```prisma
model User {
  // ... existing fields ...

  // Add these relations at the end
  createdFaqs  FaqEntry[] @relation("FaqCreator")
  updatedFaqs  FaqEntry[] @relation("FaqUpdater")
}
```

#### 1.2 Run Database Migration

```bash
npx prisma migrate dev --name add-faq-system
```

Verify migration success:
```bash
npx prisma studio
# Check that faq_entry table exists with correct schema
```

#### 1.3 Create Seed Data (Optional)

Create or update `prisma/seed.ts` to include initial FAQ entry:

```typescript
// Add to seed script
const adminUser = await prisma.user.findFirst({ where: { role: 'admin' } });

if (adminUser) {
  await prisma.faqEntry.create({
    data: {
      title: 'Wie verwende ich das FAQ-System?',
      content: `
        <p>Willkommen beim FAQ-System! Hier findest du Antworten auf häufig gestellte Fragen.</p>
        <p><strong>Suche verwenden:</strong> Nutze die Suchleiste oben, um nach Stichwörtern zu suchen.</p>
        <p><strong>FAQ durchsuchen:</strong> Klicke auf eine Frage, um die vollständige Antwort zu sehen.</p>
        <p>Bei weiteren Fragen wende dich bitte an einen Administrator.</p>
      `,
      status: 'ACTIVE',
      createdBy: adminUser.id,
      updatedBy: adminUser.id
    }
  });
}
```

Run seed:
```bash
npx prisma db seed
```

**Checkpoint**: Verify in Prisma Studio that the FAQ entry was created successfully.

---

### Phase 2: Type Definitions (15-20 minutes)

#### 2.1 Add Types to Central Type Files

**File**: `src/types/api-types.ts`

Add to the end of the file:

```typescript
// FAQ System Types
export type FaqStatus = 'ACTIVE' | 'ARCHIVED';

export interface FaqEntry {
  id: string;
  title: string;
  content: string;
  status: FaqStatus;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

export interface FaqEntryWithUsers extends FaqEntry {
  creator: {
    id: string;
    username: string;
  };
  updater: {
    id: string;
    username: string;
  };
}

export interface FaqEntryPublic {
  id: string;
  title: string;
  content: string;
  status: 'ACTIVE';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateFaqRequest {
  title: string;
  content: string;
  status?: FaqStatus;
}

export interface UpdateFaqRequest {
  title?: string;
  content?: string;
  status?: FaqStatus;
}

export interface ListFaqsAdminQuery {
  page?: number;
  pageSize?: number;
  status?: FaqStatus;
  search?: string;
}

export interface ListFaqsAdminResponse {
  faqs: FaqEntryWithUsers[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

export interface ListFaqsPortalResponse {
  faqs: FaqEntryPublic[];
}

export interface FaqApiError {
  error: string;
  details?: Record<string, string>;
}
```

**File**: `src/types/component-types.ts`

Add to the end of the file:

```typescript
// FAQ Component Props
export interface FaqStatusDisplay {
  value: FaqStatus;
  label: string;
  color: 'success' | 'default';
}

export const FAQ_STATUS_OPTIONS: readonly FaqStatusDisplay[] = [
  { value: 'ACTIVE', label: 'Aktiv', color: 'success' },
  { value: 'ARCHIVED', label: 'Archiviert', color: 'default' },
] as const;
```

**Checkpoint**: Run `npm run typecheck` to ensure no type errors.

---

### Phase 3: Validation Schemas (20-30 minutes)

#### 3.1 Create FAQ Validation Schema

**File**: `src/lib/validation/faq-schema.ts` (NEW)

```typescript
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

export type CreateFaqInput = z.infer<typeof createFaqSchema>;
export type UpdateFaqInput = z.infer<typeof updateFaqSchema>;
export type SearchQueryInput = z.infer<typeof searchQuerySchema>;
```

**Checkpoint**: Run `npm run typecheck` to ensure schemas compile correctly.

---

### Phase 4: Database Operations (45-60 minutes)

#### 4.1 Create FAQ Database Operations

**File**: `src/lib/db/faq-operations.ts` (NEW)

Refer to `data-model.md` for complete function implementations. Key functions:

1. `createFaqEntry(data, userId)` - Create new FAQ
2. `findFaqsWithPagination(params, session)` - Admin list with pagination
3. `findActiveFaqEntries(session)` - Member list (active only)
4. `findFaqById(id, session)` - Get single FAQ
5. `updateFaqEntry(id, data, userId)` - Update FAQ
6. `deleteFaqEntry(id, session)` - Delete FAQ (archived only)

**Key Implementation Points**:
- Import: `import prisma from './prisma';`
- Include authorization checks in each function
- Use JSDoc comments for all functions
- Follow existing patterns from `group-operations.ts`
- Handle Prisma errors with try-catch
- Log errors with `logger` from `@/lib/logger`

**Example Function** (see data-model.md for complete implementations):

```typescript
import prisma from './prisma';
import { FaqEntry, FaqStatus, Prisma } from '@prisma/client';
import { logger } from '@/lib/logger';

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
  try {
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
  } catch (error) {
    logger.error('Failed to create FAQ entry', {
      module: 'db/faq-operations',
      context: { title: data.title, userId },
      tags: ['faq', 'create', 'error'],
      error
    });
    throw error;
  }
}

// Implement remaining functions following this pattern
```

**Checkpoint**: Run `npm run typecheck` to ensure database operations compile correctly.

---

### Phase 5: API Routes (60-90 minutes)

#### 5.1 Create Admin FAQ API Routes

**File**: `src/app/api/admin/faq/route.ts` (NEW)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options'; // Adjust path
import { createFaqSchema } from '@/lib/validation/faq-schema';
import { createFaqEntry, findFaqsWithPagination } from '@/lib/db/faq-operations';
import { logger } from '@/lib/logger';
import type { ApiHandler, IdRouteContext } from '@/types/api-types';

// GET /api/admin/faq - List FAQs (admin with pagination)
export const GET: ApiHandler = async (request: NextRequest) => {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Zugriff verweigert' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);
    const status = searchParams.get('status') as FaqStatus | null;
    const search = searchParams.get('search') || '';

    const skip = (page - 1) * pageSize;

    // Build where clause
    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { title: { contains: search.slice(0, 100), mode: 'insensitive' } },
        { content: { contains: search.slice(0, 100), mode: 'insensitive' } }
      ];
    }

    const { faqs, totalItems } = await findFaqsWithPagination(
      {
        where,
        orderBy: { title: 'asc' },
        skip,
        take: pageSize
      },
      session
    );

    const totalPages = Math.ceil(totalItems / pageSize);

    return NextResponse.json({
      faqs,
      totalItems,
      totalPages,
      currentPage: page,
      pageSize
    });
  } catch (error) {
    logger.error('Failed to fetch FAQs', {
      module: 'api/admin/faq',
      tags: ['faq', 'list', 'error'],
      error
    });
    return NextResponse.json({ error: 'FAQ konnten nicht geladen werden' }, { status: 500 });
  }
};

// POST /api/admin/faq - Create FAQ
export const POST: ApiHandler = async (request: NextRequest) => {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Zugriff verweigert' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createFaqSchema.parse(body);

    const faq = await createFaqEntry(validatedData, session.user.id);

    return NextResponse.json(faq, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validierung fehlgeschlagen', details: error.flatten() },
        { status: 400 }
      );
    }

    logger.error('Failed to create FAQ', {
      module: 'api/admin/faq',
      tags: ['faq', 'create', 'error'],
      error
    });
    return NextResponse.json({ error: 'FAQ konnte nicht erstellt werden' }, { status: 500 });
  }
};
```

**File**: `src/app/api/admin/faq/[id]/route.ts` (NEW)

Implement GET, PATCH, DELETE handlers for single FAQ operations.
Follow the pattern from `route.ts` above, using `updateFaqEntry`, `deleteFaqEntry`, `findFaqById`.

#### 5.2 Create Portal FAQ API Routes

**File**: `src/app/api/portal/faq/route.ts` (NEW)

```typescript
// GET /api/portal/faq - List active FAQs (members)
export const GET: ApiHandler = async (request: NextRequest) => {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['admin', 'mitglied'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Zugriff verweigert' }, { status: 403 });
    }

    const faqs = await findActiveFaqEntries(session);

    return NextResponse.json({ faqs });
  } catch (error) {
    logger.error('Failed to fetch active FAQs', {
      module: 'api/portal/faq',
      tags: ['faq', 'list', 'error'],
      error
    });
    return NextResponse.json({ error: 'FAQ konnten nicht geladen werden' }, { status: 500 });
  }
};
```

**File**: `src/app/api/portal/faq/[id]/route.ts` (NEW)

Implement GET handler for single FAQ (active only).

**Checkpoint**: Test API routes with curl or Postman:
```bash
# Create FAQ (requires admin session)
curl -X POST http://localhost:3000/api/admin/faq \
  -H "Content-Type: application/json" \
  -d '{"title": "Test FAQ", "content": "<p>Test content</p>"}'

# List FAQs
curl http://localhost:3000/api/admin/faq?page=1&pageSize=10
```

---

### Phase 6: Admin UI Components (90-120 minutes)

#### 6.1 Create Admin FAQ Management Page

**File**: `src/app/admin/faq/page.tsx` (NEW)

Follow the pattern from `src/app/admin/groups/page.tsx`:

1. Import necessary components:
   - MainLayout, AdminNavigation, AdminPageHeader
   - AdminStatusTabs, AdminPagination, AdminNotification
   - SearchFilterBar, ConfirmDialog
   - Material UI components (Accordion, Button, etc.)

2. Set up state management:
   - Use `useAdminState` hook (or implement similar state)
   - Track: faqs, loading, error, pagination, filters, UI state

3. Implement fetch function:
   - Call `/api/admin/faq` with query params
   - Handle loading, error, success states

4. Implement CRUD operations:
   - Create: Open dialog, call POST endpoint
   - Update: Inline editing in accordion, call PATCH endpoint
   - Archive/Reactivate: Call PATCH with status change
   - Delete: Show confirmation dialog, call DELETE endpoint

5. Render UI:
   - Status tabs (Aktiv, Archiviert, Alle)
   - Search bar
   - Create button
   - Accordion list with FAQ items
   - Pagination controls
   - Dialogs (create, delete confirmation)

**Key Components to Create**:

**File**: `src/components/admin/FaqManagement.tsx` (or inline in page)

Accordion item with:
- Title and status chip in summary
- Content display (SafeHtml) in details
- Action buttons: Bearbeiten, Archivieren/Reaktivieren, Löschen
- Inline edit mode with RichTextEditor

**Example Accordion Item**:

```typescript
<Accordion
  expanded={expandedAccordionId === faq.id}
  onChange={() => setExpandedAccordionId(expandedAccordionId === faq.id ? null : faq.id)}
>
  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
    <Typography variant="h6">{faq.title}</Typography>
    <Chip
      label={faq.status === 'ACTIVE' ? 'Aktiv' : 'Archiviert'}
      color={faq.status === 'ACTIVE' ? 'success' : 'default'}
      size="small"
    />
  </AccordionSummary>
  <AccordionDetails>
    {editingFaqId === faq.id ? (
      <EditFaqForm
        faq={faq}
        onSave={handleSave}
        onCancel={() => setEditingFaqId(null)}
      />
    ) : (
      <>
        <SafeHtml html={faq.content} />
        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
          <Button onClick={() => setEditingFaqId(faq.id)}>Bearbeiten</Button>
          {faq.status === 'ACTIVE' ? (
            <Button onClick={() => handleArchive(faq.id)}>Archivieren</Button>
          ) : (
            <>
              <Button onClick={() => handleReactivate(faq.id)}>Reaktivieren</Button>
              <Button color="error" onClick={() => handleDeleteClick(faq.id)}>Löschen</Button>
            </>
          )}
        </Box>
      </>
    )}
  </AccordionDetails>
</Accordion>
```

**Checkpoint**: Verify admin page renders correctly and CRUD operations work.

---

### Phase 7: Portal UI Components (45-60 minutes)

#### 7.1 Create Portal FAQ Page

**File**: `src/app/portal/faq/page.tsx` (NEW)

Simpler than admin page - read-only with search:

1. Fetch active FAQs from `/api/portal/faq`
2. Implement client-side search filtering
3. Render accordion list (read-only)
4. No pagination (small dataset)

**Example Implementation**:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import PortalNavigation from '@/components/portal/PortalNavigation';
import {
  Box, Container, Typography, TextField, Accordion,
  AccordionSummary, AccordionDetails, CircularProgress
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SearchIcon from '@mui/icons-material/Search';
import SafeHtml from '@/components/ui/SafeHtml';
import type { FaqEntryPublic } from '@/types/api-types';

export default function PortalFaqPage() {
  const [faqs, setFaqs] = useState<FaqEntryPublic[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchFaqs();
  }, []);

  const fetchFaqs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/portal/faq');
      if (!response.ok) throw new Error('Failed to fetch FAQs');
      const data = await response.json();
      setFaqs(data.faqs);
    } catch (err) {
      setError('FAQ konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  const filteredFaqs = faqs.filter(faq => {
    const term = searchTerm.toLowerCase().slice(0, 100);
    return faq.title.toLowerCase().includes(term) ||
           faq.content.toLowerCase().includes(term);
  });

  return (
    <MainLayout>
      <PortalNavigation />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>FAQ</Typography>

        <TextField
          fullWidth
          placeholder="FAQ durchsuchen..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{ startAdornment: <SearchIcon /> }}
          sx={{ mb: 3 }}
        />

        {loading ? (
          <CircularProgress />
        ) : error ? (
          <Typography color="error">{error}</Typography>
        ) : filteredFaqs.length === 0 ? (
          <Typography>Keine FAQ-Einträge gefunden</Typography>
        ) : (
          filteredFaqs.map(faq => (
            <Accordion
              key={faq.id}
              expanded={expandedId === faq.id}
              onChange={() => setExpandedId(expandedId === faq.id ? null : faq.id)}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">{faq.title}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <SafeHtml html={faq.content} />
              </AccordionDetails>
            </Accordion>
          ))
        )}
      </Container>
    </MainLayout>
  );
}
```

**Checkpoint**: Verify portal page renders correctly and search works.

---

### Phase 8: Navigation Integration (15-20 minutes)

#### 8.1 Add FAQ to Portal Navigation

**File**: `src/app/portal/layout.tsx` or `src/components/portal/PortalNavigation.tsx`

Add FAQ menu item:

```typescript
const menuItems = [
  // ... existing items ...
  {
    label: 'FAQ',
    path: '/portal/faq',
    icon: <HelpIcon /> // Or appropriate icon
  }
];
```

**Checkpoint**: Verify FAQ appears in portal navigation and links work.

---

### Phase 9: Testing & Validation (30-45 minutes)

#### 9.1 Run Code Quality Checks

```bash
npm run check  # Runs lint + typecheck
```

Fix any errors reported.

#### 9.2 Manual Testing Checklist

**Admin Tests**:
- [ ] Navigate to `/admin/faq`
- [ ] Create new FAQ with title and content
- [ ] Edit existing FAQ (title, content, status)
- [ ] Archive active FAQ
- [ ] Reactivate archived FAQ
- [ ] Attempt to delete active FAQ (should fail with error)
- [ ] Delete archived FAQ (should succeed)
- [ ] Test search functionality
- [ ] Test pagination (if >10 entries)
- [ ] Test status tabs (Aktiv, Archiviert, Alle)

**Portal Tests**:
- [ ] Log in as member (role: mitglied)
- [ ] Navigate to `/portal/faq`
- [ ] Verify only active FAQs are visible
- [ ] Test search functionality
- [ ] Expand/collapse FAQ accordions
- [ ] Verify rich text content displays correctly

**Authorization Tests**:
- [ ] Attempt to access `/admin/faq` as member (should redirect)
- [ ] Attempt to access `/portal/faq` as unauthenticated user (should redirect to login)
- [ ] Verify API endpoints enforce role checks

**Edge Case Tests**:
- [ ] Create FAQ with max length title (200 chars)
- [ ] Create FAQ with max length content (10,000 chars)
- [ ] Search with special characters
- [ ] Search with very long query (>100 chars, should truncate)
- [ ] Test with empty FAQ list
- [ ] Test with many FAQs (pagination)

#### 9.3 Verify German Text

Check that all user-facing text is in German:
- [ ] Button labels (e.g., "Neue FAQ erstellen", "Archivieren")
- [ ] Error messages (e.g., "FAQ konnte nicht erstellt werden")
- [ ] Validation messages (e.g., "Titel ist erforderlich")
- [ ] Status labels (e.g., "Aktiv", "Archiviert")
- [ ] Empty states (e.g., "Keine FAQ-Einträge gefunden")

---

### Phase 10: Finalization (15-20 minutes)

#### 10.1 Update Agent Context

Run the update script:

```bash
.specify/scripts/bash/update-agent-context.sh claude
```

This adds the FAQ feature to Claude Code's context.

#### 10.2 Review Implementation Against Spec

- [ ] All functional requirements (FR-001 to FR-022) implemented
- [ ] All user stories (P1, P2, P3) satisfied
- [ ] All edge cases handled
- [ ] All success criteria met (SC-001 to SC-008)

#### 10.3 Final Code Quality Check

```bash
npm run check
```

Ensure zero errors.

#### 10.4 Commit Changes

```bash
git add .
git commit -m "Add FAQ system for admin and portal

- Add FaqEntry model to Prisma schema
- Create FAQ database operations with role-based access control
- Implement admin CRUD API endpoints (/api/admin/faq)
- Implement portal read-only API endpoints (/api/portal/faq)
- Create admin FAQ management page with accordion UI
- Create portal FAQ page with search functionality
- Add FAQ to portal navigation
- Include seed data with Getting Started FAQ

Implements spec: specs/009-admin-portal-faq/spec.md"
```

---

## Troubleshooting

### Common Issues

**Issue**: Prisma migration fails
- **Solution**: Check database connection, ensure PostgreSQL is running
- **Solution**: Check for existing tables with same name
- **Solution**: Review migration file for errors

**Issue**: TypeScript errors after adding types
- **Solution**: Run `npm run typecheck` to identify issues
- **Solution**: Ensure imports use correct paths (`@/types/api-types`)
- **Solution**: Restart TypeScript server in IDE

**Issue**: API routes return 401/403 errors
- **Solution**: Verify NextAuth session is configured correctly
- **Solution**: Check middleware configuration in `src/middleware.ts`
- **Solution**: Ensure API route paths match middleware matcher

**Issue**: Rich text content not displaying correctly
- **Solution**: Verify SafeHtml component is used for rendering
- **Solution**: Check TipTap editor configuration
- **Solution**: Ensure content is stored as HTML string

**Issue**: Search not working on portal page
- **Solution**: Check client-side filter logic
- **Solution**: Verify search term is truncated to 100 chars
- **Solution**: Ensure case-insensitive comparison

---

## Performance Optimization

### Optional Enhancements (Future)

1. **Add debouncing to search**:
   - Use `useDebouncedValue` hook for search input
   - Prevents excessive filtering on every keystroke

2. **Implement caching**:
   - Cache FAQ list in React Query or SWR
   - Reduce API calls on navigation

3. **Add optimistic updates**:
   - Update UI immediately before API call completes
   - Improves perceived performance

4. **Add loading skeletons**:
   - Show skeleton UI while loading
   - Better UX than spinner

---

## Next Steps

After completing implementation:

1. **Manual testing** by a human reviewer
2. **User acceptance testing** with admins and members
3. **Create task breakdown** with `/speckit.tasks` command
4. **Deployment** to staging environment
5. **Production release** after approval

---

## Reference Documents

- **Specification**: `specs/009-admin-portal-faq/spec.md`
- **Research**: `specs/009-admin-portal-faq/research.md`
- **Data Model**: `specs/009-admin-portal-faq/data-model.md`
- **API Contracts**: `specs/009-admin-portal-faq/contracts/api-contracts.yaml`
- **Type Definitions**: `specs/009-admin-portal-faq/contracts/TypeScriptTypes.ts`
- **Implementation Plan**: `specs/009-admin-portal-faq/plan.md`

---

## Support

For questions or issues during implementation:
- Review the specification and research documents
- Check existing code patterns in similar features (e.g., groups management)
- Consult the project constitution (`.specify/memory/constitution.md`)
- Refer to Next.js, Prisma, and Material UI documentation

**Happy coding!** 🚀
