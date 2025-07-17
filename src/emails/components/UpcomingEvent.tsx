import { Text, Heading, Section, Row, Column, Hr } from '@react-email/components';
import { Appointment } from '@prisma/client';
import { Button } from './Button';
import { formatAppointmentDateRange, truncateText } from '../../lib/newsletter-helpers';
import { colors, typography, spacing, baseStyles } from '../utils/styles';

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
    <Section
      style={{
        marginBottom: '30px'
      }}
    >
      <Row>
        <Column>
          <Heading
            as="h3"
            style={{
              fontSize: '20px',
              color: "#333333",
              marginTop: '0px',
              marginBottom: '10px',
            }}
          >
            {appointment.title}
          </Heading>
          
          <Text
            style={{
              fontSize: '16px',
              fontWeight: 'bold',
              color: '#666666',
              marginTop: '0px',
              marginBottom: '10px',
            }}
          >
            {dateRange}
          </Text>
          
          <Text dangerouslySetInnerHTML={{ __html: truncatedText }} />
          <Button href={detailUrl}/>
        </Column>
      </Row>
    </Section>
  );
}