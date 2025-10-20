# Quickstart: Manual Validation Guide

**Feature**: Member Portal with Role-Based Access
**Branch**: `006-currently-the-system`
**Date**: 2025-10-16

## Overview

This document provides step-by-step manual validation scenarios for the member portal feature. Follow these workflows to verify that all functionality works as expected.

**Prerequisites**:
- Development environment running (`npm run dev`)
- Database migrated with activeSessionToken field
- At least one admin user exists in database

---

## Validation Workflow 1: User Management

### Goal
Verify administrators can create, view, update, and delete user accounts with role assignment.

### Steps

#### 1.1 Access User Management Interface

1. Navigate to `http://localhost:3000/auth/signin`
2. Sign in with admin credentials
3. Verify redirect to `/admin` dashboard
4. Click "Benutzer" (Users) in admin navigation menu
5. Verify redirect to `/admin/users` page

**Expected**:
- ✅ Admin dashboard loads
- ✅ User management page displays
- ✅ Current users listed in table with columns: Username, Email, Name, Role, Status, Actions

#### 1.2 Create New Admin User

1. On `/admin/users` page, click "Neuer Benutzer" (New User) button
2. Fill out form:
   - **Benutzername**: `testadmin`
   - **E-Mail**: `testadmin@example.com`
   - **Passwort**: `SecurePass123`
   - **Rolle**: Select "Admin"
   - **Vorname**: `Test`
   - **Nachname**: `Administrator`
   - **Aktiv**: ✓ (checked)
3. Click "Benutzer erstellen" (Create User)
4. Verify success message displayed
5. Verify new user appears in user list with role "Admin"

**Expected**:
- ✅ Form validates all fields
- ✅ User created successfully
- ✅ Success message: "Benutzer erfolgreich erstellt"
- ✅ User appears in list with correct role

#### 1.3 Create New Mitglied User

1. Click "Neuer Benutzer" again
2. Fill out form:
   - **Benutzername**: `testmember`
   - **E-Mail**: `testmember@example.com`
   - **Passwort**: `SecurePass456`
   - **Rolle**: Select "Mitglied"
   - **Vorname**: `Test`
   - **Nachname**: `Mitglied`
3. Click "Benutzer erstellen"
4. Verify success message
5. Verify new user appears with role "Mitglied"

**Expected**:
- ✅ Second user created successfully
- ✅ Role correctly set to "Mitglied"
- ✅ Both users visible in list

#### 1.4 Update User Role

1. In user list, find `testmember` user
2. Click "Bearbeiten" (Edit) button
3. Change **Rolle** from "Mitglied" to "Admin"
4. Click "Änderungen speichern" (Save Changes)
5. Verify success message
6. Verify user list shows updated role

**Expected**:
- ✅ Role updated in database
- ✅ Success message: "Benutzer erfolgreich aktualisiert"
- ✅ User list reflects new role immediately

#### 1.5 Reset User Password

1. In user list, find `testadmin` user
2. Click "Passwort zurücksetzen" (Reset Password) button
3. Enter new password: `NewSecurePass789`
4. Confirm password reset
5. Verify success message

**Expected**:
- ✅ Password reset confirmation dialog appears
- ✅ Password updated successfully
- ✅ Success message: "Passwort erfolgreich zurückgesetzt"

#### 1.6 Attempt Self-Deletion (Should Fail)

1. While logged in as admin, try to delete your own account
2. Click delete button on your own user row
3. Verify error message prevents deletion

**Expected**:
- ✅ Deletion prevented
- ✅ Error message: "Sie können Ihr eigenes Konto nicht löschen"
- ✅ User account still exists

#### 1.7 Delete User Account

1. In user list, find `testadmin` user (NOT your own account)
2. Click "Löschen" (Delete) button
3. Confirm deletion in dialog
4. Verify success message
5. Verify user removed from list

**Expected**:
- ✅ Confirmation dialog appears
- ✅ User deleted after confirmation
- ✅ Success message: "Benutzer erfolgreich gelöscht"
- ✅ User no longer in list

---

## Validation Workflow 2: Member Authentication

### Goal
Verify member users can sign in and are redirected to the member portal.

### Steps

#### 2.1 Sign Out

