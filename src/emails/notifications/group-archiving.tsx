/**
 * Group Archiving Email Template
 * 
 * React Email template for notifying group responsible persons when their group is archived.
 * Replaces the sendGroupArchivingEmail HTML implementation.
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
 * Group archiving notification email template.
 * Notifies responsible persons when their group is archived (no longer publicly visible).
 */
export default function GroupArchivingEmail({
  group,
  headerLogo,
  contactEmail = process.env.CONTACT_EMAIL || 'info@die-linke-frankfurt.de'
}: GroupEmailProps) {
  const groupDetails = [
    { label: 'Gruppenname', value: group.name },
    { label: 'Verantwortliche', value: group.responsiblePersons.map(p => `${p.firstName} ${p.lastName}`).join(', ') },
    { label: 'Status', value: 'Archiviert' }
  ];

  return (
    <EmailWrapper>
      {/* Header with logo only */}
      <NotificationHeader logo={headerLogo} />
      
      {/* Info status section */}
      <StatusSection
        type="info"
        title="Ihre Gruppe wurde archiviert"
        subtitle="Ihre Gruppe ist nicht mehr öffentlich sichtbar"
      />
      
      {/* Main content */}
      <Section style={mainSection}>
        <Text style={greetingText}>
          Liebe Verantwortliche der Gruppe &quot;{group.name}&quot;,
        </Text>
        
        <Text style={bodyText}>
          wir möchten Sie darüber informieren, dass Ihre Gruppe auf unserer Website 
          archiviert wurde und nicht mehr öffentlich sichtbar ist.
        </Text>
        
        <Hr style={hrStyle} />
        
        {/* Group details */}
        <DetailsList items={groupDetails} />
        
        <Hr style={hrStyle} />
        
        {/* Information box */}
        <InfoBox
          type="info"
          title="Was bedeutet das?"
          content="Ihre Gruppe ist nun archiviert und wird nicht mehr auf der öffentlichen Website angezeigt. Die Gruppeninformationen bleiben jedoch in unserem System gespeichert."
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