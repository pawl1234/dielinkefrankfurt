# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Newsletter management system for Die Linke Frankfurt Kreisverband, enabling anonymous submissions of appointments, group proposals, status reports, and board requests with an admin dashboard for review and newsletter distribution.

## Development Commands
Use only the following commands to validate changed code:
```bash
npm run check           # Run lint + typecheck (use before committing)
npm run lint            # ESLint check
npm run lint:fix        # Auto-fix ESLint issues
npm run typecheck       # TypeScript type checking
```

## Architecture

### Data Flow

**Public Submission → Admin Review → Newsletter Distribution**

1. **Public Forms** (`/termine`, `/neue-gruppe`, `/gruppen-bericht`, `/antrag-an-kreisvorstand`)
   - Anonymous users submit content via public forms
   - Client-side validation: React Hook Form + Material UI
   - Server-side validation: Zod schemas in API routes
   - Files stored in Vercel Blob Storage via `/api/*/route.ts` endpoints

2. **Admin Dashboard** (`/admin/*`)
   - Protected by NextAuth.js (credentials provider)
   - Review, edit, accept/reject submissions
   - Compose newsletters with rich text editor (TipTap)
   - Generate AI introductions via Anthropic Claude
   - Send newsletters with batch processing

3. **Newsletter System**
   - Template generation: `src/lib/newsletter/template-generator.ts`
   - Batch sending: `src/lib/newsletter/sending-coordinator.ts`
   - Privacy-friendly analytics: fingerprint-based tracking (no email storage)
   - Archive/view previous newsletters

### Key Technical Patterns

**Form Submission Pattern**
- Client: `submitForm()` utility (`src/lib/form-submission/submit-form.ts`) wraps fetch with error handling
- Server: API routes validate with Zod, call database operations, return JSON
- File uploads: FormData with image compression (`react-image-crop`, `sharp`)

**Database Access**
- Single Prisma instance: `src/lib/db/prisma.ts` (singleton pattern for development HMR)
- Operations separated by domain: `src/lib/db/*-operations.ts`
- Models follow PostgreSQL lowercase naming: `@@map("table_name")`

**Authentication**
- NextAuth.js v4 with credentials provider
- Fallback env-based admin (ADMIN_USERNAME/ADMIN_PASSWORD) for initial setup
- Database users stored in `User` model with bcrypt hashing
- Protected API routes use `src/lib/auth/` helpers

**Newsletter Workflow**
1. Admin creates draft in `/admin/newsletter/edit`
2. Fetches approved appointments/status reports from database
3. Optionally generates AI introduction via `/api/newsletter/generate-intro`
4. Previews email template: `/admin/email-preview`
5. Sends to recipients via `/api/newsletter/send`
6. Tracks opens/clicks using fingerprints (no email storage)
7. Archives sent newsletters in `NewsletterItem` model

### File Structure

```
src/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes (server actions)
│   │   ├── admin/                # Protected admin operations
│   │   ├── appointments/         # Appointment CRUD
│   │   ├── groups/               # Group management
│   │   ├── newsletter/           # Newsletter operations
│   │   └── status-reports/       # Status report operations
│   ├── admin/                    # Admin dashboard pages
│   │   ├── newsletter/           # Newsletter management
│   │   │   ├── edit/            # Compose newsletter
│   │   │   ├── settings/        # Configure sending params
│   │   │   ├── analytics/       # View open/click stats
│   │   │   └── archives/        # Previous newsletters
│   │   ├── appointments/         # Review appointments
│   │   ├── groups/               # Manage groups
│   │   ├── status-reports/       # Review reports
│   │   └── antraege/             # Review board requests
│   ├── termine/                  # Public appointment submission
│   ├── neue-gruppe/              # Public group proposal
│   ├── gruppen-bericht/          # Public status report
│   └── antrag-an-kreisvorstand/  # Public board request
├── components/
│   ├── admin/                    # Admin-specific components
│   ├── forms/                    # Reusable form components
│   ├── newsletter/               # Newsletter preview components
│   └── editor/                   # TipTap rich text editor
├── lib/                          # Domain-based architecture
│   ├── newsletter/               # Newsletter domain (settings, drafts, sending, analytics)
│   ├── email/                    # Email infrastructure (SMTP, rendering, attachments)
│   ├── appointments/             # Appointments domain (CRUD, file handling)
│   ├── groups/                   # Groups & status reports domain
│   ├── antraege/                 # Board requests domain
│   ├── ai/                       # AI infrastructure (Claude integration, prompts)
│   ├── analytics/                # Analytics infrastructure (fingerprinting, cleanup)
│   ├── auth/                     # Authentication (NextAuth, session, API protection)
│   ├── db/                       # Database operations (Prisma queries for all entities)
│   ├── blob-storage/             # Vercel Blob utilities
│   ├── form-submission/          # Form submission utilities
│   ├── validation/               # Zod schemas
│   ├── hooks/                    # React hooks
│   ├── logger.ts                 # Structured logging
│   ├── errors.ts                 # Custom error types
│   └── [utility files]           # date-utils, file-utils, base-url, image-compression
├── emails/                       # React Email templates
│   └── notifications/            # Notification emails
├── theme/                        # Material UI theme
└── types/                        # TypeScript definitions
```

