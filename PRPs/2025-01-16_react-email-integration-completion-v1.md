# Goal

Complete migration from HTML-based newsletter system to React Email by removing old template code, fixing type safety issues, integrating database settings, and ensuring proper analytics tracking while following React Email best practices from example implementations.

## Why

- **Complete Migration**: Need to fully migrate from old HTML string template system (678 lines in newsletter-template.ts) to modern React Email
- **Code Cleanup**: Remove legacy HTML generation functions and old template code that's no longer needed
- **Type Safety**: Current implementation uses dangerous `as never` assertions that bypass TypeScript safety
- **Best Practices**: Follow React Email patterns from existing examples instead of custom CSS/HTML implementations
- **Database Integration**: Connect React Email templates to existing database settings and analytics tracking
- **Production Readiness**: Replace hardcoded sample data with proper database integration

## What

Completely migrate from the old HTML-based newsletter system to React Email by cleaning up old files, following React Email best practices from examples, and integrating with existing database and analytics systems.

### Success Criteria
- [ ] Remove all old HTML template generation functions and legacy code
- [ ] Remove all `as never` type assertions and use existing types from src/types/
- [ ] Follow React Email patterns from src/emails/example/ implementations
- [ ] Connect React Email templates to database settings and analytics tracking
- [ ] Replace hardcoded SAMPLE_DATA with proper database integration
- [ ] Integrate helper functions using React Email components instead of custom HTML/CSS
- [ ] Ensure proper error handling and validation for React Email rendering
- [ ] Maintain backward compatibility with existing newsletter sending system
- [ ] All existing tests pass with proper type safety
- [ ] Analytics tracking works correctly with React Email templates

## All Needed Context

### Documentation & References
```yaml
# MUST READ - Include these in your context window
- url: https://react.email/docs/components/html
  why: Core React Email component structure and email client compatibility patterns
  
- url: https://react.email/docs/components/text
  why: Text component usage and styling patterns for email clients
  
- url: https://react.email/docs/components/button
  why: Button component patterns and email client compatibility
  
- url: https://react.email/docs/utilities/render
  why: Server-side rendering patterns and dynamic imports for Next.js
  
- url: https://www.neorepo.com/blog/how-to-make-emails-with-nextjs-and-react-email
  why: Next.js integration patterns and server-side rendering best practices
  
- file: src/lib/newsletter-template.ts
  why: Legacy HTML generation functions that need to be removed and replaced with React Email
  critical: generateNewsletterHtml(params: EmailTemplateParams) function signature must remain identical for backward compatibility
  
- file: src/lib/newsletter-service.ts
  why: Database settings integration patterns and caching mechanisms
  critical: getNewsletterSettings() returns comprehensive settings object with 40+ properties
  
- file: src/lib/newsletter-analytics.ts
  why: Analytics tracking implementation with fingerprinting and unique user tracking
  critical: createNewsletterAnalytics() and recordOpenEvent() functions must be integrated
  
- file: src/lib/newsletter-tracking.ts
  why: Link tracking and pixel tracking implementation for newsletters
  critical: addTrackingToNewsletter() function must be called on final HTML output
  
- file: src/emails/utils/render.ts
  why: Current React Email rendering implementation that needs type safety fixes
  critical: Remove 'as never' assertions and add proper type definitions
  
- file: src/emails/utils/styles.ts
  why: Comprehensive styling system for React Email components
  critical: Use existing style constants instead of hardcoded values
  
- file: src/emails/newsletter.tsx
  why: Current React Email template implementation that needs database integration
  critical: Replace hardcoded SAMPLE_DATA with database-driven content and remove type assertions
  
- file: src/emails/example/apple.tsx
  why: Example React Email implementation showing proper component structure and styling patterns
  critical: Follow these patterns instead of custom HTML/CSS - proper inline styles, React Email components
  
- file: src/emails/example/codepen.tsx
  why: Example React Email implementation showing complex layout patterns and email client compatibility
  critical: Use React Email Button, Section, Row, Column components instead of custom implementations
  
- file: src/types/newsletter-analytics.ts
  why: Existing analytics type definitions that should be reused
  critical: Don't create new interfaces - use existing NewsletterAnalytics and related types
  
- file: src/types/api-types.ts
  why: Existing API and email sending type definitions
  critical: Reuse EmailSendResult, ChunkResult, and other existing types
  
- file: src/app/api/admin/newsletter/send/route.ts
  why: Newsletter sending pipeline that integrates analytics tracking
  critical: Ensure React Email templates work with existing analytics integration
  
- file: prisma/schema.prisma
  why: Database schema for newsletter analytics and settings
  critical: NewsletterAnalytics model defines tracking requirements
  
- docfile: docs/testing-best-practices.md
  why: Testing patterns and mocking strategies for this codebase
  critical: Never mock modules in /src/lib/ unless they directly interact with external services
```

