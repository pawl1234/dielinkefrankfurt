# API Contracts: Group User Membership & Responsible Person Management

**Feature**: 011-group-user-membership
**Date**: 2025-11-03
**Status**: Phase 1 Design

## Overview

This document defines REST API contracts for all endpoints required to support group membership and responsible person management. All endpoints follow Next.js App Router conventions and return JSON responses.

---

## Authentication

**All endpoints require authentication** via NextAuth.js session.

**Authorization Headers**:
- Session cookie managed by NextAuth.js
- No additional headers required

**Unauthenticated Response**:
```json
HTTP 401 Unauthorized
{
  "error": "Nicht authentifiziert"
}
```

---

## 1. User Group Membership Endpoints

### POST /api/portal/groups/join

Join a group as a member (self-join for ACTIVE groups only). Protected by portal middleware.

**Request**:
```json
POST /api/portal/groups/join
Content-Type: application/json

{
  "groupId": "clxyz123..."
}
```

**Success Response**:
```json
HTTP 200 OK
{
  "success": true,
  "message": "Erfolgreich der Gruppe beigetreten",
  "data": {
    "groupMember": {
      "id": "clxyz456...",
      "userId": "clusr789...",
      "groupId": "clxyz123...",
      "joinedAt": "2025-11-03T10:30:00.000Z"
    }
  }
}
```

**Error Responses**:

```json
HTTP 400 Bad Request
{
  "error": "Ungültige Anfrage",
  "details": "groupId ist erforderlich"
}
```

```json
HTTP 400 Bad Request
{
  "error": "Sie sind bereits Mitglied dieser Gruppe"
}
```

```json
HTTP 403 Forbidden
{
  "error": "Diese Gruppe ist nicht aktiv und kann nicht beigetreten werden"
}
```

```json
HTTP 404 Not Found
{
  "error": "Gruppe nicht gefunden"
}
```

```json
HTTP 500 Internal Server Error
{
  "error": "Fehler beim Beitreten der Gruppe"
}
```

**Triggers**:
- Email notification sent to all responsible persons (email-based + user-based)

---

### POST /api/portal/groups/leave

Leave a group (self-removal). Responsible persons cannot use this endpoint to leave. Protected by portal middleware.

**Request**:
```json
POST /api/portal/groups/leave
Content-Type: application/json

{
  "groupId": "clxyz123..."
}
```

**Success Response**:
```json
HTTP 200 OK
{
  "success": true,
  "message": "Sie haben die Gruppe verlassen"
}
```

**Error Responses**:

```json
HTTP 400 Bad Request
{
  "error": "Ungültige Anfrage",
  "details": "groupId ist erforderlich"
}
```

```json
HTTP 400 Bad Request
{
  "error": "Sie sind kein Mitglied dieser Gruppe"
}
```

```json
HTTP 403 Forbidden
{
  "error": "Verantwortliche Personen können sich nicht selbst entfernen"
}
```

```json
HTTP 404 Not Found
{
  "error": "Gruppe nicht gefunden"
}
```

```json
HTTP 500 Internal Server Error
{
  "error": "Fehler beim Verlassen der Gruppe"
}
```

---

### GET /api/portal/groups/[groupId]/members

Get paginated list of group members. Accessible to all group members. Protected by portal middleware.

**Request**:
```
GET /api/portal/groups/clxyz123.../members?page=1&pageSize=50&sortBy=joinedAt&sortOrder=desc
```

**Query Parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | number | No | 1 | Page number (1-indexed) |
| pageSize | number | No | 50 | Items per page (max 100) |
| sortBy | string | No | joinedAt | Sort field (joinedAt, firstName, lastName) |
| sortOrder | string | No | desc | Sort order (asc, desc) |

**Success Response**:
```json
HTTP 200 OK
{
  "success": true,
  "data": {
    "members": [
      {
        "id": "clmem123...",
        "userId": "clusr789...",
        "joinedAt": "2025-11-03T10:30:00.000Z",
        "user": {
          "id": "clusr789...",
          "firstName": "Max",
          "lastName": "Mustermann",
          "email": "max@example.com"
        },
        "isResponsiblePerson": true
      },
      {
        "id": "clmem456...",
        "userId": "clusr890...",
        "joinedAt": "2025-11-02T14:20:00.000Z",
        "user": {
          "id": "clusr890...",
          "firstName": "Maria",
          "lastName": "Schmidt",
          "email": "maria@example.com"
        },
        "isResponsiblePerson": false
      }
    ],
    "pagination": {
      "currentPage": 1,
      "pageSize": 50,
      "totalItems": 123,
      "totalPages": 3,
      "hasNextPage": true,
      "hasPreviousPage": false
    }
  }
}
```

