# API Contract: Address Management

**Endpoint Base**: `/api/admin/addresses`
**Authentication**: Required (NextAuth session)

---

## GET `/api/admin/addresses`

**Purpose**: Retrieve paginated list of addresses

### Request

**Method**: `GET`

**Query Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | number | No | 1 | Page number (1-indexed) |
| pageSize | number | No | 10 | Items per page |
| search | string | No | - | Search term (filters name, street, city) |
| orderBy | string | No | 'name' | Sort field: 'name' or 'createdAt' |
| orderDirection | string | No | 'asc' | Sort direction: 'asc' or 'desc' |

**Example**:
```
GET /api/admin/addresses?page=1&pageSize=10&search=partei&orderBy=name&orderDirection=asc
```

### Response

**Status 200**: Success
```typescript
{
  addresses: Address[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
}

interface Address {
  id: string;
  name: string;
  street: string;
  city: string;
  postalCode: string;
  locationDetails: string | null;
  createdAt: string;  // ISO 8601
  updatedAt: string;  // ISO 8601
}
```

**Status 401**: Unauthorized
```json
{ "error": "Nicht autorisiert" }
```

**Status 500**: Server Error
```json
{ "error": "Fehler beim Laden der Adressen" }
```

### Manual Validation
1. Open `/admin/appointments/addresses` while logged in
2. Verify addresses load in table
3. Test pagination controls
4. Test search functionality
5. Test sort by name and date

---

## POST `/api/admin/addresses`

**Purpose**: Create new address

### Request

**Method**: `POST`

**Headers**:
```
Content-Type: application/json
```

**Body**:
```typescript
{
  name: string;          // Required, unique, max 100 chars
  street: string;        // Required
  city: string;          // Required
  postalCode: string;    // Required, exactly 5 digits
  locationDetails?: string;  // Optional
}
```

**Example**:
```json
{
  "name": "Partei-Büro",
  "street": "Musterstraße 123",
  "city": "Frankfurt",
  "postalCode": "60311",
  "locationDetails": "2. Stock, Raum 5"
}
```

### Response

**Status 201**: Created
```typescript
{
  id: string;
  name: string;
  street: string;
  city: string;
  postalCode: string;
  locationDetails: string | null;
  createdAt: string;
  updatedAt: string;
}
```

**Status 400**: Validation Error
```json
{
  "error": "Validierungsfehler",
  "details": [
    { "field": "name", "message": "Name ist erforderlich" },
    { "field": "postalCode", "message": "Postleitzahl muss genau 5 Ziffern sein" }
  ]
}
```

**Status 409**: Duplicate Name
```json
{ "error": "Adresse mit diesem Namen existiert bereits" }
```

**Status 401**: Unauthorized
```json
{ "error": "Nicht autorisiert" }
```

**Status 500**: Server Error
```json
{ "error": "Fehler beim Erstellen der Adresse" }
```

### Manual Validation
1. Click "Neue Adresse" button
2. Fill form with valid data → verify success message
3. Try duplicate name → verify error message
4. Try invalid postal code (4 digits, letters) → verify validation
5. Leave required fields empty → verify error messages

---

## PATCH `/api/admin/addresses`

**Purpose**: Update existing address

### Request

**Method**: `PATCH`

**Headers**:
```
Content-Type: application/json
```

**Body**:
```typescript
{
  id: string;            // Required, address to update
  name: string;          // Required, unique, max 100 chars
  street: string;        // Required
  city: string;          // Required
  postalCode: string;    // Required, exactly 5 digits
  locationDetails?: string;  // Optional
}
```

**Example**:
```json
{
  "id": "clx123abc456",
  "name": "Partei-Büro",
  "street": "Neue Straße 456",
  "city": "Frankfurt",
  "postalCode": "60311",
  "locationDetails": "3. Stock, Raum 10"
}
```

### Response

**Status 200**: Success
```typescript
{
  id: string;
  name: string;
  street: string;
  city: string;
  postalCode: string;
  locationDetails: string | null;
  createdAt: string;
  updatedAt: string;
}
```

**Status 400**: Validation Error (same as POST)

**Status 404**: Not Found
```json
{ "error": "Adresse nicht gefunden" }
```

**Status 409**: Duplicate Name (if name changed to existing)
```json
{ "error": "Adresse mit diesem Namen existiert bereits" }
```

**Status 401**: Unauthorized
```json
{ "error": "Nicht autorisiert" }
```

**Status 500**: Server Error
```json
{ "error": "Fehler beim Aktualisieren der Adresse" }
```

### Manual Validation
1. Click edit button on existing address
2. Modify fields → verify update success
3. Change name to duplicate → verify error
4. Verify existing appointments retain old address data (create appointment before edit, verify after)

---

## DELETE `/api/admin/addresses`

**Purpose**: Delete address

### Request

**Method**: `DELETE`

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | Address ID to delete |

**Example**:
```
DELETE /api/admin/addresses?id=clx123abc456
```

### Response

**Status 200**: Success
```json
{ "message": "Adresse erfolgreich gelöscht" }
```

**Status 400**: Missing ID
```json
{ "error": "Adress-ID erforderlich" }
```

**Status 404**: Not Found
```json
{ "error": "Adresse nicht gefunden" }
```

**Status 401**: Unauthorized
```json
{ "error": "Nicht autorisiert" }
```

**Status 500**: Server Error
```json
{ "error": "Fehler beim Löschen der Adresse" }
```

### Manual Validation
1. Create test address
2. Create appointment using that address
3. Delete address → verify success
4. Verify appointment still shows address data (immutability check)
5. Verify address no longer appears in public form dropdown

---

## GET `/api/addresses/public`

**Purpose**: Retrieve all addresses for public appointment form dropdown

### Request

**Method**: `GET`

**Authentication**: Not required (public endpoint)

**Query Parameters**: None

### Response

**Status 200**: Success
```typescript
{
  addresses: PublicAddress[];
}

interface PublicAddress {
  id: string;
  name: string;
  street: string;
  city: string;
  postalCode: string;
  locationDetails: string | null;
}
```

**Example Response**:
```json
{
  "addresses": [
    {
      "id": "clx123abc456",
      "name": "Partei-Büro",
      "street": "Musterstraße 123",
      "city": "Frankfurt",
      "postalCode": "60311",
      "locationDetails": "2. Stock, Raum 5"
    },
    {
      "id": "clx789def012",
      "name": "Gewerkschaftshaus",
      "street": "Gewerkschaftsplatz 1",
      "city": "Frankfurt",
      "postalCode": "60313",
      "locationDetails": null
    }
  ]
}
```

**Status 500**: Server Error
```json
{ "error": "Fehler beim Laden der Adressen" }
```

### Manual Validation
1. Open public appointment form `/termine`
2. Verify address dropdown shows all active addresses
3. Select address → verify fields auto-populate
4. Submit form → verify appointment created with address data
5. Delete address in admin → verify dropdown no longer shows it

---

## Contract Validation Checklist

- [x] All endpoints use RESTful HTTP methods
- [x] Authentication requirements clearly stated
- [x] Request/response schemas are TypeScript-typed
- [x] Error responses include German error messages
- [x] Query parameters documented with types and defaults
- [x] Manual validation steps provided for each endpoint
- [x] Status codes follow HTTP standards (200, 201, 400, 401, 404, 409, 500)
- [x] Data immutability requirements reflected in validation steps

---
**API Contracts Complete**: Ready for implementation
