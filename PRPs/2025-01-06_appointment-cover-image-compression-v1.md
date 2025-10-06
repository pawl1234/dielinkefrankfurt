name: "Appointment Cover Image Compression & Size Validation"
description: |
  Implement image compression and combined file size validation for appointment cover images
  to comply with Vercel's 4.5MB request body limit while maintaining image quality.

---

## Goal
Reduce appointment form cover image file sizes through compression and validate combined size
before submission to prevent 413 "Content Too Large" errors in production.

## Why
- **Problem**: Vercel Serverless Functions have 4.5MB request body limit
- **Current state**: coverImage (9.54MB) + croppedCoverImage (1.8MB) = 11MB → 413 error
- **Impact**: Public appointment form fails silently in production, no server logs
- **Root cause**: No compression on original image, insufficient cropped compression
- **Business value**: Users can successfully submit featured appointments with cover images

## What
Implement three-phase solution:
1. **Phase 1**: Consolidate image compression across codebase
2. **Phase 2**: Add Zod validation for combined file size (<4MB safe limit)
3. **Phase 3**: Enhance submit-form.ts error logging with proper error handling

### Success Criteria
- [ ] Original coverImage compressed to ~2MB (2000px max, JPEG 0.75)
- [ ] Cropped coverImage compressed to ~1.5MB (JPEG 0.75, reduced from 0.90)
- [ ] Combined size validated via Zod superRefine before submission
- [ ] RHF shows German error if combined > 4MB: "Cover-Bilder überschreiten..."
- [ ] submit-form.ts logs all non-200 responses using logger
- [ ] submit-form.ts throws FileUploadError (not generic Error) for 413 responses
- [ ] No 413 errors in production with images <4MB combined
- [ ] All compression logic consolidated in single utility function

## All Needed Context

### Documentation & References
```yaml
- file: src/components/upload/CoverImageUpload.tsx
  why: |
    EXISTING PATTERN for smartCompressImage() function (lines 245-321)
    - Already implements conditional compression (only if beneficial)
    - Uses canvas with imageSmoothingQuality 'high'
    - Checks file size and dimensions before compressing
    - Quality 0.85, max 1920px
    - PATTERN TO CONSOLIDATE

- file: src/components/forms/shared/ImageCropUpload.tsx
  why: |
    TARGET FILE for adding compression
    - Line 26: JPEG_COMPRESSION_QUALITY = 0.90 (needs reduction to 0.75)
    - Line 210-238: toBlob() callback (apply cropped compression)
    - Line 266-298: handleFileChange() (add original compression here)
    - NO compression currently on original image upload

- file: src/lib/validation/appointment.ts
  why: |
    TARGET FILE for Zod validation
    - Line 71: .superRefine() for cross-field validation PATTERN
    - Lines 72-79: Example validation for required cover image when featured
    - ADD combined size validation here using same pattern

- file: src/lib/validation/validation-messages.ts
  why: |
    Add new error message for combined file size
    - Lines 86-100: Template for validation messages PATTERN
    - Add 'coverImages': 'Cover-Bilder' to fieldLabels (line 11+)
    - Add combinedFileSizeExceeds() function to validationMessages

- file: src/lib/form-submission/submit-form.ts
  why: |
    TARGET FILE for error handling improvements
    - Lines 14-27: Current error handling (throws generic Error)
    - CHANGE: Use logger for all non-200 responses
    - CHANGE: Throw FileUploadError for 413 (not generic Error)

- file: src/lib/errors.ts
  why: |
    EXISTING ERROR CLASSES to use
    - Line 400-425: FileUploadError class (constructor signature)
    - Line 26-125: AppError base class
    - PATTERN: Use FileUploadError for file size errors

- file: src/lib/logger.ts
  why: |
    EXISTING LOGGER to use in submit-form.ts
    - Line 184-251: logger.error() usage pattern
    - Import: { logger } from '@/lib/logger'
    - Use module: 'form-submission', tags: ['http-error', 'status-413']

- docfile: CLAUDE.md
  why: |
    Project-specific rules and patterns
    - Error Handling & Validation System section
    - Always use centralized validation messages
    - Never use 'any' type
    - German localization for all user-facing messages
```

