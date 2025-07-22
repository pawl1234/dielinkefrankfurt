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
      </Head>
        <Body style={bodyStyle}>
          <Container style={containerStyle}>
            {children}
          </Container>
        </Body>
    </Html>
  );
}

const bodyStyle = {
  backgroundColor: '#F5F5F5',
  fontFamily: '"Inter", "Open Sans", "Helvetica Neue", Helvetica, Arial, sans-serif'
};

const containerStyle = {
  width: '660px',
  maxWidth: '100%',
  //margin: '0 auto',
  backgroundColor: '#FFFFFF',
};