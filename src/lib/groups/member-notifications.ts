/**
 * Email notification functions for group membership events
 */

import { sendEmail } from '@/lib/email/mailer';
import { getBaseUrl } from '@/lib/base-url';
import { getNewsletterSettings } from '@/lib/newsletter';
import { getGroupResponsibleEmails } from '@/lib/db/group-operations';
import { logger } from '@/lib/logger';
import { render } from '@react-email/render';
import GroupMemberJoinedEmail from '@/emails/notifications/group-member-joined';
import prisma from '@/lib/db/prisma';

/**
 * Send email notification to responsible persons when a new member joins a group.
 *
 * @param groupId - ID of the group
 * @param newMemberUserId - ID of the user who joined
 * @returns Promise resolving with success status and optional error
 */
export async function sendMemberJoinedNotification(
  groupId: string,
  newMemberUserId: string
): Promise<{ success: boolean; error?: Error | string }> {
  try {
    // Fetch group details
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });

    if (!group) {
      logger.error('Group not found for member joined notification', {
        context: { groupId },
      });
      return { success: false, error: 'Group not found' };
    }

    // Fetch new member details
    const newMember = await prisma.user.findUnique({
      where: { id: newMemberUserId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    if (!newMember) {
      logger.error('User not found for member joined notification', {
        context: { userId: newMemberUserId },
      });
      return { success: false, error: 'User not found' };
    }

    // Get all responsible person emails (both email-based and user-based)
    const responsibleEmails = await getGroupResponsibleEmails(groupId);

    if (responsibleEmails.length === 0) {
      logger.warn('No responsible persons found for member joined notification', {
        context: { groupId },
      });
      // Don't fail if no responsible persons - just log warning
      return { success: true };
    }

    // Fetch newsletter settings for logo
    const settings = await getNewsletterSettings();

    // Format member name
    const memberName = [newMember.firstName, newMember.lastName]
      .filter(Boolean)
      .join(' ') || newMember.email;

    // Render email template
    const html = await render(
      GroupMemberJoinedEmail({
        groupName: group.name,
        groupSlug: group.slug,
        memberName,
        memberEmail: newMember.email,
        joinedAt: new Date().toISOString(),
        baseUrl: getBaseUrl(),
        headerLogo: settings.headerLogo || undefined,
        contactEmail: process.env.CONTACT_EMAIL || 'info@die-linke-frankfurt.de',
      })
    );

    // Send email to all responsible persons
    await sendEmail({
      to: responsibleEmails.join(','),
      subject: `Neues Mitglied in Gruppe "${group.name}"`,
      html,
    });

    logger.info('Member joined notification sent successfully', {
      context: {
        groupId,
        groupName: group.name,
        newMemberUserId,
        recipientCount: responsibleEmails.length,
      },
    });

    return { success: true };
  } catch (error) {
    logger.error('Error sending member joined notification', {
      context: { groupId, newMemberUserId, error },
    });
    return {
      success: false,
      error: error instanceof Error ? error : String(error),
    };
  }
}
