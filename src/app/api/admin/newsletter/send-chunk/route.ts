import { NextRequest, NextResponse } from 'next/server';
import { ApiHandler, SimpleRouteContext } from '@/types/api-types';
import { AppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { getNewsletterById } from '@/lib/db/newsletter-operations';
import { getNewsletterSettings, processSendingChunk, updateNewsletterAfterChunk } from '@/lib/newsletter';
import { sendChunkSchema, zodToValidationResult } from '@/lib/validation';
import { ValidatedEmails, SendChunkResponse } from '@/types/email-types';

/**
 * Interface for chunk processing request
 */
interface ChunkRequest {
  newsletterId: string;
  html: string;
  subject: string;
  validatedEmails: ValidatedEmails;
  chunkIndex: number;
  totalChunks: number;
  settings?: Record<string, unknown>;
}

/**
 * POST /api/admin/newsletter/send-chunk
 *
 * Admin endpoint for processing a chunk of emails in a newsletter send operation.
 * Uses the consolidated processSendingChunk method for actual sending.
 * Tracks progress and handles retry initialization.
 * Authentication handled by middleware.
 *
 * Request body:
 * - newsletterId: string - Newsletter to send
 * - html: string - Newsletter HTML content
 * - subject: string - Email subject line
 * - validatedEmails: ValidatedEmails - Array of validated recipient emails for this chunk
 * - chunkIndex: number - Current chunk index (0-based)
 * - totalChunks: number - Total number of chunks
 * - settings?: object - Optional email settings overrides
 */
export async function POST(request: NextRequest) {
  try {
    const body: ChunkRequest = await request.json();

    const validation = await zodToValidationResult(sendChunkSchema, body);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: 'Validierungsfehler', errors: validation.errors },
        { status: 400 }
      );
    }

    const { newsletterId, html, subject, validatedEmails, chunkIndex, totalChunks, settings } = validation.data!;

    logger.debug('Processing email chunk', {
      module: 'api',
      context: {
        newsletterId,
        chunkIndex,
        totalChunks,
        emailCount: validatedEmails?.length
      }
    });

    // Get newsletter settings
    const defaultSettings = await getNewsletterSettings();
    const emailSettings = { ...defaultSettings, ...settings };

    // Verify newsletter exists and is in sending status
    const newsletter = await getNewsletterById(newsletterId);

    if (!newsletter) {
      logger.warn('Newsletter not found for send chunk', {
        module: 'api',
        context: {
          endpoint: '/api/admin/newsletter/send-chunk',
          method: 'POST',
          newsletterId
        }
      });

      return AppError.validation('Newsletter not found').toResponse();
    }

    if (!['sending', 'draft'].includes(newsletter.status)) {
      logger.warn('Newsletter not in sendable state', {
        module: 'api',
        context: {
          endpoint: '/api/admin/newsletter/send-chunk',
          method: 'POST',
          newsletterId,
          status: newsletter.status
        }
      });

      return AppError.validation('Newsletter is not in a sendable state').toResponse();
    }

    logger.info(`Processing chunk ${chunkIndex + 1}/${totalChunks} for newsletter ${newsletterId}`, {
      module: 'api',
      context: {
        emailCount: validatedEmails.length,
        chunkIndex,
        totalChunks
      }
    });

    const chunkResult = await processSendingChunk(
      validatedEmails,
      newsletterId,
      {
        ...emailSettings,
        html,
        subject,
        chunkIndex,
        totalChunks
      },
      'initial'
    );

    const currentSettings = newsletter.settings ? JSON.parse(newsletter.settings) : {};

    const { finalStatus, isComplete } = await updateNewsletterAfterChunk(
      newsletterId,
      chunkIndex,
      totalChunks,
      chunkResult,
      currentSettings
    );

    const response: SendChunkResponse = {
      success: true,
      chunkIndex,
      totalChunks,
      sentCount: chunkResult.sentCount,
      failedCount: chunkResult.failedCount,
      isComplete,
      newsletterStatus: finalStatus,
      results: chunkResult.results
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error(error as Error, {
      module: 'api',
      context: {
        operation: 'processSendChunk'
      }
    });

    const response: SendChunkResponse = {
      success: false,
      chunkIndex: 0,
      totalChunks: 0,
      sentCount: 0,
      failedCount: 0,
      isComplete: false,
      results: [],
      error: error instanceof Error ? error.message : String(error)
    };

    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * GET handler is not supported for this endpoint
 */
export const GET: ApiHandler<SimpleRouteContext> = async () => {
  return new NextResponse('Method not allowed', { status: 405 });
};