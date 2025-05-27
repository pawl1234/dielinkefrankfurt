import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api-auth';
import { listSentNewsletters } from '@/lib/newsletter-archive';
import { AppError, apiErrorResponse } from '@/lib/errors';

/**
 * Handler for fetching newsletter archives
 */
async function handleGetNewsletterArchives(request: NextRequest): Promise<NextResponse> {
  try {
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const search = searchParams.get('search') || '';

    // Validate parameters
    if (isNaN(page) || page < 1) {
      return AppError.validation('Page must be a positive number').toResponse();
    }

    if (isNaN(limit) || limit < 1 || limit > 50) {
      return AppError.validation('Limit must be between 1 and 50').toResponse();
    }

    // Fetch newsletter archives
    const result = await listSentNewsletters({
      page,
      limit,
      search
    });

    // Return the result
    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error, 'Failed to fetch newsletter archives');
  }
}

/**
 * GET handler for newsletter archives
 * Requires admin authentication
 */
export const GET = withAdminAuth(handleGetNewsletterArchives);