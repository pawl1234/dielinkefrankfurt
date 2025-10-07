# Data Model: File Structure Refactoring

**Feature**: Code Organization Refactoring
**Branch**: 001-i-want-to
**Date**: 2025-10-06

## Overview

This document defines the target file structure for the src/lib refactoring. Unlike traditional data models that define database schemas, this "data model" defines the organization of code files and their relationships.

## File Structure Entities

### 1. Domain Directories

Domain directories group related business logic by feature area.

#### appointments/
**Purpose**: All appointment-related business logic
**Files**:
- `index.ts` - Barrel export for all appointment functions
- `appointment-service.ts` - CRUD operations, business logic (split from appointment-handlers.ts)
- `metadata-utils.ts` - iCal parsing, metadata extraction (split from appointment-handlers.ts)
- `notification-handlers.ts` - Email notification wrappers (split from appointment-handlers.ts)

**Exports**: All functions currently exported from appointment-handlers.ts

#### groups/
**Purpose**: Group and status report management
**Files**:
- `index.ts` - Barrel export
- `group-service.ts` - Group CRUD operations (split from group-handlers.ts)
- `status-report-service.ts` - Status report CRUD (split from group-handlers.ts)
- `file-cleanup.ts` - File cleanup utilities (split from group-handlers.ts)

**Exports**: All functions currently exported from group-handlers.ts

#### antraege/
**Purpose**: Board request (Antrag) handling
**Files**:
- `index.ts` - Barrel export
- `antrag-handlers.ts` - Moved from root
- `antrag-file-utils.ts` - Moved from root

**Exports**: All functions currently exported from antrag-handlers.ts and antrag-file-utils.ts

#### newsletter/
**Purpose**: Newsletter composition, sending, analytics
**Files**:
- `index.ts` - Barrel export
- `settings-service.ts` - Newsletter settings CRUD (split from newsletter-service.ts, lines ~1-200)
- `preview-service.ts` - Newsletter preview generation (split from newsletter-service.ts, lines ~201-400)
- `draft-service.ts` - Draft handling (split from newsletter-service.ts, lines ~401-600)
- `archive-service.ts` - Archive operations (moved from newsletter-archive.ts)
- `sending-coordinator.ts` - Batch sending logic (renamed from newsletter-sending.ts)
- `analytics-service.ts` - Open/click tracking (renamed from newsletter-analytics.ts)
- `tracking-service.ts` - Tracking pixel/links (renamed from newsletter-tracking.ts)
- `template-generator.ts` - Email template generation (renamed from newsletter-template.ts)
- `validation.ts` - Newsletter-specific validation (renamed from newsletter-validation.ts)
- `helpers.ts` - Helper utilities (renamed from newsletter-helpers.ts)
- `constants.ts` - Constants (renamed from newsletter-constants.ts)

**Exports**: All functions currently exported from newsletter-*.ts files

**Split Strategy for newsletter-service.ts**:
- Lines 1-250: Settings service (CRUD for newsletter settings)
- Lines 251-500: Preview service (generate preview, fetch approved items)
- Lines 501-750: Draft service (save draft, load draft)
- Lines 751-1000: SMTP/sending coordination (extract to email/smtp-service.ts)
- Lines 1001-1236: Miscellaneous utilities (distribute to helpers.ts or other services)

### 2. Infrastructure Directories

Infrastructure directories provide cross-cutting services used by multiple domains.

#### email/
**Purpose**: Email sending infrastructure (cross-cutting)
**Files**:
- `index.ts` - Barrel export
- `smtp-service.ts` - SMTP configuration and connection (extracted from newsletter-service.ts)
- `senders.ts` - Email sending functions (renamed from email-senders.ts)
- `rendering.ts` - Email HTML rendering (renamed from email-render.ts)
- `hashing.ts` - Email recipient hashing for privacy (renamed from email-hashing.ts)
- `attachments.ts` - Attachment handling (renamed from email-attachment-utils.ts)
- `image-composition.ts` - Image composition for emails (moved from root)
- `mailer.ts` - Nodemailer wrapper (renamed from email.ts)

