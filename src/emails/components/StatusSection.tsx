/**
 * StatusSection component for notification emails
 * 
 * Displays status indicators with different colors for success, error, and info states.
 * Used across all notification email templates.
 */

import { Section, Row, Column, Text, Heading } from '@react-email/components';
import { StatusSectionProps } from '../../types/email-types';

/**
 * Status section component with color-coded status indicators.
 * Shows success (green), error (red), or info (blue) styling.
 */
export function StatusSection({ type, title, subtitle }: StatusSectionProps) {
  const statusConfig = getStatusConfig(type);

  return (
    <Section style={statusConfig.sectionStyle}>
      <Row>
        <Column>
          <Heading as="h1" style={statusConfig.titleStyle}>
            {statusConfig.icon} {title}
          </Heading>
          {subtitle && (
            <Text style={statusConfig.subtitleStyle}>
              {subtitle}
            </Text>
          )}
        </Column>
      </Row>
    </Section>
  );
}

// Helper function to get status-specific configuration
function getStatusConfig(type: 'success' | 'error' | 'info') {
  const baseSection = {
    padding: '20px',
    borderRadius: '10px',
    marginBottom: '20px',
    border: '1px solid'
  };

  const baseTitle = {
    color: '#FFFFFF',
    fontSize: '24px',
    fontWeight: 'bold',
    margin: '0',
    lineHeight: '1.2'
  };

  const baseSubtitle = {
    color: '#FFFFFF',
    fontSize: '16px',
    margin: '5px 0 0 0',
    opacity: '0.9'
  };

  switch (type) {
    case 'success':
      return {
        icon: '✅',
        sectionStyle: {
          ...baseSection,
          backgroundColor: '#4caf50',
          borderColor: '#45a049'
        },
        titleStyle: {
          ...baseTitle,
          color: '#FFFFFF'
        },
        subtitleStyle: {
          ...baseSubtitle,
          color: '#FFFFFF'
        }
      };
    case 'error':
      return {
        icon: '❌',
        sectionStyle: {
          ...baseSection,
          backgroundColor: '#f44336',
          borderColor: '#d32f2f'
        },
        titleStyle: {
          ...baseTitle,
          color: '#FFFFFF'
        },
        subtitleStyle: {
          ...baseSubtitle,
          color: '#FFFFFF'
        }
      };
    case 'info':
      return {
        icon: 'ℹ️',
        sectionStyle: {
          ...baseSection,
          backgroundColor: '#2196f3',
          borderColor: '#1976d2'
        },
        titleStyle: {
          ...baseTitle,
          color: '#FFFFFF'
        },
        subtitleStyle: {
          ...baseSubtitle,
          color: '#FFFFFF'
        }
      };
    default:
      throw new Error(`Unknown status type: ${type}`);
  }
}