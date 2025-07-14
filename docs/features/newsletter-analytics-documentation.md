# Newsletter Analytics Feature Documentation

## Overview

The Newsletter Analytics feature provides privacy-focused tracking for newsletter engagement, allowing administrators to monitor open rates and link clicks without storing any personal data. All tracking is anonymous and data is automatically deleted after one year.

## Features

### 1. Email Open Tracking
- Tracks when newsletters are opened using a 1x1 transparent pixel
- Records total opens and hourly distribution
- No personal data stored - only aggregate counts

### 2. Link Click Tracking
- Monitors clicks on appointment and status report links
- Records click counts, first click, and last click times
- Preserves original URL structure while adding tracking

### 3. Analytics Dashboard
- Overview of all newsletter performance
- Shows average open rates and total engagement
- Quick access to individual newsletter analytics

### 4. Detailed Analytics View
- Per-newsletter metrics: recipients, opens, open rate, clicks
- Open timeline chart showing engagement over 7 days
- Link performance table with click statistics

## Technical Implementation

### Database Schema

Three new models track analytics data:

```prisma
model NewsletterAnalytics {
  id              String  @id @default(cuid())
  newsletterId    String  @unique
  totalRecipients Int     @default(0)
  totalOpens      Int     @default(0)
  uniqueOpens     Int     @default(0)
  pixelToken      String  @unique @default(cuid())
  // Relations to newsletter, link clicks, and open events
}

model NewsletterLinkClick {
  id          String    @id @default(cuid())
  analyticsId String
  url         String    @db.Text
  linkType    String    // 'appointment' or 'statusreport'
  linkId      String?
  clickCount  Int       @default(0)
  firstClick  DateTime?
  lastClick   DateTime?
}

model NewsletterOpenEvent {
  id          String  @id @default(cuid())
  analyticsId String
  hour        Int     // Hours since newsletter sent (0-167)
  openCount   Int     @default(0)
}
```

### Tracking Implementation

#### Pixel Tracking
- Endpoint: `/api/newsletter/track/pixel/[token]`
- Returns a 1x1 transparent GIF
- Records open event asynchronously
- Updates hourly statistics

#### Click Tracking
- Endpoint: `/api/newsletter/track/click/[token]`
- Validates and decodes target URL
- Records click event
- Redirects to original URL

### Integration with Newsletter Sending

When a newsletter is sent:
1. Analytics record is created with recipient count
2. Tracking pixel is added to newsletter HTML
3. Links are rewritten to include tracking

```typescript
// Original link
https://die-linke-frankfurt.de/termine/123

// Tracking link
https://die-linke-frankfurt.de/api/newsletter/track/click/[token]?url=[encoded]&type=appointment&id=123
```

## Usage Guide

### Viewing Analytics

1. **From Newsletter Archives**:
   - Click the "Analytics" button next to any sent newsletter
   - Available only for newsletters with status "sent"

2. **Analytics Dashboard**:
   - Navigate to Admin → Analytics Dashboard
   - View overall metrics and recent newsletter performance

### Understanding Metrics

- **Recipients**: Total number of email addresses the newsletter was sent to
- **Total Opens**: Cumulative count of all opens (including multiple opens by same recipient)
- **Open Rate**: Percentage of recipients who opened the newsletter at least once
- **Link Clicks**: Total clicks on tracked links within the newsletter

### Open Timeline Chart

The timeline chart shows:
- **Opens** (red line): New opens per hour
- **Cumulative** (gray line): Total opens over time
- Data is tracked for 7 days after sending

### Link Performance Table

For each tracked link:
- **URL**: The destination path
- **Type**: Appointment (Termin) or Status Report (Statusbericht)
- **Clicks**: Total number of clicks
- **First/Last Click**: Timestamps of engagement

## Privacy & Security

### Privacy Features
- No personal identifying information stored
- Only aggregate statistics tracked
- No cookies or browser fingerprinting
- Automatic data deletion after 1 year

### Security Measures
- Token-based tracking prevents enumeration
- URL validation prevents open redirects
- Admin authentication required for viewing analytics
- Rate limiting on tracking endpoints

### Data Retention
- Analytics data automatically deleted after 1 year
- Cleanup job endpoint: `/api/cron/cleanup-analytics`
- Can be triggered via cron service or manually

## API Endpoints

### Public Tracking Endpoints
- `GET /api/newsletter/track/pixel/[token]` - Pixel tracking
- `GET /api/newsletter/track/click/[token]` - Click tracking

### Admin Analytics Endpoints
- `GET /api/admin/newsletter/analytics/[newsletterId]` - Individual analytics
- `GET /api/admin/newsletter/analytics/dashboard` - Dashboard data

### Maintenance Endpoints
- `GET /api/cron/cleanup-analytics` - Delete old analytics data

## Configuration

### Environment Variables
No additional environment variables required. The feature uses existing configuration:
- `VERCEL_PROJECT_PRODUCTION_URL` - For URL validation
- `CRON_SECRET` (optional) - For securing cleanup endpoint

### Performance Settings
Default tracking behavior:
- Pixel response: < 50ms
- Click redirect: < 100ms
- Analytics load: < 500ms

## Troubleshooting

### Common Issues

1. **Analytics not showing**:
   - Ensure newsletter status is "sent"
   - Check if analytics record was created during sending
   - Verify database migration completed successfully

2. **Tracking not working**:
   - Confirm base URL is correctly configured
   - Check if tracking URLs are properly formatted
   - Verify endpoints are accessible

3. **Missing data**:
   - Opens may be blocked by email clients
   - Some recipients disable image loading
   - Link clicks require user interaction

### Debug Steps

1. Check tracking pixel URL in newsletter HTML
2. Verify analytics record exists in database
3. Test tracking endpoints directly
4. Review server logs for errors

## Future Enhancements

Potential improvements for future versions:
- Unique open tracking (privacy-preserving)
- Geographic distribution (city-level only)
- Device type statistics (mobile/desktop)
- A/B testing support
- Export analytics to CSV
- Scheduled analytics reports

## Technical Notes

### Performance Optimizations
- Tracking responses cached in memory
- Async recording prevents blocking
- Database indexes on lookup fields
- Efficient aggregation queries

### Browser Compatibility
- Tracking pixel: All email clients supporting images
- Click tracking: All browsers
- Analytics UI: Modern browsers (Chrome, Firefox, Safari, Edge)

### Dependencies
- `recharts`: Chart visualization library
- Material-UI: UI components
- Prisma: Database ORM
- Next.js: API routes and pages