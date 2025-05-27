import nodemailer from 'nodemailer';
import htmlToText from 'nodemailer-html-to-text';

// Create a reusable transporter object using SMTP transport
const createTransporter = () => {
  const transporter = nodemailer.createTransport({
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
  });

  return transporter;
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
  try {
    const transporter = createTransporter();

    // Send email with proper MIME structure
    const info = await transporter.sendMail({
      from: from,
      to: to,
      subject: subject,
      html: html,
      replyTo: replyTo || from,
      headers: {
        'Content-Type': 'text/html; charset=utf-8'
      }
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
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