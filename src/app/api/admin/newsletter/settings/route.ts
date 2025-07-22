import { NextRequest, NextResponse } from 'next/server';
import { ApiHandler, SimpleRouteContext, CompositeGenerationRequest } from '@/types/api-types';
import { withAdminAuth } from '@/lib/api-auth';
import { apiErrorResponse } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { 
  getNewsletterSettings, 
  updateNewsletterSettings,
  clearNewsletterSettingsCache
} from '@/lib/newsletter-service';
import { HeaderCompositionService } from '@/lib/image-composition';

/**
 * GET /api/admin/newsletter/settings
 * 
 * Admin endpoint for retrieving newsletter settings.
 * Returns settings object from database or defaults.
 * Authentication required.
 */
export const GET: ApiHandler<SimpleRouteContext> = withAdminAuth(async () => {
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
});

/**
 * PUT /api/admin/newsletter/settings
 * 
 * Admin endpoint for updating newsletter settings.
 * Expects JSON object with newsletter settings.
 * Authentication required.
 */
export const PUT: ApiHandler<SimpleRouteContext> = withAdminAuth(async (request: NextRequest) => {
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

    // Validate that we have data to update
    if (!data || Object.keys(data).length === 0) {
      logger.warn('Empty update request for newsletter settings', {
        module: 'api',
        context: { 
          endpoint: '/api/admin/newsletter/settings',
          method: 'PUT'
        }
      });
      
      return NextResponse.json(
        { error: 'No data provided for update' },
        { status: 400 }
      );
    }

    // Generate composite header image if both banner and logo are provided
    if (data.headerBanner && data.headerLogo) {
      logger.debug('Attempting to generate composite header image', {
        module: 'api',
        context: {
          endpoint: '/api/admin/newsletter/settings',
          bannerUrl: data.headerBanner,
          logoUrl: data.headerLogo,
          hasCompositionSettings: !!(data.compositeWidth || data.compositeHeight)
        }
      });

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
        const cacheKey = await compositionService.getPublicCacheKey(compositeOptions);
        
        // Add the generated composite data to the settings
        data.compositeImageUrl = compositeUrl;
        data.compositeImageHash = cacheKey;
        
        // Immediately clear cache to ensure fresh settings are loaded
        clearNewsletterSettingsCache();
        
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
        data.compositeImageUrl = null;
        data.compositeImageHash = null;
        
        logger.warn('Composite generation failed, using CSS overlay fallback', {
          module: 'api',
          context: {
            endpoint: '/api/admin/newsletter/settings',
            error: (error as Error).message
          }
        });
      }
    } else if (data.headerBanner || data.headerLogo) {
      // If only one image is provided, clear composite data
      logger.debug('Clearing composite data due to incomplete image set', {
        module: 'api',
        context: {
          endpoint: '/api/admin/newsletter/settings',
          hasBanner: !!data.headerBanner,
          hasLogo: !!data.headerLogo
        }
      });
      
      data.compositeImageUrl = null;
      data.compositeImageHash = null;
    }

    const updatedSettings = await updateNewsletterSettings(data);
    
    // Clear cache to ensure fresh settings are loaded next time
    clearNewsletterSettingsCache();
    
    logger.info('Newsletter settings updated successfully', {
      module: 'api',
      context: { 
        endpoint: '/api/admin/newsletter/settings',
        method: 'PUT',
        settingsId: updatedSettings.id,
        updatedFields: Object.keys(data),
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
});

/**
 * POST /api/admin/newsletter/settings
 * 
 * Deprecated: Use PUT instead.
 * Maintained for backwards compatibility with frontend.
 * Authentication required.
 */
export const POST: ApiHandler<SimpleRouteContext> = withAdminAuth(async (request: NextRequest) => {
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
});