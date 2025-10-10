'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { MainLayout } from '@/components/layout/MainLayout';
import {
  Typography,
  Container,
  Box,
  Paper,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Avatar,
  Grid
} from '@mui/material';
import Link from 'next/link';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import GroupIcon from '@mui/icons-material/Group';
import DescriptionIcon from '@mui/icons-material/Description';
import EventIcon from '@mui/icons-material/Event';
import AttachmentIcon from '@mui/icons-material/Attachment';
import LocationIcon from '@mui/icons-material/LocationOn';
import { Group, StatusReport } from '@prisma/client';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { FileThumbnailGrid, parseFileUrls } from '@/components/ui/FileThumbnail';
import { ImageLightbox } from '@/components/ui/ImageLightbox';
import { useImageLightbox } from '@/hooks/useImageLightbox';

interface GroupWithReports extends Group {
  statusReports: StatusReport[];
}

interface GroupDetailResponse {
  success: boolean;
  group?: GroupWithReports | null;
  error?: string;
}

export default function GroupDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const [group, setGroup] = useState<GroupWithReports | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use the custom lightbox hook
  const { lightboxProps, handleFileClick } = useImageLightbox();

  // Extract params
  const [slug, setSlug] = useState<string | null>(null);
  
  useEffect(() => {
    params.then(p => setSlug(p.slug));
  }, [params]);
  const pathname = usePathname();

  useEffect(() => {
    const fetchGroup = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/groups/${slug}`);

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Arbeitsgruppe nicht gefunden');
          }
          throw new Error('Failed to fetch group');
        }

        const data: GroupDetailResponse = await response.json();
        
        if (!data.success || !data.group) {
          throw new Error(data.error || 'Failed to fetch group data');
        }
        
        setGroup(data.group);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Ein Fehler ist aufgetreten');
        }
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchGroup();
    }
  }, [slug]);

  // Fragment navigation effect
  useEffect(() => {
    if (!loading && group && typeof window !== 'undefined') {
      const hash = window.location.hash;
      
      if (hash) {
        const elementId = hash.substring(1);
        const element = document.getElementById(elementId);
        
        if (element) {
          setTimeout(() => {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            
            element.style.transition = 'box-shadow 0.3s ease-in-out';
            element.style.boxShadow = '0 0 0 2px #e91e63';
            
            setTimeout(() => {
              element.style.boxShadow = '';
            }, 3000);
          }, 200);
        }
      }
    }
  }, [loading, group, pathname]);

  return (
    <MainLayout
      breadcrumbs={[
        { label: 'Start', href: '/' },
        { label: `Arbeitsgruppe: ${group?.name}`, href: `/gruppen/${slug}`, active: true },
      ]}
    >
      <Container maxWidth="lg" sx={{ py: 2 }}>
        <Button
          href="/?section=groups"
          startIcon={<ArrowBackIcon />}
          variant="outlined"
          sx={{ mb: 3 }}
          LinkComponent={Link}
        >
          Zurück zur Übersicht
        </Button>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="error" variant="h6">{error}</Typography>
            <Button
              href="/gruppen"
              variant="contained"
              sx={{ mt: 2 }}
              LinkComponent={Link}
            >
              Zurück zur Gruppenübersicht
            </Button>
          </Paper>
        ) : group ? (
          <Paper elevation={3} sx={{ p: { xs: 2, sm: 4 }, borderRadius: 2 }}>
            <Grid container spacing={4} sx={{ mb: 4 }}>
              <Grid size={{ xs: 12, md: 3 }}>
                {group.logoUrl ? (
                  <Box
                    component="img"
                    src={group.logoUrl}
                    alt={`Logo von ${group.name}`}
                    sx={{
                      width: '100%',
                      height: 'auto',
                      objectFit: 'contain',
                      maxHeight: 250
                    }}
                  />
                ) : (
                  <Box sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: 200
                  }}>
                    <GroupIcon sx={{ fontSize: 80, color: 'primary.main' }} />
                  </Box>
                )}
              </Grid>

              <Grid size={{ xs: 12, md: group.regularMeeting ? 6 : 9 }}>
                <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', mb: 2 }}>
                  {group.name}
                </Typography>
                <Typography
                  variant="body1"
                  sx={{ lineHeight: 1.7, color: 'text.secondary' }}
                  dangerouslySetInnerHTML={{ __html: group.description }}
                />
              </Grid>

              {group.regularMeeting && (
                <Grid size={{ xs: 12, md: 3 }}>
                  <Paper sx={{ p: 2.5, bgcolor: 'grey.50', border: '1px solid', borderColor: 'grey.200' }} elevation={0}>
                    <Typography variant="subtitle1" fontWeight="600" gutterBottom>
                      Regelmäßiges Treffen
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1.5 }}>
                      {group.regularMeeting}
                    </Typography>

                    {(group.meetingStreet || group.meetingCity) && (
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                        <LocationIcon fontSize="small" sx={{ color: 'text.secondary', mt: 0.25 }} />
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            {group.meetingStreet && <>{group.meetingStreet}<br /></>}
                            {group.meetingPostalCode && group.meetingCity && (
                              <>{group.meetingPostalCode} {group.meetingCity}</>
                            )}
                            {!group.meetingPostalCode && group.meetingCity && (
                              <>{group.meetingCity}</>
                            )}
                          </Typography>
                          {group.meetingLocationDetails && (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                              {group.meetingLocationDetails}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    )}
                  </Paper>
                </Grid>
              )}
            </Grid>

            {/* Status Reports Section */}
            <Box sx={{ mb: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <DescriptionIcon color="primary" />
                <Typography variant="h5" sx={{ fontWeight: 'medium' }}>
                  Statusberichte
                </Typography>
              </Box>
              
              {group.statusReports.length === 0 ? (
                <Alert severity="info" sx={{ mb: 3 }}>
                  Diese Arbeitsgruppe hat noch keine Statusberichte veröffentlicht.
                </Alert>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {group.statusReports.map((report) => (
                    <Paper 
                      key={report.id}
                      id={`report-${report.id}`}
                      elevation={2}
                      sx={{ 
                        p: { xs: 2, sm: 3 },
                        borderRadius: 2,
                        transition: 'box-shadow 0.3s',
                        '&:hover': {
                          boxShadow: 4
                        }
                      }}
                    >
                      {/* Title and date header */}
                      <Box sx={{ 
                        display: 'flex', 
                        flexDirection: { xs: 'column', sm: 'row' },
                        justifyContent: 'space-between', 
                        alignItems: { xs: 'flex-start', sm: 'center' },
                        mb: 2,
                        gap: 1
                      }}>
                        <Typography 
                          variant="h6" 
                          sx={{ 
                            fontWeight: 'bold',
                            pb: 0.5,
                            display: 'inline-block'
                          }}
                        >
                          {report.title}
                        </Typography>
                        <Chip
                          icon={<EventIcon fontSize="small" />}
                          label={format(new Date(report.createdAt), 'dd. MMMM yyyy', { locale: de })}
                          size="small"
                          variant="outlined"
                          sx={{ borderRadius: 1 }}
                        />
                      </Box>
                      
                      {/* Report content */}
                      <Box 
                        sx={{ 
                          mb: 3,
                          p: 2,
                          bgcolor: 'grey.50',
                          borderRadius: 1,
                          '& p': { mt: 0, mb: 1.5 },
                          '& p:last-child': { mb: 0 },
                          '& ul, & ol': { mt: 0, mb: 1.5, pl: 2.5 },
                          '& a': { color: 'primary.main' }
                        }}
                      >
                        <Typography 
                          component="div"
                          variant="body1"
                          sx={{ lineHeight: 1.6 }}
                          dangerouslySetInnerHTML={{ __html: report.content }}
                        />
                      </Box>
                      
                      {/* File attachments */}
                      {report.fileUrls && parseFileUrls(report.fileUrls).length > 0 && (
                        <Box sx={{ mb: 3 }}>
                          <Box sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            mb: 1.5
                          }}>
                            <AttachmentIcon fontSize="small" color="primary" />
                            <Typography variant="subtitle2">
                              Dateianhänge ({parseFileUrls(report.fileUrls).length})
                            </Typography>
                          </Box>
                          <FileThumbnailGrid
                            files={parseFileUrls(report.fileUrls)}
                            gridSize={{ xs: 12, sm: 6, md: 4, lg: 3 }}
                            aspectRatio="4/5"
                            showFileName={false}
                            showDescription={false}
                            showButtons={false}
                            onFileClick={handleFileClick}
                          />
                        </Box>
                      )}
                      
                      {/* Reporter info */}
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 1,
                        mt: 1 
                      }}>
                        <Avatar 
                          sx={{ 
                            width: 28, 
                            height: 28, 
                            bgcolor: 'secondary.main',
                            fontSize: '0.9rem' 
                          }}
                        >
                          {report.reporterFirstName[0]}{report.reporterLastName[0]}
                        </Avatar>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          Berichtet von <strong>{report.reporterFirstName}</strong>
                        </Typography>
                      </Box>
                    </Paper>
                  ))}
                </Box>
              )}
            </Box>
            
            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
              <Button
                href="/gruppen"
                startIcon={<ArrowBackIcon />}
                variant="outlined"
                LinkComponent={Link}
              >
                Alle Arbeitsgruppen
              </Button>
            </Box>
          </Paper>
        ) : null}
      </Container>

      {/* Image Lightbox */}
      <ImageLightbox {...lightboxProps} />
    </MainLayout>
  );
}