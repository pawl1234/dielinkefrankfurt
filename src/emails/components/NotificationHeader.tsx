/**
 * NotificationHeader component for notification emails
 * 
 * Shows only the logo (no banner) as specified for notification emails.
 * Based on the Header component pattern but simplified for notifications.
 */

import { Img, Section, Row, Column } from '@react-email/components';
import { NotificationHeaderProps } from '../../types/email-types';

/**
 * Notification header component with logo only.
 * Used for all notification emails (not newsletters).
 */
export function NotificationHeader({ logo }: NotificationHeaderProps) {
  return (
    <Section style={headerSection}>
      <Row>
        <Column style={logoColumn}>
          <Img
            src={logo}
            alt="Die Linke Frankfurt Logo"
            style={logoStyle}
          />
        </Column>
      </Row>
    </Section>
  );
}

// Simple inline styles following newsletter.tsx pattern
const headerSection = {
  backgroundColor: '#FFFFFF',
  padding: '20px',
  textAlign: 'center' as const,
  borderBottom: '1px solid #E5E5E5',
  marginBottom: '20px'
};

const logoColumn = {
  textAlign: 'center' as const
};

const logoStyle = {
  height: '60px',
  width: 'auto',
  maxWidth: '200px'
};