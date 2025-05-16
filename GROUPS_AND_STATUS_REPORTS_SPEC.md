# Groups and Status Reports Feature Specification

## Overview

This document specifies the implementation of a new feature set for Die Linke Frankfurt's website, focused on managing Groups (Gruppen) and their Status Reports. This feature will allow users to request the creation of groups, submit status reports for active groups, and view group information. Admins will be able to manage both groups and reports through dedicated admin interfaces.

## Database Models

### Group Model

```prisma
model Group {
  id             String         @id @default(cuid())
  name           String         @db.VarChar(100)
  slug           String         @unique
  description    String         @db.Text
  logoUrl        String?
  status         GroupStatus    @default(NEW)
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt
  statusReports  StatusReport[]
  responsiblePersons ResponsiblePerson[]

  @@index([status])
  @@index([name])
}

enum GroupStatus {
  NEW
  ACTIVE
  ARCHIVED
}

model ResponsiblePerson {
  id        String   @id @default(cuid())
  firstName String   @db.VarChar(50)
  lastName  String   @db.VarChar(50)
  email     String
  group     Group    @relation(fields: [groupId], references: [id], onDelete: Cascade)
  groupId   String
  
  @@index([groupId])
}
```

### Status Report Model

```prisma
model StatusReport {
  id          String           @id @default(cuid())
  title       String           @db.VarChar(100)
  content     String           @db.Text
  reporterFirstName String     @db.VarChar(50)
  reporterLastName  String     @db.VarChar(50)
  fileUrls    String?          // JSON string array
  status      StatusReportStatus @default(NEW)
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt
  group       Group            @relation(fields: [groupId], references: [id], onDelete: Cascade)
  groupId     String

  @@index([status])
  @@index([groupId])
  @@index([createdAt])
}

enum StatusReportStatus {
  NEW
  ACTIVE
  ARCHIVED
}
```

## Public Frontend Features

### Group Request Form

**URL:** `/neue-gruppe`

**Fields:**
- Group Name (required, 3-100 characters)
- Description (Rich Text, required, 50-5000 characters)
- Logo Upload (required, JPG/PNG/GIF, max 2MB, with cropping functionality)
- Responsible Persons (1-10 people):
  - First Name (required, 2-50 characters)
  - Last Name (required, 2-50 characters)
  - Email Address (required, valid email format)
  - Add/Remove Person buttons

**Validation:**
- All required fields must be filled
- Email addresses must be valid format
- Logo must be valid image file under size limit
- At least one responsible person required

**Process:**
1. Form submission creates new Group with status "NEW"
2. Logo uploaded to Vercel Blob Storage with unique path based on timestamp
3. Responsible persons stored in related database table
4. Confirmation message shown to user after successful submission

### Status Report Form

**URL:** `/gruppen-bericht`

**Fields:**
- Group selection (dropdown of active groups, required)
- Report Title (required, 3-100 characters)
- Status Report content (Rich Text, required, max 1000 characters)
- Reporter Information:
  - First Name (required, 2-50 characters)
  - Last Name (required, 2-50 characters)
- File Upload (up to 5 files, 5MB total combined, optional)

**Validation:**
- All required fields must be filled
- Content must not exceed 1000 characters
- Files must be under combined size limit
- Selected group must exist and be active

**Process:**
1. Form submission creates new StatusReport with status "NEW"
2. Files uploaded to Vercel Blob Storage with unique paths
3. Confirmation message shown to user after successful submission

### Public Group Display

**URL Structure:**
- Main listing: `/gruppen`
- Individual group: `/gruppen/[group-slug]`

**Group Listing Page:**
- Lists all active groups in alphabetical order
- Each group displays:
  - Group logo (cropped)
  - Group name
  - Short excerpt of description
  - Link to full group page

**Individual Group Page:**
- Displays group logo and name prominently
- Full description in rich text format
- Lists all active status reports chronologically (newest first)
- Each status report displays:
  - Title
  - Full content
  - Reporter name
  - Submission date
  - File attachments (if any)
  - Clear visual separation between reports

## Admin Features

### Admin Menu

