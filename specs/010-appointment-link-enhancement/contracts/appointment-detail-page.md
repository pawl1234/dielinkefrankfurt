# API Contract: Appointment Detail Page

**Endpoint**: `/termine/[id]` (Page Route)
**Type**: Next.js App Router Page Component (Server-Side Rendering)
**File**: `/home/paw/nextjs/dielinkefrankfurt/src/app/termine/[id]/page.tsx`

---

## Overview

The appointment detail page displays comprehensive information about a single appointment. This contract documents the changes for dynamic metadata generation (Open Graph tags) and dual URL format support.

---

## URL Parameters

### Route Parameter: `[id]`

**Type**: `string` (path parameter)

**Supported Formats**:
- **Legacy numeric**: `123` (pure integer)
- **Slug-based**: `123-vollversammlung-oktober` (format: `{id}-{slug}`)

**Parsing Logic**:
```typescript
// Extract numeric ID from parameter
function extractAppointmentId(rawId: string): number | null {
  // Try pure number first (legacy)
  const directParse = parseInt(rawId, 10);
  if (!isNaN(directParse)) {
    return directParse;
  }

  // Extract from slug format (new)
  const match = rawId.match(/^(\d+)-/);
  if (match) {
    return parseInt(match[1], 10);
  }

  return null;
}
```

**Examples**:
| URL | Extracted ID | Status |
|-----|-------------|--------|
| `/termine/123` | 123 | ✅ Valid (legacy) |
| `/termine/123-vollversammlung` | 123 | ✅ Valid (new format) |
| `/termine/123-wrong-slug` | 123 | ✅ Valid (ID takes precedence) |
| `/termine/abc` | null | ❌ Invalid (404) |
| `/termine/abc-title` | null | ❌ Invalid (404) |

---

## Request Flow

### 1. Page Component Invocation

```typescript
export default async function AppointmentDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id: rawId } = await params;

  // Extract numeric ID
  const appointmentId = extractAppointmentId(rawId);

  if (!appointmentId) {
    notFound(); // Trigger Next.js 404 page
  }

  // Fetch appointment
  const appointment = await findAppointmentById(appointmentId);

  if (!appointment || appointment.status !== 'accepted') {
    notFound(); // Only show accepted appointments
  }

  // Render appointment details
  return <AppointmentDetails appointment={appointment} />;
}
```

### 2. Metadata Generation

```typescript
export async function generateMetadata({
  params
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id: rawId } = await params;
  const appointmentId = extractAppointmentId(rawId);

  if (!appointmentId) {
    return {
      title: 'Termin nicht gefunden | Die Linke Frankfurt',
    };
  }

  const appointment = await findAppointmentById(appointmentId);

  if (!appointment) {
    return {
      title: 'Termin nicht gefunden | Die Linke Frankfurt',
    };
  }

  return buildAppointmentMetadata(appointment);
}
```

---

## Response Structure

### Success Response (200 OK)

**Server-Side Rendered HTML** with embedded metadata:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Vollversammlung Oktober 2025 | Die Linke Frankfurt</title>

  <!-- Open Graph Tags -->
  <meta property="og:title" content="Vollversammlung Oktober 2025" />
  <meta property="og:description" content="Diskussion über aktuelle politische Themen..." />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://dielinkefrankfurt.de/termine/123-vollversammlung" />
  <meta property="og:site_name" content="Die Linke Frankfurt" />
  <meta property="og:image" content="https://blob.vercel-storage.com/cover.jpg" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />

  <!-- Event-specific Tags -->
  <meta property="event:start_time" content="2025-10-15T18:00:00+02:00" />
  <meta property="event:end_time" content="2025-10-15T20:00:00+02:00" />

  <!-- Twitter Card Tags -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Vollversammlung Oktober 2025" />
  <meta name="twitter:description" content="Diskussion über aktuelle politische Themen..." />
  <meta name="twitter:image" content="https://blob.vercel-storage.com/cover.jpg" />
</head>
<body>
  <!-- React component rendered HTML -->
</body>
</html>
```

### Not Found Response (404)

**Conditions**:
- Invalid appointment ID format
- Appointment not found in database
- Appointment status is not "accepted"

**Response**: Next.js default 404 page via `notFound()` helper.

---

## Metadata Structure

### buildAppointmentMetadata() Function

**File**: `/home/paw/nextjs/dielinkefrankfurt/src/lib/appointments/metadata-builder.ts`

**Input Type**:
```typescript
import type { Appointment } from '@prisma/client';

