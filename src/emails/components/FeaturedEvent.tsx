import { Img, Text, Heading, Section, Row, Column, Hr } from '@react-email/components';
import { Appointment } from '@prisma/client';
import { Button } from './Button';
import { getCoverImageUrl, formatAppointmentDateRange, truncateText } from '../../lib/newsletter-helpers';
import { colors, typography, spacing, baseStyles, emailClientStyles } from '../utils/styles';

interface FeaturedEventProps {
  appointment: Appointment;
  baseUrl: string;
}

/**
 * Featured event component for newsletter - displays with image and detailed layout.
 * Uses React Email components for better email client compatibility.
 */
export function FeaturedEvent({ appointment, baseUrl }: FeaturedEventProps) {
  const imageUrl = getCoverImageUrl(appointment);
  const detailUrl = `${baseUrl}/termine/${appointment.id}`;
  const dateRange = formatAppointmentDateRange(appointment.startDateTime, appointment.endDateTime);
  const truncatedText = truncateText(appointment.mainText || '', 300);

  return (
    <Section
      style={{
        marginBottom: '20px'
      }}
    >
      <Row>
        {imageUrl && (
          <Column
            style={{
              width: '35%',
              verticalAlign: 'top',
              paddingTop: '20px',
              paddingRight: '20px',
            }}
          >
            <Img
              src={imageUrl}
              alt={appointment.title}
              style={{
                width: '100%',
                height: 'auto',
                objectFit: 'cover',
              }}
            />
          </Column>
        )}
        <Column
          style={{
            width: imageUrl ? '65%' : '100%',
            verticalAlign: 'top',
            paddingTop: '20px',
          }}
        >
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
          
          <Text dangerouslySetInnerHTML={{ __html: truncatedText }}>
          </Text>
          
          <Button href={detailUrl}>
          </Button>
        </Column>
      </Row>
    </Section>
    
  );
}