**Error Responses**:

```json
HTTP 403 Forbidden
{
  "error": "Sie sind nicht berechtigt, die Mitglieder dieser Gruppe anzuzeigen"
}
```

```json
HTTP 404 Not Found
{
  "error": "Gruppe nicht gefunden"
}
```

---

### DELETE /api/portal/groups/[groupId]/members

Remove a member from a group. Only accessible to responsible persons. Protected by portal middleware.

**Request**:
```json
DELETE /api/portal/groups/clxyz123.../members
Content-Type: application/json

{
  "userId": "clusr890..."
}
```

**Success Response**:
```json
HTTP 200 OK
{
  "success": true,
  "message": "Mitglied erfolgreich entfernt"
}
```

**Error Responses**:

```json
HTTP 400 Bad Request
{
  "error": "Ungültige Anfrage",
  "details": "userId ist erforderlich"
}
```

```json
HTTP 403 Forbidden
{
  "error": "Nur verantwortliche Personen können Mitglieder entfernen"
}
```

```json
HTTP 403 Forbidden
{
  "error": "Verantwortliche Personen können nicht als Mitglieder entfernt werden"
}
```

```json
HTTP 404 Not Found
{
  "error": "Mitglied nicht gefunden"
}
```

```json
HTTP 500 Internal Server Error
{
  "error": "Fehler beim Entfernen des Mitglieds"
}
```

---

## 2. Responsible Person Management Endpoints

### POST /api/admin/groups/[groupId]/responsible

Assign a user as a responsible person. Only accessible to admins. Protected by admin middleware.

**Request**:
```json
POST /api/admin/groups/clxyz123.../responsible
Content-Type: application/json

{
  "userId": "clusr890..."
}
```

**Success Response**:
```json
HTTP 200 OK
{
  "success": true,
  "message": "Verantwortliche Person erfolgreich zugewiesen",
  "data": {
    "responsibleUser": {
      "id": "clresp123...",
      "userId": "clusr890...",
      "groupId": "clxyz123...",
      "assignedAt": "2025-11-03T11:00:00.000Z"
    },
    "memberCreated": true
  }
}
```

**Note**: If user is not already a member, a GroupMember record is automatically created.

**Error Responses**:

```json
HTTP 400 Bad Request
{
  "error": "Ungültige Anfrage",
  "details": "userId ist erforderlich"
}
```

```json
HTTP 400 Bad Request
{
  "error": "Dieser Benutzer ist bereits eine verantwortliche Person für diese Gruppe"
}
```

```json
HTTP 403 Forbidden
{
  "error": "Nur Administratoren können verantwortliche Personen zuweisen"
}
```

```json
HTTP 404 Not Found
{
  "error": "Gruppe oder Benutzer nicht gefunden"
}
```

```json
HTTP 500 Internal Server Error
{
  "error": "Fehler beim Zuweisen der verantwortlichen Person"
}
```

---

### DELETE /api/admin/groups/[groupId]/responsible

Remove a user's responsible person assignment. Only accessible to admins. Protected by admin middleware.

**Request**:
```json
DELETE /api/admin/groups/clxyz123.../responsible
Content-Type: application/json

{
  "userId": "clusr890..."
}
```

**Success Response**:
```json
HTTP 200 OK
{
  "success": true,
  "message": "Verantwortliche Person erfolgreich entfernt"
}
```

**Note**: User remains as a regular member (GroupMember record not deleted).

**Error Responses**:

```json
HTTP 400 Bad Request
{
  "error": "Ungültige Anfrage",
  "details": "userId ist erforderlich"
}
```

```json
HTTP 403 Forbidden
{
  "error": "Nur Administratoren können verantwortliche Personen entfernen"
}
```

```json
HTTP 404 Not Found
{
  "error": "Verantwortliche Person nicht gefunden"
}
```

```json
HTTP 500 Internal Server Error
{
  "error": "Fehler beim Entfernen der verantwortlichen Person"
}
```

---

## 3. Portal Group Query Endpoints

### GET /api/portal/groups

Get groups for portal display with membership indicators. Supports filtering by membership status and search.

**Request**:
```
GET /api/portal/groups?view=all&search=Klima&page=1&pageSize=20
```

