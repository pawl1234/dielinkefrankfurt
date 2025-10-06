# Research: Code Organization Refactoring for src/lib

**Feature**: Code Organization Refactoring
**Branch**: 001-i-want-to
**Date**: 2025-10-06

## Current State Analysis

### File Organization Overview

**Total files in src/lib**: 62 files (35 in root, 27 in subdirectories)
**Total lines of code**: 12,635 lines
**Current subdirectories**: 5 (blob-storage/, db/, form-submission/, hooks/, validation/)
**Files in root**: 35 TypeScript files

### Files Exceeding 500-Line Limit

1. **newsletter-service.ts** - 1,236 lines (247% over limit)
   - Contains: settings management, preview generation, draft handling, archive operations, SMTP configuration
   - Needs splitting into: settings service, preview service, draft service, archive service, SMTP service

2. **group-handlers.ts** - 1,029 lines (206% over limit)
   - Contains: group CRUD, status report CRUD, file management, email notifications
   - Needs splitting into: group service, status report service, file cleanup utilities

3. **appointment-handlers.ts** - 996 lines (199% over limit)
   - Contains: appointment CRUD, metadata parsing, email notifications, file cleanup
   - Needs splitting into: appointment service, metadata utilities, notification wrappers

### Domain Analysis

#### Newsletter Domain (9 files, 4,378 lines)
- newsletter-service.ts (1,236 lines)
- newsletter-sending.ts (458 lines)
- newsletter-analytics.ts (292 lines)
- newsletter-archive.ts (288 lines)
- newsletter-template.ts
- newsletter-helpers.ts
- newsletter-constants.ts
- newsletter-tracking.ts
- newsletter-validation.ts

**Issues**: Scattered functionality, unclear separation of concerns, multiple files mixing services

#### Appointments Domain (3 files)
- appointment-handlers.ts (996 lines) - **OVERSIZED**
- Related DB file: db/appointment-operations.ts

**Issues**: Handler file mixes CRUD, metadata parsing, email, and file cleanup

#### Groups Domain (2 files)
- group-handlers.ts (1,029 lines) - **OVERSIZED**
- Related DB file: db/group-operations.ts

**Issues**: Handler file mixes group and status report logic, email notifications, file cleanup

#### Anträge (Board Requests) Domain (4 files)
- antrag-handlers.ts (353 lines)
- antrag-file-utils.ts
- Related DB files: db/antrag-operations.ts, db/antrag-config-operations.ts

**Status**: Reasonably organized but not grouped together

#### Email Domain (6 files, 1,865 lines)
- email-senders.ts (479 lines)
- email.ts (375 lines)
- email-render.ts
- email-hashing.ts (246 lines)
- email-attachment-utils.ts
- image-composition.ts (438 lines)

**Issues**: Cross-cutting concern spread across root, serves all domains

#### AI Domain (3 files)
- ai-service.ts (275 lines)
- ai-prompts.ts
- ai-models.ts

**Status**: Logically grouped but not in subdirectory

### Standards Violations

#### Console Usage (17 files)
Files using console.log/console.error instead of logger:
- newsletter-service.ts
- group-handlers.ts
- newsletter-helpers.ts
- image-compression.ts
- antrag-file-utils.ts
- antrag-handlers.ts
- email-senders.ts
- auth.ts
- newsletter-analytics.ts
- base-url.ts
- auth-options.ts
- api-auth.ts
- (+ 5 DB files which may be acceptable for debugging)

**Fix**: Replace all console.* with logger from @/lib/logger.ts

#### Database Operations Outside db/ (11 files)
Files with direct Prisma queries outside db/ directory:
- newsletter-service.ts
- group-handlers.ts
- appointment-handlers.ts
- ai-service.ts
- antrag-handlers.ts
- auth.ts
- newsletter-analytics.ts
- newsletter-archive.ts
- email-hashing.ts
- (+ 2 DB files which are correct)

**Fix**: Extract all Prisma queries to corresponding *-operations.ts files in db/

#### Misplaced Client Hook
- useApiError.ts in root instead of hooks/

**Fix**: Move to src/lib/hooks/

### Dependency Analysis

#### Circular Dependencies
- newsletter-service.ts ↔ email-senders.ts
  - newsletter-service imports email-senders for sending emails
  - email-senders might reference newsletter types or utilities

**Resolution**: Extract email infrastructure to separate email/ directory

