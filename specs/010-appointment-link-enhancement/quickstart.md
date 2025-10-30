# Quickstart Guide: Appointment Link Enhancement

**Feature**: Appointment Link Enhancement with Dynamic Titles and Slugs
**Branch**: `010-appointment-link-enhancement`
**Audience**: Developers testing and validating the feature

---

## Overview

This guide provides step-by-step instructions for testing the Appointment Link Enhancement feature. The feature adds:
- Dynamic page titles in browser tabs
- Rich link previews for messengers (WhatsApp, Telegram, Outlook)
- Slug-based URLs for new appointments
- Backwards compatibility with existing numeric URLs

---

## Prerequisites

### Development Environment

Ensure you have the following set up:
- Node.js 18+ installed
- PostgreSQL database running (local or cloud)
- Vercel Blob Storage configured (for cover images)
- Environment variables configured (`.env.local`)

### Required Environment Variables

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/dielinke"

# NextAuth
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# Admin credentials (for testing)
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="your-admin-password"

# Vercel Blob Storage
BLOB_READ_WRITE_TOKEN="vercel_blob_token"
```

### Development Server

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Server runs at http://localhost:3000
```

---

## Setup Instructions

### 1. Database Schema Migration

Apply the schema changes to add the `slug` field:

```bash
# Generate Prisma client and push schema changes
npm run db:push
```

**Expected output**:
```
✔ Generated Prisma Client
✔ The database is now in sync with the Prisma schema.
```

**Verify the migration**:
```bash
# Open Prisma Studio
npm run db:studio

# Navigate to Appointment model
# Verify "slug" field exists (String?, nullable)
```

### 2. Add Default Open Graph Image

Place a default Open Graph image in the public directory:

```bash
# Create directory if needed
mkdir -p /home/paw/nextjs/dielinkefrankfurt/public/images

# Add default image (1200x630px recommended)
# File: /home/paw/nextjs/dielinkefrankfurt/public/images/og-default.jpg
```

**Image requirements**:
- Format: JPEG or PNG
- Dimensions: 1200x630px (1.91:1 ratio)
- File size: <1MB
- Content: Site logo + generic event imagery

**Temporary option**: Use a placeholder until final image is ready:
```bash
# Download a placeholder (example)
curl -o public/images/og-default.jpg \
  https://via.placeholder.com/1200x630/E53935/FFFFFF?text=DIE+LINKE+Frankfurt
```

### 3. Verify Code Changes

Run the validation commands:

```bash
# TypeScript type checking + ESLint
npm run check
```

**Expected output**:
```
✔ TypeScript compilation successful
✔ ESLint found no issues
```

If errors appear, fix them before proceeding to testing.

---

## Testing Workflow

### Phase 1: Database & Slug Generation

#### Test 1.1: Verify Schema Changes

```bash
# Open Prisma Studio
npm run db:studio

# Navigate to Appointment model
# Check that "slug" field exists and is nullable
# Check that existing appointments have slug = null
```

#### Test 1.2: Create Test Appointment

**Via public form**:
1. Navigate to http://localhost:3000/termine
2. Click "Neuen Termin einreichen"
3. Fill in form:
   - Title: "Vollversammlung Oktober 2025"
   - Description: "Diskussion über aktuelle politische Themen und Abstimmung über wichtige Anträge."
   - Date: Select a future date
   - Time: "18:00"
   - Location: "Bockenheimer Landstraße 58, 60323 Frankfurt"
4. Submit form
5. Note the appointment ID (e.g., ID 123)

**Expected result**: Appointment created with `status = "pending"`, `slug = NULL`

#### Test 1.3: Accept Appointment (Slug Generation)

**Via admin dashboard**:
1. Log in to admin: http://localhost:3000/admin
   - Username: `admin` (from env)
   - Password: `your-admin-password` (from env)
2. Navigate to "Termine verwalten"
3. Find the test appointment (ID 123)
4. Click "Akzeptieren" button
5. Verify success message

**Verify in Prisma Studio**:
```bash
npm run db:studio

# Find appointment ID 123
# Verify:
# - status = "accepted"
# - slug = "123-vollversammlung-oktober-2025" (or similar)
# - statusChangeDate is set
```

**Expected slug format**: `{id}-{normalized-title}`
- Example: "123-vollversammlung-oktober-2025"
- Lowercase, hyphens, no special chars

---

