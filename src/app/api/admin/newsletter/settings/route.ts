import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import prisma from '@/lib/prisma';

// Get newsletter settings
export async function GET(request: NextRequest) {
  // Verify admin session
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  if (!token || (token as any).role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Default newsletter settings
    const defaultSettings = {
      headerLogo: 'public/images/logo.png',
      headerBanner: 'public/images/header-bg.jpg',
      footerText: 'Die Linke Frankfurt am Main<br/>Kommunalpolitische Vereinigung',
      unsubscribeLink: '#'
    };
    
    // Get settings from database
    const dbSettings = await prisma.newsletter.findFirst();
    
    if (dbSettings) {
      return NextResponse.json({
        headerLogo: dbSettings.headerLogo ?? defaultSettings.headerLogo,
        headerBanner: dbSettings.headerBanner ?? defaultSettings.headerBanner,
        footerText: dbSettings.footerText ?? defaultSettings.footerText,
        unsubscribeLink: dbSettings.unsubscribeLink ?? defaultSettings.unsubscribeLink,
        testEmailRecipients: dbSettings.testEmailRecipients ?? 'buero@linke-frankfurt.de',
        id: dbSettings.id,
        createdAt: dbSettings.createdAt,
        updatedAt: dbSettings.updatedAt
      });
    } else {
      // Try to create default settings
      try {
        const newSettings = await prisma.newsletter.create({
          data: defaultSettings
        });
        
        return NextResponse.json(newSettings);
      } catch (createError) {
        console.warn('Could not create newsletter settings:', createError);
        // Return defaults if creation fails
        return NextResponse.json(defaultSettings);
      }
    }
  } catch (error) {
    console.error('Error fetching newsletter settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch newsletter settings' },
      { status: 500 }
    );
  }
}

// Update newsletter settings
export async function PUT(request: NextRequest) {
  // Verify admin session
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  if (!token || (token as any).role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await request.json();
    
    // Validate data
    if (!data) {
      return NextResponse.json(
        { error: 'Newsletter settings data is required' },
        { status: 400 }
      );
    }
    
    // Get existing newsletter settings
    const newsletterSettings = await prisma.newsletter.findFirst();
    
    let updatedSettings;
    
    if (newsletterSettings) {
      // Update existing settings
      updatedSettings = await prisma.newsletter.update({
        where: { id: newsletterSettings.id },
        data: {
          headerLogo: data.headerLogo,
          headerBanner: data.headerBanner,
          footerText: data.footerText,
          unsubscribeLink: data.unsubscribeLink,
          testEmailRecipients: data.testEmailRecipients
        }
      });
    } else {
      // Create new settings
      updatedSettings = await prisma.newsletter.create({
        data: {
          headerLogo: data.headerLogo || 'public/images/logo.png',
          headerBanner: data.headerBanner || 'public/images/header-bg.jpg',
          footerText: data.footerText || 'Die Linke Frankfurt am Main',
          unsubscribeLink: data.unsubscribeLink || '#',
          testEmailRecipients: data.testEmailRecipients || 'buero@linke-frankfurt.de'
        }
      });
    }
    
    return NextResponse.json(updatedSettings);
  } catch (error) {
    console.error('Error updating newsletter settings:', error);
    return NextResponse.json(
      { error: 'Failed to update newsletter settings' },
      { status: 500 }
    );
  }
}

// For backwards compatibility with the original API
export async function POST(request: NextRequest) {
  return PUT(request);
}