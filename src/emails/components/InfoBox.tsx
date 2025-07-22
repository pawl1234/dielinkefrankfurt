/**
 * InfoBox component for notification emails
 * 
 * Displays highlighted information in a visually distinct container.
 * Based on the adminSection pattern from antrag-submission.tsx.
 */

import { Section, Row, Column, Text, Heading } from '@react-email/components';
import { InfoBoxProps } from '../../types/email-types';

/**
 * Info box component for displaying highlighted information.
 * Supports different types: info, warning, success for different styling.
 */
export function InfoBox({ title, content, type = 'info' }: InfoBoxProps) {
  const boxConfig = getBoxConfig(type);

  return (
    <Section style={boxConfig.sectionStyle}>
      <Row>
        <Column>
          <Heading as="h3" style={boxConfig.titleStyle}>
            {title}
          </Heading>
          <Text style={boxConfig.contentStyle}>
            {content}
          </Text>
        </Column>
      </Row>
    </Section>
  );
}

// Helper function to get box-specific configuration
function getBoxConfig(type: 'info' | 'warning' | 'success') {
  const baseSection = {
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '1px solid'
  };

  const baseTitle = {
    fontSize: '18px',
    fontWeight: 'bold',
    margin: '0 0 10px 0',
    lineHeight: '1.2'
  };

  const baseContent = {
    fontSize: '16px',
    lineHeight: '1.5',
    margin: '0'
  };

  switch (type) {
    case 'info':
      return {
        sectionStyle: {
          ...baseSection,
          backgroundColor: '#e3f2fd',
          borderColor: '#2196f3'
        },
        titleStyle: {
          ...baseTitle,
          color: '#1976d2'
        },
        contentStyle: {
          ...baseContent,
          color: '#0d47a1'
        }
      };
    case 'warning':
      return {
        sectionStyle: {
          ...baseSection,
          backgroundColor: '#fff3e0',
          borderColor: '#ff9800'
        },
        titleStyle: {
          ...baseTitle,
          color: '#f57c00'
        },
        contentStyle: {
          ...baseContent,
          color: '#e65100'
        }
      };
    case 'success':
      return {
        sectionStyle: {
          ...baseSection,
          backgroundColor: '#e8f5e8',
          borderColor: '#4caf50'
        },
        titleStyle: {
          ...baseTitle,
          color: '#2e7d32'
        },
        contentStyle: {
          ...baseContent,
          color: '#1b5e20'
        }
      };
    default:
      throw new Error(`Unknown info box type: ${type}`);
  }
}