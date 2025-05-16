# Implementation Blueprint for Groups and Status Reports

This document provides a detailed, step-by-step plan for implementing the Groups and Status Reports feature for Die Linke Frankfurt's website. The plan is organized into small, iterative chunks that build on each other, ensuring safe and testable implementations at each stage.

## Planning Approach

1. Break down implementation into logical phases that follow the specification's phases
2. Further divide each phase into smaller steps that can be implemented and tested independently
3. Ensure each step builds on previous work with no orphaned code
4. Prioritize database and API foundations before UI components
5. Implement test-driven development at each stage

## Implementation Phases and Steps

### Phase 1: Database and Backend Foundations

#### Step 1.1: Database Schema Setup

```
# Prompt 1: Database Schema Setup for Groups Feature

You're implementing a new Groups and Status Reports feature for a Next.js application with Prisma ORM.

Begin by examining the existing Prisma schema to understand the structure, then implement the database models for Groups and Status Reports according to the specification. Focus only on the database schema in this step.

1. Add the Group, ResponsiblePerson, and StatusReport models with all specified fields
2. Define the necessary enums for GroupStatus and StatusReportStatus
3. Set up proper relations between models
4. Add appropriate indexes as specified
5. Ensure cascade deletion is properly configured

Follow existing code style and patterns. Don't make other changes to the schema.

Create a migration script to apply these changes to the database.

## Existing Project Structure
The project uses Next.js 15 with App Router, TypeScript, and Prisma ORM with PostgreSQL.

## Testing Requirements
1. Validate the schema with Prisma's validation tool
2. Test migrations to ensure they apply correctly
3. Verify relations work as expected with sample data
```

#### Step 1.2: Prisma Client Setup and Utility Functions

```
# Prompt 2: Prisma Client Setup and Utility Functions for Groups Feature

Now that you've created the database schema for the Groups feature, you need to implement utility functions to handle database operations.

1. Update the Prisma client setup to include the new models
2. Create utility functions in the lib folder for:
   - Creating a new group
   - Fetching groups with filtering options
   - Updating group status
   - Creating a responsible person
   - Creating a status report
   - Fetching status reports with filtering options
   - Updating status report status

Each utility function should handle validation, error catching, and follow existing patterns in the codebase.

## Existing Project Structure
The project uses Next.js 15 with App Router, TypeScript, and Prisma ORM with PostgreSQL. Utility functions are typically stored in the `/src/lib` directory.

## Testing Requirements
1. Create unit tests for each utility function
2. Test edge cases like invalid data and database errors
3. Ensure type safety with TypeScript
```

#### Step 1.3: API Authentication and Authorization

```
# Prompt 3: API Authentication for Groups and Status Reports

Now implement the authentication and authorization middleware for the new API routes related to Groups and Status Reports.

1. Examine how the existing application handles API authentication
2. Extend the middleware to protect the new admin API routes:
   - /api/admin/groups/*
   - /api/admin/status-reports/*
3. Keep public routes accessible:
   - /api/groups/*
   - /api/status-reports/submit

Use the same authentication mechanism as the existing admin routes. Make sure only authenticated admin users can access the admin routes.

## Existing Project Structure
The project uses NextAuth.js for authentication. Check the current middleware.ts file to understand how route protection is implemented.

## Testing Requirements
1. Test that unauthenticated users cannot access admin routes
2. Test that authenticated users can access admin routes
3. Test that public routes are accessible to everyone
```

### Phase 2: Group Request Feature

#### Step 2.1: Basic API Routes for Groups

```
# Prompt 4: Basic API Routes for Groups Management

Implement the core API routes for Groups management. In this step, focus on creating the following routes:

1. POST /api/groups/submit - Public endpoint for group requests
2. GET /api/admin/groups - Get all groups with filtering options
3. GET /api/admin/groups/[id] - Get specific group details

Each route should:
- Use the utility functions created earlier
- Implement proper error handling
- Return appropriate status codes
- Include TypeScript types for request/response
- Follow existing API route patterns in the codebase

Don't implement file uploads or email notifications yet - we'll add those in later steps.

## Existing Project Structure
API routes are defined in /src/app/api/ directory following Next.js App Router conventions.

## Testing Requirements
1. Create unit tests for each API route
2. Test with valid and invalid data
3. Verify that authentication works correctly
```

