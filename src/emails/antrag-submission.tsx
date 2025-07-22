import { Heading, Text, Hr, Section, Row, Column, Link } from '@react-email/components';
import { Antrag } from '@prisma/client';
import { EmailWrapper } from './components/EmailWrapper';
import { Footer } from './components/Footer';
import { Button } from './components/Button';

interface AntragSubmissionProps {
  antrag?: Antrag;
  fileUrls?: string[];
  adminUrl?: string;
}

// Sample data for development mode
const SAMPLE_DATA = {
  antrag: {
    id: 'sample-antrag-id',
    title: 'Beispielantrag für Veranstaltungsförderung',
    firstName: 'Max',
    lastName: 'Mustermann',
    email: 'max.mustermann@example.com',
    summary: 'Antrag zur Förderung einer politischen Bildungsveranstaltung zum Thema Klimagerechtigkeit mit Workshop-Charakter.',
    purposes: JSON.stringify({
      zuschuss: { enabled: true, amount: 500 },
      personelleUnterstuetzung: { enabled: true, details: 'Unterstützung bei der Moderation und Technik' },
      raumbuchung: { enabled: true, location: 'Bürgerhaus Bockenheim', numberOfPeople: 50, details: 'Großer Saal mit Beamer' },
      weiteres: { enabled: true, details: 'Catering für die Teilnehmer' }
    }),
    status: 'NEU' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    decisionComment: null,
    decidedAt: null
  } as Antrag,
  fileUrls: [
    'https://example.com/files/konzept.pdf',
    'https://example.com/files/kostenplan.xlsx',
    'https://example.com/files/terminplanung.docx'
  ],
  adminUrl: 'https://die-linke-frankfurt.de/admin/antraege/sample-antrag-id'
};

/**
 * Email template for Antrag submission notifications to administrators.
 * 
 * For development: renders with sample data when no props provided
 * For production: uses provided props
 */
export default function AntragSubmission({ antrag, fileUrls, adminUrl }: AntragSubmissionProps) {
  // Use provided data or fall back to sample data for development
  const emailData = {
    antrag: antrag || SAMPLE_DATA.antrag,
    fileUrls: fileUrls || SAMPLE_DATA.fileUrls,
    adminUrl: adminUrl || SAMPLE_DATA.adminUrl
  };

  const submissionDate = new Date(emailData.antrag.createdAt || new Date()).toLocaleDateString('de-DE');
  
  // Format purposes - simplified for now, can be enhanced later
  const formatPurposes = (purposes: string | Record<string, unknown>): string => {
    try {
      const purposesObj = typeof purposes === 'string' ? JSON.parse(purposes) : purposes;
      const purposesList: string[] = [];
      
      if (purposesObj.zuschuss?.enabled) {
        purposesList.push(`Finanzieller Zuschuss: ${purposesObj.zuschuss.amount} €`);
      }
      if (purposesObj.personelleUnterstuetzung?.enabled) {
        purposesList.push(`Personelle Unterstützung: ${purposesObj.personelleUnterstuetzung.details}`);
      }
      if (purposesObj.raumbuchung?.enabled) {
        purposesList.push(`Raumbuchung: ${purposesObj.raumbuchung.location} (${purposesObj.raumbuchung.numberOfPeople} Personen)`);
      }
      if (purposesObj.weiteres?.enabled) {
        purposesList.push(`Weiteres: ${purposesObj.weiteres.details}`);
      }
      
      return purposesList.length > 0 ? purposesList.join(', ') : 'Keine Zwecke ausgewählt';
    } catch {
      return 'Fehler beim Anzeigen der Zwecke';
    }
  };

  return (
    <EmailWrapper>
      {/* Header Section */}
      <Section style={headerSection}>
        <Heading as="h1" style={h1}>
          Neuer Antrag an Kreisvorstand
        </Heading>
        <Text style={text}>
          Eingegangen am: {submissionDate}
        </Text>
      </Section>

      {/* Main Content Section */}
      <Section style={mainSection}>
        {/* Antragsteller Section */}
        <Row>
          <Column>
            <Heading as="h2" style={h2}>
              Antragsteller
            </Heading>
            
            <Row style={rowSpacing}>
              <Column style={labelColumn}>
                <Text style={labelText}>
                  Name:
                </Text>
              </Column>
              <Column>
                <Text style={text}>
                  {emailData.antrag.firstName} {emailData.antrag.lastName}
                </Text>
              </Column>
            </Row>
            
            <Row style={rowSpacingLarge}>
              <Column style={labelColumn}>
                <Text style={labelText}>
                  E-Mail:
                </Text>
              </Column>
              <Column>
                <Text style={text}>
                  {emailData.antrag.email}
                </Text>
              </Column>
            </Row>
            
            <Hr style={hrStyle} />
            
            <Heading as="h3" style={h3}>
              Antragsinhalt
            </Heading>
            
            <Row style={rowSpacing}>
              <Column style={labelColumn}>
                <Text style={labelText}>
                  Titel:
                </Text>
              </Column>
              <Column>
                <Text style={text}>
                  {emailData.antrag.title}
                </Text>
              </Column>
            </Row>
            
            <Row style={rowSpacing}>
              <Column style={labelColumnTop}>
                <Text style={labelText}>
                  Zweck:
                </Text>
              </Column>
              <Column>
                <Text style={text}>
                  {formatPurposes(emailData.antrag.purposes)}
                </Text>
              </Column>
            </Row>
            
            <Row style={rowSpacingLarge}>
              <Column style={labelColumnTop}>
                <Text style={labelText}>
                  Zusammenfassung:
                </Text>
              </Column>
              <Column>
                <Text style={text}>
                  {emailData.antrag.summary}
                </Text>
              </Column>
            </Row>

            {emailData.fileUrls && emailData.fileUrls.length > 0 && (
              <>
                <Hr style={hrStyle} />
                <Heading as="h3" style={h3}>
                  Anhänge ({emailData.fileUrls.length})
                </Heading>
                {emailData.fileUrls.map((url, index) => (
                  <Text key={index} style={fileText}>
                    <Link href={url} target="_blank" style={linkStyle}>
                      Anhang {index + 1}
                    </Link>
                  </Text>
                ))}
              </>
            )}

            <Hr style={hrStyle} />

            {/* Admin Actions Section */}
            <Section style={adminSection}>
              <Row>
                <Column>
                  <Text style={adminText}>
                    Administrative Aktionen
                  </Text>
                  <Button href={emailData.adminUrl} />
                </Column>
              </Row>
            </Section>
          </Column>
        </Row>
      </Section>

      <Footer 
        text="Die Linke Frankfurt am Main"
        unsubscribeLink="#"
        newsletter={false}
      />
    </EmailWrapper>
  );
}

