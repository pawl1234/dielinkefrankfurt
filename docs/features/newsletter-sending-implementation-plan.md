# Newsletter Sending Implementation Plan

This document provides a detailed implementation plan for adding the newsletter sending functionality to the existing newsletter module. It breaks down the work into small, iterative steps that build on each other, designed to allow for incremental progress and early testing.

## Overview of Implementation Approach

We'll follow a bottom-up approach, starting with the core infrastructure and database changes, then building the UI components, and finally integrating everything together. This approach allows us to test each component in isolation before integrating them.

## Implementation Steps

### Phase 1: Database and Core Infrastructure

#### Step 1: Update Prisma Schema
Extend the database schema to support newsletter sending and email hashing.

#### Step 2: Email Hashing Service
Create utility functions for hashing email addresses and validating email formats.

#### Step 3: Newsletter Settings Expansion
Extend the existing newsletter settings to include email sending configuration.

#### Step 4: Email Batch Processing Service
Create a service for processing email recipients in batches.

### Phase 2: User Interface Components

#### Step 5: Recipient Input Form
Create the first step of the multi-step form for inputting email recipients.

#### Step 6: Validation Results Display
Build the UI for showing validation results of the recipient list.

#### Step 7: Confirmation Modal
Implement the confirmation modal for the final sending step.

### Phase 3: Integration and API Routes

#### Step 8: Email Sending API Route
Create the API route for sending newsletters to recipients.

#### Step 9: Email Archive System
Implement the archiving system for sent newsletters.

#### Step 10: Admin Interface for Sent Newsletters
Create the admin interface for viewing sent newsletters.

#### Step 11: Public Newsletter Access
Implement the public access to archived newsletters via unique URLs.

### Phase 4: Testing and Finalization

#### Step 12: End-to-End Testing
Test the complete workflow from recipient input to email sending.

#### Step 13: Performance Testing
Test the system with a large number of recipients.

## Detailed Step-by-Step Implementation

## LLM Prompts for Each Implementation Step

### Step 1: Update Prisma Schema

```
I'm implementing a newsletter sending feature for a Next.js application using Prisma with PostgreSQL. I need to extend the existing schema to support:

1. Storing hashed email recipients (without storing actual emails for privacy)
2. Tracking sent newsletters
3. Configuring newsletter sending settings

The existing schema already has:
- A Newsletter model for settings (headerLogo, headerBanner, footerText, etc.)
- Appointment model for events
- StatusReport model for group status reports

I need to add:
1. A NewsletterSettings model with:
   - batchSize (default 100)
   - batchDelay (ms between batches)
   - fromEmail (sender email)
   - fromName (sender name)
   - replyToEmail
   - subjectTemplate

2. A HashedRecipient model with:
   - hashedEmail (SHA-256 hash of email with salt)
   - firstSeen (timestamp)
   - lastSent (timestamp)

3. A SentNewsletter model with:
   - id (UUID for public URL)
   - sentAt (timestamp)
   - subject
   - recipientCount
   - content (HTML)
   - status (completed/failed)
   - settings (JSON of settings used)

Please update the Prisma schema accordingly, following the existing conventions.
```

### Step 2: Email Hashing Service

```
I need to create an email hashing service for our newsletter system. The service should:

1. Generate and store a salt value for hashing emails
2. Hash email addresses using SHA-256 with the salt
3. Validate email format before hashing
4. Check if an email hash already exists in the database

The service will be used for privacy-focused newsletter sending where we don't store actual email addresses. It should be implemented in TypeScript and integrate with our existing Prisma setup.

Please create a file at /src/lib/email-hashing.ts with these utilities and appropriate TypeScript interfaces. Include functionality to:
- Initialize the salt (generating if not exists)
- Hash an email address
- Validate email format using a regex pattern
- Compare a new email against stored hashed emails

For salt storage, you can use the existing Newsletter model to store it as a property.
```

### Step 3: Newsletter Settings Expansion

```
I need to extend our existing newsletter settings module to include email sending configuration. Our current newsletter service is in /src/lib/newsletter-service.ts, and we already have functions for getting and updating newsletter settings.

Please:
1. Update the NewsletterSettings interface to include:
   - batchSize (default 100)
   - batchDelay (ms between batches)
   - fromEmail (sender email)
   - fromName (sender name)
   - replyToEmail (reply-to address)
   - subjectTemplate (template for email subject)

2. Extend the getNewsletterSettings() and updateNewsletterSettings() functions to handle these new fields

3. Create a function to get default values for these new settings

Make sure everything is properly typed with TypeScript and follows our existing patterns for error handling.
```

### Step 4: Email Batch Processing Service

```
I need to create a batch processing service for sending newsletters to a large number of recipients. The service should:

1. Take a list of email addresses (plain text, newline-separated)
2. Parse and validate them (checking for valid email format)
3. Hash the emails and compare against existing hashed emails in the database
4. Split the processing into batches (configurable batch size)
5. Return statistics about:
   - Total valid emails found
   - Number of new vs. existing recipients
   - Any invalid emails detected

Then, create another function to handle the actual sending, which:
1. Takes the validated email list and newsletter content
2. Sends emails in batches with configurable delays between batches
3. Records successful/failed sends
4. Creates an archive record of the sent newsletter

Please create a file at /src/lib/newsletter-sending.ts with these utilities, using our existing email.ts module for the actual sending. Make everything properly typed with TypeScript.
```

### Step 5: Recipient Input Form

