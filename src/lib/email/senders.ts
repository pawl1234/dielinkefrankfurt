/**
 * Email sending functions using React Email templates
 *
 * Replaces the old email-notifications.ts file with React Email-based implementation.
 * All functions maintain the same signatures for backward compatibility.
 */

import { sendEmail, type EmailAttachment } from './mailer';
import { getBaseUrl } from '../base-url';
import { prepareEmailAttachments } from './attachments';
import { logger } from '../logger';
import { renderNotificationEmail } from './rendering';
import {
  GroupWithResponsiblePersons,
  StatusReportWithGroup,
  GroupEmailProps,
  StatusReportEmailProps,
  AntragEmailProps
} from '../../types/email-types';
import { Antrag } from '@prisma/client';
import { getNewsletterSettings } from '@/lib/newsletter';


/**
 * Send notification email when a group is accepted
 * @param group Group with responsible persons
 * @returns Result with success status and optional error
 */
export async function sendGroupAcceptanceEmail(
  group: GroupWithResponsiblePersons
): Promise<{ success: boolean; error?: Error | string }> {
  try {
    if (!group.responsiblePersons || group.responsiblePersons.length === 0) {
      logger.error('No responsible persons found for group', { context: { groupId: group.id } });
      return { success: false, error: 'No responsible persons found' };
    }

    // Fetch newsletter settings for logo
    const settings = await getNewsletterSettings();

    // Prepare email props
    const emailProps: GroupEmailProps = {
      group,
      headerLogo: settings.headerLogo,
      baseUrl: getBaseUrl(),
      recipientEmail: group.responsiblePersons.map(p => p.email).join(','),
      recipientName: group.responsiblePersons.map(p => `${p.firstName} ${p.lastName}`).join(', '),
      statusReportFormUrl: `${getBaseUrl()}/gruppen-bericht`,
      contactEmail: process.env.CONTACT_EMAIL || 'info@die-linke-frankfurt.de'
    };

    // Render with React Email
    const html = await renderNotificationEmail('GroupAcceptance', emailProps);

    // Send email
    await sendEmail({
      to: emailProps.recipientEmail,
      subject: `Ihre Gruppe "${group.name}" wurde freigeschaltet`,
      html
    });

    logger.info('Group acceptance email sent successfully', { context: { groupId: group.id, recipientEmail: emailProps.recipientEmail } });
    return { success: true };
  } catch (error) {
    logger.error('Error sending group acceptance email', { context: { groupId: group.id, error } });
    return { success: false, error: error instanceof Error ? error : String(error) };
  }
}

/**
 * Send notification email when a group is rejected
 * @param group Group with responsible persons
 * @returns Result with success status and optional error
 */
export async function sendGroupRejectionEmail(
  group: GroupWithResponsiblePersons
): Promise<{ success: boolean; error?: Error | string }> {
  try {
    if (!group.responsiblePersons || group.responsiblePersons.length === 0) {
      logger.error('No responsible persons found for group', { context: { groupId: group.id } });
      return { success: false, error: 'No responsible persons found' };
    }

    // Fetch newsletter settings for logo
    const settings = await getNewsletterSettings();

    // Prepare email props
    const emailProps: GroupEmailProps = {
      group,
      headerLogo: settings.headerLogo,
      baseUrl: getBaseUrl(),
      recipientEmail: group.responsiblePersons.map(p => p.email).join(','),
      recipientName: group.responsiblePersons.map(p => `${p.firstName} ${p.lastName}`).join(', '),
      contactEmail: process.env.CONTACT_EMAIL || 'info@die-linke-frankfurt.de'
    };

    // Render with React Email
    const html = await renderNotificationEmail('GroupRejection', emailProps);

    // Send email
    await sendEmail({
      to: emailProps.recipientEmail,
      subject: `Ihre Gruppenanfrage "${group.name}" wurde abgelehnt`,
      html
    });

    logger.info('Group rejection email sent successfully', { context: { groupId: group.id, recipientEmail: emailProps.recipientEmail } });
    return { success: true };
  } catch (error) {
    logger.error('Error sending group rejection email', { context: { groupId: group.id, error } });
    return { success: false, error: error instanceof Error ? error : String(error) };
  }
}

