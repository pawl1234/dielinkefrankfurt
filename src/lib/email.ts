import nodemailer from 'nodemailer';
import htmlToText from 'nodemailer-html-to-text';
import { logger } from './logger';

// Create a reusable transporter object using SMTP transport
const createTransporter = () => {
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
    // Add timeouts for Vercel environment
    connectionTimeout: 30000, // 30 seconds
    greetingTimeout: 30000, // 30 seconds
    socketTimeout: 45000, // 45 seconds
    
    // Connection pooling configuration for better performance
    pool: true, // Enable connection pooling
    maxConnections: 1, // Limit to 1 connection for serverless environment
    maxMessages: Infinity, // No limit on messages per connection
    rateDelta: 1000, // 1 second rate limiting window  
    rateLimit: 5, // Max 5 emails per second
  };
  
  logger.info('Creating SMTP transporter with connection pooling', {
    context: {
      host: config.host,
      port: config.port,
      secure: config.secure,
      hasAuth: !!(config.auth.user && config.auth.pass),
      environment: process.env.NODE_ENV,
      rejectUnauthorized: config.tls.rejectUnauthorized,
      poolEnabled: config.pool,
      maxConnections: config.maxConnections,
      rateLimit: config.rateLimit
    }
  });
  
  const transporter = nodemailer.createTransport(config);
  return transporter;
};

// Global transporter instance for connection reuse
let globalTransporter: nodemailer.Transporter | null = null;

// Get or create a shared transporter instance
const getTransporter = () => {
  if (!globalTransporter) {
    globalTransporter = createTransporter();
  }
  return globalTransporter;
};

// Send email with HTML content
export const sendEmail = async ({
  to,
  subject,
  html,
  from = process.env.EMAIL_FROM || 'newsletter@die-linke-frankfurt.de',
  replyTo,
}: {
  to: string;
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}) => {
  const startTime = Date.now();
  
  try {
    // Log email attempt (without recipient email for privacy)
    logger.info('Attempting to send email', {
      context: {
        recipientDomain: to.split('@')[1] || 'unknown',
        subjectLength: subject.length,
        htmlLength: html.length,
        fromDomain: from.split('@')[1] || 'unknown',
        hasReplyTo: !!replyTo
      }
    });
    
    const transporter = getTransporter();
    
    // Verify transporter configuration in production
    if (process.env.NODE_ENV === 'production') {
      try {
        await transporter.verify();
        logger.info('SMTP transporter verified successfully');
      } catch (verifyError) {
        logger.error('SMTP transporter verification failed', {
          context: {
            error: verifyError,
            host: process.env.EMAIL_SERVER_HOST,
            port: process.env.EMAIL_SERVER_PORT,
            hasAuth: !!(process.env.EMAIL_SERVER_USER && process.env.EMAIL_SERVER_PASSWORD)
          }
        });
        throw verifyError;
      }
    }

    // Send email with proper MIME structure and timeout
    logger.info('Attempting to send email via SMTP...');
    
    // Create a timeout promise for the sendMail operation
    const sendMailTimeout = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Email sending timed out after 60 seconds'));
      }, 60000); // 60 seconds timeout
    });
    
    const sendMailPromise = transporter.sendMail({
      from: from,
      to: to,
      subject: subject,
      html: html,
      replyTo: replyTo || from,
      headers: {
        'Content-Type': 'text/html; charset=utf-8'
      }
    });
    
    const info = await Promise.race([sendMailPromise, sendMailTimeout]);
    
    const duration = Date.now() - startTime;
    
    logger.info('Email sent successfully', {
      context: {
        messageId: (info as any).messageId,
        recipientDomain: to.split('@')[1] || 'unknown',
        duration: `${duration}ms`,
        response: (info as any).response,
        accepted: (info as any).accepted?.length || 0,
        rejected: (info as any).rejected?.length || 0,
        envelope: (info as any).envelope
      }
    });

    return { success: true, messageId: (info as any).messageId };
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('Failed to send email', {
      context: {
        recipientDomain: to.split('@')[1] || 'unknown',
        duration: `${duration}ms`,
        error: error instanceof Error ? {
          message: error.message,
          code: (error as any).code,
          errno: (error as any).errno,
          syscall: (error as any).syscall
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