### Current Codebase tree
```bash
src/
├── lib/
│   ├── newsletter-template.ts      # OLD: HTML generation functions to be removed
│   ├── newsletter-service.ts       # Database settings integration
│   ├── newsletter-analytics.ts     # Analytics tracking system
│   ├── newsletter-tracking.ts      # Link and pixel tracking
│   └── email.ts                   # Email sending infrastructure
├── emails/
│   ├── newsletter.tsx             # React Email template with type issues
│   ├── components/                # Email components (Header, Footer, etc.)
│   ├── example/
│   │   ├── apple.tsx             # REFERENCE: Proper React Email patterns
│   │   └── codepen.tsx           # REFERENCE: Complex layout patterns
│   └── utils/
│       ├── render.ts             # Rendering utilities with type issues
│       └── styles.ts             # Comprehensive styling system
├── app/api/admin/newsletter/
│   └── send/route.ts             # Newsletter sending with analytics
├── types/
│   ├── newsletter-analytics.ts   # EXISTING: Analytics type definitions to reuse
│   ├── api-types.ts              # EXISTING: API type definitions to reuse
│   └── component-types.ts        # EXISTING: Component type definitions
└── tests/
    ├── lib/newsletter-*.test.ts  # Newsletter testing patterns
    └── emails/                   # Email template tests
```

### Desired Codebase tree with files to be cleaned up and modified
```bash
src/
├── lib/
│   ├── newsletter-template.ts     # MODIFIED: Remove HTML generation, keep React Email integration
│   └── newsletter-helpers.ts      # NEW: Extracted helper functions using React Email patterns
├── emails/
│   ├── newsletter.tsx            # MODIFIED: Fix types, remove SAMPLE_DATA, follow example patterns
│   ├── components/               # MODIFIED: Follow apple.tsx/codepen.tsx patterns
│   └── utils/
│       ├── render.ts            # MODIFIED: Fix type assertions, use existing types from src/types/
│       └── helpers.ts           # NEW: Email-specific helper functions following React Email patterns
├── types/
│   └── newsletter-props.ts       # NEW: Newsletter-specific props using existing types as base
├── tests/
│   ├── emails/
│   │   └── newsletter.test.tsx   # NEW: React Email template tests with proper types
│   └── lib/
│       └── newsletter-helpers.test.ts # NEW: Helper function unit tests
```

### Known Gotchas & Library Quirks
```typescript
// CRITICAL: React Email component patterns from examples
// Example: Follow apple.tsx patterns - use Html, Head, Body, Container, Section, Row, Column
// Example: Use Button component from @react-email/components instead of custom buttons
// Example: Inline styles only - follow patterns from apple.tsx and codepen.tsx examples

// CRITICAL: Type safety - reuse existing types
// Example: Use types from src/types/newsletter-analytics.ts, src/types/api-types.ts
// Example: Don't create new interfaces if existing ones work
// Example: Remove 'as never' assertions - use proper type definitions

// CRITICAL: Old HTML generation functions to remove
// Example: generateFeaturedEventsHtml, generateUpcomingEventsHtml, generateStatusReportsHtml
// Example: All HTML string building functions in newsletter-template.ts
// Example: Custom CSS and table generation - replace with React Email components

// CRITICAL: Database integration patterns to preserve
// Example: getNewsletterSettings() returns cached settings with 40+ properties
// Example: fetchNewsletterAppointments() separates featured vs regular appointments
// Example: Analytics tracking requires pixel tokens and link rewriting

// CRITICAL: React Email email client compatibility
// Example: React Email handles email client compatibility automatically
// Example: Don't implement custom CSS for Outlook/Gmail - trust React Email components
// Example: Use React Email Button, Text, Link components for proper email client support

// CRITICAL: Our codebase patterns to preserve
// Example: generateNewsletterHtml(params: EmailTemplateParams): Promise<string> signature
// Example: addTrackingToNewsletter() must be called on final HTML output
// Example: Error handling uses handleDatabaseError() wrapper
// Example: Date formatting uses date-fns with Europe/Berlin timezone
```

