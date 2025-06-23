import { NextRequest, NextResponse } from 'next/server';
import { ApiHandler, SimpleRouteContext } from '@/types/api-types';
import { withAdminAuth } from '@/lib/api-auth';
import { apiErrorResponse } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { 
  getNewsletterSettings, 
  updateNewsletterSettings 
} from '@/lib/newsletter-service';

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

    const updatedSettings = await updateNewsletterSettings(data);
    
    logger.info('Newsletter settings updated successfully', {
      module: 'api',
      context: { 
        endpoint: '/api/admin/newsletter/settings',
        method: 'PUT',
        settingsId: updatedSettings.id,
        updatedFields: Object.keys(data)
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