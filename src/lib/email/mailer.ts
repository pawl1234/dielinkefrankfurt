import nodemailer from 'nodemailer';
import { logger } from '../logger';
import type {
  SMTPTransporter,
  EmailTransportSettings,
  EmailAttachment,
  EmailInfo,
  EmailSendResult
} from '@/types/email-types';

// Re-export for convenience
export type {
  SMTPTransporter,
  EmailTransportSettings,
  EmailAttachment,
  EmailSendResult
};

interface EmailError extends Error {
  code?: string;
  errno?: number;
  syscall?: string;
  response?: string;
}

// Create a reusable transporter object using SMTP transport
export function createTransporter(
  settings?: EmailTransportSettings
): SMTPTransporter {
  const config = {
    host: process.env.EMAIL_SERVER_HOST,
    port: Number(process.env.EMAIL_SERVER_PORT) || 1025, // Default to MailDev
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_SERVER_USER || '', // Empty for MailDev
      pass: process.env.EMAIL_SERVER_PASSWORD || '', // Empty for MailDev
    },
    // Enable this in development for self-signed certificates
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === 'production',
    },
    // Use configured timeouts or defaults
    connectionTimeout: settings?.connectionTimeout || 30000, // 30 seconds default
    greetingTimeout: settings?.greetingTimeout || 30000, // 30 seconds default
    socketTimeout: settings?.socketTimeout || 45000, // 45 seconds default

    // Disable connection pooling for clean lifecycle (better for serverless)
    pool: false, // Disable connection pooling to prevent connection accumulation
    maxConnections: settings?.maxConnections || 1, // Single connection per transporter
    maxMessages: settings?.maxMessages || 1, // Single message per connection
  };

  logger.info('Creating SMTP transporter for serverless environment', {
    context: {
      host: config.host,
      port: config.port,
      secure: config.secure,
      hasAuth: !!(config.auth.user && config.auth.pass),
      environment: process.env.NODE_ENV,
      rejectUnauthorized: config.tls.rejectUnauthorized,
      poolEnabled: config.pool,
      maxConnections: config.maxConnections,
      maxMessages: config.maxMessages,
      connectionModel: config.pool ? 'pooled' : 'single-use'
    }
  });

  const transporter = nodemailer.createTransport(config);
  return transporter as SMTPTransporter;
}

// Create a fresh transporter for each batch (better for serverless)
const getTransporter = (settings?: EmailTransportSettings): SMTPTransporter => {
  return createTransporter(settings);
};

