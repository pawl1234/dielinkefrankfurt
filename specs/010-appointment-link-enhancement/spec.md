# Feature Specification: Appointment Link Enhancement with Dynamic Titles and Slugs

**Feature Branch**: `010-appointment-link-enhancement`
**Created**: 2025-10-26
**Status**: Draft
**Input**: User description: "This project has appointments and when I send a link to my appointment via whatsapp, telegram or outlook to someone the link gets automatically formatted. Current the title of browser tab when opening the Appointment ins always the same. This should be changed to the title of the appointment. Also for the links we are currently using numbers like appointment 1, 2, 3 and so on. I think we should find something where the title of the appointment is part of the detail page of the appointment (slug). This change must be backwards compatible. I want to preserve the existing appointments with numbers and then have all new ones use the slug approach. Also I want the styling when sending the link to an appointment in a messenger to be well formatted. Check what needs to be done to have a proper styling when sending links via common messenger."

## Clarifications

### Session 2025-10-26

- Q: Should German umlauts in appointment titles be expanded or simplified when generating URL slugs? → A: Simplified (ä→a, ö→o, ü→u, ß→ss) for shorter, more readable URLs. Note: Appointment titles may contain emojis which must be removed during slug generation.
- Q: When should the system generate the slug for a new appointment? → A: On acceptance - Generate slug when admin accepts the appointment (status changes to "accepted").
- Q: What should be logged during slug generation to aid troubleshooting without creating noise? → A: Errors only - Log only when slug generation completely fails (no warnings for edge cases).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Appointment with Dynamic Title (Priority: P1)

When a user opens an appointment link, they should see the appointment's actual title in their browser tab instead of a generic title. This provides immediate context about which appointment they're viewing and makes it easier to manage multiple browser tabs.

**Why this priority**: This is the foundation for proper link sharing. Browser tab titles are the first thing users see and are essential for basic usability. This enhancement works for both existing and new appointments without requiring URL changes.

**Independent Test**: Can be fully tested by opening any appointment detail page and verifying the browser tab displays the appointment title. Delivers immediate value through improved tab navigation and link preview context.

**Acceptance Scenarios**:

1. **Given** a user opens an appointment detail page, **When** the page loads, **Then** the browser tab title displays the appointment's title followed by the site name (e.g., "Vollversammlung | Die Linke Frankfurt")
2. **Given** a user has multiple appointment tabs open, **When** they switch between tabs, **Then** each tab displays its unique appointment title for easy identification
3. **Given** an appointment has a very long title (over 60 characters), **When** the page loads, **Then** the title is appropriately truncated in the tab while remaining readable

---

### User Story 2 - Rich Link Previews for Messengers (Priority: P2)

When a user shares an appointment link in WhatsApp, Telegram, Outlook, or other messengers, the link should display with a rich preview showing the appointment title, description, date, time, and location. This makes shared links more informative and increases click-through rates.

**Why this priority**: Rich previews significantly improve the sharing experience and make appointments look professional. This feature benefits both the sender (links look credible) and receiver (they see what the event is about before clicking). It requires dynamic metadata generation but no URL structure changes.

**Independent Test**: Can be fully tested by sharing appointment links in various messengers (WhatsApp Web, Telegram, Outlook) and verifying rich previews appear with correct information. Delivers value through improved link engagement.

**Acceptance Scenarios**:

1. **Given** a user shares an appointment link in WhatsApp, **When** the link is pasted, **Then** WhatsApp displays a preview card with the appointment title, excerpt from description, date/time, and location
2. **Given** a user shares an appointment link in Telegram, **When** the link is pasted, **Then** Telegram displays a preview with appointment details and the site logo
3. **Given** a user shares an appointment link in Outlook email, **When** the recipient views the email, **Then** the link appears with a preview showing appointment information
4. **Given** an appointment has no location specified, **When** the link is shared, **Then** the preview displays date and time but gracefully omits the location field
5. **Given** an appointment has cover images in metadata, **When** the link is shared, **Then** the first cover image appears in the link preview

---

### User Story 3 - Slug-Based URLs for New Appointments (Priority: P3)

When a new appointment is created, the system should generate a URL that includes a readable slug based on the appointment title (e.g., `/termine/vollversammlung-oktober-2025` instead of `/termine/123`). This makes links more descriptive and SEO-friendly.

**Why this priority**: While nice to have, slug-based URLs provide marginal UX improvement beyond rich previews. Since existing appointments must remain accessible via numeric IDs (backwards compatibility), this is a progressive enhancement for new content only.

**Independent Test**: Can be fully tested by creating new appointments via the public form and verifying they receive slug-based URLs while existing appointments continue working with numeric IDs. Delivers value through improved URL readability and SEO.

**Acceptance Scenarios**:

