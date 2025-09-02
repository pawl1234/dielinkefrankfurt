# Goal

Migrate from HTML string templates to React Email library for consistent email rendering across all email clients, with an admin preview interface for development and maintain full backward compatibility with existing newsletter and notification systems.

## Why

- **Cross-Client Compatibility**: Current HTML string templates may not render consistently across Gmail, Outlook, Apple Mail, and other email clients
- **Developer Experience**: HTML string concatenation in `newsletter-template.ts` (678 lines of inline CSS) is difficult to maintain and debug
- **Component Reusability**: React Email enables component-based architecture for better code organization and reuse
- **Modern Development**: Leverage React patterns, TypeScript safety, and Next.js hot reloading for email development
- **Preview Capabilities**: Enable real-time email preview during development for faster iteration

## What

Replace current email generation functions with React Email components while preserving all existing functionality, styling, and interfaces. Create admin preview interface for development workflow enhancement.

### Success Criteria
- [ ] All existing newsletter template functionality preserved with identical visual output
- [ ] All notification email templates migrated (Antrag, Group, Status Report emails)
- [ ] Admin preview interface at `/admin/email-preview` with hot reloading
- [ ] 100% backward compatibility - no changes to function signatures or data models
- [ ] Email rendering tested and verified across Gmail, Outlook, Apple Mail
- [ ] All existing tests pass with new React Email implementation
- [ ] No performance degradation in email sending

## All Needed Context

### Documentation & References
```yaml
# MUST READ - Include these in your context window
- url: https://react.email/docs/introduction
  why: Core React Email concepts, setup, and component structure
  
- url: https://react.email/components  
  why: Available components (Container, Button, Text, HTML) and usage patterns
  
- url: https://react.email/docs/deployment
  why: Next.js integration and deployment patterns

- file: src/lib/newsletter-template.ts
  why: Current template structure (EmailTemplateParams interface, 678 lines of styling to preserve)
  critical: Function signature generateNewsletterHtml(params: EmailTemplateParams): string must remain identical

- file: src/lib/email-notifications.ts  
  why: All notification email patterns to migrate (sendAntragSubmissionEmail, sendGroupAcceptanceEmail, etc.)
  critical: All functions return { success: boolean; error?: Error | string } pattern

- file: src/lib/email.ts
  why: Email sending infrastructure and interfaces (EmailAttachment, sendEmail function)
  critical: sendEmail({ to, subject, html, attachments? }) signature must be preserved

- file: src/app/admin/page.tsx
  why: Admin interface patterns (useSession, AdminNavigation, AdminPageHeader components)

- file: src/theme/theme.ts
  why: Brand colors (#FF0000 primary red, #006473 secondary teal) and typography (Open Sans)

- docfile: docs/testing-best-practices.md
  why: Testing patterns and mocking strategies for this codebase
  critical: Never mock modules in /src/lib/ unless they directly interact with external services
```

### Current Codebase tree
```bash
src/
├── lib/
│   ├── newsletter-template.ts      # 751 lines - main migration target
│   ├── email-notifications.ts     # All notification templates  
│   ├── email.ts                   # Email sending infrastructure
│   └── newsletter-service.ts      # Newsletter generation logic
├── app/admin/
│   ├── page.tsx                   # Admin dashboard patterns
│   └── newsletter/settings/       # Newsletter settings interface
├── components/newsletter/          # Existing newsletter components
├── types/
│   ├── api-types.ts               # EmailSendResult, NewsletterSendingSettings
│   └── component-types.ts         # Component prop interfaces
├── tests/
│   ├── lib/newsletter-*.test.ts   # Newsletter testing patterns
│   ├── email-notifications.test.ts
│   └── factories/newsletter.factory.ts
```

