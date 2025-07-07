# Antrag an Kreisvorstand - Implementation Guide

## Overview

This guide provides a series of prompts for implementing the "Antrag an Kreisvorstand" feature in a test-driven, incremental manner. Each prompt builds upon the previous one, ensuring no orphaned code and maintaining integration at every step.

## Implementation Phases

### Phase 1: Database Foundation
1. Database schema and types
2. Basic database operations with tests

### Phase 2: Core API
3. Submission API endpoint (minimal version)
4. File upload integration
5. Form validation and error handling

### Phase 3: Email Notifications
6. Email template for submissions
7. File attachment handling

### Phase 4: Frontend Form
8. Basic form page and layout
9. Form fields and validation
10. Purpose checkboxes with conditional fields
11. File upload UI integration
12. Form submission and success handling

### Phase 5: Admin List Interface
13. Admin navigation and list page
14. API endpoint for listing Anträge
15. Search and filter functionality

### Phase 6: Admin Detail Operations
16. View Antrag details API and UI
17. Edit functionality
18. Delete functionality

### Phase 7: Decision Workflow
19. Accept/Reject API endpoints
20. Decision email notifications
21. Admin decision UI

### Phase 8: Configuration
22. Email configuration API and UI

### Phase 9: Final Integration
23. End-to-end testing and polish

---

## Implementation Prompts

### Prompt 1: Database Schema and Types

```text
I need to implement the database foundation for an "Antrag an Kreisvorstand" feature in a Next.js application with Prisma and PostgreSQL.

Please help me:
1. Add the necessary Prisma schema models (Antrag and AntragConfiguration) to the existing schema
2. Create TypeScript interfaces for AntragPurposes, AntragFormData, and AntragWithId in the appropriate type files
3. Generate and run the Prisma migration
4. Write unit tests for the type definitions to ensure they work correctly with the Prisma client

The Antrag model should support:
- User information (firstName, lastName, email)
- Request details (title, summary)
- Multiple purposes stored as JSON (financial support, personnel support, room booking, other)
- File attachments as JSON array of URLs
- Status tracking (NEU, AKZEPTIERT, ABGELEHNT)
- Decision tracking (comment, decidedBy, decidedAt)

The AntragConfiguration model should store comma-separated email recipients.

Follow the existing patterns in the codebase for schema definition and type organization.
```

### Prompt 2: Basic Database Operations

```text
Building on the Antrag schema from the previous step, I need to create database utility functions with comprehensive tests.

Please create:
1. A file src/lib/db/antrag-operations.ts with functions for:
   - createAntrag(data) - creates a new Antrag
   - getAntragById(id) - retrieves a single Antrag
   - updateAntrag(id, data) - updates an Antrag
   - deleteAntrag(id) - deletes an Antrag and returns file URLs for cleanup
   - listAntraege(options) - lists Anträge with pagination and filtering

2. A file src/lib/db/antrag-config-operations.ts with functions for:
   - getAntragConfiguration() - gets the configuration (creates default if none exists)
   - updateAntragConfiguration(emails) - updates the configuration

3. Comprehensive tests for all database operations in src/tests/antrag-db-operations.test.ts

Ensure all functions handle errors gracefully and follow the existing patterns for database operations in the codebase. Include proper TypeScript types for all parameters and return values.
```

### Prompt 3: Basic Submission API Endpoint

```text
Now I need to create the public API endpoint for submitting an Antrag, building on the database operations.

Please create:
1. The API route handler at src/app/api/antraege/submit/route.ts that:
   - Accepts POST requests with Antrag data (no file handling yet)
   - Validates required fields (firstName, lastName, email, title, summary)
   - Validates the purposes JSON structure
   - Creates the Antrag in the database
   - Returns appropriate success/error responses

2. API tests at src/tests/api/antraege/submit.test.ts that verify:
   - Successful submission with valid data
   - Validation errors for missing fields
   - Validation errors for invalid email
   - Validation errors for invalid purposes structure
   - Database error handling

3. A test factory at src/tests/factories/antrag.factory.ts for creating test data

Use the existing API patterns and error handling conventions from the codebase. Don't implement file upload or email sending yet - just focus on the core submission logic.
```

### Prompt 4: File Upload Integration

