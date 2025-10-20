'use client';

import { useState, useEffect, Suspense } from 'react';
import { getCsrfToken } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Container
} from '@mui/material';
import MuiSetup from '@/components/ui/MuiSetup';

function LoginForm() {
  const [csrfToken, setCsrfToken] = useState('');
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/admin';

  useEffect(() => {
    getCsrfToken().then(token => setCsrfToken(token || ''));
  }, []);

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box
          component="form"
          method="post"
          action="/api/auth/callback/credentials"
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 3
          }}
        >
          <input name="csrfToken" type="hidden" value={csrfToken} />
          <input name="callbackUrl" type="hidden" value={callbackUrl} />

          <Typography variant="h5" component="h1" align="center" gutterBottom>
            Anmelden
          </Typography>

          <Typography variant="body1" align="center" color="text.secondary" sx={{ mb: 3 }}>
            Bitte melden Sie sich mit Ihren Zugangsdaten an.
          </Typography>

          <TextField
            name="username"
            label="Benutzername"
            variant="outlined"
            fullWidth
            required
            autoFocus
          />

          <TextField
            name="password"
            label="Passwort"
            type="password"
            variant="outlined"
            fullWidth
            required
          />

          <Button
            type="submit"
            variant="contained"
            color="primary"
            size="large"
            fullWidth
          >
            Anmelden
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}

export default function LoginPage() {
  return (
    <MuiSetup>
      <Suspense fallback={
        <Container maxWidth="sm" sx={{ mt: 8, display: 'flex', justifyContent: 'center' }}>
          Loading...
        </Container>
      }>
        <LoginForm />
      </Suspense>
    </MuiSetup>
  );
}
