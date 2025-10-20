# Newsletter Domain Architecture Diagram

## API Routes → Service Layer Call Graph

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         API ROUTES (HTTP Layer)                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ /api/admin/newsletter/generate                                               │
│ └─ POST: [ROOT] Direct orchestration (Creates draft newsletter in DB)      │
│          ├─→ getNewsletterSettings()                                        │
│          ├─→ fetchNewsletterAppointments(settings)                          │
│          ├─→ fetchNewsletterStatusReports(settings)                         │
│          ├─→ generateNewsletterHtml(params)                                 │
│          │    └─→ renderNewsletter() [from @/lib/email]                     │
│          └─→ prisma.newsletterItem.create()                                 │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ /api/admin/newsletter/send                                                   │
│ └─ POST: [ROOT] handleSendNewsletter()                                      │
│          ├─→ processRecipientList(emailText)                                │
│          │    └─→ validateAndHashEmails() [from @/lib/email]                │
│          ├─→ parseAndCleanEmailList(emailText, invalidEmails)               │
│          │    └─→ cleanEmail() [from @/lib/email]                           │
│          ├─→ createNewsletterAnalytics(newsletterId, recipientCount)        │
│          ├─→ addTrackingToNewsletter(html, token, baseUrl)                  │
│          └─→ getNewsletterSettings()                                        │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ /api/admin/newsletter/send-chunk                                             │
│ └─ POST: [ROOT] Process chunk                                               │
│          ├─→ getNewsletterSettings()                                        │
│          ├─→ processSendingChunk(emails, newsletterId, settings, 'initial') │
│          │    ├─→ validateAndCleanEmails() [private]                        │
│          │    ├─→ createAndVerifyTransporter() [private]                    │
│          │    │    └─→ createTransporter() [from @/lib/email]               │
│          │    ├─→ sendViaBCC() OR sendIndividually() [private]              │
│          │    │    └─→ sendEmailWithTransporter() [from @/lib/email]        │
│          │    └─→ closeTransporter() [private]                              │
│          └─→ updateNewsletterAfterChunk(newsletterId, chunkIndex, ...)      │
│              └─→ initializeRetryProcess() [private - if failures detected]  │
│                   └─→ getNewsletterSettings()                               │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ /api/admin/newsletter/retry-chunk                                            │
│ └─ POST: [ROOT] Complex retry orchestration (300+ lines)                    │
│          ├─→ getNewsletterSettings()                                        │
│          ├─→ processSendingChunk(emails, newsletterId, settings, 'retry')   │
│          │    [Same chain as send-chunk above]                              │
│          └─→ sendEmail() [for permanent failure notifications]              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ /api/admin/newsletter/settings                                               │
│ ├─ GET:  getNewsletterSettings()                                            │
│ │        ├─→ getNewsletterSettingsFromDb() [from @/lib/db/operations]      │
│ │        ├─→ getDefaultNewsletterSettings()                                 │
│ │        └─→ mergeWithDefaults() [from field-mappers]                       │
│ │                                                                            │
│ └─ PUT:  updateNewsletterSettings(data)                                     │
│          ├─→ getNewsletterSettingsFromDb() [from @/lib/db/operations]      │
│          ├─→ extractDefinedFields() [from field-mappers]                    │
│          ├─→ updateNewsletterSettingsInDb() [from @/lib/db/operations]     │
│          └─→ HeaderCompositionService [from @/lib/email - if images]        │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ /api/admin/newsletter/validate                                               │
│ └─ POST: processRecipientList(emailText)                                    │
│          └─→ validateAndHashEmails() [from @/lib/email]                     │
└─────────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────────────┐
│                      SERVICE LAYER (Business Logic)                          │
└─────────────────────────────────────────────────────────────────────────────┘

