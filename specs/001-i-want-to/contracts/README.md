# API Contracts

**Feature**: Code Organization Refactoring
**Date**: 2025-10-06

## Note

This refactoring does NOT introduce or modify any API contracts. All API endpoints remain unchanged.

## Existing API Routes

All API routes in `src/app/api/` remain unchanged:
- `/api/appointments/*` - Appointment operations
- `/api/groups/*` - Group operations
- `/api/status-reports/*` - Status report operations
- `/api/antraege/*` - Board request operations
- `/api/newsletter/*` - Newsletter operations
- `/api/admin/*` - Admin operations

## Internal Changes Only

The refactoring only affects:
1. File organization in `src/lib/`
2. Import paths within the codebase
3. Code split into smaller modules

External API behavior remains identical.

## Validation

Verify API behavior unchanged by:
1. Testing all user flows (see quickstart.md)
2. Checking API responses match previous behavior
3. Confirming error messages are unchanged
