/**
 * Status Report Acceptance Email Template
 * 
 * React Email template for notifying group responsible persons when their status report is accepted.
 * Replaces the sendStatusReportAcceptanceEmail HTML implementation.
 */

import { Section, Text, Hr, Link } from '@react-email/components';
import { EmailWrapper } from '../components/EmailWrapper';
import { NotificationHeader } from '../components/NotificationHeader';
import { StatusSection } from '../components/StatusSection';
import { DetailsList } from '../components/DetailsList';
import { InfoBox } from '../components/InfoBox';
import { Footer } from '../components/Footer';
import { Button } from '../components/Button';
import { StatusReportEmailProps } from '../../types/email-types';

/**
 * Status report acceptance notification email template.
 * Notifies responsible persons when their status report is accepted and published.
 */
export default function StatusReportAcceptanceEmail({
  statusReport,
  headerLogo,
  baseUrl,
  recipientName,
  reportUrl,
  contactEmail = process.env.CONTACT_EMAIL || 'info@die-linke-frankfurt.de'
}: StatusReportEmailProps) {
  const submissionDate = new Date(statusReport.createdAt).toLocaleDateString('de-DE');
  const viewUrl = reportUrl || `${baseUrl}/gruppen/${statusReport.group.slug}#report-${statusReport.id}`;
  
  const reportDetails = [
    { label: 'Berichtstitel', value: statusReport.title },
    { label: 'Gruppe', value: statusReport.group.name },
    { label: 'Eingereicht am', value: submissionDate },
    { label: 'Status', value: 'Freigeschaltet' }
  ];

  // Parse file URLs if they exist
  const fileUrls = statusReport.fileUrls ? (() => {
    try {
      const files = JSON.parse(statusReport.fileUrls);
      return Array.isArray(files) ? files : [];
    } catch (e) {
      console.error('Error parsing file URLs:', e);
      return [];
    }
  })() : [];

  return (
    <EmailWrapper>
      {/* Header with logo only */}
      <NotificationHeader logo={headerLogo} />
      
      {/* Success status section */}
      <StatusSection
        type="success"
        title="Statusbericht wurde freigeschaltet"
        subtitle="Ihr Statusbericht ist jetzt auf unserer Website sichtbar"
      />
      
      {/* Main content */}
      <Section style={mainSection}>
        <Text style={greetingText}>
          Liebe Verantwortliche der Gruppe "{statusReport.group.name}",
        </Text>
        
        <Text style={bodyText}>
          wir möchten Sie darüber informieren, dass der Statusbericht "{statusReport.title}" 
          vom {submissionDate} nun freigeschaltet wurde und auf unserer Website sichtbar ist.
        </Text>
        
        <Hr style={hrStyle} />
        
        {/* Report details */}
        <DetailsList items={reportDetails} />
        
        <Hr style={hrStyle} />
        
        {/* File attachments if present */}
        {fileUrls.length > 0 && (
          <>
            <Section style={filesSection}>
              <Text style={filesSectionTitle}>
                Angehängte Dateien ({fileUrls.length})
              </Text>
              {fileUrls.map((file, index) => {
                const fileName = file.split('/').pop() || `Anhang ${index + 1}`;
                return (
                  <Text key={index} style={fileText}>
                    <Link href={file} target="_blank" style={linkStyle}>
                      {fileName}
                    </Link>
                  </Text>
                );
              })}
            </Section>
            
            <Hr style={hrStyle} />
          </>
        )}
        
        {/* View report button */}
        <Section style={buttonSection}>
          <Button href={viewUrl} />
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

const filesSection = {
  backgroundColor: '#F8F9FA',
  padding: '15px',
  borderRadius: '8px',
  marginBottom: '20px'
};

const filesSectionTitle = {
  fontSize: '16px',
  color: '#333333',
  fontWeight: 'bold',
  margin: '0 0 10px 0'
};

const fileText = {
  fontSize: '14px',
  color: '#333333',
  lineHeight: '1.5',
  margin: '0 0 5px 0'
};

const linkStyle = {
  color: '#FF0000',
  textDecoration: 'underline'
};