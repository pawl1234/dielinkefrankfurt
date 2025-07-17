import { Heading, Text, Link } from '@react-email/components';
import { StatusReport, Group, ResponsiblePerson } from '@prisma/client';
import { EmailWrapper } from './components/EmailWrapper';
import { Footer } from './components/Footer';

interface StatusReportAcceptanceProps {
  statusReport?: StatusReport & {
    group: Group & { responsiblePersons: ResponsiblePerson[] };
  };
  reportUrl?: string;
  fileUrls?: string[];
}

// Sample data for development mode
const SAMPLE_DATA = {
  statusReport: {
    id: 'sample-report-id',
    title: 'Aktivitätsbericht Dezember 2024',
    content: '<p>Im Dezember haben wir eine sehr erfolgreiche Podiumsdiskussion zum Thema Klimagerechtigkeit organisiert. Über 80 Teilnehmer haben an der Veranstaltung teilgenommen und lebhaft diskutiert.</p><p>Außerdem haben wir am Klimastreik in der Innenstadt teilgenommen und einen Infostand betreut.</p>',
    status: 'ACTIVE' as const,
    createdAt: new Date('2024-12-15'),
    updatedAt: new Date(),
    groupId: 'sample-group-id',
    reporterFirstName: 'Anna',
    reporterLastName: 'Schmidt',
    fileUrls: '["https://example.com/files/bericht.pdf", "https://example.com/files/fotos.zip"]',
    group: {
      id: 'sample-group-id',
      name: 'Arbeitskreis Klimagerechtigkeit',
      slug: 'ak-klimagerechtigkeit',
      description: 'Wir arbeiten zu Themen der Klimagerechtigkeit und nachhaltigen Stadtentwicklung.',
      logoUrl: null,
      metadata: null,
      status: 'ACTIVE' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      responsiblePersons: [
        {
          id: 'person-1',
          firstName: 'Anna',
          lastName: 'Schmidt',
          email: 'anna.schmidt@example.com',
          groupId: 'sample-group-id'
        }
      ]
    }
  } as StatusReport & {
    group: Group & { responsiblePersons: ResponsiblePerson[] };
  },
  reportUrl: 'https://die-linke-frankfurt.de/gruppen/ak-klimagerechtigkeit#report-sample-report-id',
  fileUrls: [
    'https://example.com/files/bericht.pdf',
    'https://example.com/files/fotos.zip'
  ]
};

/**
 * Email template for status report acceptance notifications.
 * 
 * For development: renders with sample data when no props provided
 * For production: uses provided props
 */
export default function StatusReportAcceptance({ statusReport, reportUrl, fileUrls }: StatusReportAcceptanceProps) {
  // Use provided data or fall back to sample data for development
  const emailData = {
    statusReport: statusReport || SAMPLE_DATA.statusReport,
    reportUrl: reportUrl || SAMPLE_DATA.reportUrl,
    fileUrls: fileUrls || SAMPLE_DATA.fileUrls
  };

  const date = new Date(emailData.statusReport.createdAt).toLocaleDateString('de-DE');

  return (
    <EmailWrapper>
      <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
        <Heading
          as="h2"
          style={{
            color: '#333',
            marginBottom: '20px'
          }}
        >
          Statusbericht &quot;{emailData.statusReport.title}&quot; wurde freigeschaltet
        </Heading>
        
        <Text style={{ marginBottom: '15px' }}>
          Liebe Verantwortliche der Gruppe &quot;{emailData.statusReport.group.name}&quot;,
        </Text>
        
        <Text style={{ marginBottom: '15px' }}>
          wir möchten Sie darüber informieren, dass der Statusbericht &quot;{emailData.statusReport.title}&quot; 
          vom {date} nun freigeschaltet wurde und auf unserer Website sichtbar ist.
        </Text>
        
        <Text style={{ marginBottom: '15px' }}>
          Sie können den Bericht hier einsehen:{' '}
          <Link 
            href={emailData.reportUrl}
            style={{ color: '#FF0000' }}
          >
            {emailData.reportUrl}
          </Link>
        </Text>

        {emailData.fileUrls && emailData.fileUrls.length > 0 && (
          <>
            <Heading
              as="h3"
              style={{
                color: '#333',
                fontSize: '18px',
                marginTop: '20px',
                marginBottom: '10px'
              }}
            >
              Anhänge:
            </Heading>
            <ul style={{ marginBottom: '20px' }}>
              {emailData.fileUrls.map((url, index) => (
                <li key={index} style={{ marginBottom: '5px' }}>
                  <Link 
                    href={url} 
                    target="_blank"
                    style={{ color: '#FF0000' }}
                  >
                    Anhang {index + 1}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
        
        <Text style={{ marginBottom: '15px' }}>
          Bei Fragen stehen wir Ihnen gerne zur Verfügung.
        </Text>
        
        <Text style={{ marginBottom: '20px' }}>
          Mit solidarischen Grüßen,<br />
          Die Linke Frankfurt am Main
        </Text>
      </div>

      <Footer 
        text="Die Linke Frankfurt am Main"
        unsubscribeLink="#"
      />
    </EmailWrapper>
  );
}

// Named export for backward compatibility with existing production code
export { StatusReportAcceptance };