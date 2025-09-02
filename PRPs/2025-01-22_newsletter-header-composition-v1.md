# PRP: Newsletter Header Image Composition Feature

**Created:** 2025-01-22  
**Feature:** Dynamic Newsletter Header Image Composition  
**Version:** v1  
**Confidence Score:** 9/10

---

## Goal

Implement a server-side image generation system that automatically creates composite header images by combining banner and logo images for email newsletters. This solves email client rendering inconsistencies where CSS positioning fails, particularly in Gmail, by replacing the current CSS overlay approach with a single, reliably-rendered composite image.

## Why

- **Email Client Compatibility**: Gmail and other email clients inconsistently render CSS positioning, causing logos to appear below banners instead of overlaid
- **Professional Appearance**: Ensures consistent header presentation across all email clients
- **Performance Improvement**: Single image loads faster than separate banner + logo with CSS positioning
- **Admin Efficiency**: Automatic generation with configurable positioning eliminates manual image creation
- **Existing Infrastructure**: Leverages current Vercel Blob Storage and newsletter settings system

## What

A server-side service that generates composite header images when newsletter settings are saved, with configurable dimensions and logo positioning. The system includes hash-based caching to regenerate images only when source images or settings change.

### Success Criteria

- [ ] Admin can configure header dimensions and logo positioning in newsletter settings
- [ ] Composite images are automatically generated and cached when settings are saved
- [ ] Newsletter emails render consistently across email clients (Gmail, Outlook, Apple Mail)
- [ ] System handles image processing errors gracefully with fallback to original CSS approach
- [ ] Generated images are optimized for email delivery (appropriate file size and format)

## All Needed Context

### Documentation & References

```yaml
# MUST READ - Include these in your context window

- url: https://sharp.pixelplumbing.com/api-composite/
  why: Sharp composite API documentation for overlaying logos on banners
  critical: Uses composite() method with positioning and blend modes

- url: https://vercel.com/docs/vercel-blob/server-upload
  why: Vercel Blob Storage server upload patterns for generated images
  critical: 4.5MB limit, Buffer handling, environment variables

- url: https://www.digitalocean.com/community/tutorials/how-to-process-images-in-node-js-with-sharp
  why: Comprehensive Sharp tutorial including image composition
  critical: Image loading, resizing, and buffer management

- url: https://christoshrousis.com/08-using-node-sharp-to-stack-and-overlay-images-over-each-other-to-create-fun-composites/
  why: Practical Sharp overlay examples with positioning
  critical: Advanced composite techniques and positioning control

- file: src/app/api/admin/newsletter/settings/route.ts
  why: Current newsletter settings API pattern to extend
  critical: Uses withAdminAuth wrapper, structured error handling

- file: src/lib/file-upload.ts
  why: Existing file upload and blob storage patterns
  critical: Error handling, retry logic, file validation

- file: src/emails/components/Header.tsx
  why: Current header component using CSS overlay approach
  critical: Current dimensions and positioning values to maintain

- file: src/types/newsletter-types.ts
  why: Newsletter settings interface to extend
  critical: Current settings structure and type safety

- file: src/tests/api/newsletter/settings.test.ts
  why: Testing patterns for newsletter settings API
  critical: Mock structure, validation testing, error scenarios

- docfile: CLAUDE.md
  why: Project conventions, testing requirements, TypeScript usage
  critical: No any types, comprehensive testing, JSDoc requirements
```

### Current Codebase Tree

```bash
src/
├── app/api/admin/newsletter/settings/route.ts    # Newsletter settings API
├── components/upload/CoverImageUpload.tsx        # Image upload patterns
├── emails/components/Header.tsx                  # Current header component
├── lib/
│   ├── file-upload.ts                           # Blob storage patterns
│   ├── errors.ts                                # Error handling system
│   └── newsletter-service.ts                    # Newsletter business logic
├── types/
│   ├── newsletter-types.ts                      # Newsletter interfaces
│   ├── api-types.ts                             # API response types
│   └── component-types.ts                       # Component prop types
└── tests/
    ├── api/newsletter/settings.test.ts          # Settings API tests
    ├── lib/file-upload.test.ts                  # File upload tests
    └── factories/                               # Test data factories
```

### Desired Codebase Tree with New Files

```bash
src/
├── lib/
│   └── image-composition.ts                     # NEW: Core image composition service
├── app/admin/newsletter/settings/page.tsx       # MODIFY: Add composition settings UI
├── app/api/admin/newsletter/settings/route.ts   # MODIFY: Add composition trigger
├── emails/components/Header.tsx                  # MODIFY: Use composite image
├── types/newsletter-types.ts                     # MODIFY: Add composition fields
└── tests/
    ├── lib/image-composition.test.ts            # NEW: Image composition tests
    └── api/newsletter/settings-composition.test.ts # NEW: Extended API tests
```

