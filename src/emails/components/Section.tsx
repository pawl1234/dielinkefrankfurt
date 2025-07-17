import { Heading, Section as ReactEmailSection, Row, Column } from '@react-email/components';
import { colors, typography, spacing, baseStyles } from '../utils/styles';

interface ContentSectionProps {
  title?: string;
  children: React.ReactNode;
  isIntroduction?: boolean;
}

/**
 * Newsletter content section component with consistent spacing and styling.
 * Uses React Email Section component for better email client compatibility.
 * Can be used for introduction, events, and status report sections.
 */
export function Section({ title, children, isIntroduction = false }: ContentSectionProps) {
  const sectionStyle = isIntroduction 
    ? {
        padding: `0 0 ${spacing.lg} 0`,
        borderBottom: `1px solid ${colors.border.light}`
      }
    : {
        padding: '0'
      };

  return (
    <ReactEmailSection style={sectionStyle}>
      <Row>
        <Column>
          {title && (
            <Heading
              as="h2"
              style={{
                ...baseStyles.heading.h2,
                color: colors.primary,
                fontSize: typography.fontSize['2xl'],
                fontWeight: typography.fontWeight.bold,
                marginTop: isIntroduction ? '0' : spacing.xl,
                marginBottom: spacing.md,
                lineHeight: typography.lineHeight.tight
              }}
            >
              {title}
            </Heading>
          )}
          {children}
        </Column>
      </Row>
    </ReactEmailSection>
  );
}