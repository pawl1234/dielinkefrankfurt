/**
 * Email rendering utilities using React Email
 *
 * Provides server-side rendering capabilities for React Email templates
 * with proper type safety and error handling.
 */

/**
 * Renders notification email templates to HTML string.
 * Uses type-safe overloads for different template types.
 */
export async function renderNotificationEmail(
  templateName: 'AntragSubmission' | 'GroupAcceptance' | 'GroupRejection' | 'GroupArchiving' | 'GroupContactRequest' |
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
      case 'GroupContactRequest':
        TemplateComponent = (await import('../../emails/notifications/group-contact-request')).default;
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
