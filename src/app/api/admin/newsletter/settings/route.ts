import { NextRequest, NextResponse } from 'next/server';
import { CompositeGenerationRequest } from '@/types/api-types';
import { apiErrorResponse } from '@/lib/errors';
import { logger } from '@/lib/logger';
import {
  getNewsletterSettings,
  updateNewsletterSettings
} from '@/lib/newsletter';
import { HeaderCompositionService } from '@/lib/email';
import { updateNewsletterSettingsSchema, zodToValidationResult } from '@/lib/validation';
import { NewsletterSettings } from '@/types/newsletter-types';

/**
 * GET /api/admin/newsletter/settings
 *
 * Admin endpoint for retrieving newsletter settings.
 * Returns settings object from database or defaults.
 * Authentication handled by middleware.
 */
export async function GET() {
  try {
    logger.debug('Fetching newsletter settings', {
      module: 'api',
      context: {
        endpoint: '/api/admin/newsletter/settings',
        method: 'GET'
      }
    });

    const settings = await getNewsletterSettings();

    logger.info('Newsletter settings retrieved successfully', {
      module: 'api',
      context: {
        endpoint: '/api/admin/newsletter/settings',
        method: 'GET',
        hasSettings: !!settings,
        settingsId: settings.id
      }
    });

    return NextResponse.json(settings);
  } catch (error) {
    logger.error(error as Error, {
      module: 'api',
      context: {
        endpoint: '/api/admin/newsletter/settings',
        method: 'GET',
        operation: 'getNewsletterSettings'
      }
    });

    return apiErrorResponse(error, 'Failed to fetch newsletter settings');
  }
}

/**
 * PUT /api/admin/newsletter/settings
 * 
 * Admin endpoint for updating newsletter settings.
 * Expects JSON object with newsletter settings.
 * Authentication handled by middleware.
 */
export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();

    logger.debug('Updating newsletter settings', {
      module: 'api',
      context: {
        endpoint: '/api/admin/newsletter/settings',
        method: 'PUT',
        fieldsToUpdate: Object.keys(data)
      }
    });

    // Validate with Zod schema
    const validation = await zodToValidationResult(updateNewsletterSettingsSchema, data);
    if (!validation.isValid) {
      logger.warn('Validation failed for newsletter settings update', {
        module: 'api',
        context: {
          endpoint: '/api/admin/newsletter/settings',
          method: 'PUT',
          errors: validation.errors
        }
      });

      return NextResponse.json(
        { error: 'Validierungsfehler', errors: validation.errors },
        { status: 400 }
      );
    }

    // Use validated data
    const validatedData = validation.data!;

    // Generate composite header image if both banner and logo are provided
    if (validatedData.headerBanner && validatedData.headerLogo) {
      logger.debug('Attempting to generate composite header image', {
        module: 'api',
        context: {
          endpoint: '/api/admin/newsletter/settings',
          bannerUrl: validatedData.headerBanner,
          logoUrl: validatedData.headerLogo,
          hasCompositionSettings: !!(validatedData.compositeWidth || validatedData.compositeHeight)
        }
      });

      const compositionService = new HeaderCompositionService();

      const compositeOptions: CompositeGenerationRequest = {
        bannerUrl: validatedData.headerBanner!,
        logoUrl: validatedData.headerLogo!,
        compositeWidth: validatedData.compositeWidth || 600,
        compositeHeight: validatedData.compositeHeight || 200,
        logoTopOffset: validatedData.logoTopOffset || 20,
        logoLeftOffset: validatedData.logoLeftOffset || 20,
        logoHeight: validatedData.logoHeight || 60,
      };
      
      try {
        const compositeUrl = await compositionService.generateCompositeHeader(compositeOptions);
        const cacheKey = await compositionService.getPublicCacheKey(compositeOptions);

        // Add the generated composite data to the settings
        validatedData.compositeImageUrl = compositeUrl;
        validatedData.compositeImageHash = cacheKey;

        logger.info('Successfully generated composite header image', {
          module: 'api',
          context: {
            endpoint: '/api/admin/newsletter/settings',
            compositeUrl,
            cacheKey: cacheKey.slice(0, 16) + '...',
            fullCacheKey: cacheKey,
            cacheCleared: true
          }
        });
      } catch (error) {
        // Non-blocking error - continue with original approach
        // The email header component will fallback to CSS overlay
        logger.error(error as Error, {
          module: 'api',
          context: {
            endpoint: '/api/admin/newsletter/settings',
            operation: 'generateCompositeHeader',
            fallbackApplied: true
          }
        });

        // Clear any existing composite data since generation failed
        validatedData.compositeImageUrl = null;
        validatedData.compositeImageHash = null;

        logger.warn('Composite generation failed, using CSS overlay fallback', {
          module: 'api',
          context: {
            endpoint: '/api/admin/newsletter/settings',
            error: (error as Error).message
          }
        });
      }
    } else if (validatedData.headerBanner || validatedData.headerLogo) {
      // If only one image is provided, clear composite data
      logger.debug('Clearing composite data due to incomplete image set', {
        module: 'api',
        context: {
          endpoint: '/api/admin/newsletter/settings',
          hasBanner: !!validatedData.headerBanner,
          hasLogo: !!validatedData.headerLogo
        }
      });

      validatedData.compositeImageUrl = null;
      validatedData.compositeImageHash = null;
    }

    const updatedSettings = await updateNewsletterSettings(validatedData as Partial<NewsletterSettings>);

    logger.info('Newsletter settings updated successfully', {
      module: 'api',
      context: {
        endpoint: '/api/admin/newsletter/settings',
        method: 'PUT',
        settingsId: updatedSettings.id,
        updatedFields: Object.keys(validatedData),
        hasCompositeImage: !!updatedSettings.compositeImageUrl
      }
    });

    return NextResponse.json(updatedSettings);
  } catch (error) {
    logger.error(error as Error, {
      module: 'api',
      context: { 
        endpoint: '/api/admin/newsletter/settings',
        method: 'PUT',
        operation: 'updateNewsletterSettings'
      }
    });
    
    return apiErrorResponse(error, 'Failed to update newsletter settings');
  }
}

/**
 * POST /api/admin/newsletter/settings
 * 
 * Deprecated: Use PUT instead.
 * Maintained for backwards compatibility with frontend.
 * Authentication handled by middleware.
 */
export async function POST(request: NextRequest) {
  logger.warn('Deprecated POST endpoint used for newsletter settings', {
    module: 'api',
    context: { 
      endpoint: '/api/admin/newsletter/settings',
      method: 'POST',
      recommendation: 'Use PUT instead'
    }
  });
  
  // Delegate to PUT handler for backwards compatibility
  return PUT(request);
}