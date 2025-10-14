import { Text, Heading, Section, Row, Column } from '@react-email/components';
import { Appointment } from '@prisma/client';
import { Button } from './Button';
import { formatAppointmentDateRange, truncateText } from '@/lib/newsletter';
import { subHeading, metaData, text } from '../lib/styling';
import { sanitizeForRender } from '@/lib/sanitization/sanitize';

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
        <Column style={columnStyle}>
          <Heading as="h3" style={subHeading}>
            {appointment.title}
          </Heading>
          
          <Text style={metaData}>
            {dateRange}
          </Text>
          
          <Text
            style={text}
            dangerouslySetInnerHTML={{ __html: sanitizeForRender(truncatedText) }}
          />
          
          <Button href={detailUrl} withContainer={true}>Mehr Infos</Button>
        </Column>
      </Row>
    </Section>
  );
}

// Styles following React Email and apple.tsx patterns
const upcomingSection = {
  marginBottom: '30px'
};

const columnStyle = {
  width: '100%',
  verticalAlign: 'top',
  paddingTop: '20px',
};
