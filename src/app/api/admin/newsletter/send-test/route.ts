import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { sendTestEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  // Verify admin session
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  if (!token || (token as any).role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { html } = await request.json();
    
    if (!html) {
      return NextResponse.json(
        { error: 'Newsletter HTML content is required' },
        { status: 400 }
      );
    }
    
    // Send the test email
    const result = await sendTestEmail({ html });
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Test email sent successfully to ${process.env.TEST_EMAIL_RECIPIENT}`,
        messageId: result.messageId,
      });
    } else {
      console.error('Failed to send test email:', result.error);
      return NextResponse.json(
        { 
          error: 'Failed to send test email', 
          details: result.error instanceof Error ? result.error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error sending test email:', error);
    return NextResponse.json(
      { error: 'Failed to send test email' },
      { status: 500 }
    );
  }
}