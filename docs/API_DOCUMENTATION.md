# Die Linke Frankfurt API Documentation

This document provides detailed information about the API endpoints used in the Die Linke Frankfurt appointment management system.

## Authentication

Protected routes require administrator authentication using NextAuth.js:

```
Authorization: Bearer {token}
```

Authentication is handled by the `withAdminAuth` middleware.

## Base URL

All API endpoints are relative to the base URL of the application.

## Public API Endpoints

### Appointments

#### Get Public Appointments

```
GET /api/appointments
```

Returns accepted appointments with future dates, sorted by start date.

**Query Parameters:**
- `id` (optional): Get a specific appointment by ID

**Response:**
- `200 OK`: Returns a list of appointments or a single appointment
- `404 Not Found`: If a requested appointment ID is not found

#### Submit New Appointment

```
POST /api/appointments/submit
```

Creates a new appointment submission.

**Request Format:** `multipart/form-data`

**Fields:**
- `title` (required): Title of the appointment
- `teaser` (required): Short description
- `mainText` (required): Full description in rich text format
- `startDateTime` (required): Start date and time
- `endDateTime` (optional): End date and time
- `street` (optional): Street address
- `city` (optional): City
- `state` (optional): State
- `postalCode` (optional): Postal code
- `firstName` (optional): Requester's first name
- `lastName` (optional): Requester's last name
- `recurringText` (optional): Text describing recurring event pattern
- `featured` (optional): Boolean indicating if this is a featured event
- `fileCount` (optional): Number of files being uploaded
- `file-0`, `file-1`, etc.: Files to be uploaded (limit: 5MB each, types: JPEG, PNG, PDF)
- `coverImage` (optional): Cover image for featured appointments
- `croppedCoverImage` (optional): Cropped version of the cover image

**Response:**
- `200 OK`: Returns `{ success: true, id: number }`
- `400 Bad Request`: Missing required fields or invalid files
- `500 Internal Server Error`: Server error during processing

### RSS Feed

#### Get Appointment RSS Feed

```
GET /api/rss/appointments
```

Returns an RSS feed of accepted appointments with future dates.

**Response:**
- `200 OK`: RSS feed XML

## Admin API Endpoints

These endpoints require administrator authentication.

### Appointments Management

#### Get All Appointments

```
GET /api/admin/appointments
```

Returns all appointments with optional filtering.

**Query Parameters:**
- `view`: Filter by view type (`all`, `pending`, `upcoming`, `archive`)
- `status`: Filter by status (`pending`, `accepted`, `rejected`)
- `id`: Get a specific appointment by ID

**Response:**
- `200 OK`: Returns a list of appointments or a single appointment
- `401 Unauthorized`: Authentication required
- `404 Not Found`: If a requested appointment ID is not found

#### Update Appointment

```
PATCH /api/admin/appointments
```

Updates an existing appointment.

**Request Formats:** `application/json` or `multipart/form-data`

**Fields:**
- `id` (required): Appointment ID
- `processed` (optional): Whether the appointment has been processed
- `status` (optional): Status (`pending`, `accepted`, `rejected`)
- `title` (optional): Updated title
- `teaser` (optional): Updated teaser
- `mainText` (optional): Updated main text
- `startDateTime` (optional): Updated start date/time
- `endDateTime` (optional): Updated end date/time
- `street`, `city`, `state`, `postalCode` (optional): Updated location
- `firstName`, `lastName` (optional): Updated requester info
- `recurringText` (optional): Updated recurring event info
- `featured` (optional): Featured status
- `fileCount`, `file-0`, etc. (optional): New files
- `existingFileUrls` (optional): JSON string of existing file URLs to keep
- `coverImage`, `croppedCoverImage` (optional): Cover images

**Response:**
- `200 OK`: Returns the updated appointment
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Authentication required
- `404 Not Found`: If appointment ID not found
- `500 Internal Server Error`: Server error

#### Delete Appointment

```
DELETE /api/admin/appointments?id={id}
```

Deletes an appointment and its associated files.

**Query Parameters:**
- `id` (required): Appointment ID to delete

**Response:**
- `200 OK`: Returns `{ success: true }`
- `400 Bad Request`: Missing ID parameter
- `401 Unauthorized`: Authentication required
- `404 Not Found`: If appointment not found
- `500 Internal Server Error`: Server error

### Newsletter Management

#### Get Newsletter Appointments

```
GET /api/admin/newsletter/appointments
```

Returns accepted appointments with future dates for newsletter.

**Response:**
- `200 OK`: List of appointments for newsletter
- `401 Unauthorized`: Authentication required
- `500 Internal Server Error`: Server error

#### Update Featured Status

```
PATCH /api/admin/newsletter/appointments
```

Toggles the featured status of an appointment.

**Request Format:** `application/json`

**Fields:**
- `id` (required): Appointment ID
- `featured` (required): Boolean featured status

**Response:**
- `200 OK`: Returns the updated appointment
- `400 Bad Request`: Missing required fields
- `401 Unauthorized`: Authentication required
- `500 Internal Server Error`: Server error

#### Get Newsletter Settings

```
GET /api/admin/newsletter/settings
```

Returns newsletter configuration settings.

**Response:**
- `200 OK`: Newsletter settings
- `401 Unauthorized`: Authentication required

#### Update Newsletter Settings

```
PATCH /api/admin/newsletter/settings
```

Updates newsletter configuration.

**Request Format:** `application/json` or `multipart/form-data`

**Fields:**
- Various newsletter settings (details in request handler)

**Response:**
- `200 OK`: Updated settings
- `401 Unauthorized`: Authentication required
- `500 Internal Server Error`: Server error

#### Send Test Newsletter

```
POST /api/admin/newsletter/send-test
```

Sends a test newsletter to specified recipients.

**Request Format:** `application/json`

**Fields:**
- `content` (required): HTML content of the newsletter
- `recipients` (required): Array of email addresses

**Response:**
- `200 OK`: Result of sending test
- `400 Bad Request`: Missing fields
- `401 Unauthorized`: Authentication required
- `500 Internal Server Error`: Server error