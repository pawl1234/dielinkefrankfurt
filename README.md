# Newsletter Management System - Die Linke Frankfurt

A comprehensive newsletter management system for **Die Linke Frankfurt** Kreisverband (KV), designed to streamline the weekly newsletter workflow by enabling anonymous submissions and administrative review of appointments, group activities, and status reports.

## What is this?

This application solves a common problem for local party organizations: collecting, reviewing, and distributing information for weekly newsletters. Instead of manually collecting content via email or phone, this system provides:

1. **Public Submission Forms** - Anonymous contributors can submit:
   - Appointments/Events (Termine) - Political events, meetings, demonstrations
   - Group Proposals (Gruppen) - New working groups or initiatives wanting to be listed
   - Status Reports (Statusberichte) - Activity updates from existing groups
   - Board Requests (Anträge) - Formal requests to the Kreisvorstand

2. **Admin Dashboard** - Administrators can:
   - Review, edit, accept, or reject all submissions
   - Compose weekly newsletters with approved content
   - Send newsletters to subscriber lists
   - Track newsletter analytics (opens, clicks)
   - Manage groups and their responsible persons
   - Archive old content

3. **Automated Workflow** - The system handles:
   - Content validation and sanitization
   - Image processing and storage
   - Email delivery with batch processing
   - Privacy-friendly analytics tracking
   - Content archiving

## Who is this for?

This system is designed for the newsletter coordinators of **Die Linke Frankfurt Kreisverband** and potentially other local party organizations (KVs) who need to:
- Collect content from multiple contributors
- Review and edit submissions before publishing
- Send regular newsletters to members
- Track engagement with newsletter content

## Technologies Used

- **Frontend**: Next.js 15 with App Router, React 18, TypeScript
- **UI Components**: Material UI (MUI) v7
- **Form Handling**: React Hook Form with validation on the front end
- **Backend Validation**: zod Schema for input validation on the backend
- **Rich Text Editing**: TipTap editor
- **Database**: PostgreSQL via Prisma ORM
- **File Storage**: Vercel Blob Storage
- **Authentication**: NextAuth.js
- **Email**: Nodemailer with batch sending
- **AI Integration**: Anthropic Claude for newsletter introduction generation

## Quick Start for Developers

### Prerequisites

- Node.js 18+ and npm
- Docker (for PostgreSQL and Blob Storage)
- Git

### 1. Clone and Install

```bash
git clone <repository-url>
cd dielinkefrankfurt
npm install
```

### 2. Set Up Local Services

Start PostgreSQL database:
```bash
docker run -d \
  --name postgres \
  -e POSTGRES_USER=devuser \
  -e POSTGRES_PASSWORD=devpassword \
  -e POSTGRES_DB=mydatabase \
  -p 5432:5432 \
  postgres:15
```

Start Vercel Blob Server (local file storage):
```bash
docker run -d \
  --name vercel-blob-server \
  -p 9966:9966 \
  -e VERCEL_BLOB_RW_TOKEN=vercel_blob_rw_somefakeid_nonce \
  vercel/blob-server:latest
```

### 3. Configure Environment Variables

Create `.env` file in the project root:

```bash
# Database
DATABASE_URL="postgresql://devuser:devpassword@localhost:5432/mydatabase"

# Authentication
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET="your-random-secret-here"  # Generate with: openssl rand -base64 32

# Admin credentials (default login)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=password123

# File Storage (Vercel Blob)
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_somefakeid_nonce
VERCEL_BLOB_API_URL=http://localhost:9966

# Email (MailDev for local testing)
EMAIL_SERVER_HOST=localhost
EMAIL_SERVER_PORT=1025
EMAIL_SERVER_USER=""
EMAIL_SERVER_PASSWORD=""
EMAIL_FROM="newsletter@die-linke-frankfurt.de"
TEST_EMAIL_RECIPIENT="your-test-email@example.com"

# Optional: AI Integration for newsletter intro generation
# ANTHROPIC_API_KEY="your-anthropic-api-key"
```

### 4. Initialize Database

Push the database schema:
```bash
npm run db:push
```

### 5. Start Development Server

```bash
npm run dev
```

The application will be available at http://localhost:3000

### 6. Optional: Email Testing

To test email sending locally, install and run MailDev:

```bash
npm run mail:start
```

Then open http://localhost:1080 to view sent emails in the MailDev web interface.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Check code quality
- `npm run typecheck` - Check TypeScript types
- `npm run check` - Run both lint and typecheck
- `npm run db:push` - Push schema changes to database
- `npm run db:studio` - Open Prisma Studio (database GUI)
- `npm run db:start` - Start PostgreSQL container
- `npm run db:stop` - Stop PostgreSQL container
- `npm run blob:start` - Start Blob storage container
- `npm run blob:stop` - Stop Blob storage container
- `npm run mail:start` - Start MailDev for email testing

## Admin Access

Default login credentials (configure in `.env.local`):
- **URL**: http://localhost:3000/admin/login
- **Username**: admin (from ADMIN_USERNAME)
- **Password**: password123 (from ADMIN_PASSWORD)

⚠️ **Important**: Change these credentials before deploying to production!
