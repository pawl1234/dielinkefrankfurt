'use client';

import { useState, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Container,
  Alert
} from '@mui/material';
import MuiSetup from '@/components/ui/MuiSetup';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  const callbackUrl = searchParams.get('callbackUrl') || null;
  const errorParam = searchParams.get('error');

  useEffect(() => {
    // Show error message if session was invalidated
    if (errorParam === 'SessionInvalidated') {
      setError('Ihre Sitzung wurde ungültig. Bitte melden Sie sich erneut an.');
    }
  }, [errorParam]);

  useEffect(() => {
    // Redirect if already authenticated
    if (status === 'authenticated' && session?.user) {
      const redirectUrl = callbackUrl || (session.user.role === 'admin' ? '/admin' : '/portal');
      router.push(redirectUrl);
    }
  }, [status, session, callbackUrl, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        username,
        password,
        callbackUrl: callbackUrl || undefined,
        redirect: false,
      });

      if (result?.error) {
        setError('Ungültige Anmeldedaten. Bitte versuchen Sie es erneut.');
        setLoading(false);
      } else if (result?.ok) {
        // Let useEffect handle the redirect based on session
        // The session will be updated after signIn succeeds
      }
    } catch {
      setError('Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.');
      setLoading(false);
    }
  };

  return (
    <MuiSetup>
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Box component="form" onSubmit={handleSubmit} sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 3
          }}>
            <Typography variant="h5" component="h1" align="center" gutterBottom>
              Anmelden
            </Typography>

            <Typography variant="body1" align="center" color="text.secondary" sx={{ mb: 3 }}>
              Bitte melden Sie sich mit Ihren Zugangsdaten an.
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <TextField
              label="Benutzername"
              variant="outlined"
              fullWidth
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
            />

            <TextField
              label="Passwort"
              type="password"
              variant="outlined"
              fullWidth
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Button
              type="submit"
              variant="contained"
              color="primary"
              size="large"
              fullWidth
              disabled={loading}
            >
              {loading ? 'Wird angemeldet...' : 'Anmelden'}
            </Button>
          </Box>
        </Paper>
      </Container>
    </MuiSetup>
  );
}