### Desired Codebase tree with files to be added
```bash
src/
├── emails/                        # NEW: React Email components
│   ├── components/                 # Shared email components
│   │   ├── EmailWrapper.tsx       # Base email layout
│   │   ├── Header.tsx             # Newsletter header with logo/banner
│   │   ├── Footer.tsx             # Newsletter footer with unsubscribe
│   │   ├── Button.tsx             # Styled email button
│   │   └── Section.tsx            # Content section wrapper
│   ├── templates/                  # Complete email templates
│   │   ├── Newsletter.tsx         # Main newsletter template
│   │   ├── AntragSubmission.tsx   # Antrag notification
│   │   ├── GroupAcceptance.tsx    # Group approval email
│   │   └── StatusReportAcceptance.tsx
│   └── utils/                      # Email-specific utilities
│       ├── render.ts              # React Email rendering functions
│       └── styles.ts              # Shared email styles
├── app/admin/email-preview/        # NEW: Admin preview interface
│   └── page.tsx                   # Preview page with iframe
├── app/api/admin/email-preview/    # NEW: Preview API endpoints
│   └── newsletter/route.ts        # Newsletter data for preview
├── lib/
│   ├── newsletter-template.ts     # MODIFIED: Replace with React Email calls
│   ├── email-notifications.ts    # MODIFIED: Replace with React Email calls
│   └── email.ts                   # UNCHANGED: Keep existing infrastructure
```

### Known Gotchas & Library Quirks
```typescript
// CRITICAL: React Email requires specific component structure
// Example: All emails must be wrapped in <Html> and <Container> components
// Example: Inline styles preferred over CSS classes for email client compatibility

// CRITICAL: Next.js App Router requires specific import patterns
// Example: React Email components must be server-side renderable
// Example: Use renderAsync() for server-side email generation

// CRITICAL: Email client compatibility requirements
// Example: Tables for layout, not CSS flexbox (Outlook compatibility)
// Example: Inline styles, not external CSS (Gmail compatibility)
// Example: Limited CSS support - no position: absolute, transforms, etc.

// CRITICAL: Our codebase patterns to preserve
// Example: Material UI v7 Grid system: <Grid size={{ xs: 12, md: 6 }}>
// Example: Admin authentication: withAdminAuth() wrapper for API routes
// Example: Error handling: apiErrorResponse() utility for consistent errors
// Example: Newsletter settings: 78 properties in NewsletterSettings interface
// Example: Email attachments: EmailAttachment interface with Buffer content

// CRITICAL: Testing patterns
// Example: Never mock /src/lib/ modules - use real implementations
// Example: Mock external services only: Prisma, email transport, file storage
// Example: Use factories from src/tests/factories/ for test data
```

## Implementation Blueprint

### Data models and structure

Preserve all existing interfaces while adding new React Email component props:

```typescript
// PRESERVE: All existing interfaces
interface EmailTemplateParams {
  newsletterSettings: NewsletterSettings;
  introductionText: string;
  featuredAppointments: Appointment[];
  upcomingAppointments: Appointment[];
  statusReportsByGroup?: GroupWithReports[];
  baseUrl: string;
}

// NEW: React Email component props
interface NewsletterEmailProps {
  params: EmailTemplateParams;
}

interface NotificationEmailProps {
  antrag: Antrag;
  fileUrls: string[];
  adminUrl: string;
}
```

### List of tasks to be completed to fulfill the PRP in the order they should be completed