### Known Gotchas & Library Quirks

```typescript
// CRITICAL: Sharp requires Buffer handling for Vercel Blob uploads
const buffer = await sharp(bannerBuffer)
  .composite([{ input: logoBuffer, top: 20, left: 20 }])
  .jpeg({ quality: 90 })
  .toBuffer(); // Returns Buffer, not file path

// CRITICAL: Vercel Blob requires proper content-type and pathname
await put('newsletter-headers/composite-123.jpg', buffer, {
  access: 'public',
  contentType: 'image/jpeg'
});

// CRITICAL: Image fetching requires proper error handling
// URLs might be relative, unreachable, or return non-image data
const response = await fetch(imageUrl);
if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`);
const arrayBuffer = await response.arrayBuffer();
const buffer = Buffer.from(arrayBuffer);

// CRITICAL: Newsletter settings validation follows existing patterns
// Empty objects rejected, all fields optional, type safety enforced
if (!data || Object.keys(data).length === 0) {
  return NextResponse.json({ error: 'No data provided' }, { status: 400 });
}

// CRITICAL: Error handling uses AppError system with proper types
throw new AppError('Invalid image URL', ErrorType.VALIDATION, 400, error, {
  imageUrl, step: 'fetch'
});

// CRITICAL: Hash generation for cache keys requires stable stringify
import crypto from 'crypto';
const cacheKey = crypto.createHash('sha256')
  .update(JSON.stringify({ bannerUrl, logoUrl, ...settings }, null, 0))
  .digest('hex');

// CRITICAL: Material UI v7 Grid uses size prop, not xs/md props
<Grid size={{ xs: 12, md: 6 }}>
  <TextField label="Composite Width" />
</Grid>

// CRITICAL: React Hook Form validation only shown after submission
const [formSubmitted, setFormSubmitted] = useState(false);
{formSubmitted && errors.compositeWidth && (
  <FormHelperText error>{errors.compositeWidth.message}</FormHelperText>
)}

// CRITICAL: Tests must mock external dependencies, not internal lib modules
jest.mock('@vercel/blob', () => ({
  put: jest.fn(),
}));
jest.mock('sharp', () => {
  const mockSharp = {
    composite: jest.fn().mockReturnThis(),
    jpeg: jest.fn().mockReturnThis(),
    toBuffer: jest.fn(),
  };
  return jest.fn(() => mockSharp);
});
```

## Implementation Blueprint

### Data Models and Structure

```typescript
// MODIFY: src/types/newsletter-types.ts
export interface NewsletterSettings {
  // ... existing fields
  headerLogo: string;
  headerBanner: string;
  
  // NEW: Header Composition Settings
  compositeWidth?: number;          // default: 600
  compositeHeight?: number;         // default: 200
  logoTopOffset?: number;           // default: 20
  logoLeftOffset?: number;          // default: 20
  logoHeight?: number;              // default: 60
  
  // NEW: Generated composite metadata
  compositeImageUrl?: string;       // URL to generated composite
  compositeImageHash?: string;      // Hash of source images + settings
}

// NEW: src/types/api-types.ts additions
export interface CompositeGenerationRequest {
  bannerUrl: string;
  logoUrl: string;
  compositeWidth: number;
  compositeHeight: number;
  logoTopOffset: number;
  logoLeftOffset: number;
  logoHeight: number;
}

export interface CompositeGenerationResponse {
  compositeUrl: string;
  cacheKey: string;
}

export interface ImageCompositionError extends AppError {
  imageUrl?: string;
  step?: 'fetch' | 'process' | 'upload';
}
```

### List of Tasks to Complete the PRP

```yaml
Task 1: Install Dependencies
MODIFY package.json:
  - ADD sharp: "^0.34.3" to dependencies
  - RUN npm install sharp
  - VERIFY Sharp installation with npm list sharp

Task 2: Create Core Image Composition Service
CREATE src/lib/image-composition.ts:
  - IMPLEMENT HeaderCompositionService class
  - FOLLOW pattern from: src/lib/file-upload.ts
  - INCLUDE comprehensive error handling and logging
  - USE Sharp for image processing and Vercel Blob for storage

Task 3: Extend Database Schema
MODIFY prisma/schema.prisma:
  - FIND Newsletter model
  - ADD composite image fields to existing Newsletter model
  - PRESERVE all existing fields and relationships
  - RUN npx prisma db push to apply changes