#### Step 2.2: Group Logo Upload Functionality

```
# Prompt 5: Group Logo Upload Functionality

Implement the functionality for uploading and storing group logos using Vercel Blob Storage. This builds on the existing file upload system in the project.

1. Create a utility function for uploading and processing group logos
2. Implement file validation (type, size limits)
3. Set up unique path generation based on timestamp
4. Add a cropping feature similar to existing appointment images
5. Ensure proper error handling for failed uploads

Study the existing file upload system in the project to follow the same patterns and reuse components where appropriate.

## Existing Project Structure
The project uses Vercel Blob Storage for file uploads. Check how the appointment uploads are implemented.

## Testing Requirements
1. Test file upload with valid image files
2. Test rejection of invalid file types and oversized files 
3. Test error handling when storage is unavailable
4. Verify image URLs are correctly stored
```

#### Step 2.3: Complete Group API Routes

```
# Prompt 6: Complete Group API Routes

Now implement the remaining API routes for Groups management:

1. PUT /api/admin/groups/[id] - Update group details
2. PUT /api/admin/groups/[id]/status - Update group status
3. DELETE /api/admin/groups/[id] - Delete a group
4. GET /api/groups - Get all active groups (public)
5. GET /api/groups/[slug] - Get specific group with its active reports (public)

Each route should:
- Handle file uploads for the update route
- Implement proper validation
- Use database transactions where needed for related operations
- Follow RESTful practices
- Include appropriate error handling

## Existing Project Structure
API routes are defined in /src/app/api/ directory following Next.js App Router conventions.

## Testing Requirements
1. Test all CRUD operations
2. Verify proper handling of related records
3. Test validation and error responses
4. Test file handling in updates
```

#### Step 2.4: Email Notification System for Groups

```
# Prompt 7: Email Notification System for Groups

Implement the email notification system for group status changes:

1. Create email templates for:
   - Group acceptance notification
   - Group archiving notification
2. Implement email sending functions that:
   - Accept group data and generate appropriate emails
   - Send emails to all responsible persons
   - Handle email validation and errors
3. Integrate these functions with the status change API routes

Use the existing email system in the project and follow the same patterns.

## Existing Project Structure
The project uses Nodemailer for email sending. Check the existing email.ts file for patterns.

## Testing Requirements
1. Test email generation with various group data
2. Verify all template variables are properly replaced
3. Test email sending to multiple recipients
4. Test error handling for email failures
```

#### Step 2.5: Group Request Form Component

```
# Prompt 8: Group Request Form Component

Implement the public Group Request Form component:

1. Create a new page at /neue-gruppe
2. Implement the form with all required fields:
   - Group Name
   - Description (Rich Text)
   - Logo Upload
   - Responsible Persons (with add/remove functionality)
3. Add client-side validation for all fields
4. Implement form submission to the API
5. Add success/error messages
6. Create relevant sub-components

Use Material UI components and follow the existing design system. Utilize the existing rich text editor component.

## Existing Project Structure
Check existing form components like AppointmentForm.tsx for patterns. Use React Hook Form for form handling.

## Testing Requirements
1. Test form validation
2. Test file upload integration
3. Test form submission with various data
4. Test add/remove functionality for responsible persons
5. Test error handling and user feedback
```

#### Step 2.6: Group Logo Component

```
# Prompt 9: Group Logo Component with Cropping

Create a reusable Group Logo component with cropping functionality:

1. Implement an image upload component with preview
2. Add cropping functionality similar to existing cover image upload
3. Handle file validation and size constraints
4. Integrate with the form component
5. Ensure responsive design

Use the existing CoverImageUpload component as a reference and follow the same patterns.

## Existing Project Structure
Check the existing FileUpload.tsx and CoverImageUpload.tsx components for patterns.

## Testing Requirements
1. Test file selection and preview
2. Test image cropping functionality
3. Test integration with form submission
4. Test responsive behavior
```

#### Step 2.7: Admin Group Dashboard

```
# Prompt 10: Admin Group Dashboard

Implement the admin dashboard for managing groups:

1. Create a new page at /admin/groups
2. Implement filtering by status (New, Active, Archived)
3. Add sorting options (name, creation date)
4. Create a table or grid view of groups with key information
5. Implement action buttons for:
   - Viewing details
   - Accepting new groups
   - Editing groups
   - Archiving groups
   - Deleting archived groups
6. Add confirmation dialogs for destructive actions

Use Material UI components and follow the existing admin interface design.

## Existing Project Structure
Check the existing admin dashboard components for patterns. Follow the same layout and styling.

## Testing Requirements
1. Test filtering and sorting functionality
2. Test all action buttons and confirm they trigger the correct API calls
3. Test authentication and protected routes
4. Test responsive design
```

