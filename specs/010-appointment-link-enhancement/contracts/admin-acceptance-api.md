# API Contract: Admin Appointment Acceptance

**Endpoint**: `/api/admin/appointments/[id]/accept` (or similar)
**Method**: POST/PATCH
**Type**: API Route (Server-Side)
**Authentication**: Required (NextAuth.js session)

---

## Overview

This API endpoint handles admin acceptance of appointments. The enhancement adds automatic slug generation during the acceptance workflow. If slug generation fails, the acceptance still succeeds (graceful degradation).

---

## Request

### HTTP Method
`POST` or `PATCH` (depends on existing implementation)

### URL Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | number (path) | Yes | Appointment ID to accept |

### Headers

```http
POST /api/admin/appointments/123/accept HTTP/1.1
Content-Type: application/json
Cookie: next-auth.session-token=...
```

### Request Body

**Option 1: No body** (if endpoint only handles acceptance):
```json
{}
```

**Option 2: With optional fields** (if endpoint supports additional updates):
```json
{
  "processingNotes": "Approved for newsletter"
}
```

### Authentication

- **Required**: Valid NextAuth.js session
- **Role**: Admin/authenticated user
- **Validation**: Session checked via `getServerSession()` or middleware

---

## Response

### Success Response (200 OK)

```json
{
  "success": true,
  "appointment": {
    "id": 123,
    "title": "Vollversammlung Oktober 2025",
    "status": "accepted",
    "slug": "123-vollversammlung-oktober-2025",
    "statusChangeDate": "2025-10-26T14:30:00.000Z"
  }
}
```

### Success Response (Slug Generation Failed)

If slug generation fails, acceptance still succeeds:

```json
{
  "success": true,
  "appointment": {
    "id": 123,
    "title": "Vollversammlung Oktober 2025",
    "status": "accepted",
    "slug": null,
    "statusChangeDate": "2025-10-26T14:30:00.000Z"
  },
  "warnings": ["Slug-Generierung fehlgeschlagen"]
}
```

### Error Responses

#### 401 Unauthorized
```json
{
  "error": "Nicht authentifiziert"
}
```

#### 404 Not Found
```json
{
  "error": "Termin nicht gefunden"
}
```

#### 400 Bad Request
```json
{
  "error": "Termin ist bereits akzeptiert"
}
```

#### 500 Internal Server Error
```json
{
  "error": "Fehler beim Akzeptieren des Termins"
}
```

---

## Implementation

### Existing Endpoint Enhancement

**File**: Likely `/home/paw/nextjs/dielinkefrankfurt/src/app/api/admin/appointments/[id]/accept/route.ts` or similar

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { findAppointmentById, updateAppointmentById } from '@/lib/db/appointment-operations';
import { generateAppointmentSlug } from '@/lib/appointments/slug-generator';
import { logger } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authentication check
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert' },
        { status: 401 }
      );
    }

    // 2. Parse appointment ID
    const { id: rawId } = await params;
    const appointmentId = parseInt(rawId, 10);

    if (isNaN(appointmentId)) {
      return NextResponse.json(
        { error: 'Ungültige Termin-ID' },
        { status: 400 }
      );
    }

    // 3. Fetch appointment
    const appointment = await findAppointmentById(appointmentId);

    if (!appointment) {
      return NextResponse.json(
        { error: 'Termin nicht gefunden' },
        { status: 404 }
      );
    }

    // 4. Validate status (optional business rule)
    if (appointment.status === 'accepted') {
      return NextResponse.json(
        { error: 'Termin ist bereits akzeptiert' },
        { status: 400 }
      );
    }

    // 5. Generate slug (NEW LOGIC)
    let slug = appointment.slug; // Keep existing if already set
    const warnings: string[] = [];

    if (!slug) {
      try {
        slug = generateAppointmentSlug(appointment.title, appointment.id);
      } catch (error) {
        // Log error but continue with acceptance
        logger.error('Slug generation failed during appointment acceptance', {
          module: 'api/admin/appointments/accept',
          context: {
            appointmentId: appointment.id,
            title: appointment.title,
            error,
          },
          tags: ['slug-generation', 'admin-action'],
        });

        slug = null; // Explicitly set to null
        warnings.push('Slug-Generierung fehlgeschlagen');
      }
    }

    // 6. Update appointment
    const updatedAppointment = await updateAppointmentById(appointmentId, {
      status: 'accepted',
      statusChangeDate: new Date(),
      slug, // Set slug (or NULL if generation failed)
    });

    // 7. Return success response
    const response: Record<string, unknown> = {
      success: true,
      appointment: {
        id: updatedAppointment.id,
        title: updatedAppointment.title,
        status: updatedAppointment.status,
        slug: updatedAppointment.slug,
        statusChangeDate: updatedAppointment.statusChangeDate,
      },
    };

    if (warnings.length > 0) {
      response.warnings = warnings;
    }

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    logger.error('Error accepting appointment', {
      module: 'api/admin/appointments/accept',
      context: { error },
      tags: ['admin-action', 'critical'],
    });

    return NextResponse.json(
      { error: 'Fehler beim Akzeptieren des Termins' },
      { status: 500 }
    );
  }
}
```

---

## Validation Rules

### Business Logic

| Validation | Rule | Error Response |
|------------|------|----------------|
| Authentication | User must be authenticated | 401 Unauthorized |
| Appointment exists | ID must exist in database | 404 Not Found |
| Valid ID format | ID must be positive integer | 400 Bad Request |
| Status transition | Ideally only accept pending appointments | 400 Bad Request (optional) |

### Slug Generation

| Scenario | Behavior | Outcome |
|----------|----------|---------|
| Normal title | Generate slug successfully | Slug set |
| Empty title | Use fallback format `{id}-termin` | Slug set |
| Emoji title | Remove emojis, generate slug | Slug set |
| Generation throws error | Log error, continue | Slug = NULL, acceptance succeeds |

**Key Principle**: Slug generation failure MUST NOT block appointment acceptance.

---

## Logging Strategy

### Error-Only Logging (Per Spec FR-017)

**DO LOG** (Errors Only):
```typescript
// Slug generation completely fails
logger.error('Slug generation failed during appointment acceptance', {
  module: 'api/admin/appointments/accept',
  context: {
    appointmentId: appointment.id,
    title: appointment.title,
    error,
  },
  tags: ['slug-generation', 'admin-action'],
});
```

**DO NOT LOG** (Normal Operations):
```typescript
// ❌ Don't log successful slug generation
logger.info('Slug generated successfully', { slug });

