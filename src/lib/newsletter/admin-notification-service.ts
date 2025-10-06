import prisma from '@/lib/db/prisma';
import { sendEmail } from '@/lib/email';
import { logger } from '@/lib/logger';
import { ChunkResult } from '@/types/api-types';

/**
 * Send admin notification email for newsletter delivery completion
 *
 * @param newsletterId - Newsletter ID
 * @returns Promise resolving to email sending result
 */
export async function sendNewsletterAdminNotification(newsletterId: string): Promise<{
  success: boolean;
  error?: Error | unknown;
}> {
  try {
    // Get newsletter and its settings
    const newsletter = await prisma.newsletterItem.findUnique({
      where: { id: newsletterId }
    });

    if (!newsletter) {
      throw new Error(`Newsletter with ID ${newsletterId} not found`);
    }

    const settings = newsletter.settings ? JSON.parse(newsletter.settings) : {};
    const adminNotificationEmail = settings.adminNotificationEmail;

    if (!adminNotificationEmail) {
      logger.warn('No admin notification email configured for newsletter', {
        module: 'newsletter-admin-notification-service',
        context: { newsletterId }
      });
      return { success: false, error: 'No admin notification email configured' };
    }

    // Parse newsletter statistics
    const totalRecipients = settings.totalRecipients || newsletter.recipientCount || 0;
    const successfulSends = settings.successfulSends || 0;
    const failedSends = settings.failedSends || 0;
    const chunkResults = settings.chunkResults || [];

    // Calculate success rate
    const successRate = totalRecipients > 0 ? Math.round((successfulSends / totalRecipients) * 100) : 0;

    // Get failed email addresses
    const failedEmails: string[] = [];
    chunkResults.forEach((chunk: ChunkResult) => {
      if (chunk.results) {
        chunk.results.forEach((result) => {
          if (!result.success && result.email) {
            failedEmails.push(result.email);
          }
        });
      }
    });

    // Generate HTML content
    const html = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Newsletter Delivery Complete - Die Linke Frankfurt</title>
  <style>
    body { margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 5px; }
    .header { text-align: center; margin-bottom: 20px; }
    .stats { background-color: #f9f9f9; padding: 15px; margin: 20px 0; border-left: 4px solid #FF0000; }
    .failed-emails { background-color: #fff5f5; padding: 15px; margin: 20px 0; border-left: 4px solid #d32f2f; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; font-size: 14px; color: #666; }
    a { color: #FF0000; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="color: #FF0000;">Die Linke Frankfurt</h1>
    </div>

    <h2>Newsletter Delivery Complete: ${newsletter.subject || 'Newsletter'}</h2>

    <p>Der Newsletter-Versand wurde abgeschlossen.</p>

    <div class="stats">
      <h3>Versand-Statistiken:</h3>
      <ul>
        <li><strong>Gesamt-Empfänger:</strong> ${totalRecipients} Empfänger</li>
        <li><strong>Erfolgreich versendet:</strong> ${successfulSends} erfolgreich</li>
        <li><strong>Fehlgeschlagen:</strong> ${failedSends} fehlgeschlagen</li>
        <li><strong>Erfolgsrate:</strong> ${successRate}%</li>
      </ul>
    </div>

    ${failedEmails.length > 0 ? `
    <div class="failed-emails">
      <h3>Fehlgeschlagene E-Mails:</h3>
      <ul>
        ${failedEmails.slice(0, 10).map(email => `<li>${email}</li>`).join('')}
        ${failedEmails.length > 10 ? `<li><em>... und ${failedEmails.length - 10} weitere</em></li>` : ''}
      </ul>
    </div>
    ` : ''}

    <p>
      Mit freundlichen Grüßen,<br>
      Das Newsletter-System von Die Linke Frankfurt
    </p>

    <div class="footer">
      <p><strong>Die Linke Frankfurt</strong></p>
      <p>Newsletter-System - Automatische Benachrichtigung</p>
    </div>
  </div>
</body>
</html>
    `;

    // Send admin notification email
    const result = await sendEmail({
      to: adminNotificationEmail,
      subject: 'Newsletter Delivery Complete',
      html
    });

    if (result.success) {
      logger.info('Admin notification email sent successfully', {
        module: 'newsletter-admin-notification-service',
        context: {
          newsletterId,
          adminEmail: adminNotificationEmail,
          totalRecipients,
          successfulSends,
          failedSends,
          successRate
        }
      });
    } else {
      logger.error('Failed to send admin notification email', {
        module: 'newsletter-admin-notification-service',
        context: {
          newsletterId,
          adminEmail: adminNotificationEmail,
          error: result.error
        }
      });
    }

    return result;
  } catch (error) {
    logger.error(error as Error, {
      module: 'newsletter-admin-notification-service',
      context: { newsletterId }
    });
    return { success: false, error };
  }
}
