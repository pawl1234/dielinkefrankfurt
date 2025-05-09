import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { formatEmailBody, formatHtmlEmailBody } from '@/lib/emailUtils';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Extract text fields
    const teaser = formData.get('teaser') as string;
    const mainText = formData.get('mainText') as string;
    const startDateTime = formData.get('startDateTime') as string;
    const endDateTime = formData.get('endDateTime') as string || null;
    const street = formData.get('street') as string || '';
    const city = formData.get('city') as string || '';
    const state = formData.get('state') as string || '';
    const postalCode = formData.get('postalCode') as string || '';
    const firstName = formData.get('firstName') as string || '';
    const lastName = formData.get('lastName') as string || '';
    const recurringText = formData.get('recurringText') as string || '';
    
    // Additional validation
    if (!teaser || !mainText || !startDateTime) {
      return NextResponse.json(
        { error: 'Pflichtfelder fehlen' },
        { status: 400 }
      );
    }
    
    // Validate file upload if present
    const file = formData.get('file') as File | null;
    let attachment = null;
    let tempFilePath = null;
    
    if (file) {
      // Check file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { error: 'File size exceeds 5MB limit. Please upload a smaller file.' },
          { status: 400 }
        );
      }
      
      // Check file type
      const fileType = file.type;
      if (!['image/jpeg', 'image/png', 'application/pdf'].includes(fileType)) {
        return NextResponse.json(
          { error: 'Unsupported file type. Please upload a JPEG, PNG, or PDF.' },
          { status: 400 }
        );
      }
      
      // Store file temporarily
      const tempDir = os.tmpdir();
      tempFilePath = path.join(tempDir, file.name);
      const buffer = Buffer.from(await file.arrayBuffer());
      fs.writeFileSync(tempFilePath, buffer);
      
      attachment = {
        filename: file.name,
        path: tempFilePath,
      };
    }
    
    // Format the email body using utility functions
    const emailData = {
      teaser,
      mainText,
      startDateTime,
      endDateTime,
      street,
      city,
      state,
      postalCode,
      firstName,
      lastName,
      recurringText,
    };
    
    const plainTextBody = formatEmailBody(emailData);
    const htmlBody = formatHtmlEmailBody(emailData);
    
    // Configure email transporter (replace with your actual email settings)
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.example.com',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER || 'user@example.com',
        pass: process.env.EMAIL_PASSWORD || 'password',
      },
    });
    
    // Setup email data
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'appointments@dielinkefrankfurt.de',
      to: process.env.EMAIL_TO || 'newsletter@dielinkefrankfurt.de',
      subject: `Neue Terminanfrage: ${firstName} ${lastName}`.trim(),
      text: plainTextBody,
      html: htmlBody,
      attachments: attachment ? [attachment] : [],
    };
    
    try {
      // Try to send email if configured
      await transporter.sendMail(mailOptions);
    } catch (emailError) {
      // In development, just log the error but still return success
      console.error('Email sending error (continuing in development mode):', emailError);
      console.log('Email would have contained:', {
        to: mailOptions.to,
        subject: mailOptions.subject,
        text: plainTextBody,
        hasAttachment: !!attachment
      });
      
      // In production, you might want to throw this error
      if (process.env.NODE_ENV === 'production') {
        throw emailError;
      }
    }
    
    // Clean up temporary file if it exists
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error submitting appointment:', error);
    
    return NextResponse.json(
      { error: 'Ihre Anfrage konnte nicht gesendet werden. Bitte versuchen Sie es später erneut.' },
      { status: 500 }
    );
  }
}