import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api-auth';
import { getSentNewsletter, deleteNewsletter } from '@/lib/newsletter-archive';
import { AppError, apiErrorResponse } from '@/lib/errors';
import { logger } from '@/lib/logger';

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

/**
 * Handler for deleting a newsletter
 */
async function handleDeleteNewsletter(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const { id } = params;

    if (!id) {
      return AppError.validation('Newsletter ID is required').toResponse();
    }

    // Check if newsletter exists
    const newsletter = await getSentNewsletter(id);

    if (!newsletter) {
      return AppError.notFound('Newsletter not found').toResponse();
    }

    // Delete the newsletter
    await deleteNewsletter(id);

    logger.info('Newsletter deleted successfully', {
      context: {
        id,
        subject: newsletter.subject
      }
    });

    // Return success
    return NextResponse.json({ success: true, message: 'Newsletter deleted successfully' });
  } catch (error) {
    return apiErrorResponse(error, 'Failed to delete newsletter');
  }
}

/**
 * DELETE handler for newsletter
 * Requires admin authentication
 */
export const DELETE = withAdminAuth(handleDeleteNewsletter);