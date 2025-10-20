import { Box } from '@mui/material';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { redirect } from 'next/navigation';
import PortalNavigation from '@/components/portal/PortalNavigation';

/**
 * Portal layout with navigation menu
 */
export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  // Redirect if not authenticated (middleware should handle this, but double-check)
  if (!session?.user) {
    redirect('/login?callbackUrl=/portal');
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <PortalNavigation
        username={session.user.username}
        role={session.user.role}
      />

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          ml: { xs: 0, md: '250px' }, // Offset for permanent drawer on desktop
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
