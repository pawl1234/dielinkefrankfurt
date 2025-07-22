/**
 * Group Rejection Email Template
 * 
 * React Email template for notifying group responsible persons when their group is rejected.
 * Replaces the sendGroupRejectionEmail HTML implementation.
 */

import { Section, Text, Hr } from '@react-email/components';
import { EmailWrapper } from '../components/EmailWrapper';
import { NotificationHeader } from '../components/NotificationHeader';
import { StatusSection } from '../components/StatusSection';
import { DetailsList } from '../components/DetailsList';
import { InfoBox } from '../components/InfoBox';
import { Footer } from '../components/Footer';
import { GroupEmailProps } from '../../types/email-types';

/**
 * Group rejection notification email template.
 * Notifies responsible persons when their group application is rejected.
 */
export default function GroupRejectionEmail({
  group,
  headerLogo,
  baseUrl,
  recipientName,
  contactEmail = process.env.CONTACT_EMAIL || 'info@die-linke-frankfurt.de'
}: GroupEmailProps) {
  const groupDetails = [
    { label: 'Gruppenname', value: group.name },
    { label: 'Verantwortliche', value: group.responsiblePersons.map(p => `${p.firstName} ${p.lastName}`).join(', ') },
    { label: 'Status', value: 'Abgelehnt' }
  ];

  return (
    <EmailWrapper>
      {/* Header with logo only */}
      <NotificationHeader logo={headerLogo} />
      
      {/* Error status section */}
      <StatusSection
        type="error"
        title="Ihre Gruppenanfrage wurde abgelehnt"
        subtitle="Ihre Gruppe konnte nicht genehmigt werden"
      />
      
      {/* Main content */}
      <Section style={mainSection}>
        <Text style={greetingText}>
          Liebe Verantwortliche der Gruppe "{group.name}",
        </Text>
        
        <Text style={bodyText}>
          wir müssen Ihnen leider mitteilen, dass Ihre Anfrage zur Erstellung einer Gruppe 
          auf unserer Website nicht genehmigt werden konnte.
        </Text>
        
        <Hr style={hrStyle} />
        
        {/* Group details */}
        <DetailsList items={groupDetails} />
        
        <Hr style={hrStyle} />
        
        {/* Contact info box */}
        <InfoBox
          type="info"
          title="Weitere Informationen"
          content={`Für weitere Informationen oder Fragen wenden Sie sich bitte an: ${contactEmail}`}
        />
        
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