Task 4: Extend TypeScript Interfaces
MODIFY src/types/newsletter-types.ts:
  - FIND NewsletterSettings interface
  - ADD composite image configuration fields
  - MAINTAIN type safety with proper optional markers
  - EXPORT new interfaces for API types

Task 5: Enhance Newsletter Settings API
MODIFY src/app/api/admin/newsletter/settings/route.ts:
  - FIND PUT handler function
  - INTEGRATE image composition service after validation
  - PRESERVE existing authentication and error handling patterns
  - ADD composite generation with hash-based caching

Task 6: Extend Newsletter Settings UI
MODIFY src/app/admin/newsletter/settings/page.tsx:
  - FIND Newsletter Design section
  - ADD Header Composition section after existing fields
  - FOLLOW MUI v7 Grid patterns from existing form
  - INCLUDE preview functionality for generated composite

Task 7: Update Email Header Component
MODIFY src/emails/components/Header.tsx:
  - FIND current CSS overlay implementation
  - ADD conditional rendering for composite vs overlay approach
  - PRESERVE existing behavior as fallback
  - MAINTAIN email client compatibility

Task 8: Create Comprehensive Tests
CREATE src/tests/lib/image-composition.test.ts:
  - FOLLOW pattern from: src/tests/lib/file-upload.test.ts
  - TEST image fetching, processing, and upload scenarios
  - MOCK Sharp and Vercel Blob dependencies
  - INCLUDE error handling and edge cases

CREATE src/tests/api/newsletter/settings-composition.test.ts:
  - EXTEND pattern from: src/tests/api/newsletter/settings.test.ts
  - TEST composite generation integration with settings API
  - VERIFY hash-based caching behavior
  - INCLUDE validation and error scenarios

Task 9: Database Migration and Setup
RUN database operations:
  - EXECUTE npx prisma db push
  - VERIFY schema changes with npx prisma studio
  - TEST database operations with existing data
  - ENSURE backward compatibility
```

### Task Implementation Details

```typescript
// Task 2: Core Service Implementation
export class HeaderCompositionService {
  /**
   * Generates composite header image by overlaying logo on banner.
   * @param options - Composition configuration
   * @returns URL of generated composite image
   */
  async generateCompositeHeader(options: CompositeGenerationRequest): Promise<string> {
    // PATTERN: Validation first (see src/lib/validators/)
    this.validateCompositionRequest(options);
    
    // PATTERN: Cache check using hash
    const cacheKey = await this.getCacheKey(options);
    const existingUrl = await this.checkCache(cacheKey);
    if (existingUrl) return existingUrl;
    
    try {
      // CRITICAL: Fetch images as buffers for Sharp processing
      const [bannerBuffer, logoBuffer] = await Promise.all([
        this.fetchImageBuffer(options.bannerUrl),
        this.fetchImageBuffer(options.logoUrl)
      ]);
      
      // CRITICAL: Sharp composite operation
      const compositeBuffer = await sharp(bannerBuffer)
        .resize(options.compositeWidth, options.compositeHeight, { fit: 'cover' })
        .composite([{
          input: await sharp(logoBuffer)
            .resize({ height: options.logoHeight, withoutEnlargement: true })
            .toBuffer(),
          top: options.logoTopOffset,
          left: options.logoLeftOffset
        }])
        .jpeg({ quality: 90, progressive: true })
        .toBuffer();
        
      // PATTERN: Upload to blob storage (see src/lib/file-upload.ts)
      const filename = `newsletter-headers/composite-${cacheKey.slice(0, 8)}.jpg`;
      const compositeUrl = await this.uploadToBlob(compositeBuffer, filename);
      
      // PATTERN: Update cache
      await this.updateCache(cacheKey, compositeUrl);
      
      return compositeUrl;
    } catch (error) {
      // PATTERN: Structured error handling (see src/lib/errors.ts)
      throw new AppError(
        'Failed to generate composite header',
        ErrorType.FILE_UPLOAD,
        500,
        error as Error,
        { options, cacheKey }
      );
    }
  }
  
  /**
   * Generates stable cache key from composition options.
   */
  private async getCacheKey(options: CompositeGenerationRequest): Promise<string> {
    // CRITICAL: Include image content hashes for cache invalidation
    const [bannerHash, logoHash] = await Promise.all([
      this.getImageHash(options.bannerUrl),
      this.getImageHash(options.logoUrl)
    ]);
    
    const configHash = crypto.createHash('sha256')
      .update(JSON.stringify({
        bannerHash,
        logoHash,
        width: options.compositeWidth,
        height: options.compositeHeight,
        logoTop: options.logoTopOffset,
        logoLeft: options.logoLeftOffset,
        logoHeight: options.logoHeight
      }, null, 0))
      .digest('hex');
      
    return configHash;
  }
}