1. Click "Abmelden" (Logout) in top navigation
2. Verify redirect to `/auth/signin`

**Expected**:
- ✅ Logged out successfully
- ✅ Redirected to sign-in page
- ✅ Cannot access admin pages without authentication

#### 2.2 Sign In as Mitglied User

1. On `/auth/signin` page
2. Enter credentials:
   - **Benutzername**: `testmember`
   - **Passwort**: `SecurePass456`
3. Click "Anmelden" (Sign In)
4. Verify redirect to `/portal` (not `/admin`)

**Expected**:
- ✅ Authentication successful
- ✅ Redirected to member portal, not admin dashboard
- ✅ Welcome message displays with username "testmember" or first name "Test"

#### 2.3 Sign In as Admin User

1. Sign out from portal
2. Sign in again with admin credentials
3. Verify redirect to `/admin` dashboard

**Expected**:
- ✅ Admin redirected to admin dashboard
- ✅ Admin can access admin interface

---

## Validation Workflow 3: Member Portal Access

### Goal
Verify member portal pages load correctly and display appropriate content.

### Steps

#### 3.1 Access Portal Start Page

1. Sign in as `testmember` (mitglied role)
2. Verify automatic redirect to `/portal`
3. Observe page content

**Expected**:
- ✅ Page title: "Startseite" or "Willkommen im Mitgliederbereich"
- ✅ Welcome message: "Hallo Test," (or username if no firstName)
- ✅ Navigation instructions visible
- ✅ All text in German
- ✅ Navigation menu visible (sidebar or app bar)

#### 3.2 Verify Navigation Menu

1. On portal page, observe navigation menu
2. Verify "Startseite" link present
3. Verify user info displayed (username, role badge)
4. Verify logout button present

**Expected**:
- ✅ Navigation menu renders
- ✅ User info shows "testmember" or "Test Mitglied"
- ✅ Role badge shows "Mitglied"
- ✅ "Abmelden" button visible

#### 3.3 Navigate Within Portal

1. Click "Startseite" link in navigation
2. Verify page reloads or stays on `/portal`
3. Verify active menu item highlighted

**Expected**:
- ✅ Navigation works without full page reload
- ✅ Active menu item visually distinguished
- ✅ URL remains `/portal`

#### 3.4 Responsive Design Check

1. Resize browser window to mobile width (<768px)
2. Verify navigation menu adapts (hamburger menu or drawer)
3. Resize back to desktop width
4. Verify navigation returns to sidebar/permanent state

**Expected**:
- ✅ Layout responsive on mobile
- ✅ Navigation accessible on all screen sizes
- ✅ Content readable and properly spaced

---

## Validation Workflow 4: Authorization & Access Control

### Goal
Verify role-based access control prevents unauthorized access.

### Steps

#### 4.1 Mitglied Cannot Access Admin Interface

1. While signed in as `testmember` (mitglied)
2. Manually navigate to `http://localhost:3000/admin`
3. Observe response

**Expected**:
- ✅ Access denied
- ✅ Redirect to `/portal` OR show 403 error
- ✅ Error message: "Keine Berechtigung" or similar

#### 4.2 Mitglied Cannot Call Admin APIs

1. Open browser developer console
2. Execute fetch request to admin API:
   ```javascript
   fetch('/api/admin/users', { method: 'GET' })
     .then(r => r.json())
     .then(console.log);
   ```
3. Observe response

**Expected**:
- ✅ 403 Forbidden status
- ✅ Response body: `{ success: false, error: "Keine Berechtigung" }`

#### 4.3 Admin Can Access Both Interfaces

1. Sign out and sign in as admin
2. Navigate to `/admin` → Verify access granted
3. Navigate to `/portal` → Verify access granted
4. Verify both interfaces functional

**Expected**:
- ✅ Admin has access to admin dashboard
- ✅ Admin has access to member portal
- ✅ Both interfaces work correctly for admin

#### 4.4 Unauthenticated User Redirected

1. Sign out completely
2. Manually navigate to `/portal`
3. Observe redirect

**Expected**:
- ✅ Redirected to `/auth/signin?callbackUrl=/portal`
- ✅ After signin, redirected back to `/portal`

---

## Validation Workflow 5: Session Management

### Goal
Verify single-session-per-user enforcement and session validation.

