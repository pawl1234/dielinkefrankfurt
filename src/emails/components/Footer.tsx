import { Link, Text, Section, Row, Column } from '@react-email/components';
import { colors, typography, spacing, baseStyles } from '../utils/styles';

interface FooterProps {
  text: string;
  unsubscribeLink: string;
}

/**
 * Newsletter footer component with organization info and unsubscribe link.
 * Uses React Email components for better email client compatibility.
 */
export function Footer({ text, unsubscribeLink }: FooterProps) {
  return (
    <Section
      style={{
        backgroundColor: colors.background.dark,
        color: colors.text.white,
        padding: `${spacing['2xl']} ${spacing.lg}`,
        textAlign: 'center'
      }}
    >
      <Row>
        <Column>
          <Text
            style={{
              ...baseStyles.text.base,
              color: colors.text.white,
              fontSize: typography.fontSize.base,
              lineHeight: typography.lineHeight.relaxed,
              margin: `0 0 ${spacing.md} 0`
            }}
          >
            {text}
          </Text>
          
          <Text
            style={{
              margin: '0',
              marginTop: spacing.md
            }}
          >
            <Link
              href={unsubscribeLink}
              style={{
                ...baseStyles.link.light,
                color: '#CCCCCC',
                textDecoration: 'underline',
                display: 'inline-block'
              }}
            >
              Vom Newsletter abmelden
            </Link>
          </Text>
        </Column>
      </Row>
    </Section>
  );
}