```yaml
Task 1: Install and Configure React Email
MODIFY package.json:
  - ADD "react-email": "^4.0.0"
  - ADD "@react-email/components": "^0.0.25"
  - ADD script: "email": "email dev --dir src/emails"

MODIFY next.config.ts:
  - ADD React Email webpack configuration

Task 2: Create Base Email Components
CREATE src/emails/components/EmailWrapper.tsx:
  - MIRROR pattern from: src/components/layout/ components
  - INCLUDE Html, Head, Container from @react-email/components
  - PRESERVE current responsive breakpoints and font family

CREATE src/emails/components/Header.tsx:
  - EXTRACT header logic from: src/lib/newsletter-template.ts:89-156
  - PRESERVE logo overlay on banner image styling
  - MAINTAIN red (#FF0000) brand color scheme

CREATE src/emails/components/Footer.tsx:
  - EXTRACT footer logic from: src/lib/newsletter-template.ts:689-724
  - PRESERVE unsubscribe link styling and layout

CREATE src/emails/components/Button.tsx:
  - EXTRACT button styles from: src/lib/newsletter-template.ts:45-65
  - PRESERVE hover states and responsive design

CREATE src/emails/components/Section.tsx:
  - EXTRACT section wrapper from: src/lib/newsletter-template.ts
  - MAINTAIN spacing and typography hierarchy

Task 3: Create Newsletter Template
CREATE src/emails/templates/Newsletter.tsx:
  - MIRROR structure from: src/lib/newsletter-template.ts:329-751
  - CONVERT HTML string building to React JSX
  - PRESERVE all sections: header, intro, featured events, upcoming events, status reports
  - MAINTAIN identical visual styling and responsive behavior

CREATE src/emails/utils/render.ts:
  - FUNCTION renderNewsletter(params: EmailTemplateParams): Promise<string>
  - USE renderAsync from react-email
  - HANDLE server-side rendering for Next.js

Task 4: Create Notification Email Templates  
CREATE src/emails/templates/AntragSubmission.tsx:
  - MIRROR pattern from: src/lib/email-notifications.ts:36-89
  - PRESERVE email content structure and styling
  - MAINTAIN file attachment display logic

CREATE src/emails/templates/GroupAcceptance.tsx:
  - MIRROR pattern from: src/lib/email-notifications.ts:91-142
  - PRESERVE group acceptance email styling

CREATE src/emails/templates/StatusReportAcceptance.tsx:
  - MIRROR pattern from: src/lib/email-notifications.ts:144-195
  - PRESERVE status report email styling

Task 5: Update Email Generation Functions
MODIFY src/lib/newsletter-template.ts:
  - REPLACE generateNewsletterHtml() implementation
  - PRESERVE function signature: generateNewsletterHtml(params: EmailTemplateParams): Promise<string>
  - CALL renderNewsletter() from src/emails/utils/render.ts

MODIFY src/lib/email-notifications.ts:
  - REPLACE all email HTML generation with React Email renders
  - PRESERVE all function signatures and return types
  - MAINTAIN error handling patterns

Task 6: Create Admin Preview Interface
CREATE src/app/admin/email-preview/page.tsx:
  - MIRROR pattern from: src/app/admin/page.tsx
  - USE AdminLayout, AdminNavigation, AdminPageHeader components
  - INCLUDE iframe for email preview with hot reloading

CREATE src/app/api/admin/email-preview/newsletter/route.ts:
  - FOLLOW pattern from: src/app/api/admin/ routes
  - USE withAdminAuth() wrapper for authentication
  - RETURN current newsletter data for preview

Task 7: Create Tests for React Email Components
CREATE src/tests/emails/Newsletter.test.tsx:
  - MIRROR pattern from: src/tests/lib/newsletter-template.test.ts
  - TEST component rendering with sample data
  - VERIFY HTML output matches expected structure

CREATE src/tests/emails/components.test.tsx:
  - TEST all base email components (Header, Footer, Button, Section)
  - VERIFY styling and props handling

CREATE src/tests/lib/email-render.test.ts:
  - TEST renderNewsletter() function
  - VERIFY output compatibility with existing sendEmail()

Task 8: Integration Testing and Validation
RUN all existing tests:
  - VERIFY no regressions in newsletter functionality
  - ENSURE email sending still works with new templates

MANUAL testing:
  - SEND test emails to Gmail, Outlook, Apple Mail
  - VERIFY identical visual appearance to current templates
  - TEST admin preview interface functionality
```

### Per task pseudocode as needed

