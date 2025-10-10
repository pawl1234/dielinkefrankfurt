import { NextRequest, NextResponse } from 'next/server';
import { findGroupBySlugForContact } from '@/lib/db/group-operations';
import { getGroupSettings } from '@/lib/db/group-settings-operations';
import { sendGroupContactEmail } from '@/lib/email/senders';
import { groupContactSchema } from '@/lib/validation/group-contact-schema';
import { logger } from '@/lib/logger';
import type { SlugRouteContext } from '@/types/api-types';

/**
 * POST /api/groups/[slug]/contact
 * Send contact request email to group responsible persons and office
 */
export async function POST(
  request: NextRequest,
  context: SlugRouteContext
) {
  try {
    // Parse slug from URL parameters
    const { slug } = await context.params;

    // Parse and validate request body
    const body = await request.json();
    const validationResult = groupContactSchema.safeParse(body);

    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0];
      return NextResponse.json(
        {
          success: false,
          error: firstError?.message || 'Ungültige Eingabe'
        },
        { status: 400 }
      );
    }

    const { requesterName, requesterEmail, message } = validationResult.data;

    // Query group by slug with responsible persons
    const group = await findGroupBySlugForContact(slug);

    if (!group) {
      return NextResponse.json(
        {
          success: false,
          error: 'Arbeitsgruppe nicht gefunden'
        },
        { status: 404 }
      );
    }

    // Get office email configuration
    const settings = await getGroupSettings();
    const officeEmail = settings.officeContactEmail;

    // Send email via sendGroupContactEmail()
    const emailResult = await sendGroupContactEmail(
      group,
      requesterName,
      requesterEmail,
      message,
      officeEmail
    );

    if (!emailResult.success) {
      logger.error('Failed to send group contact email', {
        module: 'api/groups/contact',
        context: {
          groupSlug: slug,
          error: emailResult.error
        }
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Fehler beim Senden der Nachricht. Bitte versuchen Sie es erneut.'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error processing group contact request', {
      module: 'api/groups/contact',
      context: { error }
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Fehler beim Senden der Nachricht. Bitte versuchen Sie es erneut.'
      },
      { status: 500 }
    );
  }
}
