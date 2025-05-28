import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api-auth';
import { AppError, apiErrorResponse } from '@/lib/errors';
import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';

/**
 * Handler for fetching a single newsletter
 */
async function handleGetNewsletter(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;

    if (!id) {
      return AppError.validation('Newsletter ID is required').toResponse();
    }

    // Fetch the newsletter from unified table
    const newsletter = await prisma.newsletterItem.findUnique({
      where: { id },
    });

    if (!newsletter) {
      return AppError.notFound('Newsletter not found').toResponse();
    }

    // Return the newsletter
    return NextResponse.json({
      id: newsletter.id,
      subject: newsletter.subject,
      sentAt: newsletter.sentAt?.toISOString(),
      createdAt: newsletter.createdAt.toISOString(),
      status: newsletter.status,
      introductionText: newsletter.introductionText,
      content: newsletter.content,
      recipientCount: newsletter.recipientCount,
      settings: newsletter.settings,
    });
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
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;

    if (!id) {
      return AppError.validation('Newsletter ID is required').toResponse();
    }

    // Check if newsletter exists
    const newsletter = await prisma.newsletterItem.findUnique({
      where: { id }
    });

    if (!newsletter) {
      return AppError.notFound('Newsletter not found').toResponse();
    }

    // Delete the newsletter
    await prisma.newsletterItem.delete({
      where: { id }
    });

    logger.info('Newsletter deleted successfully', {
      context: {
        id,
        subject: newsletter.subject,
        status: newsletter.status
      }
    });

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