### Current Codebase Context
```typescript
// THREE COMPRESSION IMPLEMENTATIONS FOUND (need consolidation):

// 1. CoverImageUpload.tsx - smartCompressImage (lines 245-321)
const smartCompressImage = (file: File, maxWidth = 1920, quality = 0.85): Promise<File> => {
  // Conditional compression: only if file > 1.5MB or width > maxWidth
  // Uses canvas.toBlob() with quality parameter
  // Returns compressed OR original based on benefit
}

// 2. ImageCropUpload.tsx - JPEG_COMPRESSION_QUALITY (line 26)
const JPEG_COMPRESSION_QUALITY = 0.90; // TOO HIGH, needs 0.75

// 3. image-composition.ts - Sharp server-side (lines 106-111)
.jpeg({ quality: 90, progressive: true, mozjpeg: true })
// Server-side only, don't touch
```

### Known Gotchas & Library Quirks
```typescript
// CRITICAL: Vercel Serverless Function limits
// - Request body: 4.5MB max (our target: <4MB for safety margin)
// - Works in dev (no limit), fails in prod (413 Content Too Large)
// - 413 rejected by Vercel infrastructure BEFORE reaching API route
// - No server logs for 413 errors (logged client-side only)

// CRITICAL: Canvas compression quality
// - Values: 0.0 (worst) to 1.0 (best)
// - 0.75 vs 0.90: Virtually identical quality, ~40% smaller file
// - Always use 'high' imageSmoothingQuality for resize

// CRITICAL: Zod async validation
// - File validation already async (magic bytes check)
// - Don't add sync .refine() for file size (validation timing issues)
// - Use .superRefine() for cross-field validation (supports async)

// CRITICAL: React Hook Form + Zod
// - Validation errors only shown after formState.isSubmitted
// - File fields validate immediately (exception to rule)
// - Error messages must use fieldLabels from validation-messages.ts

// CRITICAL: Logger usage
// - Always use logger.error() for errors (not console.error)
// - Requires module and context parameters
// - Production uses JSON.stringify, dev uses console.group

// CRITICAL: FileUploadError constructor
// - Signature: new FileUploadError(message, status, code?)
// - Example: new FileUploadError('Too large', 413, 'PAYLOAD_TOO_LARGE')
// - Extends Error, has status and code properties
```

## Implementation Blueprint

### Phase 1: Consolidate Image Compression

**Goal**: Single shared compression utility used by both upload components

**Task 1.1: Create shared compression utility**
```yaml
CREATE src/lib/image-compression.ts:
  PATTERN: Mirror smartCompressImage from CoverImageUpload.tsx (lines 245-321)
  MODIFY: Make it reusable for both original and cropped images
  PARAMETERS:
    - file: File - Image file to compress
    - maxDimension: number - Max width OR height (default 2000)
    - quality: number - JPEG quality 0.0-1.0 (default 0.75)
    - minSizeThreshold: number - Only compress if > this size (default 1.5MB)
  RETURNS: Promise<File> - Compressed file or original if not beneficial

  CRITICAL:
    - Use canvas.getContext('2d') with imageSmoothingQuality = 'high'
    - Calculate scale ratio maintaining aspect ratio
    - Only compress if file > minSizeThreshold OR dimensions > maxDimension
    - Return original file if compression not beneficial (< 20% reduction)
```

**Task 1.2: Update ImageCropUpload.tsx to use shared utility**
```yaml
MODIFY src/components/forms/shared/ImageCropUpload.tsx:

  IMPORT: import { compressImage } from '@/lib/image-compression';

  DELETE lines 245-321: smartCompressImage (now in shared utility)

  CHANGE line 26:
    FROM: const JPEG_COMPRESSION_QUALITY = 0.90;
    TO: const JPEG_COMPRESSION_QUALITY = 0.75;

  ADD in handleFileChange (after line 270):
    // Compress original image before setting preview
    const compressedOriginal = await compressImage(file, 2000, 0.75);

  MODIFY line 210-238 (toBlob callback):
    - Keep existing optimization logic
    - Change quality from 0.90 to 0.75 in canvas.toBlob() call
```

