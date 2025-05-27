# Newsletter Sending Implementation Prompts

This document contains a series of prompts for a code-generation LLM to implement the newsletter sending feature. Each prompt builds on the previous one, ensuring incremental progress and proper integration.

## Phase 1: Database and Core Infrastructure

### Prompt 1: Update Prisma Schema

```
I'm extending a Next.js application with Prisma/PostgreSQL to add newsletter sending functionality. The existing schema already has a Newsletter model for basic settings (headerLogo, headerBanner, footerText, etc.), and I need to add three new models:

1. Update the existing Newsletter model to include email sending settings:
   - batchSize: Int with default 100
   - batchDelay: Int with default 1000 (ms between batches)
   - fromEmail: String
   - fromName: String
   - replyToEmail: String
   - subjectTemplate: String
   - emailSalt: String (for hashing)

2. Add HashedRecipient model:
   - id: String as primary key (cuid)
   - hashedEmail: String (unique)
   - firstSeen: DateTime (default now)
   - lastSent: DateTime (nullable)

3. Add SentNewsletter model:
   - id: String as primary key (cuid, for public URL)
   - sentAt: DateTime (default now)
   - subject: String
   - recipientCount: Int
   - content: String (for HTML content)
   - status: String (default "completed")
   - settings: String (JSON of settings used)

Please update the Prisma schema following existing conventions (lowercase table names, appropriate indexes).

Here's the relevant part of the existing schema:

```prisma
// Newsletter settings for email generation
model Newsletter {
  id                 Int        @id @default(autoincrement())
  headerLogo         String?    // URL for the header logo
  headerBanner       String?    // URL for the header banner
  footerText         String?    // Text for the newsletter footer
  unsubscribeLink    String?    // Link for unsubscribing (placeholder for now)
  testEmailRecipients String?   // Comma-separated list of test email recipients

  // System fields
  createdAt          DateTime   @default(now())
  updatedAt          DateTime   @updatedAt

  @@map("newsletter") // Lowercase table name for PostgreSQL convention
}
```
```

### Prompt 2: Email Hashing Service

```
Now I need to create an email hashing service for our newsletter system. Please create a file at `/src/lib/email-hashing.ts` with the following functionality:

1. TypeScript interfaces for:
   - HashedRecipient (matching our Prisma model)
   - ValidationResult (with counts of valid, invalid, new, and existing emails)

2. Functions for:
   - validateEmail(email: string): boolean - Validates email format using regex
   - initializeSalt(): Promise<string> - Gets or creates a salt from the Newsletter model
   - hashEmail(email: string, salt: string): string - Hashes email using SHA-256 with salt
   - validateAndHashEmails(emailList: string): Promise<ValidationResult> - Processes a newline-separated list of emails:
     * Validates each email
     * Hashes valid emails
     * Checks against existing HashedRecipient records
     * Returns statistics about valid/invalid/new/existing emails

3. Include proper error handling and TypeScript typing

Use crypto from Node.js standard library for hashing, and integrate with our existing Prisma client for database operations.

The existing newsletter settings are accessed via:
```typescript
import prisma from './prisma';
// Get settings from database
const dbSettings = await prisma.newsletter.findFirst();
```
```

### Prompt 3: Newsletter Settings Expansion

```
I need to extend our existing newsletter settings module to include email sending configuration. Please update `/src/lib/newsletter-service.ts` with the following changes:

1. Update the NewsletterSettings interface to include:
   - batchSize: number (default 100)
   - batchDelay: number (default 1000)
   - fromEmail: string
   - fromName: string
   - replyToEmail: string
   - subjectTemplate: string
   - emailSalt: string

2. Update the getDefaultNewsletterSettings() function to include defaults for these fields

3. Modify the getNewsletterSettings() and updateNewsletterSettings() functions to handle these new fields

4. Ensure all TypeScript types are properly updated

Here's the relevant part of the existing NewsletterSettings interface:

```typescript
export interface NewsletterSettings {
  headerLogo: string;
  headerBanner: string;
  footerText: string;
  unsubscribeLink: string;
  id?: number;
  createdAt?: Date;
  updatedAt?: Date;
  testEmailRecipients?: string | null;
}
```

And here's how we're currently getting default settings:

```typescript
export function getDefaultNewsletterSettings(): NewsletterSettings {
  return {
    headerLogo: 'public/images/logo.png',
    headerBanner: 'public/images/header-bg.jpg',
    footerText: 'Die Linke Frankfurt am Main',
    unsubscribeLink: '#',
    testEmailRecipients: 'buero@linke-frankfurt.de'
  };
}
```
```

### Prompt 4: Email Batch Processing Service

