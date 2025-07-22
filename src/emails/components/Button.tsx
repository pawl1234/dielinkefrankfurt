/**
 * Newsletter button component following React Email best practices
 * Uses React Email Button component with Die Linke Frankfurt brand styling
 */

import { Button as ReactEmailButton } from '@react-email/components';

interface ButtonProps {
  href: string;
}

/**
 * Newsletter button component with Die Linke Frankfurt brand styling.
 * Follows React Email patterns from apple.tsx example for email client compatibility.
 */
export function Button({ href }: ButtonProps) {
  const buttonStyle = {
    backgroundColor: '#FF0000',
    color: '#FFFFFF',
    fontWeight: 'bold',
    padding: '10px 20px 10px 20px',
    borderRadius: '4px',
    border: 'none',
    display: 'inline-block',
    textAlign: 'center' as const,
  };

  return (
    <ReactEmailButton
      href={href}
      style={buttonStyle}
    >
      Mehr Informationen
    </ReactEmailButton>
  );
}