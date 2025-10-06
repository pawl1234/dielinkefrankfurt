/**
 * Email rendering utilities using React Email
 *
 * Provides server-side rendering capabilities for React Email templates
 * with proper type safety and error handling.
 */

import { EmailTemplateParams } from '../../types/newsletter-types';
import { NewsletterEmailProps } from '../../types/newsletter-props';

/**
 * Renders the newsletter React Email component to HTML string.
 * Uses dynamic imports for server-side rendering compatibility.
 * Converts EmailTemplateParams to NewsletterEmailProps with proper type safety.
 */
export async function renderNewsletter(params: EmailTemplateParams): Promise<string> {
  try {
    // Dynamic imports for server-side rendering
    const { render } = await import('@react-email/render');
    const Newsletter = (await import('../../emails/newsletter')).default;

    // Convert EmailTemplateParams to NewsletterEmailProps with proper type safety
    const newsletterProps: NewsletterEmailProps = {
      newsletterSettings: params.newsletterSettings,
      subject: params.subject,
      introductionText: params.introductionText,
      featuredAppointments: params.featuredAppointments,
      upcomingAppointments: params.upcomingAppointments,
      statusReportsByGroup: params.statusReportsByGroup || [],
      baseUrl: params.baseUrl
    };

    // Render the newsletter template with properly typed parameters
    const html = await render(Newsletter(newsletterProps));

    return html;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Newsletter rendering failed: ${errorMessage}`);
  }
}

/**
 * Renders notification email templates to HTML string.
 * Uses type-safe overloads for different template types.
 */
export async function renderNotificationEmail(
  templateName: 'AntragSubmission' | 'GroupAcceptance' | 'GroupRejection' | 'GroupArchiving' |
               'StatusReportAcceptance' | 'StatusReportRejection' | 'StatusReportArchiving' |
               'AntragAcceptance' | 'AntragRejection',
  props: Record<string, unknown>
): Promise<string> {
  try {
    const { render } = await import('@react-email/render');

    let TemplateComponent;
    switch (templateName) {
      case 'AntragSubmission':
        TemplateComponent = (await import('../../emails/antrag-submission')).default;
        break;
      case 'GroupAcceptance':
        TemplateComponent = (await import('../../emails/notifications/group-acceptance')).default;
        break;
      case 'GroupRejection':
        TemplateComponent = (await import('../../emails/notifications/group-rejection')).default;
        break;
      case 'GroupArchiving':
        TemplateComponent = (await import('../../emails/notifications/group-archiving')).default;
        break;
      case 'StatusReportAcceptance':
        TemplateComponent = (await import('../../emails/notifications/status-report-acceptance')).default;
        break;
      case 'StatusReportRejection':
        TemplateComponent = (await import('../../emails/notifications/status-report-rejection')).default;
        break;
      case 'StatusReportArchiving':
        TemplateComponent = (await import('../../emails/notifications/status-report-archiving')).default;
        break;
      case 'AntragAcceptance':
        TemplateComponent = (await import('../../emails/notifications/antrag-acceptance')).default;
        break;
      case 'AntragRejection':
        TemplateComponent = (await import('../../emails/notifications/antrag-rejection')).default;
        break;
      default:
        throw new Error(`Unknown template: ${templateName}`);
    }


    const html = await render(TemplateComponent(props as any));
    return html;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Notification email rendering failed for ${templateName}: ${errorMessage}`);
  }
}

/**
 * Renders a React Email component to plain text
 * Useful for creating text versions of email templates
 */
export async function renderToPlainText(
  templateName: 'Newsletter' | 'AntragSubmission' | 'GroupAcceptance' | 'GroupRejection' | 'GroupArchiving' |
               'StatusReportAcceptance' | 'StatusReportRejection' | 'StatusReportArchiving' |
               'AntragAcceptance' | 'AntragRejection',
  props: Record<string, unknown>
): Promise<string> {
  try {
    const { render } = await import('@react-email/render');

    let TemplateComponent;
    switch (templateName) {
      case 'Newsletter':
        TemplateComponent = (await import('../../emails/newsletter')).default;
        break;
      case 'AntragSubmission':
        TemplateComponent = (await import('../../emails/antrag-submission')).default;
        break;
      case 'GroupAcceptance':
        TemplateComponent = (await import('../../emails/notifications/group-acceptance')).default;
        break;
      case 'GroupRejection':
        TemplateComponent = (await import('../../emails/notifications/group-rejection')).default;
        break;
      case 'GroupArchiving':
        TemplateComponent = (await import('../../emails/notifications/group-archiving')).default;
        break;
      case 'StatusReportAcceptance':
        TemplateComponent = (await import('../../emails/notifications/status-report-acceptance')).default;
        break;
      case 'StatusReportRejection':
        TemplateComponent = (await import('../../emails/notifications/status-report-rejection')).default;
        break;
      case 'StatusReportArchiving':
        TemplateComponent = (await import('../../emails/notifications/status-report-archiving')).default;
        break;
      case 'AntragAcceptance':
        TemplateComponent = (await import('../../emails/notifications/antrag-acceptance')).default;
        break;
      case 'AntragRejection':
        TemplateComponent = (await import('../../emails/notifications/antrag-rejection')).default;
        break;
      default:
        throw new Error(`Unknown template for plain text: ${templateName}`);
    }


    const plainText = await render(TemplateComponent(props as any), {
      plainText: true
    });

    return plainText;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Plain text rendering failed for ${templateName}: ${errorMessage}`);
  }
}


/**
 * Utility function to validate template props before rendering
 */
export function validateNewsletterProps(props: NewsletterEmailProps): void {
  const errors: string[] = [];

  if (!props.newsletterSettings) {
    errors.push('Newsletter settings are required');
  }

  if (!props.introductionText || props.introductionText.trim() === '') {
    errors.push('Introduction text is required');
  }

  if (!props.baseUrl || props.baseUrl.trim() === '') {
    errors.push('Base URL is required');
  }

  if (errors.length > 0) {
    throw new Error(`Invalid newsletter props: ${errors.join(', ')}`);
  }
}