```text
I need to add file upload functionality to the Antrag submission API, integrating with Vercel Blob Storage.

Please enhance the submission API to:
1. Update src/app/api/antraege/submit/route.ts to:
   - Accept multipart/form-data with files
   - Validate file count (max 5), size (max 10MB each), and types (images, PDFs, Word, Excel)
   - Upload files to Vercel Blob Storage following existing patterns
   - Store file URLs in the Antrag record
   - Clean up files if database creation fails

2. Create a utility file src/lib/antrag-file-utils.ts with:
   - validateAntragFiles(files) - validates file constraints
   - uploadAntragFiles(files) - uploads to blob storage
   - deleteAntragFiles(urls) - deletes from blob storage

3. Update the tests to cover:
   - Successful file upload
   - File validation errors
   - Blob storage error handling
   - Cleanup on failure

Follow the existing file upload patterns from the codebase (appointments, groups). Ensure proper error handling and atomic operations.
```

### Prompt 5: Form Validation and Enhanced Error Handling

```text
I need to enhance the submission API with comprehensive validation and error handling.

Please:
1. Create src/lib/validators/antrag-validator.ts with:
   - validateAntragFormData(data) - comprehensive validation
   - validatePurposes(purposes) - validates purpose structure and requirements
   - Helper functions for field-specific validation

2. Update the submission API to:
   - Use the validator before processing
   - Return field-specific error details
   - Add rate limiting using existing patterns
   - Add reCAPTCHA verification if enabled

3. Create integration tests that verify:
   - All validation rules work correctly
   - Error messages are user-friendly
   - Rate limiting prevents spam
   - reCAPTCHA integration works

Ensure validation messages are in German and follow the existing validation patterns in the codebase.
```

### Prompt 6: Email Template for Submissions

```text
I need to create email notifications for Antrag submissions, building on the existing email infrastructure.

Please:
1. Add to src/lib/email-notifications.ts:
   - sendAntragSubmissionEmail(antrag, fileUrls, recipientEmails) function
   - Helper function to format purposes for email display
   - Integration with existing email sending infrastructure

2. Create comprehensive email template that:
   - Uses existing email styling patterns
   - Displays all Antrag information clearly
   - Formats purposes section based on what was selected
   - Includes submission date/time
   - Is mobile-friendly

3. Update submission API to:
   - Fetch recipient emails from configuration
   - Call sendAntragSubmissionEmail after successful creation
   - Log but don't fail if email sending fails

4. Add tests for:
   - Email template generation
   - Correct recipient handling
   - Error handling when email fails

Follow the existing email patterns from status reports and group notifications.
```

### Prompt 7: Email File Attachments

```text
Building on the email template, I need to add file attachment functionality to the submission emails.

Please:
1. Enhance sendAntragSubmissionEmail to:
   - Fetch file content from Blob Storage URLs
   - Attach files to the email with original filenames
   - Handle attachment errors gracefully
   - Limit total attachment size if needed

2. Create src/lib/email-attachment-utils.ts with:
   - fetchFileFromBlobStorage(url) - gets file content
   - prepareEmailAttachments(fileUrls) - prepares attachments array
   - Error handling for unreachable files

3. Update email sending to use Nodemailer's attachment format

4. Add comprehensive tests for:
   - Single and multiple attachments
   - Large file handling
   - Missing file handling
   - Network error resilience

Ensure the implementation follows security best practices and doesn't expose internal URLs.
```

### Prompt 8: Basic Form Page and Layout

```text
Now I need to create the frontend form page for Antrag submissions.

Please create:
1. The page component at src/app/antrag-an-kreisvorstand/page.tsx that:
   - Uses FormPageLayout with appropriate props
   - Sets up proper breadcrumbs
   - Includes SEO-friendly metadata

2. Start the form component at src/components/forms/antraege/AntragForm.tsx with:
   - Basic component structure using existing form patterns
   - React Hook Form setup
   - Material-UI form container
   - Submit button (disabled for now)
   - Loading and success states

3. Basic tests for:
   - Page renders correctly
   - Breadcrumbs are correct
   - Form component mounts

This is just the shell - we'll add form fields in the next step. Follow the patterns from AppointmentForm and StatusReportForm.
```

### Prompt 9: Form Fields and Validation

