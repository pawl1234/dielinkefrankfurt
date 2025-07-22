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
    display: 'inline-block',
    textAlign: 'center' as const,
    textDecoration: 'none'
  };

  const containerStyle = {
    marginTop: '15px'
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