## Implementation Blueprint

### Data models and structure

Reuse existing TypeScript interfaces from src/types/ and create minimal new interfaces only for React Email specific props:

```typescript
// NEW: src/types/newsletter-props.ts (reusing existing types)
import { NewsletterSettings } from '../lib/newsletter-template';
import { Appointment, Group, StatusReport } from '@prisma/client';

export interface NewsletterEmailProps {
  newsletterSettings: NewsletterSettings;
  introductionText: string;
  featuredAppointments: Appointment[];
  upcomingAppointments: Appointment[];
  statusReportsByGroup: GroupWithReports[];
  baseUrl: string;
}

// REUSE: Import existing GroupWithReports from newsletter-template.ts
import { GroupWithReports } from '../lib/newsletter-template';

// REUSE: Use existing notification types from api-types.ts
import { AntragWithId } from './api-types';

export interface NotificationEmailProps {
  antrag: AntragWithId;
  fileUrls: string[];
  adminUrl: string;
  baseUrl: string;
}
```

### List of tasks to be completed to fulfill the PRP in the order they should be completed

```yaml
Task 1: Create Newsletter Props Interface
CREATE src/types/newsletter-props.ts:
  - REUSE existing types from src/types/newsletter-analytics.ts and api-types.ts
  - IMPORT existing NewsletterSettings, Appointment, Group types
  - CREATE minimal NewsletterEmailProps interface for React Email
  - AVOID duplicating existing type definitions

Task 2: Clean Up Old HTML Template Functions
MODIFY src/lib/newsletter-template.ts:
  - REMOVE generateFeaturedEventsHtml function (lines 147-192)
  - REMOVE generateUpcomingEventsHtml function (lines 197-230)
  - REMOVE generateStatusReportsHtml function (lines 252-324)
  - REMOVE truncateText function (move to helpers)
  - REMOVE getCoverImageUrl function (move to helpers)
  - KEEP generateNewsletterHtml signature but replace implementation with React Email
  - KEEP all helper functions that will be moved to newsletter-helpers.ts

Task 3: Extract Helper Functions Following React Email Patterns
CREATE src/lib/newsletter-helpers.ts:
  - EXTRACT formatAppointmentDateRange with proper date-fns formatting
  - EXTRACT truncateText function with text length handling
  - EXTRACT getCoverImageUrl function for appointment images
  - EXTRACT fixUrlsInNewsletterHtml function
  - USE React Email components instead of HTML string building
  - ADD proper TypeScript types using existing interfaces

Task 4: Fix React Email Template Implementation
MODIFY src/emails/newsletter.tsx:
  - REMOVE all 'as never' type assertions (lines 102, 118, 132)
  - REMOVE hardcoded SAMPLE_DATA (lines 198-344)
  - IMPORT NewsletterEmailProps from src/types/newsletter-props.ts
  - FOLLOW patterns from src/emails/example/apple.tsx and codepen.tsx
  - USE React Email Button, Text, Link components instead of custom HTML
  - INTEGRATE helper functions from newsletter-helpers.ts

Task 5: Fix Rendering Utilities with Proper Types
MODIFY src/emails/utils/render.ts:
  - REMOVE 'as never' assertions in renderNewsletter function (line 14)
  - USE proper NewsletterEmailProps type from src/types/newsletter-props.ts
  - IMPROVE error handling with specific error types
  - ENSURE server-side rendering compatibility with dynamic imports

Task 6: Integrate Database Settings and Analytics
MODIFY src/lib/newsletter-template.ts generateNewsletterHtml function:
  - REPLACE HTML generation with React Email renderNewsletter() call
  - INTEGRATE getNewsletterSettings() for database settings
  - CONNECT fetchNewsletterAppointments() for appointment data
  - CONNECT fetchNewsletterStatusReports() for status report data
  - ENSURE analytics integration with addTrackingToNewsletter()
  - PRESERVE exact function signature for backward compatibility

Task 7: Update Email Components to Follow Examples
MODIFY src/emails/components/ files:
  - FOLLOW patterns from apple.tsx and codepen.tsx examples
  - USE React Email components (Button, Text, Link, Section, Row, Column)
  - REMOVE custom CSS in favor of inline styles following example patterns
  - ENSURE email client compatibility through React Email components

Task 8: Create Comprehensive Tests
CREATE src/tests/emails/newsletter.test.tsx:
  - TEST React Email template rendering with real database data
  - VERIFY type safety with proper NewsletterEmailProps
  - ENSURE analytics integration works correctly
  - TEST helper function integration

CREATE src/tests/lib/newsletter-helpers.test.ts:
  - TEST formatAppointmentDateRange with different date scenarios
  - TEST truncateText with various text lengths
  - TEST getCoverImageUrl with different appointment metadata
  - VERIFY all helper functions work with React Email components

Task 9: Validation and Cleanup
RUN comprehensive testing:
  - VERIFY all old HTML template functions are removed
  - ENSURE React Email templates render correctly
  - TEST analytics tracking integration
  - VALIDATE backward compatibility with existing newsletter sending
  - CONFIRM no 'as never' assertions remain in codebase
```

