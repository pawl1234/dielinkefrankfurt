# API Contract: Get Groups Overview

**Endpoint**: `GET /api/groups/overview`

**Purpose**: Fetch all active groups with meeting information for public groups overview page

**Authentication**: None (public endpoint)

---

## Request

### Method
```
GET
```

### Headers
```
Content-Type: application/json
```

### Query Parameters
None

### Body
None (GET request)

---

## Response

### Success Response (200 OK)

```json
{
  "success": true,
  "groups": [
    {
      "id": "clx123abc456",
      "name": "Arbeitsgruppe Klimaschutz",
      "slug": "klimaschutz",
      "description": "<p>Wir setzen uns für lokale Klimaschutzmaßnahmen ein...</p>",
      "logoUrl": "https://blob.vercel-storage.com/logo-klimaschutz-abc123.png",
      "regularMeeting": "Jeden zweiten Mittwoch im Monat, 19:00 Uhr",
      "meetingStreet": "Musterstraße 123",
      "meetingCity": "Frankfurt am Main",
      "meetingPostalCode": "60311",
      "meetingLocationDetails": "Raum 204, 2. OG"
    },
    {
      "id": "clx456def789",
      "name": "Arbeitsgruppe Soziales",
      "slug": "soziales",
      "description": "<p>Wir kämpfen für soziale Gerechtigkeit...</p>",
      "logoUrl": null,
      "regularMeeting": null,
      "meetingStreet": null,
      "meetingCity": null,
      "meetingPostalCode": null,
      "meetingLocationDetails": null
    }
  ]
}
```

**Response Fields**:
- `success` (boolean): Always `true` for successful requests
- `groups` (array): Array of group objects sorted alphabetically by name
  - `id` (string): Group UUID
  - `name` (string): Group name
  - `slug` (string): URL-friendly identifier
  - `description` (string): HTML description of the group
  - `logoUrl` (string | null): URL to group logo image, or null if no logo
  - `regularMeeting` (string | null): Free text meeting schedule, or null if no regular meeting
  - `meetingStreet` (string | null): Street address of meeting location
  - `meetingCity` (string | null): City of meeting location
  - `meetingPostalCode` (string | null): Postal code of meeting location
  - `meetingLocationDetails` (string | null): Additional location details

### Error Responses

#### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Fehler beim Laden der Arbeitsgruppen"
}
```

**Occurs when**: Database query fails or unexpected server error

---

## Validation Rules

### Database Filtering
- Only groups with `status = 'ACTIVE'` are returned
- Groups sorted alphabetically by `name` field (ascending)

### Data Transformation
- All fields returned as-is from database
- No pagination (expected group count: 10-20)
- Description returned as HTML (no sanitization needed, already trusted admin content)

---

## Examples

### Example Request
```bash
curl -X GET https://example.com/api/groups/overview \
  -H "Content-Type: application/json"
```

### Example Success Response
```json
{
  "success": true,
  "groups": [
    {
      "id": "clx123",
      "name": "AG Bildung",
      "slug": "bildung",
      "description": "<p>Bildungspolitik für alle</p>",
      "logoUrl": "https://example.com/logo.png",
      "regularMeeting": "Jeden Montag, 18:00 Uhr",
      "meetingStreet": "Beispielstr. 1",
      "meetingCity": "Frankfurt",
      "meetingPostalCode": "60311",
      "meetingLocationDetails": "Hinterhaus"
    }
  ]
}
```

---

## Implementation Notes

### Database Query
Uses `findPublicGroupsWithMeeting()` from `src/lib/db/group-operations.ts`:
```typescript
const groups = await prisma.group.findMany({
  where: { status: 'ACTIVE' },
  orderBy: { name: 'asc' },
  select: {
    id: true,
    name: true,
    slug: true,
    description: true,
    logoUrl: true,
    regularMeeting: true,
    meetingStreet: true,
    meetingCity: true,
    meetingPostalCode: true,
    meetingLocationDetails: true
  }
});
```

### Performance
- No pagination needed (small dataset)
- Query optimized with specific field selection
- Indexed on `status` and `name` fields

### Error Handling
- Database errors logged with structured logging
- Generic error message returned to client (no sensitive details)
- HTTP 500 status code for all errors

### Security
- Public endpoint (no authentication required)
- Only ACTIVE groups exposed (NEW and ARCHIVED hidden)
- No user-submitted data in query (no injection risk)
