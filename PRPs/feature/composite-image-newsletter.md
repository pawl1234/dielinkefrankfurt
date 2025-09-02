FEATURE: Dynamic Newsletter Header Image Composition

  A server-side image generation system that automatically creates composite header images by combining banner and logo images for email
   newsletters. This solves email client rendering inconsistencies where CSS positioning fails, particularly in Gmail.

  USER STORIES

  As a newsletter admin, I want:
  - Composite header images to be generated automatically when I save newsletter settings
  - Logo and banner positioning to be configurable through the admin interface
  - Images to be cached and only regenerated when source images or settings change
  - Email headers to render consistently across all email clients

  As a newsletter recipient, I want:
  - Header images to display correctly regardless of my email client
  - Images to load quickly and appear professional

  INTEGRATION POINTS

  - Newsletter Settings: Add new "Header Composition" section with configurable dimensions and positioning
  - Newsletter: Replace current (@src/emails/components/Header.tsx) CSS overlay approach with single composite image
  - File Storage: Leverage existing Vercel Blob Storage for composite image storage
  - Email Templates: Modify @src/emails/components/Header.tsx component to use composite image instead of overlays
  - Settings API: Extend @src/api/admin/newsletter/settings to handle composite settings and trigger generation

  DATA MODEL

  Newsletter Settings Extensions:
  interface NewsletterSettings {
    // ... existing fields

    // Header Composition Settings
    compositeWidth: number;          // default: 600
    compositeHeight: number;         // default: 200
    logoTopOffset: number;           // default: 20
    logoLeftOffset: number;          // default: 20
    logoHeight: number;              // default: 60

    // Generated composite metadata
    compositeImageUrl?: string;      // URL to generated composite
    compositeImageHash?: string;     // Hash of source images + settings
  }

  Cache Key Strategy:
  - Combine hashes of: banner image, logo image, and composition settings
  - Store composite URL and hash in newsletter settings
  - Regenerate only when cache key changes

  API REQUIREMENTS

  Settings API Enhancement:
  // POST /api/admin/newsletter/settings
  // Enhanced to trigger composite generation

  interface CompositeGenerationRequest {
    bannerUrl: string;
    logoUrl: string;
    compositeWidth: number;
    compositeHeight: number;
    logoTopOffset: number;
    logoLeftOffset: number;
    logoHeight: number;
  }

  interface CompositeGenerationResponse {
    compositeUrl: string;
    cacheKey: string;
  }

  New Internal Service:
  // src/lib/image-composition.ts
  class HeaderCompositionService {
    async generateCompositeHeader(options: CompositeGenerationRequest): Promise<string>
    async getCacheKey(options: CompositeGenerationRequest): Promise<string>
    private async fetchImageBuffer(url: string): Promise<Buffer>
    private async uploadToBlob(buffer: Buffer, filename: string): Promise<string>
  }

  UI/UX DESIGN

  Newsletter Settings Form Enhancement:

  Add new section after "Newsletter Design":

  // Header Composition Section
  <Divider sx={{ my: 3 }} />

  <Typography variant="h6" gutterBottom>
    Header Komposition
  </Typography>

  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
    Automatische Erstellung von zusammengesetzten Header-Bildern für bessere
    E-Mail-Client-Kompatibilität. Das Logo wird auf das Banner-Bild platziert
    und als einzelnes Bild gespeichert, um Darstellungsprobleme zu vermeiden.
  </Typography>

  // Dimension controls
  <Grid container spacing={2}>
    <Grid size={{ xs: 12, md: 6 }}>
      <TextField label="Bild Breite (px)" value={compositeWidth} ... />
      <TextField label="Bild Höhe (px)" value={compositeHeight} ... />
    </Grid>
    <Grid size={{ xs: 12, md: 6 }}>
      <TextField label="Logo Höhe (px)" value={logoHeight} ... />
    </Grid>
  </Grid>

  // Position controls
  <Grid container spacing={2}>
    <Grid size={{ xs: 12, md: 6 }}>
      <TextField label="Logo Abstand von oben (px)" value={logoTopOffset} ... />
    </Grid>
    <Grid size={{ xs: 12, md: 6 }}>
      <TextField label="Logo Abstand von links (px)" value={logoLeftOffset} ... />
    </Grid>
  </Grid>

  // Preview/Status
  {settings.compositeImageUrl && (
    <Box sx={{ mt: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
      <Typography variant="subtitle2" gutterBottom>Vorschau:</Typography>
      <img src={settings.compositeImageUrl} alt="Header Preview" style={{ maxWidth: '100%', height: 'auto' }} />
    </Box>
  )}

  SECURITY & PERMISSIONS

  - Admin Only: Composite generation only accessible to authenticated admin users
  - URL Validation: Validate banner/logo URLs before processing
  - File Size Limits: Limit input image sizes to prevent DoS
  - Blob Storage: Use existing Vercel Blob permissions and security
  - Error Handling: Graceful fallback to original CSS approach if generation fails

  EXAMPLES

  Settings Save Flow:
  1. Admin updates logo position from 20px to 30px in settings
  2. System calculates new cache key: hash(banner_url + logo_url + settings)
  3. Cache key differs from stored hash → regeneration needed
  4. Generate composite: fetch banner, fetch logo, create composite, upload to blob
  5. Update settings with new composite URL and cache key
  6. Admin sees immediate preview in settings

  Newsletter Send Flow:
  1. Newsletter generation reads settings.compositeImageUrl
  2. Header component renders single <img src={compositeImageUrl}> instead of overlay
  3. Email client displays composite image reliably

  DOCUMENTATION

  Technical Implementation:
  - Use Canvas API or image processing library (e.g., sharp) for server-side composition
  - Handle image fetching, resizing, and positioning
  - Optimize for performance with caching strategy

  Testing Requirements:
  - Unit tests for image composition logic
  - Integration tests for settings save → generation flow
  - Email client testing for rendering consistency

  OTHER CONSIDERATIONS

  Performance:
  - Cache composite images indefinitely until source changes
  - Generate images asynchronously after settings save
  - Consider image optimization (WebP/JPEG quality)

  Fallback Strategy:
  - If composite generation fails, fall back to original CSS overlay approach
  - Log errors for debugging
  - Display warning in admin interface

  Future Extensions:
  - Multiple image sizes for responsive design
  - Template-based positioning (corners, center, etc.)
  - Preview generation without saving settings