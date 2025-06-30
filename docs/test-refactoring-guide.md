# Test Refactoring Guide

This guide provides step-by-step prompts for implementing comprehensive test coverage for the Die Linke Frankfurt application. Each step builds on the previous ones, ensuring incremental progress without complexity jumps.

## Prerequisites

- Existing test infrastructure in `src/tests/test-utils.ts`
- Jest setup files (`jest.setup.js`, `jest.setup.api.js`)
- Factory pattern in `src/tests/factories/newsletter.factory.ts`

## Phase 1: Enhanced Test Infrastructure

### Step 1: Create Enhanced Test Factories

**Prompt:**
```
I need to enhance the test factories for comprehensive testing. Please create factory functions in `src/tests/factories/` for the following models:

1. `appointment.factory.ts` - Create factory for Appointment model with:
   - createMockAppointment() function
   - Support for all appointment fields including fileUrls
   - Various status states (NEW, ACTIVE, REJECTED)
   - Helper for creating appointments with dates in future/past

2. `group.factory.ts` - Create factory for Group model with:
   - Reuse existing createMockGroup from test-utils.ts
   - Add createMockGroupWithResponsiblePersons()
   - Add createMockGroupSubmission() for form data

3. `status-report.factory.ts` - Create factory for StatusReport model with:
   - Reuse existing createMockStatusReport from test-utils.ts
   - Add createMockStatusReportWithFiles()
   - Add createMockStatusReportSubmission() for form data

Each factory should follow the pattern in newsletter.factory.ts and use proper TypeScript types from Prisma. Include realistic default data.
```

### Step 2: Build Test Helpers for Common Workflows

**Prompt:**
```
Create a new file `src/tests/helpers/workflow-helpers.ts` with utility functions for testing common workflows:

1. Form submission helpers:
   - submitAppointmentForm(data): Simulates appointment form submission
   - submitGroupRequestForm(data): Simulates group request submission
   - submitStatusReportForm(data): Simulates status report submission

2. Admin action helpers:
   - approveItem(type: 'appointment' | 'group' | 'statusReport', id: string)
   - rejectItem(type: 'appointment' | 'group' | 'statusReport', id: string)
   - archiveGroup(id: string)

3. File upload helpers:
   - mockFileUploadSuccess(url: string): Mocks successful file upload
   - mockFileUploadFailure(error: string): Mocks failed file upload

4. Authentication helpers:
   - loginAsAdmin(): Sets up admin authentication context
   - logoutAdmin(): Clears authentication context

Use the existing test-utils.ts patterns and ensure all helpers return promises where appropriate.
```

### Step 3: Create API Route Test Utilities

**Prompt:**
```
Create `src/tests/helpers/api-test-helpers.ts` with utilities specifically for testing API routes:

1. Request builders:
   - buildFormDataRequest(url: string, data: object, files?: File[]): Creates NextRequest with FormData
   - buildJsonRequest(url: string, method: string, data?: object): Creates NextRequest with JSON
   - buildAuthenticatedRequest(request: NextRequest): Adds auth headers

2. Response assertions:
   - assertSuccessResponse(response: Response, expectedData?: object)
   - assertValidationError(response: Response, expectedFields?: string[])
   - assertAuthenticationError(response: Response)
   - assertNotFoundError(response: Response)

3. Database helpers:
   - setupTestDatabase(): Prepares test data
   - cleanupTestDatabase(): Cleans up after tests
   - assertDatabaseState(model: string, id: string, expectedState: object)

4. Email assertion helpers:
   - assertEmailSent(to: string, subject?: string)
   - assertNoEmailsSent()
   - getLastSentEmail()

Build on existing patterns from test-utils.ts and ensure TypeScript type safety throughout.
```

## Phase 2: Form Submission Tests

### Step 4: Test Appointment Form Submission Workflow

**Prompt:**
```
Create comprehensive tests for the appointment submission workflow in `src/tests/workflows/appointment-submission.test.ts`:

1. Test successful appointment submission:
   - Valid form data with all required fields
   - Optional fields (location, organizer info)
   - File attachments (using mock file upload)
   - Verify database record creation
   - Check initial status is 'NEW'

2. Test validation scenarios:
   - Missing required fields (title, mainText, dates)
   - Invalid date ranges (end before start)
   - File size/type validation
   - XSS prevention in rich text content

3. Test the complete API flow:
   - POST to /api/submit-appointment
   - Verify response structure
   - Check database state
   - Ensure no emails sent for new submissions

4. Test error handling:
   - Database connection failures
   - File upload failures
   - Server errors

Use the factories and helpers created in previous steps. Follow the existing test patterns from the codebase.
```

### Step 5: Test Group Request Form Submission Workflow

