# Newsletter Analytics Implementation PRP

## Overview
Implement privacy-focused analytics tracking for the newsletter system that tracks aggregate open rates and link clicks without storing any personal data. All tracking is anonymous and data is retained for 1 year.

## Context & Research

### Existing Patterns to Follow

#### API Route Patterns
- **Dynamic routes**: `/src/app/api/groups/[slug]/route.ts` shows pattern for dynamic parameters
- **Authentication**: Use `withAdminAuth` wrapper from `/src/lib/api-auth.ts`
- **Different content types**: `/src/app/api/rss/appointments/route.ts` shows XML response pattern

#### Newsletter System Integration Points
- **HTML modification**: `fixUrlsInNewsletterHtml()` in `/src/lib/newsletter-service.ts` already modifies URLs
- **Link patterns**: 
  - Appointments: `${baseUrl}/termine/${appointment.id}`
  - Status reports: `${baseUrl}/gruppen/${group.slug}#report-${report.id}`
- **Sending flow**: Newsletter HTML generated → URLs fixed → Sent in chunks

#### Database Patterns
- **Relations with cascade**: See Group/StatusReport models in schema.prisma
- **JSON fields**: NewsletterItem uses `settings` field for JSON storage
- **Indexes**: Always add for foreign keys and lookup fields

#### UI Patterns
- **Admin pages**: Follow `/src/app/admin/groups/page.tsx` for layout
- **MUI v7 Grid**: Use new syntax `<Grid size={{ xs: 12, md: 6 }}>` NOT old `item` prop
- **Data display**: Use MUI Accordion, Tables, and Cards for metrics

### External Documentation
- **Next.js 15 API Routes**: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
- **MUI v7 Data Grid**: https://mui.com/x/react-data-grid/
- **Recharts Library**: https://recharts.org/en-US/guide (needs to be installed)
- **Prisma Relations**: https://www.prisma.io/docs/orm/prisma-schema/data-model/relations
- **Base64 URL Encoding**: https://developer.mozilla.org/en-US/docs/Glossary/Base64

### Key Implementation Considerations
1. **No recharts installed** - Need to add `recharts` package
2. **Serverless environment** - Keep tracking endpoints lightweight
3. **Privacy first** - No cookies, no user tracking, only aggregate counts
4. **URL rewriting** - Integrate with existing `fixUrlsInNewsletterHtml()` function
5. **1-year retention** - Add cleanup job for old data

## Implementation Blueprint

### TypeScript Pseudocode Approach

```typescript
// 1. Database Models (schema.prisma)
model NewsletterAnalytics {
  id              String   @id @default(cuid())
  newsletterId    String   @unique
  newsletter      NewsletterItem @relation(...)
  totalRecipients Int      @default(0)
  totalOpens      Int      @default(0)
  pixelToken      String   @unique @default(cuid())
  linkClicks      NewsletterLinkClick[]
  openEvents      NewsletterOpenEvent[]
}

// 2. Tracking URL Generation
function addTrackingToNewsletter(html: string, analyticsToken: string): string {
  // Add pixel
  const pixel = `<img src="${baseUrl}/api/newsletter/track/pixel/${analyticsToken}" width="1" height="1" style="display:none" alt="" />`;
  
  // Rewrite links
  html = html.replace(
    /href="([^"]+\/(termine|gruppen)[^"]+)"/g,
    (match, url) => {
      const encoded = Buffer.from(url).toString('base64url');
      return `href="${baseUrl}/api/newsletter/track/click/${analyticsToken}?url=${encoded}&type=..."`;
    }
  );
  
  return html + pixel;
}

// 3. Tracking Endpoints
// GET /api/newsletter/track/pixel/[token]
export async function GET(request, { params }) {
  const { token } = params;
  
  // Increment open count atomically
  await prisma.newsletterAnalytics.update({
    where: { pixelToken: token },
    data: { totalOpens: { increment: 1 } }
  });
  
  // Record hourly data
  const hour = Math.floor((Date.now() - sentAt) / (1000 * 60 * 60));
  await prisma.newsletterOpenEvent.upsert({
    where: { analyticsId_hour: { analyticsId, hour } },
    create: { analyticsId, hour, openCount: 1 },
    update: { openCount: { increment: 1 } }
  });
  
  // Return 1x1 transparent GIF
  return new Response(TRANSPARENT_GIF_BUFFER, {
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    }
  });
}

// 4. Analytics UI Components
function NewsletterAnalyticsPage({ newsletterId }) {
  const { data } = useAnalytics(newsletterId);
  
  return (
    <Box>
      {/* Metrics Cards */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 3 }}>
          <MetricCard title="Recipients" value={data.totalRecipients} />
        </Grid>
        {/* ... more metrics */}
      </Grid>
      
      {/* Charts */}
      <LineChart data={data.openTimeline}>
        <Line type="monotone" dataKey="opens" stroke="#FF0000" />
      </LineChart>
      
      {/* Link Performance Table */}
      <LinkPerformanceTable links={data.linkPerformance} />
    </Box>
  );
}
```

## Implementation Tasks

### 1. Database Setup
```bash
# Add to schema.prisma
# Run migration
npm run db:push
```

**Files to create/modify:**
- `prisma/schema.prisma` - Add NewsletterAnalytics, NewsletterLinkClick, NewsletterOpenEvent models

### 2. Install Dependencies
```bash
npm install recharts
npm install --save-dev @types/recharts
```

### 3. Create Tracking System

**Files to create:**
- `/src/lib/newsletter-analytics.ts` - Core analytics functions
  - `createNewsletterAnalytics()` - Initialize analytics when newsletter sent
  - `addTrackingToNewsletter()` - Add pixel and rewrite links
  - `generateTransparentPixel()` - Create 1x1 GIF buffer