```
Now I need to create a batch processing service for sending newsletters. Please create a new file at `/src/lib/newsletter-sending.ts` with the following functionality:

1. Import the necessary modules:
   - email.ts (for sending emails)
   - email-hashing.ts (for validation and hashing)
   - newsletter-service.ts (for settings)
   - prisma.ts (for database access)

2. Create a function `processRecipientList(emailText: string): Promise<ValidationResult>` that:
   - Takes a newline-separated list of emails
   - Uses the validateAndHashEmails function from email-hashing.ts
   - Returns validation results

3. Create a function `sendNewsletter(params: { 
     html: string, 
     subject: string, 
     validatedEmails: string[], 
     settings?: Partial<NewsletterSettings> 
   }): Promise<SendResult>` that:
   - Gets newsletter settings (or uses provided overrides)
   - Splits emails into batches based on batchSize setting
   - Sends emails in batches with delays between batches
   - Records hashed recipients in the database
   - Creates a SentNewsletter record
   - Returns statistics about the sending process

4. Create appropriate TypeScript interfaces for all parameters and return types

5. Implement robust error handling for the sending process

Use the existing email sending function:

```typescript
export const sendEmail = async ({
  to,
  subject,
  html,
  from = process.env.EMAIL_FROM || 'newsletter@die-linke-frankfurt.de',
}: {
  to: string;
  subject: string;
  html: string;
  from?: string;
}) => {
  // Implementation details...
};
```
```

## Phase 2: User Interface Components

### Prompt 5: Recipient Input Form

```
I need to create the first step of our multi-step newsletter sending form. Please create a component at `/src/components/newsletter/RecipientInputForm.tsx` with the following:

1. A form with a large textarea where administrators can paste a list of email addresses (newline-separated)
2. Use React Hook Form for form management
3. Include "Back" and "Next" buttons (Back should be disabled on this first step)
4. Basic validation to ensure the textarea isn't empty
5. On submit, call a provided onSubmit callback with the textarea content
6. Style using Material UI v7 components to match our existing design system

The component should have this interface:

```typescript
interface RecipientInputFormProps {
  onSubmit: (emailText: string) => void;
  onBack?: () => void; // Optional for first step
  isSubmitting?: boolean;
}
```

Use these Material UI components:
- Grid for layout
- TextField with multiline for the textarea
- Typography for labels and instructions
- Button for navigation buttons
- Paper for the form container

Include helper text explaining that emails should be newline-separated and approximately 1500 recipients are supported.
```

### Prompt 6: Validation Results Display

```
Now I need to create the second step of our multi-step form, which displays validation results for newsletter recipients. Please create a component at `/src/components/newsletter/ValidationResultsDisplay.tsx` with the following:

1. Display validation statistics:
   - Total valid emails found
   - Number of new recipients
   - Number of existing recipients
   - Number of invalid emails (if any)

2. Show a list of invalid emails (if any) with a warning style

3. Include "Back" and "Next" buttons for the multi-step workflow

4. Style using Material UI v7 components to match our existing design

The component should have this interface:

```typescript
interface ValidationResultsDisplayProps {
  validationResults: {
    totalValid: number;
    newRecipients: number;
    existingRecipients: number;
    invalidEmails: string[];
  };
  onBack: () => void;
  onNext: () => void;
  isSubmitting?: boolean;
}
```

Use these Material UI components:
- Grid for layout
- Paper for the container
- Typography for text and headings
- Alert for warnings about invalid emails
- Button for navigation buttons
- Card/CardContent for statistics display
```

### Prompt 7: Confirmation Modal

```
I need to create a confirmation modal for the final step of our newsletter sending workflow. Please create a component at `/src/components/newsletter/SendConfirmationModal.tsx` with the following:

1. A Material UI Dialog component that shows when isOpen is true
2. Display the message "Sind sie sich sicher, dass der Newsletter so verschickt werden soll?"
3. Show a summary of the number of recipients
4. Include "Abbrechen" (Cancel) and "Senden" (Send) buttons
5. Call appropriate callback functions for each action
6. Show a loading indicator when isSubmitting is true

The component should have this interface:

```typescript
interface SendConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  recipientCount: number;
  isSubmitting: boolean;
}
```

Style the modal to match our existing design system, with the "Senden" button using our primary color (#FF0000) and the "Abbrechen" button using a neutral color.
```

## Phase 3: Integration and API Routes

### Prompt 8: Email Sending API Route

