import {
  Html,
  Head,
  Body,
  Container,
} from '@react-email/components';

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

// Central typography configuration - single source of truth
const typographyConfig = {
  bodyText: {
    desktop: {
      fontSize: '16px',
      lineHeight: '1.5'
    },
    mobile: {
      fontSize: '18px', 
      lineHeight: '1.5'
    }
  },
  color: '#333333',
  fontFamily: '"Inter", "Open Sans", "Helvetica Neue", Helvetica, Arial, sans-serif',
  margin: {
    desktop: '16px',
    mobile: '18px'
  }
};

// Generate body style from central config
const bodyStyle = {
  backgroundColor: '#F5F5F5',
  fontFamily: typographyConfig.fontFamily,
  fontSize: typographyConfig.bodyText.desktop.fontSize,
  lineHeight: typographyConfig.bodyText.desktop.lineHeight,
  color: typographyConfig.color
};

const containerStyle = {
  width: '660px',
  maxWidth: '100%',
  //margin: '0 auto',
  backgroundColor: '#FFFFFF',
};

// Generate responsive styles from central config  
const responsiveStyles = `
  /* Base styles for all screens - inherits from body for email client compatibility */
  .email-body-text {
    font-size: ${typographyConfig.bodyText.desktop.fontSize} !important;
    line-height: ${typographyConfig.bodyText.desktop.lineHeight} !important;
    color: ${typographyConfig.color} !important;
    margin: 0 0 ${typographyConfig.margin.desktop} 0 !important;
  }

  /* Mobile optimization using Gmail-supported media queries */
  @media screen and (max-width: 600px) {
    .email-body-text {
      font-size: ${typographyConfig.bodyText.mobile.fontSize} !important;
      line-height: ${typographyConfig.bodyText.mobile.lineHeight} !important;
      margin: 0 0 ${typographyConfig.margin.mobile} 0 !important;
    }
  }
`;

// Generate inline styles from central config for email client compatibility
export const emailTypography = {
  bodyText: {
    fontSize: typographyConfig.bodyText.desktop.fontSize,
    lineHeight: typographyConfig.bodyText.desktop.lineHeight,
    color: typographyConfig.color,
    fontFamily: typographyConfig.fontFamily,
    margin: `0 0 ${typographyConfig.margin.desktop} 0`
  }
};