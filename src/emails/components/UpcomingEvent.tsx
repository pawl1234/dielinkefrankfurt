import { Text, Heading, Section, Row, Column } from '@react-email/components';
import { Appointment } from '@prisma/client';
import { Button } from './Button';
import { formatAppointmentDateRange, truncateText } from '../../lib/newsletter-helpers';
import { subHeading, metaData, text } from '../lib/styling';

interface UpcomingEventProps {
  appointment: Appointment;
  baseUrl: string;
}

/**
 * Upcoming event component for newsletter - simple single-column layout.
 * Uses React Email components for better email client compatibility.
 */
export function UpcomingEvent({ appointment, baseUrl }: UpcomingEventProps) {
  const detailUrl = `${baseUrl}/termine/${appointment.id}`;
  const dateRange = formatAppointmentDateRange(appointment.startDateTime, appointment.endDateTime);
  const truncatedText = truncateText(appointment.mainText || '', 200);

  return (
    <Section style={upcomingSection}>
      <Row>
        <Column>
          <Heading as="h3" style={subHeading}>
            {appointment.title}
          </Heading>
          
          <Text style={metaData}>
            {dateRange}
          </Text>
          
          <Text 
            style={text}
            dangerouslySetInnerHTML={{ __html: truncatedText }}
          />
        </Column>
      </Row>
      <Row> 
        <Button href={detailUrl}>Mehr Infos</Button>
      </Row>
    </Section>
  );
}

// Styles following React Email and apple.tsx patterns
const upcomingSection = {
  marginBottom: '30px'
};
