/**
 * Newsletter React Email Template
 * 
 * Modern React Email implementation replacing the old HTML-based newsletter system.
 * Follows React Email best practices and patterns from apple.tsx example.
 * Integrates with database settings and analytics tracking.
 */

import { 
  Html, 
  Head, 
  Body, 
  Container, 
  Section, 
  Text, 
  Heading, 
  Button,
  Hr
} from '@react-email/components';

import { NewsletterEmailProps } from '../types/newsletter-props';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { FeaturedEvent } from './components/FeaturedEvent';
import { UpcomingEvent } from './components/UpcomingEvent';
import { StatusReports } from './components/StatusReports';

/**
 * Main newsletter template using React Email components for better email client compatibility.
 * 
 * Features:
 * - Proper TypeScript types without 'as never' assertions
 * - Database-driven content instead of hardcoded samples
 * - React Email components for email client compatibility
 * - Integrated helper functions for date formatting and text processing
 * - Responsive design following email best practices
 */
export default function Newsletter(props: NewsletterEmailProps): JSX.Element {
  const {
    newsletterSettings,
    introductionText,
    featuredAppointments,
    upcomingAppointments,
    statusReportsByGroup,
    baseUrl
  } = props;

  return (
    <Html lang="de">
      <Head />
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          {/* Header with banner and logo */}
          <Header 
            logo={newsletterSettings.headerLogo}
            banner={newsletterSettings.headerBanner}
          />
          
          {/* Main content area */}
          <Section style={contentSection}>
            
            {/* Introduction Section */}
            <Section style={sectionSpacing}>
              <Heading as="h2" style={sectionHeading}>
                Einleitung
              </Heading>
              <Text dangerouslySetInnerHTML={{ __html: introductionText }}>
              </Text>
            </Section>

            {/* Featured Events Section */}
            {featuredAppointments && featuredAppointments.length > 0 && (
              <Section style={sectionSpacing}>
                <Heading as="h2" style={sectionHeading}>
                  Featured
                </Heading>
                {featuredAppointments.map((appointment) => (
                  <FeaturedEvent
                    key={appointment.id}
                    appointment={appointment}
                    baseUrl={baseUrl}
                  />
                ))}
              </Section>
            )}

            {/* Upcoming Events Section */}
            {upcomingAppointments && upcomingAppointments.length > 0 && (
              <Section style={sectionSpacing}>
                <Heading as="h2" style={sectionHeading}>
                  Termine
                </Heading>
                {upcomingAppointments.map((appointment) => (
                  <UpcomingEvent
                    key={appointment.id}
                    appointment={appointment}
                    baseUrl={baseUrl}
                  />
                ))}
              </Section>
            )}

            {/* Status Reports Section */}
            {statusReportsByGroup && statusReportsByGroup.length > 0 && (
              <Section style={sectionSpacing}>
                <Heading as="h2" style={sectionHeading}>
                  Aktuelle Gruppenberichte
                </Heading>
                <StatusReports
                  groups={statusReportsByGroup}
                  baseUrl={baseUrl}
                />
              </Section>
            )}
          </Section>

          {/* Footer */}
          <Footer 
            text={newsletterSettings.footerText}
            unsubscribeLink={newsletterSettings.unsubscribeLink}
          />
        </Container>
      </Body>
    </Html>
  );
}

// Named export for backward compatibility with existing production code
export { Newsletter };

// Styles following React Email and apple.tsx patterns
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

const contentSection = {
  paddingLeft: '20px',
  paddingRight: '20px',
};

const sectionSpacing = {
  //marginBottom: '10px',
};

const sectionHeading = {
  marginTop: '15px',
  marginBottom: '10px',
  fontFamily: '"Work Sans", "Open Sans", "Helvetica Neue", Helvetica, Arial, sans-serif',
  color: '#FF0000',
};