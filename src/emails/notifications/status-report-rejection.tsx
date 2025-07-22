/**
 * Status Report Rejection Email Template
 * 
 * React Email template for notifying group responsible persons when their status report is rejected.
 * Replaces the sendStatusReportRejectionEmail HTML implementation.
 */

import { Section, Text, Hr } from '@react-email/components';
import { EmailWrapper } from '../components/EmailWrapper';
import { NotificationHeader } from '../components/NotificationHeader';
import { StatusSection } from '../components/StatusSection';
import { DetailsList } from '../components/DetailsList';
import { InfoBox } from '../components/InfoBox';
import { Footer } from '../components/Footer';
import { StatusReportEmailProps } from '../../types/email-types';

/**
 * Status report rejection notification email template.
 * Notifies responsible persons when their status report is rejected.
 */
export default function StatusReportRejectionEmail({
  statusReport,
  headerLogo,
  baseUrl,
  recipientName,
  contactEmail = process.env.CONTACT_EMAIL || 'info@die-linke-frankfurt.de'
}: StatusReportEmailProps) {
  const submissionDate = new Date(statusReport.createdAt).toLocaleDateString('de-DE');
  
  const reportDetails = [
    { label: 'Berichtstitel', value: statusReport.title },
    { label: 'Gruppe', value: statusReport.group.name },
    { label: 'Eingereicht am', value: submissionDate },
    { label: 'Status', value: 'Abgelehnt' }
  ];

  return (
    <EmailWrapper>
      {/* Header with logo only */}
      <NotificationHeader logo={headerLogo} />
      
      {/* Error status section */}
      <StatusSection
        type="error"
        title="Ihr Statusbericht wurde abgelehnt"
        subtitle="Ihr Statusbericht konnte nicht für die Veröffentlichung genehmigt werden"
      />
      
      {/* Main content */}
      <Section style={mainSection}>
        <Text style={greetingText}>
          Liebe Verantwortliche der Gruppe "{statusReport.group.name}",
        </Text>
        
        <Text style={bodyText}>
          wir müssen Ihnen leider mitteilen, dass Ihr Statusbericht "{statusReport.title}" 
          vom {submissionDate} für die Veröffentlichung auf unserer Website nicht genehmigt werden konnte.
        </Text>
        
        <Hr style={hrStyle} />
        
        {/* Report details */}
        <DetailsList items={reportDetails} />
        
        <Hr style={hrStyle} />
        
        {/* Resubmission info box */}
        <InfoBox
          type="info"
          title="Nächste Schritte"
          content="Sie können gerne einen überarbeiteten Bericht einreichen. Für weitere Informationen und Fragen wenden Sie sich bitte an unser Team."
        />
        
        <Text style={bodyText}>
          Für weitere Informationen oder Fragen wenden Sie sich bitte an: {contactEmail}
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