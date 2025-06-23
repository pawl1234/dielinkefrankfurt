import { Appointment, Group, StatusReport } from '@prisma/client';
import { de } from 'date-fns/locale';
import { formatInTimeZone } from 'date-fns-tz';

// Custom type for newsletter settings with defaults
export interface NewsletterSettings {
  headerLogo: string;
  headerBanner: string;
  footerText: string;
  unsubscribeLink: string;
  id?: number;
  createdAt?: Date;
  updatedAt?: Date;
  testEmailRecipients?: string | null;
  
  // Email sending configuration
  batchSize?: number;
  batchDelay?: number;
  fromEmail?: string;
  fromName?: string;
  replyToEmail?: string;
  subjectTemplate?: string;
  emailSalt?: string;

  // Newsletter sending performance settings
  chunkSize?: number;
  chunkDelay?: number;
  emailTimeout?: number;

  // SMTP connection settings
  connectionTimeout?: number;
  greetingTimeout?: number;
  socketTimeout?: number;
  maxConnections?: number;
  maxMessages?: number;

  // Retry logic settings
  maxRetries?: number;
  maxBackoffDelay?: number;
  retryChunkSizes?: string;
}

// Group with status reports type
export interface GroupWithReports {
  group: Group;
  reports: StatusReport[];
}

// Parameters for email template generation
export interface EmailTemplateParams {
  newsletterSettings: NewsletterSettings;
  introductionText: string;
  featuredAppointments: Appointment[];
  upcomingAppointments: Appointment[];
  statusReportsByGroup?: GroupWithReports[];
  baseUrl: string;
}

/**
 * Helper function to get cover image URL from appointment metadata or fileUrls
 */
export const getCoverImageUrl = (appointment: Appointment): string | null => {
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
    } catch {
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
  } catch {
    return null;
  }
};

/**
 * Set fixed timezone
 */
const timeZone = 'Europe/Berlin';

/**
 * Format date helper (date only)
 */
export const formatDate = (dateString: Date | string): string => {
  return formatInTimeZone(new Date(dateString), timeZone, 'PPP', { locale: de });
};

/**
 * Format date and time helper
 */
export const formatDateTime = (dateString: Date | string): string => {
  return formatInTimeZone(new Date(dateString), timeZone, 'PPP p', { locale: de });
};

/**
 * Format time only helper
 */
export const formatTime = (dateString: Date | string): string => {
  return formatInTimeZone(new Date(dateString), timeZone, 'p', { locale: de });
};

/**
 * Format date range for appointments
 */
export const formatAppointmentDateRange = (startDateTime: Date | string, endDateTime?: Date | string | null): string => {
  const start = new Date(startDateTime);
  
  if (!endDateTime) {
    return formatDateTime(start);
  }
  
  const end = new Date(endDateTime);
  const startDate = formatInTimeZone(start, timeZone, 'PPP', { locale: de });
  const endDate = formatInTimeZone(end, timeZone, 'PPP', { locale: de });
  const startTime = formatInTimeZone(start, timeZone, 'p', { locale: de });
  const endTime = formatInTimeZone(end, timeZone, 'p', { locale: de });
  
  // If same date, show: "5. Juni 2025, 14:00 - 16:00"
  if (startDate === endDate) {
    return `${startDate}, ${startTime} - ${endTime} Uhr`;
  }
  
  // If different dates, show: "5. Juni 2025, 14:00 - 6. Juni 2025, 16:00"
  return `${startDate}, ${startTime} Uhr - ${endDate}, ${endTime} Uhr`;
};

/**
 * Generate featured events HTML section
 */
