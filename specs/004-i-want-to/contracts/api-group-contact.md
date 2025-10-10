# API Contract: Send Group Contact Request

**Endpoint**: `POST /api/groups/[slug]/contact`

**Purpose**: Send contact request email to group responsible persons and office

**Authentication**: None (public endpoint)

---

## Request

### Method
```
POST
```

### Headers
```
Content-Type: application/json
```

### URL Parameters
- `slug` (string, required): Group slug identifier

### Body
```json
{
  "requesterName": "Max Mustermann",
  "requesterEmail": "max@example.com",
  "message": "Ich interessiere mich für Ihre Arbeitsgruppe und würde gerne mehr erfahren..."
}
```

**Request Fields**:
- `requesterName` (string, required): Name of the person contacting the group
  - Min length: 2 characters
  - Max length: 100 characters
- `requesterEmail` (string, required): Email address for replies
  - Must be valid email format
  - Max length: 200 characters
- `message` (string, required): Message/inquiry text
  - Min length: 10 characters
  - Max length: 5000 characters

---

## Response

### Success Response (200 OK)

```json
{
  "success": true
}
```

**Response Fields**:
- `success` (boolean): Always `true` for successful email sending

### Error Responses

#### 400 Bad Request - Validation Error
```json
{
  "success": false,
  "error": "Name muss mindestens 2 Zeichen lang sein"
}
```

**Occurs when**:
- Required fields missing
- Field validation fails (email format, length constraints)
- Invalid data types

#### 404 Not Found - Group Not Found
```json
{
  "success": false,
  "error": "Arbeitsgruppe nicht gefunden"
}
```

**Occurs when**:
- Group slug does not exist
- Group exists but status is not ACTIVE

#### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Fehler beim Senden der Nachricht. Bitte versuchen Sie es erneut."
}
```

**Occurs when**:
- Email sending fails (SMTP error)
- Database query fails
- Unexpected server error

---

## Validation Rules

### Server-Side Validation (Zod Schema)

```typescript
{
  requesterName: z.string()
    .min(2, 'Name muss mindestens 2 Zeichen lang sein')
    .max(100, 'Name darf maximal 100 Zeichen lang sein')
    .trim(),

  requesterEmail: z.string()
    .email('Bitte geben Sie eine gültige E-Mail-Adresse ein')
    .max(200, 'E-Mail-Adresse darf maximal 200 Zeichen lang sein')
    .trim(),

  message: z.string()
    .min(10, 'Nachricht muss mindestens 10 Zeichen lang sein')
    .max(5000, 'Nachricht darf maximal 5000 Zeichen lang sein')
    .trim()
}
```

### Business Rules
- Group must have `status = 'ACTIVE'` to receive contact requests
- At least one responsible person recommended (but not enforced)
- If no responsible persons exist, email sent to office CC only
- Office CC email from newsletter settings (fallback to `process.env.CONTACT_EMAIL`)

---

## Email Details

### Email Recipients
- **To**: All responsible persons' email addresses (comma-separated)
- **CC**: Office contact email from newsletter settings
- **Reply-To**: Requester's email address

### Email Content
- **Subject**: `Kontaktanfrage für Gruppe: {group.name}`
- **Template**: `src/emails/notifications/group-contact-request.tsx`
- **Body includes**:
  - Group name
  - Requester name
  - Requester email
  - Message text
  - Footer with organization info

---

## Examples

### Example Request
```bash
curl -X POST https://example.com/api/groups/klimaschutz/contact \
  -H "Content-Type: application/json" \
  -d '{
    "requesterName": "Max Mustermann",
    "requesterEmail": "max@example.com",
    "message": "Ich interessiere mich für Ihre Arbeitsgruppe und würde gerne beim nächsten Treffen teilnehmen."
  }'
```

### Example Success Response
```json
{
  "success": true
}
```

### Example Validation Error Response
```json
{
  "success": false,
  "error": "Bitte geben Sie eine gültige E-Mail-Adresse ein"
}
```

### Example Not Found Response
```json
{
  "success": false,
  "error": "Arbeitsgruppe nicht gefunden"
}
```

---

## Implementation Notes

### Request Flow
1. Parse slug from URL parameters
2. Validate request body with Zod schema
3. Query group by slug with responsible persons
4. Check group exists and has ACTIVE status
5. Get office email from newsletter settings
6. Send email via `sendGroupContactEmail()`
7. Return success response

### Database Queries
```typescript
// Get group with responsible persons
const group = await findGroupBySlugForContact(slug);

// Get office email configuration
const settings = await getNewsletterSettings();
const officeEmail = settings.officeContactEmail || process.env.CONTACT_EMAIL;
```

### Email Sending
```typescript
await sendEmail({
  to: group.responsiblePersons.map(p => p.email).join(','),
  cc: officeEmail,
  replyTo: requesterEmail,
  subject: `Kontaktanfrage für Gruppe: ${group.name}`,
  html: renderedEmailTemplate
});
```

### Error Handling
- Validation errors: Return 400 with specific German error message
- Group not found: Return 404 with German error message
- Email sending failures: Log with structured logging, return 500 with generic German error
- All errors include `success: false` flag

### Security
- Input sanitization via Zod string validation and trim
- Email validation prevents malformed addresses
- No SQL injection risk (Prisma ORM)
- Rate limiting handled by hosting platform (Vercel)
- No CORS restrictions (same-origin only)

### Privacy
- Contact request NOT stored in database
- Only transient in-memory processing
- Email sent immediately and forgotten
- Logging includes group slug and success/failure only (no personal data)

### Logging
```typescript
logger.info('Group contact request sent', {
  module: 'api/groups/contact',
  context: {
    groupSlug: slug,
    recipientCount: group.responsiblePersons.length,
    officeEmailUsed: !!officeEmail
  }
});
```
