/**
 * Group Acceptance Email Template
 * 
 * React Email template for notifying group responsible persons when their group is accepted.
 * Replaces the sendGroupAcceptanceEmail HTML implementation.
 */

import { Section, Text, Hr } from '@react-email/components';
import { EmailWrapper } from '../components/EmailWrapper';
import { NotificationHeader } from '../components/NotificationHeader';
import { StatusSection } from '../components/StatusSection';
import { DetailsList } from '../components/DetailsList';
import { InfoBox } from '../components/InfoBox';
import { Footer } from '../components/Footer';
import { Button } from '../components/Button';
import { GroupEmailProps } from '../../types/email-types';

/**
 * Group acceptance notification email template.
 * Notifies responsible persons when their group is accepted and published.
 */
export default function GroupAcceptanceEmail({
  group,
  headerLogo,
  baseUrl,
  recipientName,
  statusReportFormUrl,
  contactEmail = process.env.CONTACT_EMAIL || 'info@die-linke-frankfurt.de'
}: GroupEmailProps) {
  const groupDetails = [
    { label: 'Gruppenname', value: group.name },
    { label: 'Verantwortliche', value: group.responsiblePersons.map(p => `${p.firstName} ${p.lastName}`).join(', ') },
    { label: 'Status', value: 'Freigeschaltet' }
  ];

  const statusReportUrl = statusReportFormUrl || `${baseUrl}/gruppen-bericht`;

  return (
    <EmailWrapper>
      {/* Header with logo only */}
      <NotificationHeader logo={headerLogo} />
      
      {/* Success status section */}
      <StatusSection
        type="success"
        title="Ihre Gruppe wurde freigeschaltet"
        subtitle="Ihre Gruppe ist jetzt auf unserer Website sichtbar"
      />
      
      {/* Main content */}
      <Section style={mainSection}>
        <Text style={greetingText}>
          Liebe Verantwortliche der Gruppe "{group.name}",
        </Text>
        
        <Text style={bodyText}>
          wir freuen uns, Ihnen mitteilen zu können, dass Ihre Gruppe nun freigeschaltet wurde 
          und auf unserer Website sichtbar ist.
        </Text>
        
        <Hr style={hrStyle} />
        
        {/* Group details */}
        <DetailsList items={groupDetails} />
        
        <Hr style={hrStyle} />
        
        {/* Next steps info box */}
        <InfoBox
          type="info"
          title="Nächste Schritte"
          content="Sie können ab sofort Statusberichte für Ihre Gruppe einreichen. Verwenden Sie dazu das Formular auf unserer Website."
        />
        
        {/* Status report button */}
        <Section style={buttonSection}>
          <Button href={statusReportUrl} />
        </Section>
        
        <Text style={bodyText}>
          Bei Fragen stehen wir Ihnen gerne zur Verfügung.
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

// Simple inline styles following newsletter.tsx pattern
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

const buttonSection = {
  textAlign: 'center' as const,
  margin: '30px 0'
};