#### Cross-Cutting Concerns
Files used across multiple domains:
- **Utilities** (keep at root): logger.ts, errors.ts, base-url.ts, date-utils.ts, file-utils.ts, prisma.ts
- **Email** (extract to email/): email*.ts, image-composition.ts
- **AI** (extract to ai/): ai-*.ts files
- **Analytics** (keep with newsletter/): fingerprinting.ts, analytics-cleanup.ts

## Proposed Directory Structure

### Target Organization

```
src/lib/
├── appointments/              # NEW: Appointment domain
│   ├── index.ts              # Barrel export
│   ├── appointment-service.ts
│   ├── metadata-utils.ts
│   └── notification-handlers.ts
├── groups/                    # NEW: Groups domain
│   ├── index.ts              # Barrel export
│   ├── group-service.ts
│   ├── status-report-service.ts
│   └── file-cleanup.ts
├── antraege/                  # NEW: Anträge domain
│   ├── index.ts              # Barrel export
│   ├── antrag-handlers.ts
│   └── antrag-file-utils.ts
├── newsletter/                # NEW: Newsletter domain
│   ├── index.ts              # Barrel export
│   ├── settings-service.ts   # Split from newsletter-service
│   ├── preview-service.ts    # Split from newsletter-service
│   ├── draft-service.ts      # Split from newsletter-service
│   ├── archive-service.ts    # Split from newsletter-service
│   ├── sending-coordinator.ts # Renamed/refactored from newsletter-sending
│   ├── analytics-service.ts  # Renamed from newsletter-analytics
│   ├── tracking-service.ts   # Renamed from newsletter-tracking
│   ├── template-generator.ts # Renamed from newsletter-template
│   ├── validation.ts         # Renamed from newsletter-validation
│   ├── helpers.ts            # Renamed from newsletter-helpers
│   └── constants.ts          # Renamed from newsletter-constants
├── email/                     # NEW: Email infrastructure (cross-cutting)
│   ├── index.ts              # Barrel export
│   ├── smtp-service.ts       # Split from newsletter-service
│   ├── senders.ts            # Renamed from email-senders
│   ├── rendering.ts          # Renamed from email-render
│   ├── hashing.ts            # Renamed from email-hashing
│   ├── attachments.ts        # Renamed from email-attachment-utils
│   ├── image-composition.ts  # Moved from root
│   └── mailer.ts             # Renamed from email.ts
├── ai/                        # NEW: AI infrastructure
│   ├── index.ts              # Barrel export
│   ├── service.ts            # Renamed from ai-service
│   ├── prompts.ts            # Renamed from ai-prompts
│   └── models.ts             # Renamed from ai-models
├── db/                        # EXISTING: Database operations
│   ├── prisma.ts             # Moved from root
│   ├── appointment-operations.ts
│   ├── group-operations.ts
│   ├── status-report-operations.ts # NEW: Split from group-operations
│   ├── antrag-operations.ts
│   ├── antrag-config-operations.ts
│   ├── newsletter-operations.ts    # NEW: Extracted from newsletter-service
│   ├── analytics-operations.ts     # NEW: Extracted from newsletter-analytics
│   └── user-operations.ts          # NEW: Extracted from auth.ts
├── hooks/                     # EXISTING: React hooks
│   └── useApiError.ts        # Moved from root
├── validation/                # EXISTING: Zod schemas
│   ├── schemas.ts
│   ├── validation-messages.ts
│   └── localization.ts
├── blob-storage/              # EXISTING: Vercel Blob utilities
│   └── upload.ts
├── form-submission/           # EXISTING: Form utilities
│   └── create-appointment-form-data.ts
├── analytics/                 # NEW: Analytics utilities
│   ├── fingerprinting.ts     # Moved from root
│   └── cleanup.ts            # Renamed from analytics-cleanup
├── auth/                      # NEW: Authentication
│   ├── index.ts              # Barrel export
│   ├── auth-options.ts       # Moved from root
│   ├── api-auth.ts           # Moved from root
│   └── session.ts            # Renamed from auth.ts
├── logger.ts                  # ROOT: Core utility
├── errors.ts                  # ROOT: Core utility
├── base-url.ts               # ROOT: Core utility
├── date-utils.ts             # ROOT: Core utility
├── file-utils.ts             # ROOT: Core utility
└── image-compression.ts      # ROOT: Shared image utility
```

### Directory Responsibilities

