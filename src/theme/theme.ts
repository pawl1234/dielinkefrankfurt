import { createTheme } from '@mui/material/styles';
import { red } from '@mui/material/colors';

// Create a theme instance
const theme = createTheme({
  palette: {
    primary: {
      main: '#BE0046', // Die Linke's rose/purple-red
    },
    secondary: {
      main: '#444444', // Dark gray
    },
    error: {
      main: '#B50000',
    },
    background: {
      default: '#F2F2F2', // Light gray
      paper: '#FFFFFF',
    },
    text: {
      primary: '#222222',
      secondary: '#666666', // Dark gray
    },
  },
  typography: {
    fontFamily: "'Dosis', 'Arial', sans-serif",
    h1: {
      fontWeight: 700,
      lineHeight: 1.2,
    },
    h2: {
      fontWeight: 700,
      lineHeight: 1.2,
    },
    h3: {
      fontWeight: 700,
      lineHeight: 1.2,
    },
    h4: {
      fontWeight: 700,
      lineHeight: 1.2,
    },
    h5: {
      fontWeight: 700,
      lineHeight: 1.2,
    },
    h6: {
      fontWeight: 700,
      lineHeight: 1.2,
    },
    button: {
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.025em',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          padding: '0.75rem 1.5rem',
          '&:hover': {
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.12)',
            transform: 'translateY(-1px)',
          },
          '&:active': {
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
            transform: 'translateY(0)',
          },
        },
        containedPrimary: {
          backgroundColor: '#BE0046',
          '&:hover': {
            backgroundColor: '#8C0033', // Darker shade for hover
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '&.Mui-focused fieldset': {
              borderColor: '#BE0046',
              borderWidth: '2px',
            },
          },
          '& .MuiInputLabel-root.Mui-focused': {
            color: '#BE0046',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        input: {
          fontFamily: "'Dosis', 'Arial', sans-serif",
        },
      },
    },
  },
});

export default theme;