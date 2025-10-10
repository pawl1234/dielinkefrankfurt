// src/components/MainLayout.tsx
'use client';

import { useState, ReactNode /* useEffect - no longer needed */ } from 'react';
import {
  Box,
  Container,
  Paper,
  IconButton,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  Toolbar,
  Typography,
  Breadcrumbs,
  Tooltip,
  Divider,
  ListItemIcon,
  Collapse,
  Link as MuiLink
} from '@mui/material';
import Link from 'next/link';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import HomeIcon from '@mui/icons-material/Home';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import GroupsIcon from '@mui/icons-material/Groups';
import { useSession, signIn, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
// import MuiSetup from './MuiSetup'; // REMOVE THIS LINE

// Menu item types for structured navigation
type MenuItemType = 'link' | 'divider' | 'submenu';

interface BaseMenuItem {
  type: MenuItemType;
  key: string;
}

interface LinkMenuItem extends BaseMenuItem {
  type: 'link';
  label: string;
  href: string;
  icon?: ReactNode;
}

interface DividerMenuItem extends BaseMenuItem {
  type: 'divider';
}

interface SubmenuMenuItem extends BaseMenuItem {
  type: 'submenu';
  label: string;
  icon?: ReactNode;
  items: MenuItem[];
}

type MenuItem = LinkMenuItem | DividerMenuItem | SubmenuMenuItem;

// Main navigation structure
const mainNavigation: MenuItem[] = [
  {
    type: 'link',
    key: 'home',
    label: 'Startseite',
    href: '/',
    icon: <HomeIcon />
  },
  {
    type: 'link',
    key: 'groups',
    label: 'Arbeitsgruppen',
    href: '/gruppen',
    icon: <GroupsIcon />
  },  
  {
    type: 'link',
    key: 'new-appointment',
    label: 'Termin anfragen',
    href: '/neue-anfrage',
    icon: <AddCircleOutlineIcon />
  },
  {
    type: 'link',
    key: 'new-report',
    label: 'Status Report',
    href: '/gruppen-bericht',
    icon: <AddCircleOutlineIcon />
  },
  {
    type: 'link',
    key: 'new-group',
    label: 'Neue Gruppe',
    href: '/neue-gruppe',
    icon: <AddCircleOutlineIcon />
  },
  {
    type: 'link',
    key: 'admin-dashboard',
    label: 'Administration',
    href: '/admin/login?callbackUrl=https%3A%2F%2Fportal.die-linke-frankfurt.de%2Fadmin',
    icon: <AdminPanelSettingsIcon />
  }
];

interface BreadcrumbItem {
  label: string;
  href?: string;
  active?: boolean;
}

interface MainLayoutProps {
  children: ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  showHeader?: boolean;
  title?: string;
}

export function MainLayout({ children, breadcrumbs = [], showHeader = true, title }: MainLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { status } = useSession();
  const isAuthenticated = status === 'authenticated';
  const pathname = usePathname();

  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({});

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleAuth = () => {
    if (isAuthenticated) {
      signOut({ callbackUrl: '/' });
    } else {
      signIn(undefined, { callbackUrl: '/admin' });
    }
  };

  const toggleSubmenu = (key: string) => {
    setOpenSubmenus(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const isRouteActive = (href: string): boolean => {
    if (href === '/' && pathname === '/') return true;
    if (href !== '/' && pathname && pathname.startsWith(href)) return true;
    return breadcrumbs.some(b => b.href === href && b.active);
  };

  const renderMenuItem = (item: MenuItem, depth = 0) => {
    const paddingLeft = depth * 2;

    if (item.type === 'divider') {
      return <Divider key={item.key} sx={{ my: 1 }} />;
    }

    if (item.type === 'link') {
      const isActive = isRouteActive(item.href);

      return (
        <ListItemButton
          key={item.key}
          component={Link}
          href={item.href}
          selected={isActive}
          sx={{
            pl: paddingLeft + 2,
            '&.Mui-selected': {
              color: 'primary.main',
              '& .MuiListItemText-primary': {
                fontWeight: 'fontWeightBold',
                color: 'primary.main',
              },
            },
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          {item.icon && (
            <ListItemIcon sx={{ color: isActive ? 'primary.main' : 'inherit' }}>
              {item.icon}
            </ListItemIcon>
          )}
          <ListItemText
            primary={item.label}
            primaryTypographyProps={{
              fontWeight: isActive ? 'fontWeightBold' : 'fontWeightMedium',
              color: 'inherit'
            }}
          />
        </ListItemButton>
      );
    }

    if (item.type === 'submenu') {
      const isOpen = Boolean(openSubmenus[item.key]);
      const hasActiveChild = item.items.some(
        subItem => subItem.type === 'link' && isRouteActive(subItem.href)
      );

      return (
        <Box key={item.key}>
          <ListItemButton
            onClick={() => toggleSubmenu(item.key)}
            sx={{
              pl: paddingLeft + 2,
              color: hasActiveChild ? 'primary.main' : 'inherit',
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            {item.icon && (
              <ListItemIcon sx={{ color: hasActiveChild ? 'primary.main' : 'inherit' }}>
                {item.icon}
              </ListItemIcon>
            )}
            <ListItemText
              primary={item.label}
              primaryTypographyProps={{
                fontWeight: hasActiveChild ? 'fontWeightBold' : 'fontWeightMedium',
                color: 'inherit'
              }}
            />
            {isOpen ? <ExpandLess /> : <ExpandMore />}
          </ListItemButton>
          <Collapse in={isOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.items.map(subItem => renderMenuItem(subItem, depth + 1))}
            </List>
          </Collapse>
        </Box>
      );
    }

    return null;
  };

  const drawer = (
    <Box sx={{ width: 300 }}>
      <Toolbar sx={{ justifyContent: 'space-between', borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 'fontWeightBold' }}>
          Die Linke Frankfurt
        </Typography>
        <IconButton
          onClick={handleDrawerToggle}
          sx={{ color: 'text.primary' }}
          aria-label="close menu"
        >
          <CloseIcon />
        </IconButton>
      </Toolbar>
      <List component="nav">
        {mainNavigation.map(item => renderMenuItem(item))}
      </List>
    </Box>
  );

  const currentYear = new Date().getFullYear();

  return (
    // <MuiSetup>  // REMOVE THIS WRAPPER
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Box sx={{ flex: '1 0 auto' }}>
        {showHeader && (
          <>
            <Box
              sx={{
                position: 'relative',
                backgroundImage: 'url("/images/header-bg.jpg")',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                py: { xs: 3, md: 4 },
                mb: 4
              }}
            >
              <Paper
                elevation={2}
                sx={{
                  p: 0.5,
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: 1,
                  bgcolor: 'common.white',
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  zIndex: 10
                }}
              >
                <Tooltip title={isAuthenticated ? "Abmelden" : "Anmelden"}>
                  <IconButton
                    aria-label={isAuthenticated ? "logout" : "login"}
                    onClick={handleAuth}
                    sx={{
                      mr: 0.5,
                      color: isAuthenticated ? 'primary.main' : 'grey.700',
                      fontSize: 'large',
                      p: { xs: 1, md: 1.5 }
                    }}
                  >
                    {isAuthenticated ? (
                      <LogoutIcon sx={{ fontSize: 24 }} />
                    ) : (
                      <LoginIcon sx={{ fontSize: 24 }} />
                    )}
                  </IconButton>
                </Tooltip>

                {isAuthenticated && (
                  <>
                    <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                    <Tooltip title="Passwort ändern">
                      <IconButton
                        component={Link}
                        href="/admin/change-password"
                        aria-label="change password"
                        sx={{
                          mr: 0.5,
                          color: 'grey.700',
                          fontSize: 'large',
                          p: { xs: 1, md: 1.5 }
                        }}
                      >
                        <VpnKeyIcon sx={{ fontSize: 24 }} />
                      </IconButton>
                    </Tooltip>
                  </>
                )}

                <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

                <IconButton
                  aria-label="search"
                  sx={{
                    mr: 0.5,
                    color: 'grey.700',
                    fontSize: 'large',
                    p: { xs: 1, md: 1.5 }
                  }}
                >
                  <SearchIcon sx={{ fontSize: 24 }} />
                </IconButton>

                {!breadcrumbs.some(b => b.href === '/') ? (
                  <Link href="/" style={{ display: 'flex' }}>
                    <IconButton
                      aria-label="home"
                      sx={{
                        color: 'grey.700',
                        fontSize: 'large',
                        p: { xs: 1, md: 1.5 }
                      }}
                    >
                      <HomeIcon sx={{ fontSize: 24 }} />
                    </IconButton>
                  </Link>
                ) : (
                  <IconButton
                    aria-label="menu"
                    onClick={handleDrawerToggle}
                    sx={{
                      color: 'grey.700',
                      fontSize: 'large',
                      p: { xs: 1, md: 1.5 }
                    }}
                  >
                    <MenuIcon sx={{ fontSize: 24 }} />
                  </IconButton>
                )}
              </Paper>

              <Container maxWidth="lg">
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'flex-start',
                    alignItems: 'center',
                    width: '100%'
                  }}
                >
                  <Box
                    component="div"
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: { xs: 'center', md: 'flex-start' }
                    }}
                  >
                    <Box
                      component="img"
                      src="/images/logo.png"
                      alt="Die Linke Kreisverband Frankfurt Logo"
                      sx={{
                        height: 'auto',
                        width: { xs: '220px', md: '280px' },
                        maxWidth: '100%',
                      }}
                    />
                  </Box>
                </Box>
              </Container>
            </Box>

            <Drawer
              anchor="right"
              open={mobileOpen}
              onClose={handleDrawerToggle}
              ModalProps={{
                keepMounted: true,
              }}
            >
              {drawer}
            </Drawer>
          </>
        )}

        {title && (
          <Container maxWidth="lg" sx={{ mt: 3, mb: 0 }}>
            <Typography variant="h4" component="h1" fontWeight="bold">
              {title}
            </Typography>
          </Container>
        )}

        {breadcrumbs.length > 0 && (
          <Container maxWidth="lg" sx={{ mb: 2 }}>
            <Box
              component="nav"
              aria-label="breadcrumb"
              sx={{ py: 2 }}
            >
              {breadcrumbs.length === 1 ? (
                <Breadcrumbs
                  separator={<NavigateNextIcon fontSize="small" />}
                  aria-label="breadcrumb"
                >
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <HomeIcon sx={{ mr: 0.5, fontSize: 18, color: 'text.secondary' }} />
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ fontWeight: 'medium' }}
                    >
                      {breadcrumbs[0].label}
                    </Typography>
                  </Box>
                </Breadcrumbs>
              ) : (
                <Breadcrumbs
                  separator={<NavigateNextIcon fontSize="small" color="action" />}
                  aria-label="breadcrumb"
                >
                  {breadcrumbs.map((item, index) => {
                    const isLast = index === breadcrumbs.length - 1;
                    const isFirst = index === 0;

                    if (isLast) {
                      return (
                        <Typography
                          key={item.label}
                          variant="body2"
                          color="text.primary"
                          sx={{ fontWeight: 'medium' }}
                        >
                          {item.label}
                        </Typography>
                      );
                    }

                    return (
                      <Link
                        key={item.label}
                        href={item.href || '/'}
                        style={{ textDecoration: 'none' }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {isFirst && <HomeIcon sx={{ mr: 0.5, fontSize: 18, color: 'text.secondary' }} />}
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ '&:hover': { textDecoration: 'underline' } }}
                          >
                            {item.label}
                          </Typography>
                        </Box>
                      </Link>
                    );
                  })}
                </Breadcrumbs>
              )}
            </Box>
          </Container>
        )}

        {children}
      </Box>

      <Box
        component="footer"
        sx={{
          py: 3,
          mt: 'auto',
          backgroundColor: 'grey.500', // MUI grey[500]
          color: 'common.white'
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'center', md: 'flex-start' }
          }}>
            <Typography color='common.black' sx={{ mb: { xs: 2, md: 0 } }}>
              © {currentYear} Die Linke Kreisverband Frankfurt
            </Typography>

            <Box sx={{ display: 'flex', gap: 4 }}>
              <MuiLink
                href="https://www.die-linke-frankfurt.de/service/impressum-und-datenschutzerklaerung/"
                color="common.black"
                underline="hover"
                sx={{ fontWeight: 'medium' }}
              >
                Impressum
              </MuiLink>
              <MuiLink
                href="https://www.die-linke-frankfurt.de/service/impressum-und-datenschutzerklaerung/"
                color="common.black"
                underline="hover"
                sx={{ fontWeight: 'medium' }}
              >
                Datenschutz
              </MuiLink>
            </Box>
          </Box>
        </Container>
      </Box>
    </Box>
    // </MuiSetup> // REMOVE THIS WRAPPER
  );
}