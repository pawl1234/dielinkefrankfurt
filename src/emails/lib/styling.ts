/**
 * Centralized email typography styles
 * 
 * Single source of truth for all email text styling.
 * Includes Apple Mail optimizations and consistent font sizing.
 */

// Base configuration
const baseConfig = {
  fontFamily: {
    heading: '"Work Sans", "Open Sans", "Helvetica Neue", Helvetica, Arial, sans-serif',
    text: '"Inter", "Open Sans", "Helvetica Neue", Helvetica, Arial, sans-serif'
  },
  color: {
    primary: '#333333',
    secondary: '#666666',
    accent: '#FF0000'  // Red for headings
  },
  lineHeight: '1.6',
  // Apple Mail optimization properties
  appleMailFix: {
    WebkitTextSizeAdjust: '100%' as const,
    msTextSizeAdjust: '100%' as const
  }
};

// Centralized text styles for email components
export const emailTextStyles = {
  /**
   * Main heading style (h1, h2) - for section headings like "Einleitung", "Termine"
   */
  heading: {
    fontSize: '28px',
    fontFamily: baseConfig.fontFamily.heading,  // Work Sans for headings
    color: baseConfig.color.accent,  // Red color for main headings
    lineHeight: '1.4',
    margin: '15px 0 10px 0',
    fontWeight: 'bold',
    textAlign: 'left' as const,  // Prevent Gmail from centering headings
    ...baseConfig.appleMailFix
  },

  /**
   * Sub heading style (h3, h4) - for event titles, group names
   */
  subHeading: {
    fontSize: '24px',
    fontFamily: baseConfig.fontFamily.heading,  // Work Sans for headings
    color: baseConfig.color.primary,
    lineHeight: '1.4',
    margin: '0px 0 10px 0',
    fontWeight: 'bold',
    textAlign: 'left' as const,  // Prevent Gmail from centering sub headings
    ...baseConfig.appleMailFix
  },

  /**
   * Meta data style - for dates, author info, small details
   */
  metaData: {
    fontSize: '20px',
    fontFamily: baseConfig.fontFamily.text,  // Inter for text content
    color: baseConfig.color.secondary,  // Lighter gray for meta info
    lineHeight: baseConfig.lineHeight,
    margin: '0px 0 10px 0',
    fontWeight: 'bold',
    textAlign: 'left' as const,  // Prevent Gmail from centering meta data
    ...baseConfig.appleMailFix
  },

  /**
   * Body text style - for main content, descriptions
   */
  text: {
    fontSize: '20px',
    fontFamily: baseConfig.fontFamily.text,  // Inter for text content
    color: baseConfig.color.primary,
    lineHeight: baseConfig.lineHeight,
    margin: '0 0 22px 0',
    textAlign: 'left' as const,  // Prevent Gmail from centering text content
    ...baseConfig.appleMailFix
  }
};

/**
 * Export individual styles for easy destructuring
 */
export const { heading, subHeading, metaData, text } = emailTextStyles;