### Steps

#### 5.1 Single Session Enforcement

1. Sign in as `testmember` in Browser 1 (or normal window)
2. Access `/portal` → Verify success
3. Open Browser 2 (or incognito window)
4. Sign in as `testmember` again in Browser 2
5. Return to Browser 1
6. Attempt to navigate within portal or refresh page

**Expected**:
- ✅ Browser 1 session invalidated
- ✅ Browser 1 user logged out automatically
- ✅ Browser 1 redirected to `/auth/signin`
- ✅ Error message: "Sie wurden von einem anderen Gerät angemeldet." or similar

#### 5.2 Session Persists After Page Refresh

1. Sign in as any user
2. Refresh the page (F5 or Ctrl+R)
3. Verify still logged in

**Expected**:
- ✅ User remains authenticated after refresh
- ✅ No re-authentication required
- ✅ Session data persists

#### 5.3 Logout Clears Session

1. Sign in as any user
2. Navigate to portal or admin
3. Click logout button
4. Attempt to navigate back to protected page

**Expected**:
- ✅ Logout successful
- ✅ Session token cleared from database
- ✅ Cannot access protected pages without re-authentication

---

## Validation Workflow 6: Role Change Handling

### Goal
Verify that role changes take effect on next login, not during active session.

### Steps

#### 6.1 Change Role While User Logged In

1. Browser 1: Sign in as `testmember` (mitglied role)
2. Browser 1: Navigate to `/portal` → Verify access
3. Browser 2: Sign in as admin
4. Browser 2: Navigate to `/admin/users`
5. Browser 2: Change `testmember` role from "Mitglied" to "Admin"
6. Browser 2: Save changes
7. Browser 1: Continue using portal, navigate around

**Expected**:
- ✅ Browser 1 session continues normally
- ✅ Browser 1 user still has mitglied role in session
- ✅ Browser 1 user can still access `/portal`
- ✅ Browser 1 user still CANNOT access `/admin` yet

#### 6.2 Role Change Takes Effect After Logout

1. Browser 1 (testmember): Click logout
2. Browser 1: Sign in again as `testmember`
3. Observe redirect destination

**Expected**:
- ✅ After re-login, user has new role (admin)
- ✅ User redirected to `/admin` (admin default)
- ✅ User can now access admin interface
- ✅ User can still access member portal

---

## Validation Workflow 7: Account Deactivation

### Goal
Verify that deactivating a user logs them out on next request.

### Steps

#### 7.1 Deactivate Active User

1. Browser 1: Sign in as `testmember`
2. Browser 1: Navigate to `/portal`
3. Browser 2: Sign in as admin
4. Browser 2: Navigate to `/admin/users`
5. Browser 2: Edit `testmember`, uncheck "Aktiv" checkbox
6. Browser 2: Save changes
7. Browser 1: Try to navigate or refresh page

**Expected**:
- ✅ Browser 1 user logged out on next request
- ✅ Redirect to `/auth/signin`
- ✅ Error message about account status

#### 7.2 Inactive User Cannot Sign In

1. Attempt to sign in as `testmember` (now inactive)
2. Observe response

**Expected**:
- ✅ Sign-in fails
- ✅ Error message: "Konto deaktiviert" or similar
- ✅ User not authenticated

---

## Validation Workflow 8: Error Handling

### Goal
Verify appropriate error messages and handling.

### Steps

#### 8.1 Invalid Credentials

1. Navigate to `/auth/signin`
2. Enter username: `testmember`
3. Enter wrong password: `WrongPassword`
4. Click sign in

**Expected**:
- ✅ Sign-in fails
- ✅ Error message: "Ungültige Anmeldedaten"
- ✅ User remains on sign-in page

#### 8.2 Create User with Duplicate Username

1. Sign in as admin
2. Navigate to `/admin/users`
3. Try to create user with existing username
4. Observe error

**Expected**:
- ✅ Creation fails
- ✅ Error message: "Benutzername oder E-Mail bereits vorhanden"
- ✅ Form not cleared, user can correct input

#### 8.3 Create User with Invalid Email

1. Try to create user with email: `notanemail`
2. Observe validation error

**Expected**:
- ✅ Client-side validation catches invalid email
- ✅ Error message: "Ungültige E-Mail-Adresse" or similar
- ✅ Form submission prevented

