# Research: Appointment Link Enhancement

**Phase**: 0 (Research)
**Date**: 2025-10-26
**Purpose**: Research Next.js 15 metadata APIs, Open Graph implementation, slug generation patterns, and dynamic routing strategies

---

## 1. Next.js 15 Dynamic Metadata with generateMetadata()

### Overview
Next.js 15 App Router provides the `generateMetadata()` function for server-side dynamic metadata generation. This replaces the older `Head` component pattern.

### Implementation Pattern

```typescript
import { Metadata } from 'next';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  // Fetch data server-side
  const appointment = await fetchAppointmentData(params.id);

  if (!appointment) {
    return {
      title: 'Termin nicht gefunden',
    };
  }

  return {
    title: `${appointment.title} | Die Linke Frankfurt`,
    description: extractDescription(appointment.mainText),
    // Open Graph tags
    openGraph: {
      title: appointment.title,
      description: extractDescription(appointment.mainText),
      type: 'website',
      url: `https://example.com/termine/${params.id}`,
      images: [{ url: appointment.coverImage || '/images/og-default.jpg' }],
    },
  };
}
```

### Key Points
- **Server-side execution**: `generateMetadata()` runs on the server, allowing database queries
- **Async support**: Can fetch data asynchronously before generating metadata
- **Type safety**: Returns `Metadata` type from `next`
- **SEO benefits**: Metadata is in HTML on initial load (not client-rendered)
- **Caching**: Respects Next.js caching rules (default 5 minutes for dynamic routes)

### References
- Next.js Metadata API: https://nextjs.org/docs/app/api-reference/functions/generate-metadata
- Metadata object structure: https://nextjs.org/docs/app/api-reference/functions/generate-metadata#metadata-fields

---

## 2. Open Graph Meta Tags for Rich Link Previews

### Required Meta Tags for Messengers

#### Core Open Graph Tags
```typescript
openGraph: {
  title: 'Vollversammlung Oktober 2025',
  description: 'Diskussion über aktuelle politische Themen und Abstimmung...',
  type: 'website', // or 'event' for structured data
  url: 'https://dielinkefrankfurt.de/termine/123-vollversammlung-oktober',
  siteName: 'Die Linke Frankfurt',
  images: [{
    url: 'https://blob.vercel-storage.com/cover-image.jpg',
    width: 1200,
    height: 630,
    alt: 'Vollversammlung Oktober 2025',
  }],
}
```

#### Event-Specific Tags (Optional Enhancement)
```typescript
// Additional event metadata
other: {
  'event:start_time': '2025-10-15T18:00:00+02:00', // ISO 8601
  'event:end_time': '2025-10-15T20:00:00+02:00',
  'event:location': 'Bockenheimer Landstraße 58, 60323 Frankfurt',
}
```

#### Twitter Card Support
```typescript
twitter: {
  card: 'summary_large_image',
  title: 'Vollversammlung Oktober 2025',
  description: 'Diskussion über aktuelle politische Themen...',
  images: ['https://blob.vercel-storage.com/cover-image.jpg'],
}
```

### Messenger-Specific Behavior

| Messenger | Preview Type | Image Size | Caching |
|-----------|--------------|------------|---------|
| WhatsApp | Rich preview card | 1200x630px optimal | 7+ days |
| Telegram | Inline preview | 1200x630px optimal | Immediate + 7 days |
| Outlook | Link preview | 1200x630px optimal | Variable |
| Facebook | Share dialog | 1200x630px required | 24 hours (can force refresh) |

### Best Practices
- **Image dimensions**: 1200x630px (1.91:1 ratio) is standard for Open Graph
- **Description length**: 150-160 characters (longer text gets truncated)
- **Title length**: 60-70 characters for optimal display
- **Absolute URLs**: All URLs (images, canonical) must be absolute with protocol
- **Fallback image**: Always provide a default site logo/image

### Testing Tools
- Facebook Sharing Debugger: https://developers.facebook.com/tools/debug/
- Twitter Card Validator: https://cards-dev.twitter.com/validator
- LinkedIn Post Inspector: https://www.linkedin.com/post-inspector/

---

## 3. Slug Generation Patterns in TypeScript

### Requirements
Based on spec clarifications:
- Simplify German umlauts: ä→a, ö→o, ü→u, ß→ss (shorter URLs)
- Remove emojis completely
- Remove punctuation except hyphens
- Lowercase conversion
- Max 50 characters
- Include numeric ID for uniqueness

### Implementation Strategy

```typescript
/**
 * Generates a URL-friendly slug from appointment title.
 *
 * @param title - Appointment title
 * @param id - Appointment ID for uniqueness
 * @returns URL-friendly slug with ID prefix
 */