#### Step 2.8: Group Edit Component

```
# Prompt 11: Group Edit Component

Create a component for editing group details:

1. Implement a form similar to the group request form but pre-filled with existing data
2. Add functionality to update all group fields
3. Include logo recropping option
4. Implement add/remove functionality for responsible persons
5. Add validation for all fields
6. Connect to the update API route
7. Show appropriate success/error messages

## Existing Project Structure
This should follow similar patterns to other edit forms in the admin interface.

## Testing Requirements
1. Test form initialization with existing data
2. Test validation and submission
3. Test handling of responsible persons (adding/removing)
4. Test logo recropping
5. Test error handling and feedback
```

#### Step 2.9: Public Group Pages

```
# Prompt 12: Public Group Pages

Implement the public pages for viewing groups:

1. Create the main listing page at /gruppen
2. Create the individual group page at /gruppen/[slug]
3. Implement the group listing with:
   - Alphabetical sorting
   - Group logo, name, and description excerpt
   - Link to individual group page
4. Implement the individual group page with:
   - Group logo and name
   - Full description
   - Placeholder for status reports (to be added later)
5. Ensure responsive designs for all screen sizes

Use Material UI components and follow the existing public page design.

## Existing Project Structure
Follow patterns from existing public pages in the application.

## Testing Requirements
1. Test page routing and parameter handling
2. Test data fetching and rendering
3. Test responsive layouts
4. Test handling of special characters in slugs
```

### Phase 3: Status Report Feature

#### Step 3.1: Basic API Routes for Status Reports

```
# Prompt 13: Basic API Routes for Status Reports

Implement the core API routes for Status Reports:

1. POST /api/status-reports/submit - Public endpoint for status report submission
2. GET /api/admin/status-reports - Get all reports with filtering options
3. GET /api/admin/status-reports/[id] - Get specific report details

Each route should:
- Use the utility functions created earlier
- Implement proper error handling
- Return appropriate status codes
- Include TypeScript types for request/response
- Follow existing API route patterns

Don't implement file uploads yet - we'll add those in the next step.

## Existing Project Structure
API routes are defined in /src/app/api/ directory following Next.js App Router conventions.

## Testing Requirements
1. Create unit tests for each API route
2. Test with valid and invalid data
3. Verify that authentication works correctly
```

#### Step 3.2: Status Report File Upload Functionality

```
# Prompt 14: Status Report File Upload Functionality

Implement the functionality for uploading and storing status report file attachments:

1. Create a utility function for uploading multiple files
2. Implement validation for:
   - File types
   - Individual file size
   - Combined size limit (5MB total)
   - Maximum number of files (5)
3. Set up unique path generation based on timestamp
4. Ensure proper error handling for failed uploads
5. Store file URLs as a JSON string in the database

Study the existing file upload system and adapt it for multiple file uploads.

## Existing Project Structure
The project uses Vercel Blob Storage for file uploads. Check how the appointment uploads are implemented.

## Testing Requirements
1. Test multiple file uploads
2. Test validation of file types, sizes, and counts
3. Test error handling
4. Verify file URLs are correctly stored as JSON
```

#### Step 3.3: Complete Status Report API Routes

```
# Prompt 15: Complete Status Report API Routes

Implement the remaining API routes for Status Reports:

1. PUT /api/admin/status-reports/[id] - Update report details
2. PUT /api/admin/status-reports/[id]/status - Update report status
3. DELETE /api/admin/status-reports/[id] - Delete a report
4. GET /api/groups/[slug]/status-reports - Get all active reports for a group

Each route should:
- Handle file uploads for the update route
- Implement proper validation
- Use database transactions where needed for related operations
- Follow RESTful practices
- Include appropriate error handling

## Existing Project Structure
API routes are defined in /src/app/api/ directory following Next.js App Router conventions.

## Testing Requirements
1. Test all CRUD operations
2. Verify proper handling of file attachments
3. Test validation and error responses
4. Test file handling in updates
```

