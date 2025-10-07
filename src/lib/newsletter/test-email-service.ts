import { sendTestEmail } from '@/lib/email';
import { logger } from '@/lib/logger';
import { getNewsletterSettings } from './settings-service';

/**
 * Sends a test newsletter email
 *
 * @param html - Newsletter HTML content
 * @param testRecipients - Optional test recipients (comma-separated email addresses)
 * @returns Promise resolving to sending result
 */
export async function sendNewsletterTestEmail(html: string, testRecipients?: string): Promise<{
  success: boolean;
  messageId?: string;
  error?: Error | unknown;
  recipientCount: number;
}> {
  try {
    // Use provided test recipients or fall back to global settings
    let recipients = testRecipients;
    if (!recipients) {
      const newsletterSettings = await getNewsletterSettings();
      recipients = newsletterSettings?.testEmailRecipients || undefined;
    }

    logger.info('Sending test newsletter email', {
      module: 'newsletter-test-email-service',
      context: {
        hasRecipients: !!recipients,
        htmlLength: html.length
      }
    });

    // Send the test email
    return await sendTestEmail({
      html,
      testRecipients: recipients
    });
  } catch (error) {
    logger.error(error as Error, {
      module: 'newsletter-test-email-service',
      context: { operation: 'sendNewsletterTestEmail' }
    });
    throw error;
  }
}