```text
I need to add all the form fields to the AntragForm component with proper validation.

Please enhance AntragForm to include:
1. User Information section:
   - First name, last name, email fields
   - Required field validation
   - Email format validation

2. Antrag Details section:
   - Title field (max 200 chars)
   - Summary textarea (max 300 chars with counter)
   - Character count display

3. Form validation that:
   - Only shows errors after submission attempt
   - Uses German error messages
   - Follows existing validation patterns

4. Tests for:
   - All fields render correctly
   - Validation works as expected
   - Character counters update
   - Error display logic

Use the existing form field components and validation patterns from the codebase. Implement proper TypeScript types for the form data.
```

### Prompt 10: Purpose Checkboxes with Conditional Fields

```text
I need to add the purpose selection section with checkboxes that reveal conditional fields.

Please add to AntragForm:
1. Purpose section with four checkboxes:
   - Zuschuss (Financial Support) - reveals amount field
   - Personelle Unterstützung - reveals details textarea  
   - Raumbuchung - reveals location, number of people, and details fields
   - Weiteres - reveals details textarea

2. Conditional rendering logic that:
   - Shows/hides fields based on checkbox state
   - Validates conditional fields only when checkbox is checked
   - Clears field values when checkbox is unchecked

3. Proper form data structure for purposes following the AntragPurposes interface

4. Comprehensive tests for:
   - Checkbox interactions
   - Conditional field visibility
   - Conditional validation
   - Data structure correctness

Follow Material-UI patterns and ensure smooth UX with proper animations for showing/hiding fields.
```

### Prompt 11: File Upload UI Integration

```text
I need to integrate the file upload component into the AntragForm.

Please:
1. Add file upload section to AntragForm:
   - Integrate existing FileUpload component
   - Configure for max 5 files, 10MB each
   - Set accepted file types (images, PDFs, Word, Excel)
   - Show upload progress and errors

2. Update form submission to handle files:
   - Convert to FormData for multipart submission
   - Include all form fields and files
   - Show appropriate loading states

3. Add tests for:
   - File upload component integration
   - File validation (size, type, count)
   - Form data preparation
   - Upload error handling

Reuse the existing FileUpload component and follow patterns from AppointmentForm.
```

### Prompt 12: Form Submission and Success Handling

```text
I need to complete the form submission flow with API integration and user feedback.

Please:
1. Implement form submission in AntragForm:
   - Call the /api/antraege/submit endpoint
   - Handle loading states during submission
   - Show success message after submission
   - Clear form on success
   - Handle and display API errors

2. Add reCAPTCHA integration:
   - Conditionally show reCAPTCHA
   - Include token in submission
   - Handle reCAPTCHA errors

3. Create success component or message that:
   - Confirms submission
   - Explains next steps
   - Offers option to submit another

4. Comprehensive integration tests for:
   - Full form submission flow
   - Error handling
   - Success flow
   - Network error handling

Follow patterns from existing forms for error and success handling.
```

### Prompt 13: Admin Navigation and List Page

```text
Now I need to create the admin interface starting with navigation and the list page.

Please:
1. Update src/components/admin/AdminNavigation.tsx:
   - Add "Anträge" menu item with appropriate icon
   - Maintain existing navigation structure

2. Create src/app/admin/antraege/page.tsx:
   - Protected route with authentication check
   - Page header with title and icon
   - Placeholder for Anträge table
   - Settings button for configuration

3. Start src/components/admin/antraege/AntraegeTable.tsx:
   - Table structure with columns: Titel, Antragsteller, Datum, Status, Aktionen
   - Loading and empty states
   - Pagination controls (not functional yet)

4. Tests for:
   - Navigation includes new item
   - Page requires authentication
   - Table component renders

Follow the patterns from the existing admin pages.
```

### Prompt 14: API Endpoint for Listing Anträge