```
I need to create the first step of a multi-step form for inputting email recipients for our newsletter system. The form should:

1. Include a textarea where admins can paste a newline-separated list of email addresses
2. Have a "Next" button to proceed to validation
3. Use React Hook Form for form handling

Please create a component at /src/components/newsletter/RecipientInputForm.tsx that integrates with our existing Material UI theme. The component should:
- Accept a callback function for when the form is submitted
- Validate that the textarea is not empty
- Convert the input to an array of email strings
- Pass the email array to the callback function
- Have proper TypeScript typing

Don't worry about validation logic yet - we'll implement that in the next step.
```

### Step 6: Validation Results Display

```
I need to create a component to display validation results for newsletter recipients. After the admin pastes a list of email addresses, this component will show:

1. Total number of valid email addresses found
2. Number of new recipients vs. existing recipients (based on hash comparison)
3. Any warnings for improperly formatted emails

The component should:
- Receive validation results as props
- Display counts and statistics in a clear, organized layout
- Show warnings in a highlighted section
- Include "Back" and "Next" buttons for the multi-step workflow
- Use our existing Material UI theme

Please create a component at /src/components/newsletter/ValidationResultsDisplay.tsx with proper TypeScript typing that displays this information.
```

### Step 7: Confirmation Modal

```
I need to create a confirmation modal for the final step of the newsletter sending workflow. The modal should:

1. Display the message "Sind sie sich sicher, dass der Newsletter so verschickt werden soll?"
2. Show "Abbrechen" (Cancel) and "Senden" (Send) buttons
3. Use Material UI's Dialog component
4. Be triggered when the user clicks "Next" in the validation results component
5. Call a provided callback function when the user confirms sending

Please create a component at /src/components/newsletter/SendConfirmationModal.tsx that uses our existing Material UI theme. The component should be properly typed with TypeScript and include functionality to open/close the modal.
```

### Step 8: Email Sending API Route

```
I need to create an API route for sending newsletters to recipients. The route should:

1. Accept a POST request with:
   - Newsletter HTML content
   - Array of validated email addresses
   - Subject line

2. Use our newsletter-sending.ts module to:
   - Process recipients in batches
   - Send emails using our existing email module
   - Track successful/failed sends
   - Create an archive record

3. Return appropriate responses for:
   - Success: Status code 200 with counts of emails sent
   - Validation errors: Status code 400 with error details
   - Server errors: Status code 500 with error message

Please create an API route at /src/app/api/admin/newsletter/send/route.ts that handles this functionality. Make sure it's protected by our existing authentication middleware and properly typed with TypeScript.
```

### Step 9: Email Archive System

```
I need to implement the email archive system for storing sent newsletters. The system should:

1. Create a record in the SentNewsletter table with:
   - A UUID for the public URL
   - The send date and time
   - The email subject
   - The number of recipients
   - The complete HTML content
   - The send status (completed/failed)
   - A snapshot of the settings used

2. Provide functions to:
   - Save a new newsletter archive
   - Retrieve a sent newsletter by ID
   - List all sent newsletters with pagination

Please create a module at /src/lib/newsletter-archive.ts with these functions, ensuring they're properly typed with TypeScript and follow our existing patterns for error handling.
```

### Step 10: Admin Interface for Sent Newsletters

```
I need to create an admin interface for viewing the list of sent newsletters. The interface should:

1. Display a table of sent newsletters with:
   - Date and time sent
   - Subject
   - Number of recipients
   - Status (completed/failed)
   - Link to view the full newsletter

2. Use our existing SearchFilterBar component for filtering and searching
3. Include pagination for handling many entries
4. Allow viewing the full newsletter content when clicking a row

Please create a page component at /src/app/admin/newsletter/archives/page.tsx that implements this interface. The component should fetch data from our newsletter archive API and use our existing admin layout and components.
```

### Step 11: Public Newsletter Access

```
I need to implement public access to archived newsletters via unique URLs. This should:

1. Create a route that accepts a UUID parameter
2. Fetch the newsletter content from the SentNewsletter table
3. Display the newsletter HTML in a clean layout
4. Handle invalid IDs with appropriate 404 responses
5. Not require authentication to view

Please create a route at /src/app/newsletter/[id]/page.tsx that handles this functionality. The page should be server-rendered for best SEO and sharing capabilities.
```

### Step 12: Multi-Step Form Integration

```
I need to integrate all the newsletter sending components into a complete multi-step workflow. The workflow should:

1. Start with the RecipientInputForm for entering email addresses
2. Proceed to ValidationResultsDisplay showing validation results
3. Show the SendConfirmationModal when "Next" is clicked
4. Send the newsletter when confirmed
5. Show a success/error message after sending
6. Keep track of the current step and form data

Please create a component at /src/components/newsletter/NewsletterSendingForm.tsx that manages this workflow. The component should handle all state management, API calls, and step transitions.

Then, integrate this component into our existing newsletter page at /src/app/admin/newsletter/page.tsx.
```

### Step 13: End-to-End Testing

```
I need to create comprehensive tests for the newsletter sending feature. Please create tests that cover:

1. Unit tests for:
   - Email validation functions
   - Email hashing functionality
   - Batch processing logic

2. Integration tests for:
   - API routes
   - Database operations for hashed emails
   - Newsletter sending workflow

3. Component tests for:
   - RecipientInputForm
   - ValidationResultsDisplay
   - SendConfirmationModal
   - NewsletterSendingForm

Please create these tests in the appropriate locations in our /src/tests directory, following our existing Jest and React Testing Library patterns.
```