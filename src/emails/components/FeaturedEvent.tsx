import { Img, Text, Heading, Section, Row, Column } from '@react-email/components';
import { Appointment } from '@prisma/client';
import { Button } from './Button';
import { getCoverImageUrl, formatAppointmentDateRange, truncateText } from '@/lib/newsletter';
import { subHeading, metaData, text } from '../lib/styling';
import { sanitizeForRender } from '@/lib/sanitization/sanitize';

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
  const detailUrl = `${baseUrl}/termine/${appointment.slug || appointment.id}`;
  const dateRange = formatAppointmentDateRange(appointment.startDateTime, appointment.endDateTime);
  const truncatedText = truncateText(appointment.mainText || '', 300);

  return (
    <Section style={featuredSection}>
      <Row>
        {imageUrl && (
          <Column style={imageColumn}>
            <Img
              src={imageUrl}
              alt={appointment.title}
              style={imageStyle}
            />
          </Column>
        )}
        <Column style={imageUrl ? contentColumn : fullContentColumn}>
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
          
          <Button href={detailUrl}>Mehr Infos</Button>
        </Column>
      </Row>
    </Section>
  );
}

// Styles following React Email and apple.tsx patterns
const featuredSection = {
  marginBottom: '20px'
};

const imageColumn = {
  width: '35%',
  maxWidth: '200px',  // Outlook fix: explicit max-width in pixels
  verticalAlign: 'top' as const,
  paddingTop: '20px',
  paddingRight: '20px',
};

const contentColumn = {
  width: '65%',
  verticalAlign: 'top' as const,
  paddingTop: '20px',
};

const fullContentColumn = {
  width: '100%',
  verticalAlign: 'top' as const,
  paddingTop: '20px',
};

const imageStyle = {
  width: '100%',
  maxWidth: '200px',   // Outlook fix: prevent image from exceeding column
  height: 'auto',
  objectFit: 'cover' as const,
  display: 'block' as const,  // Outlook fix: removes extra spacing
};
