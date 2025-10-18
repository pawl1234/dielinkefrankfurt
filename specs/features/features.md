# Feature Backlog

**Last Updated**: 2025-10-18
**Total Features**: 2

> This is a lightweight backlog for collecting feature ideas. Each entry provides a high-level overview for team discussion, not implementation details.

---

## Features Overview

| # | Priority | Title | Size | Category | Type | Status |
|---|----------|-------|------|----------|------|--------|
| F-001 | Medium | Appointment Registration System | L | Frontend, Backend, Data | New Feature | 💡 Idea |
| F-002 | Medium | Data Access Layer (DAL) with Authentication | XL | Security, Architectural | Refactor | 💡 Idea |

### Status Legend
- 💡 **Idea**: Captured, not yet planned
- 📋 **Backlog**: Approved for future work
- 🎯 **Ready**: Fully specified, ready for implementation
- 🚧 **In Progress**: Currently being worked on
- ✅ **Done**: Implemented and deployed
- ❌ **Declined**: Decided not to implement

---

## Feature Details

### F-001: Appointment Registration System
**Size**: L | **Category**: Frontend, Backend, Data | **Type**: New Feature | **Priority**: Medium

**Description**:
Enable users to register their attendance for appointments, giving organizers visibility into expected participation numbers. Registration should be accessible both from the appointment detail page and directly from newsletter emails via a registration button. This helps organizers better plan for space, materials, and resources based on confirmed attendees.

**User Stories**:
- As a user viewing an appointment, I want to register my attendance so that the organizer knows I'm coming
- As an organizer, I want to see how many people registered for my appointment so that I can plan accordingly
- As a newsletter recipient, I want to quickly register for an appointment directly from the email without navigating to the website

**Context/Notes**:
- Consider whether registration should be anonymous (like current submissions) or require user identification
- Need to decide if there's a registration limit/capacity for appointments
- Should organizers receive notifications when someone registers?
- Should registrants receive confirmation emails?
- Consider adding "I'm interested" vs "I'm definitely coming" options
- May need to add appointment detail pages if they don't currently exist
- Email template modifications required for newsletter integration
- Database schema needs new model/relations for tracking registrations

---

### F-002: Data Access Layer (DAL) with Authentication
**Size**: XL | **Category**: Security, Architectural | **Type**: Refactor | **Priority**: Medium

**Description**:
Implement a comprehensive Data Access Layer (DAL) pattern following Next.js best practices, where authentication and authorization checks are moved from API routes into the database access layer itself. This architectural refactor ensures that all data access is properly protected at the lowest level, preventing accidental exposure of sensitive data and enforcing consistent security policies across the entire application. The DAL will act as a centralized gatekeeper, verifying user sessions before executing any database operations.

**Benefits**:
- **Defense in Depth**: Authentication cannot be bypassed by accidentally calling database operations directly
- **Consistency**: All data access follows the same security model
- **Maintainability**: Security logic centralized in one layer, not scattered across API routes
- **Future-Proof**: Easier to implement role-based access control (RBAC) later
- **Reduced Errors**: Developers cannot forget to add auth checks in new endpoints

**Context/Notes**:
- Affects all database operations in `src/lib/db/*-operations.ts`
- All operations will require session/user context as a mandatory parameter
- API routes will become thinner, focusing on request validation and response formatting
- Will need to update all API route handlers to pass session context to DAL
- Consider whether to implement incrementally (domain by domain) or as one comprehensive migration
- May need to create helper utilities for session verification and error handling
- Aligns with Next.js documentation on server-side authentication patterns
- Should maintain backward compatibility during transition or plan coordinated updates

**Affected Areas**:
- `src/lib/db/` - All database operation files
- `src/app/api/` - All API route handlers
- `src/lib/auth/` - May need additional helper functions
- Authentication flow and session handling patterns

---

<!-- New features will be appended below -->