**Exports**: All email-related functions

**Dependencies**:
- Used by: appointments/, groups/, antraege/, newsletter/
- Uses: logger, errors

#### ai/
**Purpose**: AI service integration (Anthropic Claude)
**Files**:
- `index.ts` - Barrel export
- `service.ts` - AI service client (renamed from ai-service.ts)
- `prompts.ts` - AI prompts (renamed from ai-prompts.ts)
- `models.ts` - AI model configurations (renamed from ai-models.ts)

**Exports**: AI service functions
**Dependencies**:
- Used by: newsletter/
- Uses: logger, db/newsletter-operations

#### auth/
**Purpose**: Authentication and authorization
**Files**:
- `index.ts` - Barrel export
- `auth-options.ts` - NextAuth configuration (moved from root)
- `api-auth.ts` - API route auth helpers (moved from root)
- `session.ts` - Session management (renamed from auth.ts)

**Exports**: Auth configuration and helpers
**Dependencies**:
- Uses: db/user-operations, logger

#### analytics/
**Purpose**: Analytics utilities
**Files**:
- `fingerprinting.ts` - Privacy-friendly fingerprinting (moved from root)
- `cleanup.ts` - Analytics cleanup jobs (renamed from analytics-cleanup.ts)

**Exports**: Fingerprinting and cleanup functions
**Dependencies**:
- Used by: newsletter/analytics-service

### 3. Data Access Layer

#### db/
**Purpose**: All Prisma database operations (strict separation)
**Files**:
- `prisma.ts` - Prisma singleton instance (moved from root)
- `appointment-operations.ts` - Existing
- `group-operations.ts` - Existing
- `status-report-operations.ts` - NEW: Split from group-operations.ts or extracted from group-handlers.ts
- `antrag-operations.ts` - Existing
- `antrag-config-operations.ts` - Existing
- `newsletter-operations.ts` - NEW: Extracted from newsletter-service.ts, newsletter-archive.ts
- `analytics-operations.ts` - NEW: Extracted from newsletter-analytics.ts
- `user-operations.ts` - NEW: Extracted from auth.ts