#### Step 3.4: Email Notifications for Status Reports

```
# Prompt 16: Email Notifications for Status Reports

Extend the email notification system to include status report notifications:

1. Create an email template for status report acceptance
2. Implement an email sending function that:
   - Accepts status report data and generates appropriate emails
   - Sends emails to all responsible persons of the associated group
   - Handles email validation and errors
3. Integrate this function with the status change API route

## Existing Project Structure
Build upon the email notification system created in Step 2.4.

## Testing Requirements
1. Test email generation with various report data
2. Verify all template variables are properly replaced
3. Test email sending to multiple recipients
4. Test error handling for email failures
```

#### Step 3.5: Status Report Submission Form

```
# Prompt 17: Status Report Submission Form

Implement the public Status Report submission form:

1. Create a new page at /gruppen-bericht
2. Implement the form with all required fields:
   - Group selection dropdown (active groups only)
   - Report Title
   - Status Report content (Rich Text with character limit)
   - Reporter Information (First Name, Last Name)
   - File Upload (multiple files)
3. Add client-side validation for all fields
4. Implement form submission to the API
5. Add success/error messages

Use Material UI components and follow the existing design system. Use the existing rich text editor with a character limit.

## Existing Project Structure
Check existing form components like AppointmentForm.tsx for patterns. Use React Hook Form for form handling.

## Testing Requirements
1. Test form validation including character limits
2. Test file upload for multiple files
3. Test group dropdown population
4. Test form submission with various data
5. Test error handling and user feedback
```

#### Step 3.6: Admin Status Report Dashboard

```
# Prompt 18: Admin Status Report Dashboard

Implement the admin dashboard for managing status reports:

1. Create a new page at /admin/status-reports
2. Implement filtering by:
   - Status (New, Active, Archived)
   - Group
3. Add sorting options (date, title)
4. Create a table view of reports with key information
5. Implement action buttons for:
   - Viewing details
   - Accepting new reports
   - Editing reports
   - Archiving reports
   - Deleting archived reports
6. Add confirmation dialogs for destructive actions

Use Material UI components and follow the existing admin interface design.

## Existing Project Structure
Check the existing admin dashboard components for patterns. Follow the same layout and styling.

## Testing Requirements
1. Test filtering and sorting functionality
2. Test all action buttons and confirm they trigger the correct API calls
3. Test authentication and protected routes
4. Test responsive design
```

#### Step 3.7: Status Report Edit Component

```
# Prompt 19: Status Report Edit Component

Create a component for editing status reports:

1. Implement a form similar to the submission form but pre-filled with existing data
2. Add functionality to update all report fields
3. Implement add/remove functionality for file attachments
4. Add validation for all fields
5. Connect to the update API route
6. Show appropriate success/error messages

## Existing Project Structure
This should follow similar patterns to other edit forms in the admin interface.

## Testing Requirements
1. Test form initialization with existing data
2. Test validation and submission
3. Test handling of file attachments (adding/removing)
4. Test error handling and feedback
```

#### Step 3.8: Status Report Integration with Group Pages

```
# Prompt 20: Status Report Integration with Group Pages

Update the individual group page to display status reports:

1. Modify the /gruppen/[slug] page to fetch and display active status reports
2. Implement chronological sorting (newest first)
3. Display for each report:
   - Title
   - Full content
   - Reporter name
   - Submission date
   - File attachments with download links
4. Add clear visual separation between reports
5. Ensure responsive design for all screen sizes

## Existing Project Structure
Build upon the group pages created in Step 2.9.

## Testing Requirements
1. Test data fetching and rendering
2. Test file attachment display and download
3. Test empty state (when no reports exist)
4. Test responsive layout
```

### Phase 4: Newsletter Integration

#### Step 4.1: Newsletter Generator Component Update

```
# Prompt 21: Newsletter Generator Component Update

Update the newsletter generator to include group status reports:

1. Modify the NewsletterGenerator component to fetch recent status reports (last 2 weeks)
2. Group the reports by organization in alphabetical order
3. Implement the UI for displaying:
   - Group logo and name as section headers
   - Each status report with:
     - Report title
     - First 300 characters or 5 lines of content
     - "Mehr Infos" button with link
     - Report date
4. Add clear visual separation between groups and between reports
5. Ensure the design is consistent with the existing newsletter style

## Existing Project Structure
Build upon the existing NewsletterGenerator.tsx component.

## Testing Requirements
1. Test data fetching with various time ranges
2. Test grouping and sorting logic
3. Test content truncation
4. Test visual rendering in the newsletter
5. Test integration with the existing newsletter generation system
```