function buildAppointmentMetadata(appointment: Appointment): Metadata;
```

**Output Type**:
```typescript
import type { Metadata } from 'next';

interface Metadata {
  title: string;
  description?: string;
  openGraph?: {
    title: string;
    description: string;
    type: 'website';
    url: string;
    siteName: string;
    images: Array<{
      url: string;
      width: number;
      height: number;
      alt: string;
    }>;
  };
  twitter?: {
    card: 'summary_large_image' | 'summary';
    title: string;
    description: string;
    images: string[];
  };
  other?: Record<string, string>; // Event-specific tags
}
```

**Implementation Logic**:
```typescript
export function buildAppointmentMetadata(appointment: Appointment): Metadata {
  const siteUrl = getBaseUrl(); // from @/lib/base-url
  const pageUrl = appointment.slug
    ? `${siteUrl}/termine/${appointment.slug}`
    : `${siteUrl}/termine/${appointment.id}`;

  // Extract description (first 160 chars of mainText, HTML stripped)
  const description = extractDescription(appointment.mainText, 160);

  // Select image (cover image or default)
  const imageUrl = selectOpenGraphImage(appointment);

  // Build location string
  const location = formatLocationString(appointment);

  return {
    title: `${appointment.title} | Die Linke Frankfurt`,
    description,
    openGraph: {
      title: appointment.title,
      description,
      type: 'website',
      url: pageUrl,
      siteName: 'Die Linke Frankfurt',
      images: [{
        url: imageUrl,
        width: 1200,
        height: 630,
        alt: appointment.title,
      }],
    },
    twitter: {
      card: imageUrl ? 'summary_large_image' : 'summary',
      title: appointment.title,
      description,
      images: [imageUrl],
    },
    other: {
      'event:start_time': appointment.startDateTime.toISOString(),
      ...(appointment.endDateTime && {
        'event:end_time': appointment.endDateTime.toISOString(),
      }),
      ...(location && {
        'event:location': location,
      }),
    },
  };
}
```

---

## Helper Functions

### extractDescription()

```typescript
/**
 * Extracts plain text description from HTML content.
 *
 * @param html - HTML content
 * @param maxLength - Maximum characters (default 160)
 * @returns Plain text description
 */
function extractDescription(html: string, maxLength: number = 160): string {
  // Strip HTML tags
  const text = html.replace(/<[^>]*>/g, '');

  // Decode HTML entities
  const decoded = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');

  // Trim and truncate
  const trimmed = decoded.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  // Truncate at word boundary
  const truncated = trimmed.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  return lastSpace > 0
    ? truncated.substring(0, lastSpace) + '...'
    : truncated + '...';
}
```

### selectOpenGraphImage()

```typescript
/**
 * Selects appropriate Open Graph image for appointment.
 *
 * @param appointment - Appointment data
 * @returns Absolute URL to image
 */
function selectOpenGraphImage(appointment: Appointment): string {
  const siteUrl = getBaseUrl();

  // Priority 1: Featured appointment with cover images
  if (appointment.featured && appointment.metadata) {
    const coverImages = parseCoverImages(appointment.metadata);
    if (coverImages.length > 0) {
      return coverImages[0].url; // Already absolute (Vercel Blob)
    }
  }

  // Priority 2: Default site image
  return `${siteUrl}/images/og-default.jpg`;
}
```

### formatLocationString()

```typescript
/**
 * Formats location information as single string.
 *
 * @param appointment - Appointment data
 * @returns Formatted location string or undefined
 */