### Per task pseudocode as needed

```typescript
// Task 1: Newsletter Props Interface
// src/types/newsletter-props.ts
import { NewsletterSettings, GroupWithReports } from '../lib/newsletter-template';
import { Appointment } from '@prisma/client';

export interface NewsletterEmailProps {
  // PATTERN: Reuse existing types, don't duplicate
  newsletterSettings: NewsletterSettings;
  introductionText: string;
  featuredAppointments: Appointment[];
  upcomingAppointments: Appointment[];
  statusReportsByGroup: GroupWithReports[];
  baseUrl: string;
}

// Task 2: Clean Up Old Template Functions
// src/lib/newsletter-template.ts
export async function generateNewsletterHtml(params: EmailTemplateParams): Promise<string> {
  // CRITICAL: Remove all HTML generation functions
  // DELETE: generateFeaturedEventsHtml, generateUpcomingEventsHtml, generateStatusReportsHtml
  // DELETE: truncateText, getCoverImageUrl (move to helpers)
  
  try {
    // PATTERN: Use React Email rendering instead of HTML strings
    const { renderNewsletter } = await import('../emails/utils/render');
    const html = await renderNewsletter(params);
    return html;
  } catch (error) {
    throw new Error(`Newsletter generation failed: ${error.message}`);
  }
}

// Task 3: Helper Functions Following React Email Patterns
// src/lib/newsletter-helpers.ts
export function formatAppointmentDateRange(
  startDateTime: Date | string, 
  endDateTime?: Date | string | null
): string {
  // PATTERN: Preserve existing date-fns logic with Europe/Berlin timezone
  const start = new Date(startDateTime);
  if (!endDateTime) {
    return formatDateTime(start);
  }
  // ... existing logic from old template
}

export function truncateText(text: string, maxLength: number = 300): string {
  // PATTERN: Preserve existing truncation logic but return plain text for React Email
  if (text.length <= maxLength) return text;
  const lastSpace = text.substring(0, maxLength).lastIndexOf(' ');
  const truncatedText = lastSpace !== -1 ? text.substring(0, lastSpace) : text.substring(0, maxLength);
  return truncatedText + '...';
}

// Task 4: Fix React Email Template
// src/emails/newsletter.tsx
import { NewsletterEmailProps } from '../types/newsletter-props';
import { Button, Text, Link, Section } from '@react-email/components';

export default function Newsletter(props: NewsletterEmailProps) {
  // CRITICAL: Remove 'as never' assertions, use proper props
  const {
    newsletterSettings,
    introductionText,
    featuredAppointments,
    upcomingAppointments,
    statusReportsByGroup,
    baseUrl
  } = props;

  // PATTERN: Follow apple.tsx and codepen.tsx patterns
  return (
    <Html lang="de">
      <Head />
      <Body style={main}>
        <Container style={container}>
          {/* PATTERN: Use React Email components instead of custom HTML */}
          <Section>
            <Text style={heading}>{introductionText}</Text>
          </Section>
          
          {featuredAppointments.map(appointment => (
            <Section key={appointment.id}>
              {/* PATTERN: Use React Email Button instead of custom button */}
              <Button href={`${baseUrl}/termine/${appointment.id}`}>
                Mehr Informationen
              </Button>
            </Section>
          ))}
        </Container>
      </Body>
    </Html>
  );
}

// Task 5: Fix Rendering Utilities
// src/emails/utils/render.ts
import { NewsletterEmailProps } from '../../types/newsletter-props';

export async function renderNewsletter(params: EmailTemplateParams): Promise<string> {
  try {
    const { render } = await import('@react-email/render');
    const { Newsletter } = await import('../newsletter');
    
    // CRITICAL: Remove 'as never' - use proper type conversion
    const newsletterProps: NewsletterEmailProps = {
      newsletterSettings: params.newsletterSettings,
      introductionText: params.introductionText,
      featuredAppointments: params.featuredAppointments,
      upcomingAppointments: params.upcomingAppointments,
      statusReportsByGroup: params.statusReportsByGroup || [],
      baseUrl: params.baseUrl
    };
    
    const html = await render(Newsletter(newsletterProps));
    return html;
  } catch (error) {
    throw new Error(`Newsletter rendering failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Task 6: Database Integration with React Email
