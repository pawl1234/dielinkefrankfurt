import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { redirect } from 'next/navigation';
import { MainLayout } from '@/components/layout/MainLayout';
import PortalNavigation from '@/components/portal/PortalNavigation';

/**
 * Portal layout with MainLayout wrapper and portal-specific navigation
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
    <MainLayout showHeader={true} title="Mitgliederbereich">
      {/* Portal-specific horizontal navigation */}
      <PortalNavigation />

      {/* Portal page content */}
      {children}
    </MainLayout>
  );
}