```
I need to create an API route for sending newsletters to recipients. Please create a file at `/src/app/api/admin/newsletter/send/route.ts` with the following:

1. Import necessary modules:
   - next/server (for NextRequest/NextResponse)
   - newsletter-sending.ts (for sending functionality)
   - api-auth.ts (for authentication checking)

2. Create a POST handler that:
   - Verifies the request is authenticated using our existing auth middleware
   - Extracts from the request body:
     * html: string (newsletter HTML content)
     * subject: string (email subject)
     * emailText: string (newline-separated email list)
   - Validates the inputs
   - Calls processRecipientList and sendNewsletter from newsletter-sending.ts
   - Returns appropriate success/error responses

3. Include proper error handling for:
   - Validation errors (400 responses)
   - Authentication errors (401 responses)
   - Server errors (500 responses)

The API should follow our existing patterns. Here's how we typically handle API routes:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated, serverErrorResponse } from '../../../lib/api-auth';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Check authentication
    const authCheck = await isAuthenticated(request);
    if (!authCheck.authenticated) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Process request and return response
    // ...

  } catch (error) {
    console.error('API error:', error);
    return serverErrorResponse('An unexpected error occurred');
  }
}
```
```

### Prompt 9: Email Archive System

```
I need to implement the email archive system for storing and retrieving sent newsletters. Please create a file at `/src/lib/newsletter-archive.ts` with the following functionality:

1. Import necessary modules:
   - prisma.ts (for database access)
   - types (create appropriate interfaces)

2. Create a function `archiveNewsletter(params: {
     content: string;
     subject: string;
     recipientCount: number;
     settings: any;
     status?: string;
   }): Promise<string>` that:
   - Creates a new SentNewsletter record
   - Returns the ID (for the public URL)

3. Create a function `getSentNewsletter(id: string): Promise<SentNewsletter | null>` that:
   - Retrieves a sent newsletter by ID
   - Returns null if not found

4. Create a function `listSentNewsletters(params: {
     page?: number;
     limit?: number;
     search?: string;
   }): Promise<PaginatedResult<SentNewsletter>>` that:
   - Gets a paginated list of sent newsletters
   - Supports searching by subject
   - Orders by sentAt (newest first)

5. Create appropriate TypeScript interfaces for parameters and return types

Use our existing patterns for pagination:

```typescript
interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```
```

### Prompt 10: Admin Interface for Sent Newsletters

```
I need to create an admin interface for viewing sent newsletters. Please create a file at `/src/app/admin/newsletter/archives/page.tsx` with the following:

1. A server component that:
   - Imports our existing admin components (AdminPageHeader, AdminNavigation, SearchFilterBar)
   - Uses our existing admin layout

2. A client component (you can create it in the same file or separately) that:
   - Fetches sent newsletters from our API
   - Displays them in a table with columns for:
     * Date sent
     * Subject
     * Number of recipients
     * Status
     * Actions (View link)
   - Includes pagination
   - Uses our SearchFilterBar for searching by subject

3. Include a link back to the main newsletter page

The page should match our existing admin UI style. Here's an example of how we structure our admin pages:

```tsx
// Server Component
export default function AdminNewsletterArchivesPage() {
  return (
    <>
      <AdminPageHeader title="Newsletter Archives" />
      <AdminNavigation />
      <NewsletterArchivesContent />
    </>
  );
}

// Client Component
'use client';

import { useState, useEffect } from 'react';
// Import components and hooks...

function NewsletterArchivesContent() {
  // State and effects...
  
  return (
    <Paper sx={{ p: 2 }}>
      <SearchFilterBar 
        onSearch={handleSearch} 
        placeholder="Search by subject..."
      />
      
      {/* Table of newsletters */}
      
      {/* Pagination */}
    </Paper>
  );
}
```
```

### Prompt 11: Public Newsletter Access

```
I need to implement public access to archived newsletters via unique URLs. Please create a file at `/src/app/newsletter/[id]/page.tsx` with the following:

1. A server component that:
   - Gets the newsletter ID from the URL params
   - Fetches the newsletter content from our archive service
   - Returns a 404 if the newsletter isn't found
   - Renders the newsletter HTML content in a clean layout

2. Make sure the page is not behind authentication

3. Include basic metadata for SEO

The page should be simple and focused on displaying the newsletter content. Here's the structure to follow:

```tsx
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSentNewsletter } from '@/lib/newsletter-archive';

interface NewsletterPageParams {
  params: {
    id: string;
  };
}

export async function generateMetadata({ params }: NewsletterPageParams): Promise<Metadata> {
  // Generate metadata based on newsletter content
}

export default async function NewsletterPage({ params }: NewsletterPageParams) {
  const { id } = params;
  
  // Fetch newsletter
  const newsletter = await getSentNewsletter(id);
  
  if (!newsletter) {
    notFound();
  }
  
  return (
    // Render newsletter content
  );
}
```
```

## Phase 4: Multi-Step Form Integration

### Prompt 12: Multi-Step Form Integration

```
I need to integrate all the newsletter sending components into a complete multi-step workflow. Please create a file at `/src/components/newsletter/NewsletterSendingForm.tsx` with the following:

