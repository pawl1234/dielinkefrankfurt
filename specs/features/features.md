# Feature Backlog

**Last Updated**: 2025-10-13
**Total Features**: 1

> This is a lightweight backlog for collecting feature ideas. Each entry provides a high-level overview for team discussion, not implementation details.

---

## Features Overview

| # | Priority | Title | Size | Category | Type | Status |
|---|----------|-------|------|----------|------|--------|
| F-001 | Medium | Appointment Registration System | L | Frontend, Backend, Data | New Feature | 💡 Idea |

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

<!-- New features will be appended below -->