```typescript
// Task 1: React Email Configuration
// next.config.ts
const nextConfig = {
  experimental: {
    esmExternals: "loose"
  },
  webpack: (config) => {
    // PATTERN: React Email webpack configuration
    config.module.rules.push({
      test: /\.tsx?$/,
      use: ['babel-loader'],
      exclude: /node_modules/
    });
    return config;
  }
};

// Task 2: Base Email Components
// src/emails/components/EmailWrapper.tsx
export function EmailWrapper({ children }: { children: React.ReactNode }) {
  // PATTERN: Use Html, Head, Body from @react-email/components
  return (
    <Html>
      <Head>
        {/* CRITICAL: Include responsive meta tags for email clients */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      <Body style={{ fontFamily: 'Open Sans, Arial, sans-serif' }}>
        <Container maxWidth="700px">
          {children}
        </Container>
      </Body>
    </Html>
  );
}

// Task 3: Newsletter Template
// src/emails/templates/Newsletter.tsx  
export function Newsletter({ params }: NewsletterEmailProps) {
  // PATTERN: Follow existing newsletter structure exactly
  return (
    <EmailWrapper>
      <Header 
        logo={params.newsletterSettings.headerLogo}
        banner={params.newsletterSettings.headerBanner}
      />
      <Section>
        <Text>{params.introductionText}</Text>
      </Section>
      {/* CRITICAL: Preserve all existing sections and styling */}
      <FeaturedEvents events={params.featuredAppointments} baseUrl={params.baseUrl} />
      <UpcomingEvents events={params.upcomingAppointments} baseUrl={params.baseUrl} />
      <StatusReports groups={params.statusReportsByGroup} baseUrl={params.baseUrl} />
      <Footer 
        text={params.newsletterSettings.footerText}
        unsubscribeLink={params.newsletterSettings.unsubscribeLink}
      />
    </EmailWrapper>
  );
}

// Task 5: Update Generation Functions
// src/lib/newsletter-template.ts
export async function generateNewsletterHtml(params: EmailTemplateParams): Promise<string> {
  // PATTERN: Preserve exact function signature for compatibility
  try {
    // CRITICAL: Use dynamic import for server-side rendering
    const { renderAsync } = await import('@react-email/render');
    const { Newsletter } = await import('../emails/templates/Newsletter');
    
    // PATTERN: Follow existing error handling
    const html = await renderAsync(<Newsletter params={params} />);
    return html;
  } catch (error) {
    // CRITICAL: Maintain existing error handling patterns
    throw new Error(`Newsletter generation failed: ${error.message}`);
  }
}
```

### Integration Points
```yaml
DATABASE:
  - schema: "No changes to prisma/schema.prisma required"
  - existing: "Use current Newsletter and NewsletterSettings models"
  
CONFIG:
  - add to: package.json
  - pattern: "Add React Email scripts and dependencies"
  
ROUTES:
  - add to: src/app/admin/email-preview/page.tsx
  - pattern: "Admin-only preview interface with authentication"
  
API_ROUTES:
  - add to: src/app/api/admin/email-preview/newsletter/route.ts  
  - pattern: "GET endpoint returning newsletter data for preview"
  
COMPONENTS:
  - add to: src/emails/components/
  - pattern: "React Email components with inline styling"
  
EMAIL_SENDING:
  - modify: src/lib/newsletter-template.ts, src/lib/email-notifications.ts
  - pattern: "Replace HTML string generation with React Email rendering"
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
// CREATE src/tests/emails/Newsletter.test.tsx
describe('Newsletter React Email Template', () => {
  it('should render newsletter with all sections', async () => {
    // PATTERN: Use existing newsletter factory
    const params = createMockEmailTemplateParams();
    
    const { Newsletter } = await import('../../emails/templates/Newsletter');
    const { render } = await import('@react-email/render');
    
    const html = await render(<Newsletter params={params} />);
    
    // VERIFY: All sections present
    expect(html).toContain(params.introductionText);
    expect(html).toContain('Featured Events');
    expect(html).toContain('Upcoming Events');
    expect(html).toContain(params.newsletterSettings.footerText);
  });

  it('should maintain responsive styling', async () => {
    // TEST: Mobile breakpoints and styling preserved
    const params = createMockEmailTemplateParams();
    const html = await renderNewsletter(params);
    
    expect(html).toContain('@media screen and (max-width: 600px)');
    expect(html).toContain('max-width: 100%');
  });

  it('should handle missing optional data gracefully', async () => {
    // EDGE CASE: Empty featured events, no status reports
    const params = createMockEmailTemplateParams({
      featuredAppointments: [],
      statusReportsByGroup: undefined
    });
    
    const html = await renderNewsletter(params);
    expect(html).not.toContain('Featured Events');
    expect(html).toBeTruthy();
  });
});

// CREATE src/tests/lib/newsletter-template-migration.test.ts
describe('Newsletter Template Migration', () => {
  it('should generate identical output to old template', async () => {
    // CRITICAL: Verify backward compatibility
    const params = createMockEmailTemplateParams();
    
    // OLD implementation (temporarily preserved)
    const oldHtml = await generateNewsletterHtmlOld(params);
    
    // NEW React Email implementation  
    const newHtml = await generateNewsletterHtml(params);
    
    // VERIFY: Core content identical (allowing for minor HTML structure differences)
    expect(normalizeEmailHtml(newHtml)).toEqual(normalizeEmailHtml(oldHtml));
  });
});
```