/**
 * Send notification email when a group is archived
 * @param group Group with responsible persons
 * @returns Result with success status and optional error
 */
export async function sendGroupArchivingEmail(
  group: GroupWithResponsiblePersons
): Promise<{ success: boolean; error?: Error | string }> {
  try {
    if (!group.responsiblePersons || group.responsiblePersons.length === 0) {
      logger.error('No responsible persons found for group', { context: { groupId: group.id } });
      return { success: false, error: 'No responsible persons found' };
    }

    // Fetch newsletter settings for logo
    const settings = await getNewsletterSettings();

    // Prepare email props
    const emailProps: GroupEmailProps = {
      group,
      headerLogo: settings.headerLogo,
      baseUrl: getBaseUrl(),
      recipientEmail: group.responsiblePersons.map(p => p.email).join(','),
      recipientName: group.responsiblePersons.map(p => `${p.firstName} ${p.lastName}`).join(', '),
      contactEmail: process.env.CONTACT_EMAIL || 'info@die-linke-frankfurt.de'
    };

    // Render with React Email
    const html = await renderNotificationEmail('GroupArchiving', emailProps);

    // Send email
    await sendEmail({
      to: emailProps.recipientEmail,
      subject: `Ihre Gruppe "${group.name}" wurde archiviert`,
      html
    });

    logger.info('Group archiving email sent successfully', { context: { groupId: group.id, recipientEmail: emailProps.recipientEmail } });
    return { success: true };
  } catch (error) {
    logger.error('Error sending group archiving email', { context: { groupId: group.id, error } });
    return { success: false, error: error instanceof Error ? error : String(error) };
  }
}

/**
 * Send notification email when a status report is accepted
 * @param statusReport Status report with group information
 * @returns Result with success status and optional error
 */
export async function sendStatusReportAcceptanceEmail(
  statusReport: StatusReportWithGroup
): Promise<{ success: boolean; error?: Error | string }> {
  try {
    if (!statusReport.group.responsiblePersons || statusReport.group.responsiblePersons.length === 0) {
      logger.error('No responsible persons found for group', { context: { groupId: statusReport.group.id } });
      return { success: false, error: 'No responsible persons found' };
    }

    // Fetch newsletter settings for logo
    const settings = await getNewsletterSettings();

    // Prepare email props
    const emailProps: StatusReportEmailProps = {
      statusReport,
      headerLogo: settings.headerLogo,
      baseUrl: getBaseUrl(),
      recipientEmail: statusReport.group.responsiblePersons.map(p => p.email).join(','),
      recipientName: statusReport.group.responsiblePersons.map(p => `${p.firstName} ${p.lastName}`).join(', '),
      reportUrl: `${getBaseUrl()}/gruppen/${statusReport.group.slug}#report-${statusReport.id}`,
      contactEmail: process.env.CONTACT_EMAIL || 'info@die-linke-frankfurt.de'
    };

    // Render with React Email
    const html = await renderNotificationEmail('StatusReportAcceptance', emailProps);

    // Send email
    await sendEmail({
      to: emailProps.recipientEmail,
      subject: `Statusbericht "${statusReport.title}" wurde freigeschaltet`,
      html
    });

    logger.info('Status report acceptance email sent successfully', { context: { statusReportId: statusReport.id, recipientEmail: emailProps.recipientEmail } });
    return { success: true };
  } catch (error) {
    logger.error('Error sending status report acceptance email', { context: { statusReportId: statusReport.id, error } });
    return { success: false, error: error instanceof Error ? error : String(error) };
  }
}

/**
 * Send notification email when a status report is rejected
 * @param statusReport Status report with group information
 * @returns Result with success status and optional error
 */
