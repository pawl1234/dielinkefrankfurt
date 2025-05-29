import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api-auth';
import { AppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import { getNewsletterSettings } from '@/lib/newsletter-service';
import { format } from 'date-fns';

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
  settings?: any;
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
 * Format subject line with template variables
 */
function formatSubject(template: string): string {
  const currentDate = format(new Date(), 'dd.MM.yyyy');
  return template.replace('{date}', currentDate);
}

/**
 * Process a chunk of emails synchronously
 */
async function handleChunkProcessing(request: NextRequest): Promise<NextResponse> {
  try {
    const body: ChunkRequest = await request.json();
    const { newsletterId, html, subject, emails, chunkIndex, totalChunks, settings } = body;

    // Validate required fields
    if (!newsletterId || !html || !subject || !emails || emails.length === 0) {
      return AppError.validation('Missing required fields').toResponse();
    }

    // Get newsletter settings
    const defaultSettings = await getNewsletterSettings();
    const emailSettings = { ...defaultSettings, ...settings };
    
    // Format subject line
    const formattedSubject = formatSubject(subject);
    
    // Prepare sender information
    const fromEmail = emailSettings.fromEmail || 'newsletter@die-linke-frankfurt.de';
    const fromName = emailSettings.fromName || 'Die Linke Frankfurt';
    const from = `${fromName} <${fromEmail}>`;
    const replyTo = emailSettings.replyToEmail || fromEmail;

    // Verify newsletter exists and is in sending status
    const newsletter = await prisma.newsletterItem.findUnique({
      where: { id: newsletterId }
    });

    if (!newsletter) {
      return AppError.validation('Newsletter not found').toResponse();
    }

    if (!['sending', 'draft'].includes(newsletter.status)) {
      return AppError.validation('Newsletter is not in a sendable state').toResponse();
    }

    logger.info(`Processing chunk ${chunkIndex + 1}/${totalChunks} for newsletter ${newsletterId}`, {
      context: {
        emailCount: emails.length,
        chunkIndex,
        totalChunks
      }
    });

    // Process emails in this chunk
    let sentCount = 0;
    let failedCount = 0;
    const results: Array<{ email: string; success: boolean; error?: any }> = [];

    for (let i = 0; i < emails.length; i++) {
      const email = emails[i];
      
      try {
        logger.info(`Sending email ${i + 1}/${emails.length} in chunk ${chunkIndex + 1}`, {
          context: {
            recipientDomain: email.split('@')[1] || 'unknown'
          }
        });

        const result = await sendEmail({
          to: email,
          subject: formattedSubject,
          html,
          from,
          replyTo
        });

        if (result.success) {
          sentCount++;
          results.push({ email, success: true });
          logger.info(`Email ${i + 1} sent successfully`);
        } else {
          failedCount++;
          results.push({ email, success: false, error: result.error });
          logger.warn(`Email ${i + 1} failed`, {
            context: { error: result.error }
          });
        }

        // Small delay between emails to be nice to the SMTP server
        if (i < emails.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      } catch (error) {
        failedCount++;
        results.push({ email, success: false, error });
        logger.error(`Email ${i + 1} threw exception`, {
          context: { error }
        });
      }
    }

    // Check if this is the last chunk
    const isComplete = chunkIndex === totalChunks - 1;
    
    // Update newsletter progress
    const currentSettings = newsletter.settings ? JSON.parse(newsletter.settings) : {};
    const chunkResults = currentSettings.chunkResults || [];
    
    // Store this chunk's results
    chunkResults[chunkIndex] = {
      sentCount,
      failedCount,
      completedAt: new Date().toISOString()
    };

    // Calculate total progress
    const totalSent = chunkResults.reduce((sum: number, chunk: any) => sum + (chunk?.sentCount || 0), 0);
    const totalFailed = chunkResults.reduce((sum: number, chunk: any) => sum + (chunk?.failedCount || 0), 0);
    
    let finalStatus = newsletter.status;
    if (isComplete) {
      finalStatus = totalFailed === 0 ? 'sent' : 'partially_failed';
    }

    // Update newsletter record
    await prisma.newsletterItem.update({
      where: { id: newsletterId },
      data: {
        status: finalStatus,
        settings: JSON.stringify({
          ...currentSettings,
          chunkResults,
          totalSent,
          totalFailed,
          lastChunkCompletedAt: new Date().toISOString(),
          completedChunks: chunkIndex + 1
        })
      }
    });

    logger.info(`Chunk ${chunkIndex + 1}/${totalChunks} completed`, {
      context: {
        sent: sentCount,
        failed: failedCount,
        totalSent,
        totalFailed,
        isComplete,
        finalStatus
      }
    });

    const response: ChunkResponse = {
      success: true,
      chunkIndex,
      totalChunks,
      sentCount,
      failedCount,
      isComplete,
      newsletterStatus: finalStatus
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Error processing email chunk:', { context: { error } });
    
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
 * POST handler for processing email chunks
 * Requires admin authentication
 */
export const POST = withAdminAuth(handleChunkProcessing);

/**
 * GET handler is not supported for this endpoint
 */
export async function GET() {
  return new NextResponse('Method not allowed', { status: 405 });
}