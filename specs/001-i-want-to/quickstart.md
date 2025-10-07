# Quickstart: Manual Validation for Code Refactoring

**Feature**: Code Organization Refactoring
**Branch**: 001-i-want-to
**Date**: 2025-10-06
**Estimated Time**: 45-60 minutes per domain

## Overview

This quickstart guide provides step-by-step manual validation for the src/lib refactoring. Each domain should be validated individually before proceeding to the next.

## Prerequisites

- [ ] Git working directory is clean (commit or stash changes)
- [ ] Development environment is set up: `npm install`
- [ ] Database is running: `npm run db:start`
- [ ] Email server is running: `npm run mail:start`
- [ ] Blob storage is running: `npm run blob:start`

## Validation Workflow

For each domain refactored, follow this workflow:

### 1. Static Analysis (5 min)

```bash
# Run type checking
npm run typecheck

# Run linting
npm run lint

# Combined check
npm run check
```

**Expected**: No errors or warnings

**If errors occur**:
1. Review error messages for missing imports
2. Check for typos in file paths
3. Verify all exports are maintained in index.ts
4. Fix and re-run

### 2. File Size Validation (2 min)

```bash
# Check largest files in src/lib
find src/lib -type f \( -name "*.ts" -o -name "*.tsx" \) -exec wc -l {} + | sort -rn | head -10
```

**Expected**: No file exceeds 500 lines

**If violations found**:
1. Identify which file is oversized
2. Review split strategy in data-model.md
3. Further split the file

### 3. Standards Compliance Check (3 min)

#### Console Usage Check
```bash
# Search for console.log/error/warn usage
grep -r "console\.\(log\|error\|warn\|info\)" src/lib --include="*.ts" --include="*.tsx" --exclude="logger.ts"
```

**Expected**: No matches (or only in logger.ts)

#### Database Operations Check
```bash
# Search for Prisma usage outside db/
grep -r "prisma\." src/lib --include="*.ts" --exclude-dir="db" | grep -v "// prisma\." | grep -v "import.*prisma"
```

**Expected**: No direct prisma.model.method calls outside db/

**Note**: Import statements like `import { prisma }` are OK, but calls like `prisma.appointment.create()` should only be in db/

### 4. Domain-Specific Manual Testing

Test the specific domain that was just refactored:

#### Newsletter Domain (15 min)

1. **Settings Management**
   ```
   Navigate to: http://localhost:3000/admin/newsletter/settings
   Action: Update SMTP settings
   Expected: Settings save successfully
   ```

2. **Newsletter Composition**
   ```
   Navigate to: http://localhost:3000/admin/newsletter/edit
   Action: Create a draft newsletter with AI introduction
   Expected: Draft saves, AI intro generates
   ```

3. **Newsletter Sending**
   ```
   Navigate to: http://localhost:3000/admin/newsletter/edit
   Action: Send test newsletter
   Expected: Newsletter sends, appears in MailDev (port 1080)
   ```

4. **Analytics**
   ```
   Navigate to: http://localhost:3000/admin/newsletter/analytics
   Expected: Analytics dashboard loads without errors
   ```

5. **Archives**
   ```
   Navigate to: http://localhost:3000/admin/newsletter/archives
   Expected: Past newsletters display correctly
   ```

#### Appointments Domain (10 min)

1. **Public Submission**
   ```
   Navigate to: http://localhost:3000/termine
   Action: Submit a new appointment with file upload
   Expected: Submission succeeds, file uploads to blob storage
   ```

2. **Admin Review**
   ```
   Navigate to: http://localhost:3000/admin/appointments
   Action: View submitted appointment
   Expected: Appointment displays with correct metadata and files
   ```

3. **Approval/Rejection**
   ```
   Navigate to: http://localhost:3000/admin/appointments
   Action: Approve an appointment
   Expected: Status changes, confirmation email sent (check MailDev)
   ```

4. **Editing**
   ```
   Navigate to: http://localhost:3000/admin/appointments
   Action: Edit appointment details
   Expected: Changes save successfully
   ```

#### Groups Domain (10 min)