**Query Parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| view | string | No | all | Filter: "all" (active groups) or "my" (user's groups) |
| search | string | No | - | Search by group name (partial, case-insensitive) |
| page | number | No | 1 | Page number (1-indexed) |
| pageSize | number | No | 20 | Items per page (max 50) |

**Success Response** (view=all):
```json
HTTP 200 OK
{
  "success": true,
  "data": {
    "groups": [
      {
        "id": "clxyz123...",
        "name": "Klimagerechtigkeit Frankfurt",
        "slug": "klimagerechtigkeit-frankfurt",
        "description": "Wir setzen uns für...",
        "logoUrl": "https://blob.vercel-storage.com/...",
        "status": "ACTIVE",
        "isMember": false,
        "isResponsiblePerson": false,
        "memberCount": 42,
        "meetingInfo": {
          "time": "19:00",
          "location": "Haus der Jugend, Frankfurt"
        }
      },
      {
        "id": "clxyz456...",
        "name": "Klimaschutz AG",
        "slug": "klimaschutz-ag",
        "description": "Arbeitsgruppe für...",
        "logoUrl": null,
        "status": "ACTIVE",
        "isMember": true,
        "isResponsiblePerson": true,
        "memberCount": 18,
        "meetingInfo": null
      }
    ],
    "pagination": {
      "currentPage": 1,
      "pageSize": 20,
      "totalItems": 2,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPreviousPage": false
    }
  }
}
```

**Success Response** (view=my):
```json
HTTP 200 OK
{
  "success": true,
  "data": {
    "groups": [
      {
        "id": "clxyz456...",
        "name": "Klimaschutz AG",
        "slug": "klimaschutz-ag",
        "description": "Arbeitsgruppe für...",
        "logoUrl": null,
        "status": "ACTIVE",
        "isMember": true,
        "isResponsiblePerson": true,
        "joinedAt": "2025-10-15T09:00:00.000Z",
        "memberCount": 18
      },
      {
        "id": "clxyz789...",
        "name": "Wohnungsbaupolitik",
        "slug": "wohnungsbaupolitik",
        "description": "Diskussion über...",
        "logoUrl": "https://blob.vercel-storage.com/...",
        "status": "ACTIVE",
        "isMember": true,
        "isResponsiblePerson": false,
        "joinedAt": "2025-11-01T14:30:00.000Z",
        "memberCount": 67
      }
    ],
    "pagination": {
      "currentPage": 1,
      "pageSize": 20,
      "totalItems": 2,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPreviousPage": false
    }
  }
}
```

**Error Responses**:

```json
HTTP 400 Bad Request
{
  "error": "Ungültiger view-Parameter. Erlaubt: all, my"
}
```

```json
HTTP 500 Internal Server Error
{
  "error": "Fehler beim Abrufen der Gruppen"
}
```

---

### GET /api/portal/groups/[groupId]

Get detailed information about a specific group. Includes permission flags for current user.

**Request**:
```
GET /api/portal/groups/clxyz123...
```

**Success Response**:
```json
HTTP 200 OK
{
  "success": true,
  "data": {
    "group": {
      "id": "clxyz123...",
      "name": "Klimagerechtigkeit Frankfurt",
      "slug": "klimagerechtigkeit-frankfurt",
      "description": "Wir setzen uns für Klimagerechtigkeit in Frankfurt und Umgebung ein...",
      "logoUrl": "https://blob.vercel-storage.com/...",
      "status": "ACTIVE",
      "recurringPatterns": ["FREQ=WEEKLY;BYDAY=TH"],
      "meetingTime": "19:00",
      "meetingStreet": "Musterstraße 42",
      "meetingCity": "Frankfurt",
      "meetingPostalCode": "60311",
      "meetingLocationDetails": "2. Stock, Raum A",
      "createdAt": "2025-01-15T10:00:00.000Z",
      "updatedAt": "2025-10-20T15:30:00.000Z",
      "responsiblePersons": [
        {
          "id": "clresp123...",
          "firstName": "Max",
          "lastName": "Mustermann",
          "email": "max@example.com"
        }
      ],
      "responsibleUsers": [
        {
          "id": "clrespuser456...",
          "userId": "clusr789...",
          "assignedAt": "2025-10-01T12:00:00.000Z",
          "user": {
            "id": "clusr789...",
            "firstName": "Maria",
            "lastName": "Schmidt",
            "email": "maria@example.com"
          }
        }
      ],
      "memberCount": 42
    },
    "permissions": {
      "isMember": true,
      "isResponsiblePerson": true,
      "canEdit": true,
      "canManageMembers": true,
      "canManageResponsiblePersons": true,
      "canLeave": false
    }
  }
}
```

**Error Responses**:

```json
HTTP 404 Not Found
{
  "error": "Gruppe nicht gefunden"
}
```

```json
HTTP 500 Internal Server Error
{
  "error": "Fehler beim Abrufen der Gruppendetails"
}
```

---

## 4. Admin Portal Extensions

### PATCH /api/admin/groups/[groupId]

Extend existing admin group update endpoint to support responsible user assignment/removal.

**New Request Fields** (in addition to existing fields):
```json
PATCH /api/admin/groups/clxyz123...
Content-Type: application/json

{
  // ... existing fields (name, description, etc.) ...

  "responsibleUsers": [
    {
      "action": "add",
      "userId": "clusr890..."
    },
    {
      "action": "remove",
      "userId": "clusr891..."
    }
  ]
}
```

**Success Response**:
```json
HTTP 200 OK
{
  "success": true,
  "message": "Gruppe erfolgreich aktualisiert",
  "data": {
    "group": {
      // ... full group object ...
    }
  }
}
```

**Error Responses** (in addition to existing errors):

```json
HTTP 400 Bad Request
{
  "error": "Ungültige Aktion für responsibleUsers. Erlaubt: add, remove"
}
```

```json
HTTP 404 Not Found
{
  "error": "Benutzer nicht gefunden",
  "details": "userId: clusr890..."
}
```

---

## Type Definitions

**TypeScript interfaces** to be added to `src/types/api-types.ts`:

```typescript
// Group membership types
export interface GroupMemberResponse {
  id: string;
  userId: string;
  groupId: string;
  joinedAt: string; // ISO 8601
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
  isResponsiblePerson: boolean;
}

export interface GroupResponsibleUserResponse {
  id: string;
  userId: string;
  groupId: string;
  assignedAt: string; // ISO 8601
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
}

// Portal group types
export interface PortalGroupListItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  logoUrl: string | null;
  status: GroupStatus;
  isMember: boolean;
  isResponsiblePerson: boolean;
  joinedAt?: string; // ISO 8601, only for "my" view
  memberCount: number;
  meetingInfo?: {
    time: string | null;
    location: string | null;
  };
}

export interface PortalGroupDetail {
  id: string;
  name: string;
  slug: string;
  description: string;
  logoUrl: string | null;
  status: GroupStatus;
  recurringPatterns: string[] | null;
  meetingTime: string | null;
  meetingStreet: string | null;
  meetingCity: string | null;
  meetingPostalCode: string | null;
  meetingLocationDetails: string | null;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  responsiblePersons: ResponsiblePersonResponse[];
  responsibleUsers: GroupResponsibleUserResponse[];
  memberCount: number;
}

export interface GroupPermissions {
  isMember: boolean;
  isResponsiblePerson: boolean;
  canEdit: boolean;
  canManageMembers: boolean;
  canManageResponsiblePersons: boolean;
  canLeave: boolean;
}

// Request types
export interface JoinGroupRequest {
  groupId: string;
}

export interface LeaveGroupRequest {
  groupId: string;
}

export interface RemoveMemberRequest {
  userId: string;
}

export interface AssignResponsibleUserRequest {
  userId: string;
}

export interface RemoveResponsibleUserRequest {
  userId: string;
}

// Pagination types (reusable)
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationResponse {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}
```

---

## Error Handling Standards

**All API endpoints MUST**:
1. Return German error messages (per Constitution Principle VI)
2. Use appropriate HTTP status codes
3. Log errors with `logger` from `@/lib/logger.ts` (per Constitution Principle VII)
4. Validate inputs with Zod schemas (per Constitution Principle VIII)
5. Return consistent error response format

**Standard Error Response Format**:
```typescript
interface ErrorResponse {
  error: string;           // German error message for user
  details?: string;        // Optional additional details
  code?: string;           // Optional error code for client handling
}
```

---

## Rate Limiting

**Not implemented in initial version**. Future consideration for:
- Join/leave operations (prevent spam)
- Member removal (prevent abuse)

---

## Summary

**Total Endpoints**: 7
- New portal endpoints: 5 (`/api/portal/groups/*`)
- New admin endpoints: 2 (`/api/admin/groups/*`)
- Extended endpoints: 0 (admin group management uses existing PATCH endpoint)

**Authentication**: All endpoints protected by middleware
- Portal endpoints: Protected by `/api/portal` middleware
- Admin endpoints: Protected by `/api/admin` middleware

**Authorization Levels**:
- **Portal users (authenticated)**: Join, leave, view members (if member), view group details
- **Responsible persons**: Remove members (portal API checks responsible status)
- **Admins only**: Assign/remove responsible persons

**Response Format**: All responses return JSON with German error messages

**Validation**: All inputs validated server-side with Zod schemas