**Task 1.3: Update CoverImageUpload.tsx to use shared utility**
```yaml
MODIFY src/components/upload/CoverImageUpload.tsx:

  IMPORT: import { compressImage } from '@/lib/image-compression';

  DELETE lines 245-321: smartCompressImage function

  MODIFY line 347 in handleFileChange:
    FROM: const processedFile = await smartCompressImage(file, 1920, 0.85);
    TO: const processedFile = await compressImage(file, 2000, 0.75);

  MODIFY line 232 (cropped toBlob quality):
    FROM: }, 'image/jpeg', 0.80);
    TO: }, 'image/jpeg', 0.75);
```

### Phase 2: Zod Validation for Combined File Size

**Goal**: Validate combined coverImage + croppedCoverImage size before submission

**Task 2.1: Add validation message**
```yaml
MODIFY src/lib/validation/validation-messages.ts:

  ADD to fieldLabels (after line 33):
    'coverImages': 'Cover-Bilder',
    'croppedCoverImage': 'Zugeschnittenes Cover-Bild',

  ADD to validationMessages object (after line 200):
    /**
     * Combined file size exceeds limit
     */
    combinedCoverImageSizeExceeds: (currentMB: string, maxMB: number): string => {
      return `Die kombinierten Cover-Bilder (${currentMB}MB) überschreiten das Upload-Limit von ${maxMB}MB. Bitte verwenden Sie kleinere Bilder.`;
    },
```

**Task 2.2: Add Zod superRefine for combined size validation**
```yaml
MODIFY src/lib/validation/appointment.ts:

  ADD constant at top (after line 32):
    // Vercel has 4.5MB limit, use 4MB for safety margin (allows other form fields)
    const MAX_COMBINED_COVER_IMAGE_SIZE = 4 * 1024 * 1024; // 4MB in bytes

  ADD to .superRefine() block (after line 79, before line 82):
    // Validate combined cover image size for featured appointments
    if (data.featured && data.coverImage && data.croppedCoverImage) {
      const coverSize = data.coverImage.size;
      const croppedSize = data.croppedCoverImage.size;
      const combinedSize = coverSize + croppedSize;

      if (combinedSize > MAX_COMBINED_COVER_IMAGE_SIZE) {
        const combinedMB = (combinedSize / (1024 * 1024)).toFixed(1);
        const maxMB = MAX_COMBINED_COVER_IMAGE_SIZE / (1024 * 1024);

        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: validationMessages.combinedCoverImageSizeExceeds(combinedMB, maxMB),
          path: ['coverImage']  // Show error on coverImage field
        });
      }
    }

  IMPORT at top: import { validationMessages } from './validation-messages';
```

### Phase 3: Enhanced Error Logging in submit-form.ts

**Goal**: Log all non-200 responses and throw proper errors

**Task 3.1: Update submit-form.ts error handling**
```yaml
MODIFY src/lib/form-submission/submit-form.ts:

  ADD imports at top:
    import { logger } from '@/lib/logger';
    import { FileUploadError } from '@/lib/errors';

  REPLACE lines 14-27 with enhanced error handling:
    if (!response.ok) {
      const errorText = await response.text();

      // Log ALL non-200 responses with full context
      logger.error('HTTP error during form submission', {
        module: 'form-submission',
        context: {
          status: response.status,
          statusText: response.statusText,
          endpoint,
          method,
          errorBody: errorText.substring(0, 500) // First 500 chars
        },
        tags: ['form-submission', 'http-error', `status-${response.status}`]
      });

      // Parse JSON error response for other errors
      let errorMessage = 'Übermittlung fehlgeschlagen. Bitte versuchen Sie es erneut.';
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error) {
          errorMessage = errorJson.error;
        }
      } catch {
        // Use default error message if JSON parsing fails
      }

      throw new Error(errorMessage);
    }
```