export const generateFeaturedEventsHtml = (
  featuredAppointments: Appointment[],
  baseUrl: string
): string => {
  if (!featuredAppointments || featuredAppointments.length === 0) {
    return '';
  }
  
  let html = '<tr><td colspan="100%"><h2 class="section-title">Featured</h2></td></tr>';
  
  featuredAppointments.forEach((appointment: Appointment) => {
    const imageUrl = getCoverImageUrl(appointment);
    const detailUrl = `${baseUrl}/termine/${appointment.id}`;
    
    // Use truncated mainText instead of teaser
    const truncatedText = truncateText(appointment.mainText, 300);
    
    html += `
      <tr>
        <td class="featured-event">
          <table width="100%" cellPadding="0" cellSpacing="0" border="0">
            <tr>
              <td class="featured-image-cell" width="35%" valign="top">
                ${imageUrl ? `<img src="${imageUrl}" alt="${appointment.title}" class="featured-image" />` : ''}
              </td>
              <td class="featured-content" width="65%" valign="top">
                <h3 class="event-title">${appointment.title}</h3>
                <p class="upcoming-date">
                  ${formatAppointmentDateRange(appointment.startDateTime, appointment.endDateTime)}
                </p>
                <p class="event-teaser">${truncatedText}</p>
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
  
  return html;
};

/**
 * Generate upcoming events HTML section
 */
export const generateUpcomingEventsHtml = (
  upcomingAppointments: Appointment[],
  baseUrl: string
): string => {
  if (!upcomingAppointments || upcomingAppointments.length === 0) {
    return '';
  }
  
  let html = '<tr><td colspan="100%"><h2 class="section-title">Termine</h2></td></tr>';
  
  upcomingAppointments.forEach((appointment: Appointment) => {
    const detailUrl = `${baseUrl}/termine/${appointment.id}`;
    
    // Use truncated mainText instead of teaser
    const truncatedText = truncateText(appointment.mainText, 200); // Slightly shorter for regular appointments
    
    html += `
      <tr>
        <td class="upcoming-event">
          <h3 class="upcoming-title">${appointment.title}</h3>
          <p class="upcoming-date">
            ${formatAppointmentDateRange(appointment.startDateTime, appointment.endDateTime)}
          </p>
          <p class="event-teaser">${truncatedText}</p>
          <a href="${detailUrl}" class="event-button">
            Mehr Informationen
          </a>
        </td>
      </tr>
    `;
  });
  
  return html;
};

/**
 * Helper function to truncate text to a certain length or number of lines
 */
export const truncateText = (text: string, maxLength: number = 300): string => {
  if (text.length <= maxLength) {
    return text;
  }
  
  // Find the last space within the maxLength
  const lastSpace = text.substring(0, maxLength).lastIndexOf(' ');
  
  // If no space found, just cut at maxLength
  const truncatedText = lastSpace !== -1 ? text.substring(0, lastSpace) : text.substring(0, maxLength);
  
  return truncatedText + '...';
};

/**
 * Generate status reports HTML section
 */
export const generateStatusReportsHtml = (
  statusReportsByGroup: GroupWithReports[],
  baseUrl: string
): string => {
  if (!statusReportsByGroup || statusReportsByGroup.length === 0) {
    return '';
  }
  
  let html = '<tr><td colspan="100%"><h2 class="section-title">Aktuelle Gruppenberichte</h2></td></tr>';
  
  statusReportsByGroup.forEach((groupWithReports, groupIndex) => {
    const { group, reports } = groupWithReports;
    const isLastGroup = groupIndex === statusReportsByGroup.length - 1;
    
    // Only include groups with reports
    if (reports.length === 0) {
      return;
    }
    
    // Add group header
    html += `
      <tr>
        <td class="group-header">
          <table width="100%" cellPadding="0" cellSpacing="0" border="0">
            <tr>
              <td width="60" valign="middle" style="padding-right: 15px;">
                ${group.logoUrl ? `<img src="${group.logoUrl}" alt="${group.name} Logo" class="group-logo" width="60" height="60" />` : `<div class="group-logo-placeholder">${group.name.charAt(0)}</div>`}
              </td>
              <td valign="middle">
                <h3 class="group-name">${group.name}</h3>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `;
    
    // Add reports for this group
    reports.forEach((report) => {
      const reportUrl = `${baseUrl}/gruppen/${group.slug}#report-${report.id}`;
      const truncatedContent = truncateText(report.content);
      
      html += `
        <tr>
          <td class="status-report">
            <h4 class="report-title">${report.title}</h4>
            <p class="report-date">
              ${formatDate(report.createdAt)}
              ${report.reporterFirstName && report.reporterLastName ? ` | ${report.reporterFirstName} ${report.reporterLastName}` : ''}
            </p>
            <div class="report-content">${truncatedContent}</div>
            <a href="${reportUrl}" class="event-button">
              Mehr Infos
            </a>
          </td>
        </tr>
      `;
    });
    
    // Add a separator after the group (except for the last one)
    if (!isLastGroup) {
      html += `
        <tr>
          <td style="padding: 15px 0;">
            <div class="group-separator"></div>
          </td>
        </tr>
      `;
    }
  });
  
  return html;
};

