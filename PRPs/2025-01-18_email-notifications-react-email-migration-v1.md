name: "Email Notifications React Email Migration v1"
description: |
  Migrate all email notifications from inline HTML to React Email components with reusable components following DRY principles.

## Goal
Migrate all email notifications in `src/lib/email-notifications.ts` to React Email approach, create reusable components in `src/emails/components/`, eliminate the complex `src/emails/utils/styles.ts`, and ensure all notification emails have consistent branding with logo from database.

## Why
- **Better maintainability**: React Email components are easier to maintain than inline HTML strings
- **Consistency**: All emails should follow the same patterns and styling approach
- **DRY principles**: Reusable components reduce code duplication
- **Simplified styling**: Remove complex styles.ts and use simple inline styles like newsletter.tsx
- **Brand consistency**: All notification emails should have the logo from database settings

## What
Transform the following email functions from inline HTML to React Email templates:
- `sendGroupAcceptanceEmail` → `GroupAcceptanceEmail` component
- `sendGroupRejectionEmail` → `GroupRejectionEmail` component  
- `sendGroupArchivingEmail` → `GroupArchivingEmail` component
- `sendStatusReportAcceptanceEmail` → `StatusReportAcceptanceEmail` component
- `sendStatusReportRejectionEmail` → `StatusReportRejectionEmail` component
- `sendStatusReportArchivingEmail` → `StatusReportArchivingEmail` component
- `sendAntragAcceptanceEmail` → `AntragAcceptanceEmail` component
- `sendAntragRejectionEmail` → `AntragRejectionEmail` component

### Success Criteria
- [ ] All 8 email notification functions migrated to React Email
- [ ] Reusable components created for common patterns
- [ ] Complex styles.ts removed
- [ ] All emails include logo from database settings
- [ ] Existing email sending functionality preserved
- [ ] All tests passing

## All Needed Context

### Documentation & References
```yaml
# React Email Documentation
- url: https://react.email/docs/introduction
  why: Core React Email patterns and best practices
  critical: Email client compatibility patterns

- url: https://react.email/docs/components/html
  why: HTML structure and email client compatibility
  critical: Proper email HTML structure

# Best Practice Examples in Codebase
- file: src/emails/newsletter.tsx
  why: Good example of simple styles and database integration
  critical: Shows how to get logo from database settings

- file: src/emails/example/apple.tsx
  why: Shows React Email best practices and patterns
  critical: Proper component structure and styling approach

- file: src/emails/antrag-submission.tsx
  why: Shows existing notification email pattern
  critical: Structure for notification emails

- file: src/emails/components/EmailWrapper.tsx
  why: Base wrapper component for all emails
  critical: Consistent HTML structure

- file: src/emails/components/Header.tsx
  why: Header component with logo handling
  critical: Logo positioning and database integration

- file: src/emails/components/Footer.tsx
  why: Footer component for notifications
  critical: Consistent footer across all emails
```

### Current Codebase Structure
```bash
src/
├── emails/
│   ├── components/
│   │   ├── EmailWrapper.tsx ✓ (reusable)
│   │   ├── Header.tsx ✓ (has logo from DB)
│   │   ├── Footer.tsx ✓ (reusable)
│   │   └── Button.tsx ✓ (reusable)
│   ├── utils/
│   │   └── styles.ts ❌ (to be removed)
│   ├── newsletter.tsx ✓ (good example)
│   └── antrag-submission.tsx ✓ (existing pattern)
├── lib/
│   ├── email-notifications.ts ❌ (to be removed)
│   └── email-render.ts ✓ (update to support new templates)
└── types/
    └── email-types.ts (new - for notification props)
```

