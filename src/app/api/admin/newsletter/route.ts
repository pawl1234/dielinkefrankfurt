import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import prisma from '@/lib/prisma';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Appointment, Newsletter } from '@prisma/client';

// Custom type for newsletter settings with defaults
interface NewsletterSettings {
  headerLogo: string;
  headerBanner: string;
  footerText: string;
  unsubscribeLink: string;
  id?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

// Get newsletter and generate HTML email
export async function GET(request: NextRequest) {
  // Verify admin session
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  if (!token || (token as any).role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get query parameters
    const url = new URL(request.url);
    const introductionText = url.searchParams.get('introductionText') || '<p>Herzlich willkommen zum Newsletter der Linken Frankfurt!</p>';
    
    // Get newsletter settings from database
    let newsletterSettings: NewsletterSettings = {
      headerLogo: 'public/images/logo.png',
      headerBanner: 'public/images/header-bg.jpg',
      footerText: 'Die Linke Frankfurt am Main',
      unsubscribeLink: '#'
    };
    
    try {
      const dbSettings = await prisma.newsletter.findFirst();
      
      if (dbSettings) {
        newsletterSettings = {
          headerLogo: dbSettings.headerLogo ?? newsletterSettings.headerLogo,
          headerBanner: dbSettings.headerBanner ?? newsletterSettings.headerBanner,
          footerText: dbSettings.footerText ?? newsletterSettings.footerText,
          unsubscribeLink: dbSettings.unsubscribeLink ?? newsletterSettings.unsubscribeLink,
          id: dbSettings.id,
          createdAt: dbSettings.createdAt,
          updatedAt: dbSettings.updatedAt
        };
      }
    } catch (settingsError) {
      console.warn('Could not fetch newsletter settings:', settingsError);
      // Continue with default settings
    }
    
    // Get featured appointments
    const featuredAppointments = await prisma.appointment.findMany({
      where: {
        featured: true,
        status: 'accepted',
        startDateTime: {
          gte: new Date() // Only future events
        }
      },
      orderBy: {
        startDateTime: 'asc'
      }
    });
    
    // Get upcoming appointments (not featured)
    const upcomingAppointments = await prisma.appointment.findMany({
      where: {
        featured: false,
        status: 'accepted',
        startDateTime: {
          gte: new Date() // Only future events
        }
      },
      orderBy: {
        startDateTime: 'asc'
      }
    });
    
    // Base URL for links
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    
    // Generate HTML email
    const emailHtml = generateEmailHtml({
      newsletterSettings,
      introductionText,
      featuredAppointments,
      upcomingAppointments,
      baseUrl
    });
    
    // Return the generated HTML
    return new NextResponse(emailHtml, {
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch (error) {
    console.error('Error generating newsletter:', error);
    return NextResponse.json(
      { error: 'Failed to generate newsletter' },
      { status: 500 }
    );
  }
}

// Helper function to generate HTML for the email
interface EmailTemplateParams {
  newsletterSettings: NewsletterSettings;
  introductionText: string;
  featuredAppointments: Appointment[];
  upcomingAppointments: Appointment[];
  baseUrl: string;
}

function generateEmailHtml({ 
  newsletterSettings, 
  introductionText, 
  featuredAppointments, 
  upcomingAppointments, 
  baseUrl 
}: EmailTemplateParams): string {
  // Helper function to get cover image from metadata or first image from fileUrls
  const getCoverImageUrl = (appointment: Appointment): string | null => {
    // First, try to get the cropped cover image from metadata if featured
    if (appointment.featured && appointment.metadata) {
      try {
        const metadata = JSON.parse(appointment.metadata as string);
        if (metadata.croppedCoverImageUrl) {
          return metadata.croppedCoverImageUrl;
        }
        if (metadata.coverImageUrl) {
          return metadata.coverImageUrl;
        }
      } catch (e) {
        console.warn('Failed to parse metadata for appointment:', appointment.id);
      }
    }
    
    // Fallback to file URLs if no cover image in metadata
    if (!appointment.fileUrls) return null;
    
    try {
      const fileUrls = JSON.parse(appointment.fileUrls) as string[];
      // Find the first file that is an image
      const imageUrl = fileUrls.find((url: string) => 
        url.endsWith('.jpg') || url.endsWith('.jpeg') || url.endsWith('.png') || url.endsWith('.gif')
      );
      return imageUrl || null;
    } catch (e) {
      return null;
    }
  };

  // Format date helper
  const formatDate = (dateString: Date | string): string => {
    return format(new Date(dateString), 'PPP', { locale: de });
  };

  // Default logo and banner if none provided
  const headerLogo = newsletterSettings.headerLogo;
  const headerBanner = newsletterSettings.headerBanner;
  const footerText = newsletterSettings.footerText;
  const unsubscribeLink = newsletterSettings.unsubscribeLink;

  // Generate featured events HTML
  let featuredEventsHtml = '';
  if (featuredAppointments && featuredAppointments.length > 0) {
    featuredEventsHtml += '<tr><td colspan="100%"><h2 class="section-title">Featured</h2></td></tr>';
    
    featuredAppointments.forEach((appointment: Appointment, index: number) => {
      const imageUrl = getCoverImageUrl(appointment);
      const detailUrl = `${baseUrl}/termine/${appointment.id}`;
      const isLastItem = index === featuredAppointments.length - 1;
      
      featuredEventsHtml += `
        <tr>
          <td class="featured-event ${!isLastItem ? 'has-border' : ''}">
            <table width="100%" cellPadding="0" cellSpacing="0" border="0">
              <tr>
                <td class="featured-date" colspan="2">
                  ${formatDate(appointment.startDateTime)}
                  ${appointment.endDateTime ? ` - ${formatDate(appointment.endDateTime)}` : ''}
                </td>
              </tr>
              <tr>
                <td class="featured-image-cell" width="35%" valign="top">
                  ${imageUrl ? `<img src="${imageUrl}" alt="${appointment.title}" class="featured-image" />` : ''}
                </td>
                <td class="featured-content" width="65%" valign="top">
                  <h3 class="event-title">${appointment.title}</h3>
                  <p class="event-teaser">${appointment.teaser}</p>
                  <div class="button-container">
                    <a href="${detailUrl}" class="event-button">
                      Mehr Informationen
                    </a>
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      `;
    });
  }

  // Generate upcoming events HTML
  let upcomingEventsHtml = '';
  if (upcomingAppointments && upcomingAppointments.length > 0) {
    upcomingEventsHtml += '<tr><td colspan="100%"><h2 class="section-title">Termine</h2></td></tr>';
    
    upcomingAppointments.forEach((appointment: Appointment) => {
      const detailUrl = `${baseUrl}/termine/${appointment.id}`;
      
      upcomingEventsHtml += `
        <tr>
          <td class="upcoming-event">
            <h3 class="upcoming-title">${appointment.title}</h3>
            <p class="upcoming-date">
              ${formatDate(appointment.startDateTime)}
            </p>
            <p class="event-teaser">${appointment.teaser}</p>
            <a href="${detailUrl}" class="event-button">
              Mehr Informationen
            </a>
          </td>
        </tr>
      `;
    });
  }

  // Build complete HTML
// Build complete HTML
return `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Die Linke Frankfurt Newsletter</title>
      <style>
        /* Email Styles */
        body {
          margin: 0;
          padding: 0;
          font-family: "Open Sans", "Helvetica Neue", Helvetica, Arial, sans-serif;
          font-size: 16px;
          line-height: 1.5;
          color: #000000;
          background-color: #F5F5F5;
        }
        
        table {
          border-spacing: 0;
          border-collapse: collapse;
          mso-table-lspace: 0pt;
          mso-table-rspace: 0pt;
        }
        
        td {
          padding: 0;
        }
        
        img {
          border: 0;
          line-height: 100%;
          outline: none;
          text-decoration: none;
          -ms-interpolation-mode: bicubic;
        }
        
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #FFFFFF;
        }
        
        .header {
          background-color: #FFFFFF;
          text-align: center;
          padding: 20px 0;
        }
        
        .logo {
          max-height: 60px;
          width: auto;
        }
        
        .banner {
          width: 100%;
          max-height: 200px;
          object-fit: cover;
        }
        
        .content {
          padding: 20px;
        }
        
        .introduction {
          padding: 0 0 20px 0;
          border-bottom: 1px solid #E5E5E5;
        }
        
        .section-title {
          color: #FF0000;
          font-size: 24px;
          font-weight: bold;
          margin-top: 10px;
          margin-bottom: 15px;
        }
        
        .featured-event {
          margin-bottom: 30px;
          border: 1px solid #E5E5E5;
        }
        
        .featured-image {
          width: 100%;
          height: auto;
          max-width: 600px;
          max-height: 214px; /* Maintains 14:5 aspect ratio for featured images */
          object-fit: cover;
          display: block;
        }
        
        .featured-content {
          padding: 15px;
        }
        
        .event-title {
          font-size: 20px;
          font-weight: bold;
          margin-bottom: 10px;
          color: #000000;
        }
        
        .event-teaser {
          margin-bottom: 15px;
          color: #333333;
        }
        
        .event-date {
          font-weight: bold;
          margin-bottom: 15px;
          color: #666666;
        }
        
        .event-button {
          display: inline-block;
          background-color: #FF0000;
          color: #FFFFFF;
          text-decoration: none;
          padding: 10px 20px;
          font-weight: bold;
          margin-top: 10px;
        }
        
        .upcoming-event {
          padding: 15px 0;
          border-bottom: 1px solid #E5E5E5;
        }
        
        .upcoming-title {
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 5px;
          color: #000000;
        }
        
        .upcoming-date {
          font-weight: bold;
          margin-bottom: 10px;
          color: #666666;
        }
        
        .footer {
          background-color: #222222;
          color: #FFFFFF;
          padding: 30px 20px;
          text-align: center;
        }
        
        .unsubscribe {
          color: #CCCCCC;
          text-decoration: underline;
          margin-top: 15px;
          display: inline-block;
        }
        
        @media only screen and (max-width: 600px) {
          .container {
            width: 100% !important;
          }
          
          .content {
            padding: 15px !important;
          }
          
          .event-title {
            font-size: 18px !important;
          }
        }
      </style>
    </head>
    <body>
      <table width="100%" cellPadding="0" cellSpacing="0" border="0">
        <tr>
          <td align="center" valign="top">
            <table class="container" width="600" cellPadding="0" cellSpacing="0" border="0">
              <!-- Header -->
              <tr>
                <td class="header" style="position: relative; padding: 0; line-height: 0;">
                  <img
                    src="${headerBanner}"
                    alt="Die Linke Frankfurt Banner"
                    class="banner"
                    width="600"
                    height="150"
                    style="display: block; max-width: 100%; height: auto;"
                  />
                  <div style="position: absolute; top: 20px; left: 20px;">
                      <img
                        src="${headerLogo}"
                        alt="Die Linke Frankfurt Logo"
                        class="logo"
                        width="120"
                        height="auto"
                        style="display: block;"
                      />
                  </div>
                </td>
              </tr>
              
              <tr>
                <td class="content">
                  <table width="100%" cellPadding="0" cellSpacing="0" border="0">
                    <!-- Introduction -->
                    <tr>
                      <td class="introduction">
                        <h2 class="section-title">Einleitung</h2>
                        <div>${introductionText}</div>
                      </td>
                    </tr>

                    <!-- Featured Events -->
                    ${featuredEventsHtml}

                    <!-- Upcoming Events -->
                    ${upcomingEventsHtml}
                  </table>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td class="footer">
                  <div>${footerText}</div>
                  
                  <p>
                    <a href="${unsubscribeLink}" class="unsubscribe">
                      Vom Newsletter abmelden
                    </a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
`;
}