### Phase 2: URL Routing

#### Test 2.1: Legacy Numeric URL

```bash
# Access appointment via numeric ID
# Browser: http://localhost:3000/termine/123
```

**Expected behavior**:
- ✅ Page loads successfully
- ✅ Appointment details displayed
- ✅ Browser tab title: "Vollversammlung Oktober 2025 | Die Linke Frankfurt"
- ✅ No redirect or error

#### Test 2.2: Slug-Based URL

```bash
# Access appointment via slug (check actual slug in database)
# Browser: http://localhost:3000/termine/123-vollversammlung-oktober-2025
```

**Expected behavior**:
- ✅ Page loads successfully
- ✅ Same appointment displayed (ID 123)
- ✅ Browser tab title matches appointment title
- ✅ No redirect to numeric URL

#### Test 2.3: Wrong Slug (Graceful Handling)

```bash
# Access with correct ID but wrong slug text
# Browser: http://localhost:3000/termine/123-wrong-title-here
```

**Expected behavior**:
- ✅ Page loads successfully (ID takes precedence)
- ✅ Correct appointment displayed (ID 123)
- ✅ No error or redirect

#### Test 2.4: Invalid URLs (404 Handling)

```bash
# Test various invalid formats
# Browser: http://localhost:3000/termine/abc
# Browser: http://localhost:3000/termine/999999
# Browser: http://localhost:3000/termine/abc-invalid
```

**Expected behavior**:
- ✅ 404 page displayed
- ✅ Error message in German: "Termin nicht gefunden"

---

### Phase 3: Dynamic Metadata (Open Graph)

#### Test 3.1: View Page Source

```bash
# Access appointment page
# Browser: http://localhost:3000/termine/123-vollversammlung-oktober-2025

# View source: Ctrl+U (or right-click → "View Page Source")
```

**Verify HTML contains**:
```html
<title>Vollversammlung Oktober 2025 | Die Linke Frankfurt</title>

<!-- Open Graph tags -->
<meta property="og:title" content="Vollversammlung Oktober 2025" />
<meta property="og:description" content="Diskussion über aktuelle politische..." />
<meta property="og:type" content="website" />
<meta property="og:url" content="http://localhost:3000/termine/123-vollversammlung-oktober-2025" />
<meta property="og:site_name" content="Die Linke Frankfurt" />
<meta property="og:image" content="http://localhost:3000/images/og-default.jpg" />

<!-- Event-specific tags -->
<meta property="event:start_time" content="2025-10-15T18:00:00+02:00" />

<!-- Twitter Card tags -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Vollversammlung Oktober 2025" />
```

#### Test 3.2: Facebook Sharing Debugger

1. Open: https://developers.facebook.com/tools/debug/
2. Enter URL: `http://localhost:3000/termine/123-vollversammlung-oktober-2025`
   - **Note**: Must be publicly accessible (use ngrok for local testing)
3. Click "Debug"

**Expected results**:
- ✅ Title: "Vollversammlung Oktober 2025"
- ✅ Description: First ~160 characters of appointment description
- ✅ Image: Default OG image or cover image (if featured)
- ✅ No errors or warnings

#### Test 3.3: Twitter Card Validator

1. Open: https://cards-dev.twitter.com/validator
2. Enter URL: (publicly accessible version of appointment URL)
3. Click "Preview card"

**Expected results**:
- ✅ Card type: "Summary with Large Image" (if image present)
- ✅ Title and description displayed
- ✅ Image preview shown

---

### Phase 4: Link Sharing (Messengers)

**Note**: These tests require a publicly accessible URL. Use ngrok for local testing:

```bash
# Install ngrok (if not already installed)
# https://ngrok.com/download

# Expose local server
ngrok http 3000

# Copy the public HTTPS URL (e.g., https://abc123.ngrok.io)
```

#### Test 4.1: WhatsApp Link Preview

1. Open WhatsApp Web: https://web.whatsapp.com
2. Select a chat (or use "Saved Messages" if available)
3. Paste appointment URL: `https://abc123.ngrok.io/termine/123-vollversammlung-oktober-2025`
4. Wait for preview to load

**Expected behavior**:
- ✅ Rich preview card appears
- ✅ Displays appointment title
- ✅ Displays description excerpt
- ✅ Displays image (default OG image or cover image)

#### Test 4.2: Telegram Link Preview