### Desired Codebase Structure  
```bash
src/
├── emails/
│   ├── components/
│   │   ├── EmailWrapper.tsx ✓
│   │   ├── NotificationHeader.tsx 🆕 (logo only, no banner)
│   │   ├── Footer.tsx ✓
│   │   ├── Button.tsx ✓
│   │   ├── StatusSection.tsx 🆕 (success/error/info styles)
│   │   ├── DetailsList.tsx 🆕 (key-value pairs)
│   │   └── InfoBox.tsx 🆕 (highlighted information)
│   ├── notifications/
│   │   ├── group-acceptance.tsx 🆕
│   │   ├── group-rejection.tsx 🆕
│   │   ├── group-archiving.tsx 🆕
│   │   ├── status-report-acceptance.tsx 🆕
│   │   ├── status-report-rejection.tsx 🆕
│   │   ├── status-report-archiving.tsx 🆕
│   │   ├── antrag-submission.tsx ✓
│   │   ├── antrag-acceptance.tsx 🆕
│   │   └── antrag-rejection.tsx 🆕
│   ├── newsletter.tsx ✓
├── lib/
│   ├── email-render.ts ✓ (updated)
│   └── email-senders.ts 🆕 (new clean email sending functions)
└── types/
    └── email-types.ts 🆕 (notification email props)
```

### Known Gotchas & Library Quirks
```typescript
// CRITICAL: React Email requires proper HTML structure
// Example: All styles must be inline CSS objects, not CSS strings
// Example: Email clients don't support CSS Grid/Flexbox - use tables/columns

// CRITICAL: Database logo fetching pattern (from newsletter.tsx)
// Logo comes from Newsletter model: newsletterSettings.headerLogo
// Banner is NOT needed for notifications (only logo)

// CRITICAL: Newsletter settings access pattern
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const settings = await prisma.newsletter.findFirst();
// Use settings.headerLogo for logo, but NO banner for notifications

// CRITICAL: Email client compatibility
// - Use Row/Column instead of flex
// - Use inline styles only
// - Keep nested tables minimal
// - Test with Outlook, Gmail, Apple Mail

// CRITICAL: Proper TypeScript typing
// Never use 'any' - create proper interfaces in src/types/email-types.ts
// Use proper Prisma types: Group, StatusReport, Antrag, etc.
```

## Implementation Blueprint

### Data Models and Structure
```typescript
// src/types/email-types.ts - New file for notification email props
export interface NotificationEmailProps {
  recipientEmail: string;
  recipientName: string;
  baseUrl: string;
  headerLogo: string; // From database Newsletter settings
}

export interface GroupEmailProps extends NotificationEmailProps {
  group: GroupWithResponsiblePersons;
  statusReportFormUrl?: string;
  contactEmail?: string;
}

export interface StatusReportEmailProps extends NotificationEmailProps {
  statusReport: StatusReportWithGroup;
  reportUrl?: string;
  contactEmail?: string;
}

export interface AntragEmailProps extends NotificationEmailProps {
  antrag: Antrag;
  decisionComment?: string;
  contactEmail?: string;
}
```

### List of Tasks (in order of completion)

