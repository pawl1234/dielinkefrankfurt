import { NextRequest, NextResponse } from 'next/server';
import { AppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { getNewsletterById, updateNewsletterItem, getNewsletterAnalytics } from '@/lib/db/newsletter-operations';
import { getNewsletterSettings, createNewsletterAnalytics, addTrackingToNewsletter } from '@/lib/newsletter';
import { getBaseUrl } from '@/lib/base-url';
import { sendNewsletterSchema, zodToValidationResult } from '@/lib/validation';
import { ValidatedEmails } from '@/types/email-types';
import crypto from 'crypto';

/**
 * POST /api/admin/newsletter/send
 *
 * Prepare newsletter for chunked sending.
 * TRUSTS validated emails from frontend - Zod verifies format only.
 * Authentication ensures only admins can call this API.
 */
async function handleSendNewsletter(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const validation = await zodToValidationResult(sendNewsletterSchema, body);

    if (!validation.isValid) {
      return NextResponse.json(
        { error: 'Validierungsfehler', errors: validation.errors },
        { status: 400 }
      );
    }

    const { newsletterId, html, subject, validatedEmails, settings } = validation.data!;

    // Get newsletter
    const newsletter = await getNewsletterById(newsletterId);

    if (!newsletter) {
      return AppError.validation('Newsletter not found').toResponse();
    }

    // Update newsletter status
    await updateNewsletterItem(newsletterId, {
      status: 'sending'
    });

    // Check if analytics already exist (for resend scenarios)
    const existingAnalytics = await getNewsletterAnalytics(newsletterId);

    // Create analytics tracking only if it doesn't exist
    // This preserves existing analytics (open/click counts) when resending
    if (!existingAnalytics) {
      await createNewsletterAnalytics(newsletterId, validatedEmails.length);
      logger.info('Created new newsletter analytics', {
        module: 'api',
        context: {
          newsletterId,
          recipientCount: validatedEmails.length
        }
      });
    } else {
      logger.info('Reusing existing newsletter analytics', {
        module: 'api',
        context: {
          newsletterId,
          existingRecipients: existingAnalytics.totalRecipients,
          newRecipients: validatedEmails.length
        }
      });
    }

    // Get analytics token for tracking (either new or existing)
    const analytics = existingAnalytics || await getNewsletterAnalytics(newsletterId);
    const analyticsToken = analytics?.pixelToken || crypto.randomBytes(16).toString('hex');

    // Add tracking to HTML (in-memory only, not persisted to DB)
    const baseUrl = getBaseUrl();
    const trackedHtml = addTrackingToNewsletter(html, analyticsToken, baseUrl);

    // Get settings and chunk size
    const defaultSettings = await getNewsletterSettings();
    const mergedSettings = { ...defaultSettings, ...settings };
    const chunkSize = mergedSettings.chunkSize || 50;

    // Divide validated emails into chunks
    const chunks: ValidatedEmails[] = [];
    for (let i = 0; i < validatedEmails.length; i += chunkSize) {
      chunks.push(validatedEmails.slice(i, i + chunkSize));
    }

    logger.info('Newsletter prepared for sending', {
      module: 'api',
      context: {
        newsletterId,
        recipientCount: validatedEmails.length,
        chunkCount: chunks.length,
        chunkSize
      }
    });

    // Return chunks to frontend
    return NextResponse.json({
      success: true,
      validRecipients: validatedEmails.length,
      newsletterId,
      emailChunks: chunks,
      totalChunks: chunks.length,
      chunkSize,
      html: trackedHtml,
      subject,
      settings: mergedSettings
    });

  } catch (error) {
    logger.error(error as Error, {
      module: 'api',
      context: {
        endpoint: '/api/admin/newsletter/send',
        method: 'POST'
      }
    });

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

/**
 * POST handler for sending newsletters
 * Requires admin authentication
 */
export const POST = handleSendNewsletter;

/**
 * GET handler is not supported for this endpoint
 */
export async function GET() {
  return new NextResponse('Method not allowed', { status: 405 });
}