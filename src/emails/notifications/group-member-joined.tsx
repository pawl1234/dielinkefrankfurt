/**
 * Group Member Joined Email Template
 *
 * React Email template for notifying group responsible persons when a new member joins.
 */

import { Section, Text, Hr, Link } from '@react-email/components';
import { EmailWrapper } from '../components/EmailWrapper';
import { NotificationHeader } from '../components/NotificationHeader';
import { StatusSection } from '../components/StatusSection';
import { DetailsList } from '../components/DetailsList';
import { Footer } from '../components/Footer';

export interface GroupMemberJoinedEmailProps {
  groupName: string;
  groupSlug: string;
  memberName: string;
  memberEmail: string;
  joinedAt: string;
  baseUrl: string;
  headerLogo?: string;
  contactEmail?: string;
}

/**
 * Group member joined notification email template.
 * Notifies responsible persons when a new member joins their group.
 */
export default function GroupMemberJoinedEmail({
  groupName,
  groupSlug,
  memberName,
  memberEmail,
  joinedAt,
  baseUrl,
  headerLogo,
  contactEmail = process.env.CONTACT_EMAIL || 'info@die-linke-frankfurt.de'
}: GroupMemberJoinedEmailProps) {
  const joinedAtFormatted = new Date(joinedAt).toLocaleString('de-DE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });

  const memberDetails = [
    { label: 'Name', value: memberName },
    { label: 'E-Mail', value: memberEmail },
    { label: 'Beigetreten am', value: joinedAtFormatted }
  ];

  const groupUrl = `${baseUrl}/portal/gruppen/${groupSlug}/mitglieder`;

  return (
    <EmailWrapper>
      {/* Header with logo only */}
      <NotificationHeader logo={headerLogo || ''} />

      {/* Info status section */}
      <StatusSection
        type="info"
        title="Neues Mitglied beigetreten"
        subtitle={`Ein neues Mitglied ist der Gruppe "${groupName}" beigetreten`}
      />

      {/* Main content */}
      <Section style={mainSection}>
        <Text style={greetingText}>
          Liebe Verantwortliche der Gruppe &quot;{groupName}&quot;,
        </Text>

        <Text style={bodyText}>
          Ein neues Mitglied ist Ihrer Gruppe beigetreten.
        </Text>

        <Hr style={hrStyle} />

        {/* Member details */}
        <DetailsList items={memberDetails} />

        <Hr style={hrStyle} />

        <Text style={bodyText}>
          Sie können die Mitgliederliste Ihrer Gruppe im Portal einsehen:
        </Text>

        <Link href={groupUrl} style={linkStyle}>
          Mitgliederliste anzeigen
        </Link>

        <Text style={signatureText}>
          Mit freundlichen Grüßen,<br />
          Das Team von Die Linke Frankfurt
        </Text>
      </Section>

      {/* Footer */}
      <Footer
        text={`Die Linke Frankfurt | ${contactEmail}`}
        unsubscribeLink="#"
        newsletter={false}
      />
    </EmailWrapper>
  );
}

// Simple inline styles following existing pattern
const mainSection = {
  backgroundColor: '#FFFFFF',
  padding: '20px',
  borderRadius: '8px',
  marginBottom: '20px'
};

const greetingText = {
  fontSize: '18px',
  color: '#333333',
  lineHeight: '1.5',
  margin: '0 0 20px 0',
  fontWeight: 'bold'
};

const bodyText = {
  fontSize: '16px',
  color: '#333333',
  lineHeight: '1.5',
  margin: '0 0 20px 0'
};

const signatureText = {
  fontSize: '16px',
  color: '#333333',
  lineHeight: '1.5',
  margin: '30px 0 0 0'
};

const hrStyle = {
  margin: '20px 0',
  borderColor: '#E5E5E5'
};

const linkStyle = {
  display: 'inline-block',
  backgroundColor: '#E3000F',
  color: '#FFFFFF',
  padding: '12px 24px',
  textDecoration: 'none',
  borderRadius: '4px',
  fontWeight: 'bold',
  margin: '10px 0 20px 0'
};