**Validation Rules**:
- ONLY files in db/ may import `@/lib/db/prisma`
- ONLY files in db/ may call Prisma methods (prisma.appointment.findMany, etc.)
- All other files MUST call db/*-operations.ts functions

### 4. Existing Well-Organized Directories

These directories remain unchanged:

#### hooks/
- `useApiError.ts` - NEW: Moved from root

#### validation/
- `schemas.ts` - Unchanged
- `validation-messages.ts` - Unchanged
- `localization.ts` - Unchanged

#### blob-storage/
- `upload.ts` - Unchanged

#### form-submission/
- `create-appointment-form-data.ts` - Unchanged

### 5. Root-Level Utilities

These core utilities remain at src/lib/ root for short import paths:

- `logger.ts` - Structured logging (unchanged)
- `errors.ts` - Custom error types (unchanged)
- `base-url.ts` - Base URL utility (unchanged)
- `date-utils.ts` - Date utilities (unchanged)
- `file-utils.ts` - File utilities (unchanged)
- `image-compression.ts` - Image compression (unchanged)

**Rationale**: These are used across all domains and benefit from shortest import paths.

## File Size Constraints

### Oversized Files to Split

| Current File | Lines | Target Files | Max Lines Each |
|--------------|-------|--------------|----------------|
| newsletter-service.ts | 1,236 | 4 services + SMTP | ~250 each |
| group-handlers.ts | 1,029 | 3 services | ~350 each |
| appointment-handlers.ts | 996 | 3 modules | ~350 each |

### Size Validation

After refactoring, verify:
```bash
find src/lib -type f \( -name "*.ts" -o -name "*.tsx" \) -exec wc -l {} + | sort -rn | head -1
```

Output should show no file exceeding 500 lines.

## Import Path Mapping

### Before → After Examples

```typescript
// Appointments
import { getAppointments } from '@/lib/appointment-handlers';
// After:
import { getAppointments } from '@/lib/appointments';

// Groups
import { getGroups } from '@/lib/group-handlers';
// After:
import { getGroups } from '@/lib/groups';

// Newsletter
import { sendNewsletter } from '@/lib/newsletter-sending';
// After:
import { sendNewsletter } from '@/lib/newsletter';

// Email
import { sendAppointmentEmail } from '@/lib/email-senders';
// After:
import { sendAppointmentEmail } from '@/lib/email';

// AI
import { generateIntro } from '@/lib/ai-service';
// After:
import { generateIntro } from '@/lib/ai';

// Auth
import { authOptions } from '@/lib/auth-options';
// After:
import { authOptions } from '@/lib/auth';

// DB Operations (explicit path required)
import { createAppointment } from '@/lib/db/appointment-operations';
// After: (unchanged)
import { createAppointment } from '@/lib/db/appointment-operations';

// Root utilities (unchanged)
import { logger } from '@/lib/logger';
import { AppError } from '@/lib/errors';
```

### Barrel Export Pattern

Each domain directory contains an `index.ts` that re-exports all functions:

```typescript
// src/lib/appointments/index.ts
export * from './appointment-service';
export * from './metadata-utils';
export * from './notification-handlers';
```

This allows:
- Short import paths: `@/lib/appointments`
- Backward compatibility: Old imports work if updated to new directory
- Internal organization: Files can be split without breaking external imports

## Dependency Graph

```
Root Utilities (logger, errors, date-utils, file-utils)
    ↓
db/ (database operations layer)
    ↓
Infrastructure (email/, ai/, auth/, analytics/)
    ↓
Domains (appointments/, groups/, antraege/, newsletter/)
    ↓
API Routes & Components (not part of this refactoring)
```

**Circular Dependency Resolution**:
- Email infrastructure extracted to email/
- Newsletter uses email/, not vice versa
- DB layer only depends on prisma and root utilities
- Root utilities depend on nothing (except external packages)

## Validation Schema

After refactoring, the structure must satisfy:

1. **File count**: ~55-65 files in src/lib (similar to current)
2. **Max file size**: 500 lines per file
3. **Directory count**: 13 directories (8 new + 5 existing)
4. **Root files**: ~6-8 utility files (down from 35)
5. **DB purity**: Only db/*.ts files import prisma
6. **Logger usage**: No console.* calls outside logger.ts
7. **Type safety**: All files pass `npm run typecheck`
8. **Lint compliance**: All files pass `npm run lint`

## Migration Checklist

For each domain refactoring:

- [ ] Create directory and index.ts
- [ ] Move/split files into domain directory
- [ ] Extract DB operations to db/*-operations.ts
- [ ] Replace console.* with logger
- [ ] Update all import paths
- [ ] Run `npm run check`
- [ ] Commit changes

## Entity Relationships

```
appointments/ ──uses──> db/appointment-operations.ts
    │
    └──uses──> email/ ──uses──> db/newsletter-operations.ts (for tracking)

groups/ ──uses──> db/group-operations.ts
    │           db/status-report-operations.ts
    └──uses──> email/

antraege/ ──uses──> db/antrag-operations.ts
    │             db/antrag-config-operations.ts
    └──uses──> email/

newsletter/ ──uses──> db/newsletter-operations.ts
    │                db/analytics-operations.ts
    ├──uses──> email/
    ├──uses──> ai/
    └──uses──> analytics/

ai/ ──uses──> db/newsletter-operations.ts (read-only for context)

auth/ ──uses──> db/user-operations.ts

email/ ──uses──> db/ (for tracking)
    └──uses──> analytics/fingerprinting
```

## Success Criteria

The refactored structure is considered successful when:

1. ✅ All domain code grouped in subdirectories
2. ✅ All database operations in db/
3. ✅ All files under 500 lines
4. ✅ No console.* usage (except logger.ts)
5. ✅ Clear separation of concerns (domain vs infrastructure)
6. ✅ Short import paths via barrel exports
7. ✅ No circular dependencies
8. ✅ `npm run check` passes
9. ✅ Application behavior unchanged

---

**Model Complete**: 2025-10-06
**Next**: Create quickstart.md for validation
