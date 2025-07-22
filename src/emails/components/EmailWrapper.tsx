import {
  Html,
  Head,
  Body,
  Container,
} from '@react-email/components';
import { text } from '../lib/styling';

interface EmailWrapperProps {
  children: React.ReactNode;
  title?: string;
}

/**
 * Base email wrapper component providing consistent structure and styling for all emails.
 * Uses React Email components optimized for email client compatibility.
 */
export function EmailWrapper({ children, title }: EmailWrapperProps) {
  return (
    <Html lang="de">
      <Head>
        {title && <title>{title}</title>}
        <meta name="x-apple-disable-message-reformatting" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="format-detection" content="telephone=no, date=no, address=no, email=no" />
        <style>{responsiveStyles}</style>
      </Head>
        <Body style={bodyStyle}>
          <Container style={containerStyle}>
            {children}
          </Container>
        </Body>
    </Html>
  );
}

// Base body style using centralized typography
const bodyStyle = {
  backgroundColor: '#F5F5F5',
  fontFamily: text.fontFamily,  // Use Inter from centralized styling
  fontSize: text.fontSize,     // Use 22px from centralized styling
  lineHeight: text.lineHeight, // Use 1.6 from centralized styling
  color: text.color,           // Use #333333 from centralized styling
  margin: 0,
  padding: 0,  // Critical when using x-apple-disable-message-reformatting
  width: '100%',
  WebkitTextSizeAdjust: '100%',  // Inline Apple Mail fix
  msTextSizeAdjust: '100%'
};

const containerStyle = {
  width: '660px',
  maxWidth: '100%',
  //margin: '0 auto',
  backgroundColor: '#FFFFFF',
};

// Simplified styles - Apple Mail optimizations only, no media queries
const responsiveStyles = `
  /* Apple Mail specific optimizations - consistent 100% values */
  body, table, td, a, p, span {
    -webkit-text-size-adjust: 100% !important;
    -ms-text-size-adjust: 100% !important;
  }
  
  /* Complete coverage for all elements */
  * {
    -webkit-text-size-adjust: 100% !important;
    -ms-text-size-adjust: 100% !important;
  }
`;