Extend the existing admin menu to include:
- Appointments (existing)
- Groups (new)
- Status Reports (new)
- Newsletter (existing)

### Group Management Dashboard

**Features:**
- Filter groups by status (New Requests, Active, Archived)
- Sort by name, creation date
- View detailed information for each group
- Actions:
  - Accept new group requests (changes status to ACTIVE)
  - Edit group details (name, description, logo, responsible persons)
  - Archive active groups (changes status to ARCHIVED)
  - Delete archived groups (with confirmation)

**Group Editing:**
- Same fields as public form with current values pre-filled
- Ability to add/remove responsible persons
- Logo re-cropping functionality

### Status Report Management Dashboard

**Features:**
- Filter reports by status (New Requests, Active, Archived)
- Filter reports by group
- Sort by date, title
- View detailed information for each report
- Actions:
  - Accept new report requests (changes status to ACTIVE)
  - Edit report content
  - Archive reports (manually or automatically after 6 weeks)
  - Delete archived reports (with confirmation)

**Report Editing:**
- Same fields as public form with current values pre-filled
- Ability to add/remove file attachments

## Email Notifications

### Group Acceptance Email

Sent to all responsible persons when a group request is accepted.

**Template:**
```
Betreff: Ihre Gruppe "[Gruppenname]" wurde freigeschaltet

Liebe Verantwortliche der Gruppe "[Gruppenname]",

wir freuen uns, Ihnen mitteilen zu können, dass Ihre Gruppe nun freigeschaltet wurde und auf unserer Website sichtbar ist.

Sie können ab sofort Statusberichte für Ihre Gruppe einreichen unter: [Link zum Statusbericht-Formular]

Bei Fragen stehen wir Ihnen gerne zur Verfügung.

Mit freundlichen Grüßen,
Das Team von Die Linke Frankfurt
```

### Group Archiving Email

Sent to all responsible persons when a group is archived.

**Template:**
```
Betreff: Ihre Gruppe "[Gruppenname]" wurde archiviert

Liebe Verantwortliche der Gruppe "[Gruppenname]",

wir möchten Sie darüber informieren, dass Ihre Gruppe auf unserer Website archiviert wurde und nicht mehr öffentlich sichtbar ist.

Bei Fragen stehen wir Ihnen gerne zur Verfügung.

Mit freundlichen Grüßen,
Das Team von Die Linke Frankfurt
```

### Status Report Acceptance Email

Sent to all responsible persons of the group when a status report is accepted.

**Template:**
```
Betreff: Statusbericht "[Berichtstitel]" wurde freigeschaltet

Liebe Verantwortliche der Gruppe "[Gruppenname]",

wir möchten Sie darüber informieren, dass der Statusbericht "[Berichtstitel]" vom [Datum] nun freigeschaltet wurde und auf unserer Website sichtbar ist.

Sie können den Bericht hier einsehen: [Link zum Bericht]

Bei Fragen stehen wir Ihnen gerne zur Verfügung.

Mit freundlichen Grüßen,
Das Team von Die Linke Frankfurt
```

## Newsletter Integration

Extend the newsletter generator to include recent group status reports.

**Features:**
- Automatically include status reports from the last 2 weeks
- Group by organization in alphabetical order
- For each group with recent reports:
  - Display group logo (cropped) and name
  - Clear visual separation between groups
- For each status report:
  - Show report title
  - Show first 300 characters or 5 lines of content
  - Include "Mehr Infos" button linking to full report
  - Show report date
  - Clear but subtle separation between reports from same group

## API Routes

### Group Management

- `POST /api/groups/submit` - Public endpoint for group requests
- `GET /api/admin/groups` - Get all groups with filtering options
- `GET /api/admin/groups/[id]` - Get specific group details
- `PUT /api/admin/groups/[id]` - Update group details
- `PUT /api/admin/groups/[id]/status` - Update group status
- `DELETE /api/admin/groups/[id]` - Delete a group

### Status Report Management

- `POST /api/status-reports/submit` - Public endpoint for status report submission
- `GET /api/admin/status-reports` - Get all reports with filtering options
- `GET /api/admin/status-reports/[id]` - Get specific report details
- `PUT /api/admin/status-reports/[id]` - Update report details
- `PUT /api/admin/status-reports/[id]/status` - Update report status
- `DELETE /api/admin/status-reports/[id]` - Delete a report

