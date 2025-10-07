import { NewsletterSettings, EmailTemplateParams, NewsletterAnalyticsParams } from '@/types/newsletter-types';
import { NEWSLETTER_LIMITS, STATUS_REPORT_LIMITS } from './constants';
// Helper functions moved to newsletter-helpers.ts for better modularity

// Helper functions have been moved to newsletter-helpers.ts

/**
 * Generate complete newsletter HTML using React Email
 * Maintains backward compatibility with existing function signature
 * Optionally integrates analytics tracking when analytics parameters are provided
 */
export async function generateNewsletterHtml(
  params: EmailTemplateParams, 
  analyticsParams?: NewsletterAnalyticsParams
): Promise<string> {
  try {
    // Use the React Email render utility with proper type conversion
    const { renderNewsletter } = await import('@/lib/email');
    let html = await renderNewsletter(params);

    // Apply analytics tracking if analytics token is provided
    if (analyticsParams?.analyticsToken) {
      const { addTrackingToNewsletter } = await import('./tracking-service');
      html = addTrackingToNewsletter(html, analyticsParams.analyticsToken, params.baseUrl);
    }
    
    return html;
  } catch (error) {
    throw new Error(`Newsletter generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get default newsletter settings
 */
export function getDefaultNewsletterSettings(): NewsletterSettings {
  return {
    headerLogo: '/images/logo.png',
    headerBanner: '/images/header-bg.jpg',
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
    retryChunkSizes: '10,5,1', // Comma-separated retry chunk sizes

    // Newsletter content limits
    maxFeaturedAppointments: NEWSLETTER_LIMITS.FEATURED_APPOINTMENTS.DEFAULT,
    maxUpcomingAppointments: NEWSLETTER_LIMITS.UPCOMING_APPOINTMENTS.DEFAULT,
    maxStatusReportsPerGroup: NEWSLETTER_LIMITS.STATUS_REPORTS_PER_GROUP.DEFAULT,
    maxGroupsWithReports: NEWSLETTER_LIMITS.GROUPS_WITH_REPORTS.DEFAULT,

    // Status report limits
    statusReportTitleLimit: STATUS_REPORT_LIMITS.TITLE.DEFAULT,
    statusReportContentLimit: STATUS_REPORT_LIMITS.CONTENT.DEFAULT
  };
}