// ❌ Don't log edge case handling
logger.warn('Title contains emojis, removing before slug generation');

// ❌ Don't log appointment acceptance itself (unless existing pattern requires it)
logger.info('Appointment accepted', { id });
```

---

## Testing Checklist

### Functional Tests

- [ ] Accept pending appointment → slug generated and stored
- [ ] Accept appointment with existing slug → slug unchanged
- [ ] Accept appointment with empty title → fallback slug generated
- [ ] Accept appointment with emoji title → emojis removed, slug generated
- [ ] Simulate slug generation error → acceptance succeeds, slug = NULL

### Authentication Tests

- [ ] Unauthenticated request → 401 Unauthorized
- [ ] Authenticated request → 200 OK

### Error Handling

- [ ] Invalid appointment ID (non-numeric) → 400 Bad Request
- [ ] Non-existent appointment ID → 404 Not Found
- [ ] Already accepted appointment → 400 Bad Request (or allow, depends on business rules)

### Integration Tests

- [ ] Accept appointment → verify in database (status + slug)
- [ ] Accept appointment → accessible via `/termine/{id}-{slug}`
- [ ] Accept appointment → accessible via `/termine/{id}` (legacy)

---

## Backwards Compatibility

### Existing Acceptance Logic

The enhancement is **additive only**:
- ✅ Existing status update logic unchanged
- ✅ Existing response format extended (slug field added)
- ✅ Existing error handling preserved
- ✅ Frontend can ignore slug field if not ready

### Database Impact

- **Before enhancement**: `slug` field does not exist
- **After enhancement**: `slug` field populated on acceptance
- **Old appointments**: Continue to work with `slug = NULL`

---

## Frontend Integration

### Admin Dashboard Changes

**File**: Likely `/home/paw/nextjs/dielinkefrankfurt/src/app/admin/appointments/page.tsx` or similar

**No breaking changes required**. Frontend can continue calling acceptance endpoint as before.

**Optional enhancement** (display slug in UI):
```typescript
const handleAccept = async (appointmentId: number) => {
  const response = await fetch(`/api/admin/appointments/${appointmentId}/accept`, {
    method: 'POST',
  });

  const data = await response.json();

  if (data.success) {
    // Optional: Show slug in success message
    toast.success(`Termin akzeptiert. URL: /termine/${data.appointment.slug || data.appointment.id}`);

    // Optional: Show warning if slug generation failed
    if (data.warnings?.length > 0) {
      toast.warning(data.warnings.join(', '));
    }

    // Refresh list
    await refreshAppointments();
  }
};
```

---

## Performance Impact

### Slug Generation Overhead

| Operation | Duration | Impact |
|-----------|----------|--------|
| Slug generation | <1ms | Negligible |
| Database update (with slug) | 5-15ms | Negligible |
| **Total overhead** | **<5ms** | **Acceptable** |

### Database Write

The `slug` field adds minimal overhead to the existing update operation:
```sql
-- Before
UPDATE appointment SET status = 'accepted', status_change_date = NOW() WHERE id = 123;

-- After
UPDATE appointment SET status = 'accepted', status_change_date = NOW(), slug = '123-title' WHERE id = 123;
```

**Impact**: <1ms additional write time.

---

## Security Considerations

### Input Validation

- **Appointment ID**: Validated as positive integer
- **Session**: Verified via NextAuth.js
- **Slug**: Generated server-side (no user input)

### SQL Injection

- **Risk**: None (Prisma ORM handles parameterization)
- **Slug format**: Alphanumeric + hyphens only (safe by design)

### Authorization

- **Requirement**: User must be authenticated admin
- **Enforcement**: Session check at endpoint entry

---

## Error Recovery

### Slug Generation Failure

If slug generation fails during acceptance:

1. **Log error** with full context (appointment ID, title, error message)
2. **Set slug = NULL** in database update
3. **Continue with acceptance** (status = "accepted")
4. **Return success response** with warning

**Result**: Appointment is accepted and accessible via numeric URL `/termine/{id}`. Slug can be regenerated later if needed.

### Manual Slug Regeneration (Future)

If needed, admins could manually regenerate slugs:

```typescript
// Future admin tool (out of scope for MVP)
async function regenerateSlug(appointmentId: number) {
  const appointment = await findAppointmentById(appointmentId);
  if (!appointment) return;

  const slug = generateAppointmentSlug(appointment.title, appointment.id);
  await updateAppointmentById(appointmentId, { slug });
}
```

---

## References

- Spec: `/home/paw/nextjs/dielinkefrankfurt/specs/010-appointment-link-enhancement/spec.md`
- Research: `/home/paw/nextjs/dielinkefrankfurt/specs/010-appointment-link-enhancement/research.md`
- Data Model: `/home/paw/nextjs/dielinkefrankfurt/specs/010-appointment-link-enhancement/data-model.md`
- Slug Generator Implementation: (to be created) `/home/paw/nextjs/dielinkefrankfurt/src/lib/appointments/slug-generator.ts`
