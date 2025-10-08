# API Contract: Appointments Search Enhancement

**Endpoint**: `/api/admin/appointments` (MODIFIED)
**Authentication**: Required (NextAuth session)

---

## GET `/api/admin/appointments` (ENHANCED)

**Purpose**: Retrieve paginated list of appointments with search functionality

### Request

**Method**: `GET`

**Query Parameters** (MODIFIED):
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | number | No | 1 | Page number (1-indexed) |
| pageSize | number | No | 10 | Items per page |
| status | string | No | - | Filter by status: 'pending', 'accepted', 'rejected' |
| **search** | **string** | **No** | **-** | **NEW: Search term for title and event details (mainText)** |
| orderBy | string | No | 'createdAt' | Sort field |
| orderDirection | string | No | 'desc' | Sort direction: 'asc' or 'desc' |

**Example** (NEW search usage):
```
GET /api/admin/appointments?page=1&pageSize=10&status=pending&search=demonstration&orderBy=createdAt&orderDirection=desc
```

### Changes from Current Implementation

**ADDED**:
- `search` query parameter for filtering appointments by title or event details (mainText)

**Search Behavior**:
- Case-insensitive search using Prisma `mode: 'insensitive'`
- Partial matching (substring search) using Prisma `contains`
- Searches in two fields: `title` and `mainText` (event details/description)
- Combined with existing status filter using AND logic

**Prisma Query Logic**:
```typescript
// Existing filters
const where: Prisma.AppointmentWhereInput = {
  ...(status && { status }),
};

// NEW: Add search filter if search term provided
if (search) {
  where.OR = [
    { title: { contains: search, mode: 'insensitive' } },
    { mainText: { contains: search, mode: 'insensitive' } }
  ];
}

// Execute query with combined filters
const appointments = await prisma.appointment.findMany({
  where,
  skip: (page - 1) * pageSize,
  take: pageSize,
  orderBy: { [orderBy]: orderDirection }
});
```

### Response

**Status 200**: Success (UNCHANGED)
```typescript
{
  appointments: Appointment[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
}
```

**Error Responses**: Same as existing implementation

### Manual Validation

**Search Functionality**:
1. Open `/admin/appointments`
2. Enter "demonstration" in search field → click "Suchen"
3. Verify only appointments with "demonstration" in title or description are shown
4. Test case-insensitive search: "DEMO", "demo", "Demo" → all should return same results
5. Test partial matching: "demo" should match "Demonstration", "Demokratie", etc.
6. Test with German umlauts: "März" should match "März", "märz", "MÄRZ"
7. Clear search → verify all appointments return

**Combined Filters**:
1. Set status filter to "pending" + search "demonstration"
2. Verify results match BOTH filters (pending AND contains search term)
3. Change status to "accepted" with same search
4. Verify results update correctly

**Edge Cases**:
1. Search for non-existent term → verify empty state message
2. Search with special characters: "test & demo" → verify no errors
3. Very long search term (>100 chars) → verify graceful handling
4. Empty search string → verify behaves like no search (shows all)

---

## Implementation Requirements

### Backend Changes
**File**: `src/app/api/admin/appointments/route.ts`

**Modifications**:
1. Extract `search` from query parameters
2. Add OR condition to Prisma where clause if search term exists
3. Ensure search combines correctly with existing status filter
4. No changes to response structure

**Estimated Changes**: +15 lines (within file size limit)

### Frontend Changes
**File**: `src/app/admin/appointments/page.tsx`

**Modifications**:
1. Add `SearchFilterBar` component import
2. Add state for search term: `const [searchTerm, setSearchTerm] = useState('')`
3. Replace existing search UI (if any) with `SearchFilterBar`
4. Add search handlers: `handleSearch`, `handleClearSearch`
5. Include `searchTerm` in API fetch URL
6. Add "Adressen" button in SearchFilterBar children slot

**Estimated Changes**: +50 lines

**WARNING**: Page will exceed 500 lines after modifications. Refactoring required:
- Extract appointment list items into separate component
- Move filter controls into dedicated component
- Consider moving accordion logic to custom hook

---

## Search Performance Considerations

**Current Scale**: <1000 appointments expected
**Query Performance**: Adequate for substring search without full-text indexing
**Future Optimization**: If dataset grows >10k appointments, consider:
- PostgreSQL full-text search (`to_tsvector`, `to_tsquery`)
- Dedicated search index on `title` and `mainText`
- Elasticsearch integration (only if critical need arises)

**Current Decision**: Simple Prisma `contains` with `mode: 'insensitive'` is sufficient per KISS principle.

---

## Contract Validation Checklist

- [x] Backward compatible with existing API (new parameter is optional)
- [x] Search fields match specification (title and mainText)
- [x] Case-insensitive search handles German umlauts
- [x] Partial matching (substring) supported
- [x] Combines correctly with existing status filter
- [x] Manual validation steps cover all search scenarios
- [x] Performance considerations documented
- [x] No breaking changes to response structure

---
**Appointments Search Contract Complete**: Ready for implementation
