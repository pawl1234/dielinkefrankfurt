'use client';

import { ReactNode, useEffect, useState } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import 'dayjs/locale/de';

export default function MuiSetup({ children }: { children: ReactNode }) {
  // Fix for hydration errors - only render once the client is mounted
  const [mounted, setMounted] = useState(false);
  
  // Create a forced theme with correct colors
  const forcedTheme = createTheme({
    palette: {
      primary: {
        main: '#FF0000', // Die Linke Red
      },
      secondary: {
        main: '#006473', // Teal color
      },
    },
  });
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Fix for hydration errors - only render MUI components after mount
  if (!mounted) {
    // Return a placeholder with the same structure to avoid layout shifts
    return <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>{children}</div>;
  }
  
  return (
    <ThemeProvider theme={forcedTheme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="de">
        {children}
      </LocalizationProvider>
    </ThemeProvider>
  );
}