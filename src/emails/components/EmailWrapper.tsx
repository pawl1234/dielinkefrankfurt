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

// Central typography configuration - mobile-first approach for optimal readability
const typographyConfig = {
  bodyText: {
    mobile: {
      fontSize: '22px',      // Excellent mobile readability
      lineHeight: '1.6'      // Enhanced line spacing for mobile
    },
    tablet: {
      fontSize: '18px',      // Medium screens
      lineHeight: '1.5'
    },
    desktop: {
      fontSize: '16px',      // Large screens
      lineHeight: '1.5'
    }
  },
  color: '#333333',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif',
  margin: {
    mobile: '22px',
    tablet: '18px',
    desktop: '16px'
  }
};

// Generate body style from central config - mobile-first base
const bodyStyle = {
  backgroundColor: '#F5F5F5',
  fontFamily: typographyConfig.fontFamily,
  fontSize: typographyConfig.bodyText.mobile.fontSize,  // Start with mobile size
  lineHeight: typographyConfig.bodyText.mobile.lineHeight,
  color: typographyConfig.color,
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

// Generate responsive styles from central config - mobile-first approach
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

  /* Mobile-first base styles - default for all screens */
  .email-body-text {
    font-size: ${typographyConfig.bodyText.mobile.fontSize} !important;
    line-height: ${typographyConfig.bodyText.mobile.lineHeight} !important;
    color: ${typographyConfig.color} !important;
    margin: 0 0 ${typographyConfig.margin.mobile} 0 !important;
    font-family: ${typographyConfig.fontFamily} !important;
  }

  /* Large phones - scale down slightly */
  @media screen and (min-width: 480px) {
    .email-body-text {
      font-size: 20px !important;
      line-height: 1.6 !important;
      margin: 0 0 20px 0 !important;
    }
  }

  /* Tablets - medium size */
  @media screen and (min-width: 768px) {
    .email-body-text {
      font-size: ${typographyConfig.bodyText.tablet.fontSize} !important;
      line-height: ${typographyConfig.bodyText.tablet.lineHeight} !important;
      margin: 0 0 ${typographyConfig.margin.tablet} 0 !important;
    }
  }

  /* Desktop - smallest size for large screens */
  @media screen and (min-width: 1024px) {
    .email-body-text {
      font-size: ${typographyConfig.bodyText.desktop.fontSize} !important;
      line-height: ${typographyConfig.bodyText.desktop.lineHeight} !important;
      margin: 0 0 ${typographyConfig.margin.desktop} 0 !important;
    }
  }
`;

// Generate inline styles from central config - mobile-first for email client compatibility
export const emailTypography = {
  bodyText: {
    fontSize: typographyConfig.bodyText.mobile.fontSize,    // Mobile-first base size
    lineHeight: typographyConfig.bodyText.mobile.lineHeight,
    color: typographyConfig.color,
    fontFamily: typographyConfig.fontFamily,
    margin: `0 0 ${typographyConfig.margin.mobile} 0`,
    WebkitTextSizeAdjust: '100%',  // Critical inline Apple Mail fix
    msTextSizeAdjust: '100%'       // Outlook compatibility
  }
};