### Important Conventions

**Path Aliases**
- Use `@/` for imports: `import { getNewsletterSettings } from '@/lib/newsletter'`
- Configured in `tsconfig.json`: `"@/*": ["./src/*"]`
- Server code: Use barrel exports `@/lib/newsletter`, `@/lib/email`
- Client components: Import specific files `@/lib/newsletter/constants` (avoid bundling server code)

**Database Conventions**
- Models use lowercase table names: `@@map("appointment")`
- IDs: `Int @id @default(autoincrement())` for simple models, `String @id @default(cuid())` for others
- Status fields: uppercase enums (`GroupStatus`, `AntragStatus`) with values like `NEW`, `ACTIVE`, `ARCHIVED`
- JSON storage: `String` or `String @db.Text` fields for flexible metadata (file URLs, settings)

**Validation Pattern**
- Client: React Hook Form resolvers (optional, for UX)
- Server: **Always** validate with Zod schemas in API routes
- Example: `src/lib/validation/*-schema.ts` (if exists, check for similar patterns)

**Image Handling**
- Client crops images using `react-image-crop`
- Client compresses to max 800px width
- Server validates file type with `file-type` package
- Server processes with `sharp` and stores in Vercel Blob
- Store URLs in database as JSON string arrays: `fileUrls` field

**Newsletter Analytics**
- No email addresses stored (GDPR-friendly)
- Fingerprints: SHA256 hash of request headers + IP
- Tracking pixel: `/api/newsletter/track/open/[token]/pixel.gif`
- Click tracking: `/api/newsletter/track/click` with redirect
- Models: `NewsletterAnalytics`, `NewsletterFingerprint`, `NewsletterLinkClick`

**Logging Conventions**
- **Server-side**: ALWAYS use `logger` from `@/lib/logger.ts` for all server-side logging (API routes, server components, utilities)
- **Client-side**: DO NOT use `console.log` except for temporary debugging (remove before committing)
- Logger provides structured logging with levels: `debug`, `info`, `warn`, `error`, `fatal`
- Logger supports context, tags, and module identification for better error tracking
- Example: `logger.error('Operation failed', { module: 'api', context: { userId: '123' }, tags: ['critical'] })`

**Language and Localization**
- **All user-facing text must be in German**: error messages, validation messages, success messages, UI labels, form placeholders
- Server-side logs and code comments can be in English for developer clarity
- Example: Use "Übermittlung fehlgeschlagen" not "Submission failed"

**Testing Policy**
- **This project does NOT use software tests**
- Do not create test files, test utilities, or testing infrastructure
- Do not suggest adding tests when implementing features

## Common Development Workflows

### Common Development Workflow
- Add or change code 
- Run "npn run check" to validate the added code
- Never not run "npm run build" nor "npm run db:push" to validate changes
- Changes will be validated by a human by hand

### Adding a New Submission Type

1. Add Prisma model in `prisma/schema.prisma`
2. Create Zod validation schema in `src/lib/validation/`
3. Create API route in `src/app/api/[entity]/route.ts`
4. Create public form page in `src/app/[entity]/page.tsx`
5. Create admin review page in `src/app/admin/[entity]/page.tsx`
6. Run `npm run db:push` to update database

### Modifying Newsletter Template

- Main template logic: `src/lib/newsletter/template-generator.ts`
- React Email template: `src/emails/newsletter.tsx`
- Preview changes: `npm run email` or `/admin/email-preview`
- Sending logic: `src/lib/newsletter/sending-coordinator.ts`

### Working with Database

- Schema changes: Edit `prisma/schema.prisma` → `npm run db:push`
- View data: `npm run db:studio`
- Database operations: Add/modify files in `src/lib/db/`
- Always use the singleton Prisma instance from `src/lib/db/prisma.ts`

## Notes for Development

- **Always validate user input** on the server with Zod, even if client validates
- **Image uploads**: Max 10MB, validated with `file-type` package server-side
- **Newsletter sending**: Uses batch processing with configurable delays to avoid rate limits
- **Rich text editing**: TipTap editor with link support, outputs HTML
- **Date handling**: Use `dayjs` and `date-fns-tz` for timezone-aware operations
- **Error logging**: Use `src/lib/logger.ts` with structured logging
- **Organize code into clearly separated modules**, grouped by feature or responsibility.
- **TypeScript**: NEVER use the `any` type. Always use specific types from `src/types/` (api-types.ts, component-types.ts, form-types.ts) or create proper interfaces. For Prisma models, use proper field types matching schema.prisma. While development make sure type safety is always ensured.
- **Comment non-obvious code** and ensure everything is understandable to a mid-level developer.
- **Write JSDoc comments for functions** using TypeScript conventions:
    ```typescript
      /**
         * Brief summary.
         *
         * @param param1 - Description of parameter
         * @returns Description of return value
         */
      function example(param1: string): string {
         // implementation
      }