### Integration Points
```yaml
TESTING:
  - Manual test: Upload 15MB original image
    - Should compress to ~2MB

  - Manual test: Submit featured appointment with large covers
    - If combined > 4MB, shows RHF error before submission
    - Error: "Cover-Bilder (4.8MB) überschreiten das Upload-Limit von 4MB"

  - Manual test: Force 413 in prod (upload 15MB combined)
    - User sees: "Die hochgeladenen Dateien sind zu groß..."
    - Server logs show error via logger (if reached)

NO DATABASE CHANGES: Schema unchanged
NO CONFIG CHANGES: No new environment variables
NO ROUTE CHANGES: Existing API routes work unchanged
```

## Validation Loop

### Level 1: Syntax & Style
```bash
npm run typecheck              # TypeScript type checking
npm run lint                   # ESLint

# Expected: No errors
# If errors: Fix TypeScript types, follow linting rules
```

### Level 2: Integration Test
```bash
# Start dev server
npm run dev

# Manual test flow:
# 1. Navigate to http://localhost:3000/appointments/new
# 2. Check "Featured" checkbox
# 3. Upload 15MB cover image
#    Expected: Image compresses to ~2MB
# 4. Crop image
#    Expected: Cropped image is ~1.5MB
# 5. Fill required fields and submit
#    Expected: Success (combined ~3.5MB < 4MB limit)

# Force validation error:
# 1. Upload 10MB cover image (compresses to ~3MB)
# 2. Upload another 10MB as cropped (or edit code to skip compression)
# 3. Submit form
#    Expected: RHF error "Cover-Bilder (4.8MB) überschreiten das Upload-Limit von 4MB"

# Test 413 error handling (production simulation):
# 1. Temporarily reduce MAX_COMBINED_COVER_IMAGE_SIZE to 1MB in appointment.ts
# 2. Upload normal covers (2MB + 1.5MB)
# 3. Submit bypassing validation somehow
#    Expected: 413 error caught, user sees "Die hochgeladenen Dateien sind zu groß..."
```

## Final Validation Checklist
- [ ] No linting errors: `npm run lint`
- [ ] No type errors: `npm run typecheck`
- [ ] Manual test: 15MB image compresses to ~2MB
- [ ] Manual test: Combined size validation shows German error
- [ ] Manual test: Successful submission with <4MB combined
- [ ] Logger properly logs 413 errors with context
- [ ] FileUploadError thrown for 413 (not generic Error)
- [ ] Code review: Only one compression implementation exists

---

## Anti-Patterns to Avoid
- ❌ Don't keep multiple compression implementations (consolidate!)
- ❌ Don't use quality > 0.75 (minimal quality benefit, large size penalty)
- ❌ Don't skip combined size validation (prevents 413 in prod)
- ❌ Don't throw generic Error in submit-form.ts (use FileUploadError)
- ❌ Don't use console.error for production errors (use logger)
- ❌ Don't use .refine() for combined validation (use .superRefine())
- ❌ Don't hardcode file size limits (use constants)
- ❌ Don't forget to import validationMessages for Zod errors
- ❌ Don't add console.log statements for client-side debugging

---

## Confidence Score: 9/10

**Why 9/10:**
- ✅ Clear consolidation path (3 compression → 1)
- ✅ Existing .superRefine() pattern in codebase
- ✅ FileUploadError already exists
- ✅ Logger pattern well-established
- ✅ Validation messages centralized
- ✅ No complex test setup required
- ⚠️ Need manual verification of compression in integration (-1)

**Success factors:**
1. Follows existing patterns (no new concepts)
2. All utilities and errors already exist
3. Clear validation path via Zod superRefine
4. Simple manual testing approach

**Risk mitigation:**
- Manual test compression with various image sizes (500KB, 5MB, 15MB)
- Verify compression actually reduces size (not increases)
- Test both dev and prod environments
- Monitor Vercel logs after deployment
