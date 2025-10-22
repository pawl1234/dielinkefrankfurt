import { NextRequest, NextResponse } from 'next/server';
import { AppError, apiErrorResponse } from '@/lib/errors';
import { getNewslettersWithPagination } from '@/lib/db/newsletter-operations';

/**
 * Handler for fetching newsletter archives (unified table)
 */
async function handleGetNewsletterArchives(request: NextRequest): Promise<NextResponse> {
  try {
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || ''; // filter by status

    // Validate parameters
    if (isNaN(page) || page < 1) {
      return AppError.validation('Page must be a positive number').toResponse();
    }

    if (isNaN(limit) || limit < 1 || limit > 50) {
      return AppError.validation('Limit must be between 1 and 50').toResponse();
    }

    // Fetch newsletters using database operation
    const { items: newsletters, total } = await getNewslettersWithPagination(
      { search, status },
      { page, limit }
    );

    // Format items for the frontend
    const items = newsletters.map(newsletter => ({
      id: newsletter.id,
      subject: newsletter.subject,
      sentAt: newsletter.sentAt?.toISOString(),
      createdAt: newsletter.createdAt.toISOString(),
      status: newsletter.status,
      type: newsletter.status === 'draft' ? 'draft' as const : 'sent' as const,
      introductionText: newsletter.introductionText,
      recipientCount: newsletter.recipientCount || undefined,
    }));

    return NextResponse.json({
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    return apiErrorResponse(error, 'Failed to fetch newsletter archives');
  }
}

/**
 * GET handler for newsletter archives
 * Requires admin authentication
 */
export const GET = handleGetNewsletterArchives;