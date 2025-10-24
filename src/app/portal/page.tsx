import { Container, Box } from '@mui/material';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { redirect } from 'next/navigation';
import { findUserById } from '@/lib/db/user-queries';
import WelcomeMessage from '@/components/portal/WelcomeMessage';

export const metadata = {
  title: 'Startseite - Mitgliederbereich',
  description: 'Mitgliederbereich von Die Linke Frankfurt Kreisverband',
};

/**
 * Portal start page
 */
export default async function PortalPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login?callbackUrl=/portal');
  }

  // Get user details for firstName
  const user = await findUserById(session.user.id);

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <WelcomeMessage
          username={session.user.username}
          firstName={user?.firstName}
        />
      </Box>
    </Container>
  );
}
