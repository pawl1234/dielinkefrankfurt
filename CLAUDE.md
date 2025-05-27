# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js application for Die Linke Frankfurt that manages appointment submissions, groups/organizations, and status reports for their newsletter. The application allows users to submit event information and group status reports through rich form interfaces, while administrators can review, manage, and publish these submissions.

### Core Features

- Public appointment submission form with rich text editor
- Public group request form for organizations
- Public status report submission form for active groups
- File uploads for event attachments and group documents using Vercel Blob Storage
- Admin dashboard for reviewing and managing appointments, groups, and status reports
- Newsletter generation functionality that includes appointments and status reports
- RSS feed for approved appointments
- Email notifications for status changes
- PostgreSQL database with Prisma ORM

## Tech Stack

- **Frontend**: Next.js 15 with App Router, React 18, TypeScript
- **UI Components**: Material UI (MUI) v7
- **Form Handling**: React Hook Form
- **Rich Text Editing**: TipTap
- **File Upload**: Uppy components
- **Database**: PostgreSQL via Prisma ORM
- **File Storage**: Vercel Blob Storage
- **Authentication**: NextAuth.js
- **Email**: Nodemailer

## Development Commands

### Basic Commands

```bash
# Start development server with Turbopack
npm run dev

# Build for production (with database migration)
npm run build

# Build without linting (for local testing)
npm run build:local

# Start production server
npm run start

# Run linting
npm run lint:check
npm run lint:fix

# Run type checking
npm run typecheck
```

### Testing

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

### Database Commands

```bash
# Reset database
npm run db:reset

# Push schema changes to database
npm run db:push

# Open Prisma Studio to view/edit data
npm run db:studio

# Reset migrations
npm run db:migrate

# Generate Prisma client
npm run db:generate

# Validate Prisma schema
npm run db:validate

# Start local PostgreSQL database using Docker
npm run db:start

# Stop the database container
npm run db:stop
```

### Local Infrastructure

```bash
# Start local Vercel Blob Storage server
npm run blob:start

# Stop the blob storage server
npm run blob:stop

# Start local mail server for testing emails
npm run mail:dev
```

## Project Architecture

### Directory Structure

- `/src/app`: Next.js App Router pages and API routes
  - `/api`: Backend API endpoints
  - `/api/admin`: Backend API endpoints which need to be protected from the public
  - `/admin`: Admin dashboard pages (protected)
  - `/neue-anfrage`: Public appointment submission form
  - `/neue-gruppe`: Public group request form
  - `/gruppen-bericht`: Public status report submission form
  - `/termine`: Public appointment viewing pages
  - `/gruppen`: Public group listing and viewing pages
- `/src/components`: Reusable React components
  - `/admin`: Admin interface components
  - `/newsletter`: Newsletter-specific components
- `/src/lib`: Utility functions and shared code
- `/src/theme`: MUI theme configuration
- `/prisma`: Database schema and migration tools
- `/public`: Static assets and images

### Key Components

- `AppointmentForm.tsx`: Main form for creating and editing appointments
- `GroupRequestForm.tsx`: Form for submitting new group requests
- `StatusReportForm.tsx`: Form for submitting group status reports
- `GroupLogoUpload.tsx`: Component for handling group logo uploads with cropping
- `FileUpload.tsx`: Component for handling file uploads
- `RichTextEditor.tsx`: Rich text editor using TipTap
- `NewsletterGenerator.tsx`: Component for generating newsletter content
- `EditGroupForm.tsx`: Admin component for editing group details
- `EditStatusReportForm.tsx`: Admin component for editing status reports

### API Routes

- `/api/submit-appointment`: Handles new appointment submissions
- `/api/appointments`: Retrieves appointment data for public display
- `/api/admin/appointments`: Protected route for appointment management
- `/api/groups/submit`: Handles new group requests
- `/api/groups`: Retrieves active groups for public display
- `/api/groups/[slug]`: Retrieves specific group details
- `/api/groups/[slug]/status-reports`: Retrieves status reports for a specific group
- `/api/status-reports/submit`: Handles new status report submissions
- `/api/admin/groups/*`: Protected routes for group management
- `/api/admin/status-reports/*`: Protected routes for status report management
- `/api/auth/[...nextauth]`: NextAuth.js authentication endpoints
- `/api/rss/appointments`: Generates RSS feed for approved appointments
- `/api/admin/newsletter/*`: Routes for newsletter management

### Data Model

The application uses several main database models:

1. **Appointment**:
   - Core fields: title, mainText, startDateTime, endDateTime
   - Location info: street, city, state, postalCode
   - Requester info: firstName, lastName
   - Status tracking: status, processed, featured, processingDate
   - File attachments: fileUrls (stored as JSON string)