╔═══════════════════════════════════════════════════════════════════════════╗
║ newsletter-content-service.ts (348 lines) ✓                                ║
╠═══════════════════════════════════════════════════════════════════════════╣
║ PUBLIC API:                                                                 ║
║ • fetchNewsletterAppointments(settings?)                                    ║
║   └─→ prisma.appointment.findMany()                                         ║
║                                                                             ║
║ • fetchNewsletterStatusReports(settings?)                                   ║
║   └─→ prisma.group.findMany() + statusReports                              ║
║                                                                             ║
║ • generateNewsletterHtml(params, analyticsParams?)                          ║
║   ├─→ renderNewsletter() [from @/lib/email]                                ║
║   └─→ addTrackingToNewsletter() [if analytics token]                       ║
║                                                                             ║
║ • generateNewsletter(introText) [ORCHESTRATOR]                              ║
║   ├─→ getNewsletterSettings()                                              ║
║   ├─→ fetchNewsletterAppointments()                                        ║
║   ├─→ fetchNewsletterStatusReports()                                       ║
║   └─→ generateNewsletterHtml()                                             ║
║                                                                             ║
║ • fixUrlsInNewsletterHtml(html)                                            ║
║ • getDefaultNewsletterSettings()                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝

╔═══════════════════════════════════════════════════════════════════════════╗
║ newsletter-sending-service.ts (920 lines) ⚠️ VIOLATES 500-LINE RULE       ║
╠═══════════════════════════════════════════════════════════════════════════╣
║ PUBLIC API:                                                                 ║
║ • processRecipientList(emailText)                                          ║
║   └─→ validateAndHashEmails() [from @/lib/email]                          ║
║                                                                             ║
║ • parseAndCleanEmailList(emailText, invalidEmails)                         ║
║   └─→ cleanEmail() [from @/lib/email]                                     ║
║                                                                             ║
║ • processSendingChunk(chunk, newsletterId, settings, mode) [ORCHESTRATOR]  ║
║   ├─→ validateAndCleanEmails() [private helper]                           ║
║   │    ├─→ cleanEmail() [from @/lib/email]                                ║
║   │    └─→ validateEmail() [from @/lib/email]                             ║
║   ├─→ createAndVerifyTransporter() [private helper, 70 lines]             ║
║   │    ├─→ createTransporter() [from @/lib/email]                         ║
║   │    └─→ transporter.verify() [with exponential backoff]                ║
║   ├─→ sendViaBCC() OR sendIndividually() [private helpers, 150+ lines]    ║
║   │    ├─→ formatSubject() [private helper]                               ║
║   │    └─→ sendEmailWithTransporter() [from @/lib/email]                  ║
║   └─→ closeTransporter() [private helper]                                 ║
║                                                                             ║
║ • updateNewsletterAfterChunk(newsletterId, chunkIndex, ...) [ORCHESTRATOR] ║
║   ├─→ [Inline aggregation logic]                                          ║
║   ├─→ initializeRetryProcess() [private helper, 100 lines]                ║
║   │    └─→ getNewsletterSettings()                                        ║
║   └─→ prisma.newsletterItem.update()                                      ║
║                                                                             ║
║ PRIVATE HELPERS (NOT EXPORTED):                                            ║
║ • validateAndCleanEmails()                                                 ║
║ • createAndVerifyTransporter()                                             ║
║ • closeTransporter()                                                       ║
║ • formatSubject()                                                          ║
║ • sendViaBCC()                                                             ║
║ • sendIndividually()                                                       ║
║ • initializeRetryProcess()                                                 ║
╚═══════════════════════════════════════════════════════════════════════════╝

╔═══════════════════════════════════════════════════════════════════════════╗
║ settings-service.ts (161 lines) ✓                                          ║
╠═══════════════════════════════════════════════════════════════════════════╣
║ • getNewsletterSettings()                                                  ║
║   ├─→ getDefaultNewsletterSettings() [from content-service]               ║
║   ├─→ getNewsletterSettingsFromDb() [from @/lib/db/operations]           ║
║   ├─→ mergeWithDefaults() [from field-mappers]                            ║
║   └─→ createNewsletterSettingsInDb() [if not exists]                      ║
║                                                                             ║
║ • updateNewsletterSettings(data)                                           ║
║   ├─→ getNewsletterSettingsFromDb() [from @/lib/db/operations]           ║
║   ├─→ extractDefinedFields() [from field-mappers]                         ║
║   └─→ updateNewsletterSettingsInDb() OR createNewsletterSettingsInDb()    ║
╚═══════════════════════════════════════════════════════════════════════════╝

