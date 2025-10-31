import {
  Typography,
  Box,
  Paper,
  Card,
  CardContent,
  Button,
  Grid,
  Divider,
  Chip,
  CardActions,
} from '@mui/material';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import Link from 'next/link';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import EventIcon from '@mui/icons-material/Event';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AddIcon from '@mui/icons-material/Add';
import { PaginatedResponse } from '@/types/api-types';
import { PublicAppointment } from '@/types/component-types';
import SafeHtml from '@/components/ui/SafeHtml';
import UrlPagination from '@/components/pagination/UrlPagination';

/**
 * Props for AppointmentsSectionServer component
 */
interface AppointmentsSectionServerProps {
  /** Paginated appointments data */
  appointments: PaginatedResponse<PublicAppointment>;
  /** Current page number for appointments */
  currentPage: number;
  /** Current page number for groups (to preserve in URLs) */
  groupsPage: number;
}

/**
 * Server component for rendering appointments section with pagination.
 * Displays upcoming appointments with location, date, and time information.
 * Supports URL-based pagination with preserved group page state.
 *
 * @param props - AppointmentsSectionServerProps
 */
export default function AppointmentsSectionServer({
  appointments,
  currentPage,
  groupsPage,
}: AppointmentsSectionServerProps) {
  return (
    <>
      <Divider id="appointments" sx={{ scrollMarginTop: '80px' }}>
        <b>Termine</b>
      </Divider>

      <Box sx={{ display: 'flex', justifyContent: 'left', mb: 4, mt: 2 }}>
        <Button
          href="/neue-anfrage"
          variant="outlined"
          size="large"
          startIcon={<AddIcon />}
          LinkComponent={Link}
        >
          Neuen Termin eintragen
        </Button>
      </Box>

      {appointments.items.length === 0 ? (
        <Paper sx={{ p: 5, textAlign: 'center', mb: 4 }}>
          <Typography variant="h6" color="text.secondary" paragraph>
            Aktuell sind keine anstehenden Termine vorhanden.
          </Typography>
        </Paper>
      ) : currentPage > appointments.totalPages && appointments.totalPages > 0 ? (
        <Paper sx={{ p: 5, textAlign: 'center', mb: 4 }}>
          <Typography variant="h6" color="text.secondary" paragraph>
            Die angeforderte Seite existiert nicht.
          </Typography>
          <Button
            variant="contained"
            href="/?aPage=1#appointments"
            LinkComponent={Link}
          >
            Zur ersten Seite
          </Button>
        </Paper>
      ) : (
        <>
          <Typography
            variant="h5"
            component="h3"
            sx={{ fontWeight: 'fontWeightBold', mb: 3 }}
          >
            Anstehende Veranstaltungen
          </Typography>
          <Grid container spacing={3}>
            {appointments.items.map((appointment) => (
              <Grid size={{ xs: 12 }} key={appointment.id}>
                <Card>
                  <CardContent>
                    <Typography
                      variant="subtitle1"
                      sx={{ fontWeight: 'bold', fontSize: '22px' }}
                    >
                      {appointment.title}
                    </Typography>
                    <Box mt={1} mb={1}>
                      <Chip
                        icon={<CalendarTodayIcon />}
                        label={format(
                          new Date(appointment.startDateTime),
                          'dd. MMM',
                          { locale: de }
                        )}
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ mr: 0.5, mb: 0.5 }}
                      />
                      <Chip
                        icon={<EventIcon />}
                        label={format(
                          new Date(appointment.startDateTime),
                          'HH:mm',
                          { locale: de }
                        )}
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ mr: 0.5, mb: 0.5 }}
                      />
                      {appointment.city && (
                        <Chip
                          icon={<LocationOnIcon />}
                          label={appointment.city}
                          size="small"
                          color="primary"
                          variant="outlined"
                          sx={{ mr: 0.5, mb: 0.5 }}
                        />
                      )}
                    </Box>
                    <SafeHtml
                      html={appointment.mainText}
                      sx={{
                        mb: 2,
                        display: '-webkit-box',
                        WebkitLineClamp: 5,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        color: 'text.secondary',
                        flexGrow: 1,
                      }}
                    />
                  </CardContent>
                  <CardActions sx={{ p: 2, pt: 0 }}>
                    <Button
                      href={`/termine/${appointment.slug || appointment.id}`}
                      variant="contained"
                      LinkComponent={Link}
                    >
                      Details anzeigen
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Pagination - only show when items exist and multiple pages */}
          {appointments.totalPages > 1 && (
            <UrlPagination
              currentPage={currentPage}
              totalPages={appointments.totalPages}
              queryParamName="aPage"
              sectionId="appointments"
              preserveParams={{ gPage: groupsPage }}
            />
          )}
        </>
      )}
    </>
  );
}
