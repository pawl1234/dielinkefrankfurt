name: "Blob Storage Upload Consolidation v1"
description: |

## Purpose
Consolidate 6+ duplicate file upload implementations into a single, unified blob storage module with proper error handling, retry logic, validation, and deduplication. Eliminate ~700 lines of duplicated code while preserving all existing features.

## Core Principles
1. **Context is King**: Include ALL necessary documentation, examples, and caveats
2. **Validation Loops**: Provide executable lints the AI can run and fix
3. **Information Dense**: Use keywords and patterns from the codebase
4. **Progressive Success**: Start simple, validate, then enhance
5. **Global rules**: Be sure to follow all rules in CLAUDE.md
6. **NO TESTS**: Do not create any test files - focus only on implementation and TypeScript/ESLint validation

---

## Goal
Create a **single source of truth** for Vercel Blob Storage operations that:
- Consolidates all upload/delete functionality into `src/lib/blob-storage/`
- Eliminates ~700 lines of duplicated upload logic across 7 files
- Preserves best features: retry logic, file hashing, validation, error handling
- Maintains backward compatibility during migration
- Follows DRY principles and TypeScript best practices

## Why
- **Business value**: Reduces storage costs via deduplication, improves reliability with retry logic
- **Developer experience**: Single pattern to follow, easier onboarding
- **Maintainability**: DRY principle - one place to fix bugs or add features
- **Integration**: Works with all forms (appointments, groups, status-reports, anträge)
- **Problems solved**:
  - 6+ duplicate implementations across codebase
  - Inconsistent error handling (some retry, some don't)
  - No deduplication leading to duplicate file uploads
  - Scattered validation logic

## What
Unified blob storage module with:
- Single `uploadFiles()` function supporting all use cases
- Configurable retry with exponential backoff (Vercel best practice: 3 retries)
- File deduplication using SHA-256 hashing (streaming for memory efficiency)
- Consistent error handling using FileUploadError
- Validation using existing file-schemas
- Structured logging with logger module
- Cleanup on failure (automatic rollback)

### Success Criteria
- [ ] All upload logic consolidated into `src/lib/blob-storage/`
- [ ] All consumers migrated (appointments, groups, status-reports, anträge, admin routes)
- [ ] Old files deleted: `file-upload-helpers.ts`, `file-handlers.ts`, `file-upload.ts`, upload logic from `antrag-file-utils.ts`
- [ ] Zero duplication - only one upload implementation
- [ ] No TypeScript errors
- [ ] No ESLint errors
- [ ] Manual testing confirms all upload functionality works

## All Needed Context

### Documentation & References
```yaml
# MUST READ - Include these in your context window
- url: https://vercel.com/docs/vercel-blob
  why: Official Vercel Blob Storage documentation
  critical: Retry patterns, multipart uploads (>100MB), error codes

- url: https://vercel.com/docs/vercel-blob/using-blob-sdk
  why: SDK usage patterns for put(), del(), list() operations
  critical: Access control, content-type handling, cache headers

- url: https://transloadit.com/devtips/efficient-file-deduplication-with-sha-256-and-node-js/
  why: File deduplication strategy using SHA-256 streaming
  critical: SHA-256 > MD5 (collision-resistant), streaming to avoid memory issues

- file: src/lib/file-upload.ts
  why: Current implementation with retry logic and exponential backoff - PRESERVE THIS
  critical: Lines 87-169 (uploadFile with retry), maxRetries=3, exponential backoff

- file: src/lib/file-handlers.ts
  why: Has file hashing and deduplication logic - PRESERVE THIS
  critical: Lines 102-107 (generateFileHash), 126-140 (URL cache), 188-230 (batch uploads)

- file: src/lib/file-upload-helpers.ts
  why: Recent refactor with clean interfaces - USE THIS AS BASE
  critical: UploadConfig interface, category-based organization, structured logging

- file: src/lib/antrag-file-utils.ts
  why: Has cleanup on failure pattern - PRESERVE THIS
  critical: Lines 88-96 (cleanup uploaded files on any failure)

- file: src/lib/validation/file-schemas.ts
  why: Centralized file validation schemas - USE THIS
  critical: FILE_SIZE_LIMITS, FILE_TYPES, createSecureFileSchema with magic bytes

- file: src/lib/logger.ts
  why: Structured logging pattern - USE THIS
  critical: logger.info(), logger.error(), logger.debug() with module and context

- file: src/lib/errors.ts
  why: FileUploadError class and error handling patterns
  critical: FileUploadError constructor, status codes, error codes

```

### Current Codebase Tree (File Upload Related)
```bash
src/lib/
├── file-upload-helpers.ts        # NEW (238 lines) - Recent refactor, clean interfaces ⚠️
├── file-handlers.ts               # (336 lines) - Has hashing, deduplication, batch ⚠️
├── file-upload.ts                 # (377 lines) - Has retry logic, used by groups/status-reports ⚠️
├── antrag-file-utils.ts           # (197 lines) - Upload/delete for anträge ⚠️
├── image-composition.ts           # (454 lines) - Private uploadToBlob() method
├── appointment-handlers.ts        # (800+ lines) - Recently refactored, uses file-upload-helpers.ts
├── group-handlers.ts              # (1030 lines) - Deletion logic for groups
└── validation/
    └── file-schemas.ts            # Centralized validation schemas ✅ KEEP

src/app/api/
├── appointments/submit/route.ts   # Uses file-upload-helpers.ts
├── groups/submit/route.ts         # Uses file-upload.ts (uploadGroupLogo)
├── status-reports/submit/route.ts # Uses file-upload.ts (uploadStatusReportFiles)
├── antraege/submit/route.ts       # Uses antrag-file-utils.ts
└── admin/status-reports/route.ts  # INLINE put() calls (lines 130-158) ⚠️

⚠️ = Files to be consolidated/deleted
✅ = Files to keep
```

### Desired Codebase Tree
```bash
src/lib/
├── blob-storage/                  # 🆕 NEW - Single source of truth
│   ├── index.ts                   # Public API: uploadFiles(), deleteFiles()
│   ├── upload.ts                  # Core upload logic with retry
│   ├── delete.ts                  # Core delete logic with retry
│   ├── validation.ts              # File validation (wraps file-schemas)
│   ├── hashing.ts                 # SHA-256 file hashing and deduplication
│   ├── retry.ts                   # Exponential backoff retry logic
│   ├── types.ts                   # TypeScript interfaces
│   └── constants.ts               # Upload categories, batch sizes
├── validation/
│   └── file-schemas.ts            # ✅ KEEP - Already centralized
├── appointment-handlers.ts        # ✅ KEEP - Will import from blob-storage/
├── group-handlers.ts              # ✅ KEEP - Will import from blob-storage/
├── image-composition.ts           # ✅ KEEP - Will import from blob-storage/
└── antrag-file-utils.ts           # ⚠️ MODIFY - Keep delete logic, remove upload

❌ DELETE THESE FILES:
├── file-upload-helpers.ts         # Merge into blob-storage/
├── file-handlers.ts               # Merge into blob-storage/
└── file-upload.ts                 # Merge into blob-storage/
```

### Known Gotchas & Library Quirks
```typescript
// CRITICAL: Vercel Blob recommends retry with exponential backoff
// Best practice: 3 retries with exponential backoff (see file-upload.ts:111-169)
// Example: delay = retryDelay * Math.pow(2, attempt)

// CRITICAL: Use SHA-256 for file hashing, NOT MD5 (collision-resistant)
// Example: crypto.createHash('sha256').update(buffer).digest('hex')

// CRITICAL: Stream file hashing to avoid memory issues with large files
// Example: await file.arrayBuffer() for browser File objects

// CRITICAL: Clean up uploaded files on ANY failure to prevent orphaned files
// Pattern: Track uploadedUrls array, del(uploadedUrls) in catch block
// Example: See antrag-file-utils.ts:88-96

// CRITICAL: Vercel Blob uses FormData - file.arrayBuffer() is async
// Example: const buffer = await file.arrayBuffer()

// CRITICAL: Sanitize filenames to avoid path traversal
// Pattern: fileName.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-_.]/g, '')

// CRITICAL: Use timestamp + hash for unique blob pathnames
// Pattern: `${category}/${timestamp}-${hash.slice(0, 10)}-${fileName}`

// CRITICAL: Batch uploads in groups of 4 for optimal performance
// See: file-handlers.ts:205 - const BATCH_SIZE = 4

// CRITICAL: Use structured logging with module and context
// Pattern: logger.info('message', { module: 'blob-storage', context: { ... } })

// CRITICAL: FileUploadError supports both (message, status, code) and old signature
// See: file-handlers.ts:29-53 for constructor overloading

// CRITICAL: File validation uses both MIME type AND magic bytes (security)
// See: file-schemas.ts:46-72 for createSecureFileSchema

// CRITICAL: Cache uploaded file URLs for 15 minutes to avoid re-upload
// See: file-handlers.ts:24-26 for URL_CACHE pattern
```

## Implementation Blueprint

### Data Models and Structure

Create the core data models to ensure type safety and consistency:

```typescript
// src/lib/blob-storage/types.ts

/**
 * Upload category determines the blob storage path prefix
 */
export type UploadCategory =
  | 'appointments'
  | 'groups'
  | 'status-reports'
  | 'antraege'
  | 'newsletter-headers';

/**
 * Upload configuration options
 */
export interface UploadConfig {
  category: UploadCategory;
  allowedTypes?: string[];        // Defaults to FILE_TYPES.ALL
  maxSizePerFile?: number;        // Defaults to FILE_SIZE_LIMITS.DEFAULT
  maxFiles?: number;              // Defaults to unlimited
  prefix?: string;                // Optional prefix (e.g., 'cover', 'logo')
  onProgress?: (progress: number) => void;  // Optional progress callback
  onRetry?: (attempt: number, error: Error) => void;  // Optional retry callback
}

/**
 * Upload result metadata
 */
export interface UploadResult {
  url: string;
  filename: string;
  size: number;
  type: string;
  hash: string;  // SHA-256 hash for deduplication
}

/**
 * Delete result metadata
 */
export interface DeleteResult {
  success: boolean;
  deletedUrls: string[];
  failedUrls?: string[];
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxRetries: number;      // Default: 3
  baseDelay: number;       // Default: 1000ms
  timeout: number;         // Default: 30000ms
}
```

### List of Tasks (In Order of Completion)

```yaml
Task 1: Create blob-storage module structure
  CREATE src/lib/blob-storage/ directory
  CREATE src/lib/blob-storage/types.ts
  CREATE src/lib/blob-storage/constants.ts
  CREATE src/lib/blob-storage/retry.ts
  CREATE src/lib/blob-storage/hashing.ts
  CREATE src/lib/blob-storage/validation.ts
  CREATE src/lib/blob-storage/upload.ts
  CREATE src/lib/blob-storage/delete.ts
  CREATE src/lib/blob-storage/index.ts (public API)

  VALIDATE: npm run typecheck (should pass)
  VALIDATE: npm run lint (should pass)

Task 2: Implement retry logic with exponential backoff
  MODIFY src/lib/blob-storage/retry.ts:
    - EXTRACT retry logic from file-upload.ts:111-169
    - CREATE withRetry<T>(operation: () => Promise<T>, config: RetryConfig): Promise<T>
    - IMPLEMENT exponential backoff: delay = baseDelay * Math.pow(2, attempt)
    - ADD timeout support with AbortController
    - PRESERVE onRetry callback pattern

  VALIDATE: npm run typecheck
  VALIDATE: npm run lint

Task 3: Implement SHA-256 file hashing with deduplication
  MODIFY src/lib/blob-storage/hashing.ts:
    - EXTRACT generateFileHash from file-handlers.ts:102-107
    - USE crypto.createHash('sha256') NOT MD5
    - IMPLEMENT streaming for large files
    - CREATE URL cache (15-minute TTL) from file-handlers.ts:24-26
    - ADD cache key format: `${hash}-${fileSize}`

  VALIDATE: npm run typecheck
  VALIDATE: npm run lint

Task 4: Implement file validation wrapper
  MODIFY src/lib/blob-storage/validation.ts:
    - IMPORT from @/lib/validation/file-schemas
    - WRAP validateFile() from file-handlers.ts:64-94
    - ADD helper: validateFiles() for arrays
    - PRESERVE FileUploadError throwing pattern
    - USE validationMessages for German error messages

  VALIDATE: npm run typecheck
  VALIDATE: npm run lint

Task 5: Implement core upload logic
  MODIFY src/lib/blob-storage/upload.ts:
    - COMBINE best features from file-upload.ts, file-handlers.ts, file-upload-helpers.ts
    - CREATE uploadSingleFile(file, config): Promise<UploadResult>
      - Validate file using validation.ts
      - Generate hash using hashing.ts
      - Check cache for existing upload (deduplication)
      - Sanitize filename: replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-_.]/g, '')
      - Create pathname: `${category}/${timestamp}-${hash.slice(0,10)}-${prefix}${filename}`
      - Convert to Blob: const blob = new Blob([arrayBuffer], { type: file.type })
      - Upload with retry using retry.ts: withRetry(() => put(pathname, blob, options))
      - Update cache with new URL
      - Return UploadResult with metadata

    - CREATE uploadFiles(files, config): Promise<UploadResult[]>
      - Validate all files first (fail fast)
      - Track uploadedUrls for cleanup on failure
      - Batch upload in groups of 4 (BATCH_SIZE = 4)
      - Use Promise.all() for parallel upload within batch
      - On ANY error: await del(uploadedUrls) then throw
      - Log progress with logger.info({ module: 'blob-storage', context })
      - Return array of UploadResult

  VALIDATE: npm run typecheck
  VALIDATE: npm run lint

Task 6: Implement core delete logic
  MODIFY src/lib/blob-storage/delete.ts:
    - EXTRACT delete logic from file-upload.ts:180-234
    - CREATE deleteFiles(urls, config): Promise<DeleteResult>
      - Filter invalid URLs (must start with http)
      - Use retry logic: withRetry(() => del(urls))
      - Track successfully deleted URLs
      - On partial failure: return { success: false, deletedUrls, failedUrls }
      - Clear cache entries for deleted URLs
      - Log with logger.info/error

  VALIDATE: npm run typecheck
  VALIDATE: npm run lint

Task 7: Create public API (index.ts)
  MODIFY src/lib/blob-storage/index.ts:
    - Export uploadFiles() from upload.ts
    - Export deleteFiles() from delete.ts
    - Export types from types.ts
    - Export constants from constants.ts
    - DO NOT export internal functions (uploadSingleFile, withRetry, etc.)

  VALIDATE: npm run typecheck
  VALIDATE: npm run lint

Task 8: Migrate appointment-handlers.ts
  MODIFY src/lib/appointment-handlers.ts:
    - REPLACE import from file-upload-helpers.ts
    - ADD import { uploadFiles, deleteFiles } from '@/lib/blob-storage'
    - MODIFY createAppointmentWithFiles():
      - REPLACE uploadAttachments() call with uploadFiles(files, { category: 'appointments', allowedTypes: ... })
      - REPLACE uploadCoverImages() call with uploadFiles([coverImage, croppedCoverImage].filter(Boolean), { category: 'appointments', prefix: 'cover' })
    - MODIFY updateAppointment():
      - Same pattern for file uploads
    - MODIFY deleteAppointment():
      - REPLACE del() call with deleteFiles()
    - PRESERVE all business logic unchanged

  VALIDATE: npm run typecheck
  VALIDATE: npm run lint

Task 9: Migrate group handlers and API routes
  MODIFY src/lib/group-handlers.ts:
    - ADD import { deleteFiles } from '@/lib/blob-storage'
    - MODIFY deleteGroup():
      - REPLACE del() call with deleteFiles()

  MODIFY src/app/api/groups/submit/route.ts:
    - REPLACE import from file-upload.ts
    - ADD import { uploadFiles } from '@/lib/blob-storage'
    - REPLACE uploadGroupLogo() with uploadFiles([logo], { category: 'groups', prefix: 'logo', allowedTypes: FILE_TYPES.IMAGE })

  VALIDATE: npm run typecheck
  VALIDATE: npm run lint

Task 10: Migrate status-report handlers and API routes
  MODIFY src/app/api/status-reports/submit/route.ts:
    - REPLACE import from file-upload.ts
    - ADD import { uploadFiles } from '@/lib/blob-storage'
    - REPLACE uploadStatusReportFiles() with uploadFiles(files, { category: 'status-reports' })

  MODIFY src/app/api/admin/status-reports/route.ts (PATCH handler):
    - REMOVE inline put() loop (lines 130-158)
    - ADD import { uploadFiles } from '@/lib/blob-storage'
    - REPLACE with uploadFiles(files, { category: 'status-reports' })

  VALIDATE: npm run typecheck
  VALIDATE: npm run lint

Task 11: Migrate anträge handlers
  MODIFY src/lib/antrag-file-utils.ts:
    - REMOVE uploadAntragFiles() function (lines 44-132)
    - KEEP deleteAntragFiles() for now (will use blob-storage deleteFiles internally)
    - ADD import { uploadFiles, deleteFiles } from '@/lib/blob-storage'
    - MODIFY deleteAntragFiles():
      - REPLACE del() call with deleteFiles()

  MODIFY src/app/api/antraege/submit/route.ts:
    - REPLACE uploadAntragFiles() with uploadFiles(files, { category: 'antraege', allowedTypes: FILE_TYPES.ANTRAG, maxSizePerFile: FILE_SIZE_LIMITS.ANTRAG })

  VALIDATE: npm run typecheck
  VALIDATE: npm run lint

Task 12: Migrate image-composition.ts
  MODIFY src/lib/image-composition.ts:
    - KEEP private uploadToBlob() method for now (specific to image composition)
    - OPTIONAL: Refactor to use blob-storage uploadFiles() if possible
    - This is low-priority as it's already isolated

  VALIDATE: npm run typecheck
  VALIDATE: npm run lint

Task 13: Delete old files and update imports
  DELETE src/lib/file-upload-helpers.ts
  DELETE src/lib/file-handlers.ts
  DELETE src/lib/file-upload.ts

  SEARCH for any remaining imports:
    - grep -r "file-upload-helpers" src/
    - grep -r "file-handlers" src/
    - grep -r "file-upload" src/

  FIX any broken imports

  VALIDATE: npm run typecheck (should pass with zero errors)
  VALIDATE: npm run lint (should pass with zero errors)

Task 14: Final validation and cleanup
  RUN all validation checks:
    - npm run typecheck
    - npm run lint
    - npm run dev (verify app starts)

  MANUAL TESTING:
    - Test appointment form file upload
    - Test group form logo upload
    - Test status report file upload
    - Test antrag file upload
    - Verify error handling (invalid files, network errors)
    - Verify deduplication (upload same file twice)

  UPDATE documentation:
    - Add comment to CLAUDE.md about blob-storage usage
    - Update any relevant docs in docs/ folder
```

### Pseudocode for Core Functions

```typescript
// src/lib/blob-storage/retry.ts

/**
 * Executes operation with exponential backoff retry
 * PATTERN: Used by Vercel for batch operations
 * CRITICAL: maxRetries=3 is Vercel best practice
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let attempt = 0;
  let lastError: Error | null = null;

  while (attempt <= config.maxRetries) {
    try {
      // Optional: Retry callback for logging
      if (attempt > 0 && config.onRetry) {
        config.onRetry(attempt, lastError!);
      }

      // Create timeout abort controller
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeout);

      // Execute operation
      const result = await operation();
      clearTimeout(timeoutId);

      return result;
    } catch (error) {
      lastError = error as Error;

      // If max retries exceeded, throw
      if (attempt >= config.maxRetries) {
        throw new FileUploadError(
          'Operation failed after maximum retries',
          500,
          'MAX_RETRIES_EXCEEDED'
        );
      }

      // Exponential backoff: 1s, 2s, 4s
      const delay = config.baseDelay * Math.pow(2, attempt);
      await sleep(delay);
      attempt++;
    }
  }

  // This should never be reached
  throw lastError || new Error('Unknown error');
}

// src/lib/blob-storage/hashing.ts

/**
 * Generates SHA-256 hash of file for deduplication
 * CRITICAL: Use SHA-256, NOT MD5 (collision-resistant)
 * PATTERN: Streaming to avoid memory issues
 */
export async function generateFileHash(file: File): Promise<string> {
  // PATTERN: Stream file content to hash (memory efficient)
  const buffer = await file.arrayBuffer();

  // CRITICAL: SHA-256 (not MD5) for collision resistance
  const hash = crypto.createHash('sha256')
    .update(Buffer.from(buffer))
    .digest('hex');

  return hash;
}

/**
 * Checks cache for existing upload
 * PATTERN: 15-minute cache TTL to avoid re-uploads
 */
export function checkCache(hash: string, size: number): string | null {
  const cacheKey = `${hash}-${size}`;
  const cached = URL_CACHE.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    logger.debug('Cache hit', { module: 'blob-storage', context: { hash: hash.slice(0, 10) } });
    return cached.url;
  }

  return null;
}

// src/lib/blob-storage/upload.ts

/**
 * Uploads single file with retry, hashing, and deduplication
 * INTERNAL: Not exported from index.ts
 */
async function uploadSingleFile(
  file: File,
  config: UploadConfig
): Promise<UploadResult> {
  // STEP 1: Validate file (throws FileUploadError if invalid)
  validateFile(file, config.allowedTypes, config.maxSizePerFile);

  // STEP 2: Generate hash for deduplication
  const hash = await generateFileHash(file);

  // STEP 3: Check cache (avoid re-uploading same file)
  const cachedUrl = checkCache(hash, file.size);
  if (cachedUrl) {
    logger.info('Using cached upload', { module: 'blob-storage', context: { hash: hash.slice(0, 10) } });
    return { url: cachedUrl, filename: file.name, size: file.size, type: file.type, hash };
  }

  // STEP 4: Prepare file for upload
  const timestamp = Date.now();
  const sanitizedFilename = file.name
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9-_.]/g, '');
  const prefix = config.prefix ? `${config.prefix}-` : '';
  const pathname = `${config.category}/${timestamp}-${hash.slice(0, 10)}-${prefix}${sanitizedFilename}`;

  const arrayBuffer = await file.arrayBuffer();
  const blob = new Blob([arrayBuffer], { type: file.type });

  // STEP 5: Upload with retry
  const url = await withRetry(async () => {
    const { url } = await put(pathname, blob, {
      access: 'public',
      contentType: file.type,
      addRandomSuffix: false,
      cacheControlMaxAge: 31536000,
    });
    return url;
  }, { maxRetries: 3, baseDelay: 1000, timeout: 30000 });

  // STEP 6: Update cache
  updateCache(hash, file.size, url);

  logger.debug('File uploaded', { module: 'blob-storage', context: { url, hash: hash.slice(0, 10) } });

  return { url, filename: file.name, size: file.size, type: file.type, hash };
}

/**
 * Uploads multiple files with batching and cleanup on failure
 * PUBLIC: Exported from index.ts
 */
export async function uploadFiles(
  files: (File | Blob)[],
  config: UploadConfig
): Promise<UploadResult[]> {
  logger.info('Uploading files', { module: 'blob-storage', context: { category: config.category, count: files.length } });

  // STEP 1: Validate all files first (fail fast)
  for (const file of files) {
    validateFile(file, config.allowedTypes, config.maxSizePerFile);
  }

  // STEP 2: Track uploaded URLs for cleanup on failure
  const uploadedUrls: string[] = [];
  const results: UploadResult[] = [];

  try {
    // STEP 3: Batch uploads (4 at a time for optimal performance)
    const BATCH_SIZE = 4;
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);

      // CRITICAL: Use Promise.all for parallel upload within batch
      const batchResults = await Promise.all(
        batch.map(file => uploadSingleFile(file as File, config))
      );

      results.push(...batchResults);
      uploadedUrls.push(...batchResults.map(r => r.url));

      // Optional: Progress callback
      if (config.onProgress) {
        const progress = Math.round(((i + batch.length) / files.length) * 100);
        config.onProgress(progress);
      }
    }

    logger.info('All files uploaded', { module: 'blob-storage', context: { count: results.length } });
    return results;

  } catch (error) {
    // CRITICAL: Clean up uploaded files on ANY failure
    logger.error('Upload failed, cleaning up', { module: 'blob-storage', context: { uploadedCount: uploadedUrls.length, error } });

    if (uploadedUrls.length > 0) {
      try {
        await del(uploadedUrls);
        logger.info('Cleanup successful', { module: 'blob-storage', context: { deletedCount: uploadedUrls.length } });
      } catch (deleteError) {
        logger.error('Cleanup failed', { module: 'blob-storage', context: { error: deleteError } });
      }
    }

    throw error;
  }
}

// src/lib/blob-storage/delete.ts

/**
 * Deletes files from blob storage with retry
 * PUBLIC: Exported from index.ts
 */
export async function deleteFiles(
  urls: string[],
  config?: Partial<RetryConfig>
): Promise<DeleteResult> {
  // STEP 1: Filter invalid URLs
  const validUrls = urls.filter(url => typeof url === 'string' && url.startsWith('http'));

  if (validUrls.length === 0) {
    return { success: true, deletedUrls: [] };
  }

  logger.info('Deleting files', { module: 'blob-storage', context: { count: validUrls.length } });

  try {
    // STEP 2: Delete with retry
    await withRetry(() => del(validUrls), {
      maxRetries: 3,
      baseDelay: 1000,
      timeout: 30000,
      ...config
    });

    // STEP 3: Clear cache entries
    clearCacheForUrls(validUrls);

    logger.info('Files deleted', { module: 'blob-storage', context: { count: validUrls.length } });

    return { success: true, deletedUrls: validUrls };

  } catch (error) {
    logger.error('Delete failed', { module: 'blob-storage', context: { error } });

    // PATTERN: Partial failure - return what was deleted
    return {
      success: false,
      deletedUrls: [],
      failedUrls: validUrls
    };
  }
}
```

### Integration Points

```yaml
IMPORTS:
  - Replace all imports from file-upload.ts, file-handlers.ts, file-upload-helpers.ts
  - New import: import { uploadFiles, deleteFiles } from '@/lib/blob-storage'

API ROUTES (update these):
  - src/app/api/appointments/submit/route.ts
  - src/app/api/groups/submit/route.ts
  - src/app/api/status-reports/submit/route.ts
  - src/app/api/antraege/submit/route.ts
  - src/app/api/admin/status-reports/route.ts (PATCH)
  - src/app/api/admin/groups/[id]/route.ts

HANDLERS (update these):
  - src/lib/appointment-handlers.ts
  - src/lib/group-handlers.ts
  - src/lib/antrag-file-utils.ts (modify deleteAntragFiles)

```

## Validation Loop

### Level 1: Syntax & Style (After Each Task)
```bash
# Run these FIRST after each task - fix any errors before proceeding
npm run lint                    # ESLint with auto-fix
npm run typecheck              # TypeScript type checking

# Expected: No errors. If errors, READ the error message and fix.
# Common errors:
# - Missing imports
# - Type mismatches (File vs Blob)
# - Unused variables
```

### Level 2: Manual Testing (After Task 14)
```bash
# Start dev server
npm run dev

# Test in browser:
# 1. Go to http://localhost:3000/termine/neu (appointment form)
#    - Upload cover image
#    - Upload attachments
#    - Submit form
#    - Expected: Files upload successfully

# 2. Go to http://localhost:3000/gruppen/neu (group form)
#    - Upload logo
#    - Submit form
#    - Expected: Logo uploads successfully

# 3. Test duplicate upload (deduplication):
#    - Upload same file twice
#    - Check browser network tab
#    - Expected: Second upload uses cached URL

# 4. Test error handling:
#    - Upload invalid file type
#    - Expected: German error message shown
#    - Upload oversized file
#    - Expected: German error message shown
```

## Final Validation Checklist

Before marking PRP complete:

- [ ] No linting errors: `npm run lint`
- [ ] No type errors: `npm run typecheck`
- [ ] Dev server starts: `npm run dev`
- [ ] All old files deleted (file-upload.ts, file-handlers.ts, file-upload-helpers.ts)
- [ ] No imports from deleted files: `grep -r "file-upload.ts" src/`
- [ ] Manual testing: Deduplication works (upload same file twice, check cache)
- [ ] Manual testing: All upload categories work (appointments, groups, status-reports, anträge)
- [ ] Manual testing: Error handling works (invalid file types, oversized files)
- [ ] Error messages are in German
- [ ] Logs are structured with module and context
- [ ] Documentation updated if needed

---

## Anti-Patterns to Avoid

- ❌ **Don't create new upload patterns** - use uploadFiles() for everything
- ❌ **Don't skip validation** - always use validateFile() first
- ❌ **Don't use `any` type** - always use proper TypeScript types
- ❌ **Don't forget cleanup on failure** - always del() uploaded files in catch block
- ❌ **Don't use MD5 hashing** - use SHA-256 for collision resistance
- ❌ **Don't upload files serially** - use batching (4 at a time) for performance
- ❌ **Don't forget retry logic** - always use withRetry() for uploads/deletes
- ❌ **Don't hardcode batch sizes** - use constants (BATCH_SIZE = 4)
- ❌ **Don't skip cache check** - deduplication saves storage costs
- ❌ **Don't use console.log** - use structured logger with module/context
- ❌ **Don't change handler business logic** - only replace upload/delete calls
- ❌ **Don't break backward compatibility** - all existing code must still work during migration

---

## Expected Outcomes

### Code Reduction
- **Before**: ~700 lines of duplicated upload logic across 7 files
- **After**: ~400 lines in single blob-storage module
- **Reduction**: ~43% less code to maintain

### Files Deleted
1. `src/lib/file-upload-helpers.ts` (238 lines)
2. `src/lib/file-handlers.ts` (336 lines)
3. `src/lib/file-upload.ts` (377 lines)
4. Upload functions from `src/lib/antrag-file-utils.ts` (~130 lines)

### Files Created
1. `src/lib/blob-storage/index.ts` (~30 lines)
2. `src/lib/blob-storage/types.ts` (~80 lines)
3. `src/lib/blob-storage/constants.ts` (~20 lines)
4. `src/lib/blob-storage/retry.ts` (~60 lines)
5. `src/lib/blob-storage/hashing.ts` (~80 lines)
6. `src/lib/blob-storage/validation.ts` (~40 lines)
7. `src/lib/blob-storage/upload.ts` (~200 lines)
8. `src/lib/blob-storage/delete.ts` (~80 lines)

### Features Preserved
✅ Retry logic with exponential backoff (3 retries)
✅ File deduplication using SHA-256 hashing
✅ 15-minute URL cache
✅ Batch uploads (4 at a time)
✅ Cleanup on failure
✅ Progress callbacks
✅ Retry callbacks
✅ Structured logging
✅ German error messages
✅ File validation (MIME + magic bytes)

### Features Improved
🆕 Single source of truth (DRY principle)
🆕 Consistent error handling everywhere
🆕 Deduplication saves storage costs
🆕 Easier to add new features (one place to change)
🆕 TypeScript types for all operations

---

## Success Metrics

1. **Code Quality**: Zero TypeScript errors, zero ESLint errors
2. **Backward Compatibility**: All existing code works after migration (verified via manual testing)
3. **Performance**: Upload speed same or better (batching helps)
4. **Storage Efficiency**: Deduplication reduces storage usage by ~15% (estimated)
5. **Maintainability**: Single module to update for all file operations

---

## PRP Score: 9/10

### Confidence Level: **Very High** (one-pass implementation likely)

**Strengths:**
- ✅ Comprehensive context (all relevant files, documentation, best practices)
- ✅ Clear task list with validation at each step
- ✅ Detailed pseudocode for complex functions
- ✅ Executable validation gates (npm commands)
- ✅ All gotchas documented
- ✅ Migration path clearly defined

**Potential Challenges:**
- ⚠️ Large refactor touching many files (risk of merge conflicts)
- ⚠️ Need to preserve backward compatibility during migration
- ⚠️ Some edge cases in different upload scenarios

**Mitigation:**
- Progressive migration (one module at a time)
- TypeScript/ESLint validation at each step
- Keep old files until full migration complete
- Comprehensive manual testing checklist provided

**Expected Time:** 3-4 hours for full implementation and manual testing

**Note:** This PRP intentionally excludes test creation. Focus is on implementation quality, TypeScript type safety, and thorough manual testing to verify all functionality works correctly.
