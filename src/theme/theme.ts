import { createTheme } from '@mui/material/styles';

// Extend the TypeBackground interface to include our custom properties
declare module '@mui/material/styles' {
  interface TypeBackground {
    darkHeader?: string;
  }
}

// Create a theme instance based on Die Linke Frankfurt style guidelines
const theme = createTheme({
  palette: {
    primary: {
      main: '#FF0000', // Brand Red
      dark: '#b30000',  // Darker Red for hover
    },
    secondary: {
      main: '#006473', // Dark Teal/Cyan for the "Willkommen" bar
    },
    common: {
      black: '#000000',
      white: '#FFFFFF',
    },
    text: {
      primary: '#000000',   // Main text, headings
      secondary: '#333333', // Sub-headings, meta text, sub-menu items
    },
    background: {
      default: '#FFFFFF', // Main page background
      paper: '#FFFFFF',   // Drawer, Card backgrounds
      darkHeader: '#222222', // Custom for the top utility bar
    },
    grey: {
      100: '#f0f0f0', // Light backgrounds, inputs
      300: '#e5e5e5', // Borders, dividers (<hr>)
      400: '#dddddd', // Common borders
      500: '#cccccc', // Slightly darker gray borders
      700: '#262626', // Footer background (if needed)
    },
    action: {
      active: '#DE0000', // For active states like navigation
    },
    divider: '#000000', // Or a dark grey like grey[700] for menu item separators
    error: {
      main: '#b30000', // Keeping an error color for form validation, etc.
    }
  },
  typography: {
    fontFamily: '"Open Sans", "Helvetica Neue", Helvetica, Arial, sans-serif',
    fontWeightLight: 300,
    fontWeightRegular: 400,
    fontWeightMedium: 600, // Semibold
    fontWeightBold: 700,   // Bold

    // Adjust variants to match website's hierarchy
    h1: { // Site Title (if distinct)
      fontWeight: 700,
      fontSize: '2.2rem', // approx 35px
      lineHeight: 1.2,
    },
    h4: { // Main section headings
      fontWeight: 700,
      fontSize: '1.75rem', // approx 28px
      lineHeight: 1.2,
    },
    h5: { // Sub-headings
      fontWeight: 700,
      fontSize: '1.5rem', // approx 24px
      lineHeight: 1.2,
    },
    h6: { // Drawer title, Widget titles
      fontWeight: 600,
      fontSize: '1.25rem', // approx 20px
      lineHeight: 1.2,
    },
    subtitle1: { // Main navigation items
      fontWeight: 700, // or 600
      fontSize: '1.125rem', // approx 18px
    },
    body1: { // Standard body text, sub-navigation items
      fontWeight: 400,
      fontSize: '1rem', // 16px
      lineHeight: 1.6,
    },
    body2: { // Meta text, breadcrumbs, top bar text
      fontWeight: 400,
      fontSize: '0.875rem', // 14px
    },
    button: {
      fontWeight: 600,
      textTransform: 'none', // Original site doesn't use uppercase buttons
    },
  },
  components: {
    MuiAppBar: {
      defaultProps: {
        elevation: 0, // Site header doesn't show strong shadows usually
      },
      styleOverrides: {
        root: {
          backgroundColor: '#222222', // Matching the dark header background
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 0, // Square buttons instead of rounded
          boxShadow: 'none', // Remove default shadows
          padding: '0.75rem 1.5rem',
          transition: 'background-color 0.3s ease',
        },
        containedPrimary: {
          backgroundColor: '#FF0000',
          '&:hover': {
            backgroundColor: '#b30000', // theme.palette.primary.dark
            boxShadow: 'none', // Keep consistent - no shadow on hover
          },
        },
        outlinedPrimary: {
          borderColor: '#FF0000',
          color: '#FF0000',
          '&:hover': {
            backgroundColor: 'rgba(255, 0, 0, 0.04)',
            borderColor: '#b30000',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 0, // Square cards
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)', // Lighter shadow
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 0, // Square input fields
            '&.Mui-focused fieldset': {
              borderColor: '#FF0000',
              borderWidth: '2px',
            },
          },
          '& .MuiInputLabel-root.Mui-focused': {
            color: '#FF0000',
          },
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          '&.Mui-selected': {
            backgroundColor: 'transparent',
            color: '#FF0000',
            '& .MuiListItemText-primary': {
              fontWeight: 700,
              color: '#FF0000',
            },
          },
          '&:hover': {
            backgroundColor: 'rgba(255, 0, 0, 0.04)',
          },
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
          width: 300, // Default drawer width
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 4, // Slightly rounded chips
        },
        outlinedPrimary: {
          borderColor: '#cccccc',
          color: '#262626',
          marginRight: '3px',
        },
      },
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          '&:before': {
            display: 'none', // Remove the default line
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          backgroundColor: '#FF0000', // Brand red for tab indicator
          height: 3, // Slightly thicker indicator
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          '&.Mui-selected': {
            color: '#FF0000',
          },
        },
      },
    },
  },
});

export default theme;