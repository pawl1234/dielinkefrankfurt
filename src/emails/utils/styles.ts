/**
 * Shared style constants for React Email templates
 * Provides consistent styling across all email components
 */

// Brand Colors
export const colors = {
  primary: '#FF0000', // Die Linke red
  secondary: '#006473', // Teal
  text: {
    primary: '#333333',
    secondary: '#666666',
    light: '#999999',
    white: '#FFFFFF',
    black: '#000000'
  },
  background: {
    white: '#FFFFFF',
    light: '#F5F5F5',
    gray: '#F8F9FA',
    dark: '#222222'
  },
  border: {
    light: '#E5E5E5',
    gray: '#E9ECEF',
    dashed: '#E5E5E5'
  }
} as const;

// Typography
export const typography = {
  fontFamily: '"Open Sans", "Helvetica Neue", Helvetica, Arial, sans-serif',
  fontSize: {
    xs: '12px',
    sm: '14px',
    base: '16px',
    lg: '18px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '32px'
  },
  fontWeight: {
    normal: 'normal',
    bold: 'bold',
    '300': '300',
    '400': '400',
    '500': '500',
    '600': '600'
  },
  lineHeight: {
    tight: '1.2',
    normal: '1.4',
    relaxed: '1.5',
    loose: '1.6'
  }
} as const;

// Spacing
export const spacing = {
  xs: '5px',
  sm: '10px',
  md: '15px',
  lg: '20px',
  xl: '25px',
  '2xl': '30px',
  '3xl': '40px',
  '4xl': '50px'
} as const;

// Layout
export const layout = {
  maxWidth: '700px',
  containerWidth: '100%',
  mobileBreakpoint: '600px'
} as const;

// Common Style Objects
export const baseStyles = {
  // Container styles
  container: {
    maxWidth: layout.maxWidth,
    margin: '0 auto',
    backgroundColor: colors.background.white,
    fontFamily: typography.fontFamily
  },
  
  // Section styles
  section: {
    padding: `${spacing.lg} 0`,
    backgroundColor: colors.background.white
  },
  
  // Text styles
  text: {
    base: {
      fontSize: typography.fontSize.base,
      color: colors.text.primary,
      lineHeight: typography.lineHeight.relaxed,
      margin: '0'
    },
    
    small: {
      fontSize: typography.fontSize.sm,
      color: colors.text.secondary,
      lineHeight: typography.lineHeight.normal,
      margin: '0'
    },
    
    large: {
      fontSize: typography.fontSize.lg,
      color: colors.text.primary,
      lineHeight: typography.lineHeight.relaxed,
      margin: '0'
    }
  },
  
  // Heading styles
  heading: {
    h1: {
      fontSize: typography.fontSize['3xl'],
      fontWeight: typography.fontWeight.bold,
      color: colors.text.primary,
      lineHeight: typography.lineHeight.tight,
      margin: '0'
    },
    
    h2: {
      fontSize: typography.fontSize['2xl'],
      fontWeight: typography.fontWeight.bold,
      color: colors.primary,
      lineHeight: typography.lineHeight.tight,
      margin: '0'
    },
    
    h3: {
      fontSize: typography.fontSize.xl,
      fontWeight: typography.fontWeight.bold,
      color: colors.text.primary,
      lineHeight: typography.lineHeight.tight,
      margin: '0'
    },
    
    h4: {
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.bold,
      color: colors.text.primary,
      lineHeight: typography.lineHeight.tight,
      margin: '0'
    }
  },
  
  // Button styles
  button: {
    primary: {
      backgroundColor: colors.primary,
      color: colors.text.white,
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.bold,
      padding: `${spacing.sm} ${spacing.lg}`,
      textDecoration: 'none',
      borderRadius: '4px',
      border: 'none',
      display: 'inline-block',
      textAlign: 'center' as const
    },
    
    secondary: {
      backgroundColor: colors.secondary,
      color: colors.text.white,
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.bold,
      padding: `${spacing.sm} ${spacing.lg}`,
      textDecoration: 'none',
      borderRadius: '4px',
      border: 'none',
      display: 'inline-block',
      textAlign: 'center' as const
    }
  },
  
  // Link styles
  link: {
    primary: {
      color: colors.primary,
      textDecoration: 'underline'
    },
    
    secondary: {
      color: colors.secondary,
      textDecoration: 'underline'
    },
    
    light: {
      color: colors.text.light,
      textDecoration: 'underline'
    }
  }
} as const;

// Responsive styles for mobile
export const mobileStyles = {
  container: {
    width: '100% !important',
    padding: `${spacing.sm} !important`
  },
  
  hide: {
    display: 'none !important'
  },
  
  fullWidth: {
    width: '100% !important'
  },
  
  centerAlign: {
    textAlign: 'center !important'
  }
} as const;

// Utility functions
export const createResponsiveStyle = (desktop: React.CSSProperties, mobile: React.CSSProperties) => ({
  ...desktop,
  [`@media screen and (max-width: ${layout.mobileBreakpoint})`]: mobile
});

export const createSpacingStyle = (spacingValue: keyof typeof spacing) => ({
  margin: spacingValue,
  padding: spacingValue
});

// Email client specific styles
export const emailClientStyles = {
  // Outlook specific fixes
  outlook: {
    table: {
      borderCollapse: 'collapse' as const,
      borderSpacing: '0',
      msoTableLspace: '0pt',
      msoTableRspace: '0pt'
    },
    
    image: {
      msInterpolationMode: 'bicubic',
      border: '0',
      outline: 'none',
      textDecoration: 'none'
    }
  },
  
  // Gmail specific fixes
  gmail: {
    autoLinks: {
      color: 'inherit',
      textDecoration: 'none'
    }
  },
  
  // Apple Mail specific fixes
  appleMail: {
    autoSize: {
      WebkitTextSizeAdjust: '100%',
      MsTextSizeAdjust: '100%'
    }
  }
} as const;