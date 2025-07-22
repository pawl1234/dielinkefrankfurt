/**
 * Antrag Rejection Email Template
 * 
 * React Email template for notifying applicants when their Antrag is rejected.
 * Replaces the sendAntragRejectionEmail HTML implementation.
 */

import { Section, Text, Hr } from '@react-email/components';
import { EmailWrapper } from '../components/EmailWrapper';
import { NotificationHeader } from '../components/NotificationHeader';
import { StatusSection } from '../components/StatusSection';
import { DetailsList } from '../components/DetailsList';
import { InfoBox } from '../components/InfoBox';
import { Footer } from '../components/Footer';
import { AntragEmailProps } from '../../types/email-types';
import { AntragPurposes } from '../../types/api-types';

/**
 * Antrag rejection notification email template.
 * Notifies applicants when their Antrag is rejected by the administration.
 */
export default function AntragRejectionEmail({
  antrag,
  headerLogo,
  decisionComment,
  contactEmail = process.env.CONTACT_EMAIL || 'info@die-linke-frankfurt.de'
}: AntragEmailProps) {
  const submissionDate = new Date(antrag.createdAt).toLocaleDateString('de-DE');
  const decisionDate = new Date().toLocaleDateString('de-DE');
  
  const antragDetails = [
    { label: 'Titel', value: antrag.title },
    { label: 'Antragsteller', value: `${antrag.firstName} ${antrag.lastName}` },
    { label: 'Eingereicht am', value: submissionDate },
    { label: 'Entscheidung am', value: decisionDate },
    { label: 'Status', value: 'Abgelehnt' }
  ];

  // Format purposes - reuse logic from antrag-submission.tsx
  const formatPurposes = (purposes: string | AntragPurposes): string[] => {
    let purposesObj: AntragPurposes;
    
    if (typeof purposes === 'string') {
      try {
        purposesObj = JSON.parse(purposes);
      } catch (e) {
        console.error('Error parsing purposes:', e);
        return ['Fehler beim Anzeigen der Zwecke'];
      }
    } else {
      purposesObj = purposes;
    }
    
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
    
    return purposesList.length > 0 ? purposesList : ['Keine Zwecke ausgewählt'];
  };

  const purposesList = formatPurposes(antrag.purposes);

  return (
    <EmailWrapper>
      {/* Header with logo only */}
      <NotificationHeader logo={headerLogo} />
      
      {/* Error status section */}
      <StatusSection
        type="error"
        title="Ihr Antrag wurde abgelehnt"
        subtitle={`Entscheidung vom ${decisionDate}`}
      />
      
      {/* Main content */}
      <Section style={mainSection}>
        <Text style={greetingText}>
          Liebe/r {antrag.firstName} {antrag.lastName},
        </Text>
        
        <Text style={bodyText}>
          wir bedauern, Ihnen mitteilen zu müssen, dass Ihr Antrag &quot;{antrag.title}&quot;
          von unserem Team geprüft wurde und nicht genehmigt werden konnte.
        </Text>
        
        <Hr style={hrStyle} />
        
        {/* Antrag details */}
        <DetailsList items={antragDetails} />
        
        <Hr style={hrStyle} />
        
        {/* Summary section */}
        <Section style={summarySection}>
          <Text style={sectionTitle}>Zusammenfassung</Text>
          <Text style={summaryText}>
            {antrag.summary}
          </Text>
        </Section>
        
        <Hr style={hrStyle} />
        
        {/* Purposes section */}
        <Section style={purposesSection}>
          <Text style={sectionTitle}>Anliegen/Zwecke</Text>
          {purposesList.map((purpose, index) => (
            <Text key={index} style={purposeText}>
              • {purpose}
            </Text>
          ))}
        </Section>
        
        <Hr style={hrStyle} />
        
        {/* Decision comment if provided */}
        {decisionComment && (
          <>
            <InfoBox
              type="warning"
              title="Begründung der Entscheidung"
              content={decisionComment}
            />
            
            <Hr style={hrStyle} />
          </>
        )}
        
        {/* Next steps info box */}
        <InfoBox
          type="info"
          title="Weitere Möglichkeiten"
          content="Wir bedauern, dass wir Ihrem Antrag nicht entsprechen konnten. Gerne können Sie einen überarbeiteten Antrag einreichen oder sich mit uns in Verbindung setzen, um mögliche Alternativen zu besprechen."
        />
        
        <Text style={bodyText}>
          Bei Fragen zur Entscheidung oder für weitere Informationen wenden Sie sich bitte an: {contactEmail}
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

const summarySection = {
  backgroundColor: '#F8F9FA',
  padding: '15px',
  borderRadius: '8px',
  marginBottom: '20px'
};

const purposesSection = {
  backgroundColor: '#F8F9FA',
  padding: '15px',
  borderRadius: '8px',
  marginBottom: '20px'
};

const sectionTitle = {
  fontSize: '16px',
  color: '#333333',
  fontWeight: 'bold',
  margin: '0 0 10px 0'
};

const summaryText = {
  fontSize: '14px',
  color: '#333333',
  lineHeight: '1.5',
  margin: '0'
};

const purposeText = {
  fontSize: '14px',
  color: '#333333',
  lineHeight: '1.5',
  margin: '0 0 5px 0'
};