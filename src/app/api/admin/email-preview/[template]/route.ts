import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api-auth';
import { renderNotificationEmail } from '@/lib/email-render';
import { getBaseUrl } from '@/lib/base-url';
// import prisma from '@/lib/prisma'; // Not currently used in preview

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

    let html: string;

    switch (template) {
      case 'newsletter':
        // Redirect to the dedicated newsletter endpoint
        return NextResponse.redirect(new URL('/api/admin/email-preview/newsletter', request.url));

      case 'antrag-submission':
        // Sample Antrag data
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
        // Sample Group data
        const sampleGroup = {
          id: 'sample-group-id',
          name: 'Arbeitskreis Klimagerechtigkeit',
          slug: 'ak-klimagerechtigkeit',
          description: 'Wir arbeiten zu Themen der Klimagerechtigkeit und nachhaltigen Stadtentwicklung.',
          logoUrl: null,
          status: 'ACTIVE' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
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

        const statusReportFormUrl = `${baseUrl}/gruppen-bericht`;

        html = await renderNotificationEmail('GroupAcceptance', {
          group: sampleGroup,
          statusReportFormUrl
        });
        break;

      case 'status-report-acceptance':
        // Sample Status Report data
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

        const reportUrl = `${baseUrl}/gruppen/${sampleStatusReport.group.slug}#report-${sampleStatusReport.id}`;
        const reportFileUrls = JSON.parse(sampleStatusReport.fileUrls);

        html = await renderNotificationEmail('StatusReportAcceptance', {
          statusReport: sampleStatusReport,
          reportUrl,
          fileUrls: reportFileUrls
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