╔═══════════════════════════════════════════════════════════════════════════╗
║ analytics-service.ts (309 lines) ✓                                         ║
╠═══════════════════════════════════════════════════════════════════════════╣
║ • createNewsletterAnalytics(newsletterId, recipientCount)                  ║
║   └─→ prisma.newsletterAnalytics.create()                                  ║
║                                                                             ║
║ • recordOpenEvent(pixelToken, fingerprint?)                                ║
║   ├─→ getAnalyticsByPixelToken() [private]                                ║
║   ├─→ prisma.newsletterAnalytics.update()                                  ║
║   └─→ recordFingerprintOpen() [if fingerprint]                            ║
║                                                                             ║
║ • recordLinkClick(analyticsToken, url, linkType, linkId?, fingerprint?)    ║
║   ├─→ getAnalyticsByPixelToken() [private]                                ║
║   ├─→ prisma.newsletterLinkClick.upsert()                                  ║
║   └─→ recordLinkClickFingerprint() [if fingerprint]                       ║
║                                                                             ║
║ • recordFingerprintOpen(analyticsId, fingerprint)                          ║
║   └─→ prisma.newsletterFingerprint.upsert()                                ║
║                                                                             ║
║ • recordLinkClickFingerprint(linkClickId, fingerprint)                     ║
║   └─→ prisma.newsletterLinkClickFingerprint.upsert()                       ║
║                                                                             ║
║ • cleanupOldAnalytics()                                                    ║
║   └─→ prisma.newsletterAnalytics.deleteMany()                              ║
╚═══════════════════════════════════════════════════════════════════════════╝

╔═══════════════════════════════════════════════════════════════════════════╗
║ tracking-service.ts (54 lines) ✓                                           ║
╠═══════════════════════════════════════════════════════════════════════════╣
║ • addTrackingToNewsletter(html, analyticsToken, baseUrl)                   ║
║   └─→ [Pure function: regex replacements for URLs and pixel insertion]    ║
╚═══════════════════════════════════════════════════════════════════════════╝

╔═══════════════════════════════════════════════════════════════════════════╗
║ test-email-service.ts (47 lines) ✓                                         ║
╠═══════════════════════════════════════════════════════════════════════════╣
║ • sendNewsletterTestEmail(html, testRecipients?)                           ║
║   ├─→ getNewsletterSettings() [if no recipients provided]                 ║
║   └─→ sendTestEmail() [from @/lib/email]                                  ║
╚═══════════════════════════════════════════════════════════════════════════╝

╔═══════════════════════════════════════════════════════════════════════════╗
║ archive-service.ts (50 lines) ✓                                            ║
╠═══════════════════════════════════════════════════════════════════════════╣
║ • getSentNewsletter(id)                                                    ║
║   └─→ prisma.newsletterItem.findUnique()                                   ║
╚═══════════════════════════════════════════════════════════════════════════╝

╔═══════════════════════════════════════════════════════════════════════════╗
║ helpers.ts (141 lines) ✓ - UTILITY FUNCTIONS                              ║
╠═══════════════════════════════════════════════════════════════════════════╣
║ • formatDate(dateString)                                                   ║
║ • formatAppointmentDateRange(start, end?)                                 ║
║ • truncateText(text, maxLength)                                           ║
║ • getCoverImageUrl(appointment)                                           ║
║ • generatePreviewText(htmlContent, maxLength)                             ║
╚═══════════════════════════════════════════════════════════════════════════╝

╔═══════════════════════════════════════════════════════════════════════════╗
║ field-mappers.ts (153 lines) ✓ - GENERIC UTILITIES                        ║
╠═══════════════════════════════════════════════════════════════════════════╣
║ • mergeWithDefaults<T>(dbData, defaultData, fields)                        ║
║ • extractDefinedFields<T>(data, fields)                                    ║
║ • NEWSLETTER_SETTINGS_FIELDS [constant array]                              ║
╚═══════════════════════════════════════════════════════════════════════════╝