// Task 5: API Integration
export const PUT: ApiHandler<SimpleRouteContext> = withAdminAuth(async (request: NextRequest) => {
  try {
    const data = await request.json();
    
    // PATTERN: Existing validation logic
    if (!data || Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No data provided for update' }, { status: 400 });
    }
    
    // NEW: Composite generation if header images provided
    if (data.headerBanner && data.headerLogo) {
      const compositionService = new HeaderCompositionService();
      
      const compositeOptions: CompositeGenerationRequest = {
        bannerUrl: data.headerBanner,
        logoUrl: data.headerLogo,
        compositeWidth: data.compositeWidth || 600,
        compositeHeight: data.compositeHeight || 200,
        logoTopOffset: data.logoTopOffset || 20,
        logoLeftOffset: data.logoLeftOffset || 20,
        logoHeight: data.logoHeight || 60,
      };
      
      try {
        const compositeUrl = await compositionService.generateCompositeHeader(compositeOptions);
        const cacheKey = await compositionService.getCacheKey(compositeOptions);
        
        data.compositeImageUrl = compositeUrl;
        data.compositeImageHash = cacheKey;
        
        console.log('Generated composite header', { compositeUrl, cacheKey });
      } catch (error) {
        // PATTERN: Non-blocking error - continue with original approach
        console.error('Composite generation failed, using fallback', error);
        data.compositeImageUrl = null;
        data.compositeImageHash = null;
      }
    }
    
    // PATTERN: Existing database update logic
    const updatedSettings = await updateNewsletterSettings(data);
    return NextResponse.json(updatedSettings);
    
  } catch (error) {
    return apiErrorResponse(error, 'Failed to update newsletter settings');
  }
});
```

### Integration Points

```yaml
DATABASE:
  - setup: Extend Newsletter model in prisma/schema.prisma
  - migration: "npx prisma db push --accept-data-loss"
  - fields: "compositeImageUrl String?, compositeImageHash String?, compositeWidth Int?, compositeHeight Int?, logoTopOffset Int?, logoLeftOffset Int?, logoHeight Int?"

CONFIG:
  - add to: .env.local (already exists)
  - required: "BLOB_READ_WRITE_TOKEN (already configured)"
  - pattern: "Uses existing Vercel Blob configuration"

ROUTES:
  - modify: src/app/api/admin/newsletter/settings/route.ts
  - pattern: "Extend existing PUT handler with composition logic"

COMPONENTS:
  - modify: src/app/admin/newsletter/settings/page.tsx
  - pattern: "Add Header Composition section with MUI v7 Grid"
  - modify: src/emails/components/Header.tsx
  - pattern: "Conditional composite vs overlay rendering"

SERVICES:
  - create: src/lib/image-composition.ts
  - pattern: "Follow file-upload.ts service patterns"
```

## Validation Loop

### Level 1: Syntax & Style

```bash
# Install Sharp dependency first
npm install sharp@^0.34.3

# Run these FIRST - fix any errors before proceeding
npm run lint                    # ESLint with auto-fix
npm run typecheck              # TypeScript type checking