```yaml
Task 1: Create reusable notification components
CREATE src/emails/components/NotificationHeader.tsx:
  - MIRROR pattern from: src/emails/components/Header.tsx
  - MODIFY to only show logo (no banner)
  - USE headerLogo from database settings

CREATE src/emails/components/StatusSection.tsx:
  - SUCCESS/ERROR/INFO status indicators
  - MIRROR simple styling from newsletter.tsx
  - USE green/red/blue color scheme

CREATE src/emails/components/DetailsList.tsx:
  - Reusable key-value pairs display
  - MIRROR table structure from antrag-submission.tsx
  - USE consistent spacing and typography

CREATE src/emails/components/InfoBox.tsx:
  - Highlighted information boxes
  - MIRROR pattern from antrag-submission.tsx adminSection
  - USE consistent padding and colors

Task 2: Create TypeScript interfaces
CREATE src/types/email-types.ts:
  - DEFINE all notification email prop interfaces
  - IMPORT existing Prisma types
  - PRESERVE type safety throughout

Task 3: Create notification email templates
CREATE src/emails/notifications/group-acceptance.tsx:
  - REPLACE sendGroupAcceptanceEmail HTML
  - USE NotificationHeader, StatusSection, DetailsList
  - MIRROR structure from antrag-submission.tsx
  - INCLUDE success status indicator

CREATE src/emails/notifications/group-rejection.tsx:
  - REPLACE sendGroupRejectionEmail HTML
  - USE NotificationHeader, StatusSection, DetailsList  
  - INCLUDE error status indicator

CREATE src/emails/notifications/group-archiving.tsx:
  - REPLACE sendGroupArchivingEmail HTML
  - USE NotificationHeader, StatusSection, DetailsList
  - INCLUDE info status indicator

CREATE src/emails/notifications/status-report-acceptance.tsx:
  - REPLACE sendStatusReportAcceptanceEmail HTML
  - USE NotificationHeader, StatusSection, DetailsList
  - INCLUDE file attachments display
  - INCLUDE success status indicator

CREATE src/emails/notifications/status-report-rejection.tsx:
  - REPLACE sendStatusReportRejectionEmail HTML
  - USE NotificationHeader, StatusSection, DetailsList
  - INCLUDE error status indicator

CREATE src/emails/notifications/status-report-archiving.tsx:
  - REPLACE sendStatusReportArchivingEmail HTML
  - USE NotificationHeader, StatusSection, DetailsList
  - INCLUDE archived files display
  - INCLUDE info status indicator

CREATE src/emails/notifications/antrag-acceptance.tsx:
  - REPLACE sendAntragAcceptanceEmail HTML
  - USE NotificationHeader, StatusSection, DetailsList
  - INCLUDE decision comment display
  - INCLUDE purposes formatting (reuse from antrag-submission.tsx)
  - INCLUDE success status indicator

CREATE src/emails/notifications/antrag-rejection.tsx:
  - REPLACE sendAntragRejectionEmail HTML
  - USE NotificationHeader, StatusSection, DetailsList
  - INCLUDE decision comment display
  - INCLUDE purposes formatting
  - INCLUDE error status indicator

Task 4: Update email rendering system
MODIFY src/lib/email-render.ts:
  - ADD support for all new notification templates
  - EXTEND renderNotificationEmail function
  - MAINTAIN backward compatibility
  - ADD proper TypeScript typing

Task 5: Create new email sending functions
CREATE src/lib/email-senders.ts:
  - REPLACE all functions in email-notifications.ts
  - USE React Email rendering through email-render.ts
  - FETCH newsletter settings for logo
  - MAINTAIN same function signatures for backward compatibility
  - ADD proper error handling

Task 6: Update imports and remove old files
MODIFY all files that import from email-notifications.ts:
  - UPDATE imports to use email-senders.ts
  - PRESERVE all function signatures
  - ENSURE no breaking changes

DELETE src/lib/email-notifications.ts:
  - VERIFY all functions migrated
  - ENSURE no remaining references

DELETE src/emails/utils/styles.ts:
  - VERIFY no remaining imports
  - ENSURE all components use inline styles

Task 7: Create comprehensive tests
CREATE src/tests/email-notifications-react.test.ts:
  - TEST all 8 notification email functions
  - VERIFY React Email rendering
  - MOCK database settings
  - VERIFY email sending functionality
  - TEST error handling
```

### Per Task Pseudocode

```typescript
// Task 1: NotificationHeader.tsx
export function NotificationHeader({ logo }: { logo: string }) {
  return (
    <Section>
      <Row>
        <Column style={{ textAlign: 'center', padding: '20px' }}>
          <Img
            src={logo}
            alt="Die Linke Frankfurt Logo"
            style={{ height: '60px', width: 'auto' }}
          />
        </Column>
      </Row>
    </Section>
  );
}

// Task 5: email-senders.ts pattern
export async function sendGroupAcceptanceEmail(
  group: GroupWithResponsiblePersons
): Promise<{ success: boolean; error?: Error | string }> {
  try {
    // PATTERN: Fetch newsletter settings for logo
    const settings = await prisma.newsletter.findFirst();
    if (!settings?.headerLogo) {
      throw new Error('Newsletter settings not found');
    }
    
    // PATTERN: Prepare email props
    const emailProps: GroupEmailProps = {
      group,
      headerLogo: settings.headerLogo,
      baseUrl: getBaseUrl(),
      recipientEmail: group.responsiblePersons.map(p => p.email).join(','),
      recipientName: group.responsiblePersons.map(p => `${p.firstName} ${p.lastName}`).join(', ')
    };
    
    // PATTERN: Render with React Email
    const { render } = await import('@react-email/render');
    const GroupAcceptanceEmail = (await import('../emails/notifications/group-acceptance')).default;
    const html = await render(GroupAcceptanceEmail(emailProps));
    
    // PATTERN: Send email
    await sendEmail({
      to: emailProps.recipientEmail,
      subject: `Ihre Gruppe "${group.name}" wurde freigeschaltet`,
      html
    });
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error : String(error) };
  }
}
```