╔═══════════════════════════════════════════════════════════════════════════╗
║ constants.ts (82 lines) ✓ - CONFIGURATION                                  ║
╠═══════════════════════════════════════════════════════════════════════════╣
║ • NEWSLETTER_LIMITS                                                        ║
║ • STATUS_REPORT_LIMITS                                                     ║
║ • NEWSLETTER_LIMIT_FIELDS                                                  ║
║ • STATUS_REPORT_LIMIT_FIELDS                                               ║
║ • NEWSLETTER_DATE_RANGES                                                   ║
╚═══════════════════════════════════════════════════════════════════════════╝

═══════════════════════════════════════════════════════════════════════════════

## Function Call Depth Analysis

### Level 1: API Route Handlers (Entry Points)
```
• /api/admin/newsletter/generate (GET/POST)
• /api/admin/newsletter/send (POST)
• /api/admin/newsletter/send-chunk (POST)
• /api/admin/newsletter/retry-chunk (POST)
• /api/admin/newsletter/settings (GET/PUT)
• /api/admin/newsletter/validate (POST)
```

### Level 2: Public Service Functions (Orchestrators)
```
• generateNewsletter()                    [orchestrates 3 functions]
• processSendingChunk()                   [orchestrates 6 private helpers]
• updateNewsletterAfterChunk()            [orchestrates aggregation + retry init]
• getNewsletterSettings()                 [orchestrates db + merge]
• updateNewsletterSettings()              [orchestrates validation + db]
• processRecipientList()                  [delegates to email lib]
```

### Level 3: Service Helper Functions & External Dependencies
```
• fetchNewsletterAppointments()           [prisma query]
• fetchNewsletterStatusReports()          [prisma query]
• generateNewsletterHtml()                → renderNewsletter() [email lib]
• validateAndCleanEmails()                → cleanEmail(), validateEmail() [email lib]
• createAndVerifyTransporter()            → createTransporter() [email lib]
• sendViaBCC() / sendIndividually()       → sendEmailWithTransporter() [email lib]
• initializeRetryProcess()                → getNewsletterSettings()
• mergeWithDefaults()                     [pure function]
• extractDefinedFields()                  [pure function]
```

### Level 4: Database & Email Infrastructure
```
• prisma.* (database operations)
• Nodemailer SMTP operations
• Sharp image processing
• Validation libraries
```

═══════════════════════════════════════════════════════════════════════════════

## Critical Architectural Violations

⚠️  **newsletter-sending-service.ts (920 lines)**
    - VIOLATES: "Never create a file longer than 500 lines" (CLAUDE.md)
    - Contains: 7 private helpers that should be extracted
    - Complexity: Too many responsibilities in one file

⚠️  **retry-chunk/route.ts (785 lines)**
    - VIOLATES: "Never create a file longer than 500 lines" (CLAUDE.md)
    - Contains: Business logic that belongs in service layer
    - Complexity: Nested conditionals, retry orchestration mixed with HTTP

⚠️  **Business Logic in API Routes**
    - send/route.ts: Does chunk division (should be in service)
    - retry-chunk/route.ts: Contains 300+ line retry orchestration
    - Violation of separation of concerns

═══════════════════════════════════════════════════════════════════════════════

## Dependency Flow Summary

```
API Routes
    ↓
Service Orchestrators (generateNewsletter, processSendingChunk, etc.)
    ↓
Service Helpers (fetch*, generate*, validate*, etc.)
    ↓
Infrastructure Layer (@/lib/email, @/lib/db, prisma)
```

**Key Pattern**: API routes should be thin HTTP adapters calling service orchestrators,
but retry-chunk.ts violates this by containing heavy business logic.

═══════════════════════════════════════════════════════════════════════════════

## Cleanup Completed (2025-10-20)

✅ **Removed:**
- `NewsletterGenerator.tsx` component (600+ lines of unused code)
- GET endpoint from `/api/admin/newsletter/generate` route
- Confusing "regenerate on preview" anti-pattern

✅ **Current Production Behavior:**
- Preview: Uses stored newsletter content from database
- Test Email: Uses stored newsletter content from database
- Send: Uses stored newsletter content from database
- Only POST `/api/admin/newsletter/generate` creates new drafts

✅ **Validation:**
- `npm run check` passed (no lint or type errors)