// Send email with HTML content using provided transporter
export async function sendEmailWithTransporter(
  transporter: SMTPTransporter,
  options: {
    to: string;
    subject: string;
    html: string;
    from?: string;
    replyTo?: string;
    bcc?: string;
    attachments?: EmailAttachment[];
    settings?: EmailTransportSettings;
  }
): Promise<EmailSendResult> {
  const {
    to,
    subject,
    html,
    from = process.env.EMAIL_FROM || 'newsletter@die-linke-frankfurt.de',
    replyTo,
    bcc,
    attachments,
    settings,
  } = options;
  const startTime = Date.now();
  const maxRetries = settings?.maxRetries || 3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const mailOptions = {
      from: from,
      to: to,
      ...(bcc && { bcc: bcc }),
      subject: subject,
      html: html,
      replyTo: replyTo || from,
      headers: {
        'Content-Type': 'text/html; charset=utf-8'
      },
      ...(attachments && attachments.length > 0 && { attachments })
    };

    try {
      // Create a timeout promise for the sendMail operation
      const emailTimeout = settings?.emailTimeout || 60000;
      const sendMailTimeout = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Email sending timed out after ${emailTimeout / 1000} seconds`));
        }, emailTimeout);
      });

      const sendMailPromise = transporter.sendMail(mailOptions);

      const info = await Promise.race([sendMailPromise, sendMailTimeout]);

      return { success: true, messageId: (info as EmailInfo).messageId };
    } catch (error: unknown) {
      // On error, create a basic raw email representation for debugging
      const rawEmail = `From: ${mailOptions.from}\r\nTo: ${mailOptions.to}\r\n${mailOptions.bcc ? `Bcc: ${mailOptions.bcc}\r\n` : ''}Subject: ${mailOptions.subject}\r\nReply-To: ${mailOptions.replyTo}\r\nContent-Type: text/html; charset=utf-8\r\n\r\n[HTML content omitted for brevity]`;
      const duration = Date.now() - startTime;

      // Check if it's a connection error that should be retried
      const emailError = error as EmailError;
      const isConnectionError = emailError?.response?.includes('too many connections') ||
                               emailError?.code === 'ECONNREFUSED' ||
                               emailError?.code === 'ESOCKET' ||
                               emailError?.code === 'EPROTOCOL' ||
                               emailError?.code === 'ETIMEDOUT';

      // If it's the last attempt or not a connection error, fail
      if (attempt === maxRetries || !isConnectionError) {
        // Create email headers dump for debugging
        const emailHeadersDump = {
          from: mailOptions.from,
          to: mailOptions.to,
          bcc: mailOptions.bcc,
          subject: mailOptions.subject,
          replyTo: mailOptions.replyTo,
          headers: mailOptions.headers,
          htmlLength: mailOptions.html ? mailOptions.html.length : 0,
          bccCount: mailOptions.bcc ? mailOptions.bcc.split(',').length : 0
        };

        logger.error('Failed to send email with shared transporter', {
          context: {
            recipientDomain: to.split('@')[1] || 'unknown',
            duration: `${duration}ms`,
            attempts: attempt,
            emailHeaders: emailHeadersDump,
            rawEmail: rawEmail, // Add the raw email for debugging
            error: error instanceof Error ? {
              message: error.message,
              code: (error as EmailError).code,
              errno: (error as EmailError).errno,
              syscall: (error as EmailError).syscall
            } : error
          }
        });

        return {
          success: false,
          error,
          isConnectionError: isConnectionError && attempt === maxRetries
        };
      }

      // Calculate backoff delay for retry
      const maxBackoffDelay = settings?.maxBackoffDelay || 10000;
      const backoffDelay = Math.min(1000 * Math.pow(2, attempt - 1), maxBackoffDelay);

      logger.warn(`Email send failed (attempt ${attempt}/${maxRetries}), retrying in ${backoffDelay}ms`, {
        context: {
          recipientDomain: to.split('@')[1] || 'unknown',
          error: emailError?.message || emailError
        }
      });

      await new Promise(resolve => setTimeout(resolve, backoffDelay));
    }
  }

  // This should never be reached, but just in case
  return { success: false, error: new Error('Max retries exceeded') };
};

// Send email with HTML content (creates new transporter each time)
export const sendEmail = async ({
  to,
  subject,
  html,
  from = process.env.EMAIL_FROM || 'newsletter@die-linke-frankfurt.de',
  replyTo,
  attachments,
  settings,
}: {
  to: string;
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
  settings?: EmailTransportSettings;
}) => {
  const startTime = Date.now();

  try {

    const transporter = getTransporter(settings);

    // Verify transporter configuration in production with retry logic
    if (process.env.NODE_ENV === 'production') {
      let retryCount = 0;
      const maxRetries = settings?.maxRetries || 3;

      while (retryCount < maxRetries) {
        try {
          await transporter.verify();
          break; // No logging for successful verification
        } catch (verifyError: unknown) {
          retryCount++;

          // Check if it's a "too many connections" error
          const emailVerifyError = verifyError as EmailError;
          const isConnectionError = emailVerifyError?.response?.includes('too many connections') ||
                                   emailVerifyError?.code === 'ECONNREFUSED' ||
                                   emailVerifyError?.code === 'EPROTOCOL';

          if (isConnectionError && retryCount < maxRetries) {
            const maxBackoffDelay = settings?.maxBackoffDelay || 10000;
            const backoffDelay = Math.min(1000 * Math.pow(2, retryCount - 1), maxBackoffDelay); // Exponential backoff
            logger.warn(`SMTP verification failed (attempt ${retryCount}/${maxRetries}), retrying in ${backoffDelay}ms`, {
              context: { error: emailVerifyError?.message || emailVerifyError }
            });
            await new Promise(resolve => setTimeout(resolve, backoffDelay));
          } else {
            logger.error('SMTP transporter verification failed', {
              context: {
                error: emailVerifyError,
                host: process.env.EMAIL_SERVER_HOST,
                port: process.env.EMAIL_SERVER_PORT,
                hasAuth: !!(process.env.EMAIL_SERVER_USER && process.env.EMAIL_SERVER_PASSWORD),
                attempts: retryCount
              }
            });
            throw verifyError;
          }
        }
      }
    }

    // Send email with proper MIME structure and timeout
    logger.info('Attempting to send email via SMTP...');

    // Create a timeout promise for the sendMail operation
    const emailTimeout = settings?.emailTimeout || 60000;
    const sendMailTimeout = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Email sending timed out after ${emailTimeout / 1000} seconds`));
      }, emailTimeout);
    });

    const sendMailPromise = transporter.sendMail({
      from: from,
      to: to,
      subject: subject,
      html: html,
      replyTo: replyTo || from,
      headers: {
        'Content-Type': 'text/html; charset=utf-8'
      },
      ...(attachments && attachments.length > 0 && { attachments })
    });

    const info = await Promise.race([sendMailPromise, sendMailTimeout]);

    return { success: true, messageId: (info as EmailInfo).messageId };
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('Failed to send email', {
      context: {
        recipientDomain: to.split('@')[1] || 'unknown',
        duration: `${duration}ms`,
        error: error instanceof Error ? {
          message: error.message,
          code: (error as EmailError).code,
          errno: (error as EmailError).errno,
          syscall: (error as EmailError).syscall
        } : error,
        smtpConfig: {
          host: process.env.EMAIL_SERVER_HOST,
          port: process.env.EMAIL_SERVER_PORT,
          hasAuth: !!(process.env.EMAIL_SERVER_USER && process.env.EMAIL_SERVER_PASSWORD),
          nodeEnv: process.env.NODE_ENV
        }
      }
    });

    return { success: false, error };
  }
};

// Send a test newsletter email
export const sendTestEmail = async ({
  html,
  testRecipients,
  subject = 'Test Newsletter - Die Linke Frankfurt',
  replyTo,
}: {
  html: string;
  testRecipients?: string;
  subject?: string;
  replyTo?: string;
}) => {
  // Use provided test recipients or fallback to environment variable or default
  const recipientsString = testRecipients || process.env.TEST_EMAIL_RECIPIENT || 'buero@linke-frankfurt.de';

  // Split the recipients string by comma and trim whitespace
  const recipientsList = recipientsString.split(',').map(email => email.trim()).filter(email => email);

  // Send individual emails to each recipient
  const results = await Promise.all(
    recipientsList.map(recipient =>
      sendEmail({
        to: recipient,
        subject,
        html,
        replyTo,
      })
    )
  );

  // Check if all emails were sent successfully
  const allSuccessful = results.every(result => result.success);
  const messageIds = results.map(result => result.messageId).filter(Boolean);

  return {
    success: allSuccessful,
    messageId: messageIds.length > 0 ? messageIds.join(', ') : undefined,
    error: allSuccessful ? undefined : results.find(r => !r.success)?.error,
    recipientCount: recipientsList.length
  };
};