**Prompt:**
```
Create tests for group request submission in `src/tests/workflows/group-submission.test.ts`:

1. Test successful group submission:
   - Complete form with responsible persons
   - Logo upload with cropping
   - Multiple responsible persons
   - Verify database records (group + responsible persons)
   - Check slug generation

2. Test validation:
   - Required fields (name, description, responsible person)
   - Valid email formats for responsible persons
   - Duplicate group name handling
   - Logo file type/size validation

3. Test the API endpoint:
   - POST to /api/groups/submit
   - Transaction rollback on partial failure
   - Response includes created group data

4. Test responsible person management:
   - Adding/removing responsible persons
   - Minimum one person required
   - Email validation for each person

Use existing patterns and ensure proper cleanup of uploaded files in tests.
```

### Step 6: Test Status Report Form Submission Workflow

**Prompt:**
```
Create tests for status report submission in `src/tests/workflows/status-report-submission.test.ts`:

1. Test successful submission:
   - Valid group selection
   - Rich text content
   - Multiple file attachments
   - Verify linkage to correct group
   - Check initial status

2. Test group validation:
   - Only active groups can receive reports
   - Archived/rejected groups blocked
   - Non-existent group handling

3. Test the submission API:
   - POST to /api/status-reports/submit
   - Proper error messages
   - File URL storage as JSON

4. Test file handling:
   - Multiple file uploads
   - Mixed file types (images, PDFs)
   - File count limits
   - Cleanup on submission failure

Follow the established patterns and reuse the test infrastructure.
```

## Phase 3: Admin Approval Tests

### Step 7: Test Appointment Approval Process

**Prompt:**
```
Create admin approval tests in `src/tests/workflows/appointment-approval.test.ts`:

1. Test approval flow:
   - Authenticate as admin
   - PUT to /api/admin/appointments/[id]
   - Change status from NEW to ACTIVE
   - Set processingDate
   - Verify database update

2. Test rejection flow:
   - Change status to REJECTED
   - Add rejection reason
   - Verify no public visibility

3. Test bulk operations:
   - Approve multiple appointments
   - Feature highlighting
   - Date filtering for processing

4. Test authorization:
   - Unauthenticated requests blocked
   - Non-admin users rejected
   - CORS handling

Use withAdminAuth patterns and existing authentication helpers.
```

### Step 8: Test Group Approval/Rejection Process

**Prompt:**
```
Create group management tests in `src/tests/workflows/group-approval.test.ts`:

1. Test approval with notifications:
   - PUT to /api/admin/groups/[id]
   - Status change to ACTIVE
   - Email sent to ALL responsible persons
   - Verify email content includes group details

2. Test rejection flow:
   - Status change to REJECTED
   - Optional rejection reason
   - No email notifications

3. Test archiving:
   - Active groups can be archived
   - Email notification to responsible persons
   - Associated status reports remain accessible

4. Test editing:
   - Update group details
   - Manage responsible persons (add/remove)
   - Logo updates

Assert email sending using the email assertion helpers.
```

### Step 9: Test Status Report Approval Process

**Prompt:**
```
Create status report approval tests in `src/tests/workflows/status-report-approval.test.ts`:

1. Test approval with notifications:
   - PUT to /api/admin/status-reports/[id]
   - Status change to ACTIVE
   - Email to group's responsible persons
   - Include report details in email

2. Test rejection:
   - Status change to REJECTED
   - No public visibility
   - No email notifications

3. Test editing:
   - Update report content
   - Manage file attachments
   - Maintain group association

4. Test constraints:
   - Cannot approve reports for inactive groups
   - Archived groups' reports remain visible
   - Proper date handling

Verify all email notifications and database state changes.
```

## Phase 4: Newsletter Core Tests

### Step 10: Test Newsletter Content Generation

**Prompt:**
```
Create newsletter generation tests in `src/tests/newsletter/generation.test.ts`:

1. Test content aggregation:
   - Fetch appointments (featured first, then by date)
   - Fetch status reports (last 2 weeks)
   - Group reports by organization
   - Include group logos and names

2. Test HTML generation:
   - Proper template structure
   - Dynamic content insertion
   - Image URL fixing (relative to absolute)
   - Footer with unsubscribe link

3. Test the generation API:
   - POST to /api/admin/newsletter/generate
   - Include selected appointments
   - Include selected status reports
   - Return preview HTML

4. Test edge cases:
   - No appointments/reports available
   - Very long content truncation
   - Special characters in content

Use existing newsletter factory and service mocks.
```

### Step 11: Test BCC Chunk Sending Mechanism

**Prompt:**
```
Create BCC chunk sending tests in `src/tests/newsletter/bcc-sending.test.ts`:

1. Test chunk creation:
   - Split recipients into chunks of configured size
   - Single BCC field per chunk
   - Proper recipient formatting

2. Test sending process:
   - POST to /api/admin/newsletter/send-chunk
   - Process one chunk at a time
   - Update progress after each chunk
   - Handle partial failures

3. Test the sending API:
   - Validate chunk parameters
   - Create transporter per chunk
   - Close transporter after sending
   - Record results

4. Test failure handling:
   - Transporter creation failures
   - Network timeouts
   - Invalid email addresses
   - Retry mechanism triggers

Mock the email transporter and assert proper cleanup.
```

### Step 12: Test Newsletter Retry Functionality