### Public Data Access

- `GET /api/groups` - Get all active groups
- `GET /api/groups/[slug]` - Get specific group with its active reports
- `GET /api/groups/[slug]/status-reports` - Get all active reports for a group

## File Handling

### Group Logo Storage

- Store logos in Vercel Blob Storage
- Use timestamp-based unique path names
- Implement cropping similar to featured appointments
- Store URL in group record

### Status Report File Attachments

- Store files in Vercel Blob Storage
- Use timestamp-based unique path names
- Store URLs as JSON string in status report record
- Implement file validation (type, size)
- Handle deletion when report is deleted

## Error Handling and Validation

### Form Validation

- Client-side validation with clear error messages
- Server-side validation for security
- Duplicate detection for group names
- Email format validation
- File size and type validation
- Rate limiting to prevent abuse

### Admin Operation Safeguards

- Confirmation dialogs for destructive actions
- Error recovery options
- Action logging for troubleshooting
- Data validation before state changes

### Database Operations

- Transaction support for related operations
- Proper error handling for database issues
- Data integrity checks

### Email Notifications

- Queue system for email sending
- Admin notification for email failures
- Email address validation

## Testing Requirements

### Unit Testing

- Models and relationships
- Validation logic
- Email generation functions
- File upload processing

### Integration Testing

- API routes functionality
- Database operations including cascading deletes
- Authentication and authorization
- State transitions

### End-to-End Testing

- Group request submission flow
- Status report submission flow
- Admin workflows
- Email delivery
- File upload and storage

### Component Testing

- Form components and validation
- Rich text editor character limits
- Group listing and filtering
- Responsive layouts

### Newsletter Testing

- Newsletter generation with Groups section
- Correct filtering of reports
- Email template rendering

### Accessibility Testing

- Keyboard navigation
- Screen reader compatibility
- Color contrast

## Implementation Phases

### Phase 1: Database and Backend Foundations
1. Create Group and Status Report database models
2. Set up API routes for Group management
3. Implement admin authentication for new routes

### Phase 2: Group Request Feature
1. Develop Group Request public form
2. Implement Group admin dashboard
3. Create email notification system for groups
4. Build public group listing and detail pages

### Phase 3: Status Report Feature
1. Develop Status Report submission form
2. Implement Status Report admin dashboard
3. Add Status Report display to group detail pages
4. Extend email notification system for status reports

### Phase 4: Newsletter Integration
1. Modify newsletter generation to include group status reports
2. Implement filtering for recent reports (last 2 weeks)
3. Design and implement newsletter template changes

### Phase 5: Testing and Refinement
1. End-to-end testing of all new features
2. Error handling improvements
3. Performance optimization
4. Documentation updates

## Future Considerations

### Search Capability
- Database indexes added for efficient future search
- Component structure allows for search integration
- API routes designed to support future search parameters

## Components to Create/Modify

### New Components
- `GroupRequestForm.tsx`
- `GroupLogo.tsx` (for cropping functionality)
- `ResponsiblePersonFields.tsx`
- `StatusReportForm.tsx`
- `GroupList.tsx`
- `GroupDetail.tsx`
- `StatusReportList.tsx`
- `AdminGroupDashboard.tsx`
- `AdminStatusReportDashboard.tsx`

### Existing Components to Modify
- `MainLayout.tsx` (add new navigation items)
- `NewsletterGenerator.tsx` (add groups section)
- Admin layout and navigation components

## UI/UX Considerations

- Follow existing design system and Material UI components
- Use the current responsive theme for all new pages
- Maintain brand colors and styling
- Implement clear visual hierarchy for group and report listings
- Provide intuitive navigation between related items

## Documentation Updates

- Update README.md with new feature overview
- Update API_DOCUMENTATION.md with new endpoints
- Update FEATURES.md with workflow descriptions
- Update database schema documentation
- Add inline code documentation

## Access Control

- Extend existing admin authentication to new features
- All admin features protected behind same authentication
- Public pages available to all users
- Form submissions available to all users