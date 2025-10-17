# API Contract: Admin User Management

**Base Path**: `/api/admin/users`
**Authentication**: Required (admin role only)
**Feature**: Member Portal with Role-Based Access

## Overview

API endpoints for administrators to manage user accounts including role assignment. All endpoints require authentication with admin role.

---

## POST /api/admin/users

Create a new user account with assigned role.

### Authorization
- **Required Role**: admin

### Request

**Method**: `POST`
**Content-Type**: `application/json`

**Body**:
```json
{
  "username": "string",
  "email": "string",
  "password": "string",
  "role": "admin" | "mitglied",
  "firstName": "string (optional)",
  "lastName": "string (optional)",
  "isActive": "boolean (optional, default: true)"
}
```

**Validation**:
- `username`: Required, 3-50 characters, alphanumeric with dash/underscore only
- `email`: Required, valid email format, unique
- `password`: Required, min 8 characters, max 100 characters
- `role`: Required, must be "admin" or "mitglied"
- `firstName`: Optional, max 50 characters
- `lastName`: Optional, max 50 characters
- `isActive`: Optional, boolean

### Response

**Success (201 Created)**:
```json
{
  "success": true,
  "user": {
    "id": "clx123456789",
    "username": "maxmustermann",
    "email": "max@example.com",
    "firstName": "Max",
    "lastName": "Mustermann",
    "role": "mitglied",
    "isActive": true,
    "createdAt": "2025-10-16T10:00:00Z"
  }
}
```

**Error Responses**:

*400 Bad Request - Validation Error*:
```json
{
  "success": false,
  "error": "Validierungsfehler: {details}"
}
```

*401 Unauthorized*:
```json
{
  "success": false,
  "error": "Authentifizierung erforderlich"
}
```

*403 Forbidden*:
```json
{
  "success": false,
  "error": "Keine Berechtigung. Nur Administratoren können Benutzer erstellen."
}
```

*409 Conflict - Username or Email Already Exists*:
```json
{
  "success": false,
  "error": "Benutzername oder E-Mail bereits vorhanden"
}
```

*500 Internal Server Error*:
```json
{
  "success": false,
  "error": "Serverfehler beim Erstellen des Benutzers"
}
```

---

## GET /api/admin/users

List all user accounts with their roles.

### Authorization
- **Required Role**: admin

### Request

**Method**: `GET`
**Query Parameters**: None

### Response

**Success (200 OK)**:
```json
{
  "success": true,
  "users": [
    {
      "id": "clx123456789",
      "username": "admin",
      "email": "admin@example.com",
      "firstName": "Admin",
      "lastName": "User",
      "role": "admin",
      "isActive": true,
      "createdAt": "2025-01-01T00:00:00Z"
    },
    {
      "id": "clx987654321",
      "username": "member1",
      "email": "member@example.com",
      "firstName": "Member",
      "lastName": "User",
      "role": "mitglied",
      "isActive": true,
      "createdAt": "2025-10-16T10:00:00Z"
    }
  ]
}
```

**Error Responses**:

*401 Unauthorized*:
```json
{
  "success": false,
  "error": "Authentifizierung erforderlich"
}
```

*403 Forbidden*:
```json
{
  "success": false,
  "error": "Keine Berechtigung. Nur Administratoren können Benutzer auflisten."
}
```

*500 Internal Server Error*:
```json
{
  "success": false,
  "error": "Serverfehler beim Abrufen der Benutzerliste"
}
```

---

## PATCH /api/admin/users/[id]

Update an existing user account (including role changes).

### Authorization
- **Required Role**: admin

### Request

**Method**: `PATCH`
**Content-Type**: `application/json`
**Path Parameters**: `id` (User ID)

**Body** (all fields optional, at least one required):
```json
{
  "username": "string (optional)",
  "email": "string (optional)",
  "password": "string (optional)",
  "role": "admin" | "mitglied (optional)",
  "firstName": "string (optional)",
  "lastName": "string (optional)",
  "isActive": "boolean (optional)"
}
```

**Validation**:
- At least one field must be provided
- `username`: If provided, 3-50 characters, alphanumeric with dash/underscore only
- `email`: If provided, valid email format
- `password`: If provided, min 8 characters
- `role`: If provided, must be "admin" or "mitglied"

**Business Rules**:
- Role changes take effect on user's next login (existing session continues with old role)
- Cannot update your own account's isActive status
- Password is hashed before storage

### Response

**Success (200 OK)**:
```json
{
  "success": true,
  "user": {
    "id": "clx987654321",
    "username": "updated-username",
    "email": "updated@example.com",
    "firstName": "Updated",
    "lastName": "Name",
    "role": "admin",
    "isActive": true
  }
}
```

**Error Responses**:

*400 Bad Request*:
```json
{
  "success": false,
  "error": "Mindestens ein Feld muss angegeben werden"
}
```

*401 Unauthorized*:
```json
{
  "success": false,
  "error": "Authentifizierung erforderlich"
}
```

*403 Forbidden*:
```json
{
  "success": false,
  "error": "Keine Berechtigung. Nur Administratoren können Benutzer bearbeiten."
}
```

*404 Not Found*:
```json
{
  "success": false,
  "error": "Benutzer nicht gefunden"
}
```

*409 Conflict*:
```json
{
  "success": false,
  "error": "Benutzername oder E-Mail bereits vorhanden"
}
```