1. **Group Proposal Submission**
   ```
   Navigate to: http://localhost:3000/neue-gruppe
   Action: Submit a new group proposal
   Expected: Submission succeeds
   ```

2. **Admin Group Management**
   ```
   Navigate to: http://localhost:3000/admin/groups
   Action: Approve group, change status to ACTIVE
   Expected: Group status updates
   ```

3. **Status Report Submission**
   ```
   Navigate to: http://localhost:3000/gruppen-bericht
   Action: Submit a status report for a group
   Expected: Submission succeeds
   ```

4. **Admin Status Report Review**
   ```
   Navigate to: http://localhost:3000/admin/status-reports
   Action: Review and approve status report
   Expected: Report displays, approval works
   ```

#### Anträge Domain (10 min)

1. **Board Request Submission**
   ```
   Navigate to: http://localhost:3000/antrag-an-kreisvorstand
   Action: Submit a board request with file attachment
   Expected: Submission succeeds, file uploads
   ```

2. **Admin Review**
   ```
   Navigate to: http://localhost:3000/admin/antraege
   Action: View submitted request
   Expected: Request displays with files
   ```

3. **Approval Flow**
   ```
   Navigate to: http://localhost:3000/admin/antraege
   Action: Change request status
   Expected: Status updates correctly
   ```

#### Email Infrastructure (5 min)

Email is tested indirectly through other domains. Verify:

1. **Appointment Emails**
   - Check MailDev for appointment confirmation email
   - Verify email has correct subject and content

2. **Group Emails**
   - Check MailDev for group approval email
   - Verify email format

3. **Newsletter Emails**
   - Check MailDev for newsletter test email
   - Verify tracking pixels and links work

#### AI Infrastructure (5 min)

1. **Newsletter AI Introduction**
   ```
   Navigate to: http://localhost:3000/admin/newsletter/edit
   Action: Click "Generate AI Introduction"
   Expected: AI-generated intro appears
   Check: Browser console for no errors
   ```

#### Auth Infrastructure (5 min)

1. **Login**
   ```
   Navigate to: http://localhost:3000/admin
   Action: Log in with admin credentials
   Expected: Successful login, redirect to dashboard
   ```

2. **Protected Routes**
   ```
   Navigate to: http://localhost:3000/admin/newsletter/edit (logged out)
   Expected: Redirect to login page
   ```

3. **Logout**
   ```
   Navigate to: http://localhost:3000/admin
   Action: Click logout
   Expected: Redirect to home, session cleared
   ```

### 5. Import Path Verification (3 min)

```bash
# Check for any remaining old import paths
# Example: imports from old file locations

# Newsletter
grep -r "from '@/lib/newsletter-service'" src/app --include="*.ts" --include="*.tsx"
# Expected: No matches (should be '@/lib/newsletter')

# Appointments
grep -r "from '@/lib/appointment-handlers'" src/app --include="*.ts" --include="*.tsx"
# Expected: No matches (should be '@/lib/appointments')

# Groups
grep -r "from '@/lib/group-handlers'" src/app --include="*.ts" --include="*.tsx"
# Expected: No matches (should be '@/lib/groups')

# Email
grep -r "from '@/lib/email-senders'" src/app --include="*.ts" --include="*.tsx"
# Expected: No matches (should be '@/lib/email')
```

### 6. Git Verification (2 min)

```bash
# View changed files
git status

# Review diff for one domain
git diff src/lib/appointments/

# Check for unintended changes
git diff src/lib/logger.ts
# Expected: No changes to unrelated files
```

## Full System Smoke Test (15 min)

After all domains are refactored, perform a complete system test:

### 1. User Journey: Submit Appointment → Newsletter

1. Submit appointment at `/termine`
2. Approve appointment at `/admin/appointments`
3. Create newsletter at `/admin/newsletter/edit`
4. Verify appointment appears in newsletter preview
5. Send newsletter
6. Check MailDev for sent newsletter
7. Click tracking link in email
8. Verify analytics at `/admin/newsletter/analytics`

**Expected**: Complete flow works without errors

### 2. User Journey: Submit Group → Status Report