```text
I need to create the admin API for listing Anträge with filtering and pagination.

Please create:
1. API route at src/app/api/admin/antraege/route.ts:
   - GET endpoint with authentication check
   - Query parameters: status, search, page, limit
   - Search in title, summary, firstName, lastName
   - Proper pagination with total count
   - Sorting by creation date (newest first)

2. Update AntraegeTable to:
   - Fetch data from the API
   - Handle loading and error states
   - Display data in the table
   - Implement working pagination
   - Format dates and status with proper styling

3. Add status filter dropdown and search bar:
   - Filter by NEU, AKZEPTIERT, ABGELEHNT, or all
   - Search with debouncing
   - Update URL params for bookmarkable state

4. Tests for:
   - API authentication
   - Filtering and search
   - Pagination
   - UI interactions

Follow patterns from existing admin list pages.
```

### Prompt 15: Search and Filter Functionality

```text
I need to enhance the Anträge list with full search and filter capabilities.

Please:
1. Create src/components/admin/antraege/AntraegeFilters.tsx:
   - Search input with debouncing
   - Status filter dropdown
   - Clear filters button
   - Responsive layout

2. Enhance the list API to:
   - Implement case-insensitive search
   - Search across multiple fields
   - Handle empty search gracefully

3. Update AntraegeTable to:
   - Integrate the filters component
   - Update results as filters change
   - Show active filter indicators
   - Maintain filter state in URL

4. Add comprehensive tests for:
   - Search functionality
   - Filter combinations
   - URL state persistence
   - Performance with debouncing

Follow Material-UI patterns and ensure good UX with loading states during filtering.
```

### Prompt 16: View Antrag Details API and UI

```text
I need to implement viewing individual Antrag details in the admin interface.

Please:
1. Create API route at src/app/api/admin/antraege/[id]/route.ts:
   - GET endpoint with authentication
   - Return full Antrag details
   - Handle not found cases

2. Create src/components/admin/antraege/ViewAntragDialog.tsx:
   - Modal dialog for viewing details
   - Formatted display of all fields
   - Purpose section with clear layout
   - File list with download links
   - Decision information if available

3. Update AntraegeTable to:
   - Add "Ansehen" action button
   - Handle dialog open/close
   - Fetch details when opened

4. Tests for:
   - API endpoint security
   - Dialog rendering
   - Data display formatting
   - File download links

Follow patterns from existing admin detail views.
```

### Prompt 17: Edit Functionality

```text
I need to add the ability to edit Anträge from the admin interface.

Please:
1. Update the [id] API route to handle PUT requests:
   - Validate edit permissions
   - Allow updating specific fields
   - Preserve fields not included in update
   - Handle file changes

2. Create src/components/admin/antraege/EditAntragDialog.tsx:
   - Form with all editable fields
   - Pre-populate with current values
   - File management (view current, add new, remove)
   - Save and cancel actions

3. Update AntraegeTable:
   - Add "Bearbeiten" button for NEU status
   - Handle edit dialog
   - Refresh data after edit

4. Comprehensive tests for:
   - Edit API validation
   - Form pre-population
   - Successful updates
   - Error handling

Reuse form components and validation from the public form where appropriate.
```

### Prompt 18: Delete Functionality

```text
I need to implement Antrag deletion with proper file cleanup.

Please:
1. Update [id] route to handle DELETE requests:
   - Check authentication
   - Delete associated files from blob storage
   - Delete database record
   - Handle errors gracefully

2. Create confirmation dialog component:
   - Clear warning message
   - Confirm/Cancel buttons
   - Loading state during deletion

3. Update AntraegeTable:
   - Add "Löschen" action button
   - Show confirmation dialog
   - Handle deletion
   - Show success message
   - Refresh list after deletion

4. Tests for:
   - Delete authorization
   - File cleanup
   - Error handling
   - UI flow

Ensure atomic operations - if file deletion fails, database record should remain.
```

### Prompt 19: Accept/Reject API Endpoints

```text
I need to implement the decision workflow API endpoints.

Please create:
1. API route at src/app/api/admin/antraege/[id]/accept/route.ts:
   - PUT endpoint with authentication
   - Accept optional comment
   - Update status, decision fields, timestamp
   - Get current user for decidedBy
   - Return updated Antrag

2. API route at src/app/api/admin/antraege/[id]/reject/route.ts:
   - Same structure as accept
   - Set status to ABGELEHNT

3. Integration with email notifications:
   - Call appropriate email function after status update
   - Include decision comment in email
   - Handle email errors gracefully

4. Comprehensive tests for:
   - Authentication and authorization
   - Status transitions
   - Decision tracking
   - Email sending (mocked)

Follow existing patterns for status update endpoints.
```

