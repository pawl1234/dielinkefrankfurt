import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Avatar,
  Chip,
  Paper,
  Divider,
} from '@mui/material';
import GroupsIcon from '@mui/icons-material/Groups';
import PersonIcon from '@mui/icons-material/Person';
import AddIcon from '@mui/icons-material/Add';
import Link from 'next/link';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { stripHtmlTags } from '@/lib/sanitization/sanitize';
import { PaginatedResponse } from '@/types/api-types';
import { Group } from '@prisma/client';
import UrlPagination from '@/components/pagination/UrlPagination';

/**
 * Props for GroupsSectionServer component
 */
interface GroupsSectionServerProps {
  /** Paginated groups data */
  groups: PaginatedResponse<Group>;
  /** Current page number for groups */
  currentPage: number;
  /** Current page number for appointments (to preserve in URLs) */
  appointmentsPage: number;
}

/**
 * Truncates text to specified length and removes HTML tags.
 *
 * @param text - Text to truncate (may contain HTML)
 * @param maxLength - Maximum length of truncated text
 * @returns Truncated plain text
 */
function truncateText(text: string, maxLength: number = 200): string {
  const plainText = stripHtmlTags(text);
  if (plainText.length <= maxLength) return plainText;
  return plainText.substring(0, maxLength) + '...';
}

/**
 * Server component for rendering groups section with pagination.
 * Displays active groups with logo, description, and creation date.
 * Supports URL-based pagination with preserved appointment page state.
 *
 * @param props - GroupsSectionServerProps
 */
export default function GroupsSectionServer({
  groups,
  currentPage,
  appointmentsPage,
}: GroupsSectionServerProps) {
  return (
    <>
      <Divider id="groups" sx={{ mt: 5, scrollMarginTop: '80px' }}>
        <b>Gruppen</b>
      </Divider>

      <Box sx={{ display: 'flex', justifyContent: 'left', mb: 4, mt: 2 }}>
        <Box sx={{ mr: 2 }}>
          <Button
            href="/gruppen-bericht"
            variant="outlined"
            size="large"
            startIcon={<AddIcon />}
            LinkComponent={Link}
          >
            Neuen Gruppenbericht senden
          </Button>
        </Box>
        <Box>
          <Button
            href="/neue-gruppe"
            variant="outlined"
            size="large"
            startIcon={<AddIcon />}
            LinkComponent={Link}
          >
            Neue Gruppe eintragen
          </Button>
        </Box>
      </Box>

      {groups.items.length === 0 ? (
        <Paper sx={{ p: 5, textAlign: 'center', mb: 5 }}>
          <Typography variant="h6" color="text.secondary" paragraph>
            Aktuell sind keine aktiven Gruppen vorhanden.
          </Typography>
        </Paper>
      ) : currentPage > groups.totalPages && groups.totalPages > 0 ? (
        <Paper sx={{ p: 5, textAlign: 'center', mb: 5 }}>
          <Typography variant="h6" color="text.secondary" paragraph>
            Die angeforderte Seite existiert nicht.
          </Typography>
          <Button
            variant="contained"
            href="/?gPage=1#groups"
            LinkComponent={Link}
          >
            Zur ersten Seite
          </Button>
        </Paper>
      ) : (
        <>
          <Typography variant="h6" component="h3" sx={{ mb: 2 }}>
            <GroupsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Aktive Gruppen
          </Typography>

          <Grid container spacing={3}>
            {groups.items.map((group) => (
              <Grid key={group.id} size={{ xs: 12, md: 6, lg: 4 }}>
                <Card
                  sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      {group.logoUrl ? (
                        <Avatar
                          src={group.logoUrl}
                          alt={group.name}
                          sx={{ mr: 2, width: 40, height: 40 }}
                        />
                      ) : (
                        <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                          {group.name.charAt(0)}
                        </Avatar>
                      )}
                      <Typography variant="subtitle1" fontWeight="bold">
                        {group.name}
                      </Typography>
                    </Box>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        mb: 2,
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {truncateText(group.description)}
                    </Typography>

                    <Box sx={{ mt: 2 }}>
                      <Chip
                        size="small"
                        icon={<PersonIcon />}
                        label={`Seit ${format(
                          new Date(group.createdAt),
                          'MMMM yyyy',
                          { locale: de }
                        )}`}
                        variant="outlined"
                        color="primary"
                      />
                    </Box>
                  </CardContent>

                  <CardActions>
                    <Button
                      size="small"
                      variant="contained"
                      component={Link}
                      href={`/gruppen/${group.slug}`}
                    >
                      Mehr anzeigen
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Pagination - only show when items exist and multiple pages */}
          {groups.totalPages > 1 && (
            <UrlPagination
              currentPage={currentPage}
              totalPages={groups.totalPages}
              queryParamName="gPage"
              sectionId="groups"
              preserveParams={{ aPage: appointmentsPage }}
            />
          )}
        </>
      )}
    </>
  );
}
