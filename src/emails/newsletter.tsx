/**
 * Newsletter React Email Template
 * 
 * Modern React Email implementation replacing the old HTML-based newsletter system.
 * Follows React Email best practices and patterns from apple.tsx example.
 * Integrates with database settings and analytics tracking.
 */

import { 
  Section, 
  Text, 
  Heading,
  Preview
} from '@react-email/components';

import { NewsletterEmailProps } from '../types/newsletter-props';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { FeaturedEvent } from './components/FeaturedEvent';
import { UpcomingEvent } from './components/UpcomingEvent';
import { StatusReports } from './components/StatusReports';
import { EmailWrapper } from './components/EmailWrapper';
import { generatePreviewText } from '../lib/newsletter-helpers';
import { heading, text } from './lib/styling';

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
    subject,
    introductionText,
    featuredAppointments,
    upcomingAppointments,
    statusReportsByGroup,
    baseUrl
  } = props;

  return (
    <EmailWrapper title={subject}>
      <Preview>{generatePreviewText(introductionText)}</Preview>
      
      {/* Header with banner and logo */}
      <Header 
        logo={newsletterSettings.headerLogo}
        banner={newsletterSettings.headerBanner}
        composite={newsletterSettings.compositeImageUrl}
      />
      
      {/* Main content area */}
      <Section style={contentSection}>
        
        {/* Introduction Section */}
        <Section style={sectionSpacing}>
          <Heading as="h2" style={heading}>
            Einleitung
          </Heading>
          <Text 
            style={text}
            dangerouslySetInnerHTML={{ __html: introductionText }}
          />
        </Section>

        {/* Featured Events Section */}
        {featuredAppointments && featuredAppointments.length > 0 && (
          <Section style={sectionSpacing}>
            <Heading as="h2" style={heading}>
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
            <Heading as="h2" style={heading}>
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
            <Heading as="h2" style={heading}>
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
        newsletter={true}
      />
    </EmailWrapper>
  );
}

// Named export for backward compatibility with existing production code
export { Newsletter };

// Styles following React Email and apple.tsx patterns

const contentSection = {
  paddingLeft: '20px',
  paddingRight: '20px',
};

const sectionSpacing = {
  marginBottom: '20px',
  textAlign: 'left' as const,
  display: 'block' as const,    // Ensure block-level behavior
  width: '100%',               // Ensure full width
  marginLeft: '0',             // Prevent any auto-centering
  marginRight: '0'             // Prevent any auto-centering
};
