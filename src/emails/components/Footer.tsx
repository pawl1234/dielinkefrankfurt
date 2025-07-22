import { Link, Text, Section, Row, Column } from '@react-email/components';

interface FooterProps {
  text: string;
  unsubscribeLink: string;
  newsletter?: boolean;
}

/**
 * Newsletter footer component with organization info and unsubscribe link.
 * Uses React Email components for better email client compatibility.
 */
export function Footer({ text, unsubscribeLink, newsletter }: FooterProps) {
  return (
    <Section style={footerSection}>
      <Row>
        <Column>
          <Text style={footerText}>
            {text}
          </Text>       
          {newsletter && (
            <Text style={unsubscribeTextWrapper}>
              <Link href={unsubscribeLink} style={unsubscribeLinkStyle}>
                Vom Newsletter abmelden
              </Link>
            </Text>
          )} 
        </Column>
      </Row>
    </Section>
  );
}

// Styles following React Email and apple.tsx patterns
const footerSection = {
  backgroundColor: "#222222",
  color: "#FFFFFF",
  padding: "30px 20px",
  textAlign: 'center' as const
};

const footerText = {
  fontSize: '16px',
  color: '#FFFFFF',
  lineHeight: '1.5',
  margin: '0 0 15px 0'
};

const unsubscribeTextWrapper = {
  margin: '0',
  marginTop: '15px'
};

const unsubscribeLinkStyle = {
  color: '#CCCCCC',
  textDecoration: 'underline',
  display: 'inline-block'
};