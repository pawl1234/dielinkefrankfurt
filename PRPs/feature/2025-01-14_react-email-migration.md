# FEATURE: React Email Migration for Consistent Email Styling

A complete migration from HTML string templates to React Email library to ensure consistent email rendering across all email clients, with an admin preview interface for development.

## USER STORIES

**As a developer:**
- I want to use React Email components so that emails render consistently across Gmail, Outlook, and other email clients
- I want a preview interface with hot reloading so that I can see email changes immediately during development
- I want maintainable email templates that follow React patterns and best practices

**As an admin:**
- I want newsletters to look the same regardless of which email client recipients use
- I want notification emails to have consistent styling and professional appearance
- I want to preview newsletters before sending them to ensure they look correct

**As a recipient:**
- I want emails to display properly whether I use Gmail, Outlook, Apple Mail, or other clients
- I want consistent button styling and proper image positioning across all emails

## INTEGRATION POINTS

### Newsletter System
- Replace `generateNewsletterHtml()` in `src/lib/newsletter-template.ts` with React Email components
- Maintain all existing newsletter sections: header, introduction, featured events, upcoming events, status reports
- Preserve current styling and layout while fixing cross-client compatibility

### Email Notifications
- Migrate all notification functions in `src/lib/email-notifications.ts`:
  - Antrag submission emails
  - Group acceptance/rejection/archiving emails
  - Status report acceptance/rejection/archiving emails
- Maintain current email content and styling

### Admin Interface
- Add new preview route at `/admin/email-preview` for newsletter preview
- Integrate with existing admin authentication
- Use existing newsletter data for realistic previews

### Development Workflow
- Leverage Next.js hot reloading for instant preview updates
- Maintain IDE-based template editing workflow

## DATA MODEL

No database schema changes required. The feature uses existing data structures:

### Newsletter Data
- Uses existing `EmailTemplateParams` interface
- Leverages current `NewsletterSettings` configuration
- Maintains compatibility with existing appointment and status report data

### Email Templates
- Preserve all current email template parameters
- Maintain backward compatibility during migration
- Use existing attachment and file URL handling

## API REQUIREMENTS

### New Endpoints

**GET /admin/email-preview**
- Admin-only route for newsletter preview
- Uses existing newsletter data and settings
- Returns rendered React Email component as HTML

**GET /api/admin/email-preview/newsletter**
- API endpoint to fetch current newsletter data
- Returns formatted data for preview rendering
- Supports hot reloading updates

### Modified Functions

**Email Generation Functions**
- Replace HTML string generation with React Email rendering
- Maintain identical function signatures for compatibility
- Preserve all existing email content and structure

## UI/UX DESIGN

### Admin Preview Interface
- Simple, clean preview page at `/admin/email-preview`
- Full-width email preview with proper desktop/mobile breakpoints
- Minimal navigation - focus on email content
- Real-time updates via Next.js hot reloading

### React Email Components
- Base components: EmailWrapper, Header, Footer, Button, Section
- Newsletter-specific: FeaturedEvent, UpcomingEvent, StatusReport, GroupHeader
- Notification-specific: NotificationWrapper, DecisionSection, FileList
- Shared utilities: Typography, Spacing, Colors

### Preserved Styling
- Maintain current red (#FF0000) brand color scheme
- Keep existing typography hierarchy and spacing
- Preserve header overlay design (logo over banner image)
- Maintain responsive design patterns
- Keep current button styling and hover states

## SECURITY & PERMISSIONS

### Access Control
- Admin preview interface requires admin authentication
- Preview endpoints protected by existing admin middleware
- No additional user data exposure

### Email Security
- Maintain existing email sending security measures
- Preserve current attachment handling and file access controls
- No changes to email recipient management or unsubscribe handling

## EXAMPLES

### Newsletter Template Structure
```tsx
// Newsletter.tsx
export function Newsletter({ params }: { params: EmailTemplateParams }) {
  return (
    <EmailWrapper>
      <Header logo={params.newsletterSettings.headerLogo} banner={params.newsletterSettings.headerBanner} />
      <Introduction content={params.introductionText} />
      <FeaturedEvents events={params.featuredAppointments} baseUrl={params.baseUrl} />
      <UpcomingEvents events={params.upcomingAppointments} baseUrl={params.baseUrl} />
      <StatusReports groups={params.statusReportsByGroup} baseUrl={params.baseUrl} />
      <Footer text={params.newsletterSettings.footerText} unsubscribeLink={params.newsletterSettings.unsubscribeLink} />
    </EmailWrapper>
  );
}
```

### Notification Template Structure
```tsx
// AntragSubmission.tsx
export function AntragSubmissionEmail({ antrag, fileUrls, adminUrl }: AntragEmailProps) {
  return (
    <EmailWrapper>
      <NotificationHeader title="Neuer Antrag an Kreisvorstand" date={antrag.createdAt} />
      <Section>
        <ApplicantInfo firstName={antrag.firstName} lastName={antrag.lastName} email={antrag.email} />
        <AntragDetails title={antrag.title} summary={antrag.summary} purposes={antrag.purposes} />
        <FileList files={fileUrls} />
        <AdminAction url={adminUrl} />
      </Section>
      <NotificationFooter />
    </EmailWrapper>
  );
}
```

### Admin Preview Interface
```tsx
// /admin/email-preview page
export default function EmailPreview() {
  const { data: newsletterData } = useSWR('/api/admin/email-preview/newsletter');
  
  return (
    <AdminLayout>
      <Container maxWidth="lg">
        <Typography variant="h4">Newsletter Preview</Typography>
        <Box sx={{ mt: 2, border: 1, borderColor: 'grey.300' }}>
          <iframe 
            srcDoc={renderToHtml(<Newsletter params={newsletterData} />)}
            style={{ width: '100%', height: '800px', border: 'none' }}
          />
        </Box>
      </Container>
    </AdminLayout>
  );
}
```

## DOCUMENTATION

### React Email Resources
- [React Email Documentation](https://react.email/)
- [Email Client Compatibility Guide](https://react.email/docs/components/html#compatibility)
- [Best Practices for Email HTML](https://react.email/docs/guides/best-practices)

### Implementation References
- Current newsletter template: `src/lib/newsletter-template.ts:329`
- Current notification templates: `src/lib/email-notifications.ts`
- Email sending function: `src/lib/email.ts`
- Admin layout patterns: `src/app/admin/layout.tsx`

### Migration Checklist
- [ ] Install React Email and configure build process
- [ ] Create base React Email components with current styling
- [ ] Migrate newsletter template maintaining all features
- [ ] Migrate all notification email templates
- [ ] Create admin preview interface
- [ ] Test across email clients (Gmail, Outlook, Apple Mail)
- [ ] Update email sending functions
- [ ] Remove old HTML template code

## OTHER CONSIDERATIONS

### Performance
- React Email components render to optimized HTML at build time
- No runtime performance impact on email sending
- Admin preview may need optimization for large newsletters

### Cross-Client Testing
- Priority clients: Gmail (web/mobile), Outlook (web/desktop), Apple Mail
- Secondary clients: Yahoo Mail, Thunderbird, mobile clients
- Use tools like Email on Acid or Litmus for comprehensive testing

### Rollback Plan
- Maintain old template functions during development
- Feature flag for switching between old/new templates
- Database backup before removing old code

### Future Extensibility
- Component-based architecture enables easy template variations
- Reusable components for future email types
- Theme system for potential branding variations
- A/B testing capabilities for newsletter optimization

### Development Workflow
- React Email CLI for component development
- Next.js hot reloading for instant preview updates
- TypeScript for type safety across email templates
- Shared component library for consistent styling