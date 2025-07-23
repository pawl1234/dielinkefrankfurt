/**
 * Newsletter button component following React Email best practices
 * Uses React Email Button component with Die Linke Frankfurt brand styling
 */

import { Button as ReactEmailButton, Section } from '@react-email/components';

interface ButtonProps {
  href: string;
  children: React.ReactNode;
  withContainer?: boolean;
}

/**
 * Newsletter button component with Die Linke Frankfurt brand styling.
 * Follows React Email patterns from apple.tsx example for email client compatibility.
 */
export function Button({ href, children, withContainer = false }: ButtonProps) {
  const buttonStyle = {
    backgroundColor: '#FF0000',
    color: '#FFFFFF',
    fontWeight: 'bold',
    padding: '10px 20px',
    borderRadius: '4px',
    border: 'none',
    marginTop: '25px',
    marginBottom: '10px',
    display: 'inline-block',
    textAlign: 'center' as const,
    textDecoration: 'none'
  };

  // Needed because Gmail renderes the butten centered
  const containerStyle = {
    textAlign: 'left' as const,
    display: 'block' as const,    // Ensure block-level behavior
    width: '100%',               // Ensure full width
    marginLeft: '0',             // Prevent any auto-centering
    marginRight: '0'             // Prevent any auto-centering
  };

  const button = (
    <ReactEmailButton
      href={href}
      style={buttonStyle}
    >
      {children}
    </ReactEmailButton>
  );

  if (withContainer) {
    return (
      <Section style={containerStyle} className="button-container">
        {button}
      </Section>
    );
  }

  return button;
}