1. Open Telegram Web: https://web.telegram.org
2. Select a chat or use "Saved Messages"
3. Paste appointment URL
4. Wait for preview to load

**Expected behavior**:
- ✅ Inline preview appears
- ✅ Shows title, description, and image
- ✅ Clickable link

#### Test 4.3: Outlook Link Preview

1. Open Outlook Web: https://outlook.com
2. Compose new email
3. Paste appointment URL in email body
4. Wait for preview to render

**Expected behavior**:
- ✅ Link preview card appears
- ✅ Shows title and description
- ✅ May show image (depends on Outlook version)

---

### Phase 5: Edge Cases & Backwards Compatibility

#### Test 5.1: Old Appointment (No Slug)

**Setup**: Find an existing appointment created before this feature (slug = NULL)

```bash
# Access old appointment via numeric URL
# Browser: http://localhost:3000/termine/1
```

**Expected behavior**:
- ✅ Page loads successfully
- ✅ Dynamic metadata generated (title, Open Graph tags)
- ✅ Browser tab shows appointment title
- ✅ URL remains numeric (no slug)

#### Test 5.2: Appointment with Emoji Title

**Setup**: Create appointment with emojis in title:
- Title: "Treffen 🎉 am Römerberg 🏛️"

**After acceptance, verify**:
```bash
npm run db:studio

# Check slug field
# Expected: "123-treffen-am-romerberg" (emojis removed)
```

#### Test 5.3: Appointment with Umlauts

**Setup**: Create appointment with German umlauts:
- Title: "Straßenfest für Ärztegewerkschaft"

**After acceptance, verify slug**:
```bash
# Expected slug: "456-strassenfest-fur-arztegewerkschaft"
# ä → a, ö → o, ü → u, ß → ss
```

#### Test 5.4: Very Long Title

**Setup**: Create appointment with long title (>100 characters):
- Title: "Langes Titel für Testing der Slug-Generierung mit vielen Wörtern die über die maximale Länge hinausgehen"

**After acceptance, verify slug**:
```bash
# Expected slug: truncated to ~50 characters
# Example: "789-langes-titel-fur-testing-der-slug-generierung"
```

#### Test 5.5: Slug Generation Failure

**Manual test** (requires code modification):
1. Temporarily modify `generateAppointmentSlug()` to throw error
2. Accept appointment
3. Verify:
   - ✅ Acceptance succeeds
   - ✅ Status = "accepted"
   - ✅ Slug = NULL
   - ✅ Error logged (check server console)
   - ✅ Appointment accessible via numeric URL

---

## Validation Checklist

### Feature Completeness

- [ ] Dynamic page titles work for all appointments
- [ ] Open Graph tags generated correctly
- [ ] Slug-based URLs work for new appointments
- [ ] Legacy numeric URLs still work (backwards compatible)
- [ ] Default OG image displays when no cover image
- [ ] Featured appointments show cover image in OG tags
- [ ] Link previews work in WhatsApp/Telegram/Outlook

### Code Quality

- [ ] `npm run check` passes (no type errors, no lint errors)
- [ ] All files under 500 lines
- [ ] JSDoc comments on all functions
- [ ] No `any` types used
- [ ] All imports use `@/` path alias
- [ ] Error messages in German
- [ ] Logging uses `logger` from `@/lib/logger.ts` (errors only)

### Testing Coverage

- [ ] Tested legacy numeric URLs
- [ ] Tested slug-based URLs
- [ ] Tested wrong slug text (graceful handling)
- [ ] Tested invalid URLs (404)
- [ ] Tested Open Graph tags (view source)
- [ ] Tested link previews in messengers
- [ ] Tested edge cases (emojis, umlauts, long titles)
- [ ] Tested backwards compatibility (old appointments)

---

## Troubleshooting

### Issue: Slug Not Generated

**Symptoms**: Appointment accepted but slug = NULL

**Diagnosis**:
1. Check server console for error logs
2. Check database: `npm run db:studio` → verify slug field
3. Verify `generateAppointmentSlug()` function exists

**Solution**:
- Review error logs for specific failure reason
- Verify slug generation code is correct
- If needed, manually set slug in Prisma Studio for testing

### Issue: 404 on Slug-Based URL

**Symptoms**: `/termine/123-slug` returns 404

**Diagnosis**:
1. Verify slug exists in database (Prisma Studio)
2. Check URL parameter extraction logic in `page.tsx`
3. Verify numeric ID is correctly parsed from slug