1. **Given** an admin accepts a new appointment (created after feature deployment), **When** the system generates the public URL, **Then** the URL uses a slug format like `/termine/[id]-[slug]` (e.g., `/termine/456-vollversammlung-oktober`)
2. **Given** an appointment has a title with special characters (umlauts, spaces, punctuation), **When** the slug is generated, **Then** special characters are properly converted (ä→a, spaces→hyphens, punctuation removed)
3. **Given** multiple appointments have the same title, **When** slugs are generated, **Then** each slug is unique (using the numeric ID as a differentiator)
4. **Given** a user accesses an existing appointment via old numeric URL (`/termine/123`), **When** the page loads, **Then** the appointment displays correctly (backwards compatibility maintained)
5. **Given** a user accesses a new appointment via its slug URL, **When** the page loads, **Then** the appointment displays correctly
6. **Given** a user manually modifies a slug URL with the correct ID but wrong slug text, **When** the page loads, **Then** the appointment still displays (ID takes precedence for routing)

---

### User Story 4 - Search Engine Optimization (Priority: P4)

When search engines crawl appointment pages, they should find structured metadata including titles, descriptions, dates, and location information. This improves discoverability of public appointments through search engines.

**Why this priority**: SEO is a long-term benefit but not immediately visible to users. Since the primary use case is direct link sharing (messengers), search engine optimization is lower priority than immediate user-facing improvements.

**Independent Test**: Can be fully tested by inspecting page source code for meta tags, submitting URLs to Google Search Console, and verifying structured data validation. Delivers value through increased organic traffic over time.

**Acceptance Scenarios**:

1. **Given** a search engine crawls an appointment page, **When** it parses the HTML, **Then** it finds proper title, description, and Open Graph tags
2. **Given** a search engine indexes an appointment, **When** the appointment appears in search results, **Then** the listing shows the appointment title, formatted date, and location
3. **Given** an appointment page is crawled, **When** structured data is validated, **Then** it passes schema.org Event markup validation (if implemented)

---

### Edge Cases

- **Slug uniqueness**: What happens when two appointments have identical titles? (Handle by including numeric ID in slug: `123-vollversammlung`)
- **Very long titles**: How are slugs generated from titles exceeding 100 characters? (Truncate to 50 characters, remove trailing hyphens)
- **Special character handling**: How are German umlauts (ä, ö, ü) and ß converted in slugs? (Use simplified transliteration: ä→a, ö→o, ü→u, ß→ss for shorter URLs)
- **Emoji handling**: How are emojis in appointment titles handled during slug generation? (Remove all emojis completely from the slug)
- **Empty titles**: What happens if an appointment somehow has no title? (Use fallback: "termin-{id}")
- **URL migration**: What happens when someone has bookmarked an old numeric URL? (Continue supporting old URLs indefinitely for backwards compatibility)
- **Metadata image missing**: What happens when appointment has no cover image for Open Graph? (Use default site logo/image)
- **Invalid appointment ID**: What happens when someone accesses `/termine/999999-nonexistent`? (Display 404 page with helpful message)
- **Title changes**: If an admin edits an appointment title after creation, does the slug change? (No - slug is generated once at creation to avoid breaking shared links)
- **Link preview caching**: What happens when appointment details are updated after links have been shared? (Messengers cache previews for 7+ days - document this limitation)

## Requirements *(mandatory)*

### Functional Requirements

#### Dynamic Page Titles

- **FR-001**: System MUST generate dynamic page titles for appointment detail pages that include the appointment title
- **FR-002**: Page title MUST follow the format "{Appointment Title} | Die Linke Frankfurt"
- **FR-003**: System MUST handle title lengths gracefully, truncating at 60 characters if necessary while preserving readability
- **FR-004**: System MUST fall back to generic title if appointment data fails to load

#### Rich Link Previews (Open Graph & Twitter Cards)

- **FR-005**: System MUST generate Open Graph meta tags for each appointment detail page including:
  - og:title (appointment title)
  - og:description (first 160 characters of mainText, HTML stripped)
  - og:type (set to "event")
  - og:url (canonical URL of the appointment)
  - og:image (first cover image if featured appointment, else default site logo)
  - og:site_name ("Die Linke Frankfurt")

- **FR-006**: System MUST generate Twitter Card meta tags for each appointment including:
  - twitter:card (set to "summary_large_image" if image available, else "summary")
  - twitter:title (appointment title)
  - twitter:description (same as og:description)
  - twitter:image (same as og:image)

- **FR-007**: System MUST include event-specific Open Graph tags:
  - og:event:start_time (ISO 8601 formatted startDateTime)
  - og:event:end_time (ISO 8601 formatted endDateTime, if available)

- **FR-008**: System MUST format location information in og:description when available (street, postal code, city)

- **FR-009**: System MUST strip HTML tags and format text appropriately for meta descriptions

#### Slug-Based URLs

- **FR-010**: System MUST generate URL-friendly slugs from appointment titles when admin accepts the appointment (status changes to "accepted")
- **FR-011**: Slug generation MUST follow these rules:
  - Convert to lowercase
  - Replace spaces with hyphens
  - Simplify German umlauts: ä→a, ö→o, ü→u, ß→ss
  - Remove all emojis completely
  - Remove all punctuation except hyphens
  - Collapse multiple consecutive hyphens into one
  - Remove leading/trailing hyphens
  - Truncate to maximum 50 characters
  - Ensure uniqueness by including numeric ID