1. Submit group proposal at `/neue-gruppe`
2. Approve group at `/admin/groups`
3. Submit status report at `/gruppen-bericht`
4. Review report at `/admin/status-reports`
5. Approve report
6. Create newsletter including status report
7. Verify report appears in newsletter

**Expected**: Complete flow works without errors

### 3. User Journey: Submit Antrag → Review

1. Submit board request at `/antrag-an-kreisvorstand`
2. Review at `/admin/antraege`
3. Update status
4. Download attached files

**Expected**: Complete flow works without errors

## Error Handling Validation (5 min)

Test that errors are still handled correctly:

1. **Invalid Form Submission**
   ```
   Navigate to: http://localhost:3000/termine
   Action: Submit form with missing required fields
   Expected: German validation errors display
   ```

2. **File Upload Limits**
   ```
   Navigate to: http://localhost:3000/termine
   Action: Upload file >10MB
   Expected: German error message about file size
   ```

3. **Server Errors**
   ```
   Check: Browser console for any errors during testing
   Expected: No console errors
   Check: Server logs use logger (not console)
   Expected: Structured log entries
   ```

## Performance Verification (3 min)

```bash
# Start dev server
npm run dev

# Measure startup time
# Expected: Similar to before refactoring (~5-10 seconds)

# Test page load times
# Navigate to various admin pages
# Expected: No noticeable slowdown
```

## Rollback Procedure

If critical issues are found:

```bash
# Check current branch
git branch

# View commits for this refactoring
git log --oneline -10

# Rollback to specific commit (example)
git revert <commit-hash>

# Or reset to before refactoring (CAREFUL - loses uncommitted work)
git reset --hard HEAD~5
```

## Success Criteria Checklist

After completing all validation steps:

- [ ] `npm run check` passes with no errors
- [ ] All files under 500 lines
- [ ] No console.* usage outside logger.ts
- [ ] All database operations in db/ directory
- [ ] All domain functionality tested manually and works
- [ ] All user flows tested and work end-to-end
- [ ] German error messages display correctly
- [ ] Email notifications send correctly
- [ ] File uploads work correctly
- [ ] AI features work correctly
- [ ] Authentication works correctly
- [ ] Performance is acceptable (no noticeable slowdown)
- [ ] Git history shows clean, incremental commits per domain

## Domain-by-Domain Validation Checklist

Track progress through refactoring:

- [ ] Phase 1: Newsletter Domain validated
- [ ] Phase 2: Email Infrastructure validated
- [ ] Phase 3: Appointments Domain validated
- [ ] Phase 4: Groups Domain validated
- [ ] Phase 5: Anträge Domain validated
- [ ] Phase 6: AI & Analytics validated
- [ ] Phase 7: Auth validated
- [ ] Phase 8: Final Cleanup validated
- [ ] Full System Smoke Test passed

## Troubleshooting Guide

### Issue: TypeScript errors about missing exports

**Solution**:
1. Check index.ts in the domain directory
2. Verify all functions are re-exported
3. Check for typos in export names

### Issue: Runtime error "Cannot find module"

**Solution**:
1. Check import path uses `@/lib/[domain]` format
2. Verify file exists at expected location
3. Restart dev server: `npm run dev`

### Issue: Database operation fails

**Solution**:
1. Check db/*-operations.ts file has the function
2. Verify domain service imports from db/ correctly
3. Check Prisma schema matches database

### Issue: Email not sending

**Solution**:
1. Verify MailDev is running: `npm run mail:start`
2. Check email/ directory functions are imported correctly
3. Review server logs for errors

### Issue: File upload fails

**Solution**:
1. Verify Vercel Blob is running: `npm run blob:start`
2. Check blob-storage/ directory is unchanged
3. Review file size limits

## Completion

When all checklist items are complete:

1. Create final commit: `git commit -m "refactor: complete src/lib reorganization"`
2. Push to branch: `git push origin 001-i-want-to`
3. Create pull request for review
4. Document any issues encountered for future reference

---

**Validation Complete**: [DATE]
**Issues Found**: [LIST OR "NONE"]
**Time Taken**: [MINUTES]
