import {
  Html,
  Head,
  Body,
  Container,
} from '@react-email/components';

interface EmailWrapperProps {
  children: React.ReactNode;
}

/**
 * Base email wrapper component providing consistent structure and styling for all emails.
 * Uses React Email components optimized for email client compatibility.
 */
export function EmailWrapper({ children }: EmailWrapperProps) {
  return (
    <Html lang="de">
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Die Linke Frankfurt Newsletter</title>
        <style>{`
          /* Email client compatibility styles */
          body {
            margin: 0;
            padding: 0;
            font-family: "Work Sans", "Helvetica Neue", Helvetica, Arial, sans-serif;
            font-size: 16px;
            line-height: 1.5;
            color: #000000;
            background-color: #F5F5F5;
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
          }
          
          /* Reset for Outlook */
          table {
            border-collapse: collapse;
            border-spacing: 0;
          }
          
          /* Image responsiveness */
          img {
            max-width: 100%;
            height: auto;
            border: 0;
            outline: none;
            text-decoration: none;
            -ms-interpolation-mode: bicubic;
          }
          
          /* Responsive styles */
          @media screen and (max-width: 600px) {
            .container {
              width: 100% !important;
              padding: 10px !important;
            }
            
            .mobile-hide {
              display: none !important;
            }
            
            .mobile-full {
              width: 100% !important;
            }
          }
        `}</style>
      </Head>
      <Body style={{
        margin: '0',
        padding: '0',
        backgroundColor: '#F5F5F5',
        fontFamily: '"Open Sans", "Helvetica Neue", Helvetica, Arial, sans-serif'
      }}>
        <Container 
          style={{
            maxWidth: '700px',
            margin: '0 auto',
            backgroundColor: '#FFFFFF',
            boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)'
          }}
          className="container"
        >
          {children}
        </Container>
      </Body>
    </Html>
  );
}