import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/auth';
import { renderNotificationEmail } from '@/lib/email';
import { getBaseUrl } from '@/lib/base-url';
// import prisma from '@/lib/db/prisma'; // Not currently used in preview

interface Props {
  params: Promise<{
    template: string;
  }>;
}

/**
 * GET /api/admin/email-preview/[template]
 * 
 * Generates a preview of notification email templates using sample data.
 * Requires admin authentication.
 */
export const GET = withAdminAuth(async (request: NextRequest, { params }: Props) => {
  try {

    const { template } = await params;
    const baseUrl = getBaseUrl();

    // Sample data - defined here to be available in all cases
    const sampleAntrag = {
      id: 'sample-id',
      title: 'Beispielantrag für Veranstaltungsförderung',
      firstName: 'Max',
      lastName: 'Mustermann',
      email: 'max.mustermann@example.com',
      summary: 'Antrag zur Förderung einer politischen Bildungsveranstaltung zum Thema Klimagerechtigkeit.',
      purposes: JSON.stringify({
        zuschuss: { enabled: true, amount: 500 },
        personelleUnterstuetzung: { enabled: true, details: 'Unterstützung bei der Moderation' },
        raumbuchung: { enabled: false },
        weiteres: { enabled: false }
      }),
      status: 'NEU' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      decisionComment: null,
      decidedAt: null
    };

    const sampleGroup = {
      id: 'sample-group-id',
      name: 'Arbeitskreis Klimagerechtigkeit',
      slug: 'ak-klimagerechtigkeit',
      description: 'Wir arbeiten zu Themen der Klimagerechtigkeit und nachhaltigen Stadtentwicklung.',
      logoUrl: null,
      status: 'ACTIVE' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: null,
      responsiblePersons: [
        {
          id: 'person-1',
          firstName: 'Anna',
          lastName: 'Schmidt',
          email: 'anna.schmidt@example.com',
          phone: '+49 123 456789',
          groupId: 'sample-group-id',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]
    };

    const sampleStatusReport = {
      id: 'sample-report-id',
      title: 'Aktivitätsbericht November 2025',
      content: '<p>Im November haben wir eine Podiumsdiskussion zum Thema Klimagerechtigkeit organisiert und am Klimastreik teilgenommen.</p>',
      status: 'ACTIVE' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      groupId: 'sample-group-id',
      reporterFirstName: 'Anna',
      reporterLastName: 'Schmidt',
      fileUrls: '["https://example.com/files/bericht.pdf"]',
      group: {
        id: 'sample-group-id',
        name: 'Arbeitskreis Klimagerechtigkeit',
        slug: 'ak-klimagerechtigkeit',
        description: 'Wir arbeiten zu Themen der Klimagerechtigkeit.',
        logoUrl: null,
        status: 'ACTIVE' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: null,
        responsiblePersons: [
          {
            id: 'person-1',
            firstName: 'Anna',
            lastName: 'Schmidt',
            email: 'anna.schmidt@example.com',
            phone: '+49 123 456789',
            groupId: 'sample-group-id',
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ]
      }
    };

    let html: string;

    switch (template) {
      case 'newsletter':
        // Redirect to the dedicated newsletter endpoint
        return NextResponse.redirect(new URL('/api/admin/email-preview/newsletter', request.url));

      case 'antrag-submission':
        const sampleFileUrls = [
          'https://example.com/files/konzept.pdf',
          'https://example.com/files/kostenplan.xlsx'
        ];

        const adminUrl = `${baseUrl}/admin/antraege/${sampleAntrag.id}`;

        html = await renderNotificationEmail('AntragSubmission', {
          antrag: sampleAntrag,
          fileUrls: sampleFileUrls,
          adminUrl
        });
        break;

      case 'group-acceptance':
        const statusReportFormUrl = `${baseUrl}/gruppen-bericht`;

        html = await renderNotificationEmail('GroupAcceptance', {
          group: sampleGroup,
          headerLogo: '/images/logo.png',
          baseUrl,
          recipientEmail: 'anna.schmidt@example.com',
          recipientName: 'Anna Schmidt',
          statusReportFormUrl,
          contactEmail: 'info@die-linke-frankfurt.de'
        });
        break;

      case 'group-rejection':
        html = await renderNotificationEmail('GroupRejection', {
          group: sampleGroup,
          headerLogo: '/images/logo.png',
          baseUrl,
          recipientEmail: 'anna.schmidt@example.com',
          recipientName: 'Anna Schmidt',
          contactEmail: 'info@die-linke-frankfurt.de'
        });
        break;

      case 'group-archiving':
        html = await renderNotificationEmail('GroupArchiving', {
          group: sampleGroup,
          headerLogo: '/images/logo.png',
          baseUrl,
          recipientEmail: 'anna.schmidt@example.com',
          recipientName: 'Anna Schmidt',
          contactEmail: 'info@die-linke-frankfurt.de'
        });
        break;

      case 'status-report-acceptance':
        const reportUrl = `${baseUrl}/gruppen/${sampleStatusReport.group.slug}#report-${sampleStatusReport.id}`;

        html = await renderNotificationEmail('StatusReportAcceptance', {
          statusReport: sampleStatusReport,
          headerLogo: '/images/logo.png',
          baseUrl,
          recipientEmail: 'anna.schmidt@example.com',
          recipientName: 'Anna Schmidt',
          reportUrl,
          contactEmail: 'info@die-linke-frankfurt.de'
        });
        break;

      case 'status-report-rejection':
        html = await renderNotificationEmail('StatusReportRejection', {
          statusReport: sampleStatusReport,
          headerLogo: '/images/logo.png',
          baseUrl,
          recipientEmail: 'anna.schmidt@example.com',
          recipientName: 'Anna Schmidt',
          contactEmail: 'info@die-linke-frankfurt.de'
        });
        break;

      case 'status-report-archiving':
        html = await renderNotificationEmail('StatusReportArchiving', {
          statusReport: sampleStatusReport,
          headerLogo: '/images/logo.png',
          baseUrl,
          recipientEmail: 'anna.schmidt@example.com',
          recipientName: 'Anna Schmidt',
          contactEmail: 'info@die-linke-frankfurt.de'
        });
        break;

      case 'antrag-acceptance':
        html = await renderNotificationEmail('AntragAcceptance', {
          antrag: sampleAntrag,
          headerLogo: '/images/logo.png',
          baseUrl,
          recipientEmail: 'max.mustermann@example.com',
          recipientName: 'Max Mustermann',
          decisionComment: 'Ihr Antrag wurde nach sorgfältiger Prüfung genehmigt. Wir freuen uns auf die Zusammenarbeit.',
          contactEmail: 'info@die-linke-frankfurt.de'
        });
        break;

      case 'antrag-rejection':
        html = await renderNotificationEmail('AntragRejection', {
          antrag: sampleAntrag,
          headerLogo: '/images/logo.png',
          baseUrl,
          recipientEmail: 'max.mustermann@example.com',
          recipientName: 'Max Mustermann',
          decisionComment: 'Leider können wir Ihren Antrag in der aktuellen Form nicht genehmigen. Bitte überarbeiten Sie den Antrag entsprechend unserer Richtlinien.',
          contactEmail: 'info@die-linke-frankfurt.de'
        });
        break;

      default:
        return NextResponse.json(
          { error: `Unknown template: ${template}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      html,
      template,
      message: `${template} preview generated successfully`
    });

  } catch (error) {
    const { template } = await params;
    console.error(`Email preview generation error for template ${template}:`, error);
    return NextResponse.json(
      { 
        error: `Failed to generate ${template} preview`,
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
});