```bash
# Run and iterate until passing:
npm test -- src/tests/emails/
npm test -- src/tests/lib/newsletter-template
# If failing: Read error, understand root cause, fix code, re-run
```

### Level 3: Integration Test
```bash
# Test the newsletter generation
npm run dev

# Test admin preview interface
curl -H "Cookie: next-auth.session-token=ADMIN_TOKEN" \
  http://localhost:3000/admin/email-preview

# Expected: Preview page loads with newsletter iframe

# Test newsletter API endpoint
curl -H "Cookie: next-auth.session-token=ADMIN_TOKEN" \
  http://localhost:3000/api/admin/email-preview/newsletter

# Expected: {"status": "success", "data": {...newsletter params...}}

# Test email rendering
node -e "
const { generateNewsletterHtml } = require('./src/lib/newsletter-template.ts');
const params = require('./src/tests/factories/newsletter.factory.ts').createMockEmailTemplateParams();
generateNewsletterHtml(params).then(html => {
  console.log('Email length:', html.length);
  console.log('Contains header:', html.includes('header'));
  console.log('Contains footer:', html.includes('unsubscribe'));
});
"

# Expected: Valid HTML output with all sections
```

### Level 4: Cross-Client Email Testing
```bash
# Use React Email preview server
npm run email

# Open http://localhost:3000 to preview all email templates

# Manual testing checklist:
# - Gmail web/mobile: Test responsiveness and image loading
# - Outlook desktop: Test table layout compatibility  
# - Apple Mail: Test font rendering and button styling
# - Yahoo Mail: Test overall layout preservation
```

## Final Validation Checklist
- [ ] All tests pass: `npm test`
- [ ] No linting errors: `npm run lint`  
- [ ] No type errors: `npm run typecheck`
- [ ] Manual test successful: `npm run dev`
- [ ] Admin preview interface functional at `/admin/email-preview`
- [ ] Newsletter generation produces identical visual output
- [ ] All notification emails render correctly
- [ ] Email sending integration works with new templates
- [ ] Cross-client compatibility verified (Gmail, Outlook, Apple Mail)
- [ ] Performance equivalent to current implementation
- [ ] Error cases handled gracefully
- [ ] Documentation updated for new React Email workflow

---

## Anti-Patterns to Avoid
- ❌ Don't change existing function signatures - breaks integration
- ❌ Don't remove old template code until new code is fully tested
- ❌ Don't use CSS classes - use inline styles for email compatibility
- ❌ Don't use modern CSS features (flexbox, grid) - use tables for layout
- ❌ Don't mock React Email components in tests - test actual rendering
- ❌ Don't skip cross-client testing - email clients vary significantly
- ❌ Don't forget to handle server-side rendering for Next.js API routes
- ❌ Don't use any type - maintain strict TypeScript typing
- ❌ Don't hardcode styling - extract to shared style constants
- ❌ Don't break existing newsletter analytics or tracking functionality

## Confidence Score: 9/10

This PRP provides comprehensive context and step-by-step implementation with:
- Complete codebase analysis and existing patterns
- Detailed React Email documentation and best practices
- Backward compatibility preservation strategy
- Thorough testing and validation approach
- Real-world email client compatibility considerations
- Progressive implementation with validation loops

The high confidence score reflects the thorough research and detailed implementation plan that should enable successful one-pass implementation.