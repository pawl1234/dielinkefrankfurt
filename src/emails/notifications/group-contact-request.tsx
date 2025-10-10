/**
 * Group Contact Request Email Template
 *
 * React Email template for notifying group responsible persons when someone contacts them.
 */

import { Section, Text, Hr } from '@react-email/components';
import { EmailWrapper } from '../components/EmailWrapper';
import { NotificationHeader } from '../components/NotificationHeader';
import { StatusSection } from '../components/StatusSection';
import { DetailsList } from '../components/DetailsList';
import { InfoBox } from '../components/InfoBox';
import { Footer } from '../components/Footer';
import { GroupContactEmailProps } from '../../types/email-types';

/**
 * Group contact request notification email template.
 * Notifies responsible persons when someone submits a contact request.
 */
export default function GroupContactRequestEmail({
  group,
  requesterName,
  requesterEmail,
  message,
  headerLogo,
  baseUrl: _baseUrl,
  contactEmail = process.env.CONTACT_EMAIL || 'info@die-linke-frankfurt.de'
}: GroupContactEmailProps) {
  const contactDetails = [
    { label: 'Name', value: requesterName },
    { label: 'E-Mail', value: requesterEmail },
    { label: 'Gruppe', value: group.name }
  ];

  return (
    <EmailWrapper>
      {/* Header with logo only */}
      <NotificationHeader logo={headerLogo} />

      {/* Info status section */}
      <StatusSection
        type="info"
        title="Neue Kontaktanfrage"
        subtitle={`Jemand möchte Kontakt mit der Gruppe "${group.name}" aufnehmen`}
      />

      {/* Main content */}
      <Section style={mainSection}>
        <Text style={greetingText}>
          Liebe Verantwortliche der Gruppe &quot;{group.name}&quot;,
        </Text>

        <Text style={bodyText}>
          Sie haben eine neue Kontaktanfrage über die Website erhalten.
        </Text>

        <Hr style={hrStyle} />

        {/* Contact details */}
        <DetailsList items={contactDetails} />

        <Hr style={hrStyle} />

        {/* Message section */}
        <InfoBox
          type="info"
          title="Nachricht"
          content={message}
        />

        <Hr style={hrStyle} />

        <Text style={bodyText}>
          Sie können der anfragenden Person direkt per E-Mail antworten: <strong>{requesterEmail}</strong>
        </Text>

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