**Files to modify:**
- `/src/lib/newsletter-sending.ts` - Call `addTrackingToNewsletter()` before sending
- `/src/app/api/admin/newsletter/send/route.ts` - Create analytics record

### 4. Create Tracking API Endpoints

**Files to create:**
- `/src/app/api/newsletter/track/pixel/[token]/route.ts` - Pixel tracking endpoint
- `/src/app/api/newsletter/track/click/[token]/route.ts` - Click tracking endpoint

### 5. Create Analytics API Endpoints

**Files to create:**
- `/src/app/api/admin/newsletter/analytics/[newsletterId]/route.ts` - Individual analytics
- `/src/app/api/admin/newsletter/analytics/dashboard/route.ts` - Overall dashboard

### 6. Create UI Components

**Files to create:**
- `/src/components/newsletter/NewsletterAnalyticsButton.tsx` - Button for archive table
- `/src/components/newsletter/analytics/MetricCard.tsx` - Reusable metric display
- `/src/components/newsletter/analytics/OpenTimelineChart.tsx` - Recharts line chart
- `/src/components/newsletter/analytics/LinkPerformanceTable.tsx` - MUI table
- `/src/app/admin/newsletter/analytics/[id]/page.tsx` - Individual analytics page
- `/src/app/admin/newsletter/analytics/page.tsx` - Dashboard page

**Files to modify:**
- `/src/components/newsletter/NewsletterArchives.tsx` - Add analytics button
- `/src/app/admin/page.tsx` - Add dashboard button

### 7. Add TypeScript Types

**Files to create:**
- `/src/types/newsletter-analytics.ts` - All analytics-related types

### 8. Create Tests

**Files to create:**
- `/src/tests/lib/newsletter-analytics.test.ts` - Unit tests for analytics functions
- `/src/tests/api/newsletter-tracking.test.ts` - API endpoint tests
- `/src/tests/components/newsletter/analytics/MetricCard.test.tsx` - Component tests

### 9. Add Data Cleanup

**Files to create:**
- `/src/lib/analytics-cleanup.ts` - Function to delete old analytics
- `/src/app/api/cron/cleanup-analytics/route.ts` - Scheduled cleanup endpoint

## Validation Gates

```bash
# 1. TypeScript compilation
npm run typecheck

# 2. Linting
npm run check

# 3. Unit tests
npm test src/tests/lib/newsletter-analytics.test.ts
npm test src/tests/api/newsletter-tracking.test.ts

# 4. Integration test
npm run dev
# Test pixel tracking:
curl -I http://localhost:3000/api/newsletter/track/pixel/test-token
# Should return Content-Type: image/gif

# 5. Full test suite
npm test
```

## Error Handling Strategy

1. **Tracking Endpoints**: Always return success (pixel/redirect) even if DB write fails
2. **Analytics API**: Use try-catch with proper error messages
3. **UI Components**: Show loading states and error boundaries
4. **Database Operations**: Use transactions where needed, handle unique constraints

## Security Considerations

1. **Rate Limiting**: Implement using middleware (10 req/sec per IP)
2. **Token Validation**: Verify token exists before tracking
3. **URL Validation**: Decode and validate redirect URLs to prevent open redirects
4. **Admin Only**: All analytics endpoints require authentication

## Performance Optimizations

1. **Pixel Response**: Cache the GIF buffer in memory
2. **Batch Updates**: Consider queueing tracking events
3. **Database Indexes**: Add composite indexes for analytics queries
4. **Chart Data**: Limit timeline to 7 days, aggregate older data

## Testing Strategy

1. **Unit Tests**: Mock Prisma for database operations
2. **Integration Tests**: Test full tracking flow
3. **UI Tests**: Use React Testing Library for components
4. **Load Tests**: Ensure tracking endpoints handle high traffic

## MUI v7 Gotchas

```typescript
// WRONG - Old Grid syntax
<Grid item xs={12}>

// CORRECT - New Grid syntax
<Grid size={{ xs: 12, md: 6 }}>

// Use new Data Grid
import { DataGrid } from '@mui/x-data-grid';
```

## Key Code Snippets

### Transparent GIF Generation
```typescript
// 1x1 transparent GIF (43 bytes)
const TRANSPARENT_GIF_BUFFER = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);
```

### URL Encoding for Tracking
```typescript
// Encode URL for query parameter
const encoded = Buffer.from(url).toString('base64url');

// Decode in tracking endpoint
const decoded = Buffer.from(encoded, 'base64url').toString('utf8');
```

### Atomic Counter Updates
```typescript
// Prisma atomic increment
await prisma.newsletterAnalytics.update({
  where: { pixelToken: token },
  data: { totalOpens: { increment: 1 } }
});
```

## Implementation Order

1. **Database** - Add models, run migration
2. **Dependencies** - Install recharts
3. **Core Library** - Analytics functions
4. **Tracking Endpoints** - Pixel and click handlers
5. **Newsletter Integration** - Modify sending flow
6. **Analytics API** - Data endpoints
7. **UI Components** - Build bottom-up (MetricCard → Page)
8. **Tests** - Write as you build each component
9. **Cleanup Job** - Add after everything works

## Success Metrics

- [ ] Pixel tracking returns image in <50ms
- [ ] Click tracking redirects in <100ms  
- [ ] Analytics load in <500ms
- [ ] All tests pass
- [ ] No personal data stored
- [ ] Charts render correctly

## Confidence Score: 9/10

The implementation plan is comprehensive with clear patterns to follow from the existing codebase. The only uncertainty is around the recharts library integration since it's not currently used, but the library is well-documented and straightforward to implement.