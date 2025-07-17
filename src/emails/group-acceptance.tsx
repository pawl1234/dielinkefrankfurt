import { Heading, Text, Link, Section, Row, Column } from '@react-email/components';
import { Group, ResponsiblePerson } from '@prisma/client';
import { EmailWrapper } from './components/EmailWrapper';
import { Footer } from './components/Footer';
import { colors, spacing, baseStyles } from './utils/styles';

interface GroupAcceptanceProps {
  group?: Group & { responsiblePersons: ResponsiblePerson[] };
  statusReportFormUrl?: string;
}

// Sample data for development mode
const SAMPLE_DATA = {
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
      },
      {
        id: 'person-2',
        firstName: 'Thomas',
        lastName: 'Weber',
        email: 'thomas.weber@example.com',
        groupId: 'sample-group-id'
      }
    ]
  } as Group & { responsiblePersons: ResponsiblePerson[] },
  statusReportFormUrl: 'https://die-linke-frankfurt.de/gruppen-bericht'
};

/**
 * Email template for group acceptance notifications.
 * 
 * For development: renders with sample data when no props provided
 * For production: uses provided props
 */
export default function GroupAcceptance({ group, statusReportFormUrl }: GroupAcceptanceProps) {
  // Use provided data or fall back to sample data for development
  const emailData = {
    group: group || SAMPLE_DATA.group,
    statusReportFormUrl: statusReportFormUrl || SAMPLE_DATA.statusReportFormUrl
  };

  return (
    <EmailWrapper>
      <Section style={{ padding: spacing.lg, maxWidth: '600px', margin: '0 auto' }}>
        <Row>
          <Column>
            <Heading
              as="h2"
              style={{
                ...baseStyles.heading.h2,
                color: colors.text.primary,
                marginBottom: spacing.lg
              }}
            >
              Ihre Gruppe &quot;{emailData.group.name}&quot; wurde freigeschaltet
            </Heading>
            
            <Text style={{ ...baseStyles.text.base, marginBottom: spacing.md }}>
              Liebe Verantwortliche der Gruppe &quot;{emailData.group.name}&quot;,
            </Text>
            
            <Text style={{ ...baseStyles.text.base, marginBottom: spacing.md }}>
              wir freuen uns, Ihnen mitteilen zu können, dass Ihre Gruppe nun freigeschaltet 
              wurde und auf unserer Website sichtbar ist.
            </Text>
            
            <Text style={{ ...baseStyles.text.base, marginBottom: spacing.md }}>
              Sie können ab sofort Statusberichte für Ihre Gruppe einreichen unter:{' '}
              <Link 
                href={emailData.statusReportFormUrl}
                style={{ ...baseStyles.link.primary }}
              >
                {emailData.statusReportFormUrl}
              </Link>
            </Text>
            
            <Text style={{ ...baseStyles.text.base, marginBottom: spacing.md }}>
              Bei Fragen stehen wir Ihnen gerne zur Verfügung.
            </Text>
            
            <Text style={{ ...baseStyles.text.base, marginBottom: spacing.lg }}>
              Mit solidarischen Grüßen,<br />
              Die Linke Frankfurt am Main
            </Text>
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
export { GroupAcceptance };