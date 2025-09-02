## FEATURE: Newsletter Analytics

This feature adds privacy-focused analytics tracking to the newsletter system, allowing administrators to measure engagement through open rates and link clicks while maintaining complete anonymity. The system tracks aggregate data per newsletter without any personal identifiers, providing valuable insights into communication effectiveness while respecting recipient privacy.

### USER STORIES

**As an admin user, I want to:**
- See how many recipients opened each newsletter so I can measure engagement
- Track which appointment and status report links were clicked to understand member interests
- View analytics for individual newsletters to evaluate specific campaign performance
- Access an overall dashboard showing trends across all newsletters over time
- Have all tracking happen automatically without additional configuration
- Ensure recipient privacy is maintained with no personal data collection

**As a newsletter recipient, I:**
- Have my privacy protected with anonymous tracking only
- Can view content without being individually tracked
- Experience no change in newsletter functionality or appearance

### INTEGRATION POINTS

**Newsletter System:**
- Modify newsletter HTML generation to include tracking pixel
- Rewrite appointment and status report links to include tracking
- Update newsletter sending process to initialize analytics data
- Extend NewsletterItem model to link with analytics

**Admin Interface:**
- Add analytics button to newsletter archive table rows
- Create new analytics page for individual newsletter statistics
- Add dashboard button to admin newsletter page
- Create overall analytics dashboard page

**Database:**
- New tables for storing analytics data
- Automatic cleanup of data older than 1 year
- Aggregate counters only, no individual tracking

### DATA MODEL

```prisma
// Analytics data for sent newsletters
model NewsletterAnalytics {
  id              String   @id @default(cuid())
  newsletterId    String   @unique
  newsletter      NewsletterItem @relation(fields: [newsletterId], references: [id], onDelete: Cascade)
  
  // Basic metrics
  totalRecipients Int      @default(0)
  totalOpens      Int      @default(0)  // Total count of opens (including multiple by same person)
  
  // Tracking pixel data
  pixelToken      String   @unique @default(cuid()) // Anonymous token for pixel tracking
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  // Link click data stored as relation
  linkClicks      NewsletterLinkClick[]
  
  // Time-based analytics stored as relation
  openEvents      NewsletterOpenEvent[]
  
  @@index([newsletterId])
  @@index([pixelToken])
  @@map("newsletter_analytics")
}

// Track individual link clicks
model NewsletterLinkClick {
  id              String   @id @default(cuid())
  analyticsId     String
  analytics       NewsletterAnalytics @relation(fields: [analyticsId], references: [id], onDelete: Cascade)
  
  // Link information
  linkType        String   // "appointment" or "status_report"
  linkTarget      String   // appointment ID or "group_slug#report_id"
  linkText        String   // The display text of the link for identification
  
  // Click count
  clickCount      Int      @default(0)
  
  // First and last click times for time-based analytics
  firstClickAt    DateTime?
  lastClickAt     DateTime?
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@unique([analyticsId, linkType, linkTarget])
  @@index([analyticsId])
  @@map("newsletter_link_click")
}

// Track open events for time-based analytics
model NewsletterOpenEvent {
  id              String   @id @default(cuid())
  analyticsId     String
  analytics       NewsletterAnalytics @relation(fields: [analyticsId], references: [id], onDelete: Cascade)
  
  // Track opens by hour for first 7 days
  hour            Int      // Hours since newsletter was sent (0-167 for 7 days)
  openCount       Int      @default(0)
  
  @@unique([analyticsId, hour])
  @@index([analyticsId])
  @@map("newsletter_open_event")
}
```

### API REQUIREMENTS

**Tracking Endpoints:**
```typescript
// GET /api/newsletter/track/pixel/[token]
// Returns 1x1 transparent pixel, increments open count
interface PixelTrackingResponse {
  // Returns image/gif with 1x1 transparent pixel
}

// GET /api/newsletter/track/click/[token]
// Tracks click and redirects to actual URL
interface ClickTrackingParams {
  token: string;        // Analytics token
  type: string;         // "appointment" or "status_report"
  target: string;       // Target ID or slug
  url: string;          // Actual destination URL (base64 encoded)
}

// GET /api/admin/newsletter/analytics/[newsletterId]
interface NewsletterAnalyticsResponse {
  newsletter: {
    id: string;
    subject: string;
    sentAt: string;
  };
  metrics: {
    totalRecipients: number;
    totalOpens: number;
    openRate: number;        // Percentage
    totalLinkClicks: number;
    clickRate: number;       // Percentage of recipients who clicked
    clickThroughRate: number; // Clicks per open
  };
  linkPerformance: Array<{
    linkType: string;
    linkTarget: string;
    linkText: string;
    clickCount: number;
    firstClickAt?: string;
    lastClickAt?: string;
  }>;
  openTimeline: Array<{
    hour: number;
    openCount: number;
  }>;
}

// GET /api/admin/newsletter/analytics/dashboard
interface AnalyticsDashboardResponse {
  summary: {
    totalNewslettersSent: number;
    averageOpenRate: number;
    averageClickRate: number;
    totalOpens: number;
    totalClicks: number;
  };
  recentNewsletters: Array<{
    id: string;
    subject: string;
    sentAt: string;
    recipientCount: number;
    openRate: number;
    clickRate: number;
  }>;
  trends: {
    openRates: Array<{ date: string; rate: number }>;
    clickRates: Array<{ date: string; rate: number }>;
  };
  topPerformingLinks: Array<{
    linkType: string;
    linkText: string;
    totalClicks: number;
    newsletterCount: number; // How many newsletters included this link
  }>;
}
```

### UI/UX DESIGN

**Newsletter Archive Table Enhancement:**
- Add "Analytics" button (with BarChart icon) for sent newsletters
- Button disabled for draft newsletters
- Opens individual newsletter analytics page