### Prompt 20: Decision Email Notifications

```text
I need to implement email notifications for Antrag decisions.

Please add to email-notifications.ts:
1. sendAntragAcceptanceEmail function:
   - Send to requester email
   - Include Antrag title and decision date
   - Include decision comment if provided
   - Friendly, positive tone

2. sendAntragRejectionEmail function:
   - Send to requester email
   - Include Antrag title
   - Include decision comment if provided
   - Polite tone with contact information

3. Email templates that:
   - Follow existing styling
   - Are mobile-friendly
   - Include clear subject lines

4. Integration tests that verify:
   - Correct email content
   - Comment inclusion
   - Error handling

Follow patterns from existing decision emails (group acceptance/rejection).
```

### Prompt 21: Admin Decision UI

```text
I need to create the UI for accepting and rejecting Anträge.

Please create:
1. src/components/admin/antraege/DecisionDialog.tsx:
   - Configurable for accept or reject
   - Optional comment textarea
   - Clear indication of action
   - Loading state during submission
   - Error handling

2. Update AntraegeTable:
   - Add "Annehmen" and "Ablehnen" buttons for NEU status
   - Show decision dialog
   - Call appropriate API endpoint
   - Show success message
   - Refresh data after decision

3. Update ViewAntragDialog:
   - Show decision information if available
   - Display decidedBy and decidedAt
   - Show decision comment

4. Tests for:
   - Dialog interactions
   - API integration
   - Success/error states
   - Data refresh

Ensure good UX with clear feedback and confirmation of actions.
```

### Prompt 22: Email Configuration API and UI

```text
I need to implement the configuration interface for email recipients.

Please:
1. Create API routes for configuration:
   - GET /api/admin/antraege/configuration
   - PUT /api/admin/antraege/configuration
   - Use existing config patterns
   - Create default if none exists

2. Create src/components/admin/antraege/ConfigurationDialog.tsx:
   - Textarea for comma-separated emails
   - Email validation
   - Save/Cancel buttons
   - Success feedback
   - Help text

3. Update admin page:
   - Settings button opens dialog
   - Fetch current configuration
   - Handle save with validation

4. Tests for:
   - Configuration persistence
   - Email validation
   - Default creation
   - UI interactions

Follow patterns from newsletter configuration.
```

### Prompt 23: End-to-End Testing and Polish

```text
I need to create comprehensive E2E tests and polish the entire feature.

Please:
1. Create E2E test at src/tests/integration/antrag-e2e.test.ts:
   - Complete user journey from submission to decision
   - Test all form validations
   - Test file uploads
   - Test admin workflows
   - Test email notifications

2. Polish and improvements:
   - Loading states for all async operations
   - Error boundaries for components
   - Accessibility improvements (ARIA labels, keyboard navigation)
   - Performance optimizations (memo, pagination)

3. Update documentation:
   - Add feature to main README
   - Update CLAUDE.md with new patterns
   - Add inline code comments where helpful

4. Final checklist verification:
   - All acceptance criteria met
   - No orphaned code
   - Consistent styling
   - Proper error handling throughout

Run the full test suite and ensure everything integrates properly.
```

---

## Implementation Notes

### Key Principles

1. **Test-Driven Development**: Write tests before or alongside implementation
2. **Incremental Progress**: Each step should be independently testable
3. **No Orphaned Code**: Every piece connects to the previous work
4. **Pattern Consistency**: Follow existing codebase patterns
5. **Error Resilience**: Handle all error cases gracefully

### Dependencies Between Steps

- Steps 1-2: Database foundation
- Steps 3-7: Core API functionality  
- Steps 8-12: Public form interface
- Steps 13-18: Admin list and details
- Steps 19-21: Decision workflow
- Step 22: Configuration
- Step 23: Final integration

### Testing Strategy

- Unit tests for utilities and validators
- Integration tests for API endpoints
- Component tests for UI elements
- E2E tests for complete workflows

### Security Checkpoints

- Step 3: Basic API authentication
- Step 5: Input validation and rate limiting
- Step 14: Admin authentication
- Step 19: Authorization for decisions

This implementation guide ensures a smooth, testable development process with no big jumps in complexity.