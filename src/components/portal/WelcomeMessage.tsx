import { Card, CardContent, Typography } from '@mui/material';

interface WelcomeMessageProps {
  username: string;
  firstName?: string | null;
}

/**
 * Welcome message component for portal start page
 *
 * @param username - User's username
 * @param firstName - User's first name (optional)
 * @returns Welcome message component
 */
export default function WelcomeMessage({ username, firstName }: WelcomeMessageProps) {
  const displayName = firstName || username;

  return (
    <Card>
      <CardContent>
        <Typography variant="h4" component="h1" gutterBottom>
          Willkommen im Mitgliederbereich
        </Typography>

        <Typography variant="body1" paragraph>
          Hallo {displayName},
        </Typography>

        <Typography variant="body1" paragraph>
          herzlich willkommen im Mitgliederbereich von Die Linke Frankfurt Kreisverband.
        </Typography>

        <Typography variant="body1">
          Hier finden Sie Informationen und Funktionen, die ausschließlich für Mitglieder zugänglich sind.
        </Typography>
      </CardContent>
    </Card>
  );
}
