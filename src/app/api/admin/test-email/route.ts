import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api-auth';
import { logger } from '@/lib/logger';
import nodemailer from 'nodemailer';

/**
 * Test email configuration and send a simple test email
 */
async function handleTestEmail(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { testEmail } = body;

    if (!testEmail) {
      return NextResponse.json({ error: 'Test email address is required' }, { status: 400 });
    }

    // Log environment variables (safely)
    logger.info('Testing email configuration', {
      context: {
        host: process.env.EMAIL_SERVER_HOST,
        port: process.env.EMAIL_SERVER_PORT,
        hasUser: !!process.env.EMAIL_SERVER_USER,
        hasPassword: !!process.env.EMAIL_SERVER_PASSWORD,
        fromEmail: process.env.EMAIL_FROM,
        nodeEnv: process.env.NODE_ENV,
        isVercel: !!process.env.VERCEL
      }
    });

    // Create transporter with detailed config
    const config = {
      host: process.env.EMAIL_SERVER_HOST,
      port: Number(process.env.EMAIL_SERVER_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_SERVER_USER || '',
        pass: process.env.EMAIL_SERVER_PASSWORD || '',
      },
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production',
      },
      connectionTimeout: 30000,
      greetingTimeout: 30000,
      socketTimeout: 45000,
    };

    logger.info('Creating test transporter with config');
    const transporter = nodemailer.createTransport(config);

    // Test connection
    logger.info('Testing SMTP connection...');
    await transporter.verify();
    logger.info('SMTP connection verified successfully');

    // Send test email
    logger.info('Sending test email...');
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'test@example.com',
      to: testEmail,
      subject: 'Test Email from Die Linke Frankfurt Portal',
      html: `
        <h2>Test Email</h2>
        <p>This is a test email sent from the Die Linke Frankfurt newsletter system.</p>
        <p>Timestamp: ${new Date().toISOString()}</p>
        <p>Environment: ${process.env.NODE_ENV}</p>
      `,
    });

    logger.info('Test email sent successfully', {
      context: {
        messageId: info.messageId,
        response: info.response,
        accepted: info.accepted,
        rejected: info.rejected
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Test email sent successfully',
      messageId: info.messageId,
      response: info.response
    });

  } catch (error) {
    logger.error('Test email failed', {
      context: {
        error: error instanceof Error ? {
          message: error.message,
          code: (error as unknown as { code?: string }).code,
          errno: (error as unknown as { errno?: string }).errno,
          syscall: (error as unknown as { syscall?: string }).syscall
        } : error
      }
    });

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? {
        code: (error as unknown as { code?: string }).code,
        errno: (error as unknown as { errno?: string }).errno,
        syscall: (error as unknown as { syscall?: string }).syscall
      } : undefined
    }, { status: 500 });
  }
}

/**
 * POST handler for test email
 */
export const POST = withAdminAuth(handleTestEmail);