- **FR-012**: System MUST use URL format `/termine/[id]-[slug]` for new appointments (e.g., `/termine/456-vollversammlung-oktober`)
- **FR-013**: System MUST continue supporting legacy numeric-only URLs `/termine/[id]` for backwards compatibility
- **FR-014**: System MUST store generated slug in database for consistency
- **FR-015**: Routing logic MUST extract and use numeric ID for appointment lookup, ignoring slug portion
- **FR-016**: System MUST NOT regenerate slug if appointment title is edited after initial creation
- **FR-017**: System MUST log errors only when slug generation completely fails (no logging for normal operation or edge case handling)

#### Backwards Compatibility

- **FR-018**: System MUST continue to serve existing appointments via their numeric URLs (`/termine/[id]`) indefinitely
- **FR-019**: System MUST apply dynamic metadata generation to both old (numeric) and new (slug-based) URLs
- **FR-020**: System MUST NOT break existing bookmarks, shared links, or external references to numeric URLs

#### Error Handling

- **FR-021**: System MUST display appropriate 404 page when appointment ID does not exist
- **FR-022**: System MUST handle malformed URLs gracefully (e.g., `/termine/abc-invalid`)
- **FR-023**: System MUST provide fallback metadata if appointment data is missing or incomplete

### Key Entities

- **Appointment**: Existing entity with new optional field:
  - `slug` (String, nullable): URL-friendly version of title, generated once when admin accepts the appointment (status changes to "accepted"), never regenerated even if title is edited later
  - All other fields remain unchanged (title, mainText, startDateTime, endDateTime, street, city, postalCode, locationDetails, firstName, lastName, featured, metadata, fileUrls, status, etc.)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can identify appointment content from browser tab title without clicking into the page (100% of appointments show dynamic titles)
- **SC-002**: Shared appointment links display rich previews in WhatsApp, Telegram, and Outlook with at least title, date/time, and description visible
- **SC-003**: Link preview images appear for at least 80% of featured appointments (those with cover images)
- **SC-004**: All existing appointment URLs (numeric format) continue to function without any broken links (0% regression)
- **SC-005**: New appointments created after deployment use slug-based URLs for improved readability
- **SC-006**: Appointment pages pass Open Graph validation when tested with Facebook/LinkedIn debugging tools
- **SC-007**: Page load time for appointment detail pages increases by no more than 50ms due to metadata generation
- **SC-008**: Slug generation handles 100% of edge cases (special characters, long titles, duplicates) without errors

## Assumptions

1. **Messenger compatibility**: Open Graph tags are sufficient for rich previews in WhatsApp, Telegram, and Outlook (standard across platforms)
2. **Slug transliteration**: German umlauts will be simplified (ä→a, ö→o, ü→u, ß→ss) rather than expanded (ä→ae) to keep URLs shorter, and emojis will be completely removed
3. **Default image**: A suitable default Open Graph image (site logo or generic event image) exists or will be created
4. **No URL redirects**: Old numeric URLs will continue to work as-is without redirecting to new slug format (avoiding unnecessary redirects)
5. **Slug immutability**: Once generated on acceptance, slugs will not change even if appointment title is edited (preserving shared links)
6. **Database migration**: Adding the `slug` field to existing appointments can be done with default NULL values (no data migration needed for old appointments)
7. **ID format**: Appointment IDs will remain as auto-incrementing integers (existing schema)
8. **Character encoding**: UTF-8 encoding is properly configured for handling German characters in URLs and meta tags
9. **Cache invalidation**: Next.js cache configuration allows dynamic metadata to be properly served (current 5-minute cache is acceptable)
10. **Image URLs**: Cover images stored in Vercel Blob Storage are publicly accessible for Open Graph image embedding
11. **Minimal logging**: Slug generation will only log errors (failures), not warnings or debug info, to minimize log noise

## Constitutional Compliance Notes

This specification MUST be implemented according to the project constitution (`.specify/memory/constitution.md`). Key reminders:

**Type Safety & Code Quality**:
- NO `any` types (Principle I)
- Reuse types from `src/types/` before creating new ones (Principles I, XII)
- Follow domain-based architecture in `src/lib/` (Principle XI)
- Keep all files under 500 lines (Principle IX)

**User Experience**:
- ALL user-facing text MUST be in German (Principle VI)
- Validate all inputs server-side with Zod (Principle VIII)

**Development Standards**:
- Use `@/` path aliases for imports (Principle V)
- Use `logger` from `@/lib/logger.ts` for all logging (Principle VII)
- Follow KISS (Principle III) and DRY (Principle IV) principles
- NO automated tests (Principle II - manual testing only)

Refer to the full constitution for detailed guidance on each principle.
