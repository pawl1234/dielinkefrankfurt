'use client';

import { useState, ReactNode, useEffect } from 'react';
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
  Chip,
  Breadcrumbs,
  Tooltip,
  Divider
} from '@mui/material';
import Link from 'next/link';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import HomeIcon from '@mui/icons-material/Home';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import { useSession, signIn, signOut } from 'next-auth/react';
import MuiSetup from './MuiSetup';

interface BreadcrumbItem {
  label: string;
  href?: string;
  active?: boolean;
}

interface MainLayoutProps {
  children: ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  showHeader?: boolean;
}

export function MainLayout({ children, breadcrumbs = [], showHeader = true }: MainLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: session, status } = useSession();
  const isAuthenticated = status === 'authenticated';

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

  // Navigation drawer content
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
        <ListItemButton
          component={Link}
          href="/"
          selected={breadcrumbs.some(b => b.href === '/' && b.active)}
          sx={{
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
          <ListItemText 
            primary="Termine" 
            primaryTypographyProps={{ 
              fontWeight: 'fontWeightBold', 
              color: 'inherit' 
            }} 
          />
        </ListItemButton>
        <ListItemButton
          component={Link}
          href="/neue-anfrage"
          selected={breadcrumbs.some(b => b.href === '/neue-anfrage' && b.active)}
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <ListItemText 
            primary="Termin anfragen" 
            primaryTypographyProps={{ 
              fontWeight: 'fontWeightBold', 
              color: 'text.primary' 
            }} 
          />
        </ListItemButton>
        <ListItemButton
          component={Link}
          href="/gruppen"
          selected={breadcrumbs.some(b => b.href?.startsWith('/gruppen') && b.active)}
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <ListItemText 
            primary="Arbeitsgruppen" 
            primaryTypographyProps={{ 
              fontWeight: 'fontWeightBold', 
              color: 'text.primary' 
            }} 
          />
        </ListItemButton>
        <ListItemButton
          component={Link}
          href="/admin"
          selected={breadcrumbs.some(b => b.href?.startsWith('/admin') && b.active)}
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <ListItemText 
            primary="Administration" 
            primaryTypographyProps={{ 
              fontWeight: 'fontWeightBold', 
              color: 'text.primary' 
            }} 
          />
        </ListItemButton>
      </List>
    </Box>
  );

  return (
    <MuiSetup>
      {showHeader && (
        <>
          {/* Main header with logo and background */}
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
            {/* Header actions - positioned absolutely in top right */}
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
                {/* Logo */}
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

          {/* Mobile navigation drawer */}
          <Drawer
            anchor="right"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            ModalProps={{
              keepMounted: true, // Better mobile performance
            }}
          >
            {drawer}
          </Drawer>
        </>
      )}

      {/* Breadcrumbs if provided */}
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

      {/* Main content */}
      {children}
    </MuiSetup>
  );
}