### Integration Points
```yaml
DATABASE:
  - access: Newsletter.headerLogo for logo in all notifications
  - pattern: "const settings = await prisma.newsletter.findFirst()"
  
EMAIL_RENDERING:
  - update: src/lib/email-render.ts renderNotificationEmail function
  - add: Support for all 8 new notification templates
  
IMPORTS:
  - update: All files importing from email-notifications.ts
  - change: Import from email-senders.ts instead
  
BACKWARD_COMPATIBILITY:
  - preserve: All existing function signatures
  - maintain: Same return types and error handling
```

## Validation Loop

### Level 1: Syntax & Style
```bash
# Run these FIRST - fix any errors before proceeding
npm run lint                    # ESLint with auto-fix
npm run typecheck              # TypeScript type checking

# Expected: No errors. If errors, READ the error and fix.
```

### Level 2: Unit Tests
```typescript
// CREATE src/tests/email-notifications-react.test.ts
describe('React Email Notifications', () => {
  beforeAll(async () => {
    // Mock Newsletter settings
    (prisma.newsletter.findFirst as jest.Mock).mockResolvedValue({
      headerLogo: 'https://example.com/logo.png'
    });
  });

  it('should render group acceptance email successfully', async () => {
    const mockGroup = {
      id: 'test-group',
      name: 'Test Group',
      responsiblePersons: [
        { email: 'test@example.com', firstName: 'Test', lastName: 'User' }
      ]
    };

    const result = await sendGroupAcceptanceEmail(mockGroup);
    expect(result.success).toBe(true);
    expect(sendEmail).toHaveBeenCalledWith({
      to: 'test@example.com',
      subject: 'Ihre Gruppe "Test Group" wurde freigeschaltet',
      html: expect.stringContaining('freigeschaltet')
    });
  });

  it('should handle missing newsletter settings gracefully', async () => {
    (prisma.newsletter.findFirst as jest.Mock).mockResolvedValue(null);

    const result = await sendGroupAcceptanceEmail(mockGroup);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Newsletter settings not found');
  });

  it('should render all notification emails without errors', async () => {
    // Test all 8 notification email functions
    const emailFunctions = [
      sendGroupAcceptanceEmail,
      sendGroupRejectionEmail,
      sendGroupArchivingEmail,
      sendStatusReportAcceptanceEmail,
      sendStatusReportRejectionEmail,
      sendStatusReportArchivingEmail,
      sendAntragAcceptanceEmail,
      sendAntragRejectionEmail
    ];

    for (const emailFunction of emailFunctions) {
      const result = await emailFunction(mockData);
      expect(result.success).toBe(true);
    }
  });
});
```

```bash
# Run and iterate until passing:
npm test -- src/tests/email-notifications-react.test.ts
# If failing: Read error, understand root cause, fix code, re-run
```

### Level 3: Integration Test
```bash
# Test the email rendering manually
npm run dev

# Test email previews at:
# http://localhost:3000/admin/email-preview

# Expected: All notification emails render correctly with logo
# If error: Check browser console and server logs
```

## Final Validation Checklist
- [ ] All tests pass: `npm test`
- [ ] No linting errors: `npm run lint`
- [ ] No type errors: `npm run typecheck`
- [ ] Manual email preview successful: `npm run dev`
- [ ] All 8 notification emails migrated
- [ ] Complex styles.ts file removed
- [ ] All emails show database logo
- [ ] Email sending functionality preserved
- [ ] Backward compatibility maintained

---

## Anti-Patterns to Avoid
- ❌ Don't use complex CSS objects - use simple inline styles like newsletter.tsx
- ❌ Don't use the old styles.ts file - create simple inline styles
- ❌ Don't break existing email sending functionality
- ❌ Don't use any type - create proper TypeScript interfaces
- ❌ Don't forget to fetch newsletter settings for logo
- ❌ Don't use banner in notification emails - only logo
- ❌ Don't ignore email client compatibility (use Row/Column, not flex)
- ❌ Don't hardcode email content - use proper props and database data
- ❌ Don't skip error handling in email sending functions
- ❌ Don't forget to update email-render.ts for new templates