// src/lib/newsletter-template.ts (modified generateNewsletterHtml)
export async function generateNewsletterHtml(params: EmailTemplateParams): Promise<string> {
  // PATTERN: Preserve function signature for backward compatibility
  try {
    // CRITICAL: Get database data using existing service functions
    const settings = await getNewsletterSettings();
    const { featuredAppointments, upcomingAppointments } = await fetchNewsletterAppointments();
    const { statusReportsByGroup } = await fetchNewsletterStatusReports();
    
    // PATTERN: Use React Email rendering with database data
    const mergedParams: EmailTemplateParams = {
      ...params,
      newsletterSettings: settings,
      featuredAppointments,
      upcomingAppointments,
      statusReportsByGroup
    };
    
    const html = await renderNewsletter(mergedParams);
    
    // CRITICAL: Apply analytics tracking (existing functionality)
    const trackedHtml = addTrackingToNewsletter(html, params.analyticsToken, params.baseUrl);
    
    return trackedHtml;
  } catch (error) {
    throw new Error(`Newsletter generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
```

### Integration Points
```yaml
CLEANUP:
  - remove from: src/lib/newsletter-template.ts
  - pattern: "Delete all HTML generation functions (generateFeaturedEventsHtml, etc.)"
  
DATABASE:
  - schema: "Use existing NewsletterAnalytics and NewsletterSettings models"
  - existing: "Connect to getNewsletterSettings() and fetchNewsletterAppointments()"
  
TYPES:
  - add to: src/types/newsletter-props.ts
  - pattern: "Reuse existing types from src/types/, minimal new interfaces"
  
HELPERS:
  - add to: src/lib/newsletter-helpers.ts
  - pattern: "Extracted helper functions following React Email patterns"
  
TEMPLATES:
  - modify: src/emails/newsletter.tsx
  - pattern: "Follow apple.tsx/codepen.tsx patterns, remove type assertions, remove SAMPLE_DATA"
  
COMPONENTS:
  - modify: src/emails/components/
  - pattern: "Use React Email Button, Text, Link components instead of custom HTML"
  
ANALYTICS:
  - integrate: src/lib/newsletter-tracking.ts
  - pattern: "Ensure tracking works with React Email templates"
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
// CREATE src/tests/emails/newsletter.test.tsx
describe('Newsletter React Email Template', () => {
  it('should render newsletter with proper types', async () => {
    // PATTERN: Use existing newsletter factory with proper types
    const params = createMockEmailTemplateParams();
    
    const { Newsletter } = await import('../../emails/newsletter');
    const { render } = await import('@react-email/render');
    
    const newsletterProps: NewsletterEmailProps = {
      newsletterSettings: params.newsletterSettings,
      introductionText: params.introductionText,
      featuredAppointments: params.featuredAppointments,
      upcomingAppointments: params.upcomingAppointments,
      statusReportsByGroup: params.statusReportsByGroup || [],
      baseUrl: params.baseUrl
    };
    
    const html = await render(Newsletter(newsletterProps));
    
    // VERIFY: No type errors and proper rendering
    expect(html).toContain(params.introductionText);
    expect(html).toContain('Featured');
    expect(html).toContain('Termine');
    expect(html).toContain(params.newsletterSettings.footerText);
  });

  it('should handle missing data gracefully', async () => {
    // EDGE CASE: Empty appointments and status reports
    const params = createMockEmailTemplateParams({
      featuredAppointments: [],
      upcomingAppointments: [],
      statusReportsByGroup: []
    });
    
    const html = await renderNewsletter(params);
    expect(html).toBeTruthy();
    expect(html).toContain(params.introductionText);
  });
});

// CREATE src/tests/lib/newsletter-helpers.test.ts
describe('Newsletter Helper Functions', () => {
  it('should format appointment date ranges correctly', () => {
    const startDate = new Date('2025-01-20T19:00:00Z');
    const endDate = new Date('2025-01-20T21:00:00Z');
    
    const formatted = formatAppointmentDateRange(startDate, endDate);
    expect(formatted).toContain('20. Januar 2025');
    expect(formatted).toContain('19:00 - 21:00');
  });

  it('should truncate text properly', () => {
    const longText = 'A'.repeat(500);
    const truncated = truncateText(longText, 300);
    
    expect(truncated.length).toBeLessThanOrEqual(303); // 300 + '...'
    expect(truncated).toEndWith('...');
  });
});
```

```bash
# Run and iterate until passing:
npm test -- src/tests/emails/
npm test -- src/tests/lib/newsletter-helpers.test.ts
# If failing: Read error, understand root cause, fix code, re-run
```

### Level 3: Integration Test
```bash
# Test newsletter generation with React Email
npm run dev

# Test newsletter sending with analytics
curl -X POST http://localhost:3000/api/admin/newsletter/send \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=ADMIN_TOKEN" \
  -d '{
    "newsletterId": "test-newsletter-id",
    "html": "<html>test</html>",
    "subject": "Test Newsletter",
    "emailText": "test@example.com"
  }'

# Expected: Newsletter sends successfully with analytics tracking
# If error: Check server logs for React Email rendering errors
```

## Final Validation Checklist
- [ ] All tests pass: `npm test`
- [ ] No linting errors: `npm run lint`  
- [ ] No type errors: `npm run typecheck`
- [ ] Manual test successful: `npm run dev`
- [ ] Newsletter templates render without type assertions
- [ ] Analytics tracking works with React Email templates
- [ ] Database integration works correctly
- [ ] Helper functions extracted and working
- [ ] Backward compatibility maintained
- [ ] Error handling improved and tested

---

## Anti-Patterns to Avoid
- ❌ Don't use 'as never' type assertions - use existing types from src/types/
- ❌ Don't create new interfaces when existing ones from src/types/ work
- ❌ Don't implement custom HTML/CSS when React Email components exist
- ❌ Don't keep old HTML generation functions - remove them completely
- ❌ Don't break existing generateNewsletterHtml function signature
- ❌ Don't remove analytics tracking integration
- ❌ Don't hardcode values that should come from database
- ❌ Don't ignore React Email example patterns from apple.tsx/codepen.tsx
- ❌ Don't mock React Email components in tests - test actual rendering
- ❌ Don't change existing database schema - work with current models
- ❌ Don't break backward compatibility with existing newsletter sending

## Confidence Score: 9/10

This PRP provides comprehensive context and step-by-step implementation with:
- Complete migration plan from HTML-based to React Email system
- Detailed cleanup of old HTML generation functions (678 lines to be removed)
- Proper use of existing types from src/types/ instead of creating duplicates
- React Email best practices from apple.tsx and codepen.tsx examples
- Complete type safety implementation removing all 'as never' assertions
- Database integration with existing settings and analytics systems
- Backward compatibility preservation with existing newsletter sending
- Comprehensive testing approach with real data validation

The high confidence score reflects the complete migration approach, thorough cleanup plan, and detailed implementation steps that follow React Email best practices while preserving all existing functionality.