export async function sendStatusReportRejectionEmail(
  statusReport: StatusReportWithGroup
): Promise<{ success: boolean; error?: Error | string }> {
  try {
    if (!statusReport.group.responsiblePersons || statusReport.group.responsiblePersons.length === 0) {
      logger.error('No responsible persons found for group', { context: { groupId: statusReport.group.id } });
      return { success: false, error: 'No responsible persons found' };
    }

    // Fetch newsletter settings for logo
    const settings = await getNewsletterSettings();

    // Prepare email props
    const emailProps: StatusReportEmailProps = {
      statusReport,
      headerLogo: settings.headerLogo,
      baseUrl: getBaseUrl(),
      recipientEmail: statusReport.group.responsiblePersons.map(p => p.email).join(','),
      recipientName: statusReport.group.responsiblePersons.map(p => `${p.firstName} ${p.lastName}`).join(', '),
      contactEmail: process.env.CONTACT_EMAIL || 'info@die-linke-frankfurt.de'
    };

    // Render with React Email
    const html = await renderNotificationEmail('StatusReportRejection', emailProps);

    // Send email
    await sendEmail({
      to: emailProps.recipientEmail,
      subject: `Ihr Statusbericht "${statusReport.title}" wurde abgelehnt`,
      html
    });

    logger.info('Status report rejection email sent successfully', { context: { statusReportId: statusReport.id, recipientEmail: emailProps.recipientEmail } });
    return { success: true };
  } catch (error) {
    logger.error('Error sending status report rejection email', { context: { statusReportId: statusReport.id, error } });
    return { success: false, error: error instanceof Error ? error : String(error) };
  }
}

/**
 * Send notification email when a status report is archived
 * @param statusReport Status report with group information
 * @returns Result with success status and optional error
 */
export async function sendStatusReportArchivingEmail(
  statusReport: StatusReportWithGroup
): Promise<{ success: boolean; error?: Error | string }> {
  try {
    if (!statusReport.group.responsiblePersons || statusReport.group.responsiblePersons.length === 0) {
      logger.error('No responsible persons found for group', { context: { groupId: statusReport.group.id } });
      return { success: false, error: 'No responsible persons found' };
    }

    // Fetch newsletter settings for logo
    const settings = await getNewsletterSettings();

    // Prepare email props
    const emailProps: StatusReportEmailProps = {
      statusReport,
      headerLogo: settings.headerLogo,
      baseUrl: getBaseUrl(),
      recipientEmail: statusReport.group.responsiblePersons.map(p => p.email).join(','),
      recipientName: statusReport.group.responsiblePersons.map(p => `${p.firstName} ${p.lastName}`).join(', '),
      contactEmail: process.env.CONTACT_EMAIL || 'info@die-linke-frankfurt.de'
    };

    // Render with React Email
    const html = await renderNotificationEmail('StatusReportArchiving', emailProps);

    // Send email
    await sendEmail({
      to: emailProps.recipientEmail,
      subject: `Ihr Statusbericht "${statusReport.title}" wurde archiviert`,
      html
    });

    logger.info('Status report archiving email sent successfully', { context: { statusReportId: statusReport.id, recipientEmail: emailProps.recipientEmail } });
    return { success: true };
  } catch (error) {
    logger.error('Error sending status report archiving email', { context: { statusReportId: statusReport.id, error } });
    return { success: false, error: error instanceof Error ? error : String(error) };
  }
}

/**
 * Send notification email when an Antrag is accepted
 * @param antrag The accepted Antrag
 * @param decisionComment Optional comment from the admin
 * @returns Result with success status and optional error
 */
