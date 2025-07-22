/**
 * Newsletter header component with composite image support
 * Prefers composite image for better email client compatibility,
 * falls back to CSS overlay approach if composite is unavailable
 */

import { Img, Section, Row, Column } from '@react-email/components';

interface HeaderProps {
  logo: string;
  banner: string;
  composite?: string | null; // URL to composite image if available
}

/**
 * Newsletter header component with composite image support.
 * 
 * This component uses a composite image (banner + logo combined into single image)
 * when available for maximum email client compatibility. If no composite is provided,
 * it falls back to the CSS overlay approach using absolute positioning.
 * 
 * The composite approach solves rendering issues in Gmail and other email clients
 * that don't properly support CSS positioning for overlays.
 */
export function Header({ logo, banner, composite }: HeaderProps) {
  // Use composite image if available (preferred for email client compatibility)
  if (composite) {
    return (
      <Section>
        <Row>
          <Column>
            <Img
              src={composite}
              alt="Die Linke Frankfurt Header"
              style={{
                width: '100%',
                height: 'auto',
                display: 'block'
              }}
            />
          </Column>
        </Row>
      </Section>
    );
  }

  // Fallback to CSS overlay approach for backwards compatibility
  return (
    <Section>
      <Row>
        <Column
          style={{
            position: 'relative'
          }}
        >
          <Img
            src={banner}
            alt="Die Linke Frankfurt Banner"
            style={{
              height: '200px',
              width: '100%',
              objectFit: 'cover',
            }}
          />
          <div 
            style={{
              position: 'absolute',
              top: '20px',
              left: '20px'
            }}
          >
            <Img
              src={logo}
              alt="Die Linke Frankfurt Logo"
              style={{
                height: '60px',
                width: 'auto'
              }}
            />
          </div>
        </Column>
      </Row>
    </Section>
  );
}