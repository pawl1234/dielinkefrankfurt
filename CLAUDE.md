# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js application for Die Linke Frankfurt that manages appointment submissions for their newsletter. The application allows users to submit event information through a rich form interface, while administrators can review, manage, and publish these submissions.

### Core Features

- Public appointment submission form with rich text editor
- File uploads for event attachments using Vercel Blob Storage
- Admin dashboard for reviewing and managing appointments
- Newsletter generation functionality
- RSS feed for approved appointments
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
  - `/admin`: Admin dashboard pages (protected)
  - `/neue-anfrage`: Public appointment submission form
  - `/termine`: Public appointment viewing pages
- `/src/components`: Reusable React components
  - `/newsletter`: Newsletter-specific components
- `/src/lib`: Utility functions and shared code
- `/src/theme`: MUI theme configuration
- `/prisma`: Database schema and migration tools
- `/public`: Static assets and images

### Key Components

- `AppointmentForm.tsx`: Main form for creating and editing appointments
- `FileUpload.tsx`: Component for handling file uploads
- `RichTextEditor.tsx`: Rich text editor using TipTap
- `NewsletterGenerator.tsx`: Component for generating newsletter content

### API Routes

- `/api/submit-appointment`: Handles new appointment submissions
- `/api/appointments`: Retrieves appointment data for public display
- `/api/admin/appointments`: Protected route for appointment management
- `/api/auth/[...nextauth]`: NextAuth.js authentication endpoints
- `/api/rss/appointments`: Generates RSS feed for approved appointments
- `/api/admin/newsletter/*`: Routes for newsletter management

### Data Model

The application uses two main database models:

1. **Appointment**:
   - Core fields: title, teaser, mainText, startDateTime, endDateTime
   - Location info: street, city, state, postalCode
   - Requester info: firstName, lastName
   - Status tracking: status, processed, featured, processingDate
   - File attachments: fileUrls (stored as JSON string)

2. **Newsletter**:
   - Configuration settings: headerLogo, headerBanner, footerText
   - Email settings: testEmailRecipients, unsubscribeLink

## Authentication

- NextAuth.js is used for admin authentication
- Protected routes are defined in `/src/middleware.ts`
- Authentication credentials are set via environment variables:
  - `ADMIN_USERNAME`
  - `ADMIN_PASSWORD`
  - `NEXTAUTH_SECRET`
  - `NEXTAUTH_URL`

## File Upload System

The application uses Vercel Blob Storage for file uploads:

- Files are stored with unique path names based on timestamp
- Files are uploaded via FormData in the API route
- The `FileUpload.tsx` component handles the upload UI and validation
- URLs are stored as a JSON string in the appointment record

## Styling

The application uses Material UI with a custom theme defined in `/src/theme/theme.ts`:

- Primary color: `#FF0000` (Die Linke brand red)
- Secondary color: `#006473` (Dark teal)
- Mostly square styling (no border radius) for buttons and components
- Responsive layouts for all screen sizes

## Testing

The project uses Jest and React Testing Library:

- Test files are located in `/src/tests/`
- Some components have dedicated test files (e.g., `AppointmentForm.test.tsx`)
- Mock setups for forms, file uploads, and API interactions are available

## Environment Variables

Required environment variables:

- `DATABASE_URL`: PostgreSQL connection string
- `NEXTAUTH_SECRET`: Secret for NextAuth authentication
- `NEXTAUTH_URL`: Base URL of the application
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
- **Authentication problems**: Verify NEXTAUTH_SECRET and NEXTAUTH_URL are set

## Documentation

Additional documentation files:
- `VERCEL_DEPLOYMENT.md`: Details on deployment to Vercel
- `VERCEL_BLOB_STORAGE.md`: Information about the file storage system
- `STYLING.md`: Styling guidelines and theme details
- `NEWSLETTER_TESTING.md`: Guide to testing newsletter emails