/**
 * Generate complete newsletter HTML
 */
export function generateNewsletterHtml(params: EmailTemplateParams): string {
  const { 
    newsletterSettings, 
    introductionText, 
    featuredAppointments, 
    upcomingAppointments,
    statusReportsByGroup,
    baseUrl 
  } = params;
  
  // Generate HTML sections
  const featuredEventsHtml = generateFeaturedEventsHtml(featuredAppointments, baseUrl);
  const upcomingEventsHtml = generateUpcomingEventsHtml(upcomingAppointments, baseUrl);
  const statusReportsHtml = generateStatusReportsHtml(statusReportsByGroup || [], baseUrl);
  
  // Default logo and banner if none provided
  const headerLogo = newsletterSettings.headerLogo;
  const headerBanner = newsletterSettings.headerBanner;
  const footerText = newsletterSettings.footerText;
  const unsubscribeLink = newsletterSettings.unsubscribeLink;
  
  // Build complete HTML
  return `
    <!DOCTYPE html>
    <html lang="de">
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
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
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
            max-width: 100%;
            height: auto;
            display: block;
          }
          
          .container {
            max-width: 650px;
            margin: 0 auto;
            background-color: #FFFFFF;
          }
          
          .header {
            background-color: #FFFFFF;
            text-align: center;
            padding: 20px 0;
            position: relative;
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
            margin-top: 25px;
            margin-bottom: 15px;
          }
          
          .featured-event {
            margin-bottom: 30px;
            border-bottom: 1px solid #E5E5E5;
            padding-bottom: 20px; /* Space below content before border */
            margin-bottom: 30px; /* Space after border before next item */
          }
          
          .featured-event.has-border {
            border-bottom: 1px solid #E5E5E5;
            padding-bottom: 20px; /* Space below content before border */
            margin-bottom: 30px; /* Space after border before next item */
          }
          
          .featured-image {
            width: 100%;
            height: 200px; /* Fixed height for consistent look */
            object-fit: cover;
            display: block;
          }
          
          .featured-image-cell {
            vertical-align: top;
            padding: 0;
            padding-top: 20px; /* Align with the title */
          }
          
          .featured-content {
            padding: 0 0 0 15px;
            vertical-align: top;
            padding-top: 18px;
          }
          
          .event-title {
            font-size: 20px;
            font-weight: bold;
            margin-top: 0;
            margin-bottom: 5px;
            color: #000000;
            line-height: 1.2;
          }
          
          .event-teaser {
            margin-bottom: 15px;
            margin-top: 10px;
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
            border: none;
          }
          
          .upcoming-event {
            padding: 15px 0;
            border-bottom: 1px solid #E5E5E5;
          }
          
          .upcoming-title {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 5px;
            margin-top: 0px;
            color: #000000;
          }
          
          .upcoming-date {
            font-weight: bold;
            color: #666666;
            margin-top: 0px;
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
          
          .button-container {
            margin-top: 15px;
          }
          
          /* Status Reports Styles */
          .group-header {
            padding: 15px 0;
            margin-top: 10px;
            border-bottom: 1px solid #E5E5E5;
          }
          
          .group-name {
            font-size: 20px;
            font-weight: bold;
            color: #FF0000;
            margin: 0;
          }
          
          .group-logo {
            border-radius: 50%;
            object-fit: cover;
            display: block;
          }
          
          .group-logo-placeholder {
            border-radius: 50%;
            background-color: #FF0000;
            color: #FFFFFF;
            width: 60px;
            height: 60px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            font-weight: bold;
          }
          
          .status-report {
            padding: 15px 0;
            border-bottom: 1px dashed #E5E5E5;
          }
          
          .report-title {
            font-size: 18px;
            font-weight: bold;
            margin-top: 0;
            margin-bottom: 5px;
            color: #000000;
          }
          
          .report-date {
            font-weight: bold;
            font-size: 14px;
            color: #666666;
            margin-top: 0;
            margin-bottom: 10px;
          }
          
          .report-content {
            margin-bottom: 15px;
            color: #333333;
          }
          
          .group-separator {
            border-bottom: 2px solid #ff0000;
            width: 30%;
            margin: 0 auto;
          }
          
          @media only screen and (max-width: 650px) {
            .container {
              width: 100% !important;
            }
            
            .content {
              padding: 15px !important;
            }
            
            .event-title {
              font-size: 18px !important;
            }
            
            .featured-image {
              height: 150px !important;
            }
            
            .group-header table,
            .group-header tr,
            .group-header td {
              display: block;
              width: 100% !important;
              text-align: center;
              padding: 5px 0 !important;
            }
            
            .group-logo,
            .group-logo-placeholder {
              margin: 0 auto 10px auto;
            }
            
            .group-name {
              font-size: 18px !important;
              text-align: center;
            }
            
            .report-title {
              font-size: 16px !important;
            }
            
            /* Stack featured event layout on mobile */
            .featured-event table,
            .featured-event tr {
              display: block;
              width: 100% !important;
            }
            
            .featured-image-cell,
            .featured-content {
              display: block;
              width: 100% !important;
              padding: 0 !important;
            }
            
            .featured-content {
              padding-top: 15px !important;
            }
          }
          
          /* Outlook-specific fixes */
          <!--[if mso]>
          <style>
            .group-logo-placeholder {
              background-color: #FF0000 !important;
              -ms-border-radius: 50% !important;
            }
            
            a.event-button {
              background-color: #FF0000 !important;
              color: #FFFFFF !important;
              text-decoration: none !important;
              padding: 10px 20px !important;
              text-align: center !important;
              display: inline-block !important;
            }
          </style>
          <![endif]-->
        </style>
      </head>
      <body>
        <table width="100%" cellPadding="0" cellSpacing="0" border="0">
          <tr>
            <td align="center" valign="top">
              <table class="container" width="650" cellPadding="0" cellSpacing="0" border="0">
                <!-- Header -->
                <tr>
                  <td class="header" style="position: relative; padding: 0; line-height: 0;">
                    <img
                      src="${headerBanner}"
                      alt="Die Linke Frankfurt Banner"
                      class="banner"
                      width="650"
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
                      
                      <!-- Status Reports -->
                      ${statusReportsHtml}
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

/**
 * Get default newsletter settings
 */
export function getDefaultNewsletterSettings(): NewsletterSettings {
  return {
    headerLogo: 'public/images/logo.png',
    headerBanner: 'public/images/header-bg.jpg',
    footerText: 'Die Linke Frankfurt am Main',
    unsubscribeLink: '#',
    testEmailRecipients: 'buero@linke-frankfurt.de',
    
    // Default email sending configuration
    batchSize: 100,
    batchDelay: 1000,
    fromEmail: 'newsletter@linke-frankfurt.de',
    fromName: 'Die Linke Frankfurt',
    replyToEmail: 'buero@linke-frankfurt.de',
    subjectTemplate: 'Die Linke Frankfurt - Newsletter {date}',

    // Newsletter sending performance settings (BCC-only mode)
    chunkSize: 50,           // Number of BCC recipients per email
    chunkDelay: 200,         // Milliseconds between chunks (reduced for faster processing)
    emailTimeout: 30000,     // Email sending timeout in milliseconds (reduced for faster failures)

    // SMTP connection settings (optimized for single-connection usage)
    connectionTimeout: 20000, // SMTP connection timeout in milliseconds (faster connection)
    greetingTimeout: 20000,   // SMTP greeting timeout in milliseconds (faster greeting)
    socketTimeout: 30000,     // SMTP socket timeout in milliseconds (faster socket timeout)
    maxConnections: 1,        // Single connection per transporter (no pooling)
    maxMessages: 1,          // Single message per connection (clean lifecycle)

    // Retry logic settings (current optimized values)
    maxRetries: 3,            // Maximum verification retries
    maxBackoffDelay: 10000,   // Maximum backoff delay in milliseconds
    retryChunkSizes: '10,5,1' // Comma-separated retry chunk sizes
  };
}