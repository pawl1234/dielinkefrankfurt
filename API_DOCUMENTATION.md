# API Documentation

## Appointments API

This document outlines the consolidated API structure for appointment management in the Die Linke Frankfurt application.

### Public API Endpoints

#### Get Appointments

```
GET /api/appointments
```

Returns all accepted appointments with future dates.

Query parameters:
- `id` - Retrieve a specific appointment by ID

Response: JSON array of appointment objects or a single appointment object if `id` is provided.

#### Submit Appointment

```
POST /api/appointments/submit
```

Submit a new appointment request. Accepts multipart/form-data with appointment details and optional file uploads.

Required fields:
- `title` - Appointment title
- `teaser` - Short description
- `mainText` - Full description
- `startDateTime` - Start date and time in ISO format

Optional fields:
- `endDateTime` - End date and time
- `street`, `city`, `state`, `postalCode` - Location details
- `firstName`, `lastName` - Requester information
- `recurringText` - Information about recurring events
- `fileCount` - Number of files being uploaded
- `file-0`, `file-1`, etc. - File attachments
- `featured` - Whether the appointment should be featured
- `coverImage` - Cover image for featured appointments
- `croppedCoverImage` - Cropped version of the cover image

Response: `{ success: true, id: number }` or error message.

#### RSS Feed

```
GET /api/rss/appointments
```

Returns an RSS feed of all accepted appointments.

Response: XML formatted as RSS 2.0.

### Admin API Endpoints (Authentication Required)

#### Get Appointments (Admin)

```
GET /api/admin/appointments
```

Retrieves appointments with optional filtering.

Query parameters:
- `id` - Retrieve a specific appointment by ID
- `view` - Filter by view type: `all`, `pending`, `upcoming`, `archive`
- `status` - Filter by status: `pending`, `accepted`, `rejected`

Response: JSON array of appointment objects or a single appointment object if `id` is provided.

#### Update Appointment

```
PATCH /api/admin/appointments
```

Update an existing appointment. Accepts JSON or multipart/form-data.

Required fields:
- `id` - Appointment ID

Optional fields:
- All appointment fields
- `processed` - Whether the appointment has been processed
- `status` - Appointment status (`pending`, `accepted`, `rejected`)
- `featured` - Whether the appointment should be featured

Response: Updated appointment object or error message.

#### Delete Appointment

```
DELETE /api/admin/appointments?id=<id>
```

Delete an appointment by ID.

Query parameters:
- `id` - Appointment ID to delete

Response: `{ success: true }` or error message.

#### Newsletter Appointments

```
GET /api/admin/newsletter/appointments
```

Retrieves appointments formatted for newsletter generation (accepted appointments with future dates).

Response: JSON array of appointment objects.

#### Update Featured Status

```
PATCH /api/admin/newsletter/appointments
```

Toggle the featured status of an appointment.

Required fields:
- `id` - Appointment ID
- `featured` - Boolean indicating featured status

Response: Updated appointment object or error message.

## Authentication

All admin API endpoints require authentication. The application uses NextAuth.js for authentication with JWT tokens.

Authentication is implemented at two levels:
1. API middleware using the `withAdminAuth` wrapper for all admin routes
2. Server-side route protection in the Next.js middleware for the admin dashboard

## Error Handling

All API endpoints return consistent error responses with appropriate HTTP status codes:
- 400 Bad Request - Invalid input data
- 401 Unauthorized - Authentication required
- 404 Not Found - Resource not found
- 500 Internal Server Error - Server-side error

Error responses follow the format: `{ error: "Error message" }`