export function generateAppointmentSlug(title: string, id: number): string {
  if (!title || title.trim() === '') {
    return `${id}-termin`;
  }

  // Step 1: Normalize unicode and remove emojis
  const withoutEmojis = title.replace(/[\p{Emoji}\p{Emoji_Presentation}]/gu, '');

  // Step 2: Replace German umlauts (simplified)
  const umlautMap: Record<string, string> = {
    'ä': 'a', 'Ä': 'a',
    'ö': 'o', 'Ö': 'o',
    'ü': 'u', 'Ü': 'u',
    'ß': 'ss',
  };
  let normalized = withoutEmojis;
  for (const [umlaut, replacement] of Object.entries(umlautMap)) {
    normalized = normalized.replace(new RegExp(umlaut, 'g'), replacement);
  }

  // Step 3: Convert to lowercase
  normalized = normalized.toLowerCase();

  // Step 4: Remove all non-alphanumeric except spaces and hyphens
  normalized = normalized.replace(/[^a-z0-9\s-]/g, '');

  // Step 5: Replace spaces with hyphens
  normalized = normalized.replace(/\s+/g, '-');

  // Step 6: Collapse multiple consecutive hyphens
  normalized = normalized.replace(/-+/g, '-');

  // Step 7: Remove leading/trailing hyphens
  normalized = normalized.replace(/^-+|-+$/g, '');

  // Step 8: Truncate to 50 characters
  if (normalized.length > 50) {
    normalized = normalized.substring(0, 50);
    // Remove trailing hyphen if truncation created one
    normalized = normalized.replace(/-+$/, '');
  }

  // Step 9: Add ID prefix for uniqueness and fallback
  return normalized ? `${id}-${normalized}` : `${id}-termin`;
}
```

### Edge Cases Handled
- **Empty title**: Fallback to `{id}-termin`
- **Only emojis**: Removes all, fallback to `{id}-termin`
- **Special characters only**: Strips all, fallback to `{id}-termin`
- **Very long titles**: Truncate at 50 chars, clean trailing hyphens
- **Duplicate titles**: ID prefix ensures uniqueness

### Example Transformations

| Input Title | ID | Generated Slug |
|-------------|-----|----------------|
| "Vollversammlung Oktober 2025" | 123 | `123-vollversammlung-oktober-2025` |
| "Straßenfest für Ärztegewerkschaft" | 456 | `456-strassenfest-fur-arztegewerkschaft` |
| "Treffen 🎉 am Römerberg" | 789 | `789-treffen-am-romerberg` |
| "!!Special!! Characters..." | 101 | `101-special-characters` |
| "" (empty) | 202 | `202-termin` |

---

## 4. Next.js Dynamic Routing with Backwards Compatibility

### Current Route Pattern
```
src/app/termine/[id]/page.tsx
```
Matches: `/termine/123`, `/termine/456`

### Target Route Pattern (Dual Support)
Same file structure, enhanced param parsing:
```
src/app/termine/[id]/page.tsx
```
Matches:
- `/termine/123` (legacy numeric)
- `/termine/123-vollversammlung` (new slug format)

### Routing Implementation

```typescript
export default async function AppointmentDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id: rawId } = await params;

  // Extract numeric ID from param (supports both formats)
  const appointmentId = extractAppointmentId(rawId);

  if (!appointmentId) {
    notFound();
  }

  // Fetch appointment using numeric ID only
  const appointment = await findAppointmentById(appointmentId);

  if (!appointment) {
    notFound();
  }

  // Render appointment details
  return <AppointmentDetails appointment={appointment} />;
}

/**
 * Extracts numeric appointment ID from URL parameter.
 * Supports both legacy numeric format and new slug format.
 *
 * @param rawId - URL param (e.g., "123" or "123-vollversammlung")
 * @returns Numeric ID or null if invalid
 */