# Expected: No errors. Sharp should install without native compilation issues.
# If errors: Check Node.js version compatibility with Sharp
```

### Level 2: Unit Tests

```typescript
// CREATE src/tests/lib/image-composition.test.ts
describe('HeaderCompositionService', () => {
  let service: HeaderCompositionService;
  
  beforeEach(() => {
    service = new HeaderCompositionService();
    jest.clearAllMocks();
  });

  it('should generate composite header successfully', async () => {
    // Mock successful image fetching and processing
    const mockBuffer = Buffer.from('mock-composite-image');
    (sharp as jest.Mock).mockImplementation(() => ({
      resize: jest.fn().mockReturnThis(),
      composite: jest.fn().mockReturnThis(),
      jpeg: jest.fn().mockReturnThis(),
      toBuffer: jest.fn().mockResolvedValue(mockBuffer),
    }));
    
    const mockBlobUrl = 'https://blob.vercel-storage.com/composite-123.jpg';
    (put as jest.Mock).mockResolvedValue({ url: mockBlobUrl });
    
    const options: CompositeGenerationRequest = {
      bannerUrl: 'https://example.com/banner.jpg',
      logoUrl: 'https://example.com/logo.png',
      compositeWidth: 600,
      compositeHeight: 200,
      logoTopOffset: 20,
      logoLeftOffset: 20,
      logoHeight: 60,
    };
    
    const result = await service.generateCompositeHeader(options);
    expect(result).toBe(mockBlobUrl);
    expect(sharp).toHaveBeenCalled();
    expect(put).toHaveBeenCalled();
  });

  it('should handle image fetch failures gracefully', async () => {
    // Mock network failure
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
    
    const options: CompositeGenerationRequest = {
      bannerUrl: 'https://invalid-url.com/banner.jpg',
      logoUrl: 'https://example.com/logo.png',
      compositeWidth: 600,
      compositeHeight: 200,
      logoTopOffset: 20,
      logoLeftOffset: 20,
      logoHeight: 60,
    };
    
    await expect(service.generateCompositeHeader(options)).rejects.toThrow(AppError);
  });

  it('should use cached composite when hash matches', async () => {
    // Mock cache hit scenario
    const cachedUrl = 'https://blob.vercel-storage.com/cached-composite.jpg';
    jest.spyOn(service, 'checkCache').mockResolvedValue(cachedUrl);
    
    const options: CompositeGenerationRequest = {
      bannerUrl: 'https://example.com/banner.jpg',
      logoUrl: 'https://example.com/logo.png',
      compositeWidth: 600,
      compositeHeight: 200,
      logoTopOffset: 20,
      logoLeftOffset: 20,
      logoHeight: 60,
    };
    
    const result = await service.generateCompositeHeader(options);
    expect(result).toBe(cachedUrl);
    expect(sharp).not.toHaveBeenCalled(); // Should skip processing
  });
});
```

```bash
# Run and iterate until passing:
npm test -- src/tests/lib/image-composition.test.ts
# If failing: Read error, check Sharp mocking, fix code, re-run
```

### Level 3: Integration Test

```bash
# Test the enhanced settings API
curl -X PUT http://localhost:3000/api/admin/newsletter/settings \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=test-admin-session" \
  -d '{
    "headerBanner": "https://example.com/banner.jpg",
    "headerLogo": "https://example.com/logo.png",
    "compositeWidth": 600,
    "compositeHeight": 200,
    "logoTopOffset": 20,
    "logoLeftOffset": 20,
    "logoHeight": 60
  }'

# Expected: {
#   "headerBanner": "https://example.com/banner.jpg",
#   "headerLogo": "https://example.com/logo.png",
#   "compositeImageUrl": "https://blob.vercel-storage.com/newsletter-headers/composite-abc123.jpg",
#   "compositeImageHash": "sha256hash...",
#   ...
# }

# Test newsletter settings UI
# 1. Navigate to http://localhost:3000/admin/newsletter/settings
# 2. Fill in banner and logo URLs
# 3. Adjust composition settings
# 4. Save settings
# 5. Verify composite image preview appears
# 6. Check that composite URL is generated

# If error: Check browser network tab, server logs, database connection
```

## Final Validation Checklist

- [ ] Sharp installed successfully: `npm list sharp`
- [ ] All tests pass: `npm test`
- [ ] No linting errors: `npm run lint` 
- [ ] No type errors: `npm run typecheck`
- [ ] Database schema updated: `npx prisma db push`
- [ ] Manual test successful: Admin UI generates composite
- [ ] Email header renders composite image correctly
- [ ] Error cases handled gracefully (network failures, invalid URLs)
- [ ] Cache invalidation works when images/settings change
- [ ] Performance is acceptable for typical image sizes

---

## Anti-Patterns to Avoid

- ❌ Don't use Canvas API instead of Sharp - Sharp is faster and more suitable for server-side processing
- ❌ Don't store composite images in the filesystem - use Vercel Blob Storage like existing patterns
- ❌ Don't block settings save if composite generation fails - gracefully fallback to CSS overlay
- ❌ Don't regenerate composites unnecessarily - use hash-based caching  
- ❌ Don't skip image validation - validate URLs and image formats before processing
- ❌ Don't hardcode image dimensions - make them configurable in settings
- ❌ Don't ignore Sharp Buffer handling - Sharp works with Buffers, not file paths
- ❌ Don't mock internal services in tests - only mock Sharp and Vercel Blob
- ❌ Don't forget error context - include helpful debugging information in errors
- ❌ Don't skip fallback behavior - ensure emails still work if composite generation fails

---

**Implementation Confidence:** 9/10  
**One-Pass Success Probability:** High - comprehensive patterns identified, existing infrastructure leveraged, proper validation gates established.