*500 Internal Server Error*:
```json
{
  "success": false,
  "error": "Serverfehler beim Aktualisieren des Benutzers"
}
```

---

## DELETE /api/admin/users/[id]

Delete a user account.

### Authorization
- **Required Role**: admin

### Request

**Method**: `DELETE`
**Path Parameters**: `id` (User ID)

**Business Rules**:
- Cannot delete your own account (self-deletion prevention)
- Confirmation dialog required in UI before calling this endpoint

### Response

**Success (200 OK)**:
```json
{
  "success": true,
  "message": "Benutzer erfolgreich gelöscht"
}
```

**Error Responses**:

*400 Bad Request - Self-Deletion Attempt*:
```json
{
  "success": false,
  "error": "Sie können Ihr eigenes Konto nicht löschen"
}
```

*401 Unauthorized*:
```json
{
  "success": false,
  "error": "Authentifizierung erforderlich"
}
```

*403 Forbidden*:
```json
{
  "success": false,
  "error": "Keine Berechtigung. Nur Administratoren können Benutzer löschen."
}
```

*404 Not Found*:
```json
{
  "success": false,
  "error": "Benutzer nicht gefunden"
}
```

*500 Internal Server Error*:
```json
{
  "success": false,
  "error": "Serverfehler beim Löschen des Benutzers"
}
```

---

## PATCH /api/admin/users/[id]/reset-password

Reset a user's password (admin function for forgotten passwords).

### Authorization
- **Required Role**: admin

### Request

**Method**: `PATCH`
**Content-Type**: `application/json`
**Path Parameters**: `id` (User ID)

**Body**:
```json
{
  "newPassword": "string"
}
```

**Validation**:
- `newPassword`: Required, min 8 characters, max 100 characters

### Response

**Success (200 OK)**:
```json
{
  "success": true,
  "message": "Passwort erfolgreich zurückgesetzt"
}
```

**Error Responses**:

*400 Bad Request*:
```json
{
  "success": false,
  "error": "Neues Passwort erforderlich (mindestens 8 Zeichen)"
}
```

*401 Unauthorized*:
```json
{
  "success": false,
  "error": "Authentifizierung erforderlich"
}
```

*403 Forbidden*:
```json
{
  "success": false,
  "error": "Keine Berechtigung"
}
```

*404 Not Found*:
```json
{
  "success": false,
  "error": "Benutzer nicht gefunden"
}
```

*500 Internal Server Error*:
```json
{
  "success": false,
  "error": "Serverfehler beim Zurücksetzen des Passworts"
}
```

---

## Security Considerations

1. **Password Handling**:
   - Plain text passwords received in requests
   - Hashed with bcrypt (10 rounds) before storage
   - Never return password or hash in responses

2. **Authorization**:
   - All endpoints verify JWT token validity
   - All endpoints verify user has admin role
   - Session token validated on every request

3. **Self-Protection**:
   - Prevent administrators from deleting their own account
   - Prevent administrators from deactivating their own account

4. **Input Validation**:
   - All inputs validated with Zod schemas
   - SQL injection prevented by Prisma parameterization
   - XSS prevention through proper escaping (not applicable for API, but noted for UI)

5. **Rate Limiting**:
   - Consider implementing rate limiting for password reset endpoint
   - Consider implementing account lockout after failed login attempts (future enhancement)

---

## Error Handling Pattern

All endpoints follow consistent error response format:

```json
{
  "success": false,
  "error": "Human-readable error message in German"
}
```

All errors are logged with structured logging using `logger` from `@/lib/logger.ts`:
```typescript
logger.error('Operation failed', {
  module: 'api-admin-users',
  context: { userId, operation: 'create' },
  tags: ['user-management']
});
```

---

## Testing Scenarios

### Manual Testing Checklist

**Create User**:
- [ ] Create user with admin role
- [ ] Create user with mitglied role
- [ ] Create user with missing required fields (expect 400)
- [ ] Create user with duplicate username (expect 409)
- [ ] Create user with duplicate email (expect 409)
- [ ] Create user with invalid email format (expect 400)
- [ ] Create user with short password <8 chars (expect 400)
- [ ] Create user without authentication (expect 401)
- [ ] Create user as non-admin (expect 403)

**List Users**:
- [ ] List all users as admin
- [ ] List users without authentication (expect 401)
- [ ] List users as non-admin (expect 403)

**Update User**:
- [ ] Update username successfully
- [ ] Update email successfully
- [ ] Update role from admin to mitglied
- [ ] Update role from mitglied to admin
- [ ] Update password successfully
- [ ] Update with no fields provided (expect 400)
- [ ] Update non-existent user (expect 404)
- [ ] Update without authentication (expect 401)
- [ ] Update as non-admin (expect 403)

**Delete User**:
- [ ] Delete user successfully
- [ ] Attempt self-deletion (expect 400)
- [ ] Delete non-existent user (expect 404)
- [ ] Delete without authentication (expect 401)
- [ ] Delete as non-admin (expect 403)

**Reset Password**:
- [ ] Reset user password successfully
- [ ] Reset with short password <8 chars (expect 400)
- [ ] Reset for non-existent user (expect 404)
- [ ] Reset without authentication (expect 401)
- [ ] Reset as non-admin (expect 403)