#### Step 4.2: Newsletter Template Update

```
# Prompt 22: Newsletter Template Update for Status Reports

Update the newsletter email template to incorporate the status reports section:

1. Modify the email template to include the new section
2. Ensure consistent styling with the rest of the newsletter
3. Optimize the HTML for email clients
4. Test the rendering in various email clients

## Existing Project Structure
Check the existing email templates and newsletter generation code.

## Testing Requirements
1. Test rendering in multiple email clients
2. Test with various numbers of groups and reports
3. Test responsive behavior on different screen sizes
4. Test all links to ensure they work correctly
```

### Phase 5: Testing and Refinement

#### Step 5.1: End-to-End Testing

```
# Prompt 23: End-to-End Testing Setup

Create comprehensive end-to-end tests for the Groups and Status Reports features:

1. Set up test scenarios for:
   - Group request submission flow
   - Status report submission flow
   - Admin workflows for both features
   - Email notifications
   - File uploads and storage
2. Implement tests using the project's testing framework
3. Create test data generation utilities
4. Set up mock services where needed (email, file storage)

## Existing Project Structure
Check the existing test files in /src/tests/ to understand the testing approach.

## Testing Requirements
1. Coverage of all major user flows
2. Testing of edge cases and error scenarios
3. Verification of integration points
4. Tests for both client and server components
```

#### Step 5.2: Error Handling Improvements

```
# Prompt 24: Error Handling Improvements

Review and enhance error handling throughout the Groups and Status Reports features:

1. Implement consistent error handling patterns
2. Add user-friendly error messages
3. Ensure proper logging for server-side errors
4. Implement retry mechanisms where appropriate
5. Add form validation improvements based on testing feedback

## Existing Project Structure
Review the existing error handling patterns in the application.

## Testing Requirements
1. Test error scenarios for all major components
2. Verify user feedback is appropriate
3. Test recovery from various error states
4. Ensure errors are properly logged
```

#### Step 5.3: Performance Optimization

```
# Prompt 25: Performance Optimization

Optimize the performance of the Groups and Status Reports features:

1. Implement data fetching optimizations:
   - Add pagination for large data sets
   - Optimize database queries
   - Add caching where appropriate
2. Optimize client-side rendering:
   - Add loading states
   - Implement virtual lists for large data sets
   - Optimize image loading
3. Improve file handling performance
4. Enhance form submission experience

## Existing Project Structure
Analyze the current performance optimization techniques used in the application.

## Testing Requirements
1. Measure performance before and after optimizations
2. Test with large data sets
3. Verify improved user experience
4. Test on different devices and network conditions
```

#### Step 5.4: Documentation Updates

```
# Prompt 26: Documentation Updates

Update project documentation to include the new Groups and Status Reports features:

1. Update README.md with feature overview
2. Update API_DOCUMENTATION.md with new endpoints
3. Update FEATURES.md with workflow descriptions
4. Update database schema documentation
5. Add inline code documentation

Ensure documentation follows the existing style and format.

## Existing Project Structure
Review the current documentation files to understand the format and style.

## Testing Requirements
1. Verify accuracy of all documentation
2. Check that all new endpoints are documented
3. Ensure workflows are clearly described
4. Validate any code examples provided
```

## Recommendations for Implementation

1. **Follow the test-driven development approach**: Write tests before implementing each feature
2. **Maintain consistent error handling**: Use the same patterns throughout for predictable behavior
3. **Leverage existing components**: Reuse and extend existing components where possible
4. **Consider accessibility**: Ensure all new features meet accessibility standards
5. **Progressive implementation**: Complete each step fully before moving to the next
6. **Regular code review**: Review completed steps against requirements
7. **Performance monitoring**: Measure performance impact as features are added

## Conclusion

This implementation blueprint provides a structured approach to building the Groups and Status Reports feature. By following these steps in sequence, the development process will be manageable, testable, and result in a high-quality feature that integrates well with the existing application.

Each step builds upon previous work, ensuring that there is no orphaned code and that the feature grows organically. The testing requirements at each step help ensure quality and reliability throughout the development process.