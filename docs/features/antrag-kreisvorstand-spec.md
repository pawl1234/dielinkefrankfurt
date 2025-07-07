# Antrag an Kreisvorstand - Feature Specification

## Table of Contents
1. [Overview](#overview)
2. [Database Schema](#database-schema)
3. [API Specification](#api-specification)
4. [Frontend Implementation](#frontend-implementation)
5. [Email Notifications](#email-notifications)
6. [Admin Interface](#admin-interface)
7. [Error Handling](#error-handling)
8. [Security Considerations](#security-considerations)
9. [Testing Plan](#testing-plan)
10. [Implementation Checklist](#implementation-checklist)

## Overview

The "Antrag an Kreisvorstand" feature allows users to submit formal requests to the board (Kreisvorstand) of Die Linke Frankfurt. Users can request financial assistance, personnel support, room bookings, or other types of support through a comprehensive form. All submissions are stored in the database, sent via email to configured recipients, and managed through an admin interface.

### Key Features
- Public submission form with multiple purpose types (non-exclusive)
- File attachments (up to 5 files) stored in Vercel Blob Storage
- Email notifications with attachments sent to Kreisvorstand
- Admin interface for reviewing, accepting, or rejecting requests
- Decision notifications sent to requesters
- Configurable email recipients

## Database Schema

### 1. Add Enums and Models to `prisma/schema.prisma`

```prisma
// Enum for Antrag status
enum AntragStatus {
  NEU        // New submission
  AKZEPTIERT // Accepted
  ABGELEHNT  // Rejected
}

// Antrag model for board requests
model Antrag {
  id                String       @id @default(cuid())
  
  // User Information
  firstName         String       @db.VarChar(50)
  lastName          String       @db.VarChar(50)
  email            String
  
  // Antrag Details
  title            String       @db.VarChar(200)
  summary          String       @db.VarChar(300)
  
  // Purpose Details (JSON structure for flexibility)
  purposes         String       @db.Text // JSON array of selected purposes with details
  
  // File Attachments
  fileUrls         String?      // JSON string array of file URLs
  
  // Status and Decision
  status           AntragStatus @default(NEU)
  decisionComment  String?      @db.Text
  decidedBy        String?      // Username of admin who made decision
  decidedAt        DateTime?
  
  // System fields
  createdAt        DateTime     @default(now())
  updatedAt        DateTime     @updatedAt
  
  @@index([status])
  @@index([createdAt])
  @@map("antrag")
}

// Configuration for Antrag email recipients
model AntragConfiguration {
  id                 Int      @id @default(autoincrement())
  recipientEmails    String   // Comma-separated email addresses
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
  
  @@map("antrag_configuration")
}
```

### 2. Purpose Data Structure

The `purposes` field stores a JSON object with this TypeScript interface:

```typescript
// src/types/api-types.ts
export interface AntragPurposes {
  zuschuss?: {
    enabled: boolean;
    amount: number; // Amount in euros
  };
  personelleUnterstuetzung?: {
    enabled: boolean;
    details: string; // Free text describing personnel needs
  };
  raumbuchung?: {
    enabled: boolean;
    location: string;
    numberOfPeople: number;
    details: string; // Additional details like time, duration, special requirements
  };
  weiteres?: {
    enabled: boolean;
    details: string; // Free text for other requirements
  };
}

export interface AntragFormData {
  firstName: string;
  lastName: string;
  email: string;
  title: string;
  summary: string;
  purposes: AntragPurposes;
  files?: File[];
}

export interface AntragWithId extends Omit<AntragFormData, 'files'> {
  id: string;
  status: 'NEU' | 'AKZEPTIERT' | 'ABGELEHNT';
  fileUrls?: string[];
  createdAt: Date;
  decisionComment?: string;
  decidedBy?: string;
  decidedAt?: Date;
}
```

## API Specification

### Public Endpoints

#### POST `/api/antraege/submit`
Creates a new Antrag submission.

**Request Body:**
```typescript
{
  firstName: string;
  lastName: string;
  email: string;
  title: string;
  summary: string;
  purposes: AntragPurposes;
  recaptchaToken?: string; // If reCAPTCHA is enabled
}
```

**Files:** Sent as `multipart/form-data` with up to 5 file attachments

**Response:**
```typescript
// Success (201)
{
  success: true;
  message: "Ihr Antrag wurde erfolgreich eingereicht";
  id: string;
}

// Error (400/500)
{
  success: false;
  error: string;
}
```

**Implementation Details:**
1. Validate all required fields
2. Verify reCAPTCHA token if enabled
3. Upload files to Vercel Blob Storage
4. Create database record
5. Send email notification to Kreisvorstand
6. Return success response

### Protected Admin Endpoints

All admin endpoints require authentication via NextAuth.

#### GET `/api/admin/antraege`
Lists all Anträge with optional filtering.

**Query Parameters:**
- `status`: Filter by status (NEU, AKZEPTIERT, ABGELEHNT)
- `search`: Search in title, summary, or requester name
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

**Response:**
```typescript
{
  antraege: AntragWithId[];
  total: number;
  page: number;
  totalPages: number;
}
```

#### GET `/api/admin/antraege/[id]`
Gets a single Antrag with full details.

**Response:** `AntragWithId` object or 404 error

#### PUT `/api/admin/antraege/[id]`
Updates an Antrag (edit functionality).

**Request Body:** Partial `AntragFormData` (only fields to update)

**Response:** Updated `AntragWithId` object

#### PUT `/api/admin/antraege/[id]/accept`
Accepts an Antrag with optional comment.

**Request Body:**
```typescript
{
  comment?: string;
}
```

**Response:**
```typescript
{
  success: true;
  antrag: AntragWithId;
}
```

**Side Effects:**
- Updates status to AKZEPTIERT
- Sets decisionComment, decidedBy, decidedAt
- Sends acceptance email to requester

#### PUT `/api/admin/antraege/[id]/reject`
Rejects an Antrag with optional comment.

**Request Body:**
```typescript
{
  comment?: string;
}
```

**Response:** Same as accept endpoint

**Side Effects:**
- Updates status to ABGELEHNT
- Sets decisionComment, decidedBy, decidedAt
- Sends rejection email to requester

#### DELETE `/api/admin/antraege/[id]`
Deletes an Antrag and its associated files.

**Response:**
```typescript
{
  success: true;
  message: "Antrag erfolgreich gelöscht";
}
```

**Side Effects:**
- Deletes files from Blob Storage
- Removes database record

#### GET `/api/admin/antraege/configuration`
Gets email recipient configuration.

**Response:**
```typescript
{
  recipientEmails: string; // Comma-separated emails
}
```

#### PUT `/api/admin/antraege/configuration`
Updates email recipient configuration.

**Request Body:**
```typescript
{
  recipientEmails: string; // Comma-separated emails
}
```

## Frontend Implementation

### 1. Public Form Page

**Route:** `/antrag-an-kreisvorstand`

**File:** `src/app/antrag-an-kreisvorstand/page.tsx`
```typescript
'use client';

import AntragForm from '@/components/forms/antraege/AntragForm';
import FormPageLayout from '@/components/forms/shared/FormPageLayout';

export default function AntragAnKreisvorstandPage() {
  return (
    <FormPageLayout
      title="Antrag an Kreisvorstand"
      subtitle="Online-Formular zur Einreichung von Anträgen an den Kreisvorstand"
      introText="Mit diesem Formular können Sie Anträge für finanzielle Unterstützung, personelle Hilfe, Raumbuchungen oder andere Anliegen an den Kreisvorstand stellen."
      breadcrumbs={[
        { label: 'Start', href: '/' },
        { label: 'Antrag an Kreisvorstand', href: '/antrag-an-kreisvorstand', active: true },
      ]}
    >
      <AntragForm />
    </FormPageLayout>
  );
}
```

### 2. Form Component Structure

**File:** `src/components/forms/antraege/AntragForm.tsx`

Key Features:
- Use React Hook Form for form management
- Four checkbox-controlled sections for purposes
- File upload with `FileUpload` component
- Validation only shown after form submission
- Loading states during submission
- Success message with clear user feedback

**Form Sections:**
1. **User Information**
   - First Name* (required)
   - Last Name* (required)
   - Email* (required, email validation)

2. **Antrag Details**
   - Title* (required, max 200 chars)
   - Summary* (required, max 300 chars, textarea with character counter)

3. **Purpose Selection** (checkboxes with conditional fields)
   - ☐ Zuschuss (Financial Support)
     - Amount field (number, required if checked, min: 1, max: 999999)
   - ☐ Personelle Unterstützung (Personnel Support)
     - Details field (textarea, required if checked)
   - ☐ Raumbuchung (Room Booking)
     - Location field (text, required if checked)
     - Number of People field (number, required if checked, min: 1)
     - Additional Details field (textarea, required if checked)
   - ☐ Weiteres (Other)
     - Details field (textarea, required if checked)

4. **File Attachments**
   - Upload up to 5 files
   - Accepted types: images (jpg, png, gif), PDFs, Word docs, Excel files
   - Max file size: 10MB per file

### 3. Component Dependencies

Reuse existing components:
- `FormPageLayout` - Page wrapper with breadcrumbs
- `FileUpload` - File upload functionality
- Material UI components following existing patterns
- Form validation helpers

## Email Notifications

### 1. Submission Notification to Kreisvorstand

**Function:** `sendAntragSubmissionEmail` in `src/lib/email-notifications.ts`

**Email Details:**
- **To:** Configured recipient emails (from AntragConfiguration)
- **Subject:** `Neuer Antrag an Kreisvorstand: [Title]`
- **Attachments:** All uploaded files as email attachments

**HTML Template Structure:**
```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2>Neuer Antrag an Kreisvorstand</h2>
  
  <h3>Antragsteller</h3>
  <table>
    <tr><td><strong>Name:</strong></td><td>[firstName] [lastName]</td></tr>
    <tr><td><strong>E-Mail:</strong></td><td>[email]</td></tr>
  </table>
  
  <h3>Antragsdetails</h3>
  <p><strong>Titel:</strong> [title]</p>
  <p><strong>Zusammenfassung:</strong> [summary]</p>
  
  <h3>Beantragte Unterstützung</h3>
  <!-- Dynamic sections based on selected purposes -->
  
  <p><strong>Eingereicht am:</strong> [formatted date]</p>
</div>
```

### 2. Decision Notifications to Requester

**Acceptance Email:**
- **Subject:** `Ihr Antrag wurde angenommen: [Title]`
- **Content:** Positive message with decision comment if provided

**Rejection Email:**
- **Subject:** `Ihr Antrag wurde abgelehnt: [Title]`
- **Content:** Polite rejection with decision comment and contact information

## Admin Interface

### 1. Navigation Update

Add to `src/components/admin/AdminNavigation.tsx`:
```typescript
{
  label: 'Anträge',
  href: '/admin/antraege',
  icon: <DescriptionIcon />,
}
```

### 2. Admin List Page

**Route:** `/admin/antraege`

**Features:**
- Table with sortable columns:
  - Titel
  - Antragsteller
  - Datum
  - Status (color-coded chips)
  - Aktionen
- Search bar for filtering
- Status filter dropdown
- Pagination

### 3. Action Modals

**View Modal:**
- Display all Antrag details in formatted layout
- Show attached files with download links
- Display decision information if available

**Edit Modal:**
- Form with all editable fields
- File management (view/delete existing, add new)

**Accept/Reject Modals:**
- Optional comment textarea
- Confirmation button
- Clear indication of action being taken

### 4. Configuration Dialog

**Access:** Settings button on Anträge admin page

**Features:**
- Simple form with textarea for email addresses
- Help text explaining comma-separated format
- Save/Cancel buttons
- Success feedback

## Error Handling

### 1. Form Validation Errors
- Client-side validation with clear error messages
- Server-side validation with specific error responses
- File upload errors (size, type, count)

### 2. API Error Responses
All API endpoints should return consistent error format:
```typescript
{
  success: false;
  error: string;
  details?: Record<string, string>; // Field-specific errors
}
```

### 3. Email Sending Failures
- Log errors but don't fail the submission
- Admin notification of email failures
- Retry mechanism for transient failures

### 4. File Upload Errors
- Clear user feedback for upload failures
- Cleanup of partial uploads
- Size and type validation before upload

## Security Considerations

1. **Authentication & Authorization**
   - Only authenticated admins can access `/api/admin/antraege/*`
   - Public can only POST to `/api/antraege/submit`
   - No public read access to Antrag data

2. **Input Validation**
   - Sanitize all text inputs to prevent XSS
   - Validate file types and sizes
   - Email validation
   - Numeric field boundaries

3. **File Security**
   - Files stored with unique, non-guessable names
   - No direct file access without authentication
   - Virus scanning if available

4. **Rate Limiting**
   - Implement rate limiting on submission endpoint
   - reCAPTCHA integration for spam prevention

5. **Data Privacy**
   - Personal data only accessible by authenticated admins
   - Secure email transmission
   - No sensitive data in logs

## Testing Plan

### 1. Unit Tests

**Frontend Components:**
- `AntragForm` validation and submission
- Purpose checkbox interactions
- File upload component integration
- Error state handling

**API Routes:**
- Input validation
- Database operations
- Email sending (mocked)
- File handling

### 2. Integration Tests

**Submission Flow:**
1. Fill form with valid data
2. Upload files
3. Submit form
4. Verify database record created
5. Verify email sent (mocked)
6. Verify success message

**Admin Workflows:**
1. List and filter Anträge
2. View Antrag details
3. Accept/Reject with comments
4. Verify status updates
5. Verify notification emails

### 3. E2E Tests

**Complete User Journey:**
1. Navigate to form
2. Fill all fields
3. Upload multiple files
4. Submit successfully
5. Admin reviews and accepts
6. Verify all side effects

### 4. Acceptance Criteria

- [ ] Users can submit Anträge with all purpose types
- [ ] Files are uploaded and attached to emails
- [ ] Admins receive email notifications with all details
- [ ] Admins can view, filter, and search Anträge
- [ ] Admins can accept/reject with comments
- [ ] Requesters receive decision notifications
- [ ] Configuration allows updating recipient emails
- [ ] All forms show proper validation
- [ ] System handles errors gracefully
- [ ] No unauthorized access to Antrag data

## Implementation Checklist

### Phase 1: Database & Backend Setup
- [ ] Add Prisma schema models
- [ ] Run database migration
- [ ] Create TypeScript types
- [ ] Implement submission API endpoint
- [ ] Add file upload handling

### Phase 2: Frontend Form
- [ ] Create form page and route
- [ ] Implement AntragForm component
- [ ] Add purpose checkbox sections
- [ ] Integrate file upload
- [ ] Add validation and error handling

### Phase 3: Email Notifications
- [ ] Create submission email template
- [ ] Implement file attachment handling
- [ ] Add email sending to submission flow
- [ ] Test email delivery

### Phase 4: Admin Interface
- [ ] Add navigation entry
- [ ] Create Anträge list page
- [ ] Implement view/edit modals
- [ ] Add accept/reject functionality
- [ ] Create configuration dialog

### Phase 5: Decision Workflow
- [ ] Implement decision API endpoints
- [ ] Add decision email templates
- [ ] Create decision modals
- [ ] Test complete workflow

### Phase 6: Testing & Polish
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Perform security review
- [ ] User acceptance testing
- [ ] Documentation updates

## Additional Considerations

1. **Performance:**
   - Paginate admin list for large datasets
   - Optimize file upload for large attachments
   - Consider email queue for bulk notifications

2. **Monitoring:**
   - Log all Antrag submissions
   - Track email delivery success
   - Monitor file storage usage

3. **Future Enhancements:**
   - Export Anträge to Excel/CSV
   - Advanced filtering and reporting
   - Template responses for common decisions
   - Deadline tracking
   - Category-based routing to different recipients