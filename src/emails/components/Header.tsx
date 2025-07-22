/**
 * Newsletter header component with div overlay approach
 * Uses absolute positioning for logo overlay on banner image
 */

import { Img, Section, Row, Column } from '@react-email/components';

interface HeaderProps {
  logo: string;
  banner: string;
}

/**
 * Newsletter header component with banner image and logo overlay.
 * Uses div with absolute positioning to overlay logo on banner image.
 * This approach provides a cleaner, more intuitive positioning method.
 */
export function Header({ logo, banner }: HeaderProps) {
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