function extractAppointmentId(rawId: string): number | null {
  // Try parsing as pure number first (legacy format)
  const directParse = parseInt(rawId, 10);
  if (!isNaN(directParse)) {
    return directParse;
  }

  // Try extracting ID from slug format (new format: "123-title")
  const match = rawId.match(/^(\d+)-/);
  if (match) {
    return parseInt(match[1], 10);
  }

  return null;
}
```

### Key Design Decisions

1. **ID Takes Precedence**: Routing logic uses only the numeric ID for database lookup. The slug portion is cosmetic.
   - Benefit: Wrong slug text still works (e.g., `/termine/123-wrong-title` displays appointment 123)
   - Trade-off: No redirect to "correct" slug (keeps implementation simple per KISS principle)

2. **No URL Redirects**: Old numeric URLs continue to work as-is without redirecting to slug format.
   - Benefit: Zero breaking changes, simpler implementation
   - Trade-off: Users with old links don't see "pretty" URLs (acceptable trade-off)

3. **Slug Generation Timing**: Generate slug on admin acceptance (status change to "accepted")
   - Benefit: Only accepted appointments get slugs (rejected ones stay numeric)
   - Trade-off: Short window where accepted appointments might not have slugs yet (handled gracefully)

4. **Slug Immutability**: Once generated, slugs never change (even if title is edited)
   - Benefit: Shared links never break
   - Trade-off: Slug might not match current title (acceptable - ID is authoritative)

### Backwards Compatibility Matrix

| URL Format | Current Behavior | New Behavior | Status |
|------------|------------------|--------------|--------|
| `/termine/123` | Works | Works (unchanged) | ✅ Compatible |
| `/termine/abc` | 404 | 404 | ✅ Compatible |
| `/termine/123-slug` | N/A (404) | Works (extracts ID 123) | ✅ New feature |
| `/termine/123-wrong` | N/A (404) | Works (extracts ID 123) | ✅ Graceful handling |

---

## 5. Default Open Graph Image Storage

### Recommended Location
```
/home/paw/nextjs/dielinkefrankfurt/public/images/og-default.jpg
```

### Usage in Code
```typescript
const ogImage = appointment.coverImage || '/images/og-default.jpg';

openGraph: {
  images: [{
    url: new URL(ogImage, siteUrl).toString(), // Converts to absolute URL
    width: 1200,
    height: 630,
  }],
}
```

### Image Requirements
- **Format**: JPEG or PNG (JPEG preferred for file size)
- **Dimensions**: 1200x630px (1.91:1 ratio)
- **File size**: < 1MB (smaller is better for loading)
- **Content**: Site logo + generic event imagery or branding
- **Accessibility**: Should work as generic fallback for any appointment

### Alternative: Vercel Blob Storage
If the image needs dynamic generation or centralized management:
```typescript
// Upload to Vercel Blob
const { url } = await put('og-default.jpg', file, {
  access: 'public',
  contentType: 'image/jpeg',
});

// Store URL in newsletter settings or environment variable
process.env.OG_DEFAULT_IMAGE = url;
```

**Recommendation**: Use `public/images/` for simplicity (KISS principle). Only move to Blob if image needs frequent updates.

---

## 6. Admin Acceptance Workflow Integration

### Current Flow
1. User submits appointment via public form
2. Appointment created with `status: "pending"`
3. Admin reviews in `/admin/appointments`
4. Admin clicks "Akzeptieren" button
5. API endpoint updates `status: "accepted"`, sets `statusChangeDate`

### Enhanced Flow (with Slug Generation)
```typescript
// In API route: /api/admin/appointments/[id]/accept
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const appointmentId = parseInt(params.id, 10);

  // Fetch appointment
  const appointment = await findAppointmentById(appointmentId);

  if (!appointment) {
    return NextResponse.json({ error: 'Termin nicht gefunden' }, { status: 404 });
  }

  // Generate slug only if not already present
  let slug = appointment.slug;
  if (!slug) {
    try {
      slug = generateAppointmentSlug(appointment.title, appointment.id);
    } catch (error) {
      // Log error but don't fail acceptance
      logger.error('Slug generation failed during acceptance', {
        module: 'api/admin/appointments/accept',
        context: { appointmentId, error },
      });
      // Continue with acceptance even if slug generation fails
    }
  }

  // Update appointment
  await updateAppointmentById(appointmentId, {
    status: 'accepted',
    statusChangeDate: new Date(),
    slug, // Set slug (or keep existing)
  });

  return NextResponse.json({ success: true });
}
```

### Logging Strategy (Error-Only)
Per spec requirement (FR-017): Only log complete failures, no debug/info logs for normal operation.

```typescript
// ❌ DO NOT LOG (normal operation)
logger.info('Generating slug for appointment', { id, title });

// ❌ DO NOT LOG (edge case handling)
logger.warn('Title contains only emojis, using fallback', { id });

