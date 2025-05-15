import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { sendTestEmail } from '@/lib/email';
import prisma from '@/lib/prisma';

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
    
    // Get the test email recipients from the database
    const newsletterSettings = await prisma.newsletter.findFirst();
    const testRecipients = newsletterSettings?.testEmailRecipients || undefined;
    
    // Send the test email
    const result = await sendTestEmail({ 
      html, 
      testRecipients 
    });
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Test emails sent successfully to ${result.recipientCount} recipient${result.recipientCount !== 1 ? 's' : ''}`,
        messageId: result.messageId,
        recipientCount: result.recipientCount
      });
    } else {
      console.error('Failed to send test email:', result.error);
      return NextResponse.json(
        { 
          error: 'Failed to send test email', 
          details: result.error instanceof Error ? result.error.message : 'Unknown error',
          recipientCount: result.recipientCount
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