function formatLocationString(appointment: Appointment): string | undefined {
  const parts: string[] = [];

  if (appointment.street) {
    parts.push(appointment.street);
  }

  if (appointment.postalCode && appointment.city) {
    parts.push(`${appointment.postalCode} ${appointment.city}`);
  } else if (appointment.city) {
    parts.push(appointment.city);
  }

  if (appointment.locationDetails) {
    parts.push(appointment.locationDetails);
  }

  return parts.length > 0 ? parts.join(', ') : undefined;
}
```

---

## Validation Rules

### URL Parameter Validation

| Validation | Rule | Error Handling |
|------------|------|----------------|
| ID format | Must extract to positive integer | Return `notFound()` |
| ID range | Must be > 0 | Return `notFound()` |
| Slug text | Ignored (cosmetic only) | No validation needed |

### Appointment Visibility

| Condition | Rule | Error Handling |
|-----------|------|----------------|
| Exists | Appointment must exist in database | Return `notFound()` |
| Status | Must be "accepted" | Return `notFound()` |

**Note**: Rejected or pending appointments are not shown to public users.

---

## Performance Characteristics

### Server-Side Rendering
- **Metadata generation**: Runs once per request (cached by Next.js)
- **Database query**: 1 query per page load (appointment lookup)
- **HTML generation**: Server-side (SSR)
- **Cache duration**: 5 minutes (Next.js default for dynamic routes)

### Estimated Timings
| Operation | Duration |
|-----------|----------|
| ID extraction | <1ms |
| Database lookup | 5-20ms |
| Metadata generation | 2-5ms |
| HTML rendering | 10-30ms |
| **Total** | **<50ms** |

---

## Error Handling

### Invalid ID Format

```typescript
const appointmentId = extractAppointmentId('abc-invalid');
// Returns null

if (!appointmentId) {
  notFound(); // Next.js 404 page
}
```

### Database Errors

```typescript
try {
  const appointment = await findAppointmentById(appointmentId);
} catch (error) {
  logger.error('Database error loading appointment', {
    module: 'app/termine/[id]',
    context: { appointmentId, error },
  });
  throw error; // Next.js error boundary
}
```

### Metadata Generation Errors

```typescript
export async function generateMetadata({ params }): Promise<Metadata> {
  try {
    // ... fetch and build metadata
    return buildAppointmentMetadata(appointment);
  } catch (error) {
    logger.error('Metadata generation failed', {
      module: 'app/termine/[id]',
      context: { params, error },
    });

    // Return fallback metadata (never fail)
    return {
      title: 'Termin | Die Linke Frankfurt',
    };
  }
}
```

---

## Testing Checklist

### URL Routing
- [ ] Access `/termine/123` → renders appointment 123
- [ ] Access `/termine/123-vollversammlung` → renders appointment 123
- [ ] Access `/termine/123-wrong-slug` → renders appointment 123 (slug ignored)
- [ ] Access `/termine/abc` → returns 404
- [ ] Access `/termine/999999` (non-existent) → returns 404

### Metadata Rendering
- [ ] View page source → contains Open Graph tags
- [ ] Verify `og:title` matches appointment title
- [ ] Verify `og:description` contains truncated mainText
- [ ] Verify `og:image` points to cover image (if featured) or default
- [ ] Verify `og:url` uses slug format (if available) or numeric
- [ ] Verify `event:start_time` is ISO 8601 format

### Browser Behavior
- [ ] Browser tab title shows appointment title
- [ ] Multiple tabs show unique titles for different appointments

### Link Previews
- [ ] Share link in WhatsApp → shows rich preview with image
- [ ] Share link in Telegram → shows preview with title/description
- [ ] Share link in Outlook → shows preview card
- [ ] Validate with Facebook Sharing Debugger
- [ ] Validate with Twitter Card Validator

---

## Backwards Compatibility

### Existing Appointments (slug = NULL)

| Field | Value | Public URL | Metadata |
|-------|-------|------------|----------|
| `id` | 123 | `/termine/123` | ✅ Generated |
| `slug` | NULL | `/termine/123` | ✅ Generated |
| `title` | "Old Appointment" | `/termine/123` | ✅ Generated |

**Result**: Full metadata support without requiring slug.

### New Appointments (slug set)

| Field | Value | Public URL | Metadata |
|-------|-------|------------|----------|
| `id` | 456 | `/termine/456-vollversammlung` | ✅ Generated |
| `slug` | "456-vollversammlung" | `/termine/456-vollversammlung` | ✅ Generated |
| `title` | "Vollversammlung" | `/termine/456-vollversammlung` | ✅ Generated |

**Result**: Enhanced URL format with full metadata support.

---

## References

- Next.js generateMetadata: https://nextjs.org/docs/app/api-reference/functions/generate-metadata
- Open Graph Protocol: https://ogp.me/
- Research Document: `/home/paw/nextjs/dielinkefrankfurt/specs/010-appointment-link-enhancement/research.md`
- Data Model: `/home/paw/nextjs/dielinkefrankfurt/specs/010-appointment-link-enhancement/data-model.md`