**Solution**:
- Review `extractAppointmentId()` function
- Test ID extraction logic separately
- Ensure regex pattern matches slug format

### Issue: Open Graph Tags Not Showing

**Symptoms**: Link previews don't appear in messengers

**Diagnosis**:
1. View page source → check if `<meta property="og:*">` tags exist
2. Validate with Facebook Sharing Debugger
3. Check if images are publicly accessible

**Solution**:
- Verify `generateMetadata()` function is implemented
- Check image URLs are absolute (not relative)
- Ensure images are publicly accessible (not behind auth)
- Clear messenger cache (may take 7+ days naturally)

### Issue: Type Errors

**Symptoms**: `npm run check` fails with type errors

**Diagnosis**:
```bash
npm run typecheck

# Review specific errors
```

**Common fixes**:
- Import missing types from `@prisma/client` or `@/types/`
- Ensure all function parameters have types
- Remove any `any` types
- Use proper Prisma types (e.g., `Appointment` from `@prisma/client`)

---

## Performance Testing

### Page Load Time

**Measure metadata generation overhead**:

1. Open browser DevTools (F12)
2. Navigate to Network tab
3. Access appointment page: `/termine/123-slug`
4. Check "Time to First Byte" (TTFB)

**Expected**: TTFB increase <50ms compared to pages without metadata generation

### Database Query Performance

**Monitor query execution time**:

```bash
# Enable Prisma query logging (development only)
# In .env.local:
DEBUG="prisma:query"

# Restart dev server
npm run dev

# Access appointment page
# Check console for query execution times
```

**Expected**: Appointment lookup <20ms (depends on database latency)

---

## Deployment Checklist

### Pre-Deployment

- [ ] All tests pass locally
- [ ] `npm run check` passes (no errors)
- [ ] Default OG image committed to repo (`public/images/og-default.jpg`)
- [ ] Database migration plan reviewed
- [ ] Backwards compatibility verified

### Production Deployment

```bash
# 1. Create feature branch
git checkout -b 010-appointment-link-enhancement

# 2. Commit all changes
git add .
git commit -m "Add appointment link enhancement with dynamic titles and slugs"

# 3. Push to remote
git push origin 010-appointment-link-enhancement

# 4. Create pull request (manual step in GitHub)

# 5. After PR approved, merge to main

# 6. Deploy to Vercel (automatic on main branch)
```

### Post-Deployment Verification

1. Run database migration on production:
   - Vercel will run `prisma generate` automatically
   - Verify `slug` field exists in production database

2. Test production URLs:
   - Access existing appointments (legacy URLs)
   - Create new appointment via public form
   - Accept appointment in admin dashboard
   - Verify slug generated
   - Test slug-based URL

3. Validate Open Graph tags:
   - Use Facebook Sharing Debugger with production URL
   - Share link in WhatsApp/Telegram
   - Verify rich previews work

---

## Support & Documentation

### Reference Documents

- **Spec**: `specs/010-appointment-link-enhancement/spec.md`
- **Research**: `specs/010-appointment-link-enhancement/research.md`
- **Data Model**: `specs/010-appointment-link-enhancement/data-model.md`
- **API Contracts**: `specs/010-appointment-link-enhancement/contracts/`
- **Constitution**: `.specify/memory/constitution.md`

### Key Files Changed

- `/prisma/schema.prisma` - Added `slug` field
- `/src/app/termine/[id]/page.tsx` - Added metadata generation
- `/src/lib/appointments/slug-generator.ts` - Slug generation utility
- `/src/lib/appointments/metadata-builder.ts` - Metadata builder utility
- `/src/lib/db/appointment-operations.ts` - Optional slug lookup
- `/public/images/og-default.jpg` - Default Open Graph image

### Contact

For questions or issues during testing:
- Review feature spec for requirements
- Check troubleshooting section above
- Review error logs in server console
- Consult project constitution for standards

---

## Quick Command Reference

```bash
# Development
npm run dev                # Start dev server
npm run check              # Run lint + typecheck
npm run lint               # ESLint only
npm run typecheck          # TypeScript only

# Database
npm run db:push            # Apply schema changes
npm run db:studio          # Open Prisma Studio

# Testing
ngrok http 3000            # Expose local server for messenger testing
```

---

**Last Updated**: 2025-10-26
**Feature Status**: Implementation phase