export async function sendAntragAcceptanceEmail(
  antrag: Antrag,
  decisionComment?: string
): Promise<{ success: boolean; error?: Error | string }> {
  try {
    if (!antrag.email) {
      logger.error('No email address found for antrag applicant', { context: { antragId: antrag.id } });
      return { success: false, error: 'No email address found for applicant' };
    }

    // Fetch newsletter settings for logo
    const settings = await getNewsletterSettings();

    // Prepare email props
    const emailProps: AntragEmailProps = {
      antrag,
      headerLogo: settings.headerLogo,
      baseUrl: getBaseUrl(),
      recipientEmail: antrag.email,
      recipientName: `${antrag.firstName} ${antrag.lastName}`,
      decisionComment,
      contactEmail: process.env.CONTACT_EMAIL || 'info@die-linke-frankfurt.de'
    };

    // Render with React Email
    const html = await renderNotificationEmail('AntragAcceptance', emailProps);

    // Send email
    await sendEmail({
      to: emailProps.recipientEmail,
      subject: `✅ Ihr Antrag "${antrag.title}" wurde angenommen`,
      html
    });

    logger.info('Antrag acceptance email sent successfully', { context: { antragId: antrag.id, recipientEmail: emailProps.recipientEmail } });
    return { success: true };
  } catch (error) {
    logger.error('Error sending Antrag acceptance email', { context: { antragId: antrag.id, error } });
    return { success: false, error: error instanceof Error ? error : String(error) };
  }
}

/**
 * Send notification email when an Antrag is rejected
 * @param antrag The rejected Antrag
 * @param decisionComment Optional comment from the admin explaining the rejection
 * @returns Result with success status and optional error
 */
export async function sendAntragRejectionEmail(
  antrag: Antrag,
  decisionComment?: string
): Promise<{ success: boolean; error?: Error | string }> {
  try {
    if (!antrag.email) {
      logger.error('No email address found for antrag applicant', { context: { antragId: antrag.id } });
      return { success: false, error: 'No email address found for applicant' };
    }

    // Fetch newsletter settings for logo
    const settings = await getNewsletterSettings();

    // Prepare email props
    const emailProps: AntragEmailProps = {
      antrag,
      headerLogo: settings.headerLogo,
      baseUrl: getBaseUrl(),
      recipientEmail: antrag.email,
      recipientName: `${antrag.firstName} ${antrag.lastName}`,
      decisionComment,
      contactEmail: process.env.CONTACT_EMAIL || 'info@die-linke-frankfurt.de'
    };

    // Render with React Email
    const html = await renderNotificationEmail('AntragRejection', emailProps);

    // Send email
    await sendEmail({
      to: emailProps.recipientEmail,
      subject: `❌ Ihr Antrag "${antrag.title}" wurde abgelehnt`,
      html
    });

    logger.info('Antrag rejection email sent successfully', { context: { antragId: antrag.id, recipientEmail: emailProps.recipientEmail } });
    return { success: true };
  } catch (error) {
    logger.error('Error sending Antrag rejection email', { context: { antragId: antrag.id, error } });
    return { success: false, error: error instanceof Error ? error : String(error) };
  }
}

/**
 * Send notification email when an Antrag is submitted (preserves existing function)
 * @param antrag The submitted Antrag
 * @param fileUrls Array of uploaded file URLs
 * @param recipientEmails Array of recipient email addresses
 * @returns Result with success status and optional error
 */