2. **Group**:
   - Core fields: name, slug, description, logoUrl
   - Status tracking: status (NEW, ACTIVE, ARCHIVED)
   - Timestamps: createdAt, updatedAt
   - Relations: responsiblePersons, statusReports

3. **ResponsiblePerson**:
   - Core fields: firstName, lastName, email
   - Relation: group (many-to-one)

4. **StatusReport**:
   - Core fields: title, content, reporterFirstName, reporterLastName
   - File attachments: fileUrls (stored as JSON string)
   - Status tracking: status (NEW, ACTIVE, ARCHIVED)
   - Timestamps: createdAt, updatedAt
   - Relation: group (many-to-one)

5. **Newsletter**:
   - Configuration settings: headerLogo, headerBanner, footerText
   - Email settings: testEmailRecipients, unsubscribeLink

## Authentication

- NextAuth.js is used for admin authentication
- Protected routes are defined in `/src/middleware.ts`
- Authentication credentials are set via environment variables:
  - `ADMIN_USERNAME`
  - `ADMIN_PASSWORD`
  - `NEXTAUTH_SECRET`
  - `VERCEL_PROJECT_PRODUCTION_URL`

## File Upload System

The application uses Vercel Blob Storage for file uploads:

- Files are stored with unique path names based on timestamp
- Files are uploaded via FormData in the API route
- The `FileUpload.tsx` component handles the upload UI and validation
- URLs are stored as a JSON string in the appropriate record
- Group logos are stored with both original and cropped versions
- Status report attachments support multiple file uploads with validation

## Email Notification System

The application sends email notifications for various status changes:

- Group acceptance notifications to responsible persons
- Group archiving notifications to responsible persons
- Status report acceptance notifications to group responsible persons
- Email templates are defined for each notification type
- Uses Nodemailer for sending emails

## Newsletter Integration

The newsletter generator includes:
- Approved appointments with featured items first
- Recent status reports (last 2 weeks) grouped by organization
- Each group shows its logo and name in the newsletter
- Reports show title, truncated content, date, and link to full report

## Styling

The application uses Material UI with a custom theme defined in `/src/theme/theme.ts`:

- Primary color: `#FF0000` (Die Linke brand red)
- Secondary color: `#006473` (Dark teal)
- Mostly square styling (no border radius) for buttons and components
- Responsive layouts for all screen sizes

## Testing

The project uses Jest and React Testing Library:

- Test files are located in `/src/tests/`
- Component tests for forms, uploads, and interactions
- API route tests for backend functionality
- End-to-end tests for complete workflows
- Mock setups for forms, file uploads, and API interactions

## Environment Variables

Required environment variables:

- `DATABASE_URL`: PostgreSQL connection string
- `NEXTAUTH_SECRET`: Secret for NextAuth authentication
- `VERCEL_PROJECT_PRODUCTION_URL`: Base URL of the application
- `ADMIN_USERNAME`: Admin login username
- `ADMIN_PASSWORD`: Admin login password
- `BLOB_READ_WRITE_TOKEN`: Token for Vercel Blob Storage

Optional:
- `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`: For Google reCAPTCHA
- `EMAIL_SERVER_*`: Email server configuration

## Common Issues and Solutions

- **Build failures**: Check for TypeScript errors with `npm run typecheck`
- **Database connection issues**: Verify DATABASE_URL is correct
- **File upload failures**: Check BLOB_READ_WRITE_TOKEN is set correctly
- **Authentication problems**: Verify NEXTAUTH_SECRET and VERCEL_PROJECT_PRODUCTION_URL are set
- **MUI v7 Grid usage**: Material UI v7 uses a new Grid system this code is wrong: `<Grid item xs={{12}}>` use the new correct way instead: `<Grid size={{ xs: 12, md: 6 }}>`.
- **Date handling**: When working with date fields, be aware that the Prisma client uses JavaScript `Date` objects for datetime fields, but our interface definitions sometimes expect `string`. In components, use `Date | string` as the type for date fields.
- **Form validation**: Forms should only show validation errors after submission. Use a `formSubmitted` state variable to conditionally display error messages. For component reuse, validation controls can accept a `showValidationErrors` prop.
- **TypeScript**: While development make sure type safety is always ensured. 

## Documentation

All documentation has been organized into the `/docs` directory:

- `/docs/README.md`: General application features and purpose
- `/docs/api/README.md`: Technical API documentation
- `/docs/development/`: Development guides
  - `vercel-deployment.md`: Details on deployment to Vercel
  - `vercel-blob-storage.md`: Information about the file storage system
  - `newsletter-testing.md`: Guide to testing newsletter emails
- `/docs/styling/`: Styling guidelines
  - `README.md`: Main styling guidelines
  - `style-docs.md`: Detailed styling documentation
- `/docs/features/`: Feature planning and documentation

**Important Note**: Documentation should be revisited and updated whenever changes are made to the application. Keeping documentation in sync with code changes is critical for maintainability.