1. **appointments/** - All appointment-related business logic
2. **groups/** - Group and status report management
3. **antraege/** - Board request handling
4. **newsletter/** - Newsletter composition, sending, analytics
5. **email/** - Email sending infrastructure (used by all domains)
6. **ai/** - AI service integration (used by newsletter)
7. **db/** - All Prisma database operations (strict separation)
8. **auth/** - Authentication and authorization
9. **analytics/** - Analytics utilities (fingerprinting, cleanup)
10. **ROOT level** - Core utilities used everywhere (logger, errors, utils)

## Refactoring Strategy

### Phase 1: Newsletter Domain
- Split newsletter-service.ts into 5 smaller services
- Move all newsletter files to newsletter/ directory
- Extract DB operations to db/newsletter-operations.ts
- Replace console with logger
- Update imports

### Phase 2: Email Infrastructure
- Create email/ directory
- Move all email-related files
- Break circular dependencies with newsletter
- Extract SMTP logic from newsletter-service

### Phase 3: Appointments Domain
- Split appointment-handlers.ts into service + utilities
- Create appointments/ directory
- Extract DB operations to db/appointment-operations.ts
- Replace console with logger

### Phase 4: Groups Domain
- Split group-handlers.ts into group + status report services
- Create groups/ directory
- Extract DB operations (may need db/status-report-operations.ts)
- Replace console with logger

### Phase 5: Anträge Domain
- Move antrag files to antraege/ directory
- Verify DB operations already in db/

### Phase 6: AI & Analytics
- Create ai/ directory
- Create analytics/ directory
- Move related files
- Extract DB operations from ai-service if needed

### Phase 7: Auth
- Create auth/ directory
- Move auth-related files
- Extract user operations to db/user-operations.ts

### Phase 8: Final Cleanup
- Move useApiError.ts to hooks/
- Move prisma.ts to db/
- Replace remaining console usage
- Verify all imports updated
- Run `npm run check`

## Import Update Strategy

### Barrel Exports (index.ts)
Each domain directory gets an index.ts that re-exports all functions:

```typescript
// Example: src/lib/appointments/index.ts
export * from './appointment-service';
export * from './metadata-utils';
export * from './notification-handlers';
```

**Benefit**: Minimizes breaking changes. Imports like:
```typescript
import { getAppointments } from '@/lib/appointment-handlers';
```

Can become:
```typescript
import { getAppointments } from '@/lib/appointments';
```

### Automated Import Updates
1. Use IDE find/replace with regex
2. Update one domain at a time
3. Verify with `npm run typecheck` after each domain
4. Commit after each successful domain refactoring

## Risk Mitigation

### Validation After Each Domain
1. Run `npm run check` (lint + typecheck)
2. Manually test affected features
3. Verify no runtime errors
4. Commit changes

### Rollback Plan
Git allows reverting individual commits if issues arise

### No Behavioral Changes
- Only file moves and splits
- All business logic preserved
- All exports maintained via barrel exports
- Types unchanged

## Expected Outcomes

### Improved Navigation
- Developers can find appointment code in appointments/ directory
- Database operations clearly separated in db/
- Email infrastructure in dedicated email/ directory

### Standards Compliance
- All files under 500 lines
- No console usage (only logger)
- All DB operations in db/ directory
- Clear separation of concerns

### Maintainability
- Related code grouped together
- Smaller, focused modules
- Reduced cognitive load
- Easier onboarding for new developers

### Zero Functional Impact
- Application behavior unchanged
- All features work identically
- No user-visible changes
- Performance unchanged

## Decisions Log

| Decision | Rationale | Alternatives Considered |
|----------|-----------|------------------------|
| Create email/ directory | Email is cross-cutting infrastructure used by multiple domains | Keep in root (rejected: too many root files) |
| Use barrel exports (index.ts) | Minimizes breaking changes, maintains short import paths | Direct imports (rejected: requires updating many files) |
| Keep utilities at root | Short import paths, high usage frequency | Move to utils/ (rejected: longer imports for common utilities) |
| Split by domain first | Logical organization, easier navigation | Split by layer (services/, handlers/) - rejected: doesn't match domain-driven design |
| Create ai/ directory | AI is specialized infrastructure with growing complexity | Keep in root (rejected: will grow as AI features expand) |
| Extract auth/ directory | Authentication is a distinct concern with multiple files | Keep in root (rejected: 3+ related files warrant directory) |

## Success Criteria

1. ✅ All files under 500 lines
2. ✅ All DB operations in db/ directory
3. ✅ No console.log usage (only logger)
4. ✅ Domain-related files grouped in subdirectories
5. ✅ `npm run check` passes without errors
6. ✅ All imports updated and functioning
7. ✅ Application behavior unchanged
8. ✅ Improved code navigability (subjective but verifiable through developer feedback)

---

**Research Complete**: 2025-10-06
**Next Phase**: Design & Contracts (Phase 1)