// Named export for backward compatibility with existing production code
export { AntragSubmission };

// Styles following React Email and apple.tsx patterns
const headerSection = {
  backgroundColor: '#F8F9FA',
  paddingLeft: "20px",
  paddingRight: "20px",
  borderRadius: '10px',
};

const mainSection = {
  backgroundColor: '#FFFFFF',
  marginTop: "20px",
  paddingLeft: "20px",
  paddingRight: "20px",
  borderRadius: '10px',
};

const h1 = {
  fontSize: '32px',
  fontWeight: 'bold',
  color: '#333333',
  lineHeight: '1.2',
  margin: '0'
};

const h2 = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#333333',
  lineHeight: '1.2',
  margin: '0',
  borderBottom: '2px solid #E9ECEF',
  paddingBottom: '10px',
  marginBottom: '20px'
};

const h3 = {
  fontSize: '20px',
  fontWeight: 'bold',
  color: '#333333',
  lineHeight: '1.2',
  margin: '0',
  marginBottom: '10px'
};

const text = {
  fontSize: '16px',
  color: '#333333',
  lineHeight: '1.5',
  margin: '0'
};

const labelText = {
  fontSize: '16px',
  color: '#333333',
  lineHeight: '1.5',
  margin: '0',
  fontWeight: 'bold'
};

const fileText = {
  fontSize: '16px',
  color: '#333333',
  lineHeight: '1.5',
  margin: '0',
  marginBottom: '5px'
};

const adminText = {
  fontSize: '16px',
  color: '#333333',
  lineHeight: '1.5',
  margin: '0 0 10px 0',
  fontWeight: 'bold'
};

const rowSpacing = {
  marginBottom: '5px'
};

const rowSpacingLarge = {
  marginBottom: '20px'
};

const labelColumn = {
  width: '150px'
};

const labelColumnTop = {
  width: '150px',
  verticalAlign: 'top'
};

const hrStyle = {
  margin: '20px 0',
  borderColor: '#E9ECEF'
};

const adminSection = {
  backgroundColor: '#F8F9FA',
  padding: '15px',
  borderRadius: '8px',
  textAlign: 'center' as const
};

const linkStyle = {
  color: '#FF0000',
  textDecoration: 'underline'
};