**Individual Newsletter Analytics Page (`/admin/newsletter/analytics/[id]`):**
- Header with newsletter subject and sent date
- Key metrics cards (MUI Grid layout):
  - Total Recipients
  - Total Opens (with open rate %)
  - Total Link Clicks (with click rate %)
  - Click-through Rate
- Link Performance table:
  - Link text/description
  - Type (Appointment/Status Report)
  - Click count
  - Bar chart visualization
- Open Timeline chart (Line chart using MUI/Recharts):
  - X-axis: Time since sent (hours/days)
  - Y-axis: Open count
  - Shows engagement decay over time

**Analytics Dashboard (`/admin/newsletter/analytics`):**
- Summary cards showing overall metrics
- Recent newsletters table with key metrics
- Trend charts:
  - Open rate trend (line chart)
  - Click rate trend (line chart)
- Top performing content:
  - Most clicked appointments
  - Most clicked status reports

**Visual Design:**
- Use MUI v7 components throughout
- Charts using recharts library (already used in project)
- Consistent color scheme with Die Linke branding (red #FF0000)
- Responsive design for mobile viewing

### SECURITY & PERMISSIONS

**Access Control:**
- All analytics endpoints require admin authentication
- Analytics pages only accessible to authenticated admin users

**Privacy Protection:**
- No personal data stored - only aggregate counts
- Tracking tokens are random UUIDs with no user association
- No cookies or browser fingerprinting
- Click tracking uses server-side redirect (no JavaScript)
- Pixel tracking returns same response regardless of tracking success

**Data Retention:**
- Automatic deletion of analytics data older than 1 year
- Implemented via scheduled job or on-demand cleanup

**Rate Limiting:**
- Pixel and click endpoints rate-limited to prevent abuse
- Maximum 10 requests per second per IP

### EXAMPLES

**Newsletter HTML with Tracking:**
```html
<!-- Tracking pixel at end of newsletter -->
<img src="https://die-linke-frankfurt.de/api/newsletter/track/pixel/abc123xyz" 
     width="1" height="1" style="display:none" alt="" />

<!-- Tracked appointment link -->
<a href="https://die-linke-frankfurt.de/api/newsletter/track/click/abc123xyz?type=appointment&target=clh3k4j5k0001qw9zg5d8f7xm&url=L3Rlcm1pbmUvY2xoM2s0ajVrMDAwMXF3OXpnNWQ4Zjd4bQ==">
  Mehr Informationen
</a>

<!-- Tracked status report link -->
<a href="https://die-linke-frankfurt.de/api/newsletter/track/click/abc123xyz?type=status_report&target=ag-soziales%23report-clh3k4j5k0002qw9zg5d8f7xn&url=L2dydXBwZW4vYWctc296aWFsZXMjcmVwb3J0LWNsaDNrNGo1azAwMDJxdzl6ZzVkOGY3eG4=">
  Mehr Infos
</a>
```

**Analytics Data Example:**
```json
{
  "newsletter": {
    "id": "clh3k4j5k0000qw9zg5d8f7xl",
    "subject": "Die Linke Frankfurt - Newsletter 15.03.2024",
    "sentAt": "2024-03-15T10:00:00Z"
  },
  "metrics": {
    "totalRecipients": 1250,
    "totalOpens": 425,
    "openRate": 34.0,
    "totalLinkClicks": 127,
    "clickRate": 10.16,
    "clickThroughRate": 29.88
  },
  "linkPerformance": [
    {
      "linkType": "appointment",
      "linkTarget": "clh3k4j5k0001qw9zg5d8f7xm",
      "linkText": "Mitgliederversammlung März 2024",
      "clickCount": 67,
      "firstClickAt": "2024-03-15T10:05:23Z",
      "lastClickAt": "2024-03-18T14:22:11Z"
    },
    {
      "linkType": "status_report",
      "linkTarget": "ag-soziales#report-clh3k4j5k0002qw9zg5d8f7xn",
      "linkText": "Bericht der AG Soziales",
      "clickCount": 45,
      "firstClickAt": "2024-03-15T10:12:45Z",
      "lastClickAt": "2024-03-17T09:33:52Z"
    }
  ]
}
```

### DOCUMENTATION

**Implementation References:**
- Email tracking best practices for privacy
- MUI v7 Data Grid for analytics tables
- Recharts library for data visualization
- Next.js API routes for tracking endpoints
- URL encoding/decoding for click tracking

**Similar Features:**
- Mailchimp analytics (but with stricter privacy)
- SendGrid engagement tracking
- Open-source solutions like Listmonk

**Technical Patterns:**
- Server-side tracking without JavaScript
- Transparent pixel generation
- URL parameter encoding for security
- Aggregate-only data storage

### OTHER CONSIDERATIONS

**Performance:**
- Tracking endpoints must be fast (<100ms response time)
- Use database indexes for quick analytics queries
- Consider caching analytics data for frequently accessed newsletters
- Batch update analytics to reduce database writes

**Email Deliverability:**
- Tracking pixel and rewritten links may affect spam scores
- Monitor delivery rates after implementation
- Consider making tracking optional per newsletter if issues arise

**Future Extensions:**
- Device type analytics (mobile vs desktop)
- Geographic analytics (country/city level only)
- A/B testing support for subject lines
- Automated insights and recommendations
- Export analytics as PDF reports

**Migration:**
- Existing sent newsletters won't have analytics
- Only new newsletters sent after feature deployment will be tracked
- Consider adding a "Analytics available from [date]" notice

**Monitoring:**
- Log tracking endpoint usage
- Monitor for abuse or unusual patterns
- Alert if tracking endpoints become slow
- Track database storage growth