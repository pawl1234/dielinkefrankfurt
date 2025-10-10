# Research: Public Groups Overview Page with Contact Modal

**Feature**: Public Groups Overview Page with Contact Modal
**Date**: 2025-10-09
**Status**: Complete

## Research Questions

### 1. UI Pattern for Groups Display

**Question**: How should groups be displayed in an accordion format matching the existing application style?

**Decision**: Use Material UI Accordion component with alphabetical sorting

**Rationale**:
- Existing application uses Material UI 7 components consistently
- Accordion component provides collapse/expand functionality out of the box
- Matches user's request for "accordion per group"
- Alphabetical sorting is straightforward with JavaScript `.sort()` on group name
- Similar pattern exists in `/gruppen/page.tsx` using cards, but accordion provides better information density

**Alternatives considered**:
- Card-based grid layout (current `/gruppen/page.tsx` pattern) - Rejected: User explicitly requested accordion
- List with expand buttons - Rejected: Less intuitive than native accordion UI

**Implementation notes**:
- Use `Accordion`, `AccordionSummary`, `AccordionDetails` from `@mui/material`
- Sort groups by name before rendering: `groups.sort((a, b) => a.name.localeCompare(b.name))`
- Display group logo within `AccordionDetails` if exists
- Show placeholder icon if no logo (similar to existing pattern with `GroupIcon`)

---

### 2. Database Schema Extension for Regular Meetings

**Question**: How should regular meeting schedule and location be stored in the Group model?

**Decision**: Add optional `regularMeeting` (free text) and location fields (`meetingStreet`, `meetingCity`, `meetingPostalCode`, `meetingLocationDetails`) to Group model

**Rationale**:
- Regular meeting text is complex and varied ("Jeden 3. Dienstag im Monat", "Jede zweite Woche Montag")
- Free text provides maximum flexibility without complex date parsing
- Location fields reuse existing address pattern from Appointment model and AddressSection component
- Optional fields support groups without regular meetings
- Location can be optional even when regular meeting exists (virtual meetings, TBD locations)

**Alternatives considered**:
- Structured date/time fields (day of week, frequency enum) - Rejected: Too rigid for German meeting descriptions
- Single JSON field for meeting data - Rejected: Less type-safe, harder to query
- Separate MeetingSchedule model - Rejected: Over-engineering for simple optional data

**Implementation notes**:
- Add Prisma model fields:
  ```prisma
  regularMeeting        String?
  meetingStreet         String?
  meetingCity           String?
  meetingPostalCode     String?
  meetingLocationDetails String?
  ```
- Update both public proposal form (`/neue-gruppe`) and admin edit form
- Reuse `PublicAddress` interface pattern from existing codebase
- Use `AddressSection` component for location input (optional variant)

---

### 3. Contact Modal Implementation

**Question**: What UI components and validation should be used for the contact modal?

**Decision**: Material UI Dialog with React Hook Form and Zod validation

**Rationale**:
- Consistent with existing form patterns in the application
- Dialog component provides modal functionality with backdrop, close handlers, and responsive design
- React Hook Form used throughout the application (see constitution)
- Zod validation required by constitution for server-side validation
- Form fields: name (text), email (text with email validation), message (multiline text)

**Alternatives considered**:
- Custom modal component - Rejected: Unnecessary duplication, MUI Dialog sufficient
- No client-side validation - Rejected: Poor UX, validation catches errors before submission

**Implementation notes**:
- Create `GroupContactModal` component accepting group data as prop
- Fields: `requesterName`, `requesterEmail`, `message`
- Validation: Zod schema with email format validation, max lengths, required fields
- Success: Show success message, auto-close after 2 seconds
- Error: Show error message, stay open (user can retry by resubmitting)
- German labels: "Name", "E-Mail-Adresse", "Nachricht", "Senden", "Abbrechen"

---

### 4. Email Sending Without Database Storage

**Question**: How should contact requests be sent via email without database persistence?

**Decision**: Direct email sending via existing `sendEmail` utility, To field with responsible persons, CC field with configurable office email

**Rationale**:
- Privacy requirement: No database storage of contact requests
- Existing email infrastructure (`src/lib/email/mailer.ts`, `src/lib/email/senders.ts`) proven and reliable
- React Email templates provide consistent styling
- CC to office ensures backup if no responsible persons exist
- Reply-to set to requester's email enables direct responses

