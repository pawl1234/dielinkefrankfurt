import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api-auth';
import { AppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';

/**
 * Interface for newsletter status response
 */
interface NewsletterStatusResponse {
  success: boolean;
  newsletterId: string;
  status: string;
  recipientCount: number;
  totalSent: number;
  totalFailed: number;
  completedChunks: number;
  totalChunks: number;
  isComplete: boolean;
  sentAt?: Date | null;
  lastChunkCompletedAt?: string;
  chunkResults?: Array<{
    sentCount: number;
    failedCount: number;
    completedAt: string;
  }>;
  error?: string;
}

/**
 * Get newsletter sending status
 */
async function handleGetNewsletterStatus(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const newsletterId = params.id;

    if (!newsletterId) {
      return AppError.validation('Newsletter ID is required').toResponse();
    }

    // Get newsletter record
    const newsletter = await prisma.newsletterItem.findUnique({
      where: { id: newsletterId }
    });

    if (!newsletter) {
      return AppError.validation('Newsletter not found').toResponse();
    }

    // Parse settings to get progress information
    const settings = newsletter.settings ? JSON.parse(newsletter.settings) : {};
    const chunkResults = settings.chunkResults || [];
    const totalSent = settings.totalSent || 0;
    const totalFailed = settings.totalFailed || 0;
    const completedChunks = settings.completedChunks || 0;
    
    // Calculate total chunks (if not stored, estimate from recipient count)
    const chunkSize = 10; // Default chunk size for frontend processing
    const totalChunks = settings.totalChunks || Math.ceil((newsletter.recipientCount || 0) / chunkSize);
    
    // Determine if sending is complete
    const isComplete = ['sent', 'partially_failed', 'failed'].includes(newsletter.status) || 
                      completedChunks >= totalChunks;

    logger.info(`Newsletter status requested for ${newsletterId}`, {
      context: {
        status: newsletter.status,
        recipientCount: newsletter.recipientCount,
        totalSent,
        totalFailed,
        completedChunks,
        totalChunks,
        isComplete
      }
    });

    const response: NewsletterStatusResponse = {
      success: true,
      newsletterId,
      status: newsletter.status,
      recipientCount: newsletter.recipientCount || 0,
      totalSent,
      totalFailed,
      completedChunks,
      totalChunks,
      isComplete,
      sentAt: newsletter.sentAt,
      lastChunkCompletedAt: settings.lastChunkCompletedAt,
      chunkResults
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Error getting newsletter status:', { context: { error } });
    
    const response: NewsletterStatusResponse = {
      success: false,
      newsletterId: params.id,
      status: 'error',
      recipientCount: 0,
      totalSent: 0,
      totalFailed: 0,
      completedChunks: 0,
      totalChunks: 0,
      isComplete: true,
      error: error instanceof Error ? error.message : String(error)
    };
    
    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * GET handler for newsletter status
 * Requires admin authentication
 */
export const GET = withAdminAuth(handleGetNewsletterStatus);

/**
 * POST handler is not supported for this endpoint
 */
export async function POST() {
  return new NextResponse('Method not allowed', { status: 405 });
}