// ✅ DO LOG (complete failure)
logger.error('Slug generation failed', {
  module: 'appointments/slug-generator',
  context: { id, title, error: error.message },
  tags: ['slug-generation', 'critical'],
});
```

---

## 7. Implementation Checklist

### Phase 1: Database Schema
- [ ] Add `slug String?` field to Appointment model in `prisma/schema.prisma`
- [ ] Add index on `slug` field for performance (optional but recommended)
- [ ] Run `npm run db:push` to apply schema changes

### Phase 2: Slug Generation Utility
- [ ] Create `src/lib/appointments/slug-generator.ts`
- [ ] Implement `generateAppointmentSlug(title: string, id: number): string`
- [ ] Add unit test examples in JSDoc comments (manual testing)
- [ ] Export from `src/lib/appointments/index.ts`

### Phase 3: Metadata Builder
- [ ] Create `src/lib/appointments/metadata-builder.ts`
- [ ] Implement `buildAppointmentMetadata(appointment: Appointment): Metadata`
- [ ] Handle description extraction (strip HTML, truncate to 160 chars)
- [ ] Handle image selection (cover image or default)
- [ ] Format event-specific Open Graph tags
- [ ] Export from `src/lib/appointments/index.ts`

### Phase 4: Dynamic Routing
- [ ] Update `src/app/termine/[id]/page.tsx` to server component
- [ ] Implement `generateMetadata()` function
- [ ] Update param extraction logic to support slug format
- [ ] Add fallback error handling (404 for invalid IDs)

### Phase 5: Admin Acceptance Integration
- [ ] Modify admin acceptance API endpoint
- [ ] Add slug generation on acceptance (if not already present)
- [ ] Add error-only logging for slug generation failures
- [ ] Ensure acceptance succeeds even if slug generation fails

### Phase 6: Testing & Validation
- [ ] Manual test: Submit new appointment, accept in admin, verify slug generated
- [ ] Manual test: Access appointment via `/termine/[id]` (legacy format)
- [ ] Manual test: Access appointment via `/termine/[id]-[slug]` (new format)
- [ ] Manual test: Share link in WhatsApp/Telegram/Outlook, verify rich preview
- [ ] Manual test: Verify existing appointments still work with numeric URLs
- [ ] Manual test: Verify page titles in browser tabs
- [ ] Facebook Sharing Debugger: Validate Open Graph tags
- [ ] Run `npm run check` to validate types and linting

---

## 8. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Slug generation fails during acceptance | High (blocks feature) | Graceful fallback - continue acceptance without slug, log error |
| Slug collisions (rare) | Low | ID prefix ensures uniqueness |
| Metadata generation slows page load | Medium | Cache metadata result, async generation in `generateMetadata()` |
| Open Graph image too large | Low | Recommend max 1MB, optimize default image |
| Messenger cache not updating | Low | Document limitation (7-day cache), no workaround |
| Breaking existing bookmarks | Critical | Maintain backwards compatibility with numeric URLs |

---

## 9. Performance Considerations

### Slug Generation
- **Operation**: String manipulation (replace, regex, truncate)
- **Estimated time**: <1ms per slug
- **Impact**: Negligible (only runs once per appointment on acceptance)

### Metadata Generation
- **Operation**: Database query + string manipulation
- **Estimated time**: 5-20ms (depends on DB latency)
- **Caching**: Next.js caches metadata (default 5 minutes for dynamic routes)
- **Impact**: <50ms increase in page load time (within spec requirement)

### Database Impact
- **New field**: `slug String?` (nullable, ~50 bytes per row)
- **Index**: Optional index on `slug` (recommended for future slug-based lookups)
- **Storage increase**: ~0.05MB per 1000 appointments (negligible)

---

## 10. References & Documentation

### Next.js Documentation
- Metadata API: https://nextjs.org/docs/app/api-reference/functions/generate-metadata
- Dynamic Routes: https://nextjs.org/docs/app/building-your-application/routing/dynamic-routes
- Server Components: https://nextjs.org/docs/app/building-your-application/rendering/server-components

### Open Graph Protocol
- Official Spec: https://ogp.me/
- Facebook Best Practices: https://developers.facebook.com/docs/sharing/webmasters
- Twitter Cards: https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/abouts-cards

### Standards
- ISO 8601 (Date/Time): https://en.wikipedia.org/wiki/ISO_8601
- URL Slug Best Practices: https://developers.google.com/search/docs/crawling-indexing/url-structure

### Project-Specific
- Constitution: `/home/paw/nextjs/dielinkefrankfurt/.specify/memory/constitution.md`
- Spec: `/home/paw/nextjs/dielinkefrankfurt/specs/010-appointment-link-enhancement/spec.md`
- Prisma Schema: `/home/paw/nextjs/dielinkefrankfurt/prisma/schema.prisma`
- Appointment Operations: `/home/paw/nextjs/dielinkefrankfurt/src/lib/db/appointment-operations.ts`