1. A client component that:
   - Manages the current step state (input, validation, confirmation)
   - Holds all form data between steps
   - Handles API calls to our newsletter sending endpoint
   - Shows appropriate loading states and error messages

2. Integrate our existing components:
   - RecipientInputForm
   - ValidationResultsDisplay
   - SendConfirmationModal

3. Include a success message after sending

4. Provide a way to reset the form and start over

The component should have this interface:

```typescript
interface NewsletterSendingFormProps {
  newsletterHtml: string; // The generated newsletter HTML
  subject: string; // Email subject
}
```

And here's the general structure to follow:

```tsx
'use client';

import { useState } from 'react';
import { RecipientInputForm } from './RecipientInputForm';
import { ValidationResultsDisplay } from './ValidationResultsDisplay';
import { SendConfirmationModal } from './SendConfirmationModal';
// Import other needed components and hooks

export function NewsletterSendingForm({ newsletterHtml, subject }: NewsletterSendingFormProps) {
  // Step management state
  const [currentStep, setCurrentStep] = useState<'input' | 'validation' | 'sending' | 'complete'>('input');
  
  // Form data state
  const [emailText, setEmailText] = useState('');
  const [validationResults, setValidationResults] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [sendResult, setSendResult] = useState(null);
  
  // Handler functions for each step
  
  return (
    <div>
      {/* Render appropriate component based on currentStep */}
      
      {/* Show success/error messages */}
    </div>
  );
}
```

Also, update the main newsletter page at `/src/app/admin/newsletter/page.tsx` to integrate this new component.
```

### Prompt 13: Integration with Newsletter Settings

```
Now I need to integrate the newsletter sending form with our newsletter settings page. Please update the files:

1. Update `/src/components/newsletter/NewsletterGenerator.tsx` to:
   - Pass the current newsletter HTML and a default subject to the NewsletterSendingForm
   - Add a tab or section for "Send Newsletter" that shows the NewsletterSendingForm

2. Update `/src/app/api/admin/newsletter/settings/route.ts` to handle the new newsletter settings fields

3. Update the settings form in the admin interface to include fields for configuring:
   - Batch size
   - From email
   - From name
   - Reply-to email
   - Subject template

The newsletter settings form should be organized in logical sections, with email sending settings grouped together. Follow our existing form patterns and use Material UI components.

Here's the structure of our existing NewsletterGenerator component:

```tsx
'use client';

import { useState, useEffect } from 'react';
import { Tabs, Tab, Box } from '@mui/material';
// Other imports...

export function NewsletterGenerator() {
  const [activeTab, setActiveTab] = useState(0);
  const [newsletterHtml, setNewsletterHtml] = useState('');
  const [introductionText, setIntroductionText] = useState('<p>Herzlich willkommen zum Newsletter der Linken Frankfurt!</p>');
  const [settings, setSettings] = useState<NewsletterSettings | null>(null);
  
  // Effects and handlers...
  
  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="Newsletter bearbeiten" />
          <Tab label="Vorschau" />
          <Tab label="Test senden" />
          {/* New tab for "Newsletter versenden" */}
        </Tabs>
      </Box>
      
      {/* Tab panels */}
    </Box>
  );
}
```
```

### Prompt 14: Testing Implementation >>>>> NOT IMPLEMENTED AS OF 26.05.2025

```
I need to create comprehensive tests for our newsletter sending feature. Please create the following test files:

1. `/src/tests/email-hashing.test.ts`:
   - Unit tests for email validation
   - Unit tests for email hashing
   - Unit tests for salt generation
   - Mock the Prisma client for database operations

2. `/src/tests/newsletter-sending.test.ts`:
   - Unit tests for email batch processing
   - Integration tests for sending newsletters
   - Mock the email sending function for testing
   - Test error handling scenarios

3. `/src/tests/NewsletterSendingForm.test.tsx`:
   - Component tests for the multi-step form
   - Test form submissions and validation
   - Test transitions between steps
   - Mock API calls

4. `/src/tests/newsletter-archive.test.ts`:
   - Tests for saving and retrieving newsletters
   - Tests for listing newsletters with pagination
   - Mock the Prisma client

Use our existing testing patterns with Jest and React Testing Library. Here's how we typically structure our tests:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeRegistry } from '@/theme/ThemeRegistry';
import { mockComponent } from '@/tests/test-utils';
// Import component under test

// Mock dependencies
jest.mock('@/lib/api', () => ({
  // Mock implementation
}));

describe('ComponentName', () => {
  beforeEach(() => {
    // Setup
  });
  
  afterEach(() => {
    // Cleanup
    jest.clearAllMocks();
  });
  
  it('should render correctly', () => {
    render(
      <ThemeRegistry>
        <ComponentUnderTest />
      </ThemeRegistry>
    );
    
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
  
  // More test cases...
});
```
```