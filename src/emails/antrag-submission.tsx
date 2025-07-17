import { Heading, Text, Hr, Section, Row, Column, Link } from '@react-email/components';
import { Antrag } from '@prisma/client';
import { EmailWrapper } from './components/EmailWrapper';
import { Footer } from './components/Footer';
import { colors, typography, spacing, baseStyles } from './utils/styles';

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
      <Section
        style={{
          backgroundColor: colors.background.gray,
          padding: spacing.lg,
          borderRadius: '10px',
          margin: `${spacing.lg} ${spacing.lg} ${spacing.lg} ${spacing.lg}`
        }}
      >
        <Row>
          <Column>
            <Heading
              as="h1"
              style={{
                ...baseStyles.heading.h1,
                color: colors.text.primary,
                marginTop: '0',
                marginBottom: spacing.sm
              }}
            >
              Neuer Antrag an Kreisvorstand
            </Heading>
            <Text
              style={{
                ...baseStyles.text.base,
                color: colors.text.secondary,
                margin: '0'
              }}
            >
              Eingegangen am: {submissionDate}
            </Text>
          </Column>
        </Row>
      </Section>

      {/* Main Content Section */}
      <Section
        style={{
          backgroundColor: colors.background.white,
          padding: spacing.lg,
          borderRadius: '10px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          margin: `0 ${spacing.lg} ${spacing.lg} ${spacing.lg}`
        }}
      >
        {/* Antragsteller Section */}
        <Row>
          <Column>
            <Heading
              as="h2"
              style={{
                ...baseStyles.heading.h2,
                color: colors.text.primary,
                borderBottom: `2px solid ${colors.border.gray}`,
                paddingBottom: spacing.sm,
                marginBottom: spacing.lg
              }}
            >
              Antragsteller
            </Heading>
            
            <Row style={{ marginBottom: spacing.xs }}>
              <Column style={{ width: '150px' }}>
                <Text style={{ ...baseStyles.text.base, fontWeight: typography.fontWeight.bold }}>
                  Name:
                </Text>
              </Column>
              <Column>
                <Text style={{ ...baseStyles.text.base }}>
                  {emailData.antrag.firstName} {emailData.antrag.lastName}
                </Text>
              </Column>
            </Row>
            
            <Row style={{ marginBottom: spacing.lg }}>
              <Column style={{ width: '150px' }}>
                <Text style={{ ...baseStyles.text.base, fontWeight: typography.fontWeight.bold }}>
                  E-Mail:
                </Text>
              </Column>
              <Column>
                <Text style={{ ...baseStyles.text.base }}>
                  {emailData.antrag.email}
                </Text>
              </Column>
            </Row>
            
            <Hr style={{ margin: `${spacing.lg} 0`, borderColor: colors.border.gray }} />
            
            <Heading
              as="h3"
              style={{
                ...baseStyles.heading.h3,
                color: colors.text.primary,
                marginBottom: spacing.sm
              }}
            >
              Antragsinhalt
            </Heading>
            
            <Row style={{ marginBottom: spacing.xs }}>
              <Column style={{ width: '150px' }}>
                <Text style={{ ...baseStyles.text.base, fontWeight: typography.fontWeight.bold }}>
                  Titel:
                </Text>
              </Column>
              <Column>
                <Text style={{ ...baseStyles.text.base }}>
                  {emailData.antrag.title}
                </Text>
              </Column>
            </Row>
            
            <Row style={{ marginBottom: spacing.xs }}>
              <Column style={{ width: '150px', verticalAlign: 'top' }}>
                <Text style={{ ...baseStyles.text.base, fontWeight: typography.fontWeight.bold }}>
                  Zweck:
                </Text>
              </Column>
              <Column>
                <Text style={{ ...baseStyles.text.base }}>
                  {formatPurposes(emailData.antrag.purposes)}
                </Text>
              </Column>
            </Row>
            
            <Row style={{ marginBottom: spacing.lg }}>
              <Column style={{ width: '150px', verticalAlign: 'top' }}>
                <Text style={{ ...baseStyles.text.base, fontWeight: typography.fontWeight.bold }}>
                  Zusammenfassung:
                </Text>
              </Column>
              <Column>
                <Text style={{ ...baseStyles.text.base }}>
                  {emailData.antrag.summary}
                </Text>
              </Column>
            </Row>

            {emailData.fileUrls && emailData.fileUrls.length > 0 && (
              <>
                <Hr style={{ margin: `${spacing.lg} 0`, borderColor: colors.border.gray }} />
                <Heading
                  as="h3"
                  style={{
                    ...baseStyles.heading.h3,
                    color: colors.text.primary,
                    marginBottom: spacing.sm
                  }}
                >
                  Anhänge ({emailData.fileUrls.length})
                </Heading>
                {emailData.fileUrls.map((url, index) => (
                  <Text key={index} style={{ ...baseStyles.text.base, marginBottom: spacing.xs }}>
                    <Link href={url} target="_blank" style={{ ...baseStyles.link.primary }}>
                      Anhang {index + 1}
                    </Link>
                  </Text>
                ))}
              </>
            )}

            <Hr style={{ margin: `${spacing.lg} 0`, borderColor: colors.border.gray }} />

            {/* Admin Actions Section */}
            <Section
              style={{
                backgroundColor: colors.background.gray,
                padding: spacing.md,
                borderRadius: '8px',
                textAlign: 'center'
              }}
            >
              <Row>
                <Column>
                  <Text style={{ ...baseStyles.text.base, margin: `0 0 ${spacing.sm} 0`, fontWeight: typography.fontWeight.bold }}>
                    Administrative Aktionen
                  </Text>
                  <Link
                    href={emailData.adminUrl}
                    style={{
                      ...baseStyles.button.primary,
                      display: 'inline-block',
                      backgroundColor: colors.primary,
                      color: colors.text.white,
                      padding: `${spacing.sm} ${spacing.lg}`,
                      textDecoration: 'none',
                      borderRadius: '5px',
                      fontWeight: typography.fontWeight.bold
                    }}
                  >
                    Antrag im Admin-Bereich öffnen
                  </Link>
                </Column>
              </Row>
            </Section>
          </Column>
        </Row>
      </Section>

      <Footer 
        text="Die Linke Frankfurt am Main"
        unsubscribeLink="#"
      />
    </EmailWrapper>
  );
}

// Named export for backward compatibility with existing production code
export { AntragSubmission };