**Prompt:**
```
Create retry mechanism tests in `src/tests/newsletter/retry-mechanism.test.ts`:

1. Test retry triggers:
   - Failed chunks marked for retry
   - POST to /api/admin/newsletter/retry-chunk
   - Only retry failed recipients
   - Maintain attempt counter

2. Test retry process:
   - Filter out successful sends
   - Create new transporter
   - Update chunk results
   - Merge with previous results

3. Test retry limits:
   - Maximum retry attempts
   - Exponential backoff
   - Final failure handling
   - Admin notifications

4. Test state management:
   - Persist retry state
   - Resume after interruption
   - Accurate progress tracking
   - Prevent duplicate sends

Use the chunk result structures from newsletter factory.
```

## Phase 5: Integration Tests

### Step 13: End-to-End Newsletter Workflow Test

**Prompt:**
```
Create comprehensive newsletter workflow test in `src/tests/integration/newsletter-e2e.test.ts`:

1. Setup test data:
   - Create approved appointments
   - Create active groups with reports
   - Configure newsletter settings

2. Test complete workflow:
   - Generate newsletter content
   - Preview generated HTML
   - Save as draft
   - Load recipient list
   - Send in BCC chunks
   - Handle failures and retry
   - Verify completion

3. Test recipient management:
   - Email validation and deduplication
   - Hash storage for unsubscribe
   - BCC list formation
   - Progress tracking

4. Test the full cycle:
   - From content selection to delivery
   - Accurate recipient counts
   - Proper error aggregation
   - Admin notifications

This should use all previously created helpers and simulate real-world usage.
```

### Step 14: Complete Approval Workflow Integration Tests

**Prompt:**
```
Create approval workflow integration tests in `src/tests/integration/approval-workflows-e2e.test.ts`:

1. Test appointment workflow:
   - Submit new appointment
   - Admin receives notification
   - Admin approves
   - Appointment appears publicly
   - RSS feed updates

2. Test group workflow:
   - Submit group request
   - Admin reviews
   - Approval triggers email
   - Group becomes active
   - Can submit status reports

3. Test status report workflow:
   - Active group submits report
   - Admin approves
   - Email to responsible persons
   - Report appears on group page
   - Included in newsletter

4. Test cascading effects:
   - Archiving group affects reports
   - Rejected items don't appear
   - Proper status transitions
   - Email audit trail

Verify the complete lifecycle of each entity type.
```

### Step 15: Email Notification Integration Tests

**Prompt:**
```
Create email notification tests in `src/tests/integration/email-notifications-e2e.test.ts`:

1. Test all email triggers:
   - Group approval emails
   - Group archival emails
   - Status report approval emails
   - Newsletter test emails
   - Admin notifications

2. Test email content:
   - Correct recipient lists
   - Proper templating
   - Valid links
   - Unsubscribe options

3. Test failure handling:
   - SMTP connection failures
   - Invalid addresses
   - Retry logic
   - Fallback behavior

4. Test email configuration:
   - Different SMTP providers
   - Authentication
   - TLS/SSL settings
   - Rate limiting

Ensure comprehensive coverage of all email scenarios in the application.
```

## Implementation Guidelines

### For Each Step:

1. **Start with the test file creation**
2. **Import necessary dependencies and helpers**
3. **Set up test suites with proper descriptions**
4. **Implement test cases incrementally**
5. **Run tests to ensure they pass**
6. **Refactor for clarity and reusability**

### Best Practices:

1. **Use descriptive test names** that explain the scenario
2. **Follow AAA pattern**: Arrange, Act, Assert
3. **Clean up after each test** (database, files, mocks)
4. **Group related tests** in describe blocks
5. **Mock external dependencies** consistently
6. **Assert both success and error cases**
7. **Use beforeEach/afterEach** for common setup/teardown

### Running Tests:

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- appointment-submission.test.ts

# Run in watch mode
npm run test:watch

# Run API tests only
npm run test:api
```

### Coverage Goals:

- **Minimum 80% coverage** for critical paths
- **100% coverage** for API routes
- **Focus on user journeys** not just units
- **Integration over isolation** where valuable

## Progress Tracking

Create a `test-coverage-progress.md` file to track implementation:

```markdown
# Test Coverage Progress

## Phase 1: Infrastructure ✅
- [x] Step 1: Enhanced factories
- [x] Step 2: Workflow helpers  
- [x] Step 3: API test utilities

## Phase 2: Form Submissions 🚧
- [ ] Step 4: Appointment submission
- [ ] Step 5: Group submission
- [ ] Step 6: Status report submission

## Phase 3: Admin Approvals ⏳
- [ ] Step 7: Appointment approval
- [ ] Step 8: Group approval
- [ ] Step 9: Status report approval

## Phase 4: Newsletter Core ⏳
- [ ] Step 10: Content generation
- [ ] Step 11: BCC sending
- [ ] Step 12: Retry mechanism

## Phase 5: Integration ⏳
- [ ] Step 13: Newsletter E2E
- [ ] Step 14: Approval E2E
- [ ] Step 15: Email E2E
```

Update this file as you complete each step to maintain visibility of progress.