**Alternatives considered**:
- Database logging with scheduled deletion - Rejected: Violates privacy requirement
- Queue-based sending - Rejected: Over-engineering for single email sends
- Third-party email service - Rejected: Existing Nodemailer infrastructure sufficient

**Implementation notes**:
- Create new email template `group-contact-request.tsx` in `src/emails/notifications/`
- Follow existing notification email pattern (see `group-acceptance.tsx`)
- API route `/api/groups/[slug]/contact` handles form submission
- Zod validation on server side (required by constitution)
- Email fields:
  - To: responsible persons emails (comma-separated)
  - CC: office email from group settings
  - Reply-To: requester email
  - Subject: "Kontaktanfrage für Gruppe: {group.name}"
  - Body: Include requester name, email, message, group name
- Log email sending failures with structured logging

---

### 5. Office Email Configuration

**Question**: Where and how should the office CC email address be configurable?

**Decision**: Create new GroupSettings singleton model, manage via settings dialog in groups admin page

**Rationale**:
- Separates group-related settings from newsletter configuration
- Groups admin page is the natural location for group contact settings
- Singleton model pattern (ID=1) provides simple global configuration
- Settings dialog avoids creating separate settings page
- Centralized configuration accessible from all API routes via `getGroupSettings()`
- Similar pattern to other admin settings dialogs in the application

**Alternatives considered**:
- Newsletter model extension - Rejected: Wrong domain, groups ≠ newsletter
- Environment variable - Rejected: Less flexible, requires deployment for changes
- Separate admin settings page - Rejected: Over-engineering for single field
- Hardcoded email - Rejected: Not maintainable

**Implementation notes**:
- Create Prisma GroupSettings model: `officeContactEmail String?`
- Singleton pattern: Always use ID=1, create on first access
- Create `GroupSettingsDialog` component (Material UI Dialog)
- Add settings icon button to groups admin page header/toolbar
- Access via `getGroupSettings()` in contact API route
- Default fallback to `process.env.CONTACT_EMAIL` if not configured
- German label: "Office-E-Mail (CC für Gruppenanfragen)"
- Form validation: Email format, max 200 characters

---

### 6. Form Integration for Regular Meeting Fields

**Question**: How should regular meeting fields be added to existing forms?

**Decision**: Add optional section to both `/neue-gruppe` form and admin group edit form using conditional rendering

**Rationale**:
- Both forms need meeting fields to support new and existing groups
- Conditional rendering shows location fields only when regular meeting is defined (optional within optional)
- Reuse `AddressSection` component for consistency
- Optional fields don't require changes to validation schemas (only validate if provided)

**Alternatives considered**:
- Separate "add meeting" form - Rejected: Extra complexity, poor UX
- Meeting fields in separate admin page - Rejected: Fragmented editing experience
- Only in admin form - Rejected: Public proposers can't specify meeting info

**Implementation notes**:
- Add regular meeting text field first (TextField with multiline, optional)
- Show AddressSection below if meeting text is entered (watch form value)
- Admin form: Include in existing group update flow
- Public form: Include in group creation flow
- Field labels in German:
  - "Regelmäßiges Treffen (optional)"
  - "Treffpunkt (optional)"
- Placeholder examples: "z.B. Jeden 3. Dienstag im Monat, 19:00 Uhr"

---

### 7. Navigation and Page Routing

**Question**: What should the route be for the new groups overview page?

**Decision**: Create new route `/gruppen-uebersicht` for accordion view, keep existing `/gruppen` for card grid

**Rationale**:
- Existing `/gruppen/page.tsx` uses card grid layout with excerpts
- New page has different purpose: detailed accordion view with contact functionality
- Both pages serve different use cases (overview vs. detailed browsing)
- User requested "new public page" suggesting separate page, not replacement
- Avoids breaking existing page and any links to it

**Alternatives considered**:
- Replace `/gruppen` entirely - Rejected: May break existing functionality, user said "new page"
- Toggle view on same route - Rejected: More complex, adds state management
- `/gruppen/liste` - Rejected: "liste" doesn't convey accordion nature

**Implementation notes**:
- Create `src/app/gruppen-uebersicht/page.tsx`
- Use MainLayout with breadcrumbs: Start > Arbeitsgruppen Übersicht
- Reuse HomePageHeader pattern for consistent styling
- Fetch groups via existing `/api/groups` endpoint
- Add navigation link from existing `/gruppen` page

---

## Technology Stack Confirmation

