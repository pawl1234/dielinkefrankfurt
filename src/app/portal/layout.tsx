import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { redirect } from 'next/navigation';
import { MainLayout } from '@/components/layout/MainLayout';
import PortalNavigation from '@/components/portal/PortalNavigation';
import HomeIcon from '@mui/icons-material/Home';
import DashboardIcon from '@mui/icons-material/Dashboard';
import SettingsIcon from '@mui/icons-material/Settings';
import PersonIcon from '@mui/icons-material/Person';
import HelpCenterIcon from '@mui/icons-material/HelpCenter';
import type { MenuItem } from '@/types/component-types';

/**
 * Portal navigation items
 * Add or modify items here to customize the portal navigation
 */
const portalNavigationItems: MenuItem[] = [
  {
    type: 'link',
    key: 'home',
    label: 'Startseite',
    href: '/portal',
    icon: <HomeIcon />,
  },
  {
    type: 'link',
    key: 'dashboard',
    label: 'Dashboard',
    href: '/portal/dashboard',
    icon: <DashboardIcon />,
  },
  {
    type: 'link',
    key: 'faq',
    label: 'FAQ',
    href: '/portal/faq',
    icon: <HelpCenterIcon />,
  },
  {
    type: 'submenu',
    key: 'settings',
    label: 'Einstellungen',
    icon: <SettingsIcon />,
    items: [
      {
        type: 'link',
        key: 'profile',
        label: 'Profil',
        href: '/portal/settings/profile',
        icon: <PersonIcon />,
      },
    ],
  },
];

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
      <PortalNavigation items={portalNavigationItems} />

      {/* Portal page content */}
      {children}
    </MainLayout>
  );
}
