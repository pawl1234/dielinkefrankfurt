# Newsletter Sending Feature Specification

## Overview
This document outlines the requirements and implementation details for extending the Newsletter Module in the Admin interface to support sending emails to recipients. The feature will allow administrators to send newsletters to a large number of recipients while maintaining data privacy through email hashing.

## Core Requirements

### Data Privacy
- Email recipients should not be stored in plaintext in the application database
- Emails will be stored in a hashed format (SHA-256 with salt)
- The salt will be generated and stored internally in the application

### Configuration
- All newsletter sending settings should be configurable via the existing "Einstellungen" menu, including:
  - Batch size (default: 100 emails per batch)
  - Email subject template
  - Sending email address
  - "From" display name
  - "Reply-to" email address
  - Delay between batches

### Sending Workflow
1. Admin pastes a list of recipient emails (newline-separated, approx. 1500 recipients) into a text field
2. System validates and extracts email addresses from the input
3. System displays validation results:
   - Total number of extracted email addresses
   - Number of new vs. existing recipients (compared to hashed records)
   - Warnings for any improperly formatted emails
4. Confirmation modal appears with message: "Sind sie sich sicher, dass der Newsletter so verschickt werden soll?"
5. Upon confirmation, system sends individual emails to each recipient

### Newsletter Archives
- A snapshot of each sent newsletter should be stored in the application
- Archives should be accessible via unique, hard-to-guess URLs (UUID-based)
- Only the admin interface should have a listing of all sent newsletters
- Public access to individual newsletters is allowed, but only via direct URL

## Technical Implementation

### Email Hashing
- Use SHA-256 with a salt for hashing email addresses
- Salt will be generated once and stored internally in the application
- Implement functions to hash and verify emails against stored hashes

### Email Sending
- Leverage existing Nodemailer setup
- Send individual emails to each recipient (not one email with all recipients)
- Implement batch sending (100 emails per batch)
- Add small delays between batches to avoid overwhelming the SMTP server
- Run as a background job that doesn't require admin supervision

### Email Tracking (Future Enhancement)
- System should be designed to support both pixel tracking and link tracking
- Implementation details for tracking to be addressed in a future phase

### User Interface
- Multi-step form with "Back" and "Next" buttons
- No visual step indicators needed
- Confirmation via modal dialog
- Reuse existing SearchFilterBar implementation for the newsletter archives list

### Database Schema

#### NewsletterSettings Table
- id: Primary key
- batchSize: Number of emails to send in each batch (default: 100)
- batchDelay: Delay in milliseconds between batches
- fromEmail: Email address to use as the sender
- fromName: Display name to use for the sender
- replyToEmail: Reply-to email address
- subjectTemplate: Template for the email subject

#### SentNewsletter Table
- id (UUID): Primary key, also used for public URL
- sentAt: Timestamp of when the newsletter was sent
- subject: Email subject line
- recipientCount: Number of recipients the newsletter was sent to
- content: HTML content of the newsletter
- status: Status of the sending process (e.g., "completed", "failed")
- settings: JSON object containing the settings used for this newsletter (for reference)

#### HashedRecipient Table
- id: Primary key
- hashedEmail: SHA-256 hash of the email with salt
- firstSeen: Timestamp of when this recipient was first added
- lastSent: Timestamp of the last newsletter sent to this recipient

### Error Handling
- Log all delivery failures to server-side logs
- Continue attempting to send remaining emails if some fail
- Track SMTP success/failure based on return codes
- Provide summary of successful/failed sends in admin interface

## Integration with Existing Systems

### Newsletter Content
- Reuse existing newsletter generation functionality
- No changes needed to the content creation process

### Admin Interface
- Add new section for sent newsletters
- Display all tracked information about sent newsletters
- Reuse existing SearchFilterBar component for filtering/sorting

## Implementation Phases

### Phase 1: Core Functionality
1. Create database schema for newsletter settings, hashed recipients, and sent newsletters
2. Implement email hashing functionality
3. Build multi-step form UI for recipient input and validation
4. Implement email validation and recipient counting
5. Create confirmation modal
6. Build email sending service with batching
7. Implement configuration UI in the existing "Einstellungen" menu

### Phase 2: Admin Interface
1. Create sent newsletters listing in admin interface
2. Implement public URL access to sent newsletters
3. Add error reporting and logs

### Phase 3: Future Enhancements
1. Implement email tracking via pixels
2. Add link tracking
3. Create reporting dashboard for open rates

## Testing Plan

### Unit Tests
- Email validation functions
- Hashing implementation
- Batch creation logic
- Settings validation and application

### Integration Tests
- Database operations for hashed emails
- Newsletter sending workflow
- Archive creation

### End-to-End Tests
- Complete sending workflow
- Admin interface interaction
- Error handling scenarios

### Performance Testing
- Test with maximum expected recipients (1500+)
- Verify batch sending behavior
- Measure resource usage during sending process

## Security Considerations
- Ensure salt is securely stored
- Implement rate limiting for public newsletter URLs
- Validate input to prevent injection attacks
- Ensure SMTP credentials are properly secured

## Technical Requirements
- Node.js/Next.js for implementation
- Use Typescript and take care about typesafe programming
- Existing Nodemailer setup for email sending
- Database schema extensions for PostgreSQL/Prisma
- Reuse existing React components for multi-step form