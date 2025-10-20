import { NextRequest, NextResponse } from 'next/server';
import { ApiHandler, SimpleRouteContext } from '@/types/api-types';
import { AppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import prisma from '@/lib/db/prisma';
import { getNewsletterSettings, processSendingChunk, updateNewsletterAfterChunk } from '@/lib/newsletter';
import { sendChunkSchema, zodToValidationResult } from '@/lib/validation';

/**
 * Interface for chunk processing request
 */
interface ChunkRequest {
  newsletterId: string;
  html: string;
  subject: string;
  emails: string[];
  chunkIndex: number;
  totalChunks: number;
  settings?: Record<string, unknown>;
}

/**
 * Interface for chunk processing response
 */
interface ChunkResponse {
  success: boolean;
  chunkIndex: number;
  totalChunks: number;
  sentCount: number;
  failedCount: number;
  isComplete: boolean;
  newsletterStatus?: string;
  error?: string;
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
 * - emails: string[] - Array of recipient emails for this chunk
 * - chunkIndex: number - Current chunk index (0-based)
 * - totalChunks: number - Total number of chunks
 * - settings?: object - Optional email settings overrides
 */
export async function POST(request: NextRequest) {
  try {
    const body: ChunkRequest = await request.json();

    // Validate with Zod schema
    const validation = await zodToValidationResult(sendChunkSchema, body);
    if (!validation.isValid) {
      logger.warn('Validation failed for send chunk', {
        module: 'api',
        context: {
          endpoint: '/api/admin/newsletter/send-chunk',
          method: 'POST',
          errors: validation.errors
        }
      });

      return NextResponse.json(
        { error: 'Validierungsfehler', errors: validation.errors },
        { status: 400 }
      );
    }

    const { newsletterId, html, subject, emails, chunkIndex, totalChunks, settings } = validation.data!;

    logger.debug('Processing email chunk', {
      module: 'api',
      context: {
        endpoint: '/api/admin/newsletter/send-chunk',
        method: 'POST',
        newsletterId,
        chunkIndex,
        totalChunks,
        emailCount: emails?.length
      }
    });

    // Get newsletter settings
    const defaultSettings = await getNewsletterSettings();
    const emailSettings = { ...defaultSettings, ...settings };

    // Verify newsletter exists and is in sending status
    const newsletter = await prisma.newsletterItem.findUnique({
      where: { id: newsletterId }
    });

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
        endpoint: '/api/admin/newsletter/send-chunk',
        method: 'POST',
        emailCount: emails.length,
        chunkIndex,
        totalChunks
      }
    });

    // Use the consolidated sending method
    const chunkResult = await processSendingChunk(
      emails,
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

    // Get current settings
    const currentSettings = newsletter.settings ? JSON.parse(newsletter.settings) : {};

    // Update newsletter using service layer
    const { finalStatus, isComplete } = await updateNewsletterAfterChunk(
      newsletterId,
      chunkIndex,
      totalChunks,
      chunkResult,
      currentSettings
    );

    const response: ChunkResponse = {
      success: true,
      chunkIndex,
      totalChunks,
      sentCount: chunkResult.sentCount,
      failedCount: chunkResult.failedCount,
      isComplete,
      newsletterStatus: finalStatus
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error(error as Error, {
      module: 'api',
      context: {
        endpoint: '/api/admin/newsletter/send-chunk',
        method: 'POST',
        operation: 'processSendChunk'
      }
    });
    
    const response: ChunkResponse = {
      success: false,
      chunkIndex: 0,
      totalChunks: 0,
      sentCount: 0,
      failedCount: 0,
      isComplete: false,
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