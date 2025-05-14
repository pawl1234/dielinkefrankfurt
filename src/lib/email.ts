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

  // Add plugin to convert HTML to text for email clients that need it
  transporter.use('compile', htmlToText.htmlToText());

  return transporter;
};

// Send email with HTML content
export const sendEmail = async ({
  to,
  subject,
  html,
  from = process.env.EMAIL_FROM || 'newsletter@die-linke-frankfurt.de',
}: {
  to: string;
  subject: string;
  html: string;
  from?: string;
}) => {
  try {
    const transporter = createTransporter();

    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html,
    });

    console.log(`Email sent: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error };
  }
};

// Send a test newsletter email
export const sendTestEmail = async ({
  html,
  subject = 'Test Newsletter - Die Linke Frankfurt',
}: {
  html: string;
  subject?: string;
}) => {
  const recipient = process.env.TEST_EMAIL_RECIPIENT || 'buero@linke-frankfurt.de';
  
  return sendEmail({
    to: recipient,
    subject,
    html,
  });
};