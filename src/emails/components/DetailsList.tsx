/**
 * DetailsList component for notification emails
 * 
 * Displays key-value pairs in a consistent table format.
 * Based on the pattern used in antrag-submission.tsx.
 */

import { Section, Row, Column, Text } from '@react-email/components';
import { DetailsListProps } from '../../types/email-types';

/**
 * Details list component for displaying key-value pairs.
 * Uses a table-like layout that works well across email clients.
 */
export function DetailsList({ items }: DetailsListProps) {
  return (
    <Section style={sectionStyle}>
      {items.map((item, index) => (
        <Row key={index} style={rowStyle}>
          <Column style={labelColumn}>
            <Text style={labelText}>
              {item.label}:
            </Text>
          </Column>
          <Column>
            <Text style={valueText}>
              {item.value}
            </Text>
          </Column>
        </Row>
      ))}
    </Section>
  );
}

// Simple inline styles following newsletter.tsx pattern
const sectionStyle = {
  backgroundColor: '#FFFFFF',
  padding: '20px',
  borderRadius: '8px',
  marginBottom: '20px'
};

const rowStyle = {
  marginBottom: '10px'
};

const labelColumn = {
  width: '150px',
  verticalAlign: 'top' as const
};

const labelText = {
  fontSize: '16px',
  color: '#666666',
  lineHeight: '1.5',
  margin: '0',
  fontWeight: 'bold'
};

const valueText = {
  fontSize: '16px',
  color: '#333333',
  lineHeight: '1.5',
  margin: '0'
};