### Frontend
- **Framework**: Next.js 15.4 with App Router
- **UI Library**: Material UI 7.3
- **Forms**: React Hook Form 7.62 with Zod 4.0.17 validation
- **State**: React useState for local component state
- **Styling**: Emotion (MUI's CSS-in-JS solution)

### Backend
- **Database**: PostgreSQL via Prisma 6.13
  - Singleton pattern for global settings (GroupSettings with ID=1)
- **Email**: Nodemailer 6.10 with React Email 4.2.8 templates
- **Validation**: Zod schemas server-side
- **Logging**: Custom logger utility (`@/lib/logger.ts`)

### Patterns Identified
- **Form Submission**: `submitForm()` utility from `@/lib/form-submission/submit-form.ts`
- **Email Sending**: `sendEmail()` from `@/lib/email/mailer.ts`, templates in `src/emails/notifications/`
- **Database Operations**: Separated in `src/lib/db/*-operations.ts` files
- **Type Definitions**: Centralized in `src/types/` (reuse `PublicAddress` interface)
- **API Routes**: Next.js App Router API routes in `src/app/api/`

---

## Performance Considerations

### Query Optimization
- Groups list query already optimized (see `findPublicGroups` in `group-operations.ts`)
- Include responsible persons in single query to avoid N+1 problem
- Sort alphabetically on database side: `orderBy: { name: 'asc' }`

### Client-Side Performance
- Accordion component renders only visible content (collapsed items use minimal DOM)
- No pagination needed for ~10-20 groups
- Email validation happens on input blur (debounced)

### Email Sending
- Contact emails sent synchronously (single recipient group)
- No rate limiting needed (user-initiated, not bulk)
- Timeout configured in SMTP settings (already exists)

---

## Security Considerations

### Input Validation
- All form inputs validated with Zod schemas server-side (required by constitution)
- Email address format validation prevents malformed emails
- Message length limits prevent abuse
- Sanitization handled by React Email template rendering

### Privacy
- Contact requests NOT stored in database per requirement
- Email addresses only in To/CC/Reply-To fields
- No tracking or analytics for contact modal
- Logging only includes group ID and success/failure, not personal data

### CSRF Protection
- Next.js built-in CSRF protection for API routes
- Form submissions use POST method with fetch

---

## Dependencies Check

All required dependencies already present in package.json:
- ✅ Material UI 7.3 (`@mui/material`, `@mui/icons-material`)
- ✅ React Hook Form 7.62
- ✅ Zod 4.0.17
- ✅ Prisma 6.13
- ✅ Nodemailer 6.10
- ✅ React Email 4.2.8

No new dependencies required.

---

## Edge Cases Addressed

1. **Group with no logo**: Show placeholder GroupIcon (existing pattern)
2. **Group with no regular meeting**: Don't show meeting section in accordion
3. **Regular meeting without location**: Show meeting text only, omit location details
4. **Group with no responsible persons**: Send email to office CC only (logged as edge case)
5. **Email sending failure**: Show user error, log failure, close modal without retry
6. **Invalid email address**: Caught by Zod validation before submission
7. **No active groups**: Show empty state message in German
8. **Long group descriptions**: Accordion expands to show full content (no truncation needed)

---

## Compliance with Constitution

### Type Safety First
- All types from `src/types/` (reuse PublicAddress)
- No `any` types
- Prisma-generated types for database models

### KISS Principle
- Simple accordion component
- Direct email sending
- No complex state management

### DRY Principle
- Reuse AddressSection component
- Reuse PublicAddress interface
- Reuse email infrastructure
- Reuse submitForm utility

### German User-Facing Text
- All labels, buttons, validation messages in German
- Examples provided for meeting schedule field

### Server Validation
- Zod schemas for all API inputs
- Contact form validated server-side

### File Size Limit
- Multiple focused components
- Each file under 500 lines

### Domain Architecture
- Groups domain extended
- Email infrastructure reused
- Database operations in `lib/db/group-operations.ts`

---

## Summary

Research complete. All technical unknowns resolved. Implementation can proceed using:
- Material UI Accordion for groups display
- Prisma schema extension with optional meeting fields
- Material UI Dialog with React Hook Form for contact modal
- Existing email infrastructure with new notification template
- Newsletter settings for office email configuration
- New route `/gruppen-uebersicht` for accordion view

No blocking issues identified. All patterns follow existing codebase conventions and constitutional requirements.
