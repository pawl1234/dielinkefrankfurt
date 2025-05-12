'use client';

import MuiSetup from '@/components/MuiSetup';
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Box,
  Paper,
  Card,
  CardContent,
  Button,
  Grid,
  Divider,
  Chip,
  CircularProgress,
  CardActions,
  CardHeader,
  List,
  ListItemButton,
  ListItemText,
  Drawer,
  IconButton
} from '@mui/material';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import Link from 'next/link';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import EventIcon from '@mui/icons-material/Event';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AddIcon from '@mui/icons-material/Add';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import HomeIcon from '@mui/icons-material/Home';

interface Appointment {
  id: number;
  title: string;
  teaser: string;
  startDateTime: string;
  endDateTime: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
}

export default function Home() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/appointments');
        
        if (!response.ok) {
          throw new Error('Failed to fetch appointments');
        }
        
        const data = await response.json();
        setAppointments(data);
      } catch (err) {
        console.error('Error fetching appointments:', err);
        setError('Failed to load appointments. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAppointments();
  }, []);

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
          selected
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
          href="/admin"
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
          <IconButton
            aria-label="search"
            sx={{
              mr: 0.5,
              color: 'grey.700',
              fontSize: 'large',
              p: { xs: 1, md: 1.5 }
            }}
          >
            <SearchIcon sx={{ fontSize: 28 }} />
          </IconButton>
          <IconButton
            aria-label="menu"
            onClick={handleDrawerToggle}
            sx={{
              color: 'grey.700',
              fontSize: 'large',
              p: { xs: 1, md: 1.5 }
            }}
          >
            <MenuIcon sx={{ fontSize: 28 }} />
          </IconButton>
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
      
      {/* Breadcrumbs */}
      <Container maxWidth="lg" sx={{ mb: 2 }}>
        <Box 
          component="nav" 
          aria-label="breadcrumb" 
          sx={{ py: 1 }}
        >
          <Chip
            icon={<HomeIcon fontSize="small" />}
            label="Termine"
            component={Link}
            href="/"
            clickable
            color="primary"
            variant="outlined"
            size="small"
          />
        </Box>
      </Container>

      <Container maxWidth="lg">
        {/* Title section container */}
        <Box sx={{ mb: 4 }}>
          {/* Red primary title bar */}
          <Box
            sx={{
              display: 'inline-block',
              bgcolor: 'primary.main',
              color: 'common.white',
              p: { xs: 1.5, md: 2 },
              borderRadius: 0
            }}
          >
            <Typography variant="h4" component="h2" sx={{ fontWeight: 'fontWeightBold' }}>
              Die Linke Frankfurt - Mitglieder Portal
            </Typography>
          </Box>

          {/* Clear floating and add small spacing 
          <Box sx={{ display: 'block', height: '8px' }}></Box> */}

          {/* Secondary subtitle bar - indented from primary title */}
          <Box
            sx={{
              display: 'inline-block',
              bgcolor: 'secondary.main',
              color: 'common.white',
              p: { xs: 1.5, md: 1.5 },
              ml: { xs: 3, md: 4 },
              borderRadius: 0
            }}
          >
            <Typography variant="body1" sx={{ fontWeight: 'fontWeightMedium' }}>
              Willkommen auf unserer Seite. Hier finden Sie alle Termine der Partei in Frankfurt.
            </Typography>
          </Box>
        </Box>

        {/* Call to action button */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            mb: 4
          }}
        >
          <Button 
            href="/neue-anfrage"
            variant="contained" 
            size="large"
            startIcon={<AddIcon />}
            LinkComponent={Link}
          >
            Neuen Termin anfragen
          </Button>
        </Box>

        {/* Content */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="error" paragraph>{error}</Typography>
            <Button
              href="/neue-anfrage"
              variant="contained"
              LinkComponent={Link}
            >
              Neuen Termin anfragen
            </Button>
          </Paper>
        ) : appointments.length === 0 ? (
          <Paper sx={{ p: 5, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary" paragraph>
              Aktuell sind keine anstehenden Termine vorhanden.
            </Typography>
            <Button
              href="/neue-anfrage"
              variant="contained"
              startIcon={<AddIcon />}
              LinkComponent={Link}
            >
              Termin anfragen
            </Button>
          </Paper>
        ) : (
          <>
            <Typography variant="h5" component="h3" sx={{ fontWeight: 'fontWeightBold', mb: 3 }}>
              Anstehende Veranstaltungen
            </Typography>
            
            <Grid container spacing={3}>
              {appointments.map((appointment) => (
                <Grid item xs={12} sm={6} md={4} key={appointment.id}>
                  <Card elevation={1} sx={{ 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column',
                  }}>
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Typography 
                        variant="h6" 
                        component="h3" 
                        gutterBottom
                        sx={{ 
                          fontWeight: 'medium',
                          color: 'primary.main',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          mb: 1
                        }}
                      >
                        {appointment.title}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                        <Chip 
                          icon={<CalendarTodayIcon />}
                          label={format(new Date(appointment.startDateTime), 'dd. MMM', { locale: de })}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                        <Chip 
                          icon={<EventIcon />}
                          label={format(new Date(appointment.startDateTime), 'HH:mm', { locale: de })}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                        {appointment.city && (
                          <Chip 
                            icon={<LocationOnIcon />}
                            label={appointment.city}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        )}
                      </Box>
                      
                      <Typography 
                        variant="body1"
                        sx={{ 
                          mb: 2,
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          color: 'text.secondary',
                          flexGrow: 1
                        }}
                      >
                        {appointment.teaser}
                      </Typography>
                    </CardContent>
                    
                    <CardActions sx={{ p: 2, pt: 0 }}>
                      <Button
                        href={`/termine/${appointment.id}`}
                        variant="contained"
                        fullWidth
                        LinkComponent={Link}
                      >
                        Details anzeigen
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </>
        )}
        
        <Box 
          sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            mt: 6, 
            mb: 4 
          }}
        >
          <Button
            href="/neue-anfrage"
            variant="outlined"
            size="large"
            startIcon={<AddIcon />}
            LinkComponent={Link}
          >
            Eigenen Termin anfragen
          </Button>
        </Box>

        <Box
          component="footer"
          sx={{
            mt: 3,
            textAlign: 'center',
            pb: 3
          }}
        >
          <Typography variant="body2" color="text.secondary">
            © {new Date().getFullYear()} Die Linke Frankfurt am Main
          </Typography>
        </Box>
      </Container>
    </MuiSetup>
  );
}