#### 8.4 Create User with Short Password

1. Try to create user with password: `short`
2. Observe validation error

**Expected**:
- ✅ Validation catches short password
- ✅ Error message: "Passwort muss mindestens 8 Zeichen lang sein"
- ✅ Form submission prevented

---

## Code Validation

After manual testing, run automated code validation:

### 1. Type Checking

```bash
npm run typecheck
```

**Expected**:
- ✅ No TypeScript errors
- ✅ All types correctly defined
- ✅ No `any` types used

### 2. Linting

```bash
npm run lint
```

**Expected**:
- ✅ No ESLint errors
- ✅ Code follows project conventions

### 3. Combined Check

```bash
npm run check
```

**Expected**:
- ✅ Both typecheck and lint pass
- ✅ Code ready for commit

---

## Final Checklist

Before considering the feature complete, verify:

### Functional Requirements
- [ ] FR-001: Role-based access control with admin and mitglied roles
- [ ] FR-002: Admin can access both admin interface and member portal
- [ ] FR-003: Mitglied can access only member portal
- [ ] FR-004: Unauthenticated users cannot access member portal
- [ ] FR-005: Unauthenticated users redirected to login
- [ ] FR-006: Separate authentication contexts maintained
- [ ] FR-007: Role changes apply on next login only
- [ ] FR-008: One active session per user enforced
- [ ] FR-010: Dedicated member portal at distinct URL
- [ ] FR-011: Navigation menu system functional
- [ ] FR-012: Start page with welcome message
- [ ] FR-013: All text in German
- [ ] FR-014: Modular architecture for future features
- [ ] FR-016: Admin can create users
- [ ] FR-017: Admin must assign role on creation
- [ ] FR-018: Admin can view user list with roles
- [ ] FR-019: Admin can edit users and change roles
- [ ] FR-020: Admin can reset passwords
- [ ] FR-021: Admin can delete users with confirmation
- [ ] FR-022: Self-deletion prevented
- [ ] FR-024: Credentials validated on login
- [ ] FR-025: Separate admin and portal API endpoints
- [ ] FR-026: Admin APIs restricted to admin role
- [ ] FR-027: Portal APIs accessible to admin and mitglied
- [ ] FR-029: Authorization enforced at API level

### Code Quality
- [ ] All files under 500 lines
- [ ] TypeScript strict mode with no `any` types
- [ ] Centralized types in src/types/
- [ ] Zod validation on all API inputs
- [ ] Logger used for all server-side logging
- [ ] JSDoc comments on all functions
- [ ] Domain-based architecture maintained
- [ ] Path aliases (@/) used consistently

### Constitution Compliance
- [ ] Type Safety First principle followed
- [ ] No software tests created
- [ ] KISS principle applied (simplest solution)
- [ ] DRY principle followed (code reused)
- [ ] All user-facing text in German
- [ ] Structured logging used
- [ ] File size limit respected

---

## Troubleshooting

### Issue: User cannot access portal after login
**Check**:
1. Verify user role is "admin" or "mitglied"
2. Check middleware is properly configured
3. Verify session contains role claim
4. Check database activeSessionToken matches JWT token

### Issue: Session invalidated immediately
**Check**:
1. Verify NEXTAUTH_SECRET environment variable set
2. Check activeSessionToken saved to database on login
3. Verify middleware validation logic
4. Check for race conditions in token updates

### Issue: Role changes not taking effect
**Check**:
1. User must log out and log back in
2. Verify database role field updated
3. Check JWT token contains old role (expected during session)
4. After re-login, verify new JWT contains new role

### Issue: Admin cannot be created
**Check**:
1. Verify role validation schema includes "admin"
2. Check Zod schema allows "admin" role
3. Verify database user.role field accepts "admin"

---

## Success Criteria

The feature is successfully implemented when:

1. ✅ All functional requirements validated
2. ✅ All validation workflows pass
3. ✅ `npm run check` passes without errors
4. ✅ All code quality criteria met
5. ✅ Constitution compliance verified
6. ✅ No console errors or warnings in browser
7. ✅ All user-facing text in German
8. ✅ Documentation complete

**Validation Sign-off**: [Date] - [Name]