export async function sendAntragSubmissionEmail(
  antrag: Antrag,
  fileUrls: string[],
  recipientEmails: string[]
): Promise<{ success: boolean; error?: Error | string }> {
  try {
    if (!recipientEmails || recipientEmails.length === 0) {
      logger.error('No recipient emails provided for Antrag submission', { context: { antragId: antrag.id } });
      return { success: false, error: 'No recipient emails provided' };
    }

    const recipients = recipientEmails.join(',');
    const adminUrl = `${getBaseUrl()}/admin/antraege/${antrag.id}`;

    // Prepare file attachments
    let attachments: EmailAttachment[] = [];

    if (fileUrls && fileUrls.length > 0) {
      try {
        const attachmentResult = await prepareEmailAttachments(fileUrls);
        attachments = attachmentResult.attachments;

        // Log attachment preparation results
        if (attachmentResult.attachments.length > 0) {
          logger.info('Antrag email attachments prepared', {
            context: {
              antragId: antrag.id,
              attachmentCount: attachmentResult.attachments.length,
              totalSize: attachmentResult.totalSize,
              skippedCount: attachmentResult.skippedFiles.length
            }
          });
        }

        // Add warnings for skipped files
        if (attachmentResult.skippedFiles.length > 0) {
          logger.warn('Some files could not be attached to Antrag email', {
            context: {
              antragId: antrag.id,
              skippedFiles: attachmentResult.skippedFiles.map(f => ({
                filename: f.filename,
                reason: f.reason
              }))
            }
          });
        }

      } catch (attachmentError) {
        // If attachment preparation fails completely, log the error
        logger.error('Failed to prepare attachments for Antrag email', {
          context: {
            antragId: antrag.id,
            error: attachmentError instanceof Error ? attachmentError.message : String(attachmentError)
          }
        });
      }
    }

    // Generate HTML using React Email
    const html = await renderNotificationEmail('AntragSubmission', {
      antrag,
      fileUrls,
      adminUrl
    });

    await sendEmail({
      to: recipients,
      subject: `Neuer Antrag: ${antrag.title}`,
      html,
      attachments: attachments.length > 0 ? attachments : undefined
    });

    logger.info('Antrag submission email sent successfully', { context: { antragId: antrag.id, recipients } });
    return { success: true };
  } catch (error) {
    logger.error('Error sending Antrag submission email', { context: { antragId: antrag.id, error } });
    return { success: false, error: error instanceof Error ? error : String(error) };
  }
}

/**
 * Send group contact request email to responsible persons
 * @param group Group with responsible persons
 * @param requesterName Name of the person contacting the group
 * @param requesterEmail Email address for replies
 * @param message Message text from the requester
 * @param officeEmail Optional office email to CC
 * @returns Result with success status and optional error
 */
export async function sendGroupContactEmail(
  group: GroupWithResponsiblePersons,
  requesterName: string,
  requesterEmail: string,
  message: string,
  officeEmail?: string | null
): Promise<{ success: boolean; error?: Error | string }> {
  try {
    // Fetch newsletter settings for logo
    const settings = await getNewsletterSettings();

    // Prepare email props
    const emailProps: import('../../types/email-types').GroupContactEmailProps = {
      group,
      requesterName,
      requesterEmail,
      message,
      headerLogo: settings.headerLogo,
      baseUrl: getBaseUrl(),
      recipientEmail: group.responsiblePersons.map(p => p.email).join(','),
      recipientName: group.responsiblePersons.map(p => `${p.firstName} ${p.lastName}`).join(', '),
      contactEmail: process.env.CONTACT_EMAIL || 'info@die-linke-frankfurt.de'
    };

    // Render with React Email
    const html = await renderNotificationEmail('GroupContactRequest', emailProps);

    // Prepare recipients (combine responsible persons and office email)
    const responsibleEmails = group.responsiblePersons.map(p => p.email);
    const allRecipients = officeEmail
      ? [...responsibleEmails, officeEmail].join(',')
      : responsibleEmails.join(',');

    // Send email
    await sendEmail({
      to: allRecipients,
      replyTo: requesterEmail,
      subject: `Kontaktanfrage für Gruppe: ${group.name}`,
      html
    });

    logger.info('Group contact request email sent successfully', {
      context: {
        groupId: group.id,
        groupSlug: group.slug,
        recipientCount: group.responsiblePersons.length,
        officeEmailUsed: !!officeEmail
      }
    });
    return { success: true };
  } catch (error) {
    logger.error('Error sending group contact request email', {
      context: {
        groupId: group.id,
        groupSlug: group.slug,
        error
      }
    });
    return { success: false, error: error instanceof Error ? error : String(error) };
  }
}

// Re-export types for backward compatibility
export type { GroupWithResponsiblePersons, StatusReportWithGroup } from '../../types/email-types';
