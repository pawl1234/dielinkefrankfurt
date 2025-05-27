import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api-auth';
import { getSentNewsletter } from '@/lib/newsletter-archive';
import { AppError, apiErrorResponse } from '@/lib/errors';

/**
 * Handler for fetching a single newsletter
 */
async function handleGetNewsletter(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const { id } = params;

    if (!id) {
      return AppError.validation('Newsletter ID is required').toResponse();
    }

    // Fetch the newsletter
    const newsletter = await getSentNewsletter(id);

    if (!newsletter) {
      return AppError.notFound('Newsletter not found').toResponse();
    }

    // Return the newsletter
    return NextResponse.json(newsletter);
  } catch (error) {
    return apiErrorResponse(error, 'Failed to fetch newsletter');
  }
}

/**
 * GET handler for single newsletter
 * Requires admin authentication
 */
export const GET = withAdminAuth(handleGetNewsletter);