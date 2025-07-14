# Lint Error Tracking Checklist

This checklist tracks all ESLint errors and warnings that need to be fixed. Each file will be marked as complete (✅) when all its errors are resolved.

## Summary
- **Total Files with Issues**: 58
- **Completed**: 39
- **Remaining**: 19

---

## Admin Pages (7 files)

| Status | File | Count | Issues |
|--------|------|-------|--------|
| ✅ | `src/app/admin/appointments/page.tsx` | 0 | All fixed! |
| ✅ | `src/app/admin/groups/page.tsx` | 0 | All fixed! |
| ✅ | `src/app/admin/newsletter/edit/page.tsx` | 0 | All fixed! |
| ✅ | `src/app/admin/newsletter/view/page.tsx` | 0 | All fixed! |
| ✅ | `src/app/admin/status-reports/[id]/edit/page.tsx` | 0 | All fixed! |
| ✅ | `src/app/admin/status-reports/[id]/page.tsx` | 0 | All fixed! |
| ✅ | `src/app/admin/status-reports/page.tsx` | 0 | All fixed! |
| ✅ | `src/app/admin/users/page.tsx` | 0 | All fixed! |

---

## API Routes (18 files)

| Status | File | Count | Issues |
|--------|------|-------|--------|
| ✅ | `src/app/api/admin/change-password/route.ts` | 0 | All fixed! |
| ✅ | `src/app/api/admin/groups/[id]/route.ts` | 0 | All fixed! |
| ✅ | `src/app/api/admin/groups/route.ts` | 0 | All fixed! |
| ✅ | `src/app/api/admin/newsletter/archives/route.ts` | 0 | All fixed! |
| ✅ | `src/app/api/admin/newsletter/drafts/route.ts` | 0 | All fixed! |
| ✅ | `src/app/api/admin/newsletter/generate/route.ts` | 0 | All fixed! |
| ✅ | `src/app/api/admin/newsletter/retry-chunk/route.ts` | 0 | All fixed! |
| ✅ | `src/app/api/admin/newsletter/send-chunk/route.ts` | 0 | All fixed! |
| ✅ | `src/app/api/admin/newsletter/send-test/route.ts` | 0 | All fixed! |
| ✅ | `src/app/api/admin/newsletter/send/route.ts` | 0 | All fixed! |
| ✅ | `src/app/api/admin/newsletter/settings/route.ts` | 0 | All fixed! |
| ✅ | `src/app/api/admin/status-reports/route.ts` | 0 | All fixed! |
| ✅ | `src/app/api/appointments/route.ts` | 0 | All fixed! |
| ✅ | `src/app/api/groups/[slug]/route.ts` | 0 | All fixed! |
| ✅ | `src/app/api/groups/[slug]/status-reports/route.ts` | 0 | All fixed! |
| ✅ | `src/app/api/groups/route.ts` | 0 | All fixed! |
| ✅ | `src/app/api/groups/submit/route.ts` | 0 | All fixed! |
| ✅ | `src/app/api/status-reports/submit/route.ts` | 0 | All fixed! |

---

## Components (6 files)

| Status | File | Count | Issues |
|--------|------|-------|--------|
| ✅ | `src/components/AppointmentForm.tsx` | 0 | All fixed! |
| ✅ | `src/components/appointment-details/AppointmentContent.tsx` | 0 | File not found (removed from codebase) |
| ✅ | `src/components/forms/appointments/AppointmentForm.tsx` | 0 | All fixed! |
| ✅ | `src/components/forms/groups/GroupRequestForm.tsx` | 0 | All fixed! |
| ✅ | `src/components/forms/status-reports/StatusReportForm.tsx` | 0 | All fixed! |
| ✅ | `src/components/groups/GroupsPage.tsx` | 0 | All fixed! |

---

## Lib Files (7 files)

| Status | File | Count | Issues |
|--------|------|-------|--------|
| ✅ | `src/lib/appointment-handlers.ts` | 0 | All fixed! |
| ✅ | `src/lib/group-handlers.ts` | 0 | All fixed! |
| ✅ | `src/lib/newsletter-service.ts` | 0 | All fixed! |
| ✅ | `src/lib/newsletter-template.ts` | 0 | All fixed! |
| ✅ | `src/lib/newsletter.ts` | 0 | File not found (removed from codebase) |
| ✅ | `src/lib/rss.ts` | 0 | All fixed! |
| ✅ | `src/middleware.ts` | 0 | All fixed! |

---

## Test Files (16 files)

| Status | File | Count | Issues |
|--------|------|-------|--------|
| ⏳ | `src/tests/AppointmentForm.test.tsx` | 2 | • Error: unused 'act' import<br>• Error: unused 'userEvent' import |
| ⏳ | `src/tests/EditGroupWrapper.test.tsx` | 1 | • Error: unexpected any type (line 14) |
| ⏳ | `src/tests/EditStatusReportForm.test.tsx` | 1 | • Error: unused 'control' variable |
| ⏳ | `src/tests/FileUpload.test.tsx` | 2 | • Error: unused 'userEvent' import<br>• Error: unused 'file' variable |
| ⏳ | `src/tests/FormBase.test.tsx` | 1 | • Error: unexpected any type (line 54) |
| ⏳ | `src/tests/GroupEditForm.test.tsx` | 1 | • Error: unexpected any type (line 64) |
| ⏳ | `src/tests/GroupPages.test.tsx` | 1 | • Error: forbidden require() import (line 306) |
| ⏳ | `src/tests/GroupRequestForm.test.tsx` | 3 | • Error: unused 'userEvent' import<br>• Error: 2x unexpected any types |
| ⏳ | `src/tests/StatusReportForm.test.tsx` | 3 | • Error: unexpected any type (line 12)<br>• Error: unused 'maxFiles' variable<br>• Error: unexpected any type (line 27) |
| ⏳ | `src/tests/e2e-admin-group-management.test.tsx` | 1 | • Error: unused 'userEvent' import |
| ⏳ | `src/tests/e2e-admin-status-reports-management.test.tsx` | 1 | • Error: unused 'userEvent' import |
| ⏳ | `src/tests/e2e-file-uploads.test.ts` | 5 | • Error: 3x unused variables (data, options, urls)<br>• Error: 2x @ts-ignore should be @ts-expect-error |
| ⏳ | `src/tests/e2e-group-submission.test.tsx` | 1 | • Error: unused 'userEvent' import |
| ⏳ | `src/tests/e2e-group-workflow.test.ts` | 5 | • Error: 4x unused imports/variables<br>• Error: unused 'logoFile' variable |
| ⏳ | `src/tests/e2e-status-report-submission.test.tsx` | 1 | • Error: unused 'userEvent' import |
| ⏳ | `src/tests/e2e-status-report-workflow.test.ts` | 7 | • Error: 5x unused imports/variables<br>• Error: 2x unexpected any types |
| ⏳ | `src/tests/status-report-emails.test.ts` | 3 | • Error: 3x unsafe Function types (prefer explicit types) |

---

## Progress Tracking

**Next file to work on**: `src/app/api/admin/change-password/route.ts` (1 remaining issue)

### Quick Win Categories:
1. **Unused imports/variables** (42 issues) - Easy fixes, remove unused code
2. **TypeScript any types** (23 issues) - Replace with proper types
3. **React hooks dependencies** (8 issues) - Add useCallback/useMemo
4. **HTML entity escaping** (2 issues) - Replace quotes with entities
5. **Other** (13 issues) - Miscellaneous fixes

### Strategy:
- Focus on one file at a time
- Start with admin pages (user-facing)
- Then API routes (backend)
